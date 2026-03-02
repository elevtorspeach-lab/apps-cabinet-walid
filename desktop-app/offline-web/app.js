// ================== STATE ==================
const AppState = { clients: [], salleAssignments: [] };
const DEFAULT_MANAGER_USERNAME = 'manager';
const DEFAULT_MANAGER_PASSWORD = '1234';
let USERS = [
  { id: 1, username: DEFAULT_MANAGER_USERNAME, password: DEFAULT_MANAGER_PASSWORD, role: 'manager', clientIds: [] }
];
let uploadedFiles = [];
let audienceDraft = {};
let selectedAudienceColor = 'all';
let filterAudienceColor = 'all';
let filterAudienceProcedure = 'all';
let filterAudienceTribunal = 'all';
let filterAudienceErrorsOnly = false;
let audienceTribunalAliasMap = new Map();
let audiencePrintSelection = new Set();
let filterSuiviProcedure = 'all';
let filterSuiviTribunal = 'all';
let suiviTribunalAliasMap = new Map();
let filterDiligenceProcedure = 'SFDC';
let filterDiligenceSort = 'all';
let filterDiligenceDelegation = 'all';
let filterDiligenceOrdonnance = 'all';
let filterDiligenceTribunal = 'all';
let filterSalle = 'all';
let filterSalleTribunal = 'all';
let filterSalleAudienceDate = '';
let selectedSalleDay = 'lundi';
let editingDossier = null;
let editingOriginalProcedures = [];
let customProcedures = [];
let suppressProcedureChange = false;
let currentUser = null;
let editingTeamUserId = null;
let dashboardCalendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let procedureMontantGroups = [];
const STORAGE_KEY = 'cabinet-avocat-state-v1';
const API_BASE_STORAGE_KEY = 'cabinet-avocat-api-base-v1';
let API_BASE = 'http://127.0.0.1:3000/api';
let API_BASE_RESOLVED = false;
let persistTimer = null;
let audienceAutoSaveTimer = null;
let hasLoadedState = false;
let importInProgress = false;
let remoteSyncTimer = null;
let remoteSyncStream = null;
let remoteSyncStreamRetryTimer = null;
let remoteSyncHealthTick = 0;
let remoteSyncStreamConnected = false;
let lastPersistedStateSignature = '';
let audienceLinkedRenderTimer = null;
let remoteRefreshTimer = null;
let lastPingMs = null;
let lastLiveDelayMs = null;
const dashboardMetricState = new Map();
const SIDEBAR_COLLAPSED_KEY = 'cabinet-avocat-sidebar-collapsed';
const REMOTE_SYNC_POLL_INTERVAL_MS = 3000;
const REMOTE_SYNC_HEALTH_EVERY_TICKS = 3;
const REMOTE_SYNC_EVENT_DEBOUNCE_MS = 100;
const XLSX_LOCAL_URL = './vendor/libs/xlsx.full.min.js';
const EXCELJS_LOCAL_URL = './vendor/libs/exceljs.min.js';
const XLSX_CDN_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const EXCELJS_CDN_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
let xlsxLoadPromise = null;
let excelJsLoadPromise = null;
const SALLE_WEEKDAY_OPTIONS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' }
];

// ================== HELPERS ==================
const $ = (id) => document.getElementById(id);

function normalizeApiBaseCandidate(value){
  let base = String(value || '').trim();
  if(!base) return '';
  base = base.replace(/\/+$/, '');
  base = base.replace(/\/health$/i, '');
  return base.replace(/\/+$/, '');
}

function pushApiCandidate(candidates, seen, value){
  const normalized = normalizeApiBaseCandidate(value);
  if(!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  candidates.push(normalized);
}

function appendCandidateVariants(candidates, seen, value){
  const normalized = normalizeApiBaseCandidate(value);
  if(!normalized) return;
  pushApiCandidate(candidates, seen, normalized);
  if(/\/api$/i.test(normalized)){
    pushApiCandidate(candidates, seen, normalized.replace(/\/api$/i, ''));
    return;
  }
  pushApiCandidate(candidates, seen, `${normalized}/api`);
}

function buildApiBaseCandidates(){
  const out = [];
  const seen = new Set();
  const queryApiBase = new URLSearchParams(window.location.search).get('apiBase');
  appendCandidateVariants(out, seen, queryApiBase);
  if(typeof localStorage !== 'undefined'){
    try{
      appendCandidateVariants(out, seen, localStorage.getItem(API_BASE_STORAGE_KEY));
    }catch(err){
      console.warn('Impossible de lire la configuration API locale', err);
    }
  }
  appendCandidateVariants(out, seen, window.CABINET_API_BASE);
  const metaApiBase = document.querySelector('meta[name="api-base"]')?.getAttribute('content');
  appendCandidateVariants(out, seen, metaApiBase);

  const hostname = String(window.location.hostname || '').toLowerCase();
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if(isLocalHost){
    appendCandidateVariants(out, seen, 'http://127.0.0.1:3000/api');
  }
  if(window.location.protocol === 'http:' || window.location.protocol === 'https:'){
    appendCandidateVariants(out, seen, `${window.location.origin}/api`);
    appendCandidateVariants(out, seen, window.location.origin);
  }
  appendCandidateVariants(out, seen, 'http://127.0.0.1:3000/api');
  return out;
}

function setSidebarCollapsed(collapsed){
  const app = $('appContent');
  const btn = $('sidebarToggleBtn');
  if(!app || !btn) return;
  app.classList.toggle('sidebar-collapsed', !!collapsed);
  btn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
}

function toggleSidebar(){
  const app = $('appContent');
  if(!app) return;
  const collapsed = !app.classList.contains('sidebar-collapsed');
  setSidebarCollapsed(collapsed);
  if(typeof localStorage !== 'undefined'){
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  }
}

function isMobileViewport(){
  if(typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(max-width: 600px)').matches;
}

function restoreSidebarState(){
  const mobileDefault = isMobileViewport();
  if(typeof localStorage === 'undefined'){
    setSidebarCollapsed(mobileDefault);
    return;
  }
  const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  if(raw === null){
    setSidebarCollapsed(mobileDefault);
    return;
  }
  setSidebarCollapsed(raw === '1');
}

function setSyncStatus(status, message){
  const badge = $('syncStatusBadge');
  const text = $('syncStatusText');
  if(!badge || !text) return;
  badge.classList.remove('is-ok', 'is-error', 'is-syncing', 'is-pending');
  const next = ['ok', 'error', 'syncing', 'pending'].includes(status) ? status : 'pending';
  badge.classList.add(`is-${next}`);
  const fallbackText = {
    pending: 'Modification detectee...',
    syncing: 'Synchronisation serveur...',
    ok: 'Connecte au serveur (actif)',
    error: 'Serveur indisponible (local)'
  };
  text.innerText = String(message || fallbackText[next]);
}

function formatSyncMetricMs(value){
  const num = Number(value);
  if(!Number.isFinite(num) || num < 0) return '--';
  return `${Math.round(num)}ms`;
}

function renderSyncMetrics(){
  const pingNode = $('syncPingMetric');
  const liveNode = $('syncLiveMetric');
  if(pingNode) pingNode.innerText = `Ping: ${formatSyncMetricMs(lastPingMs)}`;
  if(liveNode) liveNode.innerText = `Live: ${formatSyncMetricMs(lastLiveDelayMs)}`;
}

function setPingMetric(value){
  lastPingMs = Number.isFinite(Number(value)) ? Number(value) : null;
  renderSyncMetrics();
}

function setLiveDelayMetricFromIso(updatedAtIso){
  const ts = Date.parse(String(updatedAtIso || ''));
  if(!Number.isFinite(ts)){
    lastLiveDelayMs = null;
  }else{
    lastLiveDelayMs = Math.max(0, Date.now() - ts);
  }
  renderSyncMetrics();
}

function debounce(fn, wait = 120){
  let timer = null;
  return (...args)=>{
    if(timer) clearTimeout(timer);
    timer = setTimeout(()=>{
      timer = null;
      fn(...args);
    }, wait);
  };
}

function loadExternalScript(url, key){
  return new Promise((resolve, reject)=>{
    const selector = `script[data-lib-key="${key}"]`;
    const existing = document.querySelector(selector);
    if(existing){
      if(existing.dataset.loaded === '1'){
        resolve();
        return;
      }
      existing.addEventListener('load', ()=>resolve(), { once: true });
      existing.addEventListener('error', ()=>reject(new Error(`Impossible de charger ${key}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.libKey = key;
    script.addEventListener('load', ()=>{
      script.dataset.loaded = '1';
      resolve();
    }, { once: true });
    script.addEventListener('error', ()=>{
      reject(new Error(`Impossible de charger ${key}`));
    }, { once: true });
    document.head.appendChild(script);
  });
}

async function ensureExcelLibraries({ needXlsx = true, needExcelJs = false } = {}){
  try{
    if(needXlsx && typeof XLSX === 'undefined'){
      if(!xlsxLoadPromise){
        xlsxLoadPromise = loadExternalScript(XLSX_LOCAL_URL, 'xlsx-local')
          .catch(()=>loadExternalScript(XLSX_CDN_URL, 'xlsx-cdn'));
      }
      await xlsxLoadPromise;
    }
    if(needExcelJs && typeof ExcelJS === 'undefined'){
      if(!excelJsLoadPromise){
        excelJsLoadPromise = loadExternalScript(EXCELJS_LOCAL_URL, 'exceljs-local')
          .catch(()=>loadExternalScript(EXCELJS_CDN_URL, 'exceljs-cdn'));
      }
      await excelJsLoadPromise;
    }
    return true;
  }catch(err){
    console.error(err);
    alert('Chargement du module Excel impossible. Vérifiez votre connexion puis réessayez.');
    return false;
  }
}

function getCurrentSyncStatus(){
  const badge = $('syncStatusBadge');
  if(!badge) return 'pending';
  if(badge.classList.contains('is-ok')) return 'ok';
  if(badge.classList.contains('is-error')) return 'error';
  if(badge.classList.contains('is-syncing')) return 'syncing';
  return 'pending';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  }finally{
    clearTimeout(timer);
  }
}

async function pingApiBase(base, timeoutMs = 3500){
  const probe = await pingApiBaseWithLatency(base, timeoutMs);
  return probe.ok;
}

async function pingApiBaseWithLatency(base, timeoutMs = 3500){
  if(!base){
    return {
      ok: false,
      latencyMs: null
    };
  }
  const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? ()=>performance.now()
    : ()=>Date.now();
  const startedAt = now();
  try{
    const res = await fetchWithTimeout(`${base}/health`, { cache: 'no-store' }, timeoutMs);
    return {
      ok: !!res.ok,
      latencyMs: Math.max(0, now() - startedAt)
    };
  }catch(err){
    return {
      ok: false,
      latencyMs: null
    };
  }
}

async function resolveApiBase(forceRetry = false){
  if(API_BASE_RESOLVED && !forceRetry){
    return API_BASE;
  }
  const candidates = buildApiBaseCandidates();
  for(const candidate of candidates){
    if(await pingApiBase(candidate, 2500)){
      API_BASE = candidate;
      API_BASE_RESOLVED = true;
      if(typeof localStorage !== 'undefined'){
        try{
          localStorage.setItem(API_BASE_STORAGE_KEY, API_BASE);
        }catch(err){
          console.warn('Impossible de sauvegarder la configuration API locale', err);
        }
      }
      return API_BASE;
    }
  }
  if(candidates.length){
    API_BASE = candidates[0];
  }
  API_BASE_RESOLVED = true;
  return API_BASE;
}

async function refreshServerConnectionStatus(){
  const currentProbe = await pingApiBaseWithLatency(API_BASE, 3500);
  if(currentProbe.ok){
    setPingMetric(currentProbe.latencyMs);
    setSyncStatus('ok', 'Connecte au serveur (actif)');
    return;
  }
  await resolveApiBase(true);
  const retryProbe = await pingApiBaseWithLatency(API_BASE, 3500);
  if(retryProbe.ok){
    setPingMetric(retryProbe.latencyMs);
    setSyncStatus('ok', 'Connecte au serveur (actif)');
    return;
  }
  setPingMetric(null);
  lastLiveDelayMs = null;
  renderSyncMetrics();
  setSyncStatus('error', 'Mode local (serveur indisponible)');
}

function isManager(){
  return currentUser?.role === 'manager';
}

function isAdmin(){
  return currentUser?.role === 'admin';
}

function isViewer(){
  return currentUser?.role === 'viewer';
}

function isDefaultManagerUser(user){
  return String(user?.username || '').trim().toLowerCase() === DEFAULT_MANAGER_USERNAME;
}

function canEditData(){
  return isManager() || isAdmin();
}

function canDeleteData(){
  return isManager();
}

function canManageTeam(){
  return isManager();
}

function canViewClient(client){
  if(!client) return false;
  if(isManager() || isAdmin()) return true;
  const ids = Array.isArray(currentUser?.clientIds) ? currentUser.clientIds : [];
  return ids.includes(client.id);
}

function canEditClient(client){
  if(!canEditData()) return false;
  return canViewClient(client);
}

function normalizeSalleName(value){
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeJudgeName(value){
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeSalleWeekday(value){
  const raw = String(value || '').trim().toLowerCase();
  const allowed = new Set(SALLE_WEEKDAY_OPTIONS.map(v=>v.key));
  if(allowed.has(raw)) return raw;
  return 'lundi';
}

function getSalleWeekdayLabel(dayKey){
  const key = normalizeSalleWeekday(dayKey);
  return SALLE_WEEKDAY_OPTIONS.find(v=>v.key === key)?.label || 'Lundi';
}

function renderSalleDayTabs(){
  const container = $('salleDayTabs');
  if(!container) return;
  const normalizedDay = normalizeSalleWeekday(selectedSalleDay);
  if(selectedSalleDay !== normalizedDay) selectedSalleDay = normalizedDay;
  container.innerHTML = SALLE_WEEKDAY_OPTIONS.map(day=>{
    const activeClass = day.key === selectedSalleDay ? ' active' : '';
    return `<button type="button" class="salle-day-tab${activeClass}" data-day="${escapeAttr(day.key)}">${escapeHtml(day.label)}</button>`;
  }).join('');
}

function makeJudgeMatchKey(value){
  return normalizeJudgeName(value)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[^\u0600-\u06FFa-z0-9]/g, '');
}

function splitJudgeCandidates(value){
  const raw = normalizeJudgeName(value);
  if(!raw) return [];
  const parts = raw
    .split(/[|/,;،]+/)
    .map(v=>normalizeJudgeName(v))
    .filter(Boolean);
  if(!parts.includes(raw)) parts.push(raw);
  return [...new Set(parts)];
}

function normalizeSalleAssignments(raw){
  if(!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  raw.forEach(item=>{
    if(!item || typeof item !== 'object') return;
    const salle = normalizeSalleName(item.salle);
    const juge = normalizeJudgeName(item.juge);
    const day = normalizeSalleWeekday(item.day);
    if(!salle || !juge) return;
    const key = `${day}::${salle.toLowerCase()}::${juge.toLowerCase()}`;
    if(seen.has(key)) return;
    seen.add(key);
    out.push({
      id: Number(item.id) || Date.now() + Math.floor(Math.random() * 1000000),
      salle,
      juge,
      day
    });
  });
  return out;
}

function syncCurrentUserFromUsers(){
  if(!currentUser) return;
  const byId = USERS.find(u=>Number(u.id) === Number(currentUser.id));
  if(byId){
    currentUser = byId;
    return;
  }
  const byUsername = USERS.find(
    u=>String(u.username || '').trim().toLowerCase() === String(currentUser.username || '').trim().toLowerCase()
  );
  if(byUsername){
    currentUser = byUsername;
  }
}

function getVisibleClients(){
  return AppState.clients.filter(c=>canViewClient(c));
}

function collectDeepValues(value, out = []){
  if(value === null || value === undefined) return out;
  if(Array.isArray(value)){
    value.forEach(v => collectDeepValues(v, out));
    return out;
  }
  if(typeof value === 'object'){
    Object.values(value).forEach(v => collectDeepValues(v, out));
    return out;
  }
  out.push(String(value));
  return out;
}

function escapeAttr(value){
  return escapeHtml(String(value ?? ''));
}

function normalizeLooseText(value){
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeTribunalFilterKey(value){
  const base = normalizeLooseText(value)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u0640]/g, '') // Arabic tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ة]/g, 'ه');
  // Ignore spaces to avoid duplicates like "بالدار البيضاء" vs "بالدارالبيضاء".
  return base
    .replace(/\s+/g, '')
    .replace(/[^\u0600-\u06FFa-z0-9]/g, '');
}

function getTextBigrams(text){
  const out = [];
  const src = String(text || '');
  if(src.length < 2) return out;
  for(let i = 0; i < src.length - 1; i++){
    out.push(src.slice(i, i + 2));
  }
  return out;
}

function getDiceSimilarity(a, b){
  const aa = String(a || '');
  const bb = String(b || '');
  if(!aa || !bb) return 0;
  if(aa === bb) return 1;
  const a2 = getTextBigrams(aa);
  const b2 = getTextBigrams(bb);
  if(!a2.length || !b2.length) return 0;
  const bCount = new Map();
  b2.forEach(g=>bCount.set(g, (bCount.get(g) || 0) + 1));
  let intersection = 0;
  a2.forEach(g=>{
    const count = bCount.get(g) || 0;
    if(count > 0){
      intersection += 1;
      bCount.set(g, count - 1);
    }
  });
  return (2 * intersection) / (a2.length + b2.length);
}

function getTribunalSimilarity(a, b){
  const aa = makeTribunalFilterKey(a);
  const bb = makeTribunalFilterKey(b);
  if(!aa || !bb) return 0;
  if(aa === bb) return 1;
  const minLen = Math.min(aa.length, bb.length);
  const maxLen = Math.max(aa.length, bb.length);
  const inclusion = (aa.includes(bb) || bb.includes(aa)) ? (minLen / maxLen) : 0;
  const dice = getDiceSimilarity(aa, bb);
  return Math.max(dice, inclusion);
}

function pickMostFrequentTribunalLabel(labelCounts){
  let bestLabel = '';
  let bestCount = -1;
  labelCounts.forEach((count, label)=>{
    const nextLabel = String(label || '');
    if(!nextLabel) return;
    if(count > bestCount){
      bestCount = count;
      bestLabel = nextLabel;
      return;
    }
    if(count === bestCount){
      const hasMoreWords = nextLabel.split(/\s+/).length > bestLabel.split(/\s+/).length;
      if(hasMoreWords || nextLabel.length > bestLabel.length){
        bestLabel = nextLabel;
      }
    }
  });
  return bestLabel;
}

function buildAudienceTribunalClusterState(rows){
  const keyCountMap = new Map();
  const keyLabelCountsMap = new Map();

  (rows || []).forEach(row=>{
    const label = normalizeLooseText(row?.p?.tribunal || '');
    if(!label) return;
    const key = makeTribunalFilterKey(label);
    if(!key) return;
    keyCountMap.set(key, (keyCountMap.get(key) || 0) + 1);
    if(!keyLabelCountsMap.has(key)) keyLabelCountsMap.set(key, new Map());
    const labelMap = keyLabelCountsMap.get(key);
    labelMap.set(label, (labelMap.get(label) || 0) + 1);
  });

  const keys = [...keyCountMap.keys()].sort((a, b)=>{
    const diff = (keyCountMap.get(b) || 0) - (keyCountMap.get(a) || 0);
    if(diff !== 0) return diff;
    return b.length - a.length;
  });

  const clusters = [];
  const SIMILARITY_THRESHOLD = 0.92;
  const INCLUSION_THRESHOLD = 0.88;

  keys.forEach(key=>{
    const count = keyCountMap.get(key) || 0;
    const labels = keyLabelCountsMap.get(key) || new Map();
    let bestCluster = null;
    let bestScore = 0;
    clusters.forEach(cluster=>{
      const score = getTribunalSimilarity(key, cluster.representativeKey);
      if(score > bestScore){
        bestScore = score;
        bestCluster = cluster;
      }
    });

    const canMergeBySimilarity = bestScore >= SIMILARITY_THRESHOLD;
    const canMergeByInclusion = !!bestCluster
      && (bestCluster.representativeKey.includes(key) || key.includes(bestCluster.representativeKey))
      && (Math.min(bestCluster.representativeKey.length, key.length) / Math.max(bestCluster.representativeKey.length, key.length)) >= INCLUSION_THRESHOLD;

    if(bestCluster && (canMergeBySimilarity || canMergeByInclusion)){
      bestCluster.totalCount += count;
      bestCluster.memberKeys.add(key);
      labels.forEach((c, label)=>{
        bestCluster.labelCounts.set(label, (bestCluster.labelCounts.get(label) || 0) + c);
      });
      if(count > bestCluster.representativeCount){
        bestCluster.representativeKey = key;
        bestCluster.representativeCount = count;
      }
      return;
    }

    const labelCounts = new Map();
    labels.forEach((c, label)=>labelCounts.set(label, c));
    clusters.push({
      representativeKey: key,
      representativeCount: count,
      totalCount: count,
      memberKeys: new Set([key]),
      labelCounts
    });
  });

  const aliasMap = new Map();
  const options = clusters.map(cluster=>{
    const label = pickMostFrequentTribunalLabel(cluster.labelCounts) || cluster.representativeKey;
    const clusterKey = makeTribunalFilterKey(label) || cluster.representativeKey;
    cluster.memberKeys.forEach(memberKey=>aliasMap.set(memberKey, clusterKey));
    aliasMap.set(clusterKey, clusterKey);
    return { key: clusterKey, label, count: cluster.totalCount };
  }).sort((a, b)=>a.label.localeCompare(b.label, 'fr'));

  return {
    aliasMap,
    options,
    keySet: new Set(options.map(v=>v.key))
  };
}

function resolveAudienceTribunalFilterKey(value){
  const rawKey = makeTribunalFilterKey(value);
  if(!rawKey) return '';
  return audienceTribunalAliasMap.get(rawKey) || rawKey;
}

function buildTribunalClusterStateFromLabels(labels){
  const keyCountMap = new Map();
  const keyLabelCountsMap = new Map();

  (labels || []).forEach(rawLabel=>{
    const label = normalizeLooseText(rawLabel || '');
    if(!label) return;
    const key = makeTribunalFilterKey(label);
    if(!key) return;
    keyCountMap.set(key, (keyCountMap.get(key) || 0) + 1);
    if(!keyLabelCountsMap.has(key)) keyLabelCountsMap.set(key, new Map());
    const labelMap = keyLabelCountsMap.get(key);
    labelMap.set(label, (labelMap.get(label) || 0) + 1);
  });

  const keys = [...keyCountMap.keys()].sort((a, b)=>{
    const diff = (keyCountMap.get(b) || 0) - (keyCountMap.get(a) || 0);
    if(diff !== 0) return diff;
    return b.length - a.length;
  });

  const clusters = [];
  const SIMILARITY_THRESHOLD = 0.92;
  const INCLUSION_THRESHOLD = 0.88;

  keys.forEach(key=>{
    const count = keyCountMap.get(key) || 0;
    const labelsMap = keyLabelCountsMap.get(key) || new Map();
    let bestCluster = null;
    let bestScore = 0;
    clusters.forEach(cluster=>{
      const score = getTribunalSimilarity(key, cluster.representativeKey);
      if(score > bestScore){
        bestScore = score;
        bestCluster = cluster;
      }
    });

    const canMergeBySimilarity = bestScore >= SIMILARITY_THRESHOLD;
    const canMergeByInclusion = !!bestCluster
      && (bestCluster.representativeKey.includes(key) || key.includes(bestCluster.representativeKey))
      && (Math.min(bestCluster.representativeKey.length, key.length) / Math.max(bestCluster.representativeKey.length, key.length)) >= INCLUSION_THRESHOLD;

    if(bestCluster && (canMergeBySimilarity || canMergeByInclusion)){
      bestCluster.totalCount += count;
      bestCluster.memberKeys.add(key);
      labelsMap.forEach((c, label)=>{
        bestCluster.labelCounts.set(label, (bestCluster.labelCounts.get(label) || 0) + c);
      });
      if(count > bestCluster.representativeCount){
        bestCluster.representativeKey = key;
        bestCluster.representativeCount = count;
      }
      return;
    }

    const labelCounts = new Map();
    labelsMap.forEach((c, label)=>labelCounts.set(label, c));
    clusters.push({
      representativeKey: key,
      representativeCount: count,
      totalCount: count,
      memberKeys: new Set([key]),
      labelCounts
    });
  });

  const aliasMap = new Map();
  const options = clusters.map(cluster=>{
    const label = pickMostFrequentTribunalLabel(cluster.labelCounts) || cluster.representativeKey;
    const clusterKey = makeTribunalFilterKey(label) || cluster.representativeKey;
    cluster.memberKeys.forEach(memberKey=>aliasMap.set(memberKey, clusterKey));
    aliasMap.set(clusterKey, clusterKey);
    return { key: clusterKey, label, count: cluster.totalCount };
  }).sort((a, b)=>a.label.localeCompare(b.label, 'fr'));

  return {
    aliasMap,
    options,
    keySet: new Set(options.map(v=>v.key))
  };
}

function resolveSuiviTribunalFilterKey(value){
  const rawKey = makeTribunalFilterKey(value);
  if(!rawKey) return '';
  return suiviTribunalAliasMap.get(rawKey) || rawKey;
}

function getProcedureShortLabel(procName){
  const raw = String(procName || '').trim();
  if(!raw) return '';
  const base = getProcedureBaseName(raw);
  const suffixMatch = raw.match(/(\d+)$/);
  const suffix = suffixMatch ? suffixMatch[1] : '';
  const map = {
    ASS: 'ASS',
    Restitution: 'RESTIT',
    Nantissement: 'NANTI',
    SFDC: 'SFDC',
    'S/bien': 'SBIEN',
    Injonction: 'INJ'
  };
  const shortBase = map[base] || base.slice(0, 6).toUpperCase();
  return `${shortBase}${suffix}`;
}

function cloneProcedureMontantGroups(groups){
  if(!Array.isArray(groups)) return [];
  return groups.map(group=>({
    id: String(group?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    createdAt: Number(group?.createdAt || Date.now()),
    montant: String(group?.montant || ''),
    procedures: Array.isArray(group?.procedures)
      ? [...new Set(group.procedures.map(v=>String(v || '').trim()).filter(Boolean))]
      : []
  })).filter(group=>group.procedures.length > 0);
}

function normalizeProcedureMontantGroups(rawGroups, procedures = [], fallbackMontant = ''){
  const cleanProcedures = [...new Set((procedures || []).map(v=>String(v || '').trim()).filter(Boolean))];
  const normalized = cloneProcedureMontantGroups(rawGroups).map(group=>({
    ...group,
    procedures: group.procedures.filter(proc=>cleanProcedures.includes(proc))
  })).filter(group=>group.procedures.length > 0);

  if(normalized.length) return normalized;
  if(!cleanProcedures.length) return [];
  if(!String(fallbackMontant || '').trim()) return [];

  return [{
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    montant: String(fallbackMontant || ''),
    procedures: cleanProcedures
  }];
}

function renderProcedureMontantGroups(){
  const container = $('procedureMontantGroups');
  if(!container) return;
  if(!procedureMontantGroups.length){
    container.innerHTML = '<div class="procedure-montant-empty">Choisissez des procédures pour gérer les montants par groupe.</div>';
    return;
  }
  container.innerHTML = procedureMontantGroups.map((group, index)=>{
    const pills = group.procedures.map(proc=>{
      const procClass = getProcedureColorClass(proc) || 'proc-autre';
      return `<span class="procedure-montant-pill ${procClass}">${escapeHtml(getProcedureShortLabel(proc))}</span>`;
    }).join('');
    const title = `Montant ${index + 1}`;
    return `
      <div class="procedure-montant-group">
        <div>
          <p class="group-title">${escapeHtml(title)}</p>
          <div class="procedure-montant-pill-list">${pills}</div>
        </div>
        <div>
          <input
            type="number"
            placeholder="Montant groupe ${index + 1}"
            value="${escapeAttr(group.montant || '')}"
            oninput="updateProcedureMontantGroupAmount(${index}, this.value)">
        </div>
      </div>
    `;
  }).join('');
}

function updateProcedureMontantGroupAmount(index, value){
  const group = procedureMontantGroups[index];
  if(!group) return;
  group.montant = String(value || '').trim();
}

function syncMainMontantToGroup1(value){
  if(editingDossier) return;
  const normalized = String(value || '').trim();
  if(!procedureMontantGroups.length) return;
  if(!procedureMontantGroups[0]) return;
  procedureMontantGroups[0].montant = normalized;
  const input = document.querySelector('#procedureMontantGroups .procedure-montant-group input[type="number"]');
  if(input && String(input.value || '').trim() !== normalized){
    input.value = normalized;
  }
}

function syncProcedureMontantGroups(selectedProcedures){
  const selected = [...new Set((selectedProcedures || []).map(v=>String(v || '').trim()).filter(Boolean))];
  if(!selected.length){
    procedureMontantGroups = [];
    renderProcedureMontantGroups();
    return;
  }

  procedureMontantGroups = cloneProcedureMontantGroups(procedureMontantGroups).map(group=>({
    ...group,
    procedures: group.procedures.filter(proc=>selected.includes(proc))
  })).filter(group=>group.procedures.length > 0);

  // In "new dossier" mode, keep a single montant group only.
  // Group splitting (Montant 2) is reserved for dossier modification mode.
  if(!editingDossier){
    const mainMontantValue = String($('montantInput')?.value || '').trim();
    const now = Date.now();
    if(!procedureMontantGroups.length){
      procedureMontantGroups = [{
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        montant: mainMontantValue,
        procedures: selected
      }];
    }else{
      const first = procedureMontantGroups[0];
      const merged = new Set(first.procedures);
      selected.forEach(proc=>merged.add(proc));
      first.procedures = [...merged];
      if(mainMontantValue){
        first.montant = mainMontantValue;
      }
      procedureMontantGroups = [first];
    }
    renderProcedureMontantGroups();
    return;
  }

  // Keep at most 2 montant groups:
  // - Montant 1: original procedures
  // - Montant 2: all newly added procedures
  if(procedureMontantGroups.length > 2){
    const second = procedureMontantGroups[1];
    const mergedSet = new Set(second.procedures);
    for(let i = 2; i < procedureMontantGroups.length; i++){
      procedureMontantGroups[i].procedures.forEach(proc=>mergedSet.add(proc));
    }
    second.procedures = [...mergedSet];
    procedureMontantGroups = procedureMontantGroups.slice(0, 2);
  }

  const assigned = new Set(procedureMontantGroups.flatMap(group=>group.procedures));
  const now = Date.now();
  const missing = selected.filter(proc=>!assigned.has(proc));

  if(missing.length){
    if(procedureMontantGroups.length === 0){
      procedureMontantGroups.push({
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        montant: '',
        procedures: missing
      });
    }else if(procedureMontantGroups.length === 1){
      procedureMontantGroups.push({
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        montant: '',
        procedures: missing
      });
    }else{
      const second = procedureMontantGroups[1];
      const mergedSet = new Set(second.procedures);
      missing.forEach(proc=>mergedSet.add(proc));
      second.procedures = [...mergedSet];
    }
  }

  renderProcedureMontantGroups();
}

function getProcedureMontantGroupsForSave(){
  return cloneProcedureMontantGroups(procedureMontantGroups);
}

function normalizeHeader(value){
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function buildHeaderMap(row){
  const map = {};
  row.forEach((cell, idx)=>{
    const key = normalizeHeader(cell);
    if(key && map[key] === undefined) map[key] = idx;
  });
  return map;
}

function getColIndex(map, keys){
  for(const key of keys){
    const idx = map[key];
    if(idx !== undefined) return idx;
  }
  return -1;
}

function ensureExcelHtmlUtf8(html){
  const text = String(html || '');
  if(/<meta[^>]+charset\s*=/i.test(text)) return text;
  return text.replace(
    /<head>/i,
    '<head><meta charset="UTF-8"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">'
  );
}

function createExcelUtf8Blob(html){
  const utf8Html = ensureExcelHtmlUtf8(html);
  return new Blob(['\uFEFF', utf8Html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
}

async function exportAudienceWorkbookXlsxStyled({ headers, rows, subtitle = '', sheetName = 'Audience', colWidths = [], filename = 'audience_export.xlsx' }){
  const excelReady = await ensureExcelLibraries({ needXlsx: true, needExcelJs: true });
  if(!excelReady) return;
  if(typeof ExcelJS === 'undefined'){
    if(typeof XLSX === 'undefined'){
      alert('Export XLSX indisponible: librairie Excel non chargée.');
      return;
    }
    const aoa = [
      ['CABINET ARAQUI HOUSSAINI'],
      [String(subtitle || '-')],
      [],
      headers,
      ...rows
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = colWidths.length ? colWidths : new Array(headers.length).fill({ wch: 20 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  const colCount = headers.length;
  const lastColLetter = String.fromCharCode(64 + Math.max(1, colCount));

  sheet.getCell('A1').value = 'CABINET ARAQUI HOUSSAINI';
  sheet.getCell('A2').value = String(subtitle || '-');
  sheet.mergeCells(`A1:${lastColLetter}1`);
  sheet.mergeCells(`A2:${lastColLetter}2`);
  sheet.addRow([]);
  sheet.addRow(headers);
  rows.forEach(r=>sheet.addRow(r));

  sheet.getRow(1).height = 44;
  sheet.getRow(2).height = 30;
  sheet.getRow(4).height = 46;
  for(let r=5; r<=4 + rows.length; r++) sheet.getRow(r).height = 44;

  const widthValues = colWidths.length
    ? colWidths.map(v=>Number(v?.wch || 20))
    : new Array(colCount).fill(22);
  sheet.columns = widthValues.map(w=>({ width: w }));

  const border = {
    top: { style: 'thin', color: { argb: 'FFBFC5CE' } },
    left: { style: 'thin', color: { argb: 'FFBFC5CE' } },
    bottom: { style: 'thin', color: { argb: 'FFBFC5CE' } },
    right: { style: 'thin', color: { argb: 'FFBFC5CE' } }
  };

  sheet.getCell('A1').font = { name: 'Arial', size: 24, bold: true, color: { argb: 'FF1F3B8F' } };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('A2').font = { name: 'Arial', size: 17, bold: true, color: { argb: 'FF1A4590' } };
  sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  for(let c=1; c<=colCount; c++){
    const cell = sheet.getRow(4).getCell(c);
    cell.font = { name: 'Arial', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A4590' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = border;
  }

  for(let r=5; r<=4 + rows.length; r++){
    for(let c=1; c<=colCount; c++){
      const cell = sheet.getRow(r).getCell(c);
      cell.font = { name: 'Arial', size: 18, color: { argb: 'FF111111' } };
      const isArabicColumn = c === colCount;
      const align = c === 4 || c === 5 || isArabicColumn ? 'center' : 'left';
      cell.alignment = { horizontal: align, vertical: 'middle' };
      cell.border = border;
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob(
    [buffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseProcedureToken(token){
  const raw = String(token || '').trim();
  if(!raw) return '';
  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if(compact === 'ass') return 'ASS';
  if(compact === 'rest' || compact === 'restitution' || compact === 'restit') return 'Restitution';
  if(compact === 'nant' || compact === 'nantissement' || compact === 'nanti') return 'Nantissement';
  if(compact === 'sfdc') return 'SFDC';
  if(compact === 'sbien') return 'S/bien';
  if(compact === 'inj' || compact === 'injonction') return 'Injonction';
  return raw;
}

function parseProcedureList(value){
  const raw = String(value || '');
  if(!raw) return [];
  return raw
    .split(/[+,]/)
    .map(v=>parseProcedureToken(v))
    .map(v=>String(v || '').trim())
    .filter(Boolean);
}

function formatDateDDMMYYYY(date){
  if(!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function normalizeDateDDMMYYYY(value){
  if(value === null || value === undefined) return '';
  if(value instanceof Date) return formatDateDDMMYYYY(value);
  const text = String(value)
    .trim()
    .replace(/[٠-٩]/g, d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  if(!text) return '';

  const isValidDateParts = (d, m, y)=>{
    const dt = new Date(y, m - 1, d);
    return !Number.isNaN(dt.getTime())
      && dt.getFullYear() === y
      && dt.getMonth() === m - 1
      && dt.getDate() === d;
  };

  const parseYear = (raw)=>{
    const n = Number(raw);
    if(!Number.isFinite(n)) return NaN;
    if(raw.length === 2) return n >= 70 ? 1900 + n : 2000 + n;
    return n;
  };

  let m = text.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if(m){
    const year = parseYear(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if(!isValidDateParts(day, month, year)) return '';
    return formatDateDDMMYYYY(new Date(year, month - 1, day));
  }else{
    m = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
    if(!m){
      const embedded = text.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.](?:\d{2}|\d{4})|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/);
      if(!embedded) return '';
      return normalizeDateDDMMYYYY(embedded[1]);
    }
    const a = Number(m[1]);
    const b = Number(m[2]);
    const year = parseYear(m[3]);
    // Prefer dd/mm/yyyy, fallback to mm/dd/yyyy when needed (e.g. 10/28/25).
    if(isValidDateParts(a, b, year)){
      return formatDateDDMMYYYY(new Date(year, b - 1, a));
    }
    if(isValidDateParts(b, a, year)){
      return formatDateDDMMYYYY(new Date(year, a - 1, b));
    }
    return '';
  }
}

function normalizeReferenceValue(value){
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

function splitReferenceValues(value){
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .split(/[\/,;|+\n]+/)
    .map(v=>String(v || '').trim())
    .filter(Boolean);
}

function parseExcelDateValue(value){
  if(value === null || value === undefined) return '';

  if(value instanceof Date){
    return formatDateDDMMYYYY(value);
  }

  if(typeof value === 'number' && Number.isFinite(value)){
    if(typeof XLSX !== 'undefined' && XLSX?.SSF?.parse_date_code){
      const parsed = XLSX.SSF.parse_date_code(value);
      if(parsed?.y && parsed?.m && parsed?.d){
        return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`;
      }
    }
    const excelEpochUtc = Date.UTC(1899, 11, 30);
    const ms = Math.round(value * 24 * 60 * 60 * 1000);
    const dtUtc = new Date(excelEpochUtc + ms);
    if(!Number.isNaN(dtUtc.getTime())){
      const localDate = new Date(dtUtc.getUTCFullYear(), dtUtc.getUTCMonth(), dtUtc.getUTCDate());
      return formatDateDDMMYYYY(localDate);
    }
    return String(value);
  }

  const text = String(value).trim();
  if(!text) return '';

  const normalized = normalizeDateDDMMYYYY(text);
  return normalized || text;
}

function makeAudienceDraftKey(ci, di, procKey){
  return `${ci}::${di}::${encodeURIComponent(String(procKey))}`;
}

function parseAudienceDraftKey(key){
  const value = String(key);
  if(value.includes('::')){
    const [ci = '', di = '', ...rest] = value.split('::');
    return { ci, di, procKey: decodeURIComponent(rest.join('::')) };
  }
  const [ci = '', di = '', ...rest] = value.split('_');
  return { ci, di, procKey: rest.join('_') };
}

function fileToDataUrl(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(String(reader.result || ''));
    reader.onerror = ()=>reject(new Error('Lecture fichier impossible'));
    reader.readAsDataURL(file);
  });
}

async function serializeUploadedFiles(files){
  const result = [];
  for(const file of files){
    if(!file) continue;
    if(file.dataUrl && file.name){
      result.push({
        name: String(file.name || ''),
        size: Number(file.size || 0),
        type: String(file.type || ''),
        dataUrl: String(file.dataUrl || '')
      });
      continue;
    }
    if(typeof File !== 'undefined' && file instanceof File){
      const dataUrl = await fileToDataUrl(file);
      result.push({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl
      });
    }
  }
  return result;
}

function getStoredFileSource(file){
  if(!file) return '';
  if(file.dataUrl) return String(file.dataUrl);
  if(typeof File !== 'undefined' && file instanceof File){
    return URL.createObjectURL(file);
  }
  return '';
}

function openStoredFile(file){
  const src = getStoredFileSource(file);
  if(!src){
    alert('Fichier non disponible pour aperçu');
    return;
  }
  window.open(src, '_blank');
  if(typeof File !== 'undefined' && file instanceof File){
    setTimeout(()=>URL.revokeObjectURL(src), 10000);
  }
}

function downloadStoredFile(file){
  const src = getStoredFileSource(file);
  if(!src){
    alert('Fichier non disponible pour téléchargement');
    return;
  }
  const a = document.createElement('a');
  a.href = src;
  a.download = String(file?.name || 'document');
  document.body.appendChild(a);
  a.click();
  a.remove();
  if(typeof File !== 'undefined' && file instanceof File){
    setTimeout(()=>URL.revokeObjectURL(src), 10000);
  }
}

function normalizeUser(rawUser){
  if(!rawUser || typeof rawUser !== 'object') return null;
  const id = Number(rawUser.id);
  const username = String(rawUser.username || '').trim();
  const password = String(rawUser.password || '');
  const rawRole = String(rawUser.role || '').trim().toLowerCase();
  const role = rawRole === 'manager' || rawRole === 'admin' || rawRole === 'viewer'
    ? rawRole
    : 'viewer';
  const clientIds = Array.isArray(rawUser.clientIds)
    ? [...new Set(rawUser.clientIds.map(v=>Number(v)).filter(v=>Number.isFinite(v)))]
    : [];
  if(!Number.isFinite(id) || !username) return null;
  return { id, username, password, role, clientIds };
}

function normalizeClient(rawClient){
  if(!rawClient || typeof rawClient !== 'object') return null;
  const id = Number(rawClient.id);
  const name = String(rawClient.name || '').trim();
  const dossiers = Array.isArray(rawClient.dossiers)
    ? rawClient.dossiers.map(d=>{
      if(!d || typeof d !== 'object') return d;
      const normalizedDate = normalizeDateDDMMYYYY(d.dateAffectation || '');
      const normalizedProcedures = normalizeProcedures(d);
      return {
        ...d,
        dateAffectation: normalizedDate || String(d.dateAffectation || '').trim(),
        montantByProcedure: normalizeProcedureMontantGroups(
          d.montantByProcedure,
          normalizedProcedures,
          d.montant || ''
        )
      };
    })
    : [];
  if(!Number.isFinite(id) || !name) return null;
  return { id, name, dossiers };
}

function getKnownJudges(){
  const set = new Set();
  AppState.clients.forEach(c=>{
    c.dossiers.forEach(d=>{
      Object.values(d?.procedureDetails || {}).forEach(details=>{
        const juge = normalizeJudgeName(details?.juge || '');
        if(juge) set.add(juge);
      });
    });
  });
  return [...set].sort((a, b)=>a.localeCompare(b, 'fr'));
}

function buildSalleAudienceMap(dayKey = selectedSalleDay){
  const targetDay = normalizeSalleWeekday(dayKey);
  const salleToJudges = new Map();
  normalizeSalleAssignments(AppState.salleAssignments).forEach(row=>{
    if(normalizeSalleWeekday(row?.day) !== targetDay) return;
    const salleLabel = normalizeSalleName(row?.salle || '');
    const judge = normalizeJudgeName(row?.juge || '');
    if(!salleLabel || !judge) return;
    if(!salleToJudges.has(salleLabel)) salleToJudges.set(salleLabel, new Set());
    salleToJudges.get(salleLabel).add(judge);
  });

  const bySalleAndJudge = new Map();
  salleToJudges.forEach((judges, salleLabel)=>{
    const judgeMap = new Map();
    [...judges].forEach(j=>judgeMap.set(j, []));
    bySalleAndJudge.set(salleLabel, judgeMap);
  });

  const audienceRows = getAudienceRowsForSidebar();
  audienceRows.forEach(row=>{
    const judgeValue = normalizeJudgeName(row?.draft?.juge || row?.p?.juge || '');
    if(!judgeValue) return;
    const candidateKeys = splitJudgeCandidates(judgeValue)
      .map(v=>makeJudgeMatchKey(v))
      .filter(Boolean);
    if(!candidateKeys.length) return;
    const dateValue = normalizeDateDDMMYYYY(row?.draft?.dateAudience || row?.p?.audience || '')
      || String(row?.draft?.dateAudience || row?.p?.audience || '').trim()
      || '-';
    const sortValue = String(row?.draft?.sort || row?.p?.sort || '').trim();
    const instructionValue = String(
      row?.draft?.instruction
      || row?.p?.instruction
      || sortValue
    ).trim();
    const session = {
      date: dateValue,
      ref: String(row?.draft?.refDossier || row?.p?.referenceClient || '').trim() || '-',
      debiteur: String(row?.d?.debiteur || '').trim() || '-',
      tribunal: String(row?.p?.tribunal || '').trim() || '-',
      client: String(row?.c?.name || '').trim() || '-',
      dateDepot: getAudienceDateDepotDisplayValue(row),
      instruction: instructionValue || '-',
      sort: sortValue || '-'
    };
    bySalleAndJudge.forEach((judgeMap)=>{
      judgeMap.forEach((sessions, judgeName)=>{
        const targetJudgeKey = makeJudgeMatchKey(judgeName);
        if(!targetJudgeKey) return;
        const matched = candidateKeys.some(candidateKey=>
          candidateKey === targetJudgeKey
          || candidateKey.includes(targetJudgeKey)
          || targetJudgeKey.includes(candidateKey)
        );
        if(!matched) return;
        sessions.push(session);
      });
    });
  });

  return bySalleAndJudge;
}

function formatDateYYYYMMDD(date){
  if(!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getSalleTribunalCategory(value){
  const text = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKC');
  if(!text) return '';
  if(
    text.includes('تجاري')
    || text.includes('تجارة')
    || text.includes('commerce')
    || text.includes('commercial')
  ){
    return 'commerciale';
  }
  if(
    text.includes('استئناف')
    || text.includes('appel')
  ){
    return 'appel';
  }
  return '';
}

function isSalleSessionMatchingDate(session){
  if(!filterSalleAudienceDate) return true;
  const parsed = parseDateForAge(session?.date || '');
  if(!parsed) return false;
  return formatDateYYYYMMDD(parsed) === filterSalleAudienceDate;
}

function isSalleSessionMatchingTribunal(session){
  if(filterSalleTribunal === 'all') return true;
  return getSalleTribunalCategory(session?.tribunal || '') === filterSalleTribunal;
}

function renderSidebarSalleSessions(){
  const container = $('sidebarSalleSessions');
  if(!container) return;
  if(!currentUser){
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const dayLabel = getSalleWeekdayLabel(selectedSalleDay);
  const bySalleAndJudge = buildSalleAudienceMap(selectedSalleDay);
  if(!bySalleAndJudge.size){
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const html = [...bySalleAndJudge.entries()]
    .sort((a, b)=>a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
    .map(([salleLabel, judgeMap])=>{
      const salleEncoded = encodeURIComponent(String(salleLabel));
      const dayEncoded = encodeURIComponent(String(selectedSalleDay));
      const judgeHtml = [...judgeMap.entries()]
        .sort((a, b)=>a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
        .map(([judgeName, sessions])=>{
          const visibleSessions = sessions
            .filter(s=>isSalleSessionMatchingTribunal(s))
            .filter(s=>isSalleSessionMatchingDate(s))
            .sort((a, b)=>(parseDateForAge(b.date)?.getTime() || 0) - (parseDateForAge(a.date)?.getTime() || 0));
          const sessionHtml = visibleSessions.length
            ? visibleSessions
              .map(s=>`<div class="sidebar-salle-session">${escapeHtml(s.date)} | ${escapeHtml(s.ref)} | ${escapeHtml(s.debiteur)}</div>`)
              .join('')
            : `<div class="sidebar-salle-session">Aucune audience</div>`;
          return `
            <div class="sidebar-salle-item">
              <div class="sidebar-salle-judge">${escapeHtml(judgeName)}</div>
              ${sessionHtml}
            </div>
          `;
        }).join('');
      return `
        <div class="sidebar-salle-item">
          <div class="sidebar-salle-title-row">
            <div class="sidebar-salle-title">${escapeHtml(salleLabel)}</div>
            <button type="button" class="btn-primary btn-salle-export" onclick="exportSalleAudiences('${salleEncoded}','${dayEncoded}')">
              <i class="fa-solid fa-file-export"></i> Exporter
            </button>
          </div>
          ${judgeHtml}
        </div>
      `;
    }).join('');

  container.innerHTML = `<h4><i class="fa-solid fa-calendar-check"></i> Audiences par salle - ${escapeHtml(dayLabel)}</h4>${html}`;
  container.style.display = '';
}

async function exportSalleAudiences(salleEncoded, dayEncoded){
  const salleLabel = decodeURIComponent(String(salleEncoded || ''));
  const dayKey = normalizeSalleWeekday(decodeURIComponent(String(dayEncoded || selectedSalleDay)));
  const bySalleAndJudge = buildSalleAudienceMap(dayKey);
  const judgeMap = bySalleAndJudge.get(salleLabel);
  if(!judgeMap){
    alert('Salle introuvable.');
    return;
  }

  const headers = ['Client', 'Adversaire', 'N° Dossier', 'Juge', 'Audience', 'Date dépôt', 'Sort'];
  const rows = [];
  let dateAudience = '';
  const tribunalLabelsRaw = [];
  [...judgeMap.entries()]
    .sort((a, b)=>a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
    .forEach(([judgeName, sessions])=>{
      const visibleSessions = sessions
        .filter(s=>isSalleSessionMatchingTribunal(s))
        .filter(s=>isSalleSessionMatchingDate(s))
        .sort((a, b)=>(parseDateForAge(b.date)?.getTime() || 0) - (parseDateForAge(a.date)?.getTime() || 0));
      visibleSessions
        .forEach(s=>{
          const maybeDate = String(s?.date || '').trim();
          if(!dateAudience && maybeDate && maybeDate !== '-') dateAudience = maybeDate;
          const tribunalText = String(s?.tribunal || '').trim();
          if(tribunalText && tribunalText !== '-') tribunalLabelsRaw.push(tribunalText);
          rows.push([
            s.client || '-',
            s.debiteur || '-',
            s.ref || '-',
            judgeName || '-',
            s.date || '-',
            s.dateDepot || '-',
            s.sort || s.instruction || '-'
          ]);
        });
    });
  if(!rows.length){
    rows.push(['-', '-', '-', '-', '-', '-', '-']);
  }
  const tribunalClusterState = buildTribunalClusterStateFromLabels(tribunalLabelsRaw);
  const tribunalLabels = tribunalClusterState.options.map(v=>String(v?.label || '').trim()).filter(Boolean);
  const tribunalLabel = tribunalLabels.length ? tribunalLabels.join(' / ') : '-';

  const safeSalle = salleLabel.replace(/[^\w\-]+/g, '_');
  const safeDay = dayKey.replace(/[^\w\-]+/g, '_');
  await exportAudienceWorkbookXlsxStyled({
    headers,
    rows,
    subtitle: `Date d'audience : ${String(dateAudience || '-')} | Salle : ${salleLabel || '-'} | Tribunal : ${tribunalLabel || '-'}`,
    sheetName: 'Audience',
    colWidths: [{ wch: 22 }, { wch: 28 }, { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 34 }],
    filename: `audiences_${safeSalle || 'salle'}_${safeDay || 'jour'}.xlsx`
  });
}

function ensureManagerUser(users){
  const validUsers = Array.isArray(users) ? users.filter(Boolean).map(u=>({ ...u })) : [];
  const defaultManagerIdx = validUsers.findIndex(
    u=>String(u.username || '').trim().toLowerCase() === DEFAULT_MANAGER_USERNAME
  );

  if(defaultManagerIdx >= 0){
    // Keep "manager/1234" always available.
    validUsers[defaultManagerIdx].username = DEFAULT_MANAGER_USERNAME;
    validUsers[defaultManagerIdx].password = DEFAULT_MANAGER_PASSWORD;
    validUsers[defaultManagerIdx].role = 'manager';
    if(!Array.isArray(validUsers[defaultManagerIdx].clientIds)){
      validUsers[defaultManagerIdx].clientIds = [];
    }
    return validUsers;
  }

  const maxId = validUsers.reduce((acc, u)=>Math.max(acc, Number(u.id) || 0), 0);
  validUsers.unshift({
    id: Math.max(1, maxId + 1),
    username: DEFAULT_MANAGER_USERNAME,
    password: DEFAULT_MANAGER_PASSWORD,
    role: 'manager',
    clientIds: []
  });
  return validUsers;
}

function buildStateSignature(clients, salleAssignments, users, draft){
  try{
    return JSON.stringify({
      clients,
      salleAssignments,
      users,
      audienceDraft: draft
    });
  }catch(err){
    return '';
  }
}

async function persistAppStateNow(){
  const payload = {
    clients: AppState.clients,
    salleAssignments: AppState.salleAssignments,
    users: USERS,
    audienceDraft: audienceDraft
  };
  lastPersistedStateSignature = buildStateSignature(
    payload.clients,
    payload.salleAssignments,
    payload.users,
    payload.audienceDraft
  );
  if(typeof localStorage !== 'undefined'){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
  setSyncStatus('syncing');
  try{
    const res = await fetchWithTimeout(`${API_BASE}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 6000);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    setSyncStatus('ok');
  }catch(err){
    setSyncStatus('error');
    console.warn('Impossible de sauvegarder sur le serveur', err);
  }
}

function queuePersistAppState(){
  if(typeof localStorage !== 'undefined'){
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      clients: AppState.clients,
      salleAssignments: AppState.salleAssignments,
      users: USERS,
      audienceDraft: audienceDraft
    }));
  }
  setSyncStatus('syncing');
  if(persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(()=>{
    persistTimer = null;
    persistAppStateNow();
  }, 250);
}

async function loadPersistedState(){
  let loaded = false;
  let changed = false;
  try{
    const res = await fetchWithTimeout(`${API_BASE}/state`, { cache: 'no-store' }, 5000);
    if(res.ok){
      const parsed = await res.json();
      const loadedClients = Array.isArray(parsed?.clients)
        ? parsed.clients.map(normalizeClient).filter(Boolean)
        : [];
      const loadedUsers = Array.isArray(parsed?.users)
        ? parsed.users.map(normalizeUser).filter(Boolean)
        : [];
      const loadedSalleAssignments = normalizeSalleAssignments(parsed?.salleAssignments);
      const loadedDraft = parsed?.audienceDraft && typeof parsed.audienceDraft === 'object'
        ? parsed.audienceDraft
        : {};
      const nextUsers = ensureManagerUser(loadedUsers);
      const nextSignature = buildStateSignature(
        loadedClients,
        loadedSalleAssignments,
        nextUsers,
        loadedDraft
      );

      if(nextSignature && nextSignature === lastPersistedStateSignature){
        loaded = true;
        setSyncStatus('ok', 'Etat charge depuis serveur');
        return false;
      }

      AppState.clients = loadedClients;
      AppState.salleAssignments = loadedSalleAssignments;
      USERS = nextUsers;
      audienceDraft = loadedDraft;
      lastPersistedStateSignature = buildStateSignature(
        AppState.clients,
        AppState.salleAssignments,
        USERS,
        audienceDraft
      );
      syncCurrentUserFromUsers();
      loaded = true;
      changed = true;
      setSyncStatus('ok', 'Etat charge depuis serveur');
      if(typeof localStorage !== 'undefined'){
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            clients: AppState.clients,
            salleAssignments: AppState.salleAssignments,
            users: USERS,
            audienceDraft: audienceDraft
          })
        );
      }
    }
  }catch(err){
    console.warn('Impossible de charger depuis le serveur', err);
  }

  if(loaded) return changed;
  if(typeof localStorage === 'undefined') return false;
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const parsed = JSON.parse(raw);
    const loadedClients = Array.isArray(parsed?.clients)
      ? parsed.clients.map(normalizeClient).filter(Boolean)
      : [];
    const loadedUsers = Array.isArray(parsed?.users)
      ? parsed.users.map(normalizeUser).filter(Boolean)
      : [];
    const loadedSalleAssignments = normalizeSalleAssignments(parsed?.salleAssignments);
    const loadedDraft = parsed?.audienceDraft && typeof parsed.audienceDraft === 'object'
      ? parsed.audienceDraft
      : {};
    const nextUsers = ensureManagerUser(loadedUsers);
    const nextSignature = buildStateSignature(
      loadedClients,
      loadedSalleAssignments,
      nextUsers,
      loadedDraft
    );
    if(nextSignature && nextSignature === lastPersistedStateSignature){
      return false;
    }

    AppState.clients = loadedClients;
    AppState.salleAssignments = loadedSalleAssignments;
    USERS = nextUsers;
    audienceDraft = loadedDraft;
    lastPersistedStateSignature = buildStateSignature(
      AppState.clients,
      AppState.salleAssignments,
      USERS,
      audienceDraft
    );
    syncCurrentUserFromUsers();
    return true;
  }catch(err){
    console.warn('Etat local corrompu, utilisation des valeurs par défaut', err);
    return false;
  }
}

async function refreshRemoteState(){
  if(!currentUser) return;
  if(typeof document !== 'undefined' && document.hidden) return;
  if(editingDossier) return;
  if(importInProgress) return;
  if(persistTimer) return;
  if(Object.keys(audienceDraft || {}).length) return;
  const hasChanged = await loadPersistedState();
  if(!hasChanged) return;
  renderClients();
  renderDashboard();
  updateClientDropdown();
  renderSuivi();
  renderAudience();
  renderDiligence();
  renderSalle();
  renderEquipe();
}

function queueRemoteStateRefresh(delayMs = REMOTE_SYNC_EVENT_DEBOUNCE_MS){
  if(remoteRefreshTimer) clearTimeout(remoteRefreshTimer);
  remoteRefreshTimer = setTimeout(()=>{
    remoteRefreshTimer = null;
    refreshRemoteState().catch(()=>{});
  }, Math.max(0, Number(delayMs) || 0));
}

function startRemoteSync(){
  if(remoteSyncTimer) return;
  startRemoteSyncStream();
  refreshServerConnectionStatus().catch(()=>{});
  queueRemoteStateRefresh(0);
  remoteSyncTimer = setInterval(()=>{
    remoteSyncHealthTick = (remoteSyncHealthTick + 1) % REMOTE_SYNC_HEALTH_EVERY_TICKS;
    if(remoteSyncHealthTick === 0){
      refreshServerConnectionStatus().catch(()=>{});
    }
    if(!remoteSyncStreamConnected){
      queueRemoteStateRefresh(0);
    }
  }, REMOTE_SYNC_POLL_INTERVAL_MS);
}

function stopRemoteSync(){
  if(remoteSyncStream){
    remoteSyncStream.close();
    remoteSyncStream = null;
  }
  remoteSyncStreamConnected = false;
  if(remoteSyncStreamRetryTimer){
    clearTimeout(remoteSyncStreamRetryTimer);
    remoteSyncStreamRetryTimer = null;
  }
  if(remoteRefreshTimer){
    clearTimeout(remoteRefreshTimer);
    remoteRefreshTimer = null;
  }
  if(!remoteSyncTimer) return;
  clearInterval(remoteSyncTimer);
  remoteSyncTimer = null;
}

function scheduleRemoteSyncStreamRetry(){
  if(remoteSyncStreamRetryTimer) return;
  remoteSyncStreamRetryTimer = setTimeout(()=>{
    remoteSyncStreamRetryTimer = null;
    if(!currentUser) return;
    startRemoteSyncStream();
  }, 1000);
}

function startRemoteSyncStream(){
  if(typeof EventSource === 'undefined') return;
  if(remoteSyncStream) return;
  try{
    const stream = new EventSource(`${API_BASE}/state/stream`);
    remoteSyncStream = stream;
    stream.onopen = ()=>{
      remoteSyncStreamConnected = true;
      setSyncStatus('ok', 'Connecte au serveur (actif)');
    };
    stream.addEventListener('state', (event)=>{
      try{
        const payload = JSON.parse(String(event?.data || '{}'));
        if(payload?.updatedAt) setLiveDelayMetricFromIso(payload.updatedAt);
      }catch(err){}
      queueRemoteStateRefresh();
    });
    stream.onmessage = (event)=>{
      try{
        const payload = JSON.parse(String(event?.data || '{}'));
        if(payload?.updatedAt) setLiveDelayMetricFromIso(payload.updatedAt);
      }catch(err){}
      queueRemoteStateRefresh();
    };
    stream.onerror = ()=>{
      remoteSyncStreamConnected = false;
      if(remoteSyncStream){
        remoteSyncStream.close();
        remoteSyncStream = null;
      }
      scheduleRemoteSyncStreamRetry();
    };
  }catch(err){
    scheduleRemoteSyncStreamRetry();
  }
}

function parseExcelData(rows){
  const dossierHeaderKeys = {
    client: ['client', 'clients', 'nom client', 'nom clients'],
    affectation: ['affectation', 'date affectation', 'date d affectation'],
    type: ['type'],
    procedure: ['procedure', 'procedure (choix multiple)', 'procédure'],
    refClient: ['ref client', 'refclient', 'ref. client', 'ref client ', 'reference client', 'réference client', 'référence client'],
    debiteur: ['debiteur', 'debiteur ', 'débiteur'],
    montant: ['montant'],
    immatriculation: ['immatriculation'],
    marque: ['marque'],
    adresse: ['adresse'],
    ville: ['ville'],
    refAssignation: ['reference dossier assignation', 'réference dossier assignation', 'référence dossier assignation', 'ref dossier assignation'],
    refRestitution: ['reference dossier restitution', 'réference dossier restitution', 'référence dossier restitution', 'ref dossier restitution'],
    refSfdc: ['reference dossier sfdc', 'réference dossier sfdc', 'référence dossier sfdc', 'ref dossier sfdc']
  };

  const audienceHeaderKeys = {
    refClient: ['ref client', 'refclient', 'reference client', 'réference client', 'référence client'],
    debiteur: ['debiteur', 'débiteur'],
    refDossier: ['ref dossier', 'reference dossier', 'référence dossier'],
    audience: ['audience'],
    juge: ['juge'],
    sort: ['sort'],
    tribunal: ['tribunal'],
    dateDepot: ['date depot', 'date depôt', 'date depot ']
  };

  const dossiers = [];
  for(let i=0;i<rows.length;i++){
    const dossierColMap = buildHeaderMap(rows[i] || []);
    const looksLikeAudienceHeader =
      getColIndex(dossierColMap, audienceHeaderKeys.refDossier) !== -1
      && getColIndex(dossierColMap, audienceHeaderKeys.audience) !== -1;
    if(looksLikeAudienceHeader) continue;
    const hasDebiteur = getColIndex(dossierColMap, dossierHeaderKeys.debiteur) !== -1;
    const hasClientLike = getColIndex(dossierColMap, dossierHeaderKeys.client) !== -1;
    const hasDossierSignals =
      getColIndex(dossierColMap, dossierHeaderKeys.procedure) !== -1
      || getColIndex(dossierColMap, dossierHeaderKeys.type) !== -1
      || getColIndex(dossierColMap, dossierHeaderKeys.montant) !== -1
      || getColIndex(dossierColMap, dossierHeaderKeys.immatriculation) !== -1;
    if(!(hasDebiteur && (hasClientLike || hasDossierSignals))) continue;

    const idx = {
      client: getColIndex(dossierColMap, dossierHeaderKeys.client),
      affectation: getColIndex(dossierColMap, dossierHeaderKeys.affectation),
      type: getColIndex(dossierColMap, dossierHeaderKeys.type),
      procedure: getColIndex(dossierColMap, dossierHeaderKeys.procedure),
      refClient: getColIndex(dossierColMap, dossierHeaderKeys.refClient),
      debiteur: getColIndex(dossierColMap, dossierHeaderKeys.debiteur),
      montant: getColIndex(dossierColMap, dossierHeaderKeys.montant),
      immatriculation: getColIndex(dossierColMap, dossierHeaderKeys.immatriculation),
      marque: getColIndex(dossierColMap, dossierHeaderKeys.marque),
      adresse: getColIndex(dossierColMap, dossierHeaderKeys.adresse),
      ville: getColIndex(dossierColMap, dossierHeaderKeys.ville),
      refAssignation: getColIndex(dossierColMap, dossierHeaderKeys.refAssignation),
      refRestitution: getColIndex(dossierColMap, dossierHeaderKeys.refRestitution),
      refSfdc: getColIndex(dossierColMap, dossierHeaderKeys.refSfdc)
    };

    for(let j=i + 1; j<rows.length; j++){
      const row = rows[j] || [];
      const rowMap = buildHeaderMap(row);
      const rowLooksLikeAudienceHeader =
        getColIndex(rowMap, audienceHeaderKeys.refDossier) !== -1
        && getColIndex(rowMap, audienceHeaderKeys.audience) !== -1;
      if(rowLooksLikeAudienceHeader) break;
      const rowLooksLikeHeader =
        getColIndex(rowMap, dossierHeaderKeys.debiteur) !== -1
        && (
          getColIndex(rowMap, dossierHeaderKeys.client) !== -1
          || getColIndex(rowMap, dossierHeaderKeys.refClient) !== -1
        );
      if(rowLooksLikeHeader) break;

      const refClient = idx.refClient !== -1 ? String(row[idx.refClient] || '').trim() : '';
      const debiteur = idx.debiteur !== -1 ? String(row[idx.debiteur] || '').trim() : '';
      const clientName = idx.client !== -1 ? String(row[idx.client] || '').trim() : '';
      const procedureText = idx.procedure !== -1 ? String(row[idx.procedure] || '').trim() : '';
      const type = idx.type !== -1 ? String(row[idx.type] || '').trim() : '';
      const montant = idx.montant !== -1 ? String(row[idx.montant] || '').trim() : '';
      const isEmptyDossierRow = !refClient && !debiteur && !clientName && !procedureText && !type && !montant;
      if(isEmptyDossierRow) break;
      const isClientTitleRow = /^client\s*:/i.test(clientName) && !refClient && !debiteur && !procedureText && !type && !montant;
      if(isClientTitleRow) continue;

      dossiers.push({
        rowNumber: j + 1,
        clientName,
        dateAffectation: idx.affectation !== -1 ? parseExcelDateValue(row[idx.affectation]) : '',
        type,
        procedureText,
        refClient,
        debiteur,
        montant,
        immatriculation: idx.immatriculation !== -1 ? String(row[idx.immatriculation] || '').trim() : '',
        marque: idx.marque !== -1 ? String(row[idx.marque] || '').trim() : '',
        adresse: idx.adresse !== -1 ? String(row[idx.adresse] || '').trim() : '',
        ville: idx.ville !== -1 ? String(row[idx.ville] || '').trim() : '',
        refAssignation: idx.refAssignation !== -1 ? String(row[idx.refAssignation] || '').trim() : '',
        refRestitution: idx.refRestitution !== -1 ? String(row[idx.refRestitution] || '').trim() : '',
        refSfdc: idx.refSfdc !== -1 ? String(row[idx.refSfdc] || '').trim() : ''
      });
    }
  }

  const audiences = [];
  for(let i=0;i<rows.length;i++){
    const map = buildHeaderMap(rows[i] || []);
    const isAudienceHeader =
      getColIndex(map, audienceHeaderKeys.refClient) !== -1 &&
      getColIndex(map, audienceHeaderKeys.refDossier) !== -1 &&
      getColIndex(map, audienceHeaderKeys.audience) !== -1;
    if(!isAudienceHeader) continue;

    const idx = {
      refClient: getColIndex(map, audienceHeaderKeys.refClient),
      debiteur: getColIndex(map, audienceHeaderKeys.debiteur),
      refDossier: getColIndex(map, audienceHeaderKeys.refDossier),
      audience: getColIndex(map, audienceHeaderKeys.audience),
      juge: getColIndex(map, audienceHeaderKeys.juge),
      sort: getColIndex(map, audienceHeaderKeys.sort),
      tribunal: getColIndex(map, audienceHeaderKeys.tribunal),
      dateDepot: getColIndex(map, audienceHeaderKeys.dateDepot)
    };

    for(let j=i+1; j<rows.length; j++){
      const row = rows[j] || [];
      const refDossier = idx.refDossier !== -1 ? String(row[idx.refDossier] || '').trim() : '';
      const debiteur = idx.debiteur !== -1 ? String(row[idx.debiteur] || '').trim() : '';
      const refClient = idx.refClient !== -1 ? String(row[idx.refClient] || '').trim() : '';
      if(!refDossier && !debiteur && !refClient) break;
      audiences.push({
        rowNumber: j + 1,
        refClient,
        debiteur,
        refDossier,
        audience: idx.audience !== -1 ? String(row[idx.audience] || '').trim() : '',
        juge: idx.juge !== -1 ? String(row[idx.juge] || '').trim() : '',
        sort: idx.sort !== -1 ? String(row[idx.sort] || '').trim() : '',
        tribunal: idx.tribunal !== -1 ? String(row[idx.tribunal] || '').trim() : '',
        dateDepot: idx.dateDepot !== -1 ? parseExcelDateValue(row[idx.dateDepot]) : ''
      });
    }
  }

  return { dossiers, audiences };
}

function buildExcelImportIssueMessage(issues){
  if(!Array.isArray(issues) || !issues.length) return '';
  const maxIssues = 200;
  const limitedIssues = issues.slice(0, maxIssues);
  const groupedByLine = new Map();
  const unknownLineLabel = 'Ligne ?';

  const parseIssue = (issueText)=>{
    const rawText = String(issueText || '').trim();
    const lineMatch = rawText.match(/^Ligne\s+(\d+|\?)\s*:\s*(.+)$/i);
    if(!lineMatch){
      return {
        lineNumber: null,
        lineLabel: unknownLineLabel,
        detail: rawText
      };
    }
    const lineToken = lineMatch[1];
    const detail = lineMatch[2].trim();
    const parsedNumber = Number(lineToken);
    return {
      lineNumber: Number.isFinite(parsedNumber) ? parsedNumber : null,
      lineLabel: Number.isFinite(parsedNumber) ? `Ligne ${parsedNumber}` : unknownLineLabel,
      detail
    };
  };

  const classifyIssue = (detail)=>{
    const normalized = String(detail || '').toLowerCase();
    if(normalized.includes('ref client introuvable')) return 'Ref client';
    if(normalized.includes('ref dossier introuvable')) return 'Ref dossier';
    if(normalized.includes('procédure inconnue') || normalized.includes('procedure inconnue')) return 'Procédure';
    if(normalized.includes('date audience invalide')) return 'Date audience';
    if(normalized.includes('audience ignorée')) return 'Audience';
    if(normalized.includes('dossier ignoré') || normalized.includes('dossier ignore')) return 'Dossier';
    return 'Autre';
  };

  limitedIssues.forEach(issue=>{
    const parsed = parseIssue(issue);
    const key = parsed.lineNumber === null ? `${unknownLineLabel}:${parsed.detail}` : String(parsed.lineNumber);
    if(!groupedByLine.has(key)){
      groupedByLine.set(key, {
        lineNumber: parsed.lineNumber,
        lineLabel: parsed.lineLabel,
        details: []
      });
    }
    groupedByLine.get(key).details.push({
      type: classifyIssue(parsed.detail),
      text: parsed.detail
    });
  });

  const groups = [...groupedByLine.values()].sort((a, b)=>{
    if(a.lineNumber === null && b.lineNumber === null) return 0;
    if(a.lineNumber === null) return 1;
    if(b.lineNumber === null) return -1;
    return a.lineNumber - b.lineNumber;
  });

  const lines = ['Erreurs classées par ligne :'];
  groups.forEach(group=>{
    lines.push(`${group.lineLabel}:`);
    group.details.forEach((detail, idx)=>{
      lines.push(`  ${idx + 1}) [${detail.type}] ${detail.text}`);
    });
  });

  if(issues.length > maxIssues){
    lines.push('');
    lines.push(`... +${issues.length - maxIssues} autres lignes ignorées`);
  }
  return lines.join('\n');
}

function renderExcelImportIssues(issuesText, container){
  if(!container) return;
  const text = String(issuesText || '').trim() || 'Aucune erreur.';
  container.dataset.copyText = text;

  if(text === 'Aucune erreur.'){
    container.innerHTML = '<div class="import-error-empty">Aucune erreur.</div>';
    return;
  }

  const lines = text.split(/\r?\n/);
  const intro = [];
  const groups = [];
  const extras = [];
  let currentGroup = null;

  lines.forEach(rawLine=>{
    const line = String(rawLine || '').trim();
    if(!line) return;
    if(/^ligne\s+(\d+|\?)\s*:$/i.test(line)){
      currentGroup = { title: line, items: [] };
      groups.push(currentGroup);
      return;
    }
    if(line.startsWith('... +')){
      extras.push(line);
      return;
    }
    if(currentGroup){
      currentGroup.items.push(line);
    }else{
      intro.push(line);
    }
  });

  const html = [];
  if(intro.length){
    html.push(`<div class="import-error-intro">${escapeHtml(intro.join(' '))}</div>`);
  }

  groups.forEach((group, idx)=>{
    const colorClass = `color-${(idx % 6) + 1}`;
    html.push(`<div class="import-error-line ${colorClass}">`);
    html.push(`<div class="import-error-line-head">${escapeHtml(group.title)}</div>`);
    group.items.forEach(item=>{
      const itemMatch = item.match(/^\d+\)\s*\[([^\]]+)\]\s*(.+)$/);
      if(itemMatch){
        html.push(`<div class="import-error-item"><span class="import-error-badge">${escapeHtml(itemMatch[1])}</span><span class="import-error-text">${escapeHtml(itemMatch[2])}</span></div>`);
        return;
      }
      const plainItemMatch = item.match(/^\d+\)\s*(.+)$/);
      if(plainItemMatch){
        html.push(`<div class="import-error-item"><span class="import-error-text">${escapeHtml(plainItemMatch[1])}</span></div>`);
        return;
      }
      html.push(`<div class="import-error-note">${escapeHtml(item)}</div>`);
    });
    html.push('</div>');
  });

  if(extras.length){
    html.push(`<div class="import-error-extra">${escapeHtml(extras.join(' | '))}</div>`);
  }

  container.innerHTML = html.join('');
}

function closeImportResultModal(){
  const modal = $('importResultModal');
  if(modal) modal.style.display = 'none';
}

async function copyImportErrors(){
  const field = $('importResultErrors');
  if(!field) return;
  const text = String(field.dataset?.copyText || field.innerText || '').trim();
  if(!text) return alert('Aucune erreur à copier.');
  try{
    if(navigator?.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
    }else{
      const temp = document.createElement('textarea');
      temp.value = text;
      temp.setAttribute('readonly', 'readonly');
      temp.style.position = 'fixed';
      temp.style.opacity = '0';
      document.body.appendChild(temp);
      temp.focus();
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
    }
    alert('Erreurs copiées.');
  }catch(err){
    console.error(err);
    alert('Copie impossible. Sélectionnez et copiez manuellement.');
  }
}

function showExcelImportResult(summary, issuesText){
  const modal = $('importResultModal');
  const summaryNode = $('importResultSummary');
  const errorsNode = $('importResultErrors');
  if(!modal || !summaryNode || !errorsNode){
    alert([summary, issuesText ? `\nDétails:\n${issuesText}` : ''].filter(Boolean).join('\n'));
    return;
  }
  summaryNode.innerText = summary;
  renderExcelImportIssues(issuesText || 'Aucune erreur.', errorsNode);
  errorsNode.scrollTop = 0;
  modal.style.display = 'flex';
}

function applyExcelImport(payload){
  const { dossiers, audiences } = payload;
  if(!dossiers.length){
    alert('Aucune ligne de dossier trouvée. Vérifiez les colonnes Excel (ex: Client/Ref client, Débiteur, Procédure/Type).');
    return;
  }

  const importIgnoredRows = [];
  const knownProcedureSet = new Set(['ASS', 'Restitution', 'Nantissement', 'SFDC', 'S/bien', 'Injonction']);
  let importedDossiersCount = 0;
  let linkedAudiencesCount = 0;

  const clientMap = new Map();
  AppState.clients.forEach(c=>clientMap.set(String(c.name || '').trim().toLowerCase(), c));

  const refToProcMap = new Map();
  const dossierRefClientSet = new Set();
  const rowRefClientToProcMap = new Map();
  const candidateSeenByMap = new WeakMap();

  const pushCandidate = (map, key, candidate)=>{
    if(!key) return;
    if(!map.has(key)) map.set(key, []);
    const arr = map.get(key);
    let seen = candidateSeenByMap.get(arr);
    if(!seen){
      seen = new Set();
      candidateSeenByMap.set(arr, seen);
    }
    const signature = `${candidate.client?.id || ''}::${candidate.proc || ''}::${candidate.rowRefClient || ''}::${candidate.rowDebiteur || ''}`;
    if(seen.has(signature)) return;
    seen.add(signature);
    arr.push(candidate);
  };

  const formatProcedureContextFromText = (procedureText)=>{
    const parsed = parseProcedureList(procedureText);
    if(parsed.length) return parsed.join(', ');
    const raw = String(procedureText || '').trim();
    return raw || 'non déterminée';
  };

  const formatProcedureContextFromCandidates = (candidates)=>{
    const set = new Set((candidates || []).map(c=>String(c?.proc || '').trim()).filter(Boolean));
    return set.size ? [...set].join(', ') : 'non déterminée';
  };

  const buildIssueContext = ({ source = '', zone = '', procedure = '' } = {})=>{
    const parts = [];
    if(source) parts.push(`Source: ${source}`);
    if(zone) parts.push(`Zone: ${zone}`);
    if(procedure) parts.push(`Procédure: ${procedure}`);
    return parts.length ? ` | ${parts.join(' | ')}` : '';
  };

  const registerFallbackFromDossier = (client, dossier)=>{
    const rowDebiteur = String(dossier?.debiteur || '').trim().toLowerCase();
    const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
      ? dossier.procedureDetails
      : {};
    const detailProcRefs = [];
    Object.entries(details).forEach(([procName, procDetails])=>{
      const proc = String(procName || '').trim() || 'ASS';
      const refs = splitReferenceValues(procDetails?.referenceClient || '');
      refs.forEach(ref=>detailProcRefs.push({ ref, proc }));
    });

    const mainRefs = splitReferenceValues(dossier?.referenceClient || '');
    const allRefs = [];
    if(mainRefs.length){
      mainRefs.forEach(ref=>allRefs.push({ ref, proc: '' }));
    }else{
      const fallbackRef = String(dossier?.referenceClient || '').trim();
      if(fallbackRef) allRefs.push({ ref: fallbackRef, proc: '' });
    }
    detailProcRefs.forEach(item=>allRefs.push(item));

    const detailProcs = Object.keys(details).filter(Boolean);
    const procList = detailProcs.length
      ? detailProcs
      : (Array.isArray(dossier?.procedureList) && dossier.procedureList.length
        ? dossier.procedureList
        : String(dossier?.procedure || '').split(',').map(v=>String(v || '').trim()).filter(Boolean));
    const defaultProc = procList[0] || 'ASS';

    allRefs.forEach(({ ref, proc })=>{
      const refKey = normalizeReferenceValue(ref);
      if(!refKey) return;
      dossierRefClientSet.add(refKey);
      pushCandidate(rowRefClientToProcMap, refKey, {
        dossier,
        client,
        proc: String(proc || '').trim() || defaultProc,
        rowRefClient: refKey,
        rowDebiteur
      });
    });
  };

  AppState.clients.forEach(client=>{
    (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach(dossier=>{
      registerFallbackFromDossier(client, dossier);
    });
  });

  dossiers.forEach(row=>{
    const rowNumberLabel = Number.isFinite(Number(row?.rowNumber)) ? `Ligne ${Number(row.rowNumber)}` : 'Ligne ?';
    const dossierProcedureContext = formatProcedureContextFromText(row?.procedureText || '');
    const dossierContext = buildIssueContext({
      source: 'Dossiers',
      zone: 'Dossiers globaux',
      procedure: dossierProcedureContext
    });
    const rawProcedureTokens = String(row?.procedureText || '')
      .split(/[+,]/)
      .map(v=>String(v || '').trim())
      .filter(Boolean);
    const normalizedProcedureTokens = rawProcedureTokens.map(v=>parseProcedureToken(v));
    const unknownProcedureTokens = rawProcedureTokens.filter((raw, idx)=>!knownProcedureSet.has(normalizedProcedureTokens[idx]));
    if(unknownProcedureTokens.length){
      importIgnoredRows.push(`${rowNumberLabel}: procédure inconnue (${unknownProcedureTokens.join(', ')})${dossierContext}`);
    }
    const clientName = row.clientName || row.debiteur || 'Client';
    const clientKey = String(clientName).trim().toLowerCase();
    let client = clientMap.get(clientKey);
    if(!client){
      client = { id: Date.now() + Math.floor(Math.random() * 100000), name: clientName, dossiers: [] };
      AppState.clients.push(client);
      clientMap.set(clientKey, client);
    }

    const procedures = parseProcedureList(row.procedureText);
    if(!procedures.length){
      importIgnoredRows.push(`${rowNumberLabel}: dossier ignoré (aucune procédure valide) - Ref client "${row.refClient || '-'}", Débiteur "${row.debiteur || '-'}"${dossierContext}`);
      return;
    }
    const procedureDetails = {};

    const dossier = {
      debiteur: row.debiteur,
      boiteNo: '',
      referenceClient: row.refClient || row.refAssignation || row.refRestitution || row.refSfdc || '',
      dateAffectation: row.dateAffectation || '',
      procedure: procedures.join(', '),
      procedureList: procedures.slice(),
      procedureDetails,
      ville: row.ville,
      adresse: row.adresse,
      montant: row.montant,
      montantByProcedure: normalizeProcedureMontantGroups(
        [],
        procedures,
        row.montant || ''
      ),
      ww: row.immatriculation,
      marque: row.marque,
      type: row.type,
      note: '',
      avancement: '',
      statut: 'En cours',
      files: []
    };

    const setProcRef = (proc, ref)=>{
      const refText = String(ref || '').trim();
      const refKey = normalizeReferenceValue(refText);
      if(!refKey) return;
      dossierRefClientSet.add(refKey);
      if(!dossier.procedureDetails[proc]) dossier.procedureDetails[proc] = {};
      dossier.procedureDetails[proc].referenceClient = refText;
      const baseRowRefClient = normalizeReferenceValue(row.refClient || '');
      const candidate = {
        dossier,
        client,
        proc,
        rowRefClient: baseRowRefClient,
        rowDebiteur: String(row.debiteur || '').trim().toLowerCase()
      };
      pushCandidate(refToProcMap, refKey, candidate);
      const rowRefParts = splitReferenceValues(row.refClient || '');
      if(!rowRefParts.length && baseRowRefClient){
        pushCandidate(rowRefClientToProcMap, baseRowRefClient, candidate);
        dossierRefClientSet.add(baseRowRefClient);
      }else{
        rowRefParts.forEach(part=>{
          const key = normalizeReferenceValue(part);
          if(!key) return;
          pushCandidate(rowRefClientToProcMap, key, { ...candidate, rowRefClient: key });
          dossierRefClientSet.add(key);
        });
      }
    };

    setProcRef('ASS', row.refAssignation);
    setProcRef('Restitution', row.refRestitution);
    setProcRef('SFDC', row.refSfdc);

    client.dossiers.push(dossier);
    importedDossiersCount += 1;
  });

  audiences.forEach(row=>{
    const rowNumberLabel = Number.isFinite(Number(row?.rowNumber)) ? `Ligne ${Number(row.rowNumber)}` : 'Ligne ?';
    const audienceBaseContext = buildIssueContext({
      source: 'Audience',
      zone: 'Import audience'
    });
    const ref = String(row.refDossier || '').trim();
    const refKey = normalizeReferenceValue(ref);
    if(!refKey){
      importIgnoredRows.push(`${rowNumberLabel}: audience ignorée (ref dossier vide) - Débiteur "${row.debiteur || '-'}"${audienceBaseContext}`);
      return;
    }
    const normalizedAudienceDate = normalizeDateDDMMYYYY(row.audience || '');
    if(String(row.audience || '').trim() && !normalizedAudienceDate){
      importIgnoredRows.push(`${rowNumberLabel}: date audience invalide "${row.audience}" (format attendu jj/mm/aaaa)${audienceBaseContext}`);
    }
    const rowRefClientParts = splitReferenceValues(row.refClient || '');
    const rowRefClientKeys = rowRefClientParts.map(v=>normalizeReferenceValue(v)).filter(Boolean);
    const rowRefClientKeySet = new Set(rowRefClientKeys);
    const candidatesByRefDossier = refToProcMap.get(refKey) || [];
    const procByRefDossier = formatProcedureContextFromCandidates(candidatesByRefDossier);
    const missingRefContext = buildIssueContext({
      source: 'Audience',
      zone: 'Dossiers globaux',
      procedure: procByRefDossier
    });
    if(rowRefClientKeys.length){
      const missingRefClientKeys = [...new Set(rowRefClientKeys.filter(key=>!dossierRefClientSet.has(key)))];
      if(missingRefClientKeys.length){
        importIgnoredRows.push(
          `${rowNumberLabel}: ref client introuvable${missingRefClientKeys.length > 1 ? 's' : ''} (${missingRefClientKeys.join('/')})${missingRefContext}`
        );
      }
    }
    let candidates = candidatesByRefDossier;
    if(!candidates.length){
      const fallback = [];
      const fallbackSeen = new Set();
      rowRefClientKeys.forEach(key=>{
        const items = rowRefClientToProcMap.get(key) || [];
        items.forEach(item=>{
          const signature = `${item.client?.id || ''}::${item.proc || ''}::${item.rowRefClient || ''}::${item.rowDebiteur || ''}`;
          if(fallbackSeen.has(signature)) return;
          fallbackSeen.add(signature);
          fallback.push(item);
        });
      });
      if(!fallback.length){
        importIgnoredRows.push(`${rowNumberLabel}: ref dossier introuvable "${ref}" (aucun dossier importé correspondant)${missingRefContext}`);
        return;
      }
      candidates = fallback;
      const fallbackProcContext = formatProcedureContextFromCandidates(candidates);
      const fallbackContext = buildIssueContext({
        source: 'Audience',
        zone: 'Dossiers globaux',
        procedure: fallbackProcContext
      });
      const foundInDossiers = rowRefClientParts.filter(part=>dossierRefClientSet.has(normalizeReferenceValue(part)));
      if(foundInDossiers.length){
        importIgnoredRows.push(`${rowNumberLabel}: ref dossier "${ref}" introuvable, liaison via ref client (${foundInDossiers.join('/')})${fallbackContext}`);
      }else{
        importIgnoredRows.push(`${rowNumberLabel}: ref dossier "${ref}" introuvable, liaison via ref client${fallbackContext}`);
      }
    }
    const rowDebiteur = String(row.debiteur || '').trim().toLowerCase();
    let match = null;
    if(rowRefClientKeySet.size){
      match = candidates.find(c=>rowRefClientKeySet.has(c.rowRefClient)) || null;
    }
    if(!match && rowDebiteur){
      match = candidates.find(c=>c.rowDebiteur === rowDebiteur) || null;
    }
    if(!match) match = candidates[0];
    const { dossier, proc } = match;
    if(!dossier.procedureDetails) dossier.procedureDetails = {};
    if(!dossier.procedureDetails[proc]) dossier.procedureDetails[proc] = {};
    const p = dossier.procedureDetails[proc];
    if(row.audience) p.audience = row.audience;
    if(row.juge) p.juge = row.juge;
    if(row.sort) p.sort = row.sort;
    if(row.tribunal) p.tribunal = row.tribunal;
    // In audience import files, "date depot" corresponds to procedure "Dépôt le".
    if(row.dateDepot) p.depotLe = row.dateDepot;
    linkedAudiencesCount += 1;
  });

  queuePersistAppState();
  renderClients();
  renderDashboard();
  updateClientDropdown();
  renderSuivi();
  renderAudience();
  renderDiligence();
  renderEquipe();
  const issuesText = buildExcelImportIssueMessage(importIgnoredRows);
  const summary = [
    `Import terminé.`,
    `Dossiers détectés: ${dossiers.length}`,
    `Dossiers importés: ${importedDossiersCount}`,
    `Audiences détectées: ${audiences.length}`,
    `Audiences liées: ${linkedAudiencesCount}`,
    `Erreurs ignorées (non bloquantes): ${importIgnoredRows.length}`
  ].join('\n');
  showExcelImportResult(summary, issuesText);
}

async function handleExcelImportFile(file){
  if(importInProgress) return;
  if(!file) return;
  const excelReady = await ensureExcelLibraries({ needXlsx: true, needExcelJs: false });
  if(!excelReady){
    return;
  }
  importInProgress = true;
  try{
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
      dateNF: 'dd/mm/yyyy'
    });
    const parsed = parseExcelData(rows);
    applyExcelImport(parsed);
  }catch(err){
    console.error(err);
    alert('Erreur import Excel. Vérifiez le format.');
  }finally{
    importInProgress = false;
  }
}

async function exportBackupExcelImportable(){
  const dossierHeaders = [
    'client',
    'affectation',
    'type',
    'procedure',
    'ref client',
    'debiteur',
    'montant',
    'immatriculation',
    'marque',
    'adresse',
    'ville',
    'ref dossier assignation',
    'ref dossier restitution',
    'ref dossier sfdc'
  ];
  const audienceHeaders = [
    'ref client',
    'debiteur',
    'ref dossier',
    'audience',
    'juge',
    'sort',
    'tribunal',
    'date depot'
  ];

  const clients = getVisibleClients();
  const clientBlocks = clients.map(client=>{
    const clientDossierRows = [];
    const clientAudienceRows = [];
    (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach(dossier=>{
      const procedures = normalizeProcedures(dossier);
      const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
        ? dossier.procedureDetails
        : {};
      const assignationRef = String(details?.ASS?.referenceClient || '').trim();
      const restitutionRef = String(details?.Restitution?.referenceClient || '').trim();
      const sfdcRef = String(
        details?.SFDC?.referenceClient
        || details?.['S/bien']?.referenceClient
        || details?.Injonction?.referenceClient
        || ''
      ).trim();

      clientDossierRows.push([
        String(client?.name || '').trim(),
        String(dossier?.dateAffectation || '').trim(),
        String(dossier?.type || '').trim(),
        procedures.join('+'),
        String(dossier?.referenceClient || '').trim(),
        String(dossier?.debiteur || '').trim(),
        String(dossier?.montant || '').trim(),
        String(dossier?.ww || '').trim(),
        String(dossier?.marque || '').trim(),
        String(dossier?.adresse || '').trim(),
        String(dossier?.ville || '').trim(),
        assignationRef,
        restitutionRef,
        sfdcRef
      ]);
      Object.entries(details).forEach(([procName, procDetails])=>{
        if(!isAudienceProcedure(procName)) return;
        const p = procDetails || {};
        const row = [
          String(dossier?.referenceClient || '').trim(),
          String(dossier?.debiteur || '').trim(),
          String(p?.referenceClient || '').trim(),
          String(p?.audience || '').trim(),
          String(p?.juge || '').trim(),
          String(p?.sort || '').trim(),
          String(p?.tribunal || '').trim(),
          String(p?.depotLe || p?.dateDepot || '').trim()
        ];
        clientAudienceRows.push({ cells: row, color: String(p?.color || '').trim() });
      });
    });
    return {
      clientName: String(client?.name || '').trim(),
      dossierRows: clientDossierRows,
      audienceRows: clientAudienceRows
    };
  });

  const excelReady = await ensureExcelLibraries({ needXlsx: true, needExcelJs: true });
  if(!excelReady){
    return;
  }

  const totalCols = 14;
  const fillToCols = (arr, size)=>[...arr, ...Array(Math.max(0, size - arr.length)).fill('')];
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '_',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ].join('');

  if(typeof ExcelJS !== 'undefined'){
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sauvegarde');
    const colWidths = [18, 15, 12, 26, 16, 20, 14, 16, 14, 30, 14, 20, 20, 20];
    sheet.columns = colWidths.map(width=>({ width }));
    const lastColLetter = String.fromCharCode(64 + totalCols);
    const rowMeta = new Map();
    const audienceRowColorMap = new Map();

    const addRow = (cells, type, extra = {})=>{
      const row = sheet.addRow(fillToCols(cells, totalCols));
      rowMeta.set(row.number, { type, ...extra });
      return row;
    };

    addRow(['SAUVEGARDE IMPORTABLE'], 'title');
    sheet.mergeCells(`A1:${lastColLetter}1`);

    if(clientBlocks.length){
      clientBlocks.forEach((block, index)=>{
        addRow([`CLIENT : ${block.clientName || '-'}`], 'client');
        addRow(dossierHeaders, 'dossier-header');
        if(block.dossierRows.length){
          block.dossierRows.forEach(cells=>addRow(cells, 'dossier-data'));
        }else{
          addRow([''], 'spacer');
        }
        addRow([''], 'spacer');
        addRow(audienceHeaders, 'audience-header');
        if(block.audienceRows.length){
          block.audienceRows.forEach(audienceRow=>{
            const row = addRow(audienceRow.cells, 'audience-data');
            if(audienceRow.color) audienceRowColorMap.set(row.number, String(audienceRow.color).trim());
          });
        }else{
          addRow([''], 'spacer');
        }
        if(index < clientBlocks.length - 1){
          addRow([''], 'spacer');
          addRow([''], 'spacer');
        }
      });
    }else{
      addRow(dossierHeaders, 'dossier-header');
      addRow([''], 'spacer');
      addRow([''], 'spacer');
      addRow(audienceHeaders, 'audience-header');
      addRow([''], 'spacer');
    }

    const border = {
      top: { style: 'thin', color: { argb: 'FFCCD4E1' } },
      left: { style: 'thin', color: { argb: 'FFCCD4E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCCD4E1' } },
      right: { style: 'thin', color: { argb: 'FFCCD4E1' } }
    };
    const palette = {
      titleBg: 'FF123B8C',
      titleFg: 'FFFFFFFF',
      clientBg: 'FFE8EFFD',
      clientFg: 'FF123B8C',
      dossierHeaderBg: 'FF1A4590',
      audienceHeaderBg: 'FF0F766E',
      headerFg: 'FFFFFFFF',
      audienceBlue: 'FFE3F0FF',
      audienceGreen: 'FFE8F8EE',
      audienceRed: 'FFFDEAEA',
      audienceYellow: 'FFFFF9DB',
      audiencePurpleDark: 'FFEDE6FF',
      audiencePurpleLight: 'FFF5EEFF',
      rowAlt: 'FFF8FAFC'
    };
    const audienceFillByColor = {
      blue: palette.audienceBlue,
      green: palette.audienceGreen,
      red: palette.audienceRed,
      yellow: palette.audienceYellow,
      'purple-dark': palette.audiencePurpleDark,
      'purple-light': palette.audiencePurpleLight
    };

    sheet.getRow(1).height = 36;
    for(let r = 1; r <= sheet.rowCount; r++){
      const row = sheet.getRow(r);
      const meta = rowMeta.get(r) || { type: '' };
      const isHeader = meta.type === 'dossier-header' || meta.type === 'audience-header';
      const isTitle = meta.type === 'title';
      const isClient = meta.type === 'client';
      const isSpacer = meta.type === 'spacer';
      row.height = isTitle ? 36 : isHeader ? 28 : isClient ? 24 : 22;

      if(isClient){
        sheet.mergeCells(`A${r}:${lastColLetter}${r}`);
      }

      for(let c = 1; c <= totalCols; c++){
        const cell = row.getCell(c);
        if(isSpacer){
          cell.value = '';
          continue;
        }
        cell.border = border;
        cell.font = { name: 'Arial', size: 11, color: { argb: 'FF111827' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };

        if(isTitle){
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.titleBg } };
          cell.font = { name: 'Arial', size: 18, bold: true, color: { argb: palette.titleFg } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }else if(isClient){
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.clientBg } };
          cell.font = { name: 'Arial', size: 13, bold: true, color: { argb: palette.clientFg } };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }else if(meta.type === 'dossier-header'){
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.dossierHeaderBg } };
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: palette.headerFg } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }else if(meta.type === 'audience-header'){
          const inAudienceCols = c <= audienceHeaders.length;
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: inAudienceCols ? palette.audienceHeaderBg : 'FFFFFFFF' }
          };
          cell.font = {
            name: 'Arial',
            size: 11,
            bold: true,
            color: { argb: inAudienceCols ? palette.headerFg : 'FF111827' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }else if(meta.type === 'audience-data'){
          const rowColor = audienceRowColorMap.get(r) || '';
          const mappedFill = audienceFillByColor[rowColor];
          const fallbackAlt = r % 2 === 0 ? palette.rowAlt : '';
          const fg = mappedFill || fallbackAlt;
          if(fg){
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fg } };
          }
          if(c > audienceHeaders.length){
            cell.value = '';
          }
        }else if(meta.type === 'dossier-data'){
          if(r % 2 === 0){
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.rowAlt } };
          }
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob(
      [buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sauvegarde_importable_${stamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const aoa = [];
  aoa.push(fillToCols(['SAUVEGARDE IMPORTABLE'], totalCols));

  if(clientBlocks.length){
    clientBlocks.forEach((block, index)=>{
      aoa.push(fillToCols([`CLIENT : ${block.clientName || '-'}`], totalCols));
      aoa.push(fillToCols(dossierHeaders, totalCols));
      if(block.dossierRows.length){
        block.dossierRows.forEach(r=>aoa.push(fillToCols(r, totalCols)));
      }else{
        aoa.push(fillToCols([''], totalCols));
      }
      aoa.push(fillToCols([''], totalCols));
      aoa.push(fillToCols(audienceHeaders, totalCols));
      if(block.audienceRows.length){
        block.audienceRows.forEach(r=>aoa.push(fillToCols(r.cells, totalCols)));
      }else{
        aoa.push(fillToCols([''], totalCols));
      }
      if(index < clientBlocks.length - 1){
        aoa.push(fillToCols([''], totalCols));
        aoa.push(fillToCols([''], totalCols));
      }
    });
  }else{
    aoa.push(fillToCols(dossierHeaders, totalCols));
    aoa.push(fillToCols([''], totalCols));
    aoa.push(fillToCols([''], totalCols));
    aoa.push(fillToCols(audienceHeaders, totalCols));
    aoa.push(fillToCols([''], totalCols));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 26 }, { wch: 16 }, { wch: 20 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sauvegarde');
  XLSX.writeFile(wb, `sauvegarde_importable_${stamp}.xlsx`);
}

// ================== INIT ==================
async function initApplication(){
  setSyncStatus('syncing');
  renderSyncMetrics();
  await resolveApiBase();
  await loadPersistedState();
  hasLoadedState = true;
  setupEvents();
  restoreSidebarState();
  renderProcedureMontantGroups();
  renderClients();
  renderDashboard();
  updateClientDropdown();
  renderSuivi();
  renderAudience();
  renderDiligence();
  renderEquipe();
  startRemoteSync();
  showView('dashboard');
}

// ================== EVENTS ==================
function setupEvents(){
  $('sidebarToggleBtn')?.addEventListener('click', toggleSidebar);
  $('dashboardLink').onclick = ()=>showView('dashboard');
  $('clientsLink').onclick = ()=>showView('clients');
  $('creationLink').onclick = ()=>showView('creation');
  $('suiviLink').onclick = ()=>showView('suivi');
  $('audienceLink').onclick = ()=>showView('audience');
  $('diligenceLink').onclick = ()=>showView('diligence');
  $('salleLink').onclick = ()=>showView('salle');
  $('equipeLink')?.addEventListener('click', ()=>showView('equipe'));

  $('loginBtn').onclick = login;
  $('username')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter') login();
  });
  $('password')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter') login();
  });
  $('logoutBtn').onclick = logout;
  $('closeDossierModalBtn')?.addEventListener('click', closeDossierModal);
  $('closeImportResultModalBtn')?.addEventListener('click', closeImportResultModal);
  $('copyImportErrorsBtn')?.addEventListener('click', copyImportErrors);
  $('dossierModal')?.addEventListener('click', (e)=>{
    if(e.target?.id === 'dossierModal') closeDossierModal();
  });
  $('importResultModal')?.addEventListener('click', (e)=>{
    if(e.target?.id === 'importResultModal') closeImportResultModal();
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key !== 'Escape') return;
    closeDossierModal();
    closeImportResultModal();
  });
  $('addClientBtn').onclick = ()=>addClient($('clientName').value);
  $('importExcelBtn')?.addEventListener('click', ()=> $('importExcelInput')?.click());
  $('exportBackupExcelBtn')?.addEventListener('click', ()=>{
    if(!canEditData()) return alert('Accès refusé');
    exportBackupExcelImportable().catch(err=>console.error(err));
  });
  $('importExcelInput')?.addEventListener('change', (e)=>{
    if(!canEditData()) return alert('Accès refusé');
    const file = e.target?.files?.[0];
    if(!file) return;
    handleExcelImportFile(file).catch(err=>console.error(err));
    e.target.value = '';
  });
  $('addDossierBtn').onclick = addDossier;
  $('montantInput')?.addEventListener('input', (e)=>{
    syncMainMontantToGroup1(e.target?.value || '');
  });
  $('dateAffectation')?.addEventListener('blur', (e)=>{
    const raw = String(e.target?.value || '').trim();
    if(!raw){
      e.target.value = '';
      return;
    }
    const normalized = normalizeDateDDMMYYYY(raw);
    if(!normalized){
      alert('Date d’affectation invalide. Utilisez le format jj/mm/aaaa.');
      return;
    }
    e.target.value = normalized;
    syncProcedureDateAffectationToCards(true);
  });
  $('uploadBtn')?.addEventListener('click', ()=> $('fileInput')?.click());
  $('fileInput')?.addEventListener('change', handleFiles);

  const dz = $('dropzone');
  if(dz){
    dz.addEventListener('dragover', (e)=>{
      e.preventDefault();
      dz.classList.add('dragover');
    });
    dz.addEventListener('dragleave', ()=> dz.classList.remove('dragover'));
    dz.addEventListener('drop', (e)=>{
      e.preventDefault();
      dz.classList.remove('dragover');
      handleFiles(e);
    });
  }

  document.querySelectorAll('.proc-check').forEach(cb=>{
    cb.addEventListener('change', e=>{
      if(suppressProcedureChange) return;
      const label = e.target.closest('label');
      if(label) label.classList.toggle('active', e.target.checked);
      if(!e.target.checked){
        const value = String(e.target.value || '').trim();
        if(value){
          editingOriginalProcedures = editingOriginalProcedures.filter(p=>p !== value);
        }
      }
      renderProcedureDetails();
    });
  });
  $('procedureCustom')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      addCustomProcedure();
    }
  });
  $('addProcedureBtn')?.addEventListener('click', addCustomProcedure);

  const renderClientsDebounced = debounce(renderClients, 120);
  const renderSuiviDebounced = debounce(renderSuivi, 120);
  const renderAudienceDebounced = debounce(renderAudience, 120);
  const renderDiligenceDebounced = debounce(renderDiligence, 120);
  const filterTeamClientListDebounced = debounce(filterTeamClientList, 120);

  $('searchClientInput')?.addEventListener('input', renderClientsDebounced);

  $('filterGlobal')?.addEventListener('input', renderSuiviDebounced);
  $('suiviBody')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const clientId = Number(btn.dataset.clientId);
    const dossierIndex = Number(btn.dataset.dossierIndex);
    if(!Number.isFinite(clientId) || !Number.isFinite(dossierIndex)) return;
    const action = btn.dataset.action;
    if(action === 'view') openDossierDetails(clientId, dossierIndex);
    if(action === 'edit') editDossier(clientId, dossierIndex);
    if(action === 'delete') deleteDossier(clientId, dossierIndex);
  });
  $('filterSuiviProcedure')?.addEventListener('change', (e)=>{
    filterSuiviProcedure = e.target.value;
    renderSuivi();
  });
  $('filterSuiviTribunal')?.addEventListener('change', (e)=>{
    filterSuiviTribunal = e.target.value === 'all' ? 'all' : resolveSuiviTribunalFilterKey(e.target.value);
    renderSuivi();
  });
  $('filterAudience')?.addEventListener('input', renderAudienceDebounced);
  $('audienceErrorsBtn')?.addEventListener('click', ()=>{
    filterAudienceErrorsOnly = !filterAudienceErrorsOnly;
    const btn = $('audienceErrorsBtn');
    if(btn) btn.classList.toggle('active', filterAudienceErrorsOnly);
    // Error mode must ignore color filtering and keep full base list.
    setSelectedAudienceColor('all', false);
    filterAudienceColor = 'all';
    const colorSel = $('filterAudienceColor');
    if(colorSel) colorSel.value = 'all';
    renderAudience();
  });
  $('diligenceProcedureFilter')?.addEventListener('change', (e)=>{
    filterDiligenceProcedure = e.target.value;
    renderDiligence();
  });
  $('diligenceSortFilter')?.addEventListener('change', (e)=>{
    filterDiligenceSort = e.target.value;
    renderDiligence();
  });
  $('diligenceDelegationFilter')?.addEventListener('change', (e)=>{
    filterDiligenceDelegation = e.target.value;
    renderDiligence();
  });
  $('diligenceOrdonnanceFilter')?.addEventListener('change', (e)=>{
    filterDiligenceOrdonnance = e.target.value;
    renderDiligence();
  });
  $('diligenceTribunalFilter')?.addEventListener('change', (e)=>{
    filterDiligenceTribunal = e.target.value;
    renderDiligence();
  });
  $('diligenceSearchInput')?.addEventListener('input', renderDiligenceDebounced);
  $('exportDiligenceBtn')?.addEventListener('click', exportDiligenceXLS);
  $('salleFilterSelect')?.addEventListener('change', (e)=>{
    filterSalle = String(e.target?.value || 'all');
    renderSalle();
  });
  $('salleTribunalFilter')?.addEventListener('change', (e)=>{
    filterSalleTribunal = String(e.target?.value || 'all');
    renderSidebarSalleSessions();
  });
  $('salleAudienceDateFilter')?.addEventListener('change', (e)=>{
    filterSalleAudienceDate = String(e.target?.value || '').trim();
    renderSidebarSalleSessions();
  });
  $('addSalleJudgeBtn')?.addEventListener('click', addSalleJudge);
  $('salleDayTabs')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-day]');
    if(!btn) return;
    selectedSalleDay = normalizeSalleWeekday(btn.dataset.day || '');
    renderSalle();
  });
  $('salleNameInput')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      addSalleJudge();
    }
  });
  $('salleJudgeInput')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      addSalleJudge();
    }
  });
  $('salleJudgeInput')?.addEventListener('blur', ()=>{
    const salle = normalizeSalleName($('salleNameInput')?.value || '');
    const juge = normalizeJudgeName($('salleJudgeInput')?.value || '');
    if(!salle || !juge) return;
    addSalleJudge();
  });
  $('teamRole')?.addEventListener('change', updateTeamClientSelectorState);
  $('teamSaveBtn')?.addEventListener('click', saveTeamUser);
  $('teamResetBtn')?.addEventListener('click', resetTeamForm);
  $('teamClientSearchInput')?.addEventListener('input', filterTeamClientListDebounced);
  $('filterAudienceColor')?.addEventListener('change', (e)=>{
    filterAudienceColor = e.target.value;
    renderAudience();
  });
  $('filterAudienceProcedure')?.addEventListener('change', (e)=>{
    filterAudienceProcedure = e.target.value;
    renderAudience();
  });
  $('filterAudienceTribunal')?.addEventListener('change', (e)=>{
    filterAudienceTribunal = e.target.value === 'all' ? 'all' : resolveAudienceTribunalFilterKey(e.target.value);
    renderAudience();
  });

  $('saveAudienceBtn')?.addEventListener('click', saveAllAudience);
  $('printAudienceBtn')?.addEventListener('click', ()=>{
    // Manual mode only: do not auto-check all rows.
    renderAudience();
  });
  $('selectAllPrintAudienceBtn')?.addEventListener('click', ()=>setAllVisibleAudienceRowsForPrint(true));
  $('clearAllPrintAudienceBtn')?.addEventListener('click', ()=>setAllVisibleAudienceRowsForPrint(false));
  $('exportAudienceBtn')?.addEventListener('click', exportAudienceXLS);
  $('exportAudienceDetailBtn')?.addEventListener('click', exportAudienceXLS);
  $('calendarPrevBtn')?.addEventListener('click', ()=>{
    dashboardCalendarCursor = new Date(dashboardCalendarCursor.getFullYear(), dashboardCalendarCursor.getMonth() - 1, 1);
    renderDashboardCalendar();
  });
  $('calendarNextBtn')?.addEventListener('click', ()=>{
    dashboardCalendarCursor = new Date(dashboardCalendarCursor.getFullYear(), dashboardCalendarCursor.getMonth() + 1, 1);
    renderDashboardCalendar();
  });

  // ===== Audience color filters =====
  document.querySelectorAll('.color-btn[data-color]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const color = btn.dataset.color;
      // Color buttons are paint mode selectors (not table filters).
      filterAudienceErrorsOnly = false;
      const errBtn = $('audienceErrorsBtn');
      if(errBtn) errBtn.classList.remove('active');
      setSelectedAudienceColor(color, false);
      filterAudienceColor = 'all';
      const colorSel = $('filterAudienceColor');
      if(colorSel) colorSel.value = 'all';
      if(color === 'all'){
        audiencePrintSelection = new Set();
      }else{
        const rows = getAudienceRows().filter(r=>String(r?.p?.color || '') === color);
        audiencePrintSelection = new Set(
          rows.map(r=>makeAudiencePrintKey(r.ci, r.di, r.procKey))
        );
      }
      renderAudience();
    });
  });
  window.addEventListener('beforeunload', ()=>{
    if(hasLoadedState) persistAppStateNow();
  });
}

function setSelectedAudienceColor(color, syncFilter){
  selectedAudienceColor = color;
  document.querySelectorAll('.color-btn[data-color]').forEach(b=>b.classList.remove('active'));
  const btn = document.querySelector(`.color-btn[data-color="${color}"]`);
  if(btn) btn.classList.add('active');
  if(syncFilter){
    filterAudienceColor = color;
    const sel = $('filterAudienceColor');
    if(sel) sel.value = color;
  }
}

// ================== NAV ==================
function showView(v){
  const setVisible = (id, visible)=>{
    const el = $(id);
    if(!el) return;
    if(visible){
      el.style.display = 'block';
      el.classList.remove('section-enter');
      requestAnimationFrame(()=>el.classList.add('section-enter'));
    }else{
      el.style.display = 'none';
      el.classList.remove('section-enter');
    }
  };
  setVisible('dashboardSection', v==='dashboard');
  setVisible('clientSection', v==='clients');
  setVisible('creationSection', v==='creation');
  setVisible('suiviSection', v==='suivi');
  setVisible('audienceSection', v==='audience');
  setVisible('diligenceSection', v==='diligence');
  setVisible('salleSection', v==='salle');
  setVisible('equipeSection', v==='equipe');

  document.querySelectorAll('.nav-link').forEach(n=>n.classList.remove('active'));
  const target = $(v+'Link');
  if(target) target.classList.add('active');
  if(v === 'suivi') renderSuivi();
  if(v === 'audience') renderAudience();
  if(v === 'diligence') renderDiligence();
  if(v === 'salle') renderSalle();
  if(v === 'equipe') renderEquipe();
  if(isMobileViewport()){
    setSidebarCollapsed(true);
  }
}

// ================== LOGIN ==================
function login(){
  const usernameInput = String($('username').value || '').trim().toLowerCase();
  const passwordInput = normalizeLoginPassword($('password').value);
  USERS = ensureManagerUser(Array.isArray(USERS) ? USERS : []);
  const u = USERS.find(x=>
    String(x.username || '').trim().toLowerCase() === usernameInput
    && normalizeLoginPassword(x.password) === passwordInput
  );
  if(!u){ $('errorMsg').style.display='block'; return; }
  currentUser = u;
  $('errorMsg').style.display='none';
  const forceDashboardVisible = ()=>{
    if($('loginScreen')) $('loginScreen').style.display = 'none';
    if($('appContent')) $('appContent').style.display = 'flex';
    const sectionIds = [
      'dashboardSection',
      'clientSection',
      'creationSection',
      'suiviSection',
      'audienceSection',
      'diligenceSection',
      'salleSection',
      'equipeSection'
    ];
    sectionIds.forEach(id=>{
      const el = $(id);
      if(!el) return;
      el.style.display = (id === 'dashboardSection') ? 'block' : 'none';
    });
    document.querySelectorAll('.nav-link').forEach(n=>n.classList.remove('active'));
    const dash = $('dashboardLink');
    if(dash) dash.classList.add('active');
    if(isMobileViewport()) setSidebarCollapsed(true);
  };

  const safeRun = (label, fn)=>{
    try{
      fn();
    }catch(err){
      console.error(`[login] ${label} failed`, err);
    }
  };

  forceDashboardVisible();
  safeRun('applyRoleUI', applyRoleUI);
  safeRun('showView(dashboard)', ()=>showView('dashboard'));
  safeRun('renderClients', renderClients);
  safeRun('renderDashboard', renderDashboard);
  safeRun('updateClientDropdown', updateClientDropdown);
  safeRun('renderSuivi', renderSuivi);
  safeRun('renderAudience', renderAudience);
  safeRun('renderDiligence', renderDiligence);
  safeRun('renderSalle', renderSalle);
  safeRun('renderEquipe', renderEquipe);
  safeRun('renderSidebarSalleSessions', renderSidebarSalleSessions);

  const hasVisibleSection = [
    'dashboardSection',
    'clientSection',
    'creationSection',
    'suiviSection',
    'audienceSection',
    'diligenceSection',
    'salleSection',
    'equipeSection'
  ].some(id=>{
    const el = $(id);
    return !!el && el.style.display !== 'none';
  });
  if(!hasVisibleSection || $('dashboardSection')?.style.display === 'none'){
    forceDashboardVisible();
  }
}

function normalizeLoginPassword(value){
  return String(value || '')
    .trim()
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
}

function logout(){
  stopRemoteSync();
  closeDossierModal();
  currentUser = null;
  lastPingMs = null;
  lastLiveDelayMs = null;
  renderSyncMetrics();
  $('appContent').style.display='none';
  $('loginScreen').style.display='flex';
  $('username').value='';
  $('password').value='';
  renderSidebarSalleSessions();
  setSyncStatus('pending');
}

function applyRoleUI(){
  const viewer = isViewer();
  const manager = isManager();
  const canCreateClient = canEditData();

  if($('creationLink')) $('creationLink').style.display = viewer ? 'none' : '';
  if($('clientsLink')) $('clientsLink').style.display = viewer ? 'none' : '';
  if($('equipeLink')) $('equipeLink').style.display = manager ? '' : 'none';
  if($('addClientBtn')) $('addClientBtn').style.display = canCreateClient ? '' : 'none';
  if($('totalClientsCard')) $('totalClientsCard').style.display = viewer ? 'none' : '';

  const audienceEditable = canEditData();
  document.querySelectorAll('.color-btn').forEach(btn=> btn.disabled = !audienceEditable);
  if($('saveAudienceBtn')) $('saveAudienceBtn').style.display = audienceEditable ? '' : 'none';

  if(!manager){
    showView('dashboard');
  }else if(viewer && $('creationSection')?.style.display !== 'none'){
    showView('dashboard');
  }
}

// ================== CLIENTS ==================
function addClient(name){
  if(!canEditData()) return alert('Accès refusé');
  name = name.trim();
  if(!name) return alert('Nom obligatoire');
  const existing = AppState.clients.find(c=>c.name.trim().toLowerCase() === name.toLowerCase());
  if(existing){
    alert('Client déjà موجود, on ouvre le client existant');
    goToCreation(existing.id);
    return;
  }
  AppState.clients.push({ id: Date.now(), name, dossiers: [] });
  queuePersistAppState();
  $('clientName').value='';
  renderClients();
  updateClientDropdown();
  renderDashboard();
  renderAudience();
  renderEquipe();
}

function updateClientDropdown(){
  const selectClient = $('selectClient');
  if(!selectClient) return;
  selectClient.innerHTML = '<option value="">Client</option>';
  getVisibleClients().filter(c=>canEditClient(c)).forEach(c=>{
    selectClient.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
  });
}

function renderClients(){
  const q = $('searchClientInput')?.value?.toLowerCase() || '';
  const clientsBody = $('clientsBody');
  clientsBody.innerHTML='';

  getVisibleClients()
    .filter(c => c.name.toLowerCase().includes(q))
    .forEach(c=>{
      const canEdit = canEditClient(c);
      const canDelete = canDeleteData();
      clientsBody.innerHTML += `
        <tr>
          <td data-label="Client">${escapeHtml(c.name)}</td>
          <td data-label="Nb Dossiers">${c.dossiers.length}</td>
          <td data-label="Actions" class="client-actions-cell">
            <button class="btn-primary" onclick="goToCreation(${c.id})" ${canEdit ? '' : 'disabled'}>
              <i class="fa-solid fa-folder-plus"></i>
            </button>
            <button class="btn-danger" onclick="deleteClient(${c.id})" ${canDelete ? '' : 'disabled'}>
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
}

function deleteClient(clientId){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut supprimer un client');
  const idx = AppState.clients.findIndex(c=>c.id == clientId);
  if(idx === -1) return;
  const client = AppState.clients[idx];
  const dossierCount = Array.isArray(client.dossiers) ? client.dossiers.length : 0;
  const warning = dossierCount > 0
    ? `Supprimer le client "${client.name}" et ses ${dossierCount} dossier(s) ?`
    : `Supprimer le client "${client.name}" ?`;
  if(!window.confirm(warning)) return;

  AppState.clients.splice(idx, 1);
  USERS = USERS.map(user=>{
    if(!Array.isArray(user.clientIds)) return user;
    return { ...user, clientIds: user.clientIds.filter(id => Number(id) !== Number(client.id)) };
  });
  queuePersistAppState();
  renderClients();
  updateClientDropdown();
  renderDashboard();
  renderSuivi();
  renderAudience();
  renderDiligence();
  renderEquipe();
}

function goToCreation(clientId){
  const client = AppState.clients.find(c=>c.id == clientId);
  if(!client || !canEditClient(client)) return alert('Accès refusé');
  resetCreationForm(clientId);
  showView('creation');
}

// ================== DOSSIERS ==================
async function addDossier(){
  try{
    if(!canEditData()) return alert('Accès refusé');
    const wasEditing = !!editingDossier;
    const client = AppState.clients.find(c=>c.id == $('selectClient').value);
    if(!client) return alert('Choisir client');
    if(!canEditClient(client)) return alert('Accès refusé');

    let selected = [...document.querySelectorAll('.proc-check:checked')].map(cb=>cb.value);
    const activeLabels = [...document.querySelectorAll('.checkbox-group label.active')]
      .map(l=>l.dataset.proc)
      .filter(Boolean);
    const customList = customProcedures.slice();
    const cardProcs = [...document.querySelectorAll('#procedureDetails .proc-card h4')]
      .map(h=>h.innerText.trim())
      .filter(Boolean);
    selected.push(...activeLabels, ...customList, ...cardProcs);
    if(editingDossier){
      const prev = AppState.clients
        .find(c=>c.id == editingDossier.clientId)
        ?.dossiers?.[editingDossier.index];
      const prevList = normalizeProcedures(prev || {});
      selected.push(...prevList);
    }
    selected = [...new Set(selected.map(v=>String(v).trim()).filter(Boolean))].filter(v=>v !== 'Autre');
    if(selected.length === 0){
      if(editingDossier){
        const prev = AppState.clients
          .find(c=>c.id == editingDossier.clientId)
          ?.dossiers?.[editingDossier.index];
        const fallback = normalizeProcedures(prev || {});
        selected.push(...fallback);
      }
    }
    if(selected.length === 0) return alert('Choisir au moins une procédure');

    const details = {};
    const cards = [...document.querySelectorAll('#procedureDetails .proc-card')];
    cards.forEach(card=>{
      const procName = card.querySelector('h4')?.innerText.trim();
      if(!procName) return;
      details[procName] = {};
      card.querySelectorAll('input, select').forEach(fieldEl=>{
        details[procName][fieldEl.dataset.field] = fieldEl.value.trim();
      });
    });

    const rawDateAffectation = String($('dateAffectation')?.value || '').trim();
    if(!rawDateAffectation){
      return alert('Date d’affectation obligatoire');
    }
    const normalizedDateAffectation = normalizeDateDDMMYYYY(rawDateAffectation);
    if(!normalizedDateAffectation){
      return alert('Date d’affectation invalide. Utilisez le format jj/mm/aaaa.');
    }
    const montantGroups = getProcedureMontantGroupsForSave();
    const montantInputValue = String($('montantInput')?.value || '').trim();
    const montantFallback = montantInputValue || montantGroups.map(g=>String(g.montant || '').trim()).filter(Boolean).join(' | ');

    const dossier = {
      debiteur: $('debiteurInput').value.trim(),
      boiteNo: $('boiteNoInput')?.value.trim() || '',
      referenceClient: $('referenceClientInput').value.trim(),
      dateAffectation: normalizedDateAffectation,
      procedure: selected.join(', '),
      procedureList: selected.slice(),
      procedureDetails: details,
      ville: $('villeInput').value.trim(),
      adresse: $('adresseInput').value.trim(),
      montant: montantFallback,
      montantByProcedure: montantGroups,
      ww: $('wwInput').value.trim(),
      marque: $('marqueInput').value.trim(),
      type: $('typeInput').value.trim(),
      caution: $('cautionInput')?.value.trim() || '',
      cautionAdresse: $('cautionAdresseInput')?.value.trim() || '',
      cautionVille: $('cautionVilleInput')?.value.trim() || '',
      cautionCin: $('cautionCinInput')?.value.trim() || '',
      note: $('noteInput')?.value.trim() || '',
      avancement: $('avancementInput')?.value.trim() || '',
      statut: $('statutInput')?.value || 'En cours',
      files: await serializeUploadedFiles(uploadedFiles)
    };
    console.log('[ADD DOSSIER]', JSON.stringify(dossier, null, 2));

    if(editingDossier){
      const prevClient = AppState.clients.find(c=>c.id == editingDossier.clientId);
      if(prevClient && prevClient.id === client.id){
        prevClient.dossiers[editingDossier.index] = dossier;
      }else{
        if(prevClient) prevClient.dossiers.splice(editingDossier.index, 1);
        client.dossiers.push(dossier);
      }
    }else{
      client.dossiers.push(dossier);
    }
    queuePersistAppState();

    renderSuivi();
    renderDashboard();
    renderClients();
    renderAudience();
    renderDiligence();
    resetCreationForm();
    showView('suivi');
  }catch(err){
    console.error(err);
    alert('Erreur pendant la sauvegarde du dossier');
  }
}

function handleFiles(e){
  let files = [];
  if(e.dataTransfer?.files) files = [...e.dataTransfer.files];
  if(e.target?.files) files = [...e.target.files];
  if(!files.length) return;
  files.forEach(f=>{
    uploadedFiles.push(f);
  });
  renderFileList();
}

function renderFileList(){
  const list = $('fileList');
  if(!list) return;
  list.innerHTML = '';
  uploadedFiles.forEach((f, idx)=>{
    const li = document.createElement('li');
    const name = document.createElement('span');
    const fileName = String(f?.name || `Fichier ${idx + 1}`);
    const fileSize = Number(f?.size || 0);
    const sizeText = fileSize ? ` (${Math.round(fileSize / 1024)} KB)` : '';
    name.textContent = `${fileName}${sizeText}`;

    const actions = document.createElement('span');
    actions.className = 'file-actions';

    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'btn-view';
    viewBtn.textContent = 'Voir';
    viewBtn.addEventListener('click', ()=>viewFile(idx));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'Supprimer';
    removeBtn.addEventListener('click', ()=>removeFile(idx));

    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'btn-primary';
    downloadBtn.textContent = 'Télécharger';
    downloadBtn.addEventListener('click', ()=>downloadFile(idx));

    actions.appendChild(viewBtn);
    actions.appendChild(downloadBtn);
    actions.appendChild(removeBtn);
    li.appendChild(name);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

function viewFile(index){
  const f = uploadedFiles[index];
  if(!f) return;
  openStoredFile(f);
}

function downloadFile(index){
  const f = uploadedFiles[index];
  if(!f) return;
  downloadStoredFile(f);
}

function removeFile(index){
  uploadedFiles.splice(index, 1);
  renderFileList();
}

// ================== SUIVI ==================
function renderSuivi(){
  const q = $('filterGlobal')?.value?.toLowerCase() || '';
  const suiviBody = $('suiviBody');
  if(!suiviBody) return;
  suiviBody.innerHTML='';
  if(!isManager() && getVisibleClients().length === 0){
    suiviBody.innerHTML = '<tr><td colspan="9" class="diligence-empty">Aucun client assigné à ce compte. Contactez le gestionnaire.</td></tr>';
    return;
  }
  const allRowsMeta = [];
  const rawRows = [];

  getVisibleClients().forEach(c=>{
    c.dossiers.forEach((d, index)=>{
      const procSource = normalizeProcedures(d);
      const procSet = new Set(procSource);
      const tribunalLabels = [];
      Object.values(d.procedureDetails || {}).forEach(p=>{
        const tribunal = normalizeLooseText(p?.tribunal || '');
        if(tribunal) tribunalLabels.push(tribunal);
      });
      rawRows.push({
        c,
        d,
        index,
        procSource,
        procSet,
        tribunalLabels: [...new Set(tribunalLabels)]
      });
    });
  });

  const tribunalState = buildTribunalClusterStateFromLabels(rawRows.flatMap(row=>row.tribunalLabels || []));
  suiviTribunalAliasMap = tribunalState.aliasMap;
  const tribunalLabelByKey = new Map(tribunalState.options.map(v=>[v.key, v.label]));

  const filteredRows = [];
  rawRows.forEach(row=>{
    const tribunalKeys = [...new Set((row.tribunalLabels || [])
      .map(label=>resolveSuiviTribunalFilterKey(label))
      .filter(Boolean))];
    const tribunalList = tribunalKeys
      .map(key=>tribunalLabelByKey.get(key) || '')
      .filter(Boolean);

    allRowsMeta.push({ procSet: row.procSet, tribunalList, tribunalKeys });
    if(filterSuiviProcedure !== 'all' && !row.procSet.has(filterSuiviProcedure)) return;
    if(filterSuiviTribunal !== 'all' && !tribunalKeys.includes(filterSuiviTribunal)) return;

    if(q){
      const haystack = buildSuiviSearchHaystack(
        row.c.name,
        row.d,
        row.procSource,
        tribunalList.length ? tribunalList : row.tribunalLabels
      );
      if(!haystack.includes(q)) return;
    }
    filteredRows.push({ ...row, tribunalKeys, tribunalList });
  });

  let rowsHtml = '';
  filteredRows
    .sort(compareSuiviRowsByReferenceProximity)
    .forEach(row=>{
      const displayDateAffectation = normalizeDateDDMMYYYY(row.d.dateAffectation || '') || String(row.d.dateAffectation || '').trim() || '-';

      rowsHtml += `
      <tr>
        <td data-label="Client">${escapeHtml(row.c.name)}</td>
        <td data-label="Date d’affectation">${escapeHtml(displayDateAffectation)}</td>
        <td data-label="Référence Client">${escapeHtml(row.d.referenceClient || '-')}</td>
        <td class="procedure-cell" data-label="Procédure">${renderProcedureBadges(row.procSource)}</td>
        <td data-label="Débiteur">${escapeHtml(row.d.debiteur || '-')}</td>
        <td data-label="Montant">${escapeHtml(row.d.montant || '-')}</td>
        <td data-label="Ville">${escapeHtml(row.d.ville || '-')}</td>
        <td data-label="Statut">${renderStatusBadge(row.d.statut || 'En cours')}</td>
        <td data-label="Actions">
          <button type="button" class="btn-primary" data-action="view" data-client-id="${row.c.id}" data-dossier-index="${row.index}" onclick="openDossierDetails(${row.c.id}, ${row.index})">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button type="button" class="btn-primary" data-action="edit" data-client-id="${row.c.id}" data-dossier-index="${row.index}" onclick="editDossier(${row.c.id}, ${row.index})" ${canEditClient(row.c) ? '' : 'disabled'}>
            <i class="fa-solid fa-pen"></i>
          </button>
          <button type="button" class="btn-danger" data-action="delete" data-client-id="${row.c.id}" data-dossier-index="${row.index}" onclick="deleteDossier(${row.c.id}, ${row.index})" ${canDeleteData() ? '' : 'disabled'}>
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
    });

  suiviBody.innerHTML = rowsHtml || '<tr><td colspan="9" class="diligence-empty">Aucun dossier trouvé avec ces filtres.</td></tr>';

  syncSuiviFilterOptions(allRowsMeta);
}

function parseSuiviReferenceParts(value){
  const ref = normalizeReferenceValue(value);
  if(!ref) return null;
  const m = ref.match(/^([A-Za-z]+)?(\d+)([A-Za-z]+)?(\d+)?$/);
  if(m){
    return {
      prefix: String(m[1] || '').toLowerCase(),
      firstNum: Number(m[2] || 0),
      infix: String(m[3] || '').toLowerCase(),
      secondNum: Number(m[4] || 0),
      raw: ref
    };
  }
  const slash = ref.match(/^(\d+)\/(\d+)\/(\d{2,4})$/);
  if(slash){
    const yearRaw = Number(slash[3]);
    return {
      prefix: '',
      firstNum: Number(slash[2] || 0),
      infix: '',
      secondNum: Number.isFinite(yearRaw)
        ? (String(slash[3]).length === 2 ? (yearRaw >= 70 ? 1900 + yearRaw : 2000 + yearRaw) : yearRaw)
        : 0,
      raw: ref
    };
  }
  return {
    prefix: '',
    firstNum: 0,
    infix: '',
    secondNum: 0,
    raw: ref
  };
}

function compareSuiviRowsByReferenceProximity(a, b){
  const refA = String(a?.d?.referenceClient || '').trim();
  const refB = String(b?.d?.referenceClient || '').trim();
  const pa = parseSuiviReferenceParts(refA);
  const pb = parseSuiviReferenceParts(refB);

  if(pa && pb){
    const byPrefix = pa.prefix.localeCompare(pb.prefix, 'fr', { sensitivity: 'base' });
    if(byPrefix !== 0) return byPrefix;
    if(pa.firstNum !== pb.firstNum) return pa.firstNum - pb.firstNum;
    const byInfix = pa.infix.localeCompare(pb.infix, 'fr', { sensitivity: 'base' });
    if(byInfix !== 0) return byInfix;
    if(pa.secondNum !== pb.secondNum) return pa.secondNum - pb.secondNum;
    const byRaw = pa.raw.localeCompare(pb.raw, 'fr', { numeric: true, sensitivity: 'base' });
    if(byRaw !== 0) return byRaw;
  }else if(pa){
    return -1;
  }else if(pb){
    return 1;
  }

  const byRef = refA.localeCompare(refB, 'fr', { numeric: true, sensitivity: 'base' });
  if(byRef !== 0) return byRef;
  const byClient = String(a?.c?.name || '').localeCompare(String(b?.c?.name || ''), 'fr', { sensitivity: 'base' });
  if(byClient !== 0) return byClient;
  return String(a?.d?.debiteur || '').localeCompare(String(b?.d?.debiteur || ''), 'fr', { sensitivity: 'base' });
}

function syncSuiviFilterOptions(rowsMeta){
  const procedureSelect = $('filterSuiviProcedure');
  const tribunalSelect = $('filterSuiviTribunal');
  if(!procedureSelect || !tribunalSelect) return;

  const procedures = new Set();
  const tribunaux = new Map();
  rowsMeta.forEach(row=>{
    row.procSet.forEach(v=>procedures.add(String(v)));
    (row.tribunalKeys || []).forEach((key, idx)=>{
      const label = (row.tribunalList || [])[idx] || '';
      if(!key || !label) return;
      const existing = tribunaux.get(key);
      if(!existing || (!/\s/.test(existing) && /\s/.test(label))){
        tribunaux.set(key, label);
      }
    });
  });

  const sortedProcedures = [...procedures].sort((a,b)=>a.localeCompare(b, 'fr'));
  const sortedTribunaux = [...tribunaux.entries()].sort((a,b)=>a[1].localeCompare(b[1], 'fr'));

  procedureSelect.innerHTML = `<option value="all">Toutes</option>${sortedProcedures.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}`;
  tribunalSelect.innerHTML = `<option value="all">Tous</option>${sortedTribunaux.map(([key, label])=>`<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join('')}`;

  if(filterSuiviProcedure !== 'all' && !procedures.has(filterSuiviProcedure)){
    filterSuiviProcedure = 'all';
  }
  if(filterSuiviTribunal !== 'all'){
    filterSuiviTribunal = resolveSuiviTribunalFilterKey(filterSuiviTribunal);
  }
  if(filterSuiviTribunal !== 'all' && !tribunaux.has(filterSuiviTribunal)){
    filterSuiviTribunal = 'all';
  }

  procedureSelect.value = filterSuiviProcedure;
  tribunalSelect.value = filterSuiviTribunal;
}

function renderProcedureBadges(procedureText){
  if(!procedureText) return '-';
  const items = Array.isArray(procedureText)
    ? procedureText.map(p=>String(p).trim()).filter(Boolean)
    : procedureText.split(',').map(p=>p.trim()).filter(Boolean);
  if(!items.length) return '-';
  const pills = items.map(name=>{
    let cls = 'proc-autre';
    if(name === 'ASS') cls = 'proc-ass';
    if(name === 'Restitution') cls = 'proc-restitution';
    if(name === 'Nantissement') cls = 'proc-nantissement';
    if(name === 'SFDC') cls = 'proc-sfdc';
    if(name === 'S/bien') cls = 'proc-sbien';
    if(name === 'Injonction') cls = 'proc-injonction';
    return `<span class="proc-pill ${cls}">${escapeHtml(name)}</span>`;
  }).join('');
  return `<div class="proc-pill-list">${pills}</div>`;
}

function renderStatusBadge(status){
  const value = String(status || 'En cours');
  let cls = 'status-encours';
  if(value === 'Soldé') cls = 'status-solde';
  if(value === 'Arrêt définitif') cls = 'status-arret';
  if(value === 'Clôture') cls = 'status-cloture';
  if(value === 'Suspension') cls = 'status-suspension';
  return `<span class="status-badge ${cls}">${escapeHtml(value)}</span>`;
}

function buildSuiviSearchHaystack(clientName, dossier, procedures, tribunaux){
  const fileNames = Array.isArray(dossier?.files)
    ? dossier.files.map(f=>String(f?.name || '').trim()).filter(Boolean)
    : [];
  const procedureDetailsValues = collectDeepValues(dossier?.procedureDetails || {});
  const diligenceValues = collectDeepValues(dossier?.diligence || {});
  const staticFields = [
    clientName || '',
    dossier?.debiteur || '',
    dossier?.boiteNo || '',
    dossier?.referenceClient || '',
    dossier?.dateAffectation || '',
    dossier?.procedure || '',
    ...(Array.isArray(dossier?.procedureList) ? dossier.procedureList : []),
    dossier?.ville || '',
    dossier?.adresse || '',
    dossier?.montant || '',
    dossier?.ww || '',
    dossier?.marque || '',
    dossier?.type || '',
    dossier?.caution || '',
    dossier?.cautionAdresse || '',
    dossier?.cautionVille || '',
    dossier?.cautionCin || '',
    dossier?.note || '',
    dossier?.avancement || '',
    dossier?.statut || '',
    ...(Array.isArray(procedures) ? procedures : []),
    ...(Array.isArray(tribunaux) ? tribunaux : []),
    ...fileNames
  ];
  return [...staticFields, ...procedureDetailsValues, ...diligenceValues]
    .map(v=>String(v).toLowerCase())
    .join(' ');
}

function buildAudienceSearchHaystack(clientName, dossier, procKey, procedureData, draftData){
  const fileNames = Array.isArray(dossier?.files)
    ? dossier.files.map(f=>String(f?.name || '').trim()).filter(Boolean)
    : [];
  const dossierValues = [
    clientName || '',
    dossier?.debiteur || '',
    dossier?.boiteNo || '',
    dossier?.referenceClient || '',
    dossier?.dateAffectation || '',
    dossier?.ville || '',
    dossier?.adresse || '',
    dossier?.montant || '',
    dossier?.ww || '',
    dossier?.marque || '',
    dossier?.type || '',
    dossier?.caution || '',
    dossier?.cautionAdresse || '',
    dossier?.cautionVille || '',
    dossier?.cautionCin || '',
    dossier?.note || '',
    dossier?.avancement || '',
    dossier?.statut || '',
    dossier?.procedure || '',
    ...(Array.isArray(dossier?.procedureList) ? dossier.procedureList : []),
    ...fileNames
  ];
  const procValues = [
    procKey || '',
    ...collectDeepValues(procedureData || {}),
    ...collectDeepValues(draftData || {})
  ];
  // Audience filtering must stay scoped to the current procedure row.
  return [...dossierValues, ...procValues]
    .map(v=>String(v).toLowerCase())
    .join(' ');
}

function editDossier(clientId, index){
  if(!canEditData()) return alert('Accès refusé');
  const client = AppState.clients.find(c=>c.id == clientId);
  if(!client) return;
  if(!canEditClient(client)) return alert('Accès refusé');
  const d = client.dossiers[index];
  if(!d) return;
  console.log('[EDIT DOSSIER]', JSON.stringify(d, null, 2));

  editingDossier = { clientId, index };
  editingOriginalProcedures = normalizeProcedures(d);
  showView('creation');

  $('selectClient').value = clientId;
  $('debiteurInput').value = d.debiteur || '';
  if($('boiteNoInput')) $('boiteNoInput').value = d.boiteNo || '';
  $('referenceClientInput').value = d.referenceClient || '';
  $('dateAffectation').value = normalizeDateDDMMYYYY(d.dateAffectation || '') || String(d.dateAffectation || '').trim();
  $('villeInput').value = d.ville || '';
  $('adresseInput').value = d.adresse || '';
  $('montantInput').value = d.montant || '';
  $('wwInput').value = d.ww || '';
  $('marqueInput').value = d.marque || '';
  $('typeInput').value = d.type || '';
  if($('cautionInput')) $('cautionInput').value = d.caution || '';
  if($('cautionAdresseInput')) $('cautionAdresseInput').value = d.cautionAdresse || '';
  if($('cautionVilleInput')) $('cautionVilleInput').value = d.cautionVille || '';
  if($('cautionCinInput')) $('cautionCinInput').value = d.cautionCin || '';
  if($('noteInput')) $('noteInput').value = d.note || '';
  if($('avancementInput')) $('avancementInput').value = d.avancement || '';
  if($('statutInput')) $('statutInput').value = d.statut || 'En cours';
  uploadedFiles = Array.isArray(d.files) ? d.files.map(f=>({ ...f })) : [];
  renderFileList();

  document.querySelectorAll('.proc-check').forEach(cb=>cb.checked=false);
  document.querySelectorAll('.checkbox-group label').forEach(l=>l.classList.remove('active'));

  const standard = new Set(['ASS','Restitution','Nantissement','SFDC','S/bien','Injonction']);
  const procs = normalizeProcedures(d);
  procedureMontantGroups = normalizeProcedureMontantGroups(d.montantByProcedure, procs, d.montant || '');
  renderProcedureMontantGroups();

  d.procedureList = procs.slice();
  d.procedure = procs.join(', ');
  customProcedures = procs.filter(p=>!standard.has(p));
  $('procedureCustom').value = '';
  renderCustomProcedures();

  procs.forEach(p=>{
    const cb = document.querySelector(`.proc-check[value="${p}"]`);
    if(cb){
      cb.checked = true;
      const label = cb.closest('label');
      if(label) label.classList.add('active');
    }
  });

  const details = d.procedureDetails || {};
  const detailsKeys = Object.keys(details);
  renderProcedureDetails(procs);
  if(!document.querySelectorAll('#procedureDetails .proc-card').length && detailsKeys.length){
    renderProcedureDetails(detailsKeys);
  }

  const detailsMap = {};
  Object.entries(details).forEach(([k, v])=>{
    const nk = String(k || '').trim().toLowerCase();
    if(nk) detailsMap[nk] = v;
  });

  [...document.querySelectorAll('#procedureDetails .proc-card')].forEach(card=>{
    const name = card.querySelector('h4')?.innerText.trim() || '';
    const fields = details[name] || detailsMap[name.toLowerCase()] || {};
    card.querySelectorAll('input, select').forEach(fieldEl=>{
      const key = fieldEl.dataset.field;
      if(key && fields[key] !== undefined) fieldEl.value = fields[key];
    });
  });
  const addBtn = $('addDossierBtn');
  if(addBtn) addBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Mettre à jour';
}

function deleteDossier(clientId, index){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut supprimer un dossier');
  const client = AppState.clients.find(c=>c.id == clientId);
  if(!client) return;
  const dossier = client.dossiers[index];
  if(!dossier) return;
  const ref = dossier.referenceClient || dossier.debiteur || `#${index + 1}`;
  if(!window.confirm(`Supprimer définitivement le dossier "${ref}" ?`)) return;
  client.dossiers.splice(index, 1);
  queuePersistAppState();
  closeDossierModal();
  renderClients();
  renderDashboard();
  renderSuivi();
  renderAudience();
  renderDiligence();
}

function resetCreationForm(clientId = ''){
  editingDossier = null;
  editingOriginalProcedures = [];
  customProcedures = [];
  uploadedFiles = [];
  procedureMontantGroups = [];

  document.querySelectorAll('#creationSection input').forEach(i=> i.value='');
  document.querySelectorAll('.proc-check').forEach(cb=>cb.checked=false);
  document.querySelectorAll('.checkbox-group label').forEach(l=>l.classList.remove('active'));
  $('procedureDetails').innerHTML = '';
  $('procedureCustom').value = '';
  renderCustomProcedures();
  if($('noteInput')) $('noteInput').value = '';
  if($('avancementInput')) $('avancementInput').value = '';
  if($('statutInput')) $('statutInput').value = 'En cours';
  if($('fileInput')) $('fileInput').value = '';
  if($('fileList')) $('fileList').innerHTML = '';
  renderProcedureMontantGroups();

  const selectClient = $('selectClient');
  if(selectClient){
    selectClient.value = clientId ? String(clientId) : '';
  }
  const addBtn = $('addDossierBtn');
  if(addBtn) addBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Créer le Dossier';
}

function closeDossierModal(){
  const modal = $('dossierModal');
  const body = $('dossierModalBody');
  if(body) body.innerHTML = '';
  if(modal) modal.style.display = 'none';
}

function openDossierDetails(clientId, index){
  const client = AppState.clients.find(c=>c.id == clientId);
  if(!client) return;
  const dossier = client.dossiers[index];
  if(!dossier) return;

  const body = $('dossierModalBody');
  const modal = $('dossierModal');
  if(!body || !modal) return;

  const files = Array.isArray(dossier.files) ? dossier.files : [];
  const detailsRows = [
    ['Client', client.name || '-'],
    ['Débiteur', dossier.debiteur || '-'],
    ['Boîte N°', dossier.boiteNo || '-'],
    ['Référence Client', dossier.referenceClient || '-'],
    ['Date d’affectation', dossier.dateAffectation || '-'],
    ['Procédure', dossier.procedure || '-'],
    ['Montant', dossier.montant || '-'],
    ['Ville', dossier.ville || '-'],
    ['Adresse', dossier.adresse || '-'],
    ['WW', dossier.ww || '-'],
    ['Marque', dossier.marque || '-'],
    ['Type', dossier.type || '-'],
    ['Caution', dossier.caution || '-'],
    ['Adresse de caution', dossier.cautionAdresse || '-'],
    ['Ville de caution', dossier.cautionVille || '-'],
    ['CIN de caution', dossier.cautionCin || '-'],
    ['Statut', dossier.statut || 'En cours'],
    ['Avancement', dossier.avancement || '-'],
    ['Note', dossier.note || '-']
  ];

  const detailsHtml = detailsRows.map(([label, value])=>`
    <div class="details-row">
      <div class="details-label">${escapeHtml(label)}</div>
      <div class="details-value">${label === 'Statut' ? renderStatusBadge(value) : escapeHtml(value)}</div>
    </div>
  `).join('');

  const filesHtml = files.length
    ? files.map((f, i)=>`
      <div class="details-file-item">
        <span>${escapeHtml(String(f?.name || `Fichier ${i + 1}`))}</span>
        <span class="details-file-actions">
          <button type="button" class="btn-primary" onclick="viewDossierFile(${client.id}, ${index}, ${i})">Voir</button>
          <button type="button" class="btn-success" onclick="downloadDossierFile(${client.id}, ${index}, ${i})">Télécharger</button>
        </span>
      </div>
    `).join('')
    : '<div class="details-empty">Aucun document.</div>';

  body.innerHTML = `
    <div class="details-grid">
      ${detailsHtml}
    </div>
    <div class="details-files">
      <h3><i class="fa-solid fa-paperclip"></i> Documents</h3>
      ${filesHtml}
    </div>
    <div class="details-actions">
      <button type="button" class="btn-primary" onclick="downloadDossierSummary(${client.id}, ${index})">
        <i class="fa-solid fa-file-arrow-down"></i> Télécharger fiche dossier
      </button>
      <button type="button" class="btn-danger" onclick="deleteDossier(${client.id}, ${index})" ${canDeleteData() ? '' : 'disabled'}>
        <i class="fa-solid fa-trash"></i> Supprimer dossier
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function getDossierByIds(clientId, index){
  const client = AppState.clients.find(c=>c.id == clientId);
  if(!client) return null;
  const dossier = client.dossiers[index];
  if(!dossier) return null;
  return { client, dossier };
}

function viewDossierFile(clientId, index, fileIndex){
  const data = getDossierByIds(clientId, index);
  if(!data) return;
  const file = data.dossier.files?.[fileIndex];
  openStoredFile(file);
}

function downloadDossierFile(clientId, index, fileIndex){
  const data = getDossierByIds(clientId, index);
  if(!data) return;
  const file = data.dossier.files?.[fileIndex];
  downloadStoredFile(file);
}

function downloadDossierSummary(clientId, index){
  const data = getDossierByIds(clientId, index);
  if(!data) return;
  const { client, dossier } = data;
  const files = Array.isArray(dossier.files) ? dossier.files : [];
  const lines = [
    `Client: ${client.name || '-'}`,
    `Debiteur: ${dossier.debiteur || '-'}`,
    `Boite N°: ${dossier.boiteNo || '-'}`,
    `Reference Client: ${dossier.referenceClient || '-'}`,
    `Date affectation: ${dossier.dateAffectation || '-'}`,
    `Procedure: ${dossier.procedure || '-'}`,
    `Montant: ${dossier.montant || '-'}`,
    `Ville: ${dossier.ville || '-'}`,
    `Adresse: ${dossier.adresse || '-'}`,
    `WW: ${dossier.ww || '-'}`,
    `Marque: ${dossier.marque || '-'}`,
    `Type: ${dossier.type || '-'}`,
    `Caution: ${dossier.caution || '-'}`,
    `Adresse de caution: ${dossier.cautionAdresse || '-'}`,
    `Ville de caution: ${dossier.cautionVille || '-'}`,
    `CIN de caution: ${dossier.cautionCin || '-'}`,
    `Statut: ${dossier.statut || 'En cours'}`,
    `Avancement: ${dossier.avancement || '-'}`,
    `Note: ${dossier.note || '-'}`,
    '',
    'Documents:'
  ];
  files.forEach((f, i)=>{
    lines.push(`${i + 1}. ${f?.name || 'Sans nom'} (${Math.round(Number(f?.size || 0) / 1024)} KB)`);
  });
  if(!files.length) lines.push('Aucun document');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dossier_${client.id}_${index + 1}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ================== DILIGENCE ==================
function getDiligenceRows(){
  const rows = [];
  getVisibleClients().forEach(c=>{
    c.dossiers.forEach((d, di)=>{
      const procedures = normalizeProcedures(d);
      procedures.forEach(proc=>{
        if(proc !== 'SFDC' && proc !== 'S/bien' && proc !== 'Injonction') return;
        const details = d?.procedureDetails?.[proc] || {};
        const tribunal = String(details.tribunal || '').trim();
        const sort = normalizeDiligenceSort(details.sort || '');
        const delegation = normalizeDiligenceAttOk(details.attDelegationOuDelegat || '') || 'att';
        const ordonnance = normalizeDiligenceAttOk(details.attOrdOrOrdOk || '') || 'att';
        rows.push({
          clientId: c.id,
          dossierIndex: di,
          clientName: c.name || '',
          dossier: d,
          procedure: proc,
          details,
          sort,
          delegation,
          ordonnance,
          tribunal,
          canEdit: canEditClient(c)
        });
      });
    });
  });
  return dedupeDiligenceRowsByReferenceAndDebiteur(rows);
}

function syncDiligenceProcedureFilter(rows){
  const select = $('diligenceProcedureFilter');
  if(!select) return;
  const set = new Set();
  rows.forEach(r=>{
    if(r.procedure) set.add(String(r.procedure));
  });
  const sorted = [...set].sort((a,b)=>a.localeCompare(b, 'fr'));
  select.innerHTML = `<option value="all">Toutes</option>${sorted.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}`;
  if(!set.has(filterDiligenceProcedure)){
    filterDiligenceProcedure = set.has('SFDC') ? 'SFDC' : 'all';
  }
  select.value = filterDiligenceProcedure;
}

function syncDiligenceTribunalFilter(rows){
  const select = $('diligenceTribunalFilter');
  if(!select) return;
  const set = new Set();
  rows.forEach(r=>{
    const tribunal = String(r.tribunal || '').trim();
    if(tribunal) set.add(tribunal);
  });
  const sorted = [...set].sort((a,b)=>a.localeCompare(b, 'fr'));
  select.innerHTML = `<option value="all">Tous</option>${sorted.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}`;
  if(filterDiligenceTribunal !== 'all' && !set.has(filterDiligenceTribunal)){
    filterDiligenceTribunal = 'all';
  }
  select.value = filterDiligenceTribunal;
}

function syncDiligenceSortFilter(rows){
  const select = $('diligenceSortFilter');
  if(!select) return;
  const set = new Set();
  rows.forEach(r=>{
    const sort = String(r.sort || '').trim();
    if(sort) set.add(sort);
  });
  const sorted = [...set].sort((a,b)=>a.localeCompare(b, 'fr'));
  select.innerHTML = `<option value="all">Tous</option>${sorted.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}`;
  if(filterDiligenceSort !== 'all' && !set.has(filterDiligenceSort)){
    filterDiligenceSort = 'all';
  }
  select.value = filterDiligenceSort;
}

function syncDiligenceDelegationFilter(rows){
  const select = $('diligenceDelegationFilter');
  if(!select) return;
  const set = new Set();
  rows.forEach(r=>{
    const delegation = String(r.delegation || '').trim();
    if(delegation) set.add(delegation);
  });
  const sorted = [...set].sort((a,b)=>a.localeCompare(b, 'fr'));
  select.innerHTML = `<option value="all">Toutes</option>${sorted.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}`;
  if(filterDiligenceDelegation !== 'all' && !set.has(filterDiligenceDelegation)){
    filterDiligenceDelegation = 'all';
  }
  select.value = filterDiligenceDelegation;
}

function syncDiligenceOrdonnanceFilter(rows){
  const select = $('diligenceOrdonnanceFilter');
  if(!select) return;
  const set = new Set();
  rows.forEach(r=>{
    const ordonnance = String(r.ordonnance || '').trim();
    if(ordonnance) set.add(ordonnance);
  });
  const sorted = [...set].sort((a,b)=>a.localeCompare(b, 'fr'));
  select.innerHTML = `<option value="all">Toutes</option>${sorted.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}`;
  if(filterDiligenceOrdonnance !== 'all' && !set.has(filterDiligenceOrdonnance)){
    filterDiligenceOrdonnance = 'all';
  }
  select.value = filterDiligenceOrdonnance;
}

function renderDiligence(){
  const body = $('diligenceBody');
  const count = $('diligenceCount');
  const headRow = $('diligenceHeadRow');
  if(!body) return;
  const allRows = getDiligenceRows();
  syncDiligenceProcedureFilter(allRows);
  syncDiligenceSortFilter(allRows);
  syncDiligenceDelegationFilter(allRows);
  syncDiligenceOrdonnanceFilter(allRows);
  syncDiligenceTribunalFilter(allRows);
  const rows = getFilteredDiligenceRows(allRows);
  const showInjonctionColumns = rows.some(row=>String(row?.procedure || '').trim() === 'Injonction');

  if(headRow){
    if(showInjonctionColumns){
      headRow.innerHTML = `
        <th>Client</th>
        <th>Débiteur</th>
        <th>Date dépôt</th>
        <th>Référence dossier</th>
        <th>Ordonnance</th>
        <th>Notification N°</th>
        <th>Statut notification</th>
        <th>Date notification</th>
        <th>Certificat non appel</th>
        <th>Execution N°</th>
        <th>Ville</th>
        <th>Délégation</th>
        <th>Huissier</th>
        <th>Sort</th>
        <th>Tribunal</th>
      `;
    }else{
      headRow.innerHTML = `
        <th>Client</th>
        <th>Débiteur</th>
        <th>Date dépôt</th>
        <th>Référence dossier</th>
        <th>Ordonnance</th>
        <th>Execution N°</th>
        <th>Ville</th>
        <th>Délégation</th>
        <th>Huissier</th>
        <th>Sort</th>
        <th>Tribunal</th>
      `;
    }
  }

  if(count){
    const labels = [];
    labels.push(filterDiligenceProcedure === 'all' ? 'toutes les procédures' : `procédure: ${filterDiligenceProcedure}`);
    labels.push(filterDiligenceSort === 'all' ? 'tous les sorts' : `sort: ${filterDiligenceSort}`);
    labels.push(filterDiligenceDelegation === 'all' ? 'toutes les délégations' : `délégation: ${filterDiligenceDelegation}`);
    labels.push(filterDiligenceOrdonnance === 'all' ? 'toutes les ordonnances' : `ordonnance: ${filterDiligenceOrdonnance}`);
    labels.push(filterDiligenceTribunal === 'all' ? 'tous les tribunaux' : `tribunal: ${filterDiligenceTribunal}`);
    const label = labels.join(', ');
    count.textContent = `${rows.length} ligne(s) diligence (${label})`;
  }

  if(!rows.length){
    body.innerHTML = `<tr><td colspan="${showInjonctionColumns ? 15 : 11}" class="diligence-empty">Aucun dossier SFDC/S-bien/Injonction trouvé.</td></tr>`;
    return;
  }

  body.innerHTML = rows.map(row=>{
    const procEncoded = encodeURIComponent(String(row.procedure || ''));
    const refValue = row.details?.referenceClient || row.dossier?.referenceClient || '';
    const ordValue = row.details?.attOrdOrOrdOk || '';
    const notificationNoValue = row.details?.notificationNo || '';
    const notificationStatusValue = row.details?.notificationStatus || '';
    const dateNotificationValue = row.details?.dateNotification || '';
    const certificatNonAppelValue = row.details?.certificatNonAppelStatus || '';
    const executionValue = row.details?.executionNo || '';
    const villeValue = row.dossier?.ville || '';
    const delegationValue = row.details?.attDelegationOuDelegat || '';
    const huissierValue = row.details?.huissier || '';
    const sortValue = row.details?.sort || '';
    const tribunalValue = row.details?.tribunal || '';
    if(showInjonctionColumns){
      return `
      <tr>
        <td>${escapeHtml(row.clientName || '-')}</td>
        <td>${escapeHtml(row.dossier?.debiteur || '-')}</td>
      <td>${escapeHtml(row.details?.depotLe || row.details?.dateDepot || '-')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'referenceClient', refValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'attOrdOrOrdOk', ordValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'notificationNo', notificationNoValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'notificationStatus', notificationStatusValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'dateNotification', dateNotificationValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'certificatNonAppelStatus', certificatNonAppelValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'executionNo', executionValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'ville', villeValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'attDelegationOuDelegat', delegationValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'huissier', huissierValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'sort', sortValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'tribunal', tribunalValue)}</td>
      </tr>
    `;
    }
    return `
      <tr>
        <td>${escapeHtml(row.clientName || '-')}</td>
        <td>${escapeHtml(row.dossier?.debiteur || '-')}</td>
        <td>${escapeHtml(row.details?.depotLe || row.details?.dateDepot || '-')}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'referenceClient', refValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'attOrdOrOrdOk', ordValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'executionNo', executionValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'ville', villeValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'attDelegationOuDelegat', delegationValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'huissier', huissierValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'sort', sortValue)}</td>
        <td>${renderDiligenceEditableCell(row, procEncoded, 'tribunal', tribunalValue)}</td>
      </tr>
    `;
  }).join('');

  applyDiligenceAutoSizing(body);
}

function normalizeDiligenceAttOk(value){
  const raw = String(value ?? '').trim().toLowerCase();
  if(!raw) return '';
  if(raw.includes('ok')) return 'ok';
  if(raw.includes('att')) return 'att';
  return '';
}

function normalizeDiligenceSort(value){
  const raw = String(value ?? '').trim().toLowerCase();
  if(!raw) return 'Att PV';
  if(raw.includes('ok')) return 'PV OK';
  if(raw.includes('att')) return 'Att PV';
  if(raw === 'pv') return 'Att PV';
  return 'Att PV';
}

const DILIGENCE_AUTOSIZE_FIELDS = new Set([
  'referenceClient',
  'attOrdOrOrdOk',
  'executionNo',
  'ville',
  'attDelegationOuDelegat',
  'huissier',
  'sort',
  'tribunal'
]);

function shouldAutoSizeDiligenceField(field){
  return DILIGENCE_AUTOSIZE_FIELDS.has(String(field || '').trim());
}

function getDiligenceAutoSizeWidthCh(field, text){
  const rawField = String(field || '').trim();
  const value = String(text || '').trim();
  const minByField = {
    referenceClient: 14,
    attOrdOrOrdOk: 6,
    executionNo: 10,
    ville: 10,
    attDelegationOuDelegat: 6,
    huissier: 10,
    sort: 8,
    tribunal: 12
  };
  const maxByField = {
    referenceClient: 24,
    executionNo: 28,
    ville: 20,
    huissier: 28,
    tribunal: 28
  };
  const minCh = minByField[rawField] || 8;
  const maxCh = maxByField[rawField] || 22;
  return Math.min(maxCh, Math.max(minCh, value.length + 2));
}

function autoSizeDiligenceControl(el){
  if(!el) return;
  const field = String(el.dataset?.field || '').trim();
  if(!shouldAutoSizeDiligenceField(field)) return;
  const content = el.tagName === 'SELECT'
    ? String(el.options?.[el.selectedIndex]?.text || el.value || '').trim()
    : String(el.value || '').trim();
  const widthCh = getDiligenceAutoSizeWidthCh(field, content);
  el.style.width = `${widthCh}ch`;
}

function applyDiligenceAutoSizing(root = document){
  if(!root) return;
  root.querySelectorAll('.diligence-autosize').forEach(autoSizeDiligenceControl);
}

function renderDiligenceEditableCell(row, procEncoded, field, value){
  const normalized = String(value ?? '').trim();
  const isAutoSize = shouldAutoSizeDiligenceField(field);
  const autoSizeClass = isAutoSize ? ' diligence-autosize' : '';
  const autoSizeAttrs = isAutoSize ? ` data-field="${escapeAttr(field)}"` : '';
  const autoSizeStyle = isAutoSize ? ` style="width:${getDiligenceAutoSizeWidthCh(field, normalized)}ch"` : '';
  const onSizeChange = isAutoSize ? 'autoSizeDiligenceControl(this);' : '';
  const isStatusField = field === 'attOrdOrOrdOk' || field === 'attDelegationOuDelegat';
  if(isStatusField){
    const status = normalizeDiligenceAttOk(normalized) || 'att';
    if(!row?.canEdit){
      return escapeHtml(status || '-');
    }
    return `
      <select
        class="diligence-inline-select${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
        onchange="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="att" ${status === 'att' ? 'selected' : ''}>att</option>
        <option value="ok" ${status === 'ok' ? 'selected' : ''}>ok</option>
      </select>
    `;
  }
  if(field === 'notificationStatus'){
    const status = normalized || 'att plie avec tr';
    if(!row?.canEdit){
      return escapeHtml(status || '-');
    }
    return `
      <select
        class="diligence-inline-select"
        onchange="updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="att plie avec tr" ${status === 'att plie avec tr' ? 'selected' : ''}>att plie avec tr</option>
        <option value="att notif" ${status === 'att notif' ? 'selected' : ''}>att notif</option>
        <option value="notifier" ${status === 'notifier' ? 'selected' : ''}>notifier</option>
        <option value="NB" ${status === 'NB' ? 'selected' : ''}>NB</option>
      </select>
    `;
  }
  if(field === 'certificatNonAppelStatus'){
    const status = normalized || 'att certificat non appel';
    if(!row?.canEdit){
      return escapeHtml(status || '-');
    }
    return `
      <select
        class="diligence-inline-select"
        onchange="updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="att certificat non appel" ${status === 'att certificat non appel' ? 'selected' : ''}>att certificat non appel</option>
        <option value="certificat non appel ok" ${status === 'certificat non appel ok' ? 'selected' : ''}>certificat non appel ok</option>
      </select>
    `;
  }
  if(field === 'dateNotification'){
    if(!row?.canEdit){
      return escapeHtml(normalized || '-');
    }
    return `
      <input
        type="date"
        class="diligence-inline-input"
        value="${escapeAttr(normalized)}"
        oninput="updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
    `;
  }
  if(field === 'sort'){
    const sortStatus = normalizeDiligenceSort(normalized);
    if(!row?.canEdit){
      return escapeHtml(sortStatus || '-');
    }
    return `
      <select
        class="diligence-inline-select${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
        onchange="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
        <option value="Att PV" ${sortStatus === 'Att PV' ? 'selected' : ''}>Att PV</option>
        <option value="PV OK" ${sortStatus === 'PV OK' ? 'selected' : ''}>PV OK</option>
      </select>
    `;
  }
  if(!row?.canEdit){
    return escapeHtml(normalized || '-');
  }
  return `
    <input
      type="text"
      class="diligence-inline-input${autoSizeClass}"${autoSizeAttrs}${autoSizeStyle}
      value="${escapeAttr(value || '')}"
      oninput="${onSizeChange}updateDiligenceFieldEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}','${field}',this.value)">
  `;
}

function updateDiligenceField(clientId, dossierIndex, procKey, field, value){
  if(!canEditData()) return;
  const data = getDossierByIds(clientId, dossierIndex);
  if(!data || !canEditClient(data.client)) return;
  const dossier = data.dossier;
  const proc = String(procKey || '').trim();
  if(!proc) return;
  if(!dossier.procedureDetails) dossier.procedureDetails = {};
  if(!dossier.procedureDetails[proc]) dossier.procedureDetails[proc] = {};
  const details = dossier.procedureDetails[proc];
  let nextValue = value;
  if(field === 'attOrdOrOrdOk' || field === 'attDelegationOuDelegat'){
    nextValue = normalizeDiligenceAttOk(value);
  }else if(field === 'sort'){
    nextValue = normalizeDiligenceSort(value);
  }
  if(field === 'ville'){
    dossier.ville = nextValue;
  }else{
    details[field] = nextValue;
  }
  queuePersistAppState();
}

function updateDiligenceFieldEncoded(clientId, dossierIndex, procKeyEncoded, field, value){
  updateDiligenceField(clientId, dossierIndex, decodeURIComponent(String(procKeyEncoded)), field, value);
}

function getFilteredDiligenceRows(allRows){
  const q = $('diligenceSearchInput')?.value?.toLowerCase() || '';
  return allRows.filter(row=>{
    if(filterDiligenceProcedure !== 'all' && row.procedure !== filterDiligenceProcedure) return false;
    if(filterDiligenceSort !== 'all' && row.sort !== filterDiligenceSort) return false;
    if(filterDiligenceDelegation !== 'all' && row.delegation !== filterDiligenceDelegation) return false;
    if(filterDiligenceOrdonnance !== 'all' && row.ordonnance !== filterDiligenceOrdonnance) return false;
    if(filterDiligenceTribunal !== 'all' && row.tribunal !== filterDiligenceTribunal) return false;
    if(!q) return true;
    const haystack = buildSuiviSearchHaystack(
      row.clientName,
      row.dossier,
      [row.procedure],
      row.tribunal ? [row.tribunal] : []
    );
    return haystack.includes(q);
  });
}

function exportDiligenceXLS(){
  const allRows = getDiligenceRows();
  syncDiligenceProcedureFilter(allRows);
  syncDiligenceSortFilter(allRows);
  syncDiligenceDelegationFilter(allRows);
  syncDiligenceOrdonnanceFilter(allRows);
  syncDiligenceTribunalFilter(allRows);
  const rows = getFilteredDiligenceRows(allRows);
  if(!rows.length){
    alert('Aucune ligne à exporter');
    return;
  }

  const headers = [
    'Client',
    'Débiteur',
    'Date dépôt',
    'Référence dossier',
    'Ordonnance',
    'Notification N°',
    'Statut notification',
    'Date notification',
    'Certificat non appel',
    'Exécution N°',
    'Ville',
    'Délégation',
    'Huissier',
    'Sort',
    'Tribunal'
  ];

  const tableRows = rows.map(row=>[
    row.clientName || '-',
    row.dossier?.debiteur || '-',
    row.details?.depotLe || row.details?.dateDepot || '-',
    row.details?.referenceClient || row.dossier?.referenceClient || '-',
    normalizeDiligenceAttOk(row.details?.attOrdOrOrdOk || '') || 'att',
    row.details?.notificationNo || '-',
    row.details?.notificationStatus || '-',
    row.details?.dateNotification || '-',
    row.details?.certificatNonAppelStatus || '-',
    row.details?.executionNo || '-',
    row.dossier?.ville || '-',
    normalizeDiligenceAttOk(row.details?.attDelegationOuDelegat || '') || 'att',
    row.details?.huissier || '-',
    normalizeDiligenceSort(row.details?.sort || ''),
    row.tribunal || '-'
  ]);

  const styles = `
    <style>
      body { font-family: Arial, sans-serif; }
      .title { text-align: center; font-size: 22px; font-weight: bold; color: #1e3a8a; margin: 8px 0 12px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d1d5db; padding: 10px 12px; font-size: 13px; }
      th { background: #1e40af; color: #ffffff; font-weight: bold; }
      tr:nth-child(even) td { background: #f1f5f9; }
    </style>
  `;

  const thead = `<tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const tbody = tableRows.map(r=>`<tr>${r.map(c=>`<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`).join('');
  const html = `
    <html>
      <head>${styles}</head>
      <body>
        <div class="title">Diligence</div>
        <table>
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = createExcelUtf8Blob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diligence_export.xls';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ================== EQUIPE ==================
function getClientNameById(id){
  return AppState.clients.find(c=>c.id === id)?.name || '-';
}

function getSelectedTeamClientIds(){
  return [...document.querySelectorAll('#teamClientsList input[type="checkbox"]:checked')]
    .map(i=>Number(i.value))
    .filter(v=>Number.isFinite(v));
}

function renderTeamClientCheckboxes(selectedIds = []){
  const box = $('teamClientsList');
  if(!box) return;
  if(!AppState.clients.length){
    box.innerHTML = '<div class="diligence-empty">Aucun client pour le moment.</div>';
    updateTeamClientCount();
    return;
  }
  box.innerHTML = AppState.clients.map(c=>{
    const checked = selectedIds.includes(c.id) ? 'checked' : '';
    return `<label class="team-client-item" data-client-name="${escapeAttr(c.name.toLowerCase())}">
      <input type="checkbox" value="${c.id}" ${checked}>
      <span>${escapeHtml(c.name)}</span>
    </label>`;
  }).join('');
  box.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
    cb.addEventListener('change', updateTeamClientCount);
  });
  filterTeamClientList();
  updateTeamClientCount();
}

function filterTeamClientList(){
  const q = String($('teamClientSearchInput')?.value || '').trim().toLowerCase();
  const items = [...document.querySelectorAll('#teamClientsList .team-client-item')];
  let visibleCount = 0;
  items.forEach(item=>{
    const name = String(item.dataset.clientName || '');
    const visible = q ? name.includes(q) : false;
    item.style.display = visible ? '' : 'none';
    if(visible) visibleCount += 1;
  });
  const box = $('teamClientsList');
  if(!box) return;
  const existing = box.querySelector('.team-client-empty');
  const message = !q
    ? 'Tapez pour rechercher un client.'
    : (visibleCount === 0 ? 'Aucun client trouvé.' : '');
  if(message && items.length){
    if(!existing){
      const empty = document.createElement('div');
      empty.className = 'diligence-empty team-client-empty';
      empty.textContent = message;
      box.appendChild(empty);
    }else{
      existing.textContent = message;
    }
  }else if(existing){
    existing.remove();
  }
}

function updateTeamClientCount(){
  const countEl = $('teamClientCount');
  if(!countEl) return;
  const count = getSelectedTeamClientIds().length;
  countEl.textContent = `${count} client${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
}

function updateTeamClientSelectorState(){
  const role = $('teamRole')?.value || 'viewer';
  const wrap = $('teamClientsWrap');
  if(!wrap) return;
  const disabled = role !== 'viewer';
  wrap.style.opacity = disabled ? '0.6' : '1';
  wrap.querySelectorAll('input[type="checkbox"]').forEach(i=> i.disabled = disabled);
  const search = $('teamClientSearchInput');
  if(search) search.disabled = disabled;
}

function addClientFromTeam(){
  return;
}

function resetTeamForm(){
  editingTeamUserId = null;
  if($('teamUsername')) $('teamUsername').value = '';
  if($('teamPassword')) $('teamPassword').value = '';
  if($('teamRole')) $('teamRole').value = 'viewer';
  if($('teamClientSearchInput')) $('teamClientSearchInput').value = '';
  renderTeamClientCheckboxes([]);
  updateTeamClientSelectorState();
  if($('teamSaveBtn')) $('teamSaveBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Enregistrer';
}

async function saveTeamUser(){
  if(!canManageTeam()) return alert('Accès refusé');
  const username = $('teamUsername')?.value?.trim() || '';
  const password = $('teamPassword')?.value?.trim() || '';
  const role = $('teamRole')?.value || 'viewer';
  if(!username) return alert('Username obligatoire');
  if(!editingTeamUserId && !password) return alert('Mot de passe obligatoire');

  const selectedClientIds = role === 'manager' ? [] : getSelectedTeamClientIds();
  const finalClientIds = role === 'viewer' ? selectedClientIds : [];
  if(role === 'viewer' && finalClientIds.length === 0){
    return alert('Choisir au moins un client pour ce compte client');
  }

  const usernameTaken = USERS.some(u=>
    String(u.username || '').trim().toLowerCase() === username.toLowerCase()
    && u.id !== editingTeamUserId
  );
  if(usernameTaken) return alert('Username déjà utilisé');

  if(editingTeamUserId){
    const user = USERS.find(u=>u.id === editingTeamUserId);
    if(!user) return;
    if(isDefaultManagerUser(user)){
      user.username = DEFAULT_MANAGER_USERNAME;
      user.password = DEFAULT_MANAGER_PASSWORD;
      user.role = 'manager';
      user.clientIds = [];
    }else{
      user.username = username;
      if(password) user.password = password;
      user.role = role;
      user.clientIds = finalClientIds;
    }
  }else{
    USERS.push({
      id: Date.now(),
      username,
      password,
      role,
      clientIds: finalClientIds
    });
  }
  await persistAppStateNow();
  renderEquipe();
  resetTeamForm();
}

function editTeamUser(userId){
  if(!canManageTeam()) return;
  const user = USERS.find(u=>u.id === userId);
  if(!user) return;
  editingTeamUserId = userId;
  if($('teamUsername')) $('teamUsername').value = user.username;
  if($('teamPassword')) $('teamPassword').value = '';
  if($('teamRole')) $('teamRole').value = user.role;
  if($('teamClientSearchInput')) $('teamClientSearchInput').value = '';
  renderTeamClientCheckboxes(Array.isArray(user.clientIds) ? user.clientIds : []);
  updateTeamClientSelectorState();
  if($('teamSaveBtn')) $('teamSaveBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Mettre à jour';
}

function deleteTeamUser(userId){
  if(!canManageTeam()) return;
  const user = USERS.find(u=>u.id === userId);
  if(!user) return;
  if(isDefaultManagerUser(user)){
    return alert('Impossible de supprimer le compte manager par défaut');
  }
  const managerCount = USERS.filter(u=>u.role === 'manager').length;
  if(user.role === 'manager' && managerCount <= 1){
    return alert('Impossible de supprimer le dernier manager');
  }
  if(currentUser?.id === userId){
    return alert('Impossible de supprimer l’utilisateur connecté');
  }
  USERS = USERS.filter(u=>u.id !== userId);
  queuePersistAppState();
  renderEquipe();
  if(editingTeamUserId === userId) resetTeamForm();
}

function renderEquipe(){
  const panel = $('teamManagerPanel');
  const locked = $('teamLocked');
  const body = $('teamUsersBody');
  if(!panel || !locked || !body) return;

  if(!canManageTeam()){
    panel.style.display = 'none';
    locked.style.display = '';
    body.innerHTML = '';
    return;
  }

  panel.style.display = '';
  locked.style.display = 'none';
  if(!editingTeamUserId) {
    renderTeamClientCheckboxes([]);
    updateTeamClientSelectorState();
  }

  body.innerHTML = USERS.map(u=>{
    const roleLabel = u.role === 'viewer' ? 'client' : u.role;
    const clients = (Array.isArray(u.clientIds) ? u.clientIds : [])
      .map(getClientNameById)
      .join(', ') || '-';
    return `
      <tr>
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(roleLabel)}</td>
        <td>${escapeHtml(clients)}</td>
        <td>
          <button class="btn-primary" onclick="editTeamUser(${u.id})"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-danger" onclick="deleteTeamUser(${u.id})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

function addSalleJudge(){
  if(!canEditData()) return alert('Accès refusé');
  const day = normalizeSalleWeekday(selectedSalleDay);
  const salle = normalizeSalleName($('salleNameInput')?.value || '');
  const juge = normalizeJudgeName($('salleJudgeInput')?.value || '');
  if(!salle || !juge) return alert('Salle et Juge obligatoires');
  const exists = AppState.salleAssignments.some(row=>
    normalizeSalleWeekday(row?.day) === day
    && String(row?.salle || '').toLowerCase() === salle.toLowerCase()
    && String(row?.juge || '').toLowerCase() === juge.toLowerCase()
  );
  if(exists){
    $('salleJudgeInput').value = '';
    return;
  }
  AppState.salleAssignments.push({
    id: Date.now(),
    salle,
    juge,
    day
  });
  AppState.salleAssignments = normalizeSalleAssignments(AppState.salleAssignments);
  queuePersistAppState();
  $('salleJudgeInput').value = '';
  renderSalle();
}

function deleteSalleJudge(id){
  if(!canEditData()) return alert('Accès refusé');
  AppState.salleAssignments = AppState.salleAssignments.filter(row=>Number(row.id) !== Number(id));
  queuePersistAppState();
  renderSalle();
}

function renderSalle(){
  const body = $('salleBody');
  const filterSelect = $('salleFilterSelect');
  const tribunalFilterSelect = $('salleTribunalFilter');
  const dateFilterInput = $('salleAudienceDateFilter');
  const editRow = $('salleEditRow');
  const selectedDay = normalizeSalleWeekday(selectedSalleDay);
  selectedSalleDay = selectedDay;
  if(!body || !filterSelect) return;

  renderSalleDayTabs();
  if(editRow) editRow.style.display = canEditData() ? '' : 'none';

  const normalized = normalizeSalleAssignments(AppState.salleAssignments);
  AppState.salleAssignments = normalized;

  const grouped = new Map();
  normalized.forEach(row=>{
    if(normalizeSalleWeekday(row?.day) !== selectedDay) return;
    const salle = row.salle;
    if(!grouped.has(salle)) grouped.set(salle, []);
    grouped.get(salle).push(row);
  });

  const salles = [...grouped.keys()].sort((a, b)=>a.localeCompare(b, 'fr'));
  filterSelect.innerHTML = `<option value="all">Toutes</option>${salles.map(s=>`<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join('')}`;
  if(filterSalle !== 'all' && !grouped.has(filterSalle)) filterSalle = 'all';
  filterSelect.value = filterSalle;
  if(tribunalFilterSelect){
    if(!['all', 'commerciale', 'appel'].includes(filterSalleTribunal)){
      filterSalleTribunal = 'all';
    }
    tribunalFilterSelect.value = filterSalleTribunal;
  }
  if(dateFilterInput){
    dateFilterInput.value = filterSalleAudienceDate;
  }

  if(!salles.length){
    body.innerHTML = `<tr><td colspan="3" class="diligence-empty">Aucune salle configurée pour ${escapeHtml(getSalleWeekdayLabel(selectedDay))}.</td></tr>`;
    renderSidebarSalleSessions();
    return;
  }

  const rowsHtml = salles
    .filter(salle=>filterSalle === 'all' ? true : salle === filterSalle)
    .map(salle=>{
      const judges = grouped.get(salle) || [];
      const jugeText = [...new Set(judges.map(v=>v.juge).filter(Boolean))]
        .sort((a, b)=>a.localeCompare(b, 'fr'))
        .join(' | ') || '-';
      const actions = canEditData()
        ? `<div class="salle-actions-list">${judges.map(j=>{
          const judgeLabel = String(j?.juge || '').trim() || 'Juge';
          return `<button type="button" class="btn-danger salle-action-btn" onclick="deleteSalleJudge(${j.id})" title="Supprimer ${escapeAttr(judgeLabel)}"><i class="fa-solid fa-trash"></i><span>${escapeHtml(judgeLabel)}</span></button>`;
        }).join('')}</div>`
        : '-';
      return `
        <tr>
          <td>${escapeHtml(salle)}</td>
          <td>${escapeHtml(jugeText)}</td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');

  body.innerHTML = rowsHtml || `<tr><td colspan="3" class="diligence-empty">Aucun résultat.</td></tr>`;

  const jugeInput = $('salleJudgeInput');
  if(jugeInput){
    const listId = 'knownJudgesList';
    let datalist = $(listId);
    if(!datalist){
      datalist = document.createElement('datalist');
      datalist.id = listId;
      document.body.appendChild(datalist);
      jugeInput.setAttribute('list', listId);
    }
    const known = getKnownJudges();
    datalist.innerHTML = known.map(v=>`<option value="${escapeAttr(v)}"></option>`).join('');
  }
  renderSidebarSalleSessions();
}

function normalizeProcedures(d){
  let list = [];
  if(Array.isArray(d.procedureList)) list = d.procedureList;
  else if(typeof d.procedureList === 'string') list = d.procedureList.split(',');

  if(!list.length){
    if(Array.isArray(d.procedure)) list = d.procedure;
    else if(typeof d.procedure === 'string') list = d.procedure.split(',');
  }

  if(!list.length && d.procedure) list = [String(d.procedure)];

  const fromDetails = Object.keys(d.procedureDetails || {});
  list = list.concat(fromDetails);

  const cleaned = list
    .map(v=>parseProcedureToken(v))
    .map(v=>String(v).trim())
    .filter(Boolean);
  return [...new Set(cleaned)];
}

function syncProcedureCheckboxes(procList){
  const toMatchKey = (value)=>{
    const normalized = parseProcedureToken(value);
    const base = getProcedureBaseName(normalized);
    return String(base || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  };
  const keySet = new Set((procList || [])
    .map(v=>toMatchKey(v))
    .filter(Boolean));

  document.querySelectorAll('.proc-check').forEach(cb=>{
    const rawValue = String(cb.value || '').trim();
    const checkKey = toMatchKey(rawValue);
    const shouldCheck = keySet.has(checkKey);
    cb.checked = shouldCheck;
    const label = cb.closest('label');
    if(label) label.classList.toggle('active', shouldCheck);
  });
}

function resyncProcedureSelectionFromUI(fallbackList){
  const fromCards = [...document.querySelectorAll('#procedureDetails .proc-card h4')]
    .map(el=>String(el.innerText || '').trim())
    .filter(Boolean);
  const source = fromCards.length ? fromCards : (fallbackList || []);
  suppressProcedureChange = true;
  syncProcedureCheckboxes(source);
  suppressProcedureChange = false;
}

function isAudienceProcedure(procName){
  const value = String(procName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if(!value) return false;
  return value !== 'sfdc' && value !== 'sbien' && value !== 'injonction';
}

function parseDateForAge(value){
  if(!value) return null;
  const raw = String(value).trim();
  if(!raw) return null;
  const isoInText = raw.match(/(\d{4}-\d{2}-\d{2})/);
  if(isoInText){
    return parseDateForAge(isoInText[1]);
  }
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m){
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(y, mo, d);
  }
  const fr = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if(fr){
    const d = Number(fr[1]);
    const mo = Number(fr[2]) - 1;
    const y = Number(fr[3]);
    return new Date(y, mo, d);
  }
  const dt = new Date(raw);
  if(Number.isNaN(dt.getTime())) return null;
  return dt;
}

function toAgeDays(value){
  const dt = parseDateForAge(value);
  if(!dt) return null;
  const now = new Date();
  const start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : 0;
}

function getDashboardAttSortRows(){
  const rows = [];
  AppState.clients.forEach((c, ci)=>{
    if(!canViewClient(c)) return;
    c.dossiers.forEach((d, di)=>{
      const procKeys = normalizeProcedures(d);
      procKeys.forEach(procKey=>{
        if(!isAudienceProcedure(procKey)) return;
        const p = getAudienceProcedure(ci, di, procKey);
        if(String(p?.color || '') !== 'blue') return;
        const audienceDate = String(p?.audience || '').trim() || '-';
        rows.push({
          client: c.name || '-',
          debiteur: d.debiteur || '-',
          procedure: procKey || '-',
          audienceDate
        });
      });
    });
  });
  return rows;
}

function getDashboardCalendarEvents(){
  const byDate = {};
  AppState.clients.forEach((c, ci)=>{
    if(!canViewClient(c)) return;
    c.dossiers.forEach((d, di)=>{
      const procKeys = normalizeProcedures(d);
      procKeys.forEach(procKey=>{
        if(!isAudienceProcedure(procKey)) return;
        const p = getAudienceProcedure(ci, di, procKey);
        const dt = parseDateForAge(p?.audience || '');
        if(!dt) return;
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${day}`;
        if(!byDate[key]) byDate[key] = [];
        byDate[key].push({
          client: c.name || '-',
          procedure: procKey || '-',
          debiteur: d.debiteur || '-'
        });
      });
    });
  });
  return byDate;
}

function renderDashboardCalendar(){
  const label = $('calendarMonthLabel');
  const grid = $('dashboardCalendarGrid');
  if(!label || !grid) return;

  const year = dashboardCalendarCursor.getFullYear();
  const month = dashboardCalendarCursor.getMonth();
  label.textContent = dashboardCalendarCursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const eventsByDate = getDashboardCalendarEvents();
  const headers = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let html = headers.map(h=>`<div class="dashboard-calendar-weekday">${h}</div>`).join('');
  for(let i = 0; i < firstWeekday; i++){
    html += '<div class="dashboard-calendar-day is-empty"></div>';
  }
  for(let day = 1; day <= daysInMonth; day++){
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = eventsByDate[key] || [];
    const classes = ['dashboard-calendar-day'];
    if(key === todayKey) classes.push('is-today');
    const tooltip = events
      .map(e=>`${e.client} / ${e.procedure} / ${e.debiteur}`)
      .join(' | ');
    html += `
      <div class="${classes.join(' ')}" title="${escapeAttr(tooltip)}">
        <span class="day-num">${day}</span>
        ${key === todayKey && events.length ? `<span class="day-count">${events.length}</span>` : ''}
      </div>
    `;
  }
  grid.innerHTML = html;
}

// ================== DASHBOARD ==================
function renderDashboard(){
  const visibleClients = getVisibleClients();
  let enCours = 0;
  let clotureCount = 0;
  const attSortRows = getDashboardAttSortRows();

  visibleClients.forEach(c=>{
    c.dossiers.forEach(d=>{
      enCours += 1;
      if(d.statut === 'Clôture') clotureCount += 1;
    });
  });

  animateDashboardMetric('totalClients', visibleClients.length);
  animateDashboardMetric('dossiersEnCours', enCours);
  animateDashboardMetric('dossiersTermines', clotureCount);
  if($('dossiersAttSort')) animateDashboardMetric('dossiersAttSort', attSortRows.length);
  if($('audienceErrorsCount')) animateDashboardMetric('audienceErrorsCount', getAudienceErrorDossierCount());
  renderDashboardCalendar();
}

function animateDashboardMetric(id, nextValue){
  const el = $(id);
  if(!el) return;
  const safeNext = Number.isFinite(Number(nextValue)) ? Math.max(0, Math.round(Number(nextValue))) : 0;
  const prevValue = dashboardMetricState.has(id)
    ? dashboardMetricState.get(id)
    : (Number.parseInt(String(el.textContent || '0'), 10) || 0);
  dashboardMetricState.set(id, safeNext);

  const shouldReduceMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(shouldReduceMotion || prevValue === safeNext){
    el.textContent = String(safeNext);
    return;
  }

  const card = el.closest('.stat-card');
  if(card){
    card.classList.remove('is-bump');
    void card.offsetWidth;
    card.classList.add('is-bump');
  }

  const duration = 520;
  const startTs = performance.now();
  const delta = safeNext - prevValue;
  const easeOutCubic = (t)=>1 - Math.pow(1 - t, 3);

  const frame = (ts)=>{
    const p = Math.min(1, (ts - startTs) / duration);
    const v = Math.round(prevValue + (delta * easeOutCubic(p)));
    el.textContent = String(v);
    if(p < 1){
      requestAnimationFrame(frame);
      return;
    }
    el.textContent = String(safeNext);
  };

  requestAnimationFrame(frame);
}

// ================== AUDIENCE ==================
function makeAudiencePrintKey(ci, di, procKey){
  return `${Number(ci)}::${Number(di)}::${String(procKey || '')}`;
}

function isAudienceSelectedForPrint(ci, di, procKey){
  return audiencePrintSelection.has(makeAudiencePrintKey(ci, di, procKey));
}

function getSelectedAudienceRowsCount(){
  return getAudienceRows()
    .filter(row=>isAudienceSelectedForPrint(row.ci, row.di, row.procKey))
    .length;
}

function updateAudienceCheckedCount(){
  const node = $('audienceCheckedCount');
  if(!node) return;
  const count = getSelectedAudienceRowsCount();
  node.innerHTML = `<span class="label">Cochés</span><span class="value">${count}</span>`;
}

function toggleAudiencePrintSelection(ci, di, procKey, checked){
  const key = makeAudiencePrintKey(ci, di, procKey);
  if(checked){
    audiencePrintSelection.add(key);
    updateAudienceCheckedCount();
    return;
  }
  audiencePrintSelection.delete(key);
  updateAudienceCheckedCount();
}

function toggleAudiencePrintSelectionEncoded(ci, di, procKeyEncoded, checked){
  toggleAudiencePrintSelection(ci, di, decodeURIComponent(String(procKeyEncoded)), checked);
}

function toggleAudienceSelectionAndColorEncoded(ci, di, procKeyEncoded, checked){
  const procKey = decodeURIComponent(String(procKeyEncoded));
  toggleAudiencePrintSelection(ci, di, procKey, checked);
  setAudienceColor(ci, di, procKey, checked);
}

function getActiveAudiencePriorityColor(){
  const activeBtn = document.querySelector('.color-btn[data-color].active');
  const color = String(activeBtn?.dataset?.color || '').trim();
  return color || selectedAudienceColor || 'all';
}

function getFilteredAudienceRows(allRows = null){
  const rows = Array.isArray(allRows) ? allRows : getAudienceRows();
  const duplicateKeySet = getAudienceDuplicateKeySet(rows);
  const priorityColor = getActiveAudiencePriorityColor();
  return rows.filter(row=>{
    const tribunalKey = resolveAudienceTribunalFilterKey(row.p.tribunal || '');
    if(filterAudienceProcedure !== 'all' && row.procKey !== filterAudienceProcedure) return false;
    if(filterAudienceTribunal !== 'all' && tribunalKey !== filterAudienceTribunal) return false;
    if(filterAudienceErrorsOnly && !isAudienceRowInvalid(row, duplicateKeySet)) return false;
    return true;
  }).sort((a, b)=>{
    if(!filterAudienceErrorsOnly && priorityColor && priorityColor !== 'all'){
      const aMatch = String(a?.p?.color || '') === priorityColor ? 1 : 0;
      const bMatch = String(b?.p?.color || '') === priorityColor ? 1 : 0;
      if(aMatch !== bMatch) return bMatch - aMatch;
    }
    return compareAudienceRowsByReferenceProximity(a, b);
  });
}

function setAllVisibleAudienceRowsForPrint(checked){
  const rows = getFilteredAudienceRows();
  if(!rows.length){
    alert('Aucune ligne visible.');
    return;
  }
  rows.forEach(row=>{
    toggleAudiencePrintSelection(row.ci, row.di, row.procKey, checked);
  });
  renderAudience();
}

function renderAudience(){
  const body = $('audienceBody');
  if(!body){
    renderSidebarSalleSessions();
    return;
  }
  body.innerHTML='';
  if(!isManager() && getVisibleClients().length === 0){
    body.innerHTML = '<tr><td colspan="11" class="diligence-empty">Aucun client assigné à ce compte. Contactez le gestionnaire.</td></tr>';
    updateAudienceCheckedCount();
    renderSidebarSalleSessions();
    return;
  }

  const allRows = getAudienceRows();
  syncAudienceFilterOptions(allRows);
  const duplicateKeySet = getAudienceDuplicateKeySet(allRows);
  const rows = getFilteredAudienceRows(allRows);

  let rowsHtml = '';
  rows.forEach(row=>{
    const { c, d, procKey, p, color, key, draft } = row;
    const canEdit = canEditClient(c) && canEditData();
    const safeColor = ['blue', 'green', 'red', 'yellow', 'purple-dark', 'purple-light'].includes(color) ? color : '';
    const duplicateKey = buildAudienceDuplicateKey(row);
    const isDuplicate = !!(duplicateKey && duplicateKeySet.has(duplicateKey));
    const hasError = isAudienceRowInvalid(row, duplicateKeySet);
    const rowColor = (isDuplicate || hasError) ? 'red' : safeColor;
    const procKeyEncoded = encodeURIComponent(String(procKey));
    const keyEncoded = encodeURIComponent(String(key));
    const isPrintChecked = isAudienceSelectedForPrint(row.ci, row.di, procKey);
    const displayDateDepot = getAudienceDateDepotDisplayValue(row);
    const audienceDateValueRaw = String(draft.dateAudience || p.audience || '');
    const audienceDateValue = normalizeDateDDMMYYYY(audienceDateValueRaw) || audienceDateValueRaw;
    rowsHtml += `
      <tr class="color-${rowColor}">
        <td data-label="Sélection">
          <input type="checkbox" class="audience-print-check"
            data-ci="${row.ci}"
            data-di="${row.di}"
            data-proc-key="${procKeyEncoded}"
            ${isPrintChecked ? 'checked' : ''}
            onchange="toggleAudienceSelectionAndColorEncoded(${row.ci},${row.di},'${procKeyEncoded}', this.checked)">
        </td>
        <td data-label="Client">${escapeHtml(c.name)}</td>
        <td data-label="Référence Client">${escapeHtml(d.referenceClient || '-')}</td>
        <td data-label="Débiteur">${escapeHtml(d.debiteur||'-')}</td>
        <td data-label="Référence dossier"><input value="${escapeAttr(draft.refDossier||p.referenceClient||'')}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','refDossier',this.value)"></td>
        <td data-label="Date d’audience"><input value="${escapeAttr(audienceDateValue)}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','dateAudience',this.value)" onblur="normalizeAudienceDateDraftInputFromEncoded('${keyEncoded}', this)"></td>
        <td data-label="Juge"><input value="${escapeAttr(draft.juge||p.juge||'')}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','juge',this.value)"></td>
        <td data-label="Sort"><input value="${escapeAttr(draft.sort||p.sort||'')}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','sort',this.value)"></td>
        <td data-label="Tribunal">${escapeHtml(p.tribunal||'-')}</td>
        <td data-label="Procédure">${escapeHtml(procKey||'-')}</td>
        <td data-label="Date dépôt">${escapeHtml(displayDateDepot)}</td>
      </tr>
    `;
  });
  body.innerHTML = rowsHtml || '<tr><td colspan="11" class="diligence-empty">Aucune audience trouvée avec ces filtres.</td></tr>';
  updateAudienceCheckedCount();
  renderSidebarSalleSessions();
}

function getAudienceDateDepotDisplayValue(row){
  const depotLeRaw = String(row?.p?.depotLe || '').trim();
  if(depotLeRaw){
    return normalizeDateDDMMYYYY(depotLeRaw) || depotLeRaw;
  }

  const dateDepotRaw = String(row?.p?.dateDepot || '').trim();
  if(!dateDepotRaw) return '-';
  const normalizedDepot = normalizeDateDDMMYYYY(dateDepotRaw) || dateDepotRaw;

  const dateAffectationRaw = String(row?.d?.dateAffectation || '').trim();
  const normalizedAffectation = normalizeDateDDMMYYYY(dateAffectationRaw) || dateAffectationRaw;

  // Ignore dateDepot when it is only a copy of date d'affectation.
  if(normalizedAffectation && normalizedDepot === normalizedAffectation){
    return '-';
  }
  return normalizedDepot;
}

function getSelectedAudienceRowsForExport(){
  return getAudienceRows()
    .filter(row=>isAudienceSelectedForPrint(row.ci, row.di, row.procKey))
    .sort(compareAudienceRowsByReferenceProximity);
}

function getAudienceRowReferenceValue(row){
  return normalizeReferenceValue(String(row?.draft?.refDossier ?? row?.p?.referenceClient ?? '').trim());
}

function parseAudienceReferenceParts(value){
  const ref = normalizeReferenceValue(value);
  const m = ref.match(/^(\d+)\/(\d+)\/(\d{2,4})$/);
  if(!m) return null;
  const first = Number(m[1]);
  const middle = Number(m[2]);
  const rawYear = Number(m[3]);
  if(!Number.isFinite(first) || !Number.isFinite(middle) || !Number.isFinite(rawYear)){
    return null;
  }
  const year = m[3].length === 2
    ? (rawYear >= 70 ? 1900 + rawYear : 2000 + rawYear)
    : rawYear;
  return { first, middle, year };
}

function compareAudienceRowsByReferenceProximity(a, b){
  const refA = getAudienceRowReferenceValue(a);
  const refB = getAudienceRowReferenceValue(b);
  const pa = parseAudienceReferenceParts(refA);
  const pb = parseAudienceReferenceParts(refB);

  if(pa && pb){
    if(pa.year !== pb.year) return pb.year - pa.year;
    if(pa.middle !== pb.middle) return pa.middle - pb.middle;
    if(pa.first !== pb.first) return pa.first - pb.first;
  }else if(pa){
    return -1;
  }else if(pb){
    return 1;
  }

  const byRef = refA.localeCompare(refB, 'fr', { numeric: true, sensitivity: 'base' });
  if(byRef !== 0) return byRef;

  const byClient = String(a?.c?.name || '').localeCompare(String(b?.c?.name || ''), 'fr', { sensitivity: 'base' });
  if(byClient !== 0) return byClient;

  const byRefClient = String(a?.d?.referenceClient || '').localeCompare(String(b?.d?.referenceClient || ''), 'fr', { sensitivity: 'base' });
  if(byRefClient !== 0) return byRefClient;

  return String(a?.d?.debiteur || '').localeCompare(String(b?.d?.debiteur || ''), 'fr', { sensitivity: 'base' });
}

function buildAudienceDuplicateKey(row){
  const refDossier = normalizeReferenceValue(String(row?.draft?.refDossier ?? row?.p?.referenceClient ?? '').trim());
  const debiteur = String(row?.d?.debiteur || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if(!refDossier || !debiteur) return '';
  return `${debiteur}__${refDossier}`;
}

function getAudienceDuplicateKeySet(rows){
  const counts = new Map();
  (rows || []).forEach(row=>{
    const key = buildAudienceDuplicateKey(row);
    if(!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const duplicates = new Set();
  counts.forEach((count, key)=>{
    if(count >= 2) duplicates.add(key);
  });
  return duplicates;
}

function getAudienceRowContentScore(row){
  const refDossier = String(row?.draft?.refDossier ?? row?.p?.referenceClient ?? '').trim();
  const dateAudience = String(row?.draft?.dateAudience ?? row?.p?.audience ?? '').trim();
  const juge = String(row?.draft?.juge ?? row?.p?.juge ?? '').trim();
  const sort = String(row?.draft?.sort ?? row?.p?.sort ?? '').trim();
  const tribunal = String(row?.p?.tribunal || '').trim();
  let score = 0;
  if(refDossier) score += 4;
  if(dateAudience) score += 3;
  if(juge) score += 2;
  if(sort) score += 2;
  if(tribunal) score += 1;
  return score;
}

function getDiligenceRowReferenceValue(row){
  return normalizeReferenceValue(String(row?.details?.referenceClient ?? row?.dossier?.referenceClient ?? '').trim());
}

function buildDiligenceDuplicateKey(row){
  const refDossier = getDiligenceRowReferenceValue(row);
  const procedure = String(row?.procedure || '').trim().toLowerCase();
  const debiteur = String(row?.dossier?.debiteur || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if(!procedure || !refDossier || !debiteur) return '';
  // Keep one row per procedure for the same dossier/debiteur pair.
  return `${procedure}__${debiteur}__${refDossier}`;
}

function getDiligenceRowContentScore(row){
  const details = row?.details || {};
  const scoreFields = [
    details.referenceClient,
    details.depotLe,
    details.dateDepot,
    details.attOrdOrOrdOk,
    details.executionNo,
    row?.dossier?.ville,
    details.attDelegationOuDelegat,
    details.huissier,
    details.sort,
    details.tribunal
  ];
  return scoreFields.reduce((score, value)=>score + (String(value || '').trim() ? 1 : 0), 0);
}

function dedupeDiligenceRowsByReferenceAndDebiteur(rows){
  const map = new Map();
  (rows || []).forEach(row=>{
    const key = buildDiligenceDuplicateKey(row);
    // Keep rows with missing key untouched.
    if(!key){
      map.set(`__row__${map.size}`, row);
      return;
    }
    const existing = map.get(key);
    if(!existing){
      map.set(key, row);
      return;
    }
    const existingScore = getDiligenceRowContentScore(existing);
    const nextScore = getDiligenceRowContentScore(row);
    if(nextScore > existingScore){
      map.set(key, row);
    }
  });
  return [...map.values()];
}

function dedupeAudienceRowsByReferenceAndDebiteur(rows){
  const map = new Map();
  (rows || []).forEach(row=>{
    const key = buildAudienceDuplicateKey(row);
    // Keep rows with missing key untouched.
    if(!key){
      map.set(`__row__${map.size}`, row);
      return;
    }
    const existing = map.get(key);
    if(!existing){
      map.set(key, row);
      return;
    }
    const existingScore = getAudienceRowContentScore(existing);
    const nextScore = getAudienceRowContentScore(row);
    if(nextScore > existingScore){
      map.set(key, row);
    }
  });
  return [...map.values()];
}

function isAudienceRowInvalid(row, duplicateKeySet = null){
  const refDossier = String(row?.draft?.refDossier ?? row?.p?.referenceClient ?? '').trim();
  const dateAudience = String(row?.draft?.dateAudience ?? row?.p?.audience ?? '').trim();
  const juge = String(row?.draft?.juge ?? row?.p?.juge ?? '').trim();
  const sort = String(row?.draft?.sort ?? row?.p?.sort ?? '').trim();
  const hasAttNum = /att\s*(num|numero|num[eé]ro|n°|nº)/i.test(refDossier);
  const duplicateKey = buildAudienceDuplicateKey(row);
  const isDuplicate = !!(duplicateKeySet && duplicateKey && duplicateKeySet.has(duplicateKey));
  return isDuplicate || hasAttNum || (!dateAudience && !juge && !sort);
}

function getAudienceErrorRows(){
  const rows = getAudienceRows();
  const duplicateKeySet = getAudienceDuplicateKeySet(rows);
  return rows.filter(row => isAudienceRowInvalid(row, duplicateKeySet));
}

function getAudienceErrorDossierCount(){
  return getAudienceErrorRows().length;
}

function syncAudienceFilterOptions(rows){
  const procedureSelect = $('filterAudienceProcedure');
  const tribunalSelect = $('filterAudienceTribunal');
  if(!procedureSelect || !tribunalSelect) return;

  const procedureSet = new Set();
  rows.forEach(row=>{
    if(row.procKey) procedureSet.add(String(row.procKey));
  });
  const tribunalState = buildAudienceTribunalClusterState(rows);
  audienceTribunalAliasMap = tribunalState.aliasMap;

  const procedures = [...procedureSet].sort((a, b)=>a.localeCompare(b, 'fr'));
  const tribunaux = tribunalState.options;

  procedureSelect.innerHTML = `<option value="all">Toutes</option>${procedures.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}`;
  tribunalSelect.innerHTML = `<option value="all">Tous</option>${tribunaux.map(({ key, label })=>`<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join('')}`;

  if(filterAudienceProcedure !== 'all' && !procedureSet.has(filterAudienceProcedure)){
    filterAudienceProcedure = 'all';
  }
  if(filterAudienceTribunal !== 'all'){
    filterAudienceTribunal = resolveAudienceTribunalFilterKey(filterAudienceTribunal);
  }
  if(filterAudienceTribunal !== 'all' && !tribunalState.keySet.has(filterAudienceTribunal)){
    filterAudienceTribunal = 'all';
  }

  procedureSelect.value = filterAudienceProcedure;
  tribunalSelect.value = filterAudienceTribunal;
}

function getAudienceRows(){
  const q = $('filterAudience')?.value?.toLowerCase() || '';
  const rows = [];
  AppState.clients.forEach((c, ci)=>{
    if(!canViewClient(c)) return;
    c.dossiers.forEach((d, di)=>{
      let procKeys = Object.keys(d.procedureDetails || {});
      if(!procKeys.length){
        procKeys = normalizeProcedures(d);
      }
      if(!procKeys.length) return;
      procKeys.forEach(procKey=>{
        if(!isAudienceProcedure(procKey)) return;
        const p = getAudienceProcedure(ci, di, procKey);
        const color = p.color || '';
        if(filterAudienceColor !== 'all' && color !== filterAudienceColor) return;
        const key = makeAudienceDraftKey(ci, di, procKey);
        const draft = audienceDraft[key] || {};
        const haystack = buildAudienceSearchHaystack(c.name, d, procKey, p, draft);
        if(q && !haystack.includes(q)) return;
        rows.push({ c, d, procKey, p, color, key, draft, ci, di });
      });
    });
  });
  return dedupeAudienceRowsByReferenceAndDebiteur(rows);
}

function getAudienceRowsForSidebar(){
  const rows = [];
  AppState.clients.forEach((c, ci)=>{
    if(!canViewClient(c)) return;
    c.dossiers.forEach((d, di)=>{
      let procKeys = Object.keys(d.procedureDetails || {});
      if(!procKeys.length){
        procKeys = normalizeProcedures(d);
      }
      if(!procKeys.length) return;
      procKeys.forEach(procKey=>{
        if(!isAudienceProcedure(procKey)) return;
        const p = getAudienceProcedure(ci, di, procKey);
        const key = makeAudienceDraftKey(ci, di, procKey);
        const draft = audienceDraft[key] || {};
        rows.push({ c, d, procKey, p, key, draft, ci, di });
      });
    });
  });
  return dedupeAudienceRowsByReferenceAndDebiteur(rows);
}

async function exportAudienceXLS(){
  const audienceRows = getSelectedAudienceRowsForExport();
  if(!audienceRows.length){
    alert("Cochez les dossiers à exporter dans \"Export d'audience\".");
    return;
  }

  const headers = [
    'Client',
    'Adversaire',
    'N° Dossier',
    'Juge',
    'Audience',
    'Date dépôt',
    'Sort',
    'Tribunal'
  ];
  const dateAudience = audienceRows
    .map(r => r.draft.dateAudience || r.p.audience || '')
    .find(v => v && String(v).trim()) || '';

  const rows = audienceRows.map(r=>{
    const p = r.p;
    const d = r.d;
    const draft = r.draft;
    const sortValue = draft.sort || p.sort || '';
    const jugeValue = draft.juge || p.juge || '';
    const audienceValue = draft.dateAudience || p.audience || '';
    const dateDepotValue = getAudienceDateDepotDisplayValue(r);
    const instructionValue = draft.instruction || p.instruction || '';
    return [
      r.c.name || '',
      d.debiteur || '',
      draft.refDossier || p.referenceClient || '',
      jugeValue,
      audienceValue,
      dateDepotValue,
      sortValue || instructionValue,
      p.tribunal || ''
    ];
  });

  await exportAudienceWorkbookXlsxStyled({
    headers,
    rows,
    subtitle: `Date d'audience : ${String(dateAudience || '-')}`,
    sheetName: 'Audience',
    colWidths: [{ wch: 22 }, { wch: 28 }, { wch: 34 }, { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 34 }, { wch: 46 }],
    filename: 'audience_export.xlsx'
  });
}

function escapeHtml(str){
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setAudienceColor(ci, di, procKey, checked){
  const client = AppState.clients?.[ci];
  if(!canEditData() || !canEditClient(client)) return;
  const dossier = AppState.clients?.[ci]?.dossiers?.[di];
  if(!dossier) return;
  const p = getAudienceProcedure(ci, di, procKey);
  const allowed = new Set(['blue', 'green', 'red', 'yellow', 'purple-dark', 'purple-light']);
  if(!checked){
    p.color = '';
    if(dossier.statut === 'Soldé' || dossier.statut === 'Arrêt définitif'){
      dossier.statut = 'En cours';
    }
    queuePersistAppState();
    renderDashboard();
    renderAudience();
    return;
  }
  if(selectedAudienceColor === 'all' || !allowed.has(selectedAudienceColor)){
    renderDashboard();
    renderAudience();
    return;
  }
  p.color = selectedAudienceColor;
  if(selectedAudienceColor === 'purple-dark') dossier.statut = 'Soldé';
  if(selectedAudienceColor === 'purple-light') dossier.statut = 'Arrêt définitif';
  queuePersistAppState();
  renderDashboard();
  renderAudience();
  renderSuivi();
}

function setAudienceColorEncoded(ci, di, procKeyEncoded, checked){
  setAudienceColor(ci, di, decodeURIComponent(String(procKeyEncoded)), checked);
}

function getAudienceProcedure(ci, di, procKey){
  const dossier = AppState.clients?.[ci]?.dossiers?.[di];
  if(!dossier) return {};
  if(!dossier.procedureDetails) dossier.procedureDetails = {};
  if(!dossier.procedureDetails[procKey]) dossier.procedureDetails[procKey] = {};
  return dossier.procedureDetails[procKey];
}

function queueAudienceLinkedRenders(){
  if(audienceLinkedRenderTimer) clearTimeout(audienceLinkedRenderTimer);
  audienceLinkedRenderTimer = setTimeout(()=>{
    audienceLinkedRenderTimer = null;
    renderDashboard();
    renderSuivi();
    renderSidebarSalleSessions();
  }, 180);
}

function applyAudienceFieldToProcedure(p, field, value){
  if(!p || !field) return;
  if(field === 'refDossier'){
    p.referenceClient = value;
    return;
  }
  if(field === 'dateAudience'){
    const normalizedAudience = normalizeDateDDMMYYYY(value);
    p.audience = normalizedAudience || value;
    return;
  }
  if(field === 'juge'){
    p.juge = value;
    return;
  }
  if(field === 'sort'){
    p.sort = value;
  }
}

function updateAudienceDraft(key, field, value){
  if(!canEditData()) return;
  if(!audienceDraft[key]) audienceDraft[key] = {};
  audienceDraft[key][field] = value;
  const { ci, di, procKey } = parseAudienceDraftKey(key);
  const p = getAudienceProcedure(ci, di, procKey);
  applyAudienceFieldToProcedure(p, field, value);
  queuePersistAppState();
  queueAudienceLinkedRenders();
  queueAudienceAutoSave();
}

function updateAudienceDraftFromEncoded(keyEncoded, field, value){
  updateAudienceDraft(decodeURIComponent(String(keyEncoded)), field, value);
}

function normalizeAudienceDateDraftInputFromEncoded(keyEncoded, inputEl){
  if(!inputEl) return;
  const key = decodeURIComponent(String(keyEncoded));
  const raw = String(inputEl.value || '').trim();
  if(!raw){
    updateAudienceDraft(key, 'dateAudience', '');
    inputEl.value = '';
    return;
  }
  const normalized = normalizeDateDDMMYYYY(raw);
  if(!normalized){
    alert('Date d’audience invalide. Utilisez le format jj/mm/aaaa.');
    inputEl.focus();
    return;
  }
  inputEl.value = normalized;
  updateAudienceDraft(key, 'dateAudience', normalized);
}

function saveAllAudience(options = {}){
  if(!canEditData()) return alert('Accès refusé');
  const clearDraft = options.clearDraft !== false;
  const rerender = options.rerender !== false;
  Object.entries(audienceDraft).forEach(([key, data])=>{
    const { ci, di, procKey } = parseAudienceDraftKey(key);
    const p = getAudienceProcedure(ci, di, procKey);
    if(data.refDossier!==undefined) applyAudienceFieldToProcedure(p, 'refDossier', data.refDossier);
    if(data.dateAudience!==undefined) applyAudienceFieldToProcedure(p, 'dateAudience', data.dateAudience);
    if(data.juge!==undefined) applyAudienceFieldToProcedure(p, 'juge', data.juge);
    if(data.sort!==undefined) applyAudienceFieldToProcedure(p, 'sort', data.sort);
  });

  if(clearDraft){
    audienceDraft = {};
  }
  queuePersistAppState();
  if(rerender){
    renderDashboard();
    renderAudience();
    renderSuivi();
  }
}

function queueAudienceAutoSave(){
  if(audienceAutoSaveTimer) clearTimeout(audienceAutoSaveTimer);
  audienceAutoSaveTimer = setTimeout(()=>{
    audienceAutoSaveTimer = null;
    saveAllAudience({
      clearDraft: false,
      rerender: false,
      showAlert: false
    });
  }, 700);
}

// ================== PROCEDURE DETAILS ==================
function collectProcedureDraft(){
  const draft = {};
  document.querySelectorAll('#procedureDetails .proc-card').forEach(card=>{
    const name = card.querySelector('h4')?.innerText.trim();
    if(!name) return;
    draft[name] = {};
    card.querySelectorAll('input, select').forEach(fieldEl=>{
      draft[name][fieldEl.dataset.field] = fieldEl.value;
    });
  });
  return draft;
}

function getProcedureBaseName(procName){
  const raw = String(procName || '').trim();
  if(!raw) return '';
  return raw.replace(/\d+$/, '').trim() || raw;
}

function isProcedureVariantName(procName){
  return /\d+$/.test(String(procName || '').trim());
}

function canAddProcedureVariant(existingNames, sourceProc){
  const base = getProcedureBaseName(sourceProc);
  if(!base) return false;
  return true;
}

function getNextProcedureVariantName(existingNames, sourceProc){
  const base = getProcedureBaseName(sourceProc);
  let maxIndex = 1;
  (existingNames || []).forEach(name=>{
    const raw = String(name || '').trim();
    if(!raw || getProcedureBaseName(raw) !== base) return;
    const m = raw.match(/(\d+)$/);
    if(!m) return;
    const n = Number(m[1]);
    if(Number.isFinite(n) && n > maxIndex) maxIndex = n;
  });
  return `${base}${maxIndex + 1}`;
}

function getProcedureInsertIndexForVariant(existingNames, sourceProc){
  const base = getProcedureBaseName(sourceProc);
  let lastIdx = -1;
  (existingNames || []).forEach((name, idx)=>{
    if(getProcedureBaseName(name) === base) lastIdx = idx;
  });
  return lastIdx;
}

function getProcedureColorClass(procName){
  const base = getProcedureBaseName(procName);
  if(base === 'ASS') return 'proc-ass';
  if(base === 'Restitution') return 'proc-restitution';
  if(base === 'Nantissement') return 'proc-nantissement';
  if(base === 'SFDC') return 'proc-sfdc';
  if(base === 'S/bien') return 'proc-sbien';
  if(base === 'Injonction') return 'proc-injonction';
  if(customProcedures.includes(base)) return 'proc-autre';
  return '';
}

function addProcedureVariant(sourceProc){
  const currentOrder = [...document.querySelectorAll('#procedureDetails .proc-card h4')]
    .map(el=>el.innerText.trim())
    .filter(Boolean);
  if(!currentOrder.length) return;
  const sourceIndex = currentOrder.indexOf(sourceProc);
  if(sourceIndex === -1) return;
  if(!canAddProcedureVariant(currentOrder, sourceProc)) return;
  const currentDraft = collectProcedureDraft();
  const variantName = getNextProcedureVariantName(currentOrder, sourceProc);
  const insertAfter = getProcedureInsertIndexForVariant(currentOrder, sourceProc);
  const insertAt = insertAfter >= 0 ? insertAfter + 1 : sourceIndex + 1;
  currentOrder.splice(insertAt, 0, variantName);
  currentDraft[variantName] = {};
  renderProcedureDetails(currentOrder, currentDraft);
}

function removeProcedureVariant(procName){
  const currentOrder = [...document.querySelectorAll('#procedureDetails .proc-card h4')]
    .map(el=>el.innerText.trim())
    .filter(Boolean);
  if(!currentOrder.length) return;
  if(!isProcedureVariantName(procName)) return;
  const idx = currentOrder.indexOf(procName);
  if(idx === -1) return;
  const currentDraft = collectProcedureDraft();
  currentOrder.splice(idx, 1);
  delete currentDraft[procName];
  renderProcedureDetails(currentOrder, currentDraft);
}

function getFormDateAffectationValue(){
  const raw = String($('dateAffectation')?.value || '').trim();
  if(!raw) return '';
  return normalizeDateDDMMYYYY(raw) || raw;
}

function syncProcedureDateAffectationToCards(force = false){
  const dateAffectation = getFormDateAffectationValue();
  if(!dateAffectation) return;
  document.querySelectorAll('#procedureDetails .proc-card input[data-field="dateDepot"]').forEach(input=>{
    const current = String(input.value || '').trim();
    if(force || !current) input.value = dateAffectation;
  });
}

function updateInjonctionNotificationDateVisibility(card){
  if(!card) return;
  const notifSelect = card.querySelector('select[data-field="notificationStatus"]');
  const dateWrap = card.querySelector('.notif-date-wrap');
  if(!notifSelect || !dateWrap) return;
  const value = String(notifSelect.value || '').trim().toLowerCase();
  const show = value === 'notifier' || value === 'nb';
  dateWrap.style.display = show ? '' : 'none';
}

function renderProcedureDetails(forceList, forceDraft){
  const container = $('procedureDetails');
  const draft = forceDraft && typeof forceDraft === 'object'
    ? forceDraft
    : collectProcedureDraft();
  container.innerHTML='';
  const selected = Array.isArray(forceList) && forceList.length
    ? forceList.slice()
    : [...document.querySelectorAll('.proc-check:checked')].map(cb=>cb.value);
  if(!forceList || !forceList.length) selected.push(...customProcedures);
  const activeLabels = [...document.querySelectorAll('.checkbox-group label.active')]
    .map(l=>l.dataset.proc)
    .filter(Boolean);
  activeLabels.forEach(p=>{
    if(!selected.includes(p)) selected.push(p);
  });
  for(let i=selected.length-1;i>=0;i--){
    if(selected[i] === 'Autre') selected.splice(i,1);
  }
  if(!forceList || !forceList.length){
    const prev = editingDossier
      ? AppState.clients.find(c=>c.id == editingDossier.clientId)?.dossiers?.[editingDossier.index]
      : null;
    const prevList = normalizeProcedures(prev || {});
    prevList.forEach(p=>{
      if(!selected.includes(p)) selected.push(p);
    });
    editingOriginalProcedures.forEach(p=>{
      if(!selected.includes(p)) selected.push(p);
    });
  }

  const finalList = [...new Set(selected.map(v=>String(v).trim()).filter(Boolean))];

  finalList.forEach(proc=>{
    if(!proc || !String(proc).trim()) return;
    const procClass = getProcedureColorClass(proc);
    const baseProc = getProcedureBaseName(proc);

    const div = document.createElement('div');
    div.className = `proc-card ${procClass}`;
    const canAddVariant = canAddProcedureVariant(finalList, proc);
    const isVariant = isProcedureVariantName(proc);
    const addBtnToneClass = procClass ? `proc-add-variant-btn--${procClass}` : '';
    const tribunalFieldHtml = canAddVariant
      ? `
        <div class="tribunal-add-wrap">
          <input type="text" data-field="tribunal" placeholder="Tribunal">
          <button type="button" class="proc-add-variant-btn ${addBtnToneClass}" title="Ajouter une duplication">
            <i class="fa-solid fa-plus"></i><span>Ajouter</span>
          </button>
        </div>
      `
      : `<input type="text" data-field="tribunal" placeholder="Tribunal">`;
    let fieldsHtml = `
      <input type="text" data-field="dateDepot" placeholder="Date d’affectation">
      <input type="text" data-field="depotLe" placeholder="Dépôt le">
      <input type="text" data-field="referenceClient" placeholder="Référence dossier">
      <input type="text" data-field="audience" placeholder="Audience">
      <input type="text" data-field="juge" placeholder="Juge">
      <input type="text" data-field="sort" placeholder="Sort">
      ${tribunalFieldHtml}
    `;
    if(baseProc === 'SFDC' || baseProc === 'S/bien'){
      fieldsHtml = `
        <input type="text" data-field="dateDepot" placeholder="Date d’affectation">
        <input type="text" data-field="depotLe" placeholder="Dépôt le">
        <input type="text" data-field="referenceClient" placeholder="Référence dossier">
        <input type="text" data-field="attOrdOrOrdOk" placeholder="att ord / ord ok">
        <input type="text" data-field="executionNo" placeholder="Execution N°">
        <input type="text" data-field="attDelegationOuDelegat" placeholder="att delegation ou delegat">
        <input type="text" data-field="huissier" placeholder="Huissier">
        <input type="text" data-field="sort" placeholder="Sort">
        ${tribunalFieldHtml}
      `;
    }
    if(baseProc === 'Injonction'){
      fieldsHtml = `
        <input type="text" data-field="dateDepot" placeholder="Date d’affectation">
        <input type="text" data-field="depotLe" placeholder="Dépôt le">
        <input type="text" data-field="referenceClient" placeholder="Référence dossier">
        <input type="text" data-field="attOrdOrOrdOk" placeholder="att ord / ord ok">
        <input type="text" data-field="notificationNo" placeholder="Notification N°">
        <select data-field="notificationStatus">
          <option value="att plie avec tr">att plie avec tr</option>
          <option value="att notif">att notif</option>
          <option value="notifier">notifier</option>
          <option value="NB">NB</option>
        </select>
        <div class="notif-date-wrap">
          <input type="date" data-field="dateNotification" placeholder="Date notification">
        </div>
        <select data-field="certificatNonAppelStatus">
          <option value="att certificat non appel">att certificat non appel</option>
          <option value="certificat non appel ok">certificat non appel ok</option>
        </select>
        <input type="text" data-field="executionNo" placeholder="Execution N°">
        <input type="text" data-field="huissier" placeholder="Huissier">
        <input type="text" data-field="sort" placeholder="Sort">
        ${tribunalFieldHtml}
      `;
    }
    const title = document.createElement('h4');
    title.textContent = proc;
    const head = document.createElement('div');
    head.className = 'proc-card-head';
    head.appendChild(title);
    if(isVariant){
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'proc-remove-variant-btn';
      removeBtn.title = 'Supprimer cette duplication';
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      removeBtn.addEventListener('click', ()=>removeProcedureVariant(proc));
      head.appendChild(removeBtn);
    }
    const grid = document.createElement('div');
    grid.className = 'proc-grid';
    grid.innerHTML = fieldsHtml;
    div.appendChild(head);
    div.appendChild(grid);
    container.appendChild(div);
    if(draft[proc]){
      div.querySelectorAll('input, select').forEach(fieldEl=>{
        const key = fieldEl.dataset.field;
        if(key && draft[proc][key] !== undefined) fieldEl.value = draft[proc][key];
      });
    }
    const dateAffectationField = div.querySelector('input[data-field="dateDepot"]');
    if(dateAffectationField && !String(dateAffectationField.value || '').trim()){
      const formDateAffectation = getFormDateAffectationValue();
      if(formDateAffectation) dateAffectationField.value = formDateAffectation;
    }
    if(baseProc === 'Injonction'){
      const notifSelect = div.querySelector('select[data-field="notificationStatus"]');
      if(notifSelect){
        notifSelect.addEventListener('change', ()=>updateInjonctionNotificationDateVisibility(div));
      }
      updateInjonctionNotificationDateVisibility(div);
    }
    const addVariantBtn = div.querySelector('.proc-add-variant-btn');
    if(addVariantBtn){
      addVariantBtn.addEventListener('click', ()=>addProcedureVariant(proc));
    }
  });

  syncProcedureMontantGroups(finalList);

  if(!forceList || !forceList.length){
    suppressProcedureChange = true;
    finalList.forEach(p=>{
      const cb = document.querySelector(`.proc-check[value="${p}"]`);
      if(cb){
        cb.checked = true;
        const label = cb.closest('label');
        if(label) label.classList.add('active');
      }
    });
    suppressProcedureChange = false;
  }
}

function addCustomProcedure(){
  const input = $('procedureCustom');
  if(!input) return;
  const value = input.value.trim();
  if(!value) return;
  if(customProcedures.includes(value)) return;
  customProcedures.push(value);
  input.value = '';
  renderCustomProcedures();
  renderProcedureDetails();
}

function removeCustomProcedure(value){
  customProcedures = customProcedures.filter(v=>v !== value);
  renderCustomProcedures();
  renderProcedureDetails();
}

function renderCustomProcedures(){
  const container = $('customProcedures');
  if(!container) return;
  container.innerHTML = '';
  customProcedures.forEach(v=>{
    const chip = document.createElement('span');
    chip.className = 'custom-proc custom-red';
    chip.appendChild(document.createTextNode(`${v} `));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'x';
    btn.addEventListener('click', ()=>removeCustomProcedure(v));
    chip.appendChild(btn);
    container.appendChild(chip);
  });
}


document.addEventListener('DOMContentLoaded', initApplication);
