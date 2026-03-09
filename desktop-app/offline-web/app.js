// ================== STATE ==================
const AppState = { clients: [], salleAssignments: [], recycleBin: [], recycleArchive: [] };
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
let filterAudienceDate = '';
let filterAudienceErrorsOnly = false;
let paginationState = { clients: 1, audience: 1, suivi: 1, diligence: 1, recycle: 1 };
let paginationFilterState = { clients: '', audience: '', suivi: '', diligence: '', recycle: '' };
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
let diligencePrintSelection = new Set();
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
const INDEXED_DB_NAME = 'cabinet-avocat-db-v1';
const INDEXED_DB_VERSION = 2;
const INDEXED_DB_STORE = 'state_store';
const INDEXED_DB_BACKUP_STORE = 'backup_store';
const INDEXED_DB_STATE_KEY = 'app_state';
const API_BASE_STORAGE_KEY = 'cabinet-avocat-api-base-v1';
const AUTO_BACKUP_STORAGE_KEY = 'cabinet-avocat-auto-backups-v1';
let API_BASE = 'http://127.0.0.1:3000/api';
let API_BASE_RESOLVED = false;
let persistTimer = null;
let desktopStatePersistTimer = null;
let audienceAutoSaveTimer = null;
let audienceColorBatchTimer = null;
let audienceColorBatchNeedsPersist = false;
let audienceColorBatchNeedsDashboard = false;
let audienceColorBatchNeedsSuivi = false;
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
let syncMetricsRenderQueued = false;
let lastAutoBackupAt = 0;
let lastAutoBackupSignature = '';
let lastAudienceRenderedRows = [];
let audienceVirtualRows = [];
let audienceVirtualDuplicateKeySet = new Set();
let audienceVirtualLastRange = { start: -1, end: -1 };
let audienceVirtualRafId = null;
let audienceRowsRawCache = null;
let audienceRowsRawCacheVersion = 0;
let audienceRowsRawCacheViewerKey = '';
let audienceRowsRawDataVersion = 0;
let audienceRowsDedupeCache = null;
let audienceRowsDedupeCacheVersion = 0;
let audienceRowsDedupeCacheViewerKey = '';
let audienceRowsViewCacheSource = null;
let audienceRowsViewCacheKey = '';
let audienceRowsViewCacheOutput = [];
let audienceFilteredRowsCacheInput = null;
let audienceFilteredRowsCacheKey = '';
let audienceFilteredRowsCacheOutput = [];
let audienceFilterOptionsRowsRef = null;
const audienceFilterOptionsMetaCache = new WeakMap();
let audienceDuplicateKeySetCacheInput = null;
let audienceDuplicateKeySetCacheOutput = new Set();
let sidebarSalleRenderTimer = null;
let indexedDbOpenPromise = null;
let suiviVirtualRows = [];
let suiviVirtualLastRange = { start: -1, end: -1 };
let suiviVirtualRafId = null;
let suiviBaseRowsCache = null;
let suiviBaseRowsCacheVersion = 0;
let suiviBaseRowsCacheViewerKey = '';
let suiviFilterOptionsRowsMetaRef = null;
let suiviFilteredRowsCacheSource = null;
let suiviFilteredRowsCacheKey = '';
let suiviFilteredRowsCacheOutput = [];
let diligenceVirtualRows = [];
let diligenceVirtualLastRange = { start: -1, end: -1 };
let diligenceVirtualRafId = null;
let diligenceVirtualShowInjonctionColumns = false;
let diligenceRowsCache = null;
let diligenceRowsCacheVersion = 0;
let diligenceRowsCacheViewerKey = '';
let diligenceFilteredRowsCacheInput = null;
let diligenceFilteredRowsCacheKey = '';
let diligenceFilteredRowsCacheOutput = [];
let diligenceFilterProcedureRowsRef = null;
let diligenceFilterTribunalRowsRef = null;
let diligenceFilterSortRowsRef = null;
let diligenceFilterDelegationRowsRef = null;
let diligenceFilterOrdonnanceRowsRef = null;
let audienceColorButtons = [];
let backgroundDataWarmupTimer = null;
let backgroundDataWarmupVersion = -1;
let visibleClientsCache = null;
let visibleClientsCacheVersion = -1;
let visibleClientsCacheUserKey = '';
let editableClientsCache = null;
let editableClientsCacheVersion = -1;
let editableClientsCacheUserKey = '';
let clientListSummaryCache = null;
let clientListSummaryCacheVersion = -1;
let clientListSummaryCacheUserKey = '';
let dashboardSnapshotCache = null;
let dashboardSnapshotCacheVersion = -1;
let dashboardSnapshotCacheUserKey = '';
let dashboardCalendarEventsCache = null;
let dashboardCalendarEventsCacheVersion = -1;
let dashboardCalendarEventsCacheUserKey = '';
let dashboardCalendarRenderTimer = null;
let dashboardHeavyRenderTimer = null;
let audienceErrorCountCacheVersion = -1;
let audienceErrorCountCacheValue = 0;
let knownJudgesCache = null;
let knownJudgesCacheVersion = -1;
let salleAudienceMapCache = null;
let salleAudienceMapCacheVersion = -1;
let salleAudienceMapCacheUserKey = '';
const dashboardMetricState = new Map();
const DEFERRED_RENDER_SECTION_IDS = {
  dashboard: 'dashboardSection',
  clients: 'clientSection',
  creation: 'creationSection',
  suivi: 'suiviSection',
  audience: 'audienceSection',
  diligence: 'diligenceSection',
  salle: 'salleSection',
  equipe: 'equipeSection',
  recycle: 'recycleSection'
};
const deferredRenderDirtyState = {
  dashboard: true,
  clients: true,
  creation: true,
  suivi: true,
  audience: true,
  diligence: true,
  salle: true,
  equipe: true,
  recycle: true,
  clientDropdown: true
};
const DOSSIER_HISTORY_MAX_ENTRIES = 400;
const DOSSIER_HISTORY_DEBOUNCE_MS = 900;
const RECYCLE_BIN_MAX_ENTRIES = 600;
const RECYCLE_ARCHIVE_MAX_ENTRIES = 8000;
const DOSSIER_HISTORY_FIELD_LABELS = {
  debiteur: 'Débiteur',
  boiteNo: 'Boîte N°',
  referenceClient: 'Référence Client',
  dateAffectation: 'Date d’affectation',
  procedure: 'Procédure',
  montant: 'Montant',
  ville: 'Ville',
  adresse: 'Adresse',
  ww: 'WW',
  marque: 'Marque',
  type: 'Type',
  caution: 'Caution',
  cautionAdresse: 'Adresse de caution',
  cautionVille: 'Ville de caution',
  cautionCin: 'CIN de caution',
  cautionRc: 'RC',
  note: 'Note',
  avancement: 'Avancement',
  statut: 'Statut',
  'procedureDetails.referenceClient': 'Référence dossier',
  'procedureDetails.audience': 'Date d’audience',
  'procedureDetails.juge': 'Juge',
  'procedureDetails.sort': 'Sort',
  'procedureDetails.tribunal': 'Tribunal',
  'procedureDetails.dateDepot': 'Date dépôt',
  'procedureDetails.depotLe': 'Date dépôt',
  'procedureDetails.executionNo': 'N° exécution',
  'procedureDetails.attOrdOrOrdOk': 'Ordonnance',
  'procedureDetails.attDelegationOuDelegat': 'Délégation',
  'procedureDetails.nomHuissier': 'Nom huissier',
  'procedureDetails.datePrevueExecution': 'Date prévue exécution',
  'procedureDetails.montantRecupere': 'Montant récupéré',
  'procedureDetails.instruction': 'Instruction',
  'procedureDetails.certificatNonAppelStatus': 'Statut certificat non appel',
  'procedureDetails.notificationStatus': 'Statut notification'
};
const DOSSIER_HISTORY_SOURCE_LABELS = {
  form: 'Modifier dossier',
  audience: 'Audience',
  diligence: 'Diligence'
};
let dossierHistoryPendingEntries = new Map();
let dossierHistoryPendingTimers = new Map();
const dossierHistoryObjectIds = new WeakMap();
let dossierHistoryObjectIdCounter = 1;
const SIDEBAR_COLLAPSED_KEY = 'cabinet-avocat-sidebar-collapsed';
const REMOTE_SYNC_POLL_INTERVAL_MS = 3000;
const REMOTE_SYNC_HEALTH_EVERY_TICKS = 3;
const REMOTE_SYNC_EVENT_DEBOUNCE_MS = 100;
const DESKTOP_STATE_SAVE_DEBOUNCE_MS = 250;
const AUTO_BACKUP_RETENTION_COUNT = 12;
const AUTO_BACKUP_MIN_INTERVAL_MS = 3 * 60 * 1000;
const CLIENT_IMPORT_ALLOWED_PROCEDURES = new Set(['SFDC', 'S/bien', 'Injonction']);
const AUDIENCE_ORPHAN_CLIENT_NAME = 'Audience import (hors dossier global)';
const PAGINATION_PAGE_SIZES = {
  clients: 50,
  audience: 30,
  suivi: 30,
  diligence: 30,
  recycle: 30
};
const IMPORT_CHUNK_SIZE = 180;
const IMPORT_EXCEL_CHUNK_SIZE = 120;
const IMPORT_STATUS_THROTTLE_MS = 120;
const AUDIENCE_VIRTUAL_MIN_ROWS = 40;
const AUDIENCE_VIRTUAL_ROW_HEIGHT = 56;
const AUDIENCE_VIRTUAL_OVERSCAN = 10;
const AUDIENCE_DEFAULT_SORT_MAX_ROWS = 60000;
const SUIVI_VIRTUAL_MIN_ROWS = 40;
const SUIVI_DEFAULT_SORT_MAX_ROWS = 60000;
const DILIGENCE_VIRTUAL_MIN_ROWS = 40;
const AUDIENCE_COLOR_BATCH_MS = 80;
const IS_FILE_PROTOCOL = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
const LOCAL_ONLY_MODE = (() => {
  if(typeof window === 'undefined') return false;
  const query = new URLSearchParams(window.location.search);
  const rawFlag = String(
    query.get('localOnly')
    || query.get('offline')
    || ''
  ).trim().toLowerCase();
  if(rawFlag){
    return !['0', 'false', 'no', 'off'].includes(rawFlag);
  }
  if(typeof window.CABINET_LOCAL_ONLY === 'boolean') return window.CABINET_LOCAL_ONLY;
  if(IS_FILE_PROTOCOL) return true;
  return !!window.cabinetDesktopState;
})();
const IS_REMOTE_WEB_HOST = (() => {
  if(typeof window === 'undefined' || !window.location) return false;
  const hostname = String(window.location.hostname || '').toLowerCase();
  if(window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return false;
  if(hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
  return true;
})();
const API_PROBE_TIMEOUT_MS = IS_REMOTE_WEB_HOST ? 900 : 2500;
const API_HEALTH_TIMEOUT_MS = IS_REMOTE_WEB_HOST ? 1500 : 3500;
const API_STATE_LOAD_TIMEOUT_MS = IS_REMOTE_WEB_HOST ? 1800 : 5000;
const API_STATE_SAVE_TIMEOUT_MS = IS_REMOTE_WEB_HOST ? 30000 : 10000;
const XLSX_LOCAL_URL = IS_FILE_PROTOCOL ? './vendor/libs/xlsx.full.min.js' : '/vendor/libs/xlsx.full.min.js';
const EXCELJS_LOCAL_URL = IS_FILE_PROTOCOL ? './vendor/libs/exceljs.min.js' : '/vendor/libs/exceljs.min.js';
const XLSX_CDN_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const EXCELJS_CDN_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
const CLIENT_FILTER_WORKER_URL = IS_FILE_PROTOCOL ? './workers/client-filter.worker.js' : '/workers/client-filter.worker.js';
let xlsxLoadPromise = null;
let excelJsLoadPromise = null;
let clientFilterWorker = null;
let clientFilterWorkerFailed = false;
let clientFilterRequestSeq = 0;
const SALLE_WEEKDAY_OPTIONS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' }
];

// ================== HELPERS ==================
const $ = (id) => document.getElementById(id);

function getDossierHistoryObjectId(dossier){
  if(!dossier || typeof dossier !== 'object') return 0;
  if(dossierHistoryObjectIds.has(dossier)) return dossierHistoryObjectIds.get(dossier);
  const id = dossierHistoryObjectIdCounter++;
  dossierHistoryObjectIds.set(dossier, id);
  return id;
}

function normalizeHistoryValue(value){
  if(value === undefined || value === null) return '';
  if(Array.isArray(value)){
    return value.map(v=>String(v || '').trim()).filter(Boolean).join(', ');
  }
  if(typeof value === 'object'){
    try{
      return JSON.stringify(value);
    }catch(err){
      return String(value);
    }
  }
  return String(value).trim();
}

function normalizeDossierHistoryEntries(rawHistory){
  if(!Array.isArray(rawHistory)) return [];
  return rawHistory
    .map(entry=>{
      if(!entry || typeof entry !== 'object') return null;
      const at = String(entry.at || '').trim() || new Date().toISOString();
      const by = String(entry.by || '').trim() || '-';
      const byRole = String(entry.byRole || '').trim() || '';
      const source = String(entry.source || '').trim() || 'form';
      const field = String(entry.field || '').trim() || '-';
      const procedure = String(entry.procedure || '').trim();
      const before = normalizeHistoryValue(entry.before);
      const after = normalizeHistoryValue(entry.after);
      if(before === after) return null;
      return { at, by, byRole, source, field, procedure, before, after };
    })
    .filter(Boolean)
    .slice(-DOSSIER_HISTORY_MAX_ENTRIES);
}

function getHistoryFieldLabel(field){
  const key = String(field || '').trim();
  if(DOSSIER_HISTORY_FIELD_LABELS[key]) return DOSSIER_HISTORY_FIELD_LABELS[key];
  const lastKey = key.includes('.') ? key.split('.').pop() : key;
  const humanized = String(lastKey || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if(!humanized) return '-';
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}

function getHistorySourceLabel(source){
  const key = String(source || '').trim();
  return DOSSIER_HISTORY_SOURCE_LABELS[key] || key || '-';
}

function getRoleLabel(role){
  const key = String(role || '').trim().toLowerCase();
  if(key === 'manager') return 'Gestionnaire';
  if(key === 'admin') return 'Admin';
  if(key === 'viewer') return 'Consultation';
  return key || '-';
}

function formatHistoryDateTime(iso){
  const ts = Date.parse(String(iso || ''));
  if(!Number.isFinite(ts)) return '-';
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function pushDossierHistoryEntry(dossier, entry){
  if(!dossier || typeof dossier !== 'object' || !entry || typeof entry !== 'object') return false;
  const before = normalizeHistoryValue(entry.before);
  const after = normalizeHistoryValue(entry.after);
  if(before === after) return false;
  if(!Array.isArray(dossier.history)) dossier.history = [];
  dossier.history.push({
    at: String(entry.at || '').trim() || new Date().toISOString(),
    by: String(entry.by || '').trim() || String(currentUser?.username || '-'),
    byRole: String(entry.byRole || '').trim() || String(currentUser?.role || ''),
    source: String(entry.source || '').trim() || 'form',
    field: String(entry.field || '').trim() || '-',
    procedure: String(entry.procedure || '').trim(),
    before,
    after
  });
  if(dossier.history.length > DOSSIER_HISTORY_MAX_ENTRIES){
    dossier.history = dossier.history.slice(-DOSSIER_HISTORY_MAX_ENTRIES);
  }
  return true;
}

function makeDossierHistoryPendingKey(dossier, entry){
  const dossierId = getDossierHistoryObjectId(dossier);
  const source = String(entry?.source || '').trim();
  const field = String(entry?.field || '').trim();
  const procedure = String(entry?.procedure || '').trim();
  return `${dossierId}::${source}::${field}::${procedure}`;
}

function flushDossierHistoryPendingEntryByKey(key, options = {}){
  const pending = dossierHistoryPendingEntries.get(key);
  if(!pending) return false;
  const timer = dossierHistoryPendingTimers.get(key);
  if(timer){
    clearTimeout(timer);
    dossierHistoryPendingTimers.delete(key);
  }
  dossierHistoryPendingEntries.delete(key);
  const changed = pushDossierHistoryEntry(pending.dossier, pending.entry);
  if(changed && options.persist){
    queuePersistAppState();
  }
  return changed;
}

function queueDossierHistoryEntry(dossier, entry, options = {}){
  if(!dossier || typeof dossier !== 'object') return;
  const before = normalizeHistoryValue(entry?.before);
  const after = normalizeHistoryValue(entry?.after);
  if(before === after) return;
  const normalizedEntry = {
    at: String(entry?.at || '').trim() || new Date().toISOString(),
    by: String(entry?.by || '').trim() || String(currentUser?.username || '-'),
    byRole: String(entry?.byRole || '').trim() || String(currentUser?.role || ''),
    source: String(entry?.source || '').trim() || 'form',
    field: String(entry?.field || '').trim() || '-',
    procedure: String(entry?.procedure || '').trim(),
    before,
    after
  };
  if(options.immediate){
    pushDossierHistoryEntry(dossier, normalizedEntry);
    return;
  }
  const key = makeDossierHistoryPendingKey(dossier, normalizedEntry);
  const existing = dossierHistoryPendingEntries.get(key);
  if(existing){
    existing.entry.after = normalizedEntry.after;
    existing.entry.at = normalizedEntry.at;
    existing.entry.by = normalizedEntry.by;
    existing.entry.byRole = normalizedEntry.byRole;
  }else{
    dossierHistoryPendingEntries.set(key, {
      dossier,
      entry: normalizedEntry
    });
  }
  if(dossierHistoryPendingTimers.has(key)){
    clearTimeout(dossierHistoryPendingTimers.get(key));
  }
  dossierHistoryPendingTimers.set(key, setTimeout(()=>{
    flushDossierHistoryPendingEntryByKey(key, { persist: true });
  }, DOSSIER_HISTORY_DEBOUNCE_MS));
}

function flushAllDossierHistoryPendingEntries(){
  const keys = [...dossierHistoryPendingEntries.keys()];
  keys.forEach(key=>{
    flushDossierHistoryPendingEntryByKey(key, { persist: false });
  });
}

function collectDossierDiffEntries(prevDossier, nextDossier){
  const previous = prevDossier && typeof prevDossier === 'object' ? prevDossier : {};
  const next = nextDossier && typeof nextDossier === 'object' ? nextDossier : {};
  const entries = [];
  const dossierFields = [
    'debiteur',
    'boiteNo',
    'referenceClient',
    'dateAffectation',
    'procedure',
    'montant',
    'ville',
    'adresse',
    'ww',
    'marque',
    'type',
    'caution',
    'cautionAdresse',
    'cautionVille',
    'cautionCin',
    'cautionRc',
    'note',
    'avancement',
    'statut'
  ];
  dossierFields.forEach(field=>{
    const before = previous[field];
    const after = next[field];
    if(normalizeHistoryValue(before) === normalizeHistoryValue(after)) return;
    entries.push({
      source: 'form',
      field,
      before,
      after
    });
  });

  const previousDetails = previous?.procedureDetails && typeof previous.procedureDetails === 'object'
    ? previous.procedureDetails
    : {};
  const nextDetails = next?.procedureDetails && typeof next.procedureDetails === 'object'
    ? next.procedureDetails
    : {};
  const procKeys = new Set([...Object.keys(previousDetails), ...Object.keys(nextDetails)]);
  procKeys.forEach(procKey=>{
    const beforeProc = previousDetails[procKey] && typeof previousDetails[procKey] === 'object'
      ? previousDetails[procKey]
      : {};
    const afterProc = nextDetails[procKey] && typeof nextDetails[procKey] === 'object'
      ? nextDetails[procKey]
      : {};
    const fieldKeys = new Set([...Object.keys(beforeProc), ...Object.keys(afterProc)]);
    fieldKeys.forEach(field=>{
      const before = beforeProc[field];
      const after = afterProc[field];
      if(normalizeHistoryValue(before) === normalizeHistoryValue(after)) return;
      entries.push({
        source: 'form',
        field: `procedureDetails.${field}`,
        procedure: procKey,
        before,
        after
      });
    });
  });
  return entries;
}

function getAudienceProcedureFieldValue(procData, draftField){
  if(!procData || !draftField) return '';
  if(draftField === 'refDossier') return procData.referenceClient;
  if(draftField === 'dateAudience') return procData.audience;
  if(draftField === 'juge') return procData.juge;
  if(draftField === 'sort') return procData.sort;
  return procData[draftField];
}

function normalizeApiBaseCandidate(value){
  let base = String(value || '').trim();
  if(!base) return '';
  base = base.replace(/\/+$/, '');
  base = base.replace(/\/health$/i, '');
  return base.replace(/\/+$/, '');
}

function getAudienceViewerCacheKey(){
  const user = currentUser || {};
  const role = String(user.role || '').trim().toLowerCase();
  const id = Number(user.id) || 0;
  const clientIds = Array.isArray(user.clientIds)
    ? [...user.clientIds].map(v=>Number(v)).filter(v=>Number.isFinite(v)).sort((a, b)=>a - b).join(',')
    : '';
  return `${id}::${role}::${clientIds}`;
}

function markAudienceRowsCacheDirty(){
  audienceRowsRawDataVersion += 1;
  backgroundDataWarmupVersion = -1;
  visibleClientsCache = null;
  visibleClientsCacheVersion = -1;
  visibleClientsCacheUserKey = '';
  editableClientsCache = null;
  editableClientsCacheVersion = -1;
  editableClientsCacheUserKey = '';
  clientListSummaryCache = null;
  clientListSummaryCacheVersion = -1;
  clientListSummaryCacheUserKey = '';
  dashboardSnapshotCache = null;
  dashboardSnapshotCacheVersion = -1;
  dashboardSnapshotCacheUserKey = '';
  dashboardCalendarEventsCache = null;
  dashboardCalendarEventsCacheVersion = -1;
  dashboardCalendarEventsCacheUserKey = '';
  audienceErrorCountCacheVersion = -1;
  audienceErrorCountCacheValue = 0;
  knownJudgesCache = null;
  knownJudgesCacheVersion = -1;
  salleAudienceMapCache = null;
  salleAudienceMapCacheVersion = -1;
  salleAudienceMapCacheUserKey = '';
  audienceRowsRawCache = null;
  audienceRowsDedupeCache = null;
  audienceRowsViewCacheSource = null;
  audienceRowsViewCacheKey = '';
  audienceRowsViewCacheOutput = [];
  audienceFilteredRowsCacheInput = null;
  audienceFilteredRowsCacheKey = '';
  audienceFilteredRowsCacheOutput = [];
  audienceFilterOptionsRowsRef = null;
  audienceDuplicateKeySetCacheInput = null;
  audienceDuplicateKeySetCacheOutput = new Set();
  suiviBaseRowsCache = null;
  suiviFilterOptionsRowsMetaRef = null;
  suiviFilteredRowsCacheSource = null;
  suiviFilteredRowsCacheKey = '';
  suiviFilteredRowsCacheOutput = [];
  diligenceRowsCache = null;
  diligenceFilteredRowsCacheInput = null;
  diligenceFilteredRowsCacheKey = '';
  diligenceFilteredRowsCacheOutput = [];
  diligenceFilterProcedureRowsRef = null;
  diligenceFilterTribunalRowsRef = null;
  diligenceFilterSortRowsRef = null;
  diligenceFilterDelegationRowsRef = null;
  diligenceFilterOrdonnanceRowsRef = null;
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

  if(window.location.protocol === 'http:' || window.location.protocol === 'https:'){
    appendCandidateVariants(out, seen, `${window.location.origin}/api`);
    appendCandidateVariants(out, seen, window.location.origin);
  }
  const hostname = String(window.location.hostname || '').toLowerCase();
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if(isLocalHost){
    appendCandidateVariants(out, seen, 'http://127.0.0.1:3000/api');
  }
  if(!IS_REMOTE_WEB_HOST){
    appendCandidateVariants(out, seen, 'http://127.0.0.1:3000/api');
  }
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

function markDeferredRenderDirty(...keys){
  keys.forEach(key=>{
    if(Object.prototype.hasOwnProperty.call(deferredRenderDirtyState, key)){
      deferredRenderDirtyState[key] = true;
    }
  });
}

function clearDeferredRenderDirty(key){
  if(Object.prototype.hasOwnProperty.call(deferredRenderDirtyState, key)){
    deferredRenderDirtyState[key] = false;
  }
}

function isDeferredRenderSectionVisible(key){
  const id = DEFERRED_RENDER_SECTION_IDS[key];
  if(!id) return true;
  const el = $(id);
  return !!el && el.style.display !== 'none';
}

function shouldRenderDeferredSection(key, options = {}){
  if(options.force === true || isDeferredRenderSectionVisible(key)){
    clearDeferredRenderDirty(key);
    return true;
  }
  markDeferredRenderDirty(key);
  return false;
}

function shouldRenderClientDropdown(options = {}){
  if(options.force === true || isDeferredRenderSectionVisible('creation')){
    clearDeferredRenderDirty('clientDropdown');
    return true;
  }
  markDeferredRenderDirty('clientDropdown');
  return false;
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

function queueSyncMetricsRender(){
  if(syncMetricsRenderQueued) return;
  syncMetricsRenderQueued = true;
  const render = ()=>{
    syncMetricsRenderQueued = false;
    renderSyncMetrics();
  };
  if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'){
    window.requestAnimationFrame(render);
    return;
  }
  setTimeout(render, 0);
}

function setPingMetric(value){
  lastPingMs = Number.isFinite(Number(value)) ? Number(value) : null;
  queueSyncMetricsRender();
}

function setLiveDelayMetricFromIso(updatedAtIso){
  const ts = Date.parse(String(updatedAtIso || ''));
  if(!Number.isFinite(ts)){
    lastLiveDelayMs = null;
  }else{
    lastLiveDelayMs = Math.max(0, Date.now() - ts);
  }
  queueSyncMetricsRender();
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

function getClientFilterWorker(){
  if(clientFilterWorkerFailed) return null;
  if(clientFilterWorker) return clientFilterWorker;
  if(typeof Worker === 'undefined') return null;
  try{
    clientFilterWorker = new Worker(CLIENT_FILTER_WORKER_URL);
    return clientFilterWorker;
  }catch(err){
    console.warn('Client filter worker indisponible', err);
    clientFilterWorkerFailed = true;
    return null;
  }
}

function runClientFilterInWorker(items, query, requestId){
  const worker = getClientFilterWorker();
  if(!worker){
    return Promise.resolve(null);
  }
  return new Promise((resolve)=>{
    const handleMessage = (event)=>{
      const data = event?.data || {};
      if(String(data.type || '') !== 'client-filter-result') return;
      if(Number(data.requestId) !== Number(requestId)) return;
      cleanup();
      resolve(Array.isArray(data.filteredIndexes) ? data.filteredIndexes : null);
    };
    const handleError = (err)=>{
      console.warn('Client filter worker error', err);
      cleanup();
      clientFilterWorkerFailed = true;
      if(clientFilterWorker){
        try{ clientFilterWorker.terminate(); }catch(_){}
      }
      clientFilterWorker = null;
      resolve(null);
    };
    const cleanup = ()=>{
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({
      type: 'client-filter',
      requestId,
      query: String(query || ''),
      items
    });
  });
}

function captureSyncStatusSnapshot(){
  const text = $('syncStatusText');
  return {
    status: getCurrentSyncStatus(),
    message: text ? String(text.innerText || '').trim() : ''
  };
}

function restoreSyncStatusSnapshot(snapshot){
  if(!snapshot || typeof snapshot !== 'object'){
    setSyncStatus('pending');
    return;
  }
  setSyncStatus(snapshot.status, snapshot.message || undefined);
}

function openImportProgressModal(title = 'Import en cours...'){
  const modal = $('importProgressModal');
  const titleNode = $('importProgressTitle');
  const textNode = $('importProgressText');
  const fill = $('importProgressFill');
  const percentNode = $('importProgressPercent');
  if(titleNode) titleNode.innerHTML = `<i class="fa-solid fa-rotate"></i> ${escapeHtml(title)}`;
  if(textNode) textNode.innerText = 'Préparation...';
  if(fill) fill.style.width = '0%';
  const track = document.querySelector('#importProgressModal .import-progress-track');
  if(track) track.setAttribute('aria-valuenow', '0');
  if(percentNode) percentNode.innerText = '0%';
  if(modal) modal.style.display = 'flex';
}

function updateImportProgress(message, done, total){
  const textNode = $('importProgressText');
  const fill = $('importProgressFill');
  const percentNode = $('importProgressPercent');
  const safeTotal = Number(total);
  const safeDone = Number(done);
  const hasNumbers = Number.isFinite(safeTotal) && safeTotal > 0 && Number.isFinite(safeDone);
  const percent = hasNumbers ? Math.max(0, Math.min(100, Math.round((safeDone / safeTotal) * 100))) : 0;
  if(textNode){
    if(hasNumbers){
      textNode.innerText = `${String(message || 'Import en cours...')} (${safeDone}/${safeTotal})`;
    }else{
      textNode.innerText = String(message || 'Import en cours...');
    }
  }
  if(fill) fill.style.width = `${percent}%`;
  const track = document.querySelector('#importProgressModal .import-progress-track');
  if(track) track.setAttribute('aria-valuenow', String(percent));
  if(percentNode) percentNode.innerText = `${percent}%`;
}

function closeImportProgressModal(markDone = false){
  const modal = $('importProgressModal');
  if(!modal) return;
  if(markDone){
    updateImportProgress('Import terminé', 1, 1);
    modal.dataset.doneUntil = String(Date.now() + 220);
    setTimeout(()=>{
      if(modal) modal.style.display = 'none';
    }, 220);
    return;
  }
  const lockUntil = Number(modal.dataset.doneUntil || '0');
  if(Number.isFinite(lockUntil) && lockUntil > Date.now()) return;
  delete modal.dataset.doneUntil;
  modal.style.display = 'none';
}

function yieldToMainThread(){
  if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'){
    return new Promise(resolve=>window.requestAnimationFrame(()=>resolve()));
  }
  return new Promise(resolve=>setTimeout(resolve, 0));
}

async function runChunked(items, task, options = {}){
  const list = Array.isArray(items) ? items : [];
  const chunkSize = Math.max(1, Number(options.chunkSize) || IMPORT_CHUNK_SIZE);
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  for(let index = 0; index < list.length; index += 1){
    await task(list[index], index, list.length);
    if((index + 1) % chunkSize === 0){
      if(onProgress) onProgress(index + 1, list.length);
      await yieldToMainThread();
    }
  }
  if(onProgress) onProgress(list.length, list.length);
}

function makeProgressReporter(prefix){
  let lastAt = 0;
  return (done, total)=>{
    const now = Date.now();
    if(done < total && now - lastAt < IMPORT_STATUS_THROTTLE_MS) return;
    lastAt = now;
    setSyncStatus('syncing', `${prefix} ${done}/${total}...`);
    updateImportProgress(prefix, done, total);
  };
}

function getRenderForSection(section){
  if(section === 'clients') return renderClients;
  if(section === 'audience') return renderAudience;
  if(section === 'suivi') return renderSuivi;
  if(section === 'diligence') return renderDiligence;
  if(section === 'recycle') return renderRecycleBin;
  return null;
}

function getTableContainerBySection(section){
  return $(`${String(section || '').trim()}TableContainer`);
}

function getPaginationPageSize(section){
  const key = String(section || '').trim();
  const raw = Number(PAGINATION_PAGE_SIZES[key]);
  if(Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return 300;
}

function resetPaginationPage(section){
  if(!Object.prototype.hasOwnProperty.call(paginationState, section)) return;
  paginationState[section] = 1;
}

function syncPaginationFilterState(section, key){
  if(!Object.prototype.hasOwnProperty.call(paginationFilterState, section)) return;
  const next = String(key || '');
  if(paginationFilterState[section] === next) return;
  paginationFilterState[section] = next;
  paginationState[section] = 1;
  const container = getTableContainerBySection(section);
  if(container) container.scrollTop = 0;
}

function paginateRows(rows, section){
  const list = Array.isArray(rows) ? rows : [];
  const safeSection = String(section || '');
  const pageSize = getPaginationPageSize(safeSection);
  const rawPage = Number(paginationState[safeSection]) || 1;
  const totalRows = list.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.min(Math.max(1, rawPage), totalPages);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  paginationState[safeSection] = page;
  return {
    rows: list.slice(start, end),
    page,
    totalPages,
    totalRows,
    from: totalRows ? start + 1 : 0,
    to: Math.min(totalRows, end)
  };
}

function renderPagination(section, pagination){
  const el = $(`${section}Pagination`);
  if(!el) return;
  const pageSize = getPaginationPageSize(section);
  const meta = pagination && typeof pagination === 'object'
    ? pagination
    : { page: 1, totalPages: 1, totalRows: 0, from: 0, to: 0 };
  if(!meta.totalRows){
    el.innerHTML = '';
    return;
  }
  const prevDisabled = meta.page <= 1 ? 'disabled' : '';
  const nextDisabled = meta.page >= meta.totalPages ? 'disabled' : '';
  el.innerHTML = `
    <div class="table-pagination-info">
      ${meta.from}-${meta.to} / ${meta.totalRows} (${pageSize}/page)
    </div>
    <div class="table-pagination-actions">
      <button type="button" class="btn-primary" ${prevDisabled} onclick="changePaginationPage('${section}', -1)">
        <i class="fa-solid fa-chevron-left"></i> Préc
      </button>
      <span class="table-pagination-page">Page ${meta.page}/${meta.totalPages}</span>
      <button type="button" class="btn-primary" ${nextDisabled} onclick="changePaginationPage('${section}', 1)">
        Suiv <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  `;
}

function changePaginationPage(section, delta){
  const key = String(section || '').trim();
  if(!Object.prototype.hasOwnProperty.call(paginationState, key)) return;
  const step = Number(delta);
  if(!Number.isFinite(step) || step === 0) return;
  paginationState[key] = Math.max(1, (Number(paginationState[key]) || 1) + step);
  const container = getTableContainerBySection(key);
  if(container) container.scrollTop = 0;
  const render = getRenderForSection(key);
  if(typeof render === 'function') render();
}

function getVirtualWindowByContainer(containerId, rowsLength){
  const container = $(containerId);
  if(!container){
    return { start: 0, end: rowsLength };
  }
  const total = Math.max(0, Number(rowsLength) || 0);
  const viewportHeight = Math.max(container.clientHeight || 0, AUDIENCE_VIRTUAL_ROW_HEIGHT * 6);
  const scrollTop = Math.max(0, container.scrollTop || 0);
  const start = Math.max(0, Math.floor(scrollTop / AUDIENCE_VIRTUAL_ROW_HEIGHT) - AUDIENCE_VIRTUAL_OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / AUDIENCE_VIRTUAL_ROW_HEIGHT) + (AUDIENCE_VIRTUAL_OVERSCAN * 2);
  const end = Math.min(total, start + visibleCount);
  return { start, end };
}

function getAudienceVirtualWindow(rowsLength){
  return getVirtualWindowByContainer('audienceTableContainer', rowsLength);
}

function queueAudienceVirtualRender(){
  if(audienceVirtualRafId) return;
  audienceVirtualRafId = window.requestAnimationFrame(()=>{
    audienceVirtualRafId = null;
    renderAudienceVirtualWindow();
  });
}

function renderAudienceRowHtml(row, duplicateKeySet){
  const { c, d, procKey, p, color, key, draft } = row;
  const canEdit = canEditClient(c) && canEditData();
  const safeColor = ['blue', 'green', 'red', 'yellow', 'purple-dark', 'purple-light'].includes(color) ? color : '';
  const duplicateKey = buildAudienceDuplicateKey(row);
  const isDuplicate = !!(duplicateKey && duplicateKeySet.has(duplicateKey));
  const hasError = isAudienceRowInvalid(row, duplicateKeySet);
  const isMissingGlobal = !!row?.p?._missingGlobal;
  const isRefClientMismatch = !!row?.p?._refClientMismatch;
  const refClientDisplay = isRefClientMismatch
    ? String(row?.p?._refClientProvided || d.referenceClient || '-')
    : String(d.referenceClient || '-');
  const rowColor = (isDuplicate || hasError) ? 'red' : safeColor;
  const procKeyEncoded = encodeURIComponent(String(procKey));
  const keyEncoded = encodeURIComponent(String(key));
  const isPrintChecked = isAudienceSelectedForPrint(row.ci, row.di, procKey);
  const displayDateDepot = getAudienceDateDepotDisplayValue(row);
  const audienceDateValueRaw = String(draft.dateAudience || p.audience || '');
  const audienceDateValue = normalizeDateDDMMYYYY(audienceDateValueRaw) || audienceDateValueRaw;
  return `
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
      <td data-label="Référence Client" class="${isRefClientMismatch ? 'audience-refclient-mismatch' : ''}">
        ${escapeHtml(refClientDisplay)}
        ${isRefClientMismatch ? '<div class="audience-inline-error">Réf client audience différente du global</div>' : ''}
      </td>
      <td data-label="Débiteur">${escapeHtml(d.debiteur || '-')}</td>
      <td data-label="Référence dossier">
        <input class="${isMissingGlobal ? 'audience-ref-missing' : ''}" value="${escapeAttr(draft.refDossier || p.referenceClient || '')}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','refDossier',this.value)">
        ${isMissingGlobal ? '<div class="audience-inline-error">Introuvable dans dossier global</div>' : ''}
      </td>
      <td data-label="Date d’audience"><input value="${escapeAttr(audienceDateValue)}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','dateAudience',this.value)" onblur="normalizeAudienceDateDraftInputFromEncoded('${keyEncoded}', this)"></td>
      <td data-label="Juge"><input value="${escapeAttr(draft.juge || p.juge || '')}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','juge',this.value)"></td>
      <td data-label="Sort"><input value="${escapeAttr(draft.sort || p.sort || '')}" ${canEdit ? '' : 'readonly'} oninput="updateAudienceDraftFromEncoded('${keyEncoded}','sort',this.value)"></td>
      <td data-label="Tribunal">${escapeHtml(p.tribunal || '-')}</td>
      <td data-label="Procédure">${escapeHtml(procKey || '-')}</td>
      <td data-label="Date dépôt">${escapeHtml(displayDateDepot)}</td>
    </tr>
  `;
}

function renderAudienceVirtualWindow(force = false){
  const body = $('audienceBody');
  if(!body) return;
  const rows = Array.isArray(audienceVirtualRows) ? audienceVirtualRows : [];
  if(!rows.length){
    audienceVirtualLastRange = { start: -1, end: -1 };
    body.innerHTML = '<tr><td colspan="11" class="diligence-empty">Aucune audience trouvée avec ces filtres.</td></tr>';
    return;
  }

  const { start, end } = getAudienceVirtualWindow(rows.length);
  if(!force && start === audienceVirtualLastRange.start && end === audienceVirtualLastRange.end){
    return;
  }
  audienceVirtualLastRange = { start, end };

  const topHeight = start * AUDIENCE_VIRTUAL_ROW_HEIGHT;
  const bottomHeight = (rows.length - end) * AUDIENCE_VIRTUAL_ROW_HEIGHT;
  const topSpacer = topHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="11" style="height:${topHeight}px"></td></tr>`
    : '';
  const bottomSpacer = bottomHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="11" style="height:${bottomHeight}px"></td></tr>`
    : '';
  const rowsHtml = rows
    .slice(start, end)
    .map(row=>renderAudienceRowHtml(row, audienceVirtualDuplicateKeySet))
    .join('');
  body.innerHTML = `${topSpacer}${rowsHtml}${bottomSpacer}`;
}

function renderSuiviRowHtml(row){
  const displayDateAffectation = normalizeDateDDMMYYYY(row.d.dateAffectation || '') || '-';
  return `
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
        <button type="button" class="btn-primary" data-action="view" data-client-id="${row.c.id}" data-dossier-index="${row.index}">
          <i class="fa-solid fa-eye"></i>
        </button>
        <button type="button" class="btn-primary" data-action="edit" data-client-id="${row.c.id}" data-dossier-index="${row.index}" ${canEditClient(row.c) ? '' : 'disabled'}>
          <i class="fa-solid fa-pen"></i>
        </button>
        <button type="button" class="btn-danger" data-action="delete" data-client-id="${row.c.id}" data-dossier-index="${row.index}" ${canDeleteData() ? '' : 'disabled'}>
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `;
}

function renderSuiviVirtualWindow(force = false){
  const body = $('suiviBody');
  if(!body) return;
  const rows = Array.isArray(suiviVirtualRows) ? suiviVirtualRows : [];
  if(!rows.length){
    suiviVirtualLastRange = { start: -1, end: -1 };
    body.innerHTML = '<tr><td colspan="9" class="diligence-empty">Aucun dossier trouvé avec ces filtres.</td></tr>';
    return;
  }
  const { start, end } = getVirtualWindowByContainer('suiviTableContainer', rows.length);
  if(!force && start === suiviVirtualLastRange.start && end === suiviVirtualLastRange.end) return;
  suiviVirtualLastRange = { start, end };

  const topHeight = start * AUDIENCE_VIRTUAL_ROW_HEIGHT;
  const bottomHeight = (rows.length - end) * AUDIENCE_VIRTUAL_ROW_HEIGHT;
  const topSpacer = topHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="9" style="height:${topHeight}px"></td></tr>`
    : '';
  const bottomSpacer = bottomHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="9" style="height:${bottomHeight}px"></td></tr>`
    : '';
  const rowsHtml = rows.slice(start, end).map(renderSuiviRowHtml).join('');
  body.innerHTML = `${topSpacer}${rowsHtml}${bottomSpacer}`;
}

function queueSuiviVirtualRender(){
  if(suiviVirtualRafId) return;
  suiviVirtualRafId = window.requestAnimationFrame(()=>{
    suiviVirtualRafId = null;
    renderSuiviVirtualWindow();
  });
}

function renderDiligenceRowHtml(row, showInjonctionColumns){
  const procEncoded = encodeURIComponent(String(row.procedure || ''));
  const isChecked = isDiligenceSelectedForPrint(row);
  const refValue = row.details?.referenceClient || '';
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
      <td>
        <label class="diligence-client-cell">
          <input
            type="checkbox"
            class="diligence-print-check"
            ${isChecked ? 'checked' : ''}
            onchange="toggleDiligencePrintSelectionEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}', this.checked)">
          <span>${escapeHtml(row.clientName || '-')}</span>
        </label>
      </td>
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
      <td>
        <label class="diligence-client-cell">
          <input
            type="checkbox"
            class="diligence-print-check"
            ${isChecked ? 'checked' : ''}
            onchange="toggleDiligencePrintSelectionEncoded(${row.clientId},${row.dossierIndex},'${procEncoded}', this.checked)">
          <span>${escapeHtml(row.clientName || '-')}</span>
        </label>
      </td>
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
}

function renderDiligenceVirtualWindow(force = false){
  const body = $('diligenceBody');
  if(!body) return;
  const rows = Array.isArray(diligenceVirtualRows) ? diligenceVirtualRows : [];
  const colCount = diligenceVirtualShowInjonctionColumns ? 15 : 11;
  if(!rows.length){
    diligenceVirtualLastRange = { start: -1, end: -1 };
    body.innerHTML = `<tr><td colspan="${colCount}" class="diligence-empty">Aucun dossier SFDC/S-bien/Injonction trouvé.</td></tr>`;
    return;
  }
  const { start, end } = getVirtualWindowByContainer('diligenceTableContainer', rows.length);
  if(!force && start === diligenceVirtualLastRange.start && end === diligenceVirtualLastRange.end) return;
  diligenceVirtualLastRange = { start, end };

  const topHeight = start * AUDIENCE_VIRTUAL_ROW_HEIGHT;
  const bottomHeight = (rows.length - end) * AUDIENCE_VIRTUAL_ROW_HEIGHT;
  const topSpacer = topHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="${colCount}" style="height:${topHeight}px"></td></tr>`
    : '';
  const bottomSpacer = bottomHeight > 0
    ? `<tr class="virtual-spacer"><td colspan="${colCount}" style="height:${bottomHeight}px"></td></tr>`
    : '';
  const rowsHtml = rows
    .slice(start, end)
    .map(row=>renderDiligenceRowHtml(row, diligenceVirtualShowInjonctionColumns))
    .join('');
  body.innerHTML = `${topSpacer}${rowsHtml}${bottomSpacer}`;
  applyDiligenceAutoSizing(body);
}

function queueDiligenceVirtualRender(){
  if(diligenceVirtualRafId) return;
  diligenceVirtualRafId = window.requestAnimationFrame(()=>{
    diligenceVirtualRafId = null;
    renderDiligenceVirtualWindow();
  });
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

async function ensureExcelLibraries({ needXlsx = true, needExcelJs = false, silent = false } = {}){
  try{
    if(needXlsx && typeof XLSX === 'undefined'){
      if(!xlsxLoadPromise){
        xlsxLoadPromise = loadExternalScript(XLSX_LOCAL_URL, 'xlsx-local')
          .catch(()=>loadExternalScript(XLSX_CDN_URL, 'xlsx-cdn'));
      }
      await xlsxLoadPromise;
      if(typeof XLSX === 'undefined'){
        xlsxLoadPromise = null;
        throw new Error("Librairie XLSX introuvable (vérifiez /vendor/libs/xlsx.full.min.js ou l'accès CDN).");
      }
    }
    if(needExcelJs && typeof ExcelJS === 'undefined'){
      if(!excelJsLoadPromise){
        excelJsLoadPromise = loadExternalScript(EXCELJS_LOCAL_URL, 'exceljs-local')
          .catch(()=>loadExternalScript(EXCELJS_CDN_URL, 'exceljs-cdn'));
      }
      await excelJsLoadPromise;
      if(typeof ExcelJS === 'undefined'){
        excelJsLoadPromise = null;
        throw new Error("Librairie ExcelJS introuvable (vérifiez /vendor/libs/exceljs.min.js ou l'accès CDN).");
      }
    }
    return true;
  }catch(err){
    console.error(err);
    if(silent) return false;
    const details = String(err?.message || '').trim();
    const extra = details ? `\nDétail: ${details}` : '';
    alert(`Chargement du module Excel impossible.${extra}`);
    return false;
  }
}

function warmupExcelLibrariesOnIdle(){
  const warmup = ()=>{
    ensureExcelLibraries({ needXlsx: true, needExcelJs: true, silent: true }).catch(()=>{});
  };
  if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
    window.requestIdleCallback(warmup, { timeout: 2000 });
    return;
  }
  setTimeout(warmup, 900);
}

function scheduleBackgroundDataWarmup(delayMs = 1500){
  if(typeof window === 'undefined' || !currentUser) return;
  const targetVersion = audienceRowsRawDataVersion;
  if(backgroundDataWarmupVersion === targetVersion) return;
  if(backgroundDataWarmupTimer){
    clearTimeout(backgroundDataWarmupTimer);
    backgroundDataWarmupTimer = null;
  }
  const warmup = ()=>{
    backgroundDataWarmupTimer = null;
    if(!currentUser) return;
    if(backgroundDataWarmupVersion === audienceRowsRawDataVersion) return;
    try{
      getClientListSummaries();
      getDashboardSnapshot();
      getDashboardCalendarEvents();
      getSuiviBaseRowsCached();
      const audienceRows = getAudienceRows();
      const prevAudienceColor = selectedAudienceColor;
      const prevErrorsOnly = filterAudienceErrorsOnly;
      selectedAudienceColor = 'all';
      filterAudienceErrorsOnly = false;
      getFilteredAudienceRows(audienceRows);
      selectedAudienceColor = 'blue';
      getFilteredAudienceRows(audienceRows);
      selectedAudienceColor = prevAudienceColor;
      filterAudienceErrorsOnly = prevErrorsOnly;
      getDiligenceRows();
      backgroundDataWarmupVersion = audienceRowsRawDataVersion;
    }catch(err){
      console.warn('Préchargement des caches impossible', err);
    }
  };
  backgroundDataWarmupTimer = setTimeout(()=>{
    backgroundDataWarmupTimer = null;
    if(typeof window.requestIdleCallback === 'function'){
      window.requestIdleCallback(warmup, { timeout: 2500 });
      return;
    }
    warmup();
  }, Math.max(0, Number(delayMs) || 0));
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
  if(LOCAL_ONLY_MODE){
    API_BASE_RESOLVED = true;
    return API_BASE;
  }
  if(API_BASE_RESOLVED && !forceRetry){
    return API_BASE;
  }
  const candidates = buildApiBaseCandidates();
  for(const candidate of candidates){
    if(await pingApiBase(candidate, API_PROBE_TIMEOUT_MS)){
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
  if(LOCAL_ONLY_MODE){
    setPingMetric(null);
    lastLiveDelayMs = null;
    renderSyncMetrics();
    setSyncStatus('error', 'Mode local (offline)');
    return;
  }
  const currentProbe = await pingApiBaseWithLatency(API_BASE, API_HEALTH_TIMEOUT_MS);
  if(currentProbe.ok){
    setPingMetric(currentProbe.latencyMs);
    setSyncStatus('ok', 'Connecte au serveur (actif)');
    return;
  }
  await resolveApiBase(true);
  const retryProbe = await pingApiBaseWithLatency(API_BASE, API_HEALTH_TIMEOUT_MS);
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

function grantCurrentViewerAccessToClient(clientId){
  if(!isViewer()) return;
  const idNum = Number(clientId);
  if(!Number.isFinite(idNum)) return;
  if(!Array.isArray(currentUser.clientIds)){
    currentUser.clientIds = [];
  }
  if(!currentUser.clientIds.includes(idNum)){
    currentUser.clientIds.push(idNum);
  }
  const userIdx = USERS.findIndex(u=>Number(u?.id) === Number(currentUser?.id));
  if(userIdx === -1){
    return;
  }
  const user = USERS[userIdx];
  const nextIds = Array.isArray(user?.clientIds) ? user.clientIds.slice() : [];
  if(!nextIds.includes(idNum)){
    nextIds.push(idNum);
  }
  USERS[userIdx] = { ...user, clientIds: nextIds };
  currentUser = USERS[userIdx];
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

function getCurrentClientAccessCacheKey(){
  const user = currentUser || {};
  const ids = Array.isArray(user?.clientIds) ? user.clientIds.map(v=>Number(v)).filter(Number.isFinite).sort((a, b)=>a - b) : [];
  return [
    String(user?.id || ''),
    String(user?.role || ''),
    ids.join(',')
  ].join('||');
}

function getVisibleClients(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    visibleClientsCache
    && visibleClientsCacheVersion === audienceRowsRawDataVersion
    && visibleClientsCacheUserKey === userKey
  ){
    return visibleClientsCache;
  }
  const next = AppState.clients.filter(c=>canViewClient(c));
  visibleClientsCache = next;
  visibleClientsCacheVersion = audienceRowsRawDataVersion;
  visibleClientsCacheUserKey = userKey;
  return next;
}

function getEditableClients(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    editableClientsCache
    && editableClientsCacheVersion === audienceRowsRawDataVersion
    && editableClientsCacheUserKey === userKey
  ){
    return editableClientsCache;
  }
  const next = getVisibleClients().filter(c=>canEditClient(c));
  editableClientsCache = next;
  editableClientsCacheVersion = audienceRowsRawDataVersion;
  editableClientsCacheUserKey = userKey;
  return next;
}

function getClientListSummaries(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    clientListSummaryCache
    && clientListSummaryCacheVersion === audienceRowsRawDataVersion
    && clientListSummaryCacheUserKey === userKey
  ){
    return clientListSummaryCache;
  }
  const next = getVisibleClients().map(client=>({
    client,
    id: client?.id,
    name: String(client?.name || ''),
    nameLower: String(client?.name || '').toLowerCase(),
    dossierCount: Array.isArray(client?.dossiers) ? client.dossiers.length : 0,
    canEdit: canEditClient(client)
  }));
  clientListSummaryCache = next;
  clientListSummaryCacheVersion = audienceRowsRawDataVersion;
  clientListSummaryCacheUserKey = userKey;
  return next;
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
            type="text"
            inputmode="decimal"
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
  const input = document.querySelector('#procedureMontantGroups .procedure-montant-group input');
  if(input && String(input.value || '').trim() !== normalized){
    input.value = normalized;
  }
}

function hasMultipleAffectationDatesForSelection(selectedProcedures){
  const selected = [...new Set((selectedProcedures || []).map(v=>String(v || '').trim()).filter(Boolean))];
  if(selected.length <= 1) return false;
  const dateSet = new Set();
  const draft = collectProcedureDraft();
  let fallbackDate = '';

  if(editingDossier){
    const data = getDossierByIds(editingDossier.clientId, editingDossier.index);
    const dossier = data?.dossier;
    fallbackDate = normalizeDateDDMMYYYY(dossier?.dateAffectation || '') || String(dossier?.dateAffectation || '').trim();
    selected.forEach(proc=>{
      const fromDraft = normalizeDateDDMMYYYY(draft?.[proc]?.dateDepot || '') || String(draft?.[proc]?.dateDepot || '').trim();
      const fromDetails = normalizeDateDDMMYYYY(dossier?.procedureDetails?.[proc]?.dateDepot || '') || String(dossier?.procedureDetails?.[proc]?.dateDepot || '').trim();
      const value = fromDraft || fromDetails || fallbackDate;
      if(value) dateSet.add(value);
    });
  }else{
    fallbackDate = normalizeDateDDMMYYYY($('dateAffectation')?.value || '') || String($('dateAffectation')?.value || '').trim();
    selected.forEach(proc=>{
      const fromDraft = normalizeDateDDMMYYYY(draft?.[proc]?.dateDepot || '') || String(draft?.[proc]?.dateDepot || '').trim();
      const value = fromDraft || fallbackDate;
      if(value) dateSet.add(value);
    });
  }

  return dateSet.size > 1;
}

function hasNewProceduresComparedToOriginal(selectedProcedures){
  if(!editingDossier) return false;
  const selected = [...new Set((selectedProcedures || []).map(v=>String(v || '').trim()).filter(Boolean))];
  if(!selected.length) return false;
  const originalSet = new Set((editingOriginalProcedures || []).map(v=>String(v || '').trim()).filter(Boolean));
  if(!originalSet.size) return false;
  return selected.some(proc=>!originalSet.has(proc));
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

  const allowSecondGroup = hasMultipleAffectationDatesForSelection(selected)
    || hasNewProceduresComparedToOriginal(selected);

  // In "new dossier" mode, keep a single montant group only.
  // Group splitting (Montant 2) is reserved for dossier modification mode.
  if(!editingDossier || !allowSecondGroup){
    const mainMontantValue = String($('montantInput')?.value || '').trim();
    const now = Date.now();
    const resolvedMontantValue = mainMontantValue
      || String(procedureMontantGroups[0]?.montant || '').trim()
      || '';
    if(!procedureMontantGroups.length){
      procedureMontantGroups = [{
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        montant: resolvedMontantValue,
        procedures: selected
      }];
    }else{
      const first = procedureMontantGroups[0];
      const merged = new Set(first.procedures);
      selected.forEach(proc=>merged.add(proc));
      first.procedures = [...merged];
      if(resolvedMontantValue){
        first.montant = resolvedMontantValue;
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
  const subtitleText = String(subtitle || '').trim();
  if(typeof ExcelJS === 'undefined'){
    if(typeof XLSX === 'undefined'){
      alert('Export XLSX indisponible: librairie Excel non chargée.');
      return;
    }
    const aoa = [
      ['CABINET ARAQUI HOUSSAINI'],
      [subtitleText],
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
  sheet.getCell('A2').value = subtitleText;
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
  if(compact === 'rest' || compact === 'restitution' || compact === 'restit' || compact === 'rv' || compact === 'res') return 'Restitution';
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
    .normalize('NFKC')
    .trim()
    // Remove invisible direction/zero-width markers often present in Excel content.
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u061C]/g, '')
    .replace(/[’'`´]/g, '')
    // Unify all slash variants to "/" so matching is stable.
    .replace(/[\\\/⁄∕／]+/g, '/')
    .replace(/\s+/g, '')
    .toUpperCase();
}

function normalizeDossierReferenceValue(value){
  const raw = String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u061C]/g, '');
  if(!raw) return '';

  const unified = raw
    .replace(/[’'`´]/g, '')
    .replace(/[\\\/⁄∕／]+/g, '/')
    .replace(/[_\-.]+/g, '/')
    .replace(/\s+/g, '');

  let parts = null;
  const slashMatch = unified.match(/(\d{1,10})\/(\d{1,10})\/(\d{2,4})/);
  if(slashMatch){
    parts = [slashMatch[1], slashMatch[2], slashMatch[3]];
  }else{
    const numericParts = unified.match(/\d+/g) || [];
    if(numericParts.length >= 3){
      parts = [numericParts[0], numericParts[1], numericParts[2]];
    }
  }
  if(!parts) return '';

  const firstNum = Number.parseInt(parts[0], 10);
  const secondNum = Number.parseInt(parts[1], 10);
  const yearNum = Number.parseInt(parts[2], 10);
  if(!Number.isFinite(firstNum) || !Number.isFinite(secondNum) || !Number.isFinite(yearNum)){
    return '';
  }
  const year = parts[2].length === 2
    ? (yearNum >= 70 ? 1900 + yearNum : 2000 + yearNum)
    : yearNum;
  return `${firstNum}/${secondNum}/${year}`;
}

function normalizeReferenceForAudienceLookup(value){
  const dossierRef = normalizeDossierReferenceValue(value);
  if(dossierRef) return dossierRef;
  return normalizeReferenceValue(value);
}

function splitReferenceValues(value){
  const rawChunks = String(value || '')
    .replace(/\r\n/g, '\n')
    .split(/[,;|+\n]+/)
    .map(v=>String(v || '').trim())
    .filter(Boolean);

  const DOSSIER_REF_PATTERN = /^\d+\/\d+\/\d{2,4}$/;
  const out = [];
  rawChunks.forEach(chunk=>{
    const normalizedChunk = normalizeReferenceValue(chunk);
    if(!normalizedChunk) return;
    if(DOSSIER_REF_PATTERN.test(normalizedChunk)){
      // Keep dossier references like 13580/8209/2025 intact.
      out.push(normalizedChunk);
      return;
    }
    // Ref client can be packed with "/" (e.g. C5034086/C5034027).
    normalizedChunk
      .split('/')
      .map(v=>String(v || '').trim())
      .filter(Boolean)
      .forEach(v=>out.push(v));
  });
  return out;
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

function parseExcelDateValues(value){
  if(value === null || value === undefined) return [];
  if(value instanceof Date || (typeof value === 'number' && Number.isFinite(value))){
    const single = parseExcelDateValue(value);
    return single ? [single] : [];
  }

  const text = String(value || '').trim();
  if(!text) return [];

  const candidates = text.match(/\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}/g) || [];
  const normalizedCandidates = candidates
    .map(token=>normalizeDateDDMMYYYY(token))
    .filter(Boolean);

  if(normalizedCandidates.length){
    return [...new Set(normalizedCandidates)];
  }

  const single = normalizeDateDDMMYYYY(text);
  return single ? [single] : [];
}

function parseMontantTokenNumber(token){
  let text = String(token || '')
    .trim()
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, '');
  if(!text || !/\d/.test(text)) return NaN;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  if(lastComma !== -1 && lastDot !== -1){
    const decimalIdx = Math.max(lastComma, lastDot);
    text = text.replace(/[.,]/g, (sep, idx)=>idx === decimalIdx ? '.' : '');
  }else if(lastComma !== -1){
    text = text.replace(/\./g, '').replace(',', '.');
  }else if(lastDot !== -1){
    const parts = text.split('.');
    if(parts.length > 2){
      const decimalPart = parts.pop();
      text = `${parts.join('')}.${decimalPart}`;
    }
  }

  text = text.replace(/[^\d.+-]/g, '');
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : NaN;
}

function getLowerMontantValue(value){
  const raw = String(value || '').trim();
  if(!raw) return '';
  const parts = raw.match(/[-+]?\d+(?:[.,]\d+)?/g) || [];
  if(parts.length <= 1) return raw;
  const candidates = parts
    .map(part=>{
      const token = String(part || '').trim();
      return {
        token,
        numeric: parseMontantTokenNumber(token)
      };
    })
    .filter(item=>item.token && Number.isFinite(item.numeric));
  if(candidates.length <= 1) return raw;
  let min = candidates[0];
  for(let i = 1; i < candidates.length; i++){
    if(candidates[i].numeric < min.numeric) min = candidates[i];
  }
  return min.token || raw;
}

function parseExcelMontantValues(value){
  const text = String(value || '').trim();
  if(!text) return [];

  const lineCandidates = text
    .replace(/\r\n/g, '\n')
    .split(/[\n;|]+/)
    .map(v=>String(v || '').trim())
    .filter(Boolean);

  const source = lineCandidates.length ? lineCandidates : [text];
  const out = [];

  source.forEach(token=>{
    const tokenNumeric = parseMontantTokenNumber(token);
    if(Number.isFinite(tokenNumeric)){
      out.push(token);
      return;
    }
    const parts = String(token).match(/[-+]?\d[\d\s\u00A0.,]*/g) || [];
    parts.forEach(part=>{
      const cleaned = String(part || '').trim();
      if(!cleaned) return;
      const numeric = parseMontantTokenNumber(cleaned);
      if(Number.isFinite(numeric)) out.push(cleaned);
    });
  });

  return [...new Set(out)];
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

function normalizeClient(rawClient, options = {}){
  if(!rawClient || typeof rawClient !== 'object') return null;
  const opts = options && typeof options === 'object' ? options : {};
  const deepNormalize = opts.deep !== false;
  const id = Number(rawClient.id);
  const name = String(rawClient.name || '').trim();
  const dossiers = Array.isArray(rawClient.dossiers)
    ? (
      deepNormalize
        ? rawClient.dossiers.map(d=>{
          if(!d || typeof d !== 'object') return d;
          const normalizedDate = normalizeDateDDMMYYYY(d.dateAffectation || '');
          const normalizedProcedures = normalizeProcedures(d);
          return {
            ...d,
            dateAffectation: normalizedDate || '',
            montant: getLowerMontantValue(d.montant || ''),
            history: normalizeDossierHistoryEntries(d.history),
            montantByProcedure: normalizeProcedureMontantGroups(
              d.montantByProcedure,
              normalizedProcedures,
              getLowerMontantValue(d.montant || '')
            )
          };
        })
        : rawClient.dossiers.filter(d=>!!d && typeof d === 'object')
    )
    : [];
  if(!Number.isFinite(id) || !name) return null;
  return { id, name, dossiers };
}

function normalizeRecycleBinEntries(rawEntries){
  if(!Array.isArray(rawEntries)) return [];
  return rawEntries
    .map(entry=>{
      if(!entry || typeof entry !== 'object') return null;
      const type = String(entry.type || '').trim() || 'unknown';
      const at = String(entry.at || '').trim() || new Date().toISOString();
      const by = String(entry.by || '').trim() || '-';
      const byRole = String(entry.byRole || '').trim() || '';
      const payload = entry.payload && typeof entry.payload === 'object'
        ? entry.payload
        : {};
      return { type, at, by, byRole, payload };
    })
    .filter(Boolean)
    .slice(-RECYCLE_BIN_MAX_ENTRIES);
}

function normalizeRecycleArchiveEntries(rawEntries){
  if(!Array.isArray(rawEntries)) return [];
  return rawEntries
    .map(entry=>{
      if(!entry || typeof entry !== 'object') return null;
      const type = String(entry.type || '').trim() || 'unknown';
      const at = String(entry.at || '').trim() || new Date().toISOString();
      const by = String(entry.by || '').trim() || '-';
      const byRole = String(entry.byRole || '').trim() || '';
      const payload = entry.payload && typeof entry.payload === 'object'
        ? entry.payload
        : {};
      return { type, at, by, byRole, payload };
    })
    .filter(Boolean)
    .slice(-RECYCLE_ARCHIVE_MAX_ENTRIES);
}

function pushRecycleBinEntry(type, payload){
  if(!AppState || typeof AppState !== 'object') return;
  if(!Array.isArray(AppState.recycleBin)) AppState.recycleBin = [];
  AppState.recycleBin.push({
    type: String(type || 'unknown'),
    at: new Date().toISOString(),
    by: String(currentUser?.username || '-'),
    byRole: String(currentUser?.role || ''),
    payload: payload && typeof payload === 'object' ? payload : {}
  });
  if(AppState.recycleBin.length > RECYCLE_BIN_MAX_ENTRIES){
    AppState.recycleBin = AppState.recycleBin.slice(-RECYCLE_BIN_MAX_ENTRIES);
  }
}

function pushRecycleArchiveEntries(entries){
  if(!AppState || typeof AppState !== 'object') return;
  if(!Array.isArray(entries) || !entries.length) return;
  if(!Array.isArray(AppState.recycleArchive)) AppState.recycleArchive = [];
  const normalized = normalizeRecycleArchiveEntries(entries);
  if(!normalized.length) return;
  AppState.recycleArchive.push(...normalized);
  if(AppState.recycleArchive.length > RECYCLE_ARCHIVE_MAX_ENTRIES){
    AppState.recycleArchive = AppState.recycleArchive.slice(-RECYCLE_ARCHIVE_MAX_ENTRIES);
  }
}

function getNextClientId(preferred){
  const used = new Set(
    (Array.isArray(AppState.clients) ? AppState.clients : [])
      .map(c=>Number(c?.id))
      .filter(Number.isFinite)
  );
  let id = Number(preferred);
  if(!Number.isFinite(id) || used.has(id)){
    id = Date.now() + Math.floor(Math.random() * 1000000);
  }
  while(used.has(id)) id += 1;
  return id;
}

function getUniqueClientName(baseName){
  const source = String(baseName || '').trim() || 'Client restauré';
  const names = new Set(
    (Array.isArray(AppState.clients) ? AppState.clients : [])
      .map(c=>String(c?.name || '').trim().toLowerCase())
      .filter(Boolean)
  );
  if(!names.has(source.toLowerCase())) return source;
  let counter = 2;
  let candidate = `${source} (${counter})`;
  while(names.has(candidate.toLowerCase())){
    counter += 1;
    candidate = `${source} (${counter})`;
  }
  return candidate;
}

function getRecycleEntryActionLabel(entry){
  const type = String(entry?.type || '').trim();
  if(type === 'client_delete') return 'Suppression client';
  if(type === 'dossier_delete') return 'Suppression dossier';
  if(type === 'all_clients_delete') return 'Suppression globale';
  return 'Suppression';
}

function getRecycleEntryTypeUi(entry){
  const type = String(entry?.type || '').trim();
  if(type === 'client_delete'){
    return { icon: 'fa-solid fa-users', cls: 'client' };
  }
  if(type === 'dossier_delete'){
    return { icon: 'fa-solid fa-folder-open', cls: 'dossier' };
  }
  if(type === 'all_clients_delete'){
    return { icon: 'fa-solid fa-layer-group', cls: 'snapshot' };
  }
  return { icon: 'fa-solid fa-trash-can', cls: 'default' };
}

function getRecycleEntryActorLabel(entry){
  const by = String(entry?.by || '-').trim() || '-';
  let role = String(entry?.byRole || '').trim().toLowerCase();
  if(!role && by && by !== '-'){
    const found = (Array.isArray(USERS) ? USERS : []).find(u=>
      String(u?.username || '').trim().toLowerCase() === by.toLowerCase()
    );
    role = String(found?.role || '').trim().toLowerCase();
  }
  if(!role) return by;
  return `${by} (${getRoleLabel(role)})`;
}

function getRecycleEntryDetails(entry){
  const payload = entry?.payload && typeof entry.payload === 'object' ? entry.payload : {};
  const type = String(entry?.type || '').trim();
  if(type === 'client_delete'){
    const client = payload.client && typeof payload.client === 'object' ? payload.client : {};
    const dossierCount = Array.isArray(client.dossiers) ? client.dossiers.length : 0;
    return `Client: ${client.name || '-'} (${dossierCount} dossier(s))`;
  }
  if(type === 'dossier_delete'){
    const dossier = payload.dossier && typeof payload.dossier === 'object' ? payload.dossier : {};
    const ref = dossier.referenceClient || dossier.debiteur || '-';
    const clientName = payload.clientName || '-';
    return `Client: ${clientName} | Réf dossier: ${ref}`;
  }
  if(type === 'all_clients_delete'){
    const clients = Array.isArray(payload.clients) ? payload.clients : [];
    const clientCount = clients.length;
    const dossierCount = clients.reduce((sum, client)=>sum + (Array.isArray(client?.dossiers) ? client.dossiers.length : 0), 0);
    return `Snapshot: ${clientCount} client(s), ${dossierCount} dossier(s)`;
  }
  return '-';
}

function refreshAfterRecycleRestore(){
  queuePersistAppState();
  renderClients();
  updateClientDropdown();
  renderDashboard();
  renderSuivi();
  renderAudience();
  renderDiligence();
  renderEquipe();
  renderSalle();
  renderRecycleBin();
}

function restoreRecycleEntryAt(index, options = {}){
  if(!canDeleteData()) return false;
  const idx = Number(index);
  if(!Number.isFinite(idx)) return false;
  const list = Array.isArray(AppState.recycleBin) ? AppState.recycleBin : [];
  const entry = list[idx];
  if(!entry) return false;
  const payload = entry.payload && typeof entry.payload === 'object' ? entry.payload : {};
  const type = String(entry.type || '').trim();
  let restored = false;

  if(type === 'client_delete'){
    const rawClient = payload.client && typeof payload.client === 'object' ? payload.client : null;
    const client = normalizeClient(rawClient);
    if(client){
      const restoredNameKey = String(client.name || '').trim().toLowerCase();
      const existingClient = AppState.clients.find(c=>
        String(c?.name || '').trim().toLowerCase() === restoredNameKey
      );
      if(existingClient){
        if(!Array.isArray(existingClient.dossiers)) existingClient.dossiers = [];
        const existingSignatures = new Set(
          existingClient.dossiers
            .map(d=>makeDossierMergeSignature(d))
            .filter(Boolean)
        );
        const incomingDossiers = Array.isArray(client.dossiers) ? client.dossiers : [];
        incomingDossiers.forEach(dossier=>{
          const signature = makeDossierMergeSignature(dossier);
          if(signature && existingSignatures.has(signature)) return;
          if(signature) existingSignatures.add(signature);
          existingClient.dossiers.push(dossier);
        });
      }else{
        client.id = getNextClientId(client.id);
        client.name = String(client.name || '').trim() || 'Client restauré';
        AppState.clients.push(client);
      }
      restored = true;
    }
  }else if(type === 'dossier_delete'){
    const rawDossier = payload.dossier && typeof payload.dossier === 'object' ? payload.dossier : null;
    const dossier = rawDossier ? JSON.parse(JSON.stringify(rawDossier)) : null;
    if(dossier){
      const wantedClientId = Number(payload.clientId);
      let client = AppState.clients.find(c=>Number(c?.id) === wantedClientId);
      if(!client){
        const fallbackName = getUniqueClientName(payload.clientName || 'Client restauré');
        client = { id: getNextClientId(wantedClientId), name: fallbackName, dossiers: [] };
        AppState.clients.push(client);
      }
      if(!Array.isArray(client.dossiers)) client.dossiers = [];
      client.dossiers.push(dossier);
      restored = true;
    }
  }else if(type === 'all_clients_delete'){
    const rawClients = Array.isArray(payload.clients) ? payload.clients : [];
    const restoredClients = rawClients.map(normalizeClient).filter(Boolean);
    const restoredUsers = Array.isArray(payload.usersBeforeDelete)
      ? payload.usersBeforeDelete.map(normalizeUser).filter(Boolean)
      : [];
    AppState.clients = restoredClients;
    USERS = ensureManagerUser(restoredUsers.length ? restoredUsers : USERS);
    restored = true;
  }

  if(!restored) return false;
  AppState.recycleBin.splice(idx, 1);
  if(!options.skipRefresh) refreshAfterRecycleRestore();
  return true;
}

function restoreRecycleItem(index){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut restaurer');
  const idx = Number(index);
  if(!Number.isFinite(idx)) return;
  const entry = (Array.isArray(AppState.recycleBin) ? AppState.recycleBin : [])[idx];
  if(!entry) return;
  const detail = getRecycleEntryDetails(entry);
  if(!window.confirm(`Restaurer cet élément ?\n${detail}`)) return;
  const ok = restoreRecycleEntryAt(idx);
  if(!ok) alert('Impossible de restaurer cet élément');
}

function restoreAllRecycleItems(){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut restaurer');
  const items = Array.isArray(AppState.recycleBin) ? AppState.recycleBin : [];
  if(!items.length) return alert('Corbeille vide');
  if(!window.confirm(`Restaurer tous les éléments (${items.length}) ?`)) return;
  let restoredCount = 0;
  for(let i = items.length - 1; i >= 0; i -= 1){
    if(restoreRecycleEntryAt(i, { skipRefresh: true })) restoredCount += 1;
  }
  refreshAfterRecycleRestore();
  alert(`Restauration terminée: ${restoredCount} élément(s) restauré(s).`);
}

function clearRecycleBinToBackup(){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut vider la corbeille');
  const items = Array.isArray(AppState.recycleBin) ? AppState.recycleBin : [];
  if(!items.length) return alert('Corbeille vide');
  if(!window.confirm(`Vider la corbeille (${items.length} élément(s)) ?\nLes éléments seront gardés dans le backup interne.`)) return;
  pushRecycleArchiveEntries(items);
  AppState.recycleBin = [];
  queuePersistAppState();
  renderRecycleBin();
  alert('Corbeille vidée. Backup interne conservé.');
}

function renderRecycleBin(options = {}){
  if(!shouldRenderDeferredSection('recycle', options)) return;
  const body = $('recycleBody');
  if(!body) return;
  const restoreAllBtn = $('restoreAllRecycleBtn');
  const clearBtn = $('clearRecycleBinBtn');
  if(restoreAllBtn) restoreAllBtn.style.display = canDeleteData() ? '' : 'none';
  if(clearBtn) clearBtn.style.display = canDeleteData() ? '' : 'none';
  if(!canDeleteData()){
    if(clearBtn) clearBtn.disabled = true;
    body.innerHTML = '<tr><td colspan="5">Accès réservé au gestionnaire.</td></tr>';
    renderPagination('recycle', { totalRows: 0 });
    return;
  }
  const source = Array.isArray(AppState.recycleBin) ? AppState.recycleBin : [];
  if(clearBtn) clearBtn.disabled = source.length === 0;
  const rows = source
    .map((entry, originalIndex)=>({ entry, originalIndex }))
    .slice()
    .reverse();
  const pagination = paginateRows(rows, 'recycle');
  if(!pagination.rows.length){
    body.innerHTML = '<tr><td colspan="5">Corbeille vide.</td></tr>';
    renderPagination('recycle', { totalRows: 0 });
    return;
  }
  body.innerHTML = pagination.rows.map(row=>{
    const entry = row.entry;
    const typeUi = getRecycleEntryTypeUi(entry);
    const actionLabel = getRecycleEntryActionLabel(entry);
    return `
      <tr>
        <td data-label="Date & heure">${escapeHtml(formatHistoryDateTime(entry.at))}</td>
        <td data-label="Action">
          <span class="recycle-type-badge recycle-type-${escapeHtml(typeUi.cls)}">
            <i class="${escapeHtml(typeUi.icon)}"></i>
            ${escapeHtml(actionLabel)}
          </span>
        </td>
        <td data-label="Utilisateur">${escapeHtml(getRecycleEntryActorLabel(entry))}</td>
        <td data-label="Détails">${escapeHtml(getRecycleEntryDetails(entry))}</td>
        <td data-label="Restore">
          <button type="button" class="btn-primary" data-action="restore" data-index="${row.originalIndex}">
            <i class="fa-solid fa-rotate-left"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  renderPagination('recycle', pagination);
}

function getKnownJudges(){
  if(knownJudgesCache && knownJudgesCacheVersion === audienceRowsRawDataVersion){
    return knownJudgesCache;
  }
  const set = new Set();
  AppState.clients.forEach(c=>{
    c.dossiers.forEach(d=>{
      Object.values(d?.procedureDetails || {}).forEach(details=>{
        const juge = normalizeJudgeName(details?.juge || '');
        if(juge) set.add(juge);
      });
    });
  });
  knownJudgesCache = [...set].sort((a, b)=>a.localeCompare(b, 'fr'));
  knownJudgesCacheVersion = audienceRowsRawDataVersion;
  return knownJudgesCache;
}

function buildSalleAudienceMap(dayKey = selectedSalleDay){
  const targetDay = normalizeSalleWeekday(dayKey);
  const userKey = `${getCurrentClientAccessCacheKey()}||${targetDay}`;
  if(
    salleAudienceMapCache
    && salleAudienceMapCacheVersion === audienceRowsRawDataVersion
    && salleAudienceMapCacheUserKey === userKey
  ){
    return salleAudienceMapCache;
  }
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
      ref: String(row?.draft?.refDossier || row?.p?.referenceClient || row?.d?.referenceClient || '').trim() || '-',
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

  salleAudienceMapCache = bySalleAndJudge;
  salleAudienceMapCacheVersion = audienceRowsRawDataVersion;
  salleAudienceMapCacheUserKey = userKey;
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

  const headers = ['Client', 'Adversaire', 'N° Dossier', 'Juge', 'Instruction', 'Sort'];
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
            s.instruction || '-',
            ''
          ]);
        });
    });
  if(!rows.length){
    rows.push(['-', '-', '-', '-', '-', '-']);
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
    colWidths: [{ wch: 22 }, { wch: 28 }, { wch: 28 }, { wch: 22 }, { wch: 28 }, { wch: 34 }],
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

function buildStateSignature(clients, salleAssignments, users, draft, recycleBin, recycleArchive){
  try{
    return JSON.stringify({
      clients,
      salleAssignments,
      users,
      audienceDraft: draft,
      recycleBin,
      recycleArchive
    });
  }catch(err){
    return '';
  }
}

function buildAppStatePayload(){
  return {
    clients: AppState.clients,
    salleAssignments: AppState.salleAssignments,
    users: USERS,
    audienceDraft: audienceDraft,
    recycleBin: Array.isArray(AppState.recycleBin) ? AppState.recycleBin : [],
    recycleArchive: Array.isArray(AppState.recycleArchive) ? AppState.recycleArchive : []
  };
}

function makeClientMatchKey(value){
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getDossierAudienceReferenceKeys(dossier){
  const refs = new Set();
  const pushRef = (value)=>{
    splitReferenceValues(value).forEach(part=>{
      const key = normalizeReferenceForAudienceLookup(part);
      if(key) refs.add(key);
    });
  };
  pushRef(dossier?.referenceClient || '');
  const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  Object.values(details).forEach(proc=>{
    pushRef(proc?.referenceClient || '');
  });
  return refs;
}

function getDossierProcedureReferenceKeys(dossier){
  const refs = new Set();
  const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  Object.values(details).forEach(proc=>{
    splitReferenceValues(proc?.referenceClient || '').forEach(part=>{
      const key = normalizeReferenceForAudienceLookup(part);
      if(key) refs.add(key);
    });
  });
  return refs;
}

function getDossierDebiteurKey(dossier){
  return String(dossier?.debiteur || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function chooseAudienceProcedureTarget(globalDossier, orphanProcKey){
  const globalProcs = new Set(normalizeProcedures(globalDossier));
  if(globalProcs.has(orphanProcKey)) return orphanProcKey;
  const audienceProcs = [...globalProcs].filter(proc=>isAudienceProcedure(proc));
  if(audienceProcs.length) return audienceProcs[0];
  return orphanProcKey || 'ASS';
}

function mergeAudienceProcedureFields(targetProc, sourceProc){
  const fields = ['referenceClient', 'audience', 'juge', 'sort', 'tribunal', 'depotLe', 'dateDepot', 'executionNo', 'color', 'instruction'];
  let sourceHasAudienceData = false;
  let targetHasAudienceData = false;
  let changed = false;
  fields.forEach(field=>{
    const incoming = String(sourceProc?.[field] ?? '').trim();
    const existing = String(targetProc?.[field] ?? '').trim();
    if(incoming){
      sourceHasAudienceData = true;
      if(!existing){
        targetProc[field] = sourceProc[field];
        changed = true;
      }
    }
    const targetValue = String(targetProc?.[field] ?? '').trim();
    if(targetValue){
      targetHasAudienceData = true;
    }
  });
  delete targetProc._missingGlobal;
  // Mark as merged only when source actually contains audience payload and
  // target now carries audience values (newly copied or already present).
  return sourceHasAudienceData && (changed || targetHasAudienceData);
}

function resolveAudienceTargetProcKey(dossier, preferredProcKey, sourceProcData){
  if(!dossier.procedureDetails || typeof dossier.procedureDetails !== 'object'){
    dossier.procedureDetails = {};
  }
  const details = dossier.procedureDetails;
  const baseKey = String(preferredProcKey || 'ASS').trim() || 'ASS';
  const sourceRef = normalizeReferenceForAudienceLookup(String(sourceProcData?.referenceClient || '').trim());

  if(!details[baseKey]) return baseKey;

  const baseRef = normalizeReferenceForAudienceLookup(String(details[baseKey]?.referenceClient || '').trim());
  if(!sourceRef || !baseRef || sourceRef === baseRef){
    return baseKey;
  }

  const sameRefEntry = Object.entries(details).find(([, procData])=>{
    const ref = normalizeReferenceForAudienceLookup(String(procData?.referenceClient || '').trim());
    return !!(ref && sourceRef && ref === sourceRef);
  });
  if(sameRefEntry) return sameRefEntry[0];

  let idx = 2;
  while(details[`${baseKey} ${idx}`]){
    idx += 1;
  }
  return `${baseKey} ${idx}`;
}

function reconcileAudienceOrphanDossiers(){
  const orphanClient = AppState.clients.find(
    client=>makeClientMatchKey(client?.name || '') === makeClientMatchKey(AUDIENCE_ORPHAN_CLIENT_NAME)
  );
  if(!orphanClient || !Array.isArray(orphanClient.dossiers) || !orphanClient.dossiers.length){
    return { matchedDossiers: 0, mergedProcedures: 0 };
  }

  const globalCandidates = [];
  AppState.clients.forEach(client=>{
    if(client === orphanClient) return;
    (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach(dossier=>{
      if(!dossier || dossier.isAudienceOrphanImport) return;
      globalCandidates.push({
        dossier,
        refs: getDossierAudienceReferenceKeys(dossier),
        procRefs: getDossierProcedureReferenceKeys(dossier),
        debiteurKey: getDossierDebiteurKey(dossier)
      });
    });
  });

  let matchedDossiers = 0;
  let mergedProcedures = 0;
  const keptOrphans = [];

  orphanClient.dossiers.forEach(orphanDossier=>{
    if(!orphanDossier || !orphanDossier.isAudienceOrphanImport){
      keptOrphans.push(orphanDossier);
      return;
    }

    const orphanRefs = getDossierAudienceReferenceKeys(orphanDossier);
    const orphanProcRefs = getDossierProcedureReferenceKeys(orphanDossier);
    if(!orphanRefs.size && !orphanProcRefs.size){
      keptOrphans.push(orphanDossier);
      return;
    }
    const orphanDebiteur = getDossierDebiteurKey(orphanDossier);
    const orphanProcs = new Set(normalizeProcedures(orphanDossier));
    const orphanClientRef = normalizeReferenceValue(String(orphanDossier?.referenceClient || '').trim());

    let bestCandidate = null;
    let bestScore = -1;
    globalCandidates.forEach(candidate=>{
      const hasProcRefMatch = orphanProcRefs.size
        ? [...orphanProcRefs].some(ref=>candidate.procRefs.has(ref))
        : false;
      const hasRefMatch = hasProcRefMatch || [...orphanRefs].some(ref=>candidate.refs.has(ref));
      if(!hasRefMatch) return;
      let score = 200;
      if(hasProcRefMatch) score += 120;
      const candidateClientRef = normalizeReferenceValue(String(candidate?.dossier?.referenceClient || '').trim());
      if(orphanClientRef && candidateClientRef && orphanClientRef === candidateClientRef){
        score += 60;
      }
      if(orphanDebiteur && candidate.debiteurKey && orphanDebiteur === candidate.debiteurKey){
        score += 50;
      }
      const candidateProcs = new Set(normalizeProcedures(candidate.dossier));
      let overlap = 0;
      orphanProcs.forEach(proc=>{
        if(candidateProcs.has(proc)) overlap += 1;
      });
      score += overlap * 20;
      if(score > bestScore){
        bestScore = score;
        bestCandidate = candidate;
      }
    });

    if(!bestCandidate){
      keptOrphans.push(orphanDossier);
      return;
    }

    if(!bestCandidate.dossier.procedureDetails || typeof bestCandidate.dossier.procedureDetails !== 'object'){
      bestCandidate.dossier.procedureDetails = {};
    }
    const orphanDetails = orphanDossier?.procedureDetails && typeof orphanDossier.procedureDetails === 'object'
      ? orphanDossier.procedureDetails
      : {};
    let mergedForCurrentOrphan = 0;
    Object.entries(orphanDetails).forEach(([orphanProcKey, orphanProcData])=>{
      const baseTargetProcKey = chooseAudienceProcedureTarget(bestCandidate.dossier, orphanProcKey);
      const targetProcKey = resolveAudienceTargetProcKey(bestCandidate.dossier, baseTargetProcKey, orphanProcData || {});
      if(!bestCandidate.dossier.procedureDetails[targetProcKey]){
        bestCandidate.dossier.procedureDetails[targetProcKey] = {};
      }
      const targetProc = bestCandidate.dossier.procedureDetails[targetProcKey] || {};
      const sourceProc = orphanProcData || {};
      const didMergeAudienceData = mergeAudienceProcedureFields(targetProc, sourceProc);
      if(didMergeAudienceData){
        mergedProcedures += 1;
        mergedForCurrentOrphan += 1;
      }
    });

    const updatedProcedures = normalizeProcedures(bestCandidate.dossier);
    bestCandidate.dossier.procedureList = updatedProcedures;
    bestCandidate.dossier.procedure = updatedProcedures.join(', ');

    if(mergedForCurrentOrphan > 0){
      matchedDossiers += 1;
      return;
    }
    keptOrphans.push(orphanDossier);
  });

  orphanClient.dossiers = keptOrphans;
  if(!orphanClient.dossiers.length){
    const orphanIdx = AppState.clients.findIndex(c=>c === orphanClient);
    if(orphanIdx !== -1) AppState.clients.splice(orphanIdx, 1);
  }

  return { matchedDossiers, mergedProcedures };
}

function makeDossierMergeSignature(dossier){
  if(!dossier || typeof dossier !== 'object') return '';
  const ref = normalizeReferenceValue(String(dossier.referenceClient || '').trim());
  const debiteur = String(dossier.debiteur || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const procedures = normalizeProcedures(dossier).map(v=>String(v || '').trim()).filter(Boolean).sort();
  const procedureKey = procedures.join('|');
  const dateAffectation = normalizeDateDDMMYYYY(dossier.dateAffectation || '') || '';
  return [ref, debiteur, procedureKey, dateAffectation].join('::');
}

function normalizeImportedPayload(raw){
  if(!raw || typeof raw !== 'object') return null;
  if(Array.isArray(raw.clients)){
    return raw;
  }
  if(raw.data && typeof raw.data === 'object' && Array.isArray(raw.data.clients)){
    return raw.data;
  }
  if(raw.state && typeof raw.state === 'object' && Array.isArray(raw.state.clients)){
    return raw.state;
  }
  return null;
}

async function importAppsavocatPayload(rawPayload){
  try{
    const payload = normalizeImportedPayload(rawPayload);
    if(!payload){
      throw new Error('Format non reconnu: structure "clients" introuvable.');
    }

    const importedClients = Array.isArray(payload.clients)
      ? payload.clients.map(normalizeClient).filter(Boolean)
      : [];
    const importedUsers = Array.isArray(payload.users)
      ? payload.users.map(normalizeUser).filter(Boolean)
      : [];
    const importedSalleAssignments = normalizeSalleAssignments(payload.salleAssignments);

    if(!importedClients.length && !importedUsers.length && !importedSalleAssignments.length){
      throw new Error('Le fichier ne contient aucune donnée exploitable.');
    }

    const existingClients = Array.isArray(AppState.clients) ? AppState.clients : [];
    const existingByName = new Map();
    const allClientIds = new Set();
    const importedClientIdToResolvedId = new Map();
    existingClients.forEach(client=>{
      allClientIds.add(Number(client?.id) || 0);
      const key = makeClientMatchKey(client?.name || '');
      if(key) existingByName.set(key, client);
    });
    const nextClientId = ()=>{
      let id = Date.now() + Math.floor(Math.random() * 1000000);
      while(allClientIds.has(id)) id += 1;
      allClientIds.add(id);
      return id;
    };

    let addedClients = 0;
    let addedDossiers = 0;
    let skippedDossiers = 0;

    const reportClientsProgress = makeProgressReporter('Import appsavocat - clients');
    await runChunked(importedClients, async (importedClient)=>{
    const key = makeClientMatchKey(importedClient.name || '');
    if(!key) return;
    const importedClientId = Number(importedClient.id);
    const target = existingByName.get(key);
    if(!target){
      const resolvedClientId = allClientIds.has(importedClientId) ? nextClientId() : importedClientId;
      const nextClient = {
        ...importedClient,
        id: resolvedClientId,
        dossiers: Array.isArray(importedClient.dossiers) ? importedClient.dossiers.slice() : []
      };
      nextClient.dossiers.forEach(()=>{ addedDossiers += 1; });
      AppState.clients.push(nextClient);
      existingByName.set(key, nextClient);
      allClientIds.add(Number(nextClient.id));
      if(Number.isFinite(importedClientId)) importedClientIdToResolvedId.set(importedClientId, Number(nextClient.id));
      addedClients += 1;
      return;
    }
    if(Number.isFinite(importedClientId)){
      importedClientIdToResolvedId.set(importedClientId, Number(target.id));
    }

    const existingSignatures = new Set(
      (Array.isArray(target.dossiers) ? target.dossiers : [])
        .map(d=>makeDossierMergeSignature(d))
        .filter(Boolean)
    );
    const importedDossiers = Array.isArray(importedClient.dossiers) ? importedClient.dossiers : [];
    importedDossiers.forEach(dossier=>{
      const signature = makeDossierMergeSignature(dossier);
      if(signature && existingSignatures.has(signature)){
        skippedDossiers += 1;
        return;
      }
      if(signature) existingSignatures.add(signature);
      if(!Array.isArray(target.dossiers)) target.dossiers = [];
      target.dossiers.push(dossier);
      addedDossiers += 1;
    });
    }, { chunkSize: IMPORT_CHUNK_SIZE, onProgress: reportClientsProgress });

    const existingUserByUsername = new Map(
      USERS.map(user=>[String(user?.username || '').trim().toLowerCase(), user])
    );
    let addedUsers = 0;
    const reportUsersProgress = makeProgressReporter('Import appsavocat - utilisateurs');
    await runChunked(importedUsers, async (user)=>{
    const usernameKey = String(user?.username || '').trim().toLowerCase();
    if(!usernameKey) return;
    if(existingUserByUsername.has(usernameKey)) return;
    const mappedClientIds = Array.isArray(user?.clientIds)
      ? [...new Set(user.clientIds.map(v=>{
        const num = Number(v);
        if(!Number.isFinite(num)) return null;
        return importedClientIdToResolvedId.has(num)
          ? importedClientIdToResolvedId.get(num)
          : num;
      }).filter(v=>Number.isFinite(v)))]
      : [];
    USERS.push({
      ...user,
      id: Number(user.id) || Date.now() + Math.floor(Math.random() * 1000000),
      clientIds: mappedClientIds
    });
    existingUserByUsername.set(usernameKey, user);
    addedUsers += 1;
    }, { chunkSize: IMPORT_CHUNK_SIZE, onProgress: reportUsersProgress });
    USERS = ensureManagerUser(USERS);

    AppState.salleAssignments = normalizeSalleAssignments([
      ...(Array.isArray(AppState.salleAssignments) ? AppState.salleAssignments : []),
      ...importedSalleAssignments
    ]);

    // audienceDraft keys depend on table indexes; imported draft keys may mismatch after merge.
    audienceDraft = {};
    const reconciliation = reconcileAudienceOrphanDossiers();
    markAudienceRowsCacheDirty();

    await persistAppStateNow();
    renderClients();
    renderDashboard();
    updateClientDropdown();
    renderSuivi();
    renderAudience();
    renderDiligence();
    renderSalle();
    renderEquipe();

    alert(
      [
        'Import appsavocat terminé.',
        `Clients ajoutés: ${addedClients}`,
        `Dossiers ajoutés: ${addedDossiers}`,
        `Dossiers ignorés (doublons): ${skippedDossiers}`,
        `Utilisateurs ajoutés: ${addedUsers}`,
        `Salles fusionnées: ${AppState.salleAssignments.length}`,
        `Audience hors global rapprochée: ${reconciliation.matchedDossiers}`
      ].join('\n')
    );
  }finally{
    // Keep current sync status (persist call already set the right state).
  }
}

async function handleAppsavocatImportFile(file){
  if(importInProgress) return;
  if(!file) return;
  if(!canEditData()){
    alert('Accès refusé');
    return;
  }
  importInProgress = true;
  try{
    openImportProgressModal('Import appsavocat');
    updateImportProgress('Lecture du fichier...', 0, 1);
    setSyncStatus('syncing', 'Import appsavocat en cours...');
    const text = await file.text();
    updateImportProgress('Analyse du fichier...', 1, 3);
    const parsed = JSON.parse(text);
    updateImportProgress('Fusion des données...', 2, 3);
    await importAppsavocatPayload(parsed);
    closeImportProgressModal(true);
  }catch(err){
    console.error(err);
    const details = String(err?.message || '').trim();
    alert(`Import appsavocat impossible.${details ? `\nDétail: ${details}` : ''}`);
  }finally{
    closeImportProgressModal(false);
    importInProgress = false;
  }
}

function hasDesktopStateBridge(){
  return typeof window !== 'undefined'
    && !!window.cabinetDesktopState
    && typeof window.cabinetDesktopState.writeState === 'function';
}

function hasIndexedDbSupport(){
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function getIndexedDbConnection(){
  if(!hasIndexedDbSupport()) return Promise.resolve(null);
  if(indexedDbOpenPromise) return indexedDbOpenPromise;
  indexedDbOpenPromise = new Promise((resolve)=>{
    try{
      const req = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);
      req.onupgradeneeded = ()=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(INDEXED_DB_STORE)){
          db.createObjectStore(INDEXED_DB_STORE);
        }
        if(!db.objectStoreNames.contains(INDEXED_DB_BACKUP_STORE)){
          db.createObjectStore(INDEXED_DB_BACKUP_STORE);
        }
      };
      req.onsuccess = ()=>resolve(req.result || null);
      req.onerror = ()=>{
        console.warn('IndexedDB indisponible, fallback localStorage', req.error);
        resolve(null);
      };
    }catch(err){
      console.warn('Ouverture IndexedDB impossible', err);
      resolve(null);
    }
  });
  return indexedDbOpenPromise;
}

async function writeStateToIndexedDb(payload){
  const db = await getIndexedDbConnection();
  if(!db) return false;
  return new Promise((resolve)=>{
    try{
      const tx = db.transaction(INDEXED_DB_STORE, 'readwrite');
      const store = tx.objectStore(INDEXED_DB_STORE);
      store.put(payload, INDEXED_DB_STATE_KEY);
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>{
        console.warn('Echec écriture IndexedDB', tx.error);
        resolve(false);
      };
      tx.onabort = ()=>resolve(false);
    }catch(err){
      console.warn('Ecriture IndexedDB impossible', err);
      resolve(false);
    }
  });
}

async function writeAutoBackupToIndexedDb(entry){
  const db = await getIndexedDbConnection();
  if(!db) return false;
  return new Promise((resolve)=>{
    try{
      const tx = db.transaction(INDEXED_DB_BACKUP_STORE, 'readwrite');
      const store = tx.objectStore(INDEXED_DB_BACKUP_STORE);
      store.put(entry, entry.id);
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>{
        console.warn('Echec sauvegarde backup IndexedDB', tx.error);
        resolve(false);
      };
      tx.onabort = ()=>resolve(false);
    }catch(err){
      console.warn('Ecriture backup IndexedDB impossible', err);
      resolve(false);
    }
  });
}

async function readStateFromIndexedDb(){
  const db = await getIndexedDbConnection();
  if(!db) return null;
  return new Promise((resolve)=>{
    try{
      const tx = db.transaction(INDEXED_DB_STORE, 'readonly');
      const store = tx.objectStore(INDEXED_DB_STORE);
      const req = store.get(INDEXED_DB_STATE_KEY);
      req.onsuccess = ()=>resolve(req.result || null);
      req.onerror = ()=>{
        console.warn('Lecture IndexedDB impossible', req.error);
        resolve(null);
      };
    }catch(err){
      console.warn('Transaction IndexedDB impossible', err);
      resolve(null);
    }
  });
}

function readAutoBackupsFromLocalStorage(){
  if(typeof localStorage === 'undefined') return [];
  try{
    const raw = localStorage.getItem(AUTO_BACKUP_STORAGE_KEY);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }catch(err){
    console.warn('Lecture auto backup localStorage impossible', err);
    return [];
  }
}

function writeAutoBackupsToLocalStorage(entries){
  if(typeof localStorage === 'undefined') return false;
  try{
    localStorage.setItem(
      AUTO_BACKUP_STORAGE_KEY,
      JSON.stringify(Array.isArray(entries) ? entries.slice(0, AUTO_BACKUP_RETENTION_COUNT) : [])
    );
    return true;
  }catch(err){
    console.warn('Echec auto backup localStorage (quota/accès)', err);
    return false;
  }
}

async function pruneIndexedDbAutoBackups(){
  const db = await getIndexedDbConnection();
  if(!db) return;
  await new Promise((resolve)=>{
    try{
      const tx = db.transaction(INDEXED_DB_BACKUP_STORE, 'readwrite');
      const store = tx.objectStore(INDEXED_DB_BACKUP_STORE);
      const getAllReq = store.getAll();
      getAllReq.onsuccess = ()=>{
        const entries = Array.isArray(getAllReq.result) ? getAllReq.result : [];
        const extras = entries
          .sort((a, b)=>String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')))
          .slice(AUTO_BACKUP_RETENTION_COUNT);
        extras.forEach(entry=>{
          if(entry?.id) store.delete(entry.id);
        });
      };
      getAllReq.onerror = ()=>resolve();
      tx.oncomplete = ()=>resolve();
      tx.onerror = ()=>resolve();
      tx.onabort = ()=>resolve();
    }catch(err){
      console.warn('Nettoyage auto backup IndexedDB impossible', err);
      resolve();
    }
  });
}

async function createAutoBackupSnapshot(payload, options = {}){
  const safePayload = payload && typeof payload === 'object'
    ? payload
    : buildAppStatePayload();
  const force = options.force === true;
  const signature = buildStateSignature(
    safePayload.clients,
    safePayload.salleAssignments,
    safePayload.users,
    safePayload.audienceDraft,
    safePayload.recycleBin,
    safePayload.recycleArchive
  );
  const now = Date.now();
  if(!force){
    if(signature && signature === lastAutoBackupSignature) return false;
    if(lastAutoBackupAt && (now - lastAutoBackupAt) < AUTO_BACKUP_MIN_INTERVAL_MS) return false;
  }

  const createdAt = new Date(now).toISOString();
  const entry = {
    id: `backup_${createdAt}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    source: String(options.source || 'auto'),
    payload: safePayload
  };

  await writeAutoBackupToIndexedDb(entry);
  const localEntries = readAutoBackupsFromLocalStorage();
  localEntries.unshift(entry);
  writeAutoBackupsToLocalStorage(localEntries);
  pruneIndexedDbAutoBackups().catch(()=>{});
  lastAutoBackupAt = now;
  lastAutoBackupSignature = signature;
  return true;
}

function writeStateToLocalStorage(payload){
  if(typeof localStorage === 'undefined') return false;
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  }catch(err){
    console.warn('Echec localStorage (quota/accès)', err);
    return false;
  }
}

async function openDesktopStateFile(){
  if(
    typeof window !== 'undefined'
    && window.cabinetDesktopState
    && typeof window.cabinetDesktopState.openStateFile === 'function'
  ){
    try{
      // Force-write latest in-memory state before opening the file.
      await persistDesktopStateFileNow();
      const result = await window.cabinetDesktopState.openStateFile();
      if(result?.ok) return;
      const fallbackPath = String(result?.filePath || '').trim();
      if(fallbackPath){
        alert(`Fichier appsavocat créé ici:\n${fallbackPath}\n\nImpossible de l'ouvrir automatiquement, ouvrez-le manuellement.`);
        return;
      }
      alert('Impossible d’ouvrir appsavocat.json.');
      return;
    }catch(err){
      console.warn('Ouverture appsavocat.json impossible', err);
      alert('Impossible d’ouvrir appsavocat.json.');
      return;
    }
  }
  alert('Option disponible uniquement dans la version Desktop (EXE/DMG).');
}

async function persistDesktopStateFileNow(payload = buildAppStatePayload()){
  if(!hasDesktopStateBridge()) return;
  try{
    await window.cabinetDesktopState.writeState(payload);
  }catch(err){
    console.warn('Impossible de sauvegarder appsavocat.json', err);
  }
}

function queueDesktopStateFilePersist(){
  if(!hasDesktopStateBridge()) return;
  if(desktopStatePersistTimer) clearTimeout(desktopStatePersistTimer);
  desktopStatePersistTimer = setTimeout(()=>{
    desktopStatePersistTimer = null;
    persistDesktopStateFileNow().catch(()=>{});
  }, DESKTOP_STATE_SAVE_DEBOUNCE_MS);
}

async function persistAppStateNow(){
  flushAllDossierHistoryPendingEntries();
  const payload = buildAppStatePayload();
  const nextSignature = buildStateSignature(
    payload.clients,
    payload.salleAssignments,
    payload.users,
    payload.audienceDraft,
    payload.recycleBin,
    payload.recycleArchive
  );
  lastPersistedStateSignature = nextSignature;
  await writeStateToIndexedDb(payload);
  writeStateToLocalStorage(payload);
  await createAutoBackupSnapshot(payload, { source: 'persist' });
  queueDesktopStateFilePersist();
  if(LOCAL_ONLY_MODE){
    setSyncStatus('error', 'Mode local (offline)');
    return true;
  }
  setSyncStatus('syncing');
  try{
    const res = await fetchWithTimeout(`${API_BASE}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, API_STATE_SAVE_TIMEOUT_MS);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    setSyncStatus('ok');
    return true;
  }catch(err){
    setSyncStatus('error');
    console.warn('Impossible de sauvegarder sur le serveur', err);
    return false;
  }
}

function queuePersistAppState(){
  markAudienceRowsCacheDirty();
  const payload = buildAppStatePayload();
  writeStateToLocalStorage(payload);
  writeStateToIndexedDb(payload).catch(()=>{});
  queueDesktopStateFilePersist();
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
  if(!LOCAL_ONLY_MODE){
    try{
      const res = await fetchWithTimeout(`${API_BASE}/state`, { cache: 'no-store' }, API_STATE_LOAD_TIMEOUT_MS);
      if(res.ok){
        const parsed = await res.json();
        const loadedClients = Array.isArray(parsed?.clients)
          ? parsed.clients.map(client=>normalizeClient(client, { deep: false })).filter(Boolean)
          : [];
        const loadedUsers = Array.isArray(parsed?.users)
          ? parsed.users.map(normalizeUser).filter(Boolean)
          : [];
        const loadedSalleAssignments = normalizeSalleAssignments(parsed?.salleAssignments);
        const loadedDraft = parsed?.audienceDraft && typeof parsed.audienceDraft === 'object'
          ? parsed.audienceDraft
          : {};
        const loadedRecycleBin = normalizeRecycleBinEntries(parsed?.recycleBin);
        const loadedRecycleArchive = normalizeRecycleArchiveEntries(parsed?.recycleArchive);
        const nextUsers = ensureManagerUser(loadedUsers);
        const nextSignature = buildStateSignature(
          loadedClients,
          loadedSalleAssignments,
          nextUsers,
          loadedDraft,
          loadedRecycleBin,
          loadedRecycleArchive
        );

        if(nextSignature && nextSignature === lastPersistedStateSignature){
          loaded = true;
          setSyncStatus('ok', 'Etat charge depuis serveur');
          return false;
        }

        AppState.clients = loadedClients;
        AppState.salleAssignments = loadedSalleAssignments;
        USERS = nextUsers;
        markAudienceRowsCacheDirty();
        audienceDraft = loadedDraft;
        AppState.recycleBin = loadedRecycleBin;
        AppState.recycleArchive = loadedRecycleArchive;
        lastPersistedStateSignature = buildStateSignature(
          AppState.clients,
          AppState.salleAssignments,
          USERS,
          audienceDraft,
          AppState.recycleBin,
          AppState.recycleArchive
        );
        syncCurrentUserFromUsers();
        loaded = true;
        changed = true;
        setSyncStatus('ok', 'Etat charge depuis serveur');
        const snapshot = {
          clients: AppState.clients,
          salleAssignments: AppState.salleAssignments,
          users: USERS,
          audienceDraft: audienceDraft,
          recycleBin: AppState.recycleBin,
          recycleArchive: AppState.recycleArchive
        };
        await writeStateToIndexedDb(snapshot);
        writeStateToLocalStorage(snapshot);
      }
    }catch(err){
      console.warn('Impossible de charger depuis le serveur', err);
    }
  }

  if(loaded) return changed;
  if(
    hasDesktopStateBridge()
    && typeof window.cabinetDesktopState.readState === 'function'
  ){
    try{
      const desktopResult = await window.cabinetDesktopState.readState();
        const parsed = desktopResult?.data;
        if(parsed && typeof parsed === 'object'){
          const loadedClients = Array.isArray(parsed?.clients)
          ? parsed.clients.map(client=>normalizeClient(client, { deep: false })).filter(Boolean)
          : [];
        const loadedUsers = Array.isArray(parsed?.users)
          ? parsed.users.map(normalizeUser).filter(Boolean)
          : [];
        const loadedSalleAssignments = normalizeSalleAssignments(parsed?.salleAssignments);
        const loadedDraft = parsed?.audienceDraft && typeof parsed.audienceDraft === 'object'
          ? parsed.audienceDraft
          : {};
        const loadedRecycleBin = normalizeRecycleBinEntries(parsed?.recycleBin);
        const loadedRecycleArchive = normalizeRecycleArchiveEntries(parsed?.recycleArchive);
        const nextUsers = ensureManagerUser(loadedUsers);
        const nextSignature = buildStateSignature(
          loadedClients,
          loadedSalleAssignments,
          nextUsers,
          loadedDraft,
          loadedRecycleBin,
          loadedRecycleArchive
        );
        if(nextSignature && nextSignature === lastPersistedStateSignature){
          return false;
        }

        AppState.clients = loadedClients;
        AppState.salleAssignments = loadedSalleAssignments;
        USERS = nextUsers;
        markAudienceRowsCacheDirty();
        audienceDraft = loadedDraft;
        AppState.recycleBin = loadedRecycleBin;
        AppState.recycleArchive = loadedRecycleArchive;
        lastPersistedStateSignature = buildStateSignature(
          AppState.clients,
          AppState.salleAssignments,
          USERS,
          audienceDraft,
          AppState.recycleBin,
          AppState.recycleArchive
        );
        syncCurrentUserFromUsers();
        const snapshot = buildAppStatePayload();
        await writeStateToIndexedDb(snapshot);
        writeStateToLocalStorage(snapshot);
        setSyncStatus('ok', 'Etat charge depuis appsavocat.json');
        return true;
      }
  }catch(err){
    console.warn('Impossible de charger appsavocat.json', err);
  }
  }

  const indexedState = await readStateFromIndexedDb();
  if(indexedState && typeof indexedState === 'object'){
    const loadedClients = Array.isArray(indexedState?.clients)
      ? indexedState.clients.map(client=>normalizeClient(client, { deep: false })).filter(Boolean)
      : [];
    const loadedUsers = Array.isArray(indexedState?.users)
      ? indexedState.users.map(normalizeUser).filter(Boolean)
      : [];
    const loadedSalleAssignments = normalizeSalleAssignments(indexedState?.salleAssignments);
    const loadedDraft = indexedState?.audienceDraft && typeof indexedState.audienceDraft === 'object'
      ? indexedState.audienceDraft
      : {};
    const loadedRecycleBin = normalizeRecycleBinEntries(indexedState?.recycleBin);
    const loadedRecycleArchive = normalizeRecycleArchiveEntries(indexedState?.recycleArchive);
    const nextUsers = ensureManagerUser(loadedUsers);
    const nextSignature = buildStateSignature(
      loadedClients,
      loadedSalleAssignments,
      nextUsers,
      loadedDraft,
      loadedRecycleBin,
      loadedRecycleArchive
    );
    if(nextSignature && nextSignature !== lastPersistedStateSignature){
      AppState.clients = loadedClients;
      AppState.salleAssignments = loadedSalleAssignments;
      USERS = nextUsers;
      markAudienceRowsCacheDirty();
      audienceDraft = loadedDraft;
      AppState.recycleBin = loadedRecycleBin;
      AppState.recycleArchive = loadedRecycleArchive;
      lastPersistedStateSignature = buildStateSignature(
        AppState.clients,
        AppState.salleAssignments,
        USERS,
        audienceDraft,
        AppState.recycleBin,
        AppState.recycleArchive
      );
      syncCurrentUserFromUsers();
      writeStateToLocalStorage(buildAppStatePayload());
      setSyncStatus('ok', 'Etat charge depuis IndexedDB');
      return true;
    }
  }

  if(typeof localStorage === 'undefined') return false;
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const parsed = JSON.parse(raw);
    const loadedClients = Array.isArray(parsed?.clients)
      ? parsed.clients.map(client=>normalizeClient(client, { deep: false })).filter(Boolean)
      : [];
    const loadedUsers = Array.isArray(parsed?.users)
      ? parsed.users.map(normalizeUser).filter(Boolean)
      : [];
    const loadedSalleAssignments = normalizeSalleAssignments(parsed?.salleAssignments);
    const loadedDraft = parsed?.audienceDraft && typeof parsed.audienceDraft === 'object'
      ? parsed.audienceDraft
      : {};
    const loadedRecycleBin = normalizeRecycleBinEntries(parsed?.recycleBin);
    const loadedRecycleArchive = normalizeRecycleArchiveEntries(parsed?.recycleArchive);
    const nextUsers = ensureManagerUser(loadedUsers);
    const nextSignature = buildStateSignature(
      loadedClients,
      loadedSalleAssignments,
      nextUsers,
      loadedDraft,
      loadedRecycleBin,
      loadedRecycleArchive
    );
    if(nextSignature && nextSignature === lastPersistedStateSignature){
      return false;
    }

    AppState.clients = loadedClients;
    AppState.salleAssignments = loadedSalleAssignments;
    USERS = nextUsers;
    markAudienceRowsCacheDirty();
    audienceDraft = loadedDraft;
    AppState.recycleBin = loadedRecycleBin;
    AppState.recycleArchive = loadedRecycleArchive;
    lastPersistedStateSignature = buildStateSignature(
      AppState.clients,
      AppState.salleAssignments,
      USERS,
      audienceDraft,
      AppState.recycleBin,
      AppState.recycleArchive
    );
    syncCurrentUserFromUsers();
    return true;
  }catch(err){
    console.warn('Etat local corrompu, utilisation des valeurs par défaut', err);
    return false;
  }
}

async function refreshRemoteState(){
  if(LOCAL_ONLY_MODE) return;
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
  if(LOCAL_ONLY_MODE){
    setSyncStatus('error', 'Mode local (offline)');
    return;
  }
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
  if(LOCAL_ONLY_MODE) return;
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
    boiteNo: ['boite n', 'boite no', 'boite n°', 'boîte n', 'boîte no', 'boîte n°'],
    caution: ['caution', 'nom caution', 'nom de caution'],
    marque: ['marque'],
    adresse: ['adresse'],
    ville: ['ville'],
    cautionAdresse: ['adresse de caution', 'adresse caution'],
    cautionVille: ['ville de caution', 'ville caution'],
    cautionCin: ['cin de caution', 'cni de caution', 'cin caution', 'cni caution'],
    cautionRc: ['rc', 'r.c', 'r c'],
    refAssignation: ['reference dossier assignation', 'réference dossier assignation', 'référence dossier assignation', 'ref dossier assignation'],
    refRestitution: ['reference dossier restitution', 'réference dossier restitution', 'référence dossier restitution', 'ref dossier restitution'],
    refSfdc: ['reference dossier sfdc', 'réference dossier sfdc', 'référence dossier sfdc', 'ref dossier sfdc'],
    refInjonction: ['reference dossier inj', 'réference dossier inj', 'référence dossier inj', 'ref dossier inj', 'reference dossier injonction', 'réference dossier injonction', 'référence dossier injonction', 'ref dossier injonction'],
    executionNo: ['execution n', 'execution no', 'execution n°', 'execution numero', 'num execution', 'numero execution', 'numéro execution', 'notification', 'notification n', 'notificat'],
    sort: ['sort']
  };

  const audienceHeaderKeys = {
    refClient: ['ref client', 'refclient', 'reference client', 'réference client', 'référence client'],
    debiteur: ['debiteur', 'débiteur'],
    refDossier: ['ref dossier', 'reference dossier', 'référence dossier'],
    procedure: ['procedure', 'procédure'],
    audience: ['audience'],
    juge: ['juge'],
    sort: ['sort'],
    tribunal: ['tribunal'],
    dateDepot: ['date depot', 'date depôt', 'date depot ']
  };
  const referenceHints = {};
  const registerReferenceHint = (rawRef, procName, extras = {})=>{
    const key = normalizeReferenceForAudienceLookup(rawRef);
    const proc = String(procName || '').trim();
    if(!key || !proc) return;
    const executionNo = String(extras.executionNo || '').trim();
    const sort = String(extras.sort || '').trim();
    if(!referenceHints[key]){
      referenceHints[key] = { procedure: proc };
    }
    if(!referenceHints[key].procedure) referenceHints[key].procedure = proc;
    if(executionNo && !referenceHints[key].executionNo) referenceHints[key].executionNo = executionNo;
    if(sort && !referenceHints[key].sort) referenceHints[key].sort = sort;
  };

  // Support loose mapping blocks that only contain dossier references
  // (e.g. "référence dossier assignation/restitution") used by audience import.
  for(let i=0;i<rows.length;i++){
    const map = buildHeaderMap(rows[i] || []);
    const idxAssign = getColIndex(map, dossierHeaderKeys.refAssignation);
    const idxRest = getColIndex(map, dossierHeaderKeys.refRestitution);
    const idxSfdc = getColIndex(map, dossierHeaderKeys.refSfdc);
    const idxInjonction = getColIndex(map, dossierHeaderKeys.refInjonction);
    const idxExecution = getColIndex(map, dossierHeaderKeys.executionNo);
    const idxSort = getColIndex(map, dossierHeaderKeys.sort);
    if(idxAssign === -1 && idxRest === -1 && idxSfdc === -1 && idxInjonction === -1) continue;
    for(let j=i+1; j<rows.length; j++){
      const row = rows[j] || [];
      const assignRef = idxAssign !== -1 ? String(row[idxAssign] || '').trim() : '';
      const restRef = idxRest !== -1 ? String(row[idxRest] || '').trim() : '';
      const sfdcRef = idxSfdc !== -1 ? String(row[idxSfdc] || '').trim() : '';
      const injRef = idxInjonction !== -1 ? String(row[idxInjonction] || '').trim() : '';
      const executionNo = idxExecution !== -1 ? String(row[idxExecution] || '').trim() : '';
      const sort = idxSort !== -1 ? String(row[idxSort] || '').trim() : '';
      if(!assignRef && !restRef && !sfdcRef && !injRef) break;
      if(assignRef) registerReferenceHint(assignRef, 'ASS', { executionNo, sort });
      if(restRef) registerReferenceHint(restRef, 'Restitution', { executionNo, sort });
      if(sfdcRef) registerReferenceHint(sfdcRef, 'SFDC', { executionNo, sort });
      if(injRef) registerReferenceHint(injRef, 'Injonction', { executionNo, sort });
    }
  }

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
      boiteNo: getColIndex(dossierColMap, dossierHeaderKeys.boiteNo),
      caution: getColIndex(dossierColMap, dossierHeaderKeys.caution),
      marque: getColIndex(dossierColMap, dossierHeaderKeys.marque),
      adresse: getColIndex(dossierColMap, dossierHeaderKeys.adresse),
      ville: getColIndex(dossierColMap, dossierHeaderKeys.ville),
      cautionAdresse: getColIndex(dossierColMap, dossierHeaderKeys.cautionAdresse),
      cautionVille: getColIndex(dossierColMap, dossierHeaderKeys.cautionVille),
      cautionCin: getColIndex(dossierColMap, dossierHeaderKeys.cautionCin),
      cautionRc: getColIndex(dossierColMap, dossierHeaderKeys.cautionRc),
      refAssignation: getColIndex(dossierColMap, dossierHeaderKeys.refAssignation),
      refRestitution: getColIndex(dossierColMap, dossierHeaderKeys.refRestitution),
      refSfdc: getColIndex(dossierColMap, dossierHeaderKeys.refSfdc),
      refInjonction: getColIndex(dossierColMap, dossierHeaderKeys.refInjonction),
      executionNo: getColIndex(dossierColMap, dossierHeaderKeys.executionNo),
      sort: getColIndex(dossierColMap, dossierHeaderKeys.sort)
    };

    let carriedAffectationDate = '';
    let carriedMontant = '';
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
      const refAssignation = idx.refAssignation !== -1 ? String(row[idx.refAssignation] || '').trim() : '';
      const refRestitution = idx.refRestitution !== -1 ? String(row[idx.refRestitution] || '').trim() : '';
      const refSfdc = idx.refSfdc !== -1 ? String(row[idx.refSfdc] || '').trim() : '';
      const refInjonction = idx.refInjonction !== -1 ? String(row[idx.refInjonction] || '').trim() : '';
      const immatriculation = idx.immatriculation !== -1 ? String(row[idx.immatriculation] || '').trim() : '';
      const boiteNo = idx.boiteNo !== -1 ? String(row[idx.boiteNo] || '').trim() : '';
      const caution = idx.caution !== -1 ? String(row[idx.caution] || '').trim() : '';
      const marque = idx.marque !== -1 ? String(row[idx.marque] || '').trim() : '';
      const adresse = idx.adresse !== -1 ? String(row[idx.adresse] || '').trim() : '';
      const ville = idx.ville !== -1 ? String(row[idx.ville] || '').trim() : '';
      const cautionAdresse = idx.cautionAdresse !== -1 ? String(row[idx.cautionAdresse] || '').trim() : '';
      const cautionVille = idx.cautionVille !== -1 ? String(row[idx.cautionVille] || '').trim() : '';
      const cautionCin = idx.cautionCin !== -1 ? String(row[idx.cautionCin] || '').trim() : '';
      const cautionRc = idx.cautionRc !== -1 ? String(row[idx.cautionRc] || '').trim() : '';
      const montantRaw = idx.montant !== -1 ? String(row[idx.montant] || '').trim() : '';
      const montantValues = parseExcelMontantValues(montantRaw);
      const montant = String(montantValues[0] || '').trim();
      const montantExtra = String(montantValues[1] || '').trim();
      const affectationValues = idx.affectation !== -1 ? parseExcelDateValues(row[idx.affectation]) : [];
      const dateAffectation = String(affectationValues[0] || '').trim();
      const dateAffectationExtra = String(affectationValues[1] || '').trim();
      const executionNo = idx.executionNo !== -1 ? String(row[idx.executionNo] || '').trim() : '';
      const sort = idx.sort !== -1 ? String(row[idx.sort] || '').trim() : '';
      const isEmptyDossierRow = !refClient && !debiteur && !clientName && !procedureText && !type && !montant && !dateAffectation;
      if(isEmptyDossierRow) break;
      const hasExplicitReferences = !!(refAssignation || refRestitution || refSfdc || refInjonction);
      const hasOtherDossierSignals = !!(immatriculation || boiteNo || caution || marque || adresse || ville || cautionAdresse || cautionVille || cautionCin || cautionRc);
      const isCarryDossierRow = !refClient
        && !debiteur
        && !clientName
        && !procedureText
        && !type
        && !hasExplicitReferences
        && !hasOtherDossierSignals
        && (!!dateAffectation || !!montant);
      if(isCarryDossierRow){
        if(dateAffectation) carriedAffectationDate = dateAffectation;
        if(montant) carriedMontant = montant;
        continue;
      }
      const isClientTitleRow = /^client\s*:/i.test(clientName) && !refClient && !debiteur && !procedureText && !type && !montant;
      if(isClientTitleRow) continue;

      dossiers.push({
        rowNumber: j + 1,
        clientName,
        dateAffectation,
        carriedAffectationDate,
        carriedMontant,
        dateAffectationExtra,
        type,
        procedureText,
        refClient,
        debiteur,
        montant,
        montantExtra,
        immatriculation,
        boiteNo,
        caution,
        marque,
        adresse,
        ville,
        cautionAdresse,
        cautionVille,
        cautionCin,
        cautionRc,
        refAssignation,
        refRestitution,
        refSfdc,
        refInjonction,
        executionNo,
        sort
      });
      carriedAffectationDate = '';
      carriedMontant = '';
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
      procedure: getColIndex(map, audienceHeaderKeys.procedure),
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
        procedureText: idx.procedure !== -1 ? String(row[idx.procedure] || '').trim() : '',
        audience: idx.audience !== -1 ? String(row[idx.audience] || '').trim() : '',
        juge: idx.juge !== -1 ? String(row[idx.juge] || '').trim() : '',
        sort: idx.sort !== -1 ? String(row[idx.sort] || '').trim() : '',
        tribunal: idx.tribunal !== -1 ? String(row[idx.tribunal] || '').trim() : '',
        dateDepot: idx.dateDepot !== -1 ? parseExcelDateValue(row[idx.dateDepot]) : ''
      });
    }
  }

  return { dossiers, audiences, referenceHints };
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

function resetAudienceFiltersUi(){
  filterAudienceColor = 'all';
  filterAudienceProcedure = 'all';
  filterAudienceTribunal = 'all';
  filterAudienceDate = '';
  filterAudienceErrorsOnly = false;
  setSelectedAudienceColor('all', false);
  if($('filterAudience')) $('filterAudience').value = '';
  if($('filterAudienceColor')) $('filterAudienceColor').value = 'all';
  if($('filterAudienceProcedure')) $('filterAudienceProcedure').value = 'all';
  if($('filterAudienceTribunal')) $('filterAudienceTribunal').value = 'all';
  if($('filterAudienceDate')) $('filterAudienceDate').value = '';
  const errBtn = $('audienceErrorsBtn');
  if(errBtn) errBtn.classList.remove('active');
}

async function applyExcelImport(payload, options = {}){
  const { dossiers, audiences } = payload;
  const referenceHints = payload && typeof payload.referenceHints === 'object'
    ? payload.referenceHints
    : {};
  const getReferenceHint = (refKey)=>{
    if(!refKey) return { procedure: '', executionNo: '', sort: '' };
    const raw = referenceHints[refKey];
    if(!raw) return { procedure: '', executionNo: '', sort: '' };
    if(typeof raw === 'string'){
      return { procedure: raw, executionNo: '', sort: '' };
    }
    return {
      procedure: String(raw.procedure || '').trim(),
      executionNo: String(raw.executionNo || '').trim(),
      sort: String(raw.sort || '').trim()
    };
  };
  const opts = (options && typeof options === 'object' && !Array.isArray(options)) ? options : {};
  const importDossiers = opts.importDossiers !== false;
  const importAudiences = opts.importAudiences !== false;
  const audienceOnlyMode = String(opts.audienceMode || '').trim().toLowerCase() === 'audience-only';
  const clearAudienceOnDossierOnly = opts.clearAudienceOnDossierOnly === true;
  const allowedDossierProcedureSet = opts.allowedDossierProcedureSet instanceof Set
    ? opts.allowedDossierProcedureSet
    : null;
  setSyncStatus('syncing', 'Import Excel en cours...');
  try{

  const resetAudienceDataForGlobalImport = ()=>{
    AppState.clients.forEach(client=>{
      (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach(dossier=>{
        if(!dossier || typeof dossier !== 'object') return;
        if(!dossier.procedureDetails || typeof dossier.procedureDetails !== 'object') return;
        Object.entries(dossier.procedureDetails).forEach(([procName, details])=>{
          if(!isAudienceProcedure(procName)) return;
          if(!details || typeof details !== 'object') return;
          delete details.audience;
          delete details.juge;
          delete details.sort;
          delete details.tribunal;
          delete details.depotLe;
          delete details.dateDepot;
          delete details.color;
          delete details.instruction;
          delete details._missingGlobal;
          delete details._refClientMismatch;
          delete details._refClientProvided;
          delete details._refClientExpected;
          delete details._refClientExpectedOptions;
        });
      });
    });
    audienceDraft = {};
    audiencePrintSelection = new Set();
  };

  // Keep Audience data by default so "Audience -> Global" reconciliation can match
  // orphan audience rows when global dossiers are imported later.
  // Legacy reset behavior can be forced with clearAudienceOnDossierOnly=true.
  if(importDossiers && !importAudiences && clearAudienceOnDossierOnly){
    resetAudienceDataForGlobalImport();
  }

  if(importDossiers && !dossiers.length){
    alert('Aucune ligne de dossier trouvée. Vérifiez les colonnes Excel (ex: Client/Ref client, Débiteur, Procédure/Type).');
    return;
  }
  if(!importDossiers && !audiences.length){
    alert('Aucune ligne audience trouvée. Vérifiez les colonnes Excel (ex: Réf dossier, Audience, Juge, Sort, Tribunal).');
    return;
  }

  const importIgnoredRows = [];
  const knownProcedureSet = new Set(['ASS', 'Restitution', 'Nantissement', 'SFDC', 'S/bien', 'Injonction']);
  const defaultDossierProceduresWhenMissing = ['ASS', 'Restitution', 'SFDC'];
  let importedDossiersCount = 0;
  let linkedAudiencesCount = 0;

  const clientMap = new Map();
  AppState.clients.forEach(c=>clientMap.set(String(c.name || '').trim().toLowerCase(), c));

  const refToProcMap = new Map();
  const refToStateProcMap = new Map();
  const dossierRefClientSet = new Set();
  const rowRefClientToProcMap = new Map();
  const audienceOrphanDossierMap = new Map();
  const candidateSeenByMap = new WeakMap();
  const dossierAudienceRefsCache = new WeakMap();

  const getDossierAudienceRefsCached = (dossier)=>{
    if(!dossier || typeof dossier !== 'object') return new Set();
    const cached = dossierAudienceRefsCache.get(dossier);
    if(cached) return cached;
    const refs = getDossierAudienceReferenceKeys(dossier);
    dossierAudienceRefsCache.set(dossier, refs);
    return refs;
  };

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

  const getOrCreateAudienceOrphanClient = ()=>{
    const key = AUDIENCE_ORPHAN_CLIENT_NAME.toLowerCase();
    let client = clientMap.get(key);
    if(client) return client;
    client = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      name: AUDIENCE_ORPHAN_CLIENT_NAME,
      dossiers: []
    };
    AppState.clients.push(client);
    clientMap.set(key, client);
    grantCurrentViewerAccessToClient(client.id);
    return client;
  };

  const buildAudienceOrphanDossierKey = (refKey, row)=>{
    const safeRef = String(refKey || '').trim();
    const safeRefClient = normalizeReferenceValue(String(row?.refClient || '').trim());
    const safeDebiteur = String(row?.debiteur || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    return `${safeRef}::${safeRefClient}::${safeDebiteur}`;
  };

  const getOrCreateAudienceOrphanDossier = (refKey, row, preferredProc = 'ASS')=>{
    const key = buildAudienceOrphanDossierKey(refKey, row);
    const normalizedPreferredProc = parseProcedureToken(preferredProc || '') || 'ASS';
    if(audienceOrphanDossierMap.has(key)){
      const existing = audienceOrphanDossierMap.get(key);
      if(!existing.procedureDetails[normalizedPreferredProc]){
        existing.procedureDetails[normalizedPreferredProc] = { _missingGlobal: true };
      }else{
        existing.procedureDetails[normalizedPreferredProc]._missingGlobal = true;
      }
      const nextProcedures = normalizeProcedures(existing);
      existing.procedureList = nextProcedures;
      existing.procedure = nextProcedures.join(', ');
      return existing;
    }

    const orphanClient = getOrCreateAudienceOrphanClient();
    const rowRefClient = String(row?.refClient || '').trim();
    const rowDebiteur = String(row?.debiteur || '').trim();
    const dossier = {
      debiteur: rowDebiteur || '-',
      boiteNo: '',
      referenceClient: rowRefClient || String(row?.refDossier || '').trim(),
      isAudienceOrphanImport: true,
      dateAffectation: '',
      procedure: normalizedPreferredProc,
      procedureList: [normalizedPreferredProc],
      procedureDetails: {
        [normalizedPreferredProc]: { _missingGlobal: true }
      },
      ville: '',
      adresse: '',
      montant: '',
      montantByProcedure: [],
      ww: '',
      marque: '',
      type: '',
      note: '',
      avancement: '',
      statut: 'En cours',
      files: []
    };
    orphanClient.dossiers.push(dossier);
    audienceOrphanDossierMap.set(key, dossier);
    return dossier;
  };

  const registerFallbackFromDossier = (client, dossier)=>{
    if(dossier?.isAudienceOrphanImport) return;
    const rowDebiteur = String(dossier?.debiteur || '').trim().toLowerCase();
    const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
      ? dossier.procedureDetails
      : {};
    const detailProcRefs = [];
    const refKeyToProcSet = new Map();
    const pushRefProc = (refValue, procValue)=>{
      const refKey = normalizeReferenceForAudienceLookup(refValue);
      const procKey = String(procValue || '').trim();
      if(!refKey || !procKey) return;
      if(!refKeyToProcSet.has(refKey)) refKeyToProcSet.set(refKey, new Set());
      refKeyToProcSet.get(refKey).add(procKey);
    };
    Object.entries(details).forEach(([procName, procDetails])=>{
      const proc = String(procName || '').trim() || 'ASS';
      const refs = splitReferenceValues(procDetails?.referenceClient || '');
      refs.forEach(ref=>{
        detailProcRefs.push({ ref, proc });
        pushRefProc(ref, proc);
      });
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
    const procCandidates = procList.length ? procList : [defaultProc];
    const mainRefParts = splitReferenceValues(dossier?.referenceClient || '')
      .map(v=>normalizeReferenceValue(v))
      .filter(Boolean);
    const rowRefClient = mainRefParts[0] || normalizeReferenceValue(String(dossier?.referenceClient || '').trim());

    // Dossier-level reference is ambiguous when multiple procedures exist:
    // map it to a single procedure only when there is exactly one candidate.
    if(mainRefs.length === 1 && procCandidates.length === 1){
      pushRefProc(mainRefs[0], procCandidates[0]);
    }

    allRefs.forEach(({ ref, proc })=>{
      const refKey = normalizeReferenceForAudienceLookup(ref);
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

    const refKeys = getDossierAudienceReferenceKeys(dossier);
    refKeys.forEach(refKey=>{
      const mappedProcs = refKeyToProcSet.has(refKey)
        ? [...refKeyToProcSet.get(refKey)]
        : procCandidates;
      mappedProcs.forEach(proc=>{
        pushCandidate(refToStateProcMap, refKey, {
          dossier,
          client,
          proc: String(proc || '').trim() || defaultProc,
          rowRefClient,
          rowDebiteur
        });
      });
    });
  };

  AppState.clients.forEach(client=>{
    (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach(dossier=>{
      registerFallbackFromDossier(client, dossier);
    });
  });

  const getCandidatesByRefDossier = (targetRefKey)=>refToStateProcMap.get(targetRefKey) || [];

  if(importDossiers){
    const reportDossiersProgress = makeProgressReporter('Import Excel - dossiers');
    await runChunked(dossiers, async (row)=>{
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
    grantCurrentViewerAccessToClient(client.id);

    const parsedProceduresRaw = parseProcedureList(row.procedureText);
    const parsedKnownProcedures = parsedProceduresRaw.filter(proc=>knownProcedureSet.has(proc));
    const parsedProcedures = parsedKnownProcedures.length
      ? parsedKnownProcedures
      : defaultDossierProceduresWhenMissing.slice();
    const movedToAudience = allowedDossierProcedureSet
      ? parsedProcedures.filter(proc=>!allowedDossierProcedureSet.has(proc))
      : [];
    if(movedToAudience.length){
      importIgnoredRows.push(`${rowNumberLabel}: procédures déplacées vers import Audience (${movedToAudience.join(', ')})${dossierContext}`);
    }
    const procedures = allowedDossierProcedureSet
      ? parsedProcedures.filter(proc=>allowedDossierProcedureSet.has(proc))
      : parsedProcedures;
    if(!procedures.length){
      importIgnoredRows.push(`${rowNumberLabel}: dossier ignoré (aucune procédure valide) - Ref client "${row.refClient || '-'}", Débiteur "${row.debiteur || '-'}"${dossierContext}`);
      return;
    }
    const procedureDetails = {};
    const rowMontant = String(row.montant || '').trim();
    const rowMontantExtra = String(row.montantExtra || '').trim();
    const carriedMontant = String(row.carriedMontant || '').trim();
    const rowDateAffectation = String(row.dateAffectation || '').trim();
    const rowDateAffectationExtra = String(row.dateAffectationExtra || '').trim();
    const carriedAffectationDate = String(row.carriedAffectationDate || '').trim();
    const primaryMontant = carriedMontant || rowMontant;
    const secondaryMontantCandidate = carriedMontant ? rowMontant : rowMontantExtra;
    const primaryDateCandidate = carriedAffectationDate || rowDateAffectation;
    const secondaryDateCandidate = carriedAffectationDate ? rowDateAffectation : rowDateAffectationExtra;
    const principalMontant = primaryMontant;

    const dossier = {
      debiteur: row.debiteur,
      boiteNo: row.boiteNo || '',
      referenceClient: row.refClient || row.refAssignation || row.refRestitution || row.refSfdc || row.refInjonction || '',
      dateAffectation: rowDateAffectation || '',
      procedure: procedures.join(', '),
      procedureList: procedures.slice(),
      procedureDetails,
      ville: row.ville,
      adresse: row.adresse,
      caution: row.caution || '',
      cautionAdresse: row.cautionAdresse || '',
      cautionVille: row.cautionVille || '',
      cautionCin: row.cautionCin || '',
      cautionRc: row.cautionRc || '',
      montant: principalMontant,
      montantByProcedure: [],
      ww: row.immatriculation,
      marque: row.marque,
      type: row.type,
      note: '',
      avancement: '',
      statut: 'En cours',
      files: []
    };

    const procedureSet = new Set(procedures);
    const setProcRef = (proc, ref)=>{
      const refText = String(ref || '').trim();
      const refKey = normalizeReferenceForAudienceLookup(refText);
      if(!refKey) return;
      dossierRefClientSet.add(refKey);
      const keepProcedureInDossier = !allowedDossierProcedureSet || allowedDossierProcedureSet.has(proc);
      if(keepProcedureInDossier){
        if(!dossier.procedureDetails[proc]) dossier.procedureDetails[proc] = {};
        dossier.procedureDetails[proc].referenceClient = refText;
        if(!procedureSet.has(proc)){
          procedureSet.add(proc);
        }
      }
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
    setProcRef('Injonction', row.refInjonction);
    const executionNoValue = String(row.executionNo || '').trim();
    const sortValue = String(row.sort || '').trim();
    const assignProcedureMeta = (proc, refValue)=>{
      if(!(executionNoValue || sortValue) || !String(refValue || '').trim()) return;
      if(!dossier.procedureDetails[proc]) dossier.procedureDetails[proc] = {};
      if(executionNoValue) dossier.procedureDetails[proc].executionNo = executionNoValue;
      if(sortValue) dossier.procedureDetails[proc].sort = sortValue;
    };
    assignProcedureMeta('SFDC', row.refSfdc);
    assignProcedureMeta('Injonction', row.refInjonction);
    const normalizedImportedProcs = [...procedureSet];
    // Keep Excel procedure order as the source of truth.
    // Any extra procedures discovered from references are appended after.
    const excelOrderedProcs = (parsedProcedures && parsedProcedures.length ? parsedProcedures : procedures).slice();
    const extraImportedProcs = normalizedImportedProcs.filter(proc=>!excelOrderedProcs.includes(proc));
    const orderedImportedProcs = [...excelOrderedProcs, ...extraImportedProcs];
    const normalizedPrimaryDate = normalizeDateDDMMYYYY(primaryDateCandidate) || primaryDateCandidate;
    const normalizedSecondaryDate = normalizeDateDDMMYYYY(secondaryDateCandidate) || secondaryDateCandidate;
    const hasDualDates = orderedImportedProcs.length > 1
      && !!normalizedPrimaryDate
      && !!normalizedSecondaryDate
      && normalizedPrimaryDate !== normalizedSecondaryDate;
    // Split montants only when there are truly two affectation dates.
    const hasDualMontants = hasDualDates && orderedImportedProcs.length > 1 && !!primaryMontant && !!secondaryMontantCandidate;

    const sharedReferenceCandidate = String(
      row.refAssignation
      || row.refRestitution
      || row.refSfdc
      || row.refInjonction
      || row.refClient
      || ''
    ).trim();

    orderedImportedProcs.forEach((proc, idx)=>{
      if(!dossier.procedureDetails[proc]) dossier.procedureDetails[proc] = {};
      if(sharedReferenceCandidate && !String(dossier.procedureDetails[proc].referenceClient || '').trim()){
        dossier.procedureDetails[proc].referenceClient = sharedReferenceCandidate;
      }
      let procDate = normalizedPrimaryDate || normalizedSecondaryDate;
      if(hasDualDates){
        procDate = idx === 0
          ? normalizedPrimaryDate
          : normalizedSecondaryDate;
      }
      if(procDate){
        dossier.procedureDetails[proc].dateDepot = procDate;
      }
    });

    const montantGroupSeed = [];
    const resolvedPrincipalMontant = hasDualMontants
      ? primaryMontant
      : (primaryMontant || secondaryMontantCandidate);
    if(hasDualMontants && orderedImportedProcs.length){
      const now = Date.now();
      montantGroupSeed.push({
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        montant: primaryMontant,
        procedures: [orderedImportedProcs[0]]
      });
      const secondaryProcedures = orderedImportedProcs.slice(1);
      if(secondaryProcedures.length){
        montantGroupSeed.push({
          id: `${now + 1}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: now + 1,
          montant: secondaryMontantCandidate,
          procedures: secondaryProcedures
        });
      }
    }
    dossier.montant = resolvedPrincipalMontant;
    dossier.montantByProcedure = normalizeProcedureMontantGroups(
      montantGroupSeed,
      orderedImportedProcs,
      resolvedPrincipalMontant || ''
    );
    dossier.dateAffectation = hasDualDates
      ? normalizedPrimaryDate
      : (normalizedPrimaryDate || normalizedSecondaryDate || '');
    dossier.procedureList = orderedImportedProcs;
    dossier.procedure = orderedImportedProcs.join(', ');

    client.dossiers.push(dossier);
    registerFallbackFromDossier(client, dossier);
    importedDossiersCount += 1;
    }, { chunkSize: IMPORT_EXCEL_CHUNK_SIZE, onProgress: reportDossiersProgress });
  }

  if(importAudiences){
    const reportAudiencesProgress = makeProgressReporter('Import Excel - audiences');
    await runChunked(audiences, async (row)=>{
    const rowNumberLabel = Number.isFinite(Number(row?.rowNumber)) ? `Ligne ${Number(row.rowNumber)}` : 'Ligne ?';
    const audienceBaseContext = buildIssueContext({
      source: 'Audience',
      zone: 'Import audience'
    });
    const ref = String(row.refDossier || '').trim();
    const refKey = normalizeReferenceForAudienceLookup(ref);
    const hint = getReferenceHint(refKey);
    const hintedProc = parseProcedureToken(hint.procedure || '');
    if(!refKey){
      importIgnoredRows.push(`${rowNumberLabel}: audience ignorée (ref dossier vide) - Débiteur "${row.debiteur || '-'}"${audienceBaseContext}`);
      return;
    }
    const normalizedAudienceDate = normalizeDateDDMMYYYY(row.audience || '');
    if(String(row.audience || '').trim() && !normalizedAudienceDate){
      importIgnoredRows.push(`${rowNumberLabel}: date audience invalide "${row.audience}" (format attendu jj/mm/aaaa)${audienceBaseContext}`);
    }
    const explicitProcRaw = String(row?.procedureText || '').trim();
    const explicitProc = explicitProcRaw ? parseProcedureToken(explicitProcRaw) : '';
    if(explicitProcRaw && !knownProcedureSet.has(explicitProc)){
      importIgnoredRows.push(`${rowNumberLabel}: procédure audience inconnue "${explicitProcRaw}"${audienceBaseContext}`);
      return;
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
    const byGlobalScan = getCandidatesByRefDossier(refKey);
    let candidates = [];
    const mergedCandidateSeen = new Set();
    [...candidatesByRefDossier, ...byGlobalScan].forEach(candidate=>{
      const signature = `${candidate?.client?.id || ''}::${candidate?.proc || ''}::${candidate?.rowRefClient || ''}::${candidate?.rowDebiteur || ''}`;
      if(mergedCandidateSeen.has(signature)) return;
      mergedCandidateSeen.add(signature);
      candidates.push(candidate);
    });
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
        const procFallback = explicitProc && knownProcedureSet.has(explicitProc)
          ? explicitProc
          : (hintedProc && knownProcedureSet.has(hintedProc) ? hintedProc : 'ASS');
        if(audienceOnlyMode && !isAudienceProcedure(procFallback)){
          importIgnoredRows.push(`${rowNumberLabel}: procédure "${procFallback}" ignorée (import Audience réservé aux procédures hors SFDC/S-bien/Injonction)${audienceBaseContext}`);
          return;
        }
        const orphanDossier = getOrCreateAudienceOrphanDossier(refKey, row, procFallback);
        candidates = [{
          dossier: orphanDossier,
          client: getOrCreateAudienceOrphanClient(),
          proc: procFallback,
          rowRefClient: normalizeReferenceValue(String(row?.refClient || '').trim()),
          rowDebiteur: String(row?.debiteur || '').trim().toLowerCase()
        }];
        importIgnoredRows.push(`${rowNumberLabel}: ${ref || '-'} introuvable dans dossier global (ajouté à Audience, ligne marquée en rouge)${missingRefContext}`);
      }else{
        candidates = fallback;
      }
      // Fallback by ref client is a successful link path, not an import error.
    }
    const rowDebiteur = String(row.debiteur || '').trim().toLowerCase();
    let match = null;
    const candidatePool = hintedProc
      ? candidates.filter(c=>String(c?.proc || '').trim() === hintedProc)
      : candidates;
    const activeCandidatesRaw = candidatePool.length ? candidatePool : candidates;
    const nonOrphanCandidates = activeCandidatesRaw.filter(c=>!c?.dossier?.isAudienceOrphanImport);
    const activeCandidates = nonOrphanCandidates.length ? nonOrphanCandidates : activeCandidatesRaw;
    if(activeCandidates.length){
      let bestCandidate = null;
      let bestScore = -1;
      activeCandidates.forEach(candidate=>{
        let score = 0;
        if(rowRefClientKeySet.size && rowRefClientKeySet.has(candidate.rowRefClient)) score += 220;
        if(rowDebiteur && candidate.rowDebiteur === rowDebiteur) score += 140;
        const candidateRefs = getDossierAudienceRefsCached(candidate?.dossier || null);
        if(candidateRefs.has(refKey)) score += 90;
        if(rowRefClientKeySet.size && [...rowRefClientKeySet].some(key=>candidateRefs.has(key))) score += 80;
        if(score > bestScore){
          bestScore = score;
          bestCandidate = candidate;
        }
      });
      match = bestCandidate || activeCandidates[0];
    }
    if(!match) return;
    const { dossier, proc } = match;
    let refClientMismatch = null;
    if(rowRefClientKeySet.size){
      const matchedDossierRefKeys = getDossierAudienceRefsCached(dossier);
      const hasSameRefClient = [...rowRefClientKeySet].some(key=>matchedDossierRefKeys.has(key));
      const hasKnownRefClientElsewhere = [...rowRefClientKeySet].some(key=>dossierRefClientSet.has(key));
      // Only flag ref client mismatch when the provided ref client is unknown globally.
      // If it exists elsewhere in global dossiers, keep the row linked by ref dossier priority.
      if(!hasSameRefClient && !hasKnownRefClientElsewhere){
        const givenRefClient = [...rowRefClientKeySet].join('/') || '-';
        const expectedRefClient = [...matchedDossierRefKeys].join('/') || '-';
        refClientMismatch = {
          provided: givenRefClient,
          expected: expectedRefClient
        };
        importIgnoredRows.push(
          `${rowNumberLabel}: incohérence ref client pour Réf dossier "${ref || '-'}" et Débiteur "${row.debiteur || '-'}" (fourni: "${givenRefClient}" | dossier global: "${expectedRefClient}")${missingRefContext}`
        );
      }
    }
    let targetProc = explicitProc && knownProcedureSet.has(explicitProc)
      ? explicitProc
      : (hintedProc && knownProcedureSet.has(hintedProc) ? hintedProc : proc);
    if(!targetProc) targetProc = 'ASS';
    if(audienceOnlyMode && !isAudienceProcedure(targetProc)){
      if(explicitProc && !isAudienceProcedure(explicitProc)){
        importIgnoredRows.push(`${rowNumberLabel}: procédure "${explicitProc}" ignorée (import Audience réservé aux procédures hors SFDC/S-bien/Injonction)${audienceBaseContext}`);
        return;
      }
      targetProc = 'ASS';
    }
    if(!dossier.procedureDetails) dossier.procedureDetails = {};
    if(!dossier.procedureDetails[targetProc]) dossier.procedureDetails[targetProc] = {};
    const p = dossier.procedureDetails[targetProc];
    if(refClientMismatch){
      p._refClientMismatch = true;
      p._refClientProvided = refClientMismatch.provided;
      p._refClientExpected = refClientMismatch.expected;
    }else{
      delete p._refClientMismatch;
      delete p._refClientProvided;
      delete p._refClientExpected;
    }
    if(!!dossier?.isAudienceOrphanImport){
      p._missingGlobal = true;
    }
    if(ref){
      p.referenceClient = ref;
      dossierAudienceRefsCache.delete(dossier);
    }
    if(row.audience) p.audience = row.audience;
    if(row.juge) p.juge = row.juge;
    if(row.sort) p.sort = row.sort;
    if(row.tribunal) p.tribunal = row.tribunal;
    // In audience import files, "date depot" corresponds to procedure "Dépôt le".
    if(row.dateDepot) p.depotLe = row.dateDepot;
    if(!p.executionNo && hint.executionNo) p.executionNo = hint.executionNo;
    if(!p.sort && hint.sort) p.sort = hint.sort;
    const normalizedProcedures = normalizeProcedures(dossier);
    dossier.procedureList = normalizedProcedures;
    dossier.procedure = normalizedProcedures.join(', ');
    linkedAudiencesCount += 1;
    }, { chunkSize: IMPORT_EXCEL_CHUNK_SIZE, onProgress: reportAudiencesProgress });
  }

  let reconciledOrphans = 0;
  if(importDossiers){
    const reconciliation = reconcileAudienceOrphanDossiers();
    reconciledOrphans = reconciliation.matchedDossiers;
    if(reconciledOrphans > 0){
      importIgnoredRows.push(`Rapprochement automatique: ${reconciledOrphans} dossier(s) audience hors global fusionné(s).`);
    }
  }

  markAudienceRowsCacheDirty();
  await persistAppStateNow();
  renderClients();
  renderDashboard();
  updateClientDropdown();
  renderSuivi();
  renderAudience();
  renderDiligence();
  renderEquipe();
  const issuesText = buildExcelImportIssueMessage(importIgnoredRows);
  const summaryLines = [
    `Import terminé.`,
    `Dossiers détectés: ${dossiers.length}`,
    `Dossiers importés: ${importedDossiersCount}`,
    `Audience hors global rapprochée: ${reconciledOrphans}`,
    `Audiences détectées: ${audiences.length}`,
    `Audiences liées: ${linkedAudiencesCount}`,
    `Erreurs ignorées (non bloquantes): ${importIgnoredRows.length}`
  ];
  if(!importDossiers && importAudiences){
    summaryLines.push('Mode Audience: création de nouveaux dossiers globaux désactivée.');
  }
  const summary = summaryLines.join('\n');
  closeImportProgressModal(true);
  showExcelImportResult(summary, issuesText);
  }finally{
    // Keep current sync status (persist call already set the right state).
  }
}

async function handleExcelImportFile(file, options = {}){
  if(importInProgress) return;
  if(!file) return;
  const excelReady = await ensureExcelLibraries({ needXlsx: true, needExcelJs: false });
  if(!excelReady){
    return;
  }
  importInProgress = true;
  try{
    openImportProgressModal('Import Excel');
    updateImportProgress('Lecture du fichier...', 0, 1);
    setSyncStatus('syncing', 'Import Excel: lecture du fichier...');
    const buffer = await file.arrayBuffer();
    updateImportProgress('Analyse de la feuille...', 1, 3);
    setSyncStatus('syncing', 'Import Excel: analyse de la feuille...');
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if(!sheetName){
      throw new Error('Le fichier Excel ne contient aucune feuille.');
    }
    const sheet = workbook.Sheets[sheetName];
    if(!sheet){
      throw new Error('Impossible de lire la première feuille du fichier.');
    }
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
      dateNF: 'dd/mm/yyyy'
    });
    if(!Array.isArray(rows)){
      throw new Error('Format de feuille non reconnu.');
    }
    const parsed = parseExcelData(rows);
    updateImportProgress('Fusion des données...', 2, 3);
    setSyncStatus('syncing', 'Import Excel: fusion des données...');
    await applyExcelImport(parsed, options);
  }catch(err){
    console.error(err);
    const details = String(err?.message || '').trim();
    const extra = details ? `\nDétail: ${details}` : '';
    alert(`Erreur import Excel. Vérifiez le format (xlsx/xls) et les en-têtes.${extra}`);
  }finally{
    closeImportProgressModal(false);
    importInProgress = false;
  }
}

async function handleAudienceImportFile(file){
  await handleExcelImportFile(file, {
    importDossiers: false,
    importAudiences: true,
    audienceMode: 'audience-only'
  });
  resetAudienceFiltersUi();
  showView('audience');
  renderAudience();
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
  setSyncStatus(LOCAL_ONLY_MODE ? 'error' : 'syncing', LOCAL_ONLY_MODE ? 'Mode local (offline)' : undefined);
  renderSyncMetrics();
  if(!LOCAL_ONLY_MODE){
    await resolveApiBase();
  }
  await loadPersistedState();
  await persistDesktopStateFileNow();
  hasLoadedState = true;
  setupEvents();
  restoreSidebarState();
  renderProcedureMontantGroups();
  markDeferredRenderDirty(
    'dashboard',
    'clients',
    'creation',
    'suivi',
    'audience',
    'diligence',
    'salle',
    'equipe',
    'recycle',
    'clientDropdown'
  );
  warmupExcelLibrariesOnIdle();
  startRemoteSync();
  showView('dashboard');
  scheduleBackgroundDataWarmup(1800);
}

// ================== EVENTS ==================
function setupEvents(){
  $('sidebarToggleBtn')?.addEventListener('click', toggleSidebar);
  $('openDesktopStateFileBtn')?.addEventListener('click', ()=>{
    openDesktopStateFile().catch(()=>{});
  });
  $('importAppsavocatBtn')?.addEventListener('click', ()=>{
    if(!canEditData()) return alert('Accès refusé');
    $('importAppsavocatInput')?.click();
  });
  $('importAppsavocatInput')?.addEventListener('change', (e)=>{
    const file = e.target?.files?.[0];
    if(!file) return;
    handleAppsavocatImportFile(file).catch(err=>console.error(err));
    e.target.value = '';
  });
  $('dashboardLink').onclick = ()=>showView('dashboard');
  $('clientsLink').onclick = ()=>showView('clients');
  $('creationLink').onclick = ()=>showView('creation');
  $('suiviLink').onclick = ()=>showView('suivi');
  $('audienceLink').onclick = ()=>showView('audience');
  $('diligenceLink').onclick = ()=>showView('diligence');
  $('salleLink').onclick = ()=>showView('salle');
  $('equipeLink')?.addEventListener('click', ()=>showView('equipe'));
  $('recycleLink')?.addEventListener('click', ()=>showView('recycle'));

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
  $('deleteAllClientsBtn')?.addEventListener('click', deleteAllClients);
  $('importExcelBtn')?.addEventListener('click', ()=> $('importExcelInput')?.click());
  $('exportBackupExcelBtn')?.addEventListener('click', ()=>{
    if(!canEditData()) return alert('Accès refusé');
    exportBackupExcelImportable().catch(err=>console.error(err));
  });
  $('importExcelInput')?.addEventListener('change', (e)=>{
    if(!canEditData()) return alert('Accès refusé');
    const file = e.target?.files?.[0];
    if(!file) return;
    handleExcelImportFile(file, {
      importDossiers: true,
      importAudiences: false
    }).catch(err=>console.error(err));
    e.target.value = '';
  });
  $('importAudienceExcelBtn')?.addEventListener('click', ()=> $('importAudienceExcelInput')?.click());
  $('importAudienceExcelInput')?.addEventListener('change', (e)=>{
    if(!canEditData()) return alert('Accès refusé');
    const file = e.target?.files?.[0];
    if(!file) return;
    handleAudienceImportFile(file).catch(err=>console.error(err));
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
  $('audienceTableContainer')?.addEventListener('scroll', queueAudienceVirtualRender, { passive: true });
  $('suiviTableContainer')?.addEventListener('scroll', queueSuiviVirtualRender, { passive: true });
  $('diligenceTableContainer')?.addEventListener('scroll', queueDiligenceVirtualRender, { passive: true });

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
  $('selectAllDiligenceBtn')?.addEventListener('click', ()=>setAllVisibleDiligenceRowsForPrint(true));
  $('clearAllDiligenceBtn')?.addEventListener('click', ()=>setAllVisibleDiligenceRowsForPrint(false));
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
  $('restoreAllRecycleBtn')?.addEventListener('click', restoreAllRecycleItems);
  $('clearRecycleBinBtn')?.addEventListener('click', clearRecycleBinToBackup);
  $('recycleBody')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action="restore"]');
    if(!btn) return;
    const idx = Number(btn.dataset.index);
    if(!Number.isFinite(idx)) return;
    restoreRecycleItem(idx);
  });
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
  $('filterAudienceDate')?.addEventListener('change', (e)=>{
    filterAudienceDate = String(e.target?.value || '').trim();
    renderAudience();
  });

  $('saveAudienceBtn')?.addEventListener('click', saveAllAudience);
  $('printAudienceBtn')?.addEventListener('click', ()=>{
    // Manual mode only: do not auto-check all rows.
    renderAudience();
  });
  $('selectAllPrintAudienceBtn')?.addEventListener('click', ()=>setAllVisibleAudienceRowsForPrint(true));
  $('clearAllPrintAudienceBtn')?.addEventListener('click', ()=>setAllVisibleAudienceRowsForPrint(false));
  $('exportAudienceBtn')?.addEventListener('click', exportAudienceRegularXLS);
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
  audienceColorButtons = Array.from(document.querySelectorAll('.color-btn[data-color]'));
  audienceColorButtons.forEach(btn=>{
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
  const buttons = audienceColorButtons.length ? audienceColorButtons : Array.from(document.querySelectorAll('.color-btn[data-color]'));
  buttons.forEach(b=>b.classList.remove('active'));
  const btn = buttons.find(b=>b.dataset.color === color) || null;
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
  setVisible('recycleSection', v==='recycle');

  document.querySelectorAll('.nav-link').forEach(n=>n.classList.remove('active'));
  const target = $(v+'Link');
  if(target) target.classList.add('active');
  if(v === 'dashboard') renderDashboard({ force: true });
  if(v === 'clients') renderClients({ force: true });
  if(v === 'creation') updateClientDropdown({ force: true });
  if(v === 'suivi') renderSuivi({ force: true });
  if(v === 'audience') renderAudience({ force: true });
  if(v === 'diligence') renderDiligence({ force: true });
  if(v === 'salle') renderSalle({ force: true });
  if(v === 'equipe') renderEquipe({ force: true });
  if(v === 'recycle') renderRecycleBin({ force: true });
  if(v === 'dashboard') scheduleBackgroundDataWarmup(1800);
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
  visibleClientsCache = null;
  visibleClientsCacheVersion = -1;
  visibleClientsCacheUserKey = '';
  editableClientsCache = null;
  editableClientsCacheVersion = -1;
  editableClientsCacheUserKey = '';
  clientListSummaryCache = null;
  clientListSummaryCacheVersion = -1;
  clientListSummaryCacheUserKey = '';
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
      'equipeSection',
      'recycleSection'
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
  markDeferredRenderDirty(
    'dashboard',
    'clients',
    'creation',
    'suivi',
    'audience',
    'diligence',
    'salle',
    'equipe',
    'recycle',
    'clientDropdown'
  );
  safeRun('applyRoleUI', applyRoleUI);
  safeRun('showView(dashboard)', ()=>showView('dashboard'));
  safeRun('renderSidebarSalleSessions', renderSidebarSalleSessions);
  scheduleBackgroundDataWarmup(1800);

  const hasVisibleSection = [
    'dashboardSection',
    'clientSection',
    'creationSection',
    'suiviSection',
    'audienceSection',
    'diligenceSection',
    'salleSection',
    'equipeSection',
    'recycleSection'
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
  visibleClientsCache = null;
  visibleClientsCacheVersion = -1;
  visibleClientsCacheUserKey = '';
  editableClientsCache = null;
  editableClientsCacheVersion = -1;
  editableClientsCacheUserKey = '';
  clientListSummaryCache = null;
  clientListSummaryCacheVersion = -1;
  clientListSummaryCacheUserKey = '';
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
  if($('recycleLink')) $('recycleLink').style.display = manager ? '' : 'none';
  if($('addClientBtn')) $('addClientBtn').style.display = canCreateClient ? '' : 'none';
  if($('deleteAllClientsBtn')) $('deleteAllClientsBtn').style.display = canDeleteData() ? '' : 'none';
  if($('totalClientsCard')) $('totalClientsCard').style.display = viewer ? 'none' : '';

  const audienceEditable = canEditData();
  document.querySelectorAll('.color-btn').forEach(btn=> btn.disabled = !audienceEditable);
  if($('saveAudienceBtn')) $('saveAudienceBtn').style.display = audienceEditable ? '' : 'none';

  if(!manager){
    if($('recycleSection')?.style.display !== 'none') showView('dashboard');
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

function updateClientDropdown(options = {}){
  if(!shouldRenderClientDropdown(options)) return;
  const selectClient = $('selectClient');
  if(!selectClient) return;
  const optionsHtml = getEditableClients()
    .map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join('');
  selectClient.innerHTML = `<option value="">Client</option>${optionsHtml}`;
}

function renderClients(options = {}){
  if(!shouldRenderDeferredSection('clients', options)) return;
  const q = $('searchClientInput')?.value?.toLowerCase() || '';
  const clientsBody = $('clientsBody');
  if(!clientsBody) return;
  const allVisibleClients = getClientListSummaries();
  const canDelete = canDeleteData();
  syncPaginationFilterState('clients', `${q}||${allVisibleClients.length}`);

  const renderRows = (rows)=>{
    const pageData = paginateRows(rows, 'clients');
    if(!pageData.rows.length){
      clientsBody.innerHTML = '<tr><td colspan="3" class="diligence-empty">Aucun client trouvé.</td></tr>';
      renderPagination('clients', { totalRows: 0, page: 1, totalPages: 1, from: 0, to: 0 });
      return;
    }
    const rowsHtml = pageData.rows.map(item=>{
      const c = item.client;
      const canEdit = item.canEdit;
      return `
        <tr>
          <td data-label="Client">${escapeHtml(item.name)}</td>
          <td data-label="Nb Dossiers">${item.dossierCount}</td>
          <td data-label="Actions" class="client-actions-cell">
            <button class="btn-primary" onclick="goToCreation(${item.id})" ${canEdit ? '' : 'disabled'}>
              <i class="fa-solid fa-folder-plus"></i>
            </button>
            <button class="btn-danger" onclick="deleteClient(${item.id})" ${canDelete ? '' : 'disabled'}>
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    clientsBody.innerHTML = rowsHtml;
    renderPagination('clients', pageData);
  };

  const canUseWorker = !!getClientFilterWorker() && allVisibleClients.length >= 200;
  if(!q){
    renderRows(allVisibleClients);
    return;
  }
  if(!canUseWorker){
    renderRows(allVisibleClients.filter(item=>item.nameLower.includes(q)));
    return;
  }

  const requestId = ++clientFilterRequestSeq;
  clientsBody.innerHTML = '<tr><td colspan="3" class="diligence-empty">Filtrage des clients...</td></tr>';
  const workerInput = allVisibleClients.map((item, idx)=>({
    idx,
    name: item.name
  }));

  runClientFilterInWorker(workerInput, q, requestId)
    .then((filteredIndexes)=>{
      if(requestId !== clientFilterRequestSeq) return;
      if(!Array.isArray(filteredIndexes)){
        renderRows(allVisibleClients.filter(item=>item.nameLower.includes(q)));
        return;
      }
      renderRows(filteredIndexes.map(idx=>allVisibleClients[idx]).filter(Boolean));
    })
    .catch(()=>{
      if(requestId !== clientFilterRequestSeq) return;
      renderRows(allVisibleClients.filter(item=>item.nameLower.includes(q)));
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

  pushRecycleBinEntry('client_delete', {
    client: JSON.parse(JSON.stringify(client || {}))
  });
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
  renderRecycleBin();
}

function deleteAllClients(){
  if(!canDeleteData()) return alert('Seul le gestionnaire peut supprimer tous les clients');
  const totalClients = AppState.clients.length;
  if(!totalClients) return alert('Aucun client à supprimer');
  const totalDossiers = AppState.clients.reduce((sum, client)=>{
    const count = Array.isArray(client?.dossiers) ? client.dossiers.length : 0;
    return sum + count;
  }, 0);
  const warning =
    `Supprimer TOUS les clients (${totalClients}) et TOUS les dossiers (${totalDossiers}) ?\n\n`
    + 'Cette action est irréversible.';
  if(!window.confirm(warning)) return;

  pushRecycleBinEntry('all_clients_delete', {
    clients: JSON.parse(JSON.stringify(AppState.clients || [])),
    usersBeforeDelete: JSON.parse(JSON.stringify(USERS || []))
  });
  AppState.clients = [];
  audienceDraft = {};
  audiencePrintSelection = new Set();
  diligencePrintSelection = new Set();
  USERS = ensureManagerUser(
    USERS.map(user=>({
      ...user,
      clientIds: []
    }))
  );

  queuePersistAppState();
  renderClients();
  updateClientDropdown();
  renderDashboard();
  renderSuivi();
  renderAudience();
  renderDiligence();
  renderEquipe();
  renderSalle();
  renderRecycleBin();
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
    const montantFallbackRaw = montantInputValue || montantGroups.map(g=>String(g.montant || '').trim()).filter(Boolean).join(' | ');
    const montantFallback = getLowerMontantValue(montantFallbackRaw);

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
      cautionRc: $('cautionRcInput')?.value.trim() || '',
      note: $('noteInput')?.value.trim() || '',
      avancement: $('avancementInput')?.value.trim() || '',
      statut: $('statutInput')?.value || 'En cours',
      files: await serializeUploadedFiles(uploadedFiles)
    };
    dossier.history = [];
    console.log('[ADD DOSSIER]', JSON.stringify(dossier, null, 2));

    if(editingDossier){
      const prevClient = AppState.clients.find(c=>c.id == editingDossier.clientId);
      const previousDossier = prevClient?.dossiers?.[editingDossier.index];
      dossier.history = normalizeDossierHistoryEntries(previousDossier?.history);
      collectDossierDiffEntries(previousDossier, dossier).forEach(entry=>{
        queueDossierHistoryEntry(dossier, entry, { immediate: true });
      });
      if(prevClient && prevClient.id === client.id){
        prevClient.dossiers[editingDossier.index] = dossier;
      }else{
        if(prevClient) prevClient.dossiers.splice(editingDossier.index, 1);
        client.dossiers.push(dossier);
      }
    }else{
      dossier.history = [];
      client.dossiers.push(dossier);
    }
    reconcileAudienceOrphanDossiers();
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
function renderSuivi(options = {}){
  if(!shouldRenderDeferredSection('suivi', options)) return;
  const q = $('filterGlobal')?.value?.toLowerCase() || '';
  const suiviFilterKey = [q, filterSuiviProcedure, filterSuiviTribunal].join('||');
  syncPaginationFilterState('suivi', suiviFilterKey);
  const suiviBody = $('suiviBody');
  if(!suiviBody) return;
  suiviBody.innerHTML='';
  if(!isManager() && getVisibleClients().length === 0){
    suiviVirtualRows = [];
    suiviVirtualLastRange = { start: -1, end: -1 };
    suiviBody.innerHTML = '<tr><td colspan="9" class="diligence-empty">Aucun client assigné à ce compte. Contactez le gestionnaire.</td></tr>';
    renderPagination('suivi', { totalRows: 0, page: 1, totalPages: 1, from: 0, to: 0 });
    return;
  }
  const base = getSuiviBaseRowsCached();
  suiviTribunalAliasMap = base.tribunalState.aliasMap;
  const noProcedureFilter = filterSuiviProcedure === 'all';
  const noTribunalFilter = filterSuiviTribunal === 'all';
  const noSearchFilter = !q;
  let sortedRows = [];
  if(base === suiviFilteredRowsCacheSource && suiviFilterKey === suiviFilteredRowsCacheKey){
    sortedRows = suiviFilteredRowsCacheOutput;
  }else if(noProcedureFilter && noTribunalFilter && noSearchFilter){
    sortedRows = base.sortedDefaultRows;
    suiviFilteredRowsCacheSource = base;
    suiviFilteredRowsCacheKey = suiviFilterKey;
    suiviFilteredRowsCacheOutput = sortedRows;
  }else{
    const filteredRows = [];
    base.rawRows.forEach(row=>{
      const tribunalKeys = row.tribunalKeys || [];
      if(!noProcedureFilter && !row.procSet.has(filterSuiviProcedure)) return;
      if(!noTribunalFilter && !tribunalKeys.includes(filterSuiviTribunal)) return;
      if(!noSearchFilter){
        const haystack = row.__suiviHaystack
          || (row.__suiviHaystack = buildSuiviSearchHaystack(
            row.c.name,
            row.d,
            row.procSource,
            (row.tribunalList && row.tribunalList.length) ? row.tribunalList : row.tribunalLabels
          ));
        if(!haystack.includes(q)) return;
      }
      filteredRows.push(row);
    });

    const duplicatePairCounts = new Map();
    filteredRows.forEach(row=>{
      const key = buildSuiviRefDebiteurKey(row);
      if(!key) return;
      duplicatePairCounts.set(key, (duplicatePairCounts.get(key) || 0) + 1);
    });
    sortedRows = filteredRows
      .slice()
      .sort((a, b)=>compareSuiviRowsByReferenceProximity(a, b, duplicatePairCounts));
    suiviFilteredRowsCacheSource = base;
    suiviFilteredRowsCacheKey = suiviFilterKey;
    suiviFilteredRowsCacheOutput = sortedRows;
  }
  const pageData = paginateRows(sortedRows, 'suivi');
  const useVirtual = pageData.rows.length >= SUIVI_VIRTUAL_MIN_ROWS;
  suiviVirtualRows = pageData.rows;
  suiviVirtualLastRange = { start: -1, end: -1 };
  if(!pageData.rows.length){
    suiviBody.innerHTML = '<tr><td colspan="9" class="diligence-empty">Aucun dossier trouvé avec ces filtres.</td></tr>';
  }else if(useVirtual){
    renderSuiviVirtualWindow(true);
  }else{
    suiviBody.innerHTML = pageData.rows.map(renderSuiviRowHtml).join('');
  }
  renderPagination('suivi', pageData);

  syncSuiviFilterOptions(base.rowsMeta);
}

function getSuiviBaseRowsCached(){
  const viewerKey = getAudienceViewerCacheKey();
  if(
    suiviBaseRowsCache
    && suiviBaseRowsCacheVersion === audienceRowsRawDataVersion
    && suiviBaseRowsCacheViewerKey === viewerKey
  ){
    return suiviBaseRowsCache;
  }

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
        tribunalLabels: [...new Set(tribunalLabels)],
        tribunalKeys: [],
        tribunalList: []
      });
    });
  });

  const tribunalState = buildTribunalClusterStateFromLabels(rawRows.flatMap(row=>row.tribunalLabels || []));
  const tribunalLabelByKey = new Map(tribunalState.options.map(v=>[v.key, v.label]));
  const rowsMeta = [];
  rawRows.forEach(row=>{
    const tribunalKeys = [...new Set((row.tribunalLabels || [])
      .map(label=>resolveSuiviTribunalFilterKey(label))
      .filter(Boolean))];
    const tribunalList = tribunalKeys
      .map(key=>tribunalLabelByKey.get(key) || '')
      .filter(Boolean);
    row.tribunalKeys = tribunalKeys;
    row.tribunalList = tribunalList;
    rowsMeta.push({ procSet: row.procSet, tribunalList, tribunalKeys });
  });

  let sortedDefaultRows = rawRows;
  if(rawRows.length <= SUIVI_DEFAULT_SORT_MAX_ROWS){
    const duplicatePairCounts = new Map();
    rawRows.forEach(row=>{
      const key = buildSuiviRefDebiteurKey(row);
      if(!key) return;
      duplicatePairCounts.set(key, (duplicatePairCounts.get(key) || 0) + 1);
    });
    sortedDefaultRows = rawRows
      .slice()
      .sort((a, b)=>compareSuiviRowsByReferenceProximity(a, b, duplicatePairCounts));
  }

  suiviBaseRowsCache = { rawRows, rowsMeta, tribunalState, sortedDefaultRows };
  suiviBaseRowsCacheVersion = audienceRowsRawDataVersion;
  suiviBaseRowsCacheViewerKey = viewerKey;
  return suiviBaseRowsCache;
}

function parseSuiviReferenceParts(value){
  const ref = normalizeReferenceForAudienceLookup(value);
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

function buildSuiviRefDebiteurKey(row){
  const ref = normalizeReferenceValue(String(row?.d?.referenceClient || '').trim());
  const debiteur = String(row?.d?.debiteur || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if(!ref || !debiteur) return '';
  return `${ref}__${debiteur}`;
}

function compareSuiviRowsByReferenceProximity(a, b, pairCounts = null){
  if(pairCounts){
    const pairKeyA = buildSuiviRefDebiteurKey(a);
    const pairKeyB = buildSuiviRefDebiteurKey(b);
    const pairCountA = pairKeyA ? (pairCounts.get(pairKeyA) || 0) : 0;
    const pairCountB = pairKeyB ? (pairCounts.get(pairKeyB) || 0) : 0;
    const isGroupedA = pairCountA >= 2 ? 1 : 0;
    const isGroupedB = pairCountB >= 2 ? 1 : 0;
    if(isGroupedA !== isGroupedB) return isGroupedB - isGroupedA;
    if(isGroupedA && isGroupedB && pairKeyA !== pairKeyB){
      if(pairCountA !== pairCountB) return pairCountB - pairCountA;
      const byPair = pairKeyA.localeCompare(pairKeyB, 'fr', { numeric: true, sensitivity: 'base' });
      if(byPair !== 0) return byPair;
    }
  }

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
  if(rowsMeta === suiviFilterOptionsRowsMetaRef){
    procedureSelect.value = filterSuiviProcedure;
    tribunalSelect.value = filterSuiviTribunal;
    return;
  }

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
  suiviFilterOptionsRowsMetaRef = rowsMeta;
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
    dossier?.cautionRc || '',
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
    dossier?.cautionRc || '',
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

function computeAudienceRowContentScore(row){
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
  $('dateAffectation').value = normalizeDateDDMMYYYY(d.dateAffectation || '') || '';
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
  if($('cautionRcInput')) $('cautionRcInput').value = d.cautionRc || '';
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
  if(!hasMultipleAffectationDatesForSelection(procs)){
    const now = Date.now();
    const mainMontantValue = String(d.montant || '').trim()
      || String(procedureMontantGroups[0]?.montant || '').trim()
      || '';
    procedureMontantGroups = [{
      id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      montant: mainMontantValue,
      procedures: procs
    }];
  }
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
  pushRecycleBinEntry('dossier_delete', {
    clientId: client.id,
    clientName: client.name || '',
    dossierIndex: index,
    dossier: JSON.parse(JSON.stringify(dossier || {}))
  });
  client.dossiers.splice(index, 1);
  queuePersistAppState();
  closeDossierModal();
  renderClients();
  renderDashboard();
  renderSuivi();
  renderAudience();
  renderDiligence();
  renderRecycleBin();
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
  flushAllDossierHistoryPendingEntries();
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
    ['RC', dossier.cautionRc || '-'],
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
  const historyEntries = normalizeDossierHistoryEntries(dossier.history);
  const historyHtml = historyEntries.length
    ? [...historyEntries].reverse().map(entry=>`
      <div class="details-history-item">
        <div class="details-history-meta">
          <span>${escapeHtml(formatHistoryDateTime(entry.at))}</span>
          <span>${escapeHtml(getHistorySourceLabel(entry.source))}</span>
          <span>Par: ${escapeHtml(entry.by || '-')} (${escapeHtml(getRoleLabel(entry.byRole))})</span>
          ${entry.procedure ? `<span>Procédure: ${escapeHtml(entry.procedure)}</span>` : ''}
        </div>
        <div class="details-history-change">
          <strong>${escapeHtml(getHistoryFieldLabel(entry.field))}</strong>
          <span class="details-history-before">Avant: ${escapeHtml(entry.before || '-')}</span>
          <span class="details-history-after">Après: ${escapeHtml(entry.after || '-')}</span>
        </div>
      </div>
    `).join('')
    : '<div class="details-empty">Aucune modification enregistrée.</div>';

  body.innerHTML = `
    <div class="details-grid">
      ${detailsHtml}
    </div>
    <div class="details-files">
      <h3><i class="fa-solid fa-paperclip"></i> Documents</h3>
      ${filesHtml}
    </div>
    <div class="details-history">
      <h3><i class="fa-solid fa-clock-rotate-left"></i> Historique des modifications</h3>
      ${historyHtml}
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
    `RC: ${dossier.cautionRc || '-'}`,
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
function makeDiligencePrintKey(clientId, dossierIndex, procedure){
  return `${clientId}::${dossierIndex}::${encodeURIComponent(String(procedure || ''))}`;
}

function isDiligenceSelectedForPrint(row){
  const key = makeDiligencePrintKey(row?.clientId, row?.dossierIndex, row?.procedure);
  return diligencePrintSelection.has(key);
}

function updateDiligenceCheckedCount(){
  const node = $('diligenceCheckedCount');
  if(!node) return;
  node.innerText = `Cochés: ${diligencePrintSelection.size}`;
}

function toggleDiligencePrintSelection(clientId, dossierIndex, procedure, checked){
  const key = makeDiligencePrintKey(clientId, dossierIndex, procedure);
  if(checked){
    diligencePrintSelection.add(key);
  }else{
    diligencePrintSelection.delete(key);
  }
  updateDiligenceCheckedCount();
}

function toggleDiligencePrintSelectionEncoded(clientId, dossierIndex, procedureEncoded, checked){
  toggleDiligencePrintSelection(clientId, dossierIndex, decodeURIComponent(String(procedureEncoded)), checked);
}

function syncDiligencePrintSelection(allRows){
  const allowed = new Set((allRows || []).map(row=>makeDiligencePrintKey(row.clientId, row.dossierIndex, row.procedure)));
  diligencePrintSelection = new Set([...diligencePrintSelection].filter(key=>allowed.has(key)));
  updateDiligenceCheckedCount();
}

function setAllVisibleDiligenceRowsForPrint(checked){
  const rows = getFilteredDiligenceRows(getDiligenceRows());
  if(!rows.length){
    alert('Aucune ligne visible.');
    return;
  }
  rows.forEach(row=>toggleDiligencePrintSelection(row.clientId, row.dossierIndex, row.procedure, checked));
  renderDiligence();
}

function getDiligenceRows(){
  const viewerKey = getAudienceViewerCacheKey();
  if(
    diligenceRowsCache
    && diligenceRowsCacheVersion === audienceRowsRawDataVersion
    && diligenceRowsCacheViewerKey === viewerKey
  ){
    return diligenceRowsCache;
  }
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
  const out = dedupeDiligenceRowsByReferenceAndDebiteur(rows);
  diligenceRowsCache = out;
  diligenceRowsCacheVersion = audienceRowsRawDataVersion;
  diligenceRowsCacheViewerKey = viewerKey;
  return out;
}

function syncDiligenceProcedureFilter(rows){
  const select = $('diligenceProcedureFilter');
  if(!select) return;
  if(rows === diligenceFilterProcedureRowsRef){
    select.value = filterDiligenceProcedure;
    return;
  }
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
  diligenceFilterProcedureRowsRef = rows;
}

function syncDiligenceTribunalFilter(rows){
  const select = $('diligenceTribunalFilter');
  if(!select) return;
  if(rows === diligenceFilterTribunalRowsRef){
    select.value = filterDiligenceTribunal;
    return;
  }
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
  diligenceFilterTribunalRowsRef = rows;
}

function syncDiligenceSortFilter(rows){
  const select = $('diligenceSortFilter');
  if(!select) return;
  if(rows === diligenceFilterSortRowsRef){
    select.value = filterDiligenceSort;
    return;
  }
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
  diligenceFilterSortRowsRef = rows;
}

function syncDiligenceDelegationFilter(rows){
  const select = $('diligenceDelegationFilter');
  if(!select) return;
  if(rows === diligenceFilterDelegationRowsRef){
    select.value = filterDiligenceDelegation;
    return;
  }
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
  diligenceFilterDelegationRowsRef = rows;
}

function syncDiligenceOrdonnanceFilter(rows){
  const select = $('diligenceOrdonnanceFilter');
  if(!select) return;
  if(rows === diligenceFilterOrdonnanceRowsRef){
    select.value = filterDiligenceOrdonnance;
    return;
  }
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
  diligenceFilterOrdonnanceRowsRef = rows;
}

function renderDiligence(options = {}){
  if(!shouldRenderDeferredSection('diligence', options)) return;
  const diligenceQuery = $('diligenceSearchInput')?.value?.toLowerCase() || '';
  syncPaginationFilterState(
    'diligence',
    [
      diligenceQuery,
      filterDiligenceProcedure,
      filterDiligenceSort,
      filterDiligenceDelegation,
      filterDiligenceOrdonnance,
      filterDiligenceTribunal
    ].join('||')
  );
  const body = $('diligenceBody');
  const count = $('diligenceCount');
  const headRow = $('diligenceHeadRow');
  if(!body) return;
  const allRows = getDiligenceRows();
  syncDiligencePrintSelection(allRows);
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
    diligenceVirtualRows = [];
    diligenceVirtualLastRange = { start: -1, end: -1 };
    body.innerHTML = `<tr><td colspan="${showInjonctionColumns ? 15 : 11}" class="diligence-empty">Aucun dossier SFDC/S-bien/Injonction trouvé.</td></tr>`;
    renderPagination('diligence', { totalRows: 0, page: 1, totalPages: 1, from: 0, to: 0 });
    return;
  }

  const pageData = paginateRows(rows, 'diligence');
  const useVirtual = pageData.rows.length >= DILIGENCE_VIRTUAL_MIN_ROWS;
  diligenceVirtualRows = pageData.rows;
  diligenceVirtualShowInjonctionColumns = showInjonctionColumns;
  diligenceVirtualLastRange = { start: -1, end: -1 };
  if(useVirtual){
    renderDiligenceVirtualWindow(true);
  }else{
    body.innerHTML = pageData.rows.map(row=>renderDiligenceRowHtml(row, showInjonctionColumns)).join('');
    applyDiligenceAutoSizing(body);
  }
  renderPagination('diligence', pageData);
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
  const previousValue = field === 'ville' ? dossier.ville : details[field];
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
  queueDossierHistoryEntry(dossier, {
    source: 'diligence',
    field: field === 'ville' ? 'ville' : `procedureDetails.${field}`,
    procedure: field === 'ville' ? '' : proc,
    before: previousValue,
    after: nextValue
  });
  queuePersistAppState();
}

function updateDiligenceFieldEncoded(clientId, dossierIndex, procKeyEncoded, field, value){
  updateDiligenceField(clientId, dossierIndex, decodeURIComponent(String(procKeyEncoded)), field, value);
}

function getFilteredDiligenceRows(allRows){
  const q = $('diligenceSearchInput')?.value?.toLowerCase() || '';
  const filterKey = [
    q,
    filterDiligenceProcedure,
    filterDiligenceSort,
    filterDiligenceDelegation,
    filterDiligenceOrdonnance,
    filterDiligenceTribunal
  ].join('||');
  if(allRows === diligenceFilteredRowsCacheInput && filterKey === diligenceFilteredRowsCacheKey){
    return diligenceFilteredRowsCacheOutput;
  }
  const out = allRows.filter(row=>{
    if(filterDiligenceProcedure !== 'all' && row.procedure !== filterDiligenceProcedure) return false;
    if(filterDiligenceSort !== 'all' && row.sort !== filterDiligenceSort) return false;
    if(filterDiligenceDelegation !== 'all' && row.delegation !== filterDiligenceDelegation) return false;
    if(filterDiligenceOrdonnance !== 'all' && row.ordonnance !== filterDiligenceOrdonnance) return false;
    if(filterDiligenceTribunal !== 'all' && row.tribunal !== filterDiligenceTribunal) return false;
    if(!q) return true;
    const haystack = row.__diligenceHaystack || (row.__diligenceHaystack = buildSuiviSearchHaystack(
      row.clientName,
      row.dossier,
      [row.procedure],
      row.tribunal ? [row.tribunal] : []
    ));
    return haystack.includes(q);
  });
  diligenceFilteredRowsCacheInput = allRows;
  diligenceFilteredRowsCacheKey = filterKey;
  diligenceFilteredRowsCacheOutput = out;
  return out;
}

function exportDiligenceXLS(){
  const allRows = getDiligenceRows();
  syncDiligencePrintSelection(allRows);
  syncDiligenceProcedureFilter(allRows);
  syncDiligenceSortFilter(allRows);
  syncDiligenceDelegationFilter(allRows);
  syncDiligenceOrdonnanceFilter(allRows);
  syncDiligenceTribunalFilter(allRows);
  const rows = allRows.filter(row=>isDiligenceSelectedForPrint(row));
  if(!rows.length){
    alert('Cochez au moins une ligne pour exporter.');
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
    row.details?.referenceClient || '-',
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

function renderEquipe(options = {}){
  if(!shouldRenderDeferredSection('equipe', options)) return;
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
  const salleInput = $('salleNameInput');
  const jugeInput = $('salleJudgeInput');
  const salle = normalizeSalleName(salleInput?.value || '');
  const juge = normalizeJudgeName(jugeInput?.value || '');
  if(!salle || !juge){
    if(!salle && salleInput){
      salleInput.focus();
      return;
    }
    if(!juge && jugeInput){
      jugeInput.focus();
    }
    return;
  }
  const exists = AppState.salleAssignments.some(row=>
    normalizeSalleWeekday(row?.day) === day
    && String(row?.salle || '').toLowerCase() === salle.toLowerCase()
    && String(row?.juge || '').toLowerCase() === juge.toLowerCase()
  );
  if(exists){
    if(jugeInput) jugeInput.value = '';
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
  if(jugeInput) jugeInput.value = '';
  renderSalle();
}

function deleteSalleJudge(id){
  if(!canEditData()) return alert('Accès refusé');
  AppState.salleAssignments = AppState.salleAssignments.filter(row=>Number(row.id) !== Number(id));
  queuePersistAppState();
  renderSalle();
}

function renderSalle(options = {}){
  if(!shouldRenderDeferredSection('salle', options)) return;
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

function getAudienceProcedureFilterKey(procName){
  const raw = String(procName || '').trim();
  if(!raw) return '';
  const normalized = parseProcedureToken(raw);
  const base = getProcedureBaseName(normalized);
  return String(base || normalized || raw).trim();
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

function getDashboardSnapshot(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    dashboardSnapshotCache
    && dashboardSnapshotCacheVersion === audienceRowsRawDataVersion
    && dashboardSnapshotCacheUserKey === userKey
  ){
    return dashboardSnapshotCache;
  }
  const visibleClients = getVisibleClients();
  let enCours = 0;
  let clotureCount = 0;
  visibleClients.forEach(c=>{
    c.dossiers.forEach(d=>{
      enCours += 1;
      if(d.statut === 'Clôture') clotureCount += 1;
    });
  });
  const snapshot = {
    totalClients: visibleClients.length,
    enCours,
    clotureCount,
    attSortRows: getDashboardAttSortRows(),
    audienceErrors: getAudienceErrorDossierCount()
  };
  dashboardSnapshotCache = snapshot;
  dashboardSnapshotCacheVersion = audienceRowsRawDataVersion;
  dashboardSnapshotCacheUserKey = userKey;
  return snapshot;
}

function getDashboardCalendarEvents(){
  const userKey = getCurrentClientAccessCacheKey();
  if(
    dashboardCalendarEventsCache
    && dashboardCalendarEventsCacheVersion === audienceRowsRawDataVersion
    && dashboardCalendarEventsCacheUserKey === userKey
  ){
    return dashboardCalendarEventsCache;
  }
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
  dashboardCalendarEventsCache = byDate;
  dashboardCalendarEventsCacheVersion = audienceRowsRawDataVersion;
  dashboardCalendarEventsCacheUserKey = userKey;
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

function queueDashboardCalendarRender(){
  if(dashboardCalendarRenderTimer) return;
  const render = ()=>{
    dashboardCalendarRenderTimer = null;
    renderDashboardCalendar();
  };
  if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
    dashboardCalendarRenderTimer = window.requestIdleCallback(render, { timeout: 1200 });
    return;
  }
  dashboardCalendarRenderTimer = setTimeout(render, 120);
}

function queueDashboardHeavyRender(){
  if(dashboardHeavyRenderTimer) return;
  const render = ()=>{
    dashboardHeavyRenderTimer = null;
    const snapshot = getDashboardSnapshot();
    animateDashboardMetric('dossiersEnCours', snapshot.enCours);
    animateDashboardMetric('dossiersTermines', snapshot.clotureCount);
    if($('dossiersAttSort')) animateDashboardMetric('dossiersAttSort', snapshot.attSortRows.length);
    if($('audienceErrorsCount')) animateDashboardMetric('audienceErrorsCount', snapshot.audienceErrors);
    queueDashboardCalendarRender();
  };
  if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
    dashboardHeavyRenderTimer = window.requestIdleCallback(render, { timeout: 1500 });
    return;
  }
  dashboardHeavyRenderTimer = setTimeout(render, 80);
}

// ================== DASHBOARD ==================
function renderDashboard(options = {}){
  if(!shouldRenderDeferredSection('dashboard', options)) return;
  animateDashboardMetric('totalClients', getVisibleClients().length);
  queueDashboardHeavyRender();
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
  const sourceRows = getAudienceRows({ ignoreSearch: true, ignoreColor: true });
  return sourceRows
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

function getAudienceRowDateValue(row){
  const raw = String(row?.draft?.dateAudience || row?.p?.audience || '').trim();
  if(!raw) return '';
  const normalized = normalizeDateDDMMYYYY(raw);
  return normalized || raw;
}

function normalizeIsoDateToDDMMYYYY(value){
  const text = String(value || '').trim();
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function getAudienceRowRefClientDisplayKey(row){
  const displayed = row?.p?._refClientMismatch
    ? String(row?.p?._refClientProvided || '')
    : String(row?.d?.referenceClient || '');
  return normalizeReferenceValue(displayed);
}

function buildAudienceMismatchRefClientSet(rows){
  const set = new Set();
  (rows || []).forEach(row=>{
    if(!row?.p?._refClientMismatch) return;
    const key = getAudienceRowRefClientDisplayKey(row);
    if(key) set.add(key);
  });
  return set;
}

function getAudiencePriorityBucket(row, duplicateKeySet, mismatchRefClientSet){
  const isRefClientMismatch = !!row?.p?._refClientMismatch;
  if(isRefClientMismatch) return 0;
  const refClientKey = getAudienceRowRefClientDisplayKey(row);
  if(refClientKey && mismatchRefClientSet.has(refClientKey)) return 1;
  const isOtherError = isAudienceRowInvalid(row, duplicateKeySet);
  if(isOtherError) return 2;
  return 3;
}

function getFilteredAudienceRows(allRows = null){
  const rows = Array.isArray(allRows) ? allRows : getAudienceRows();
  const priorityColor = getActiveAudiencePriorityColor();
  const isDefaultView =
    filterAudienceProcedure === 'all'
    && filterAudienceTribunal === 'all'
    && !filterAudienceDate
    && !filterAudienceErrorsOnly
    && (!priorityColor || priorityColor === 'all');
  const filterKey = [
    filterAudienceProcedure,
    filterAudienceTribunal,
    filterAudienceDate,
    filterAudienceErrorsOnly ? '1' : '0',
    priorityColor || 'all'
  ].join('||');
  if(rows === audienceFilteredRowsCacheInput && filterKey === audienceFilteredRowsCacheKey){
    return audienceFilteredRowsCacheOutput;
  }
  if(isDefaultView){
    if(rows.length > AUDIENCE_DEFAULT_SORT_MAX_ROWS){
      audienceFilteredRowsCacheInput = rows;
      audienceFilteredRowsCacheKey = filterKey;
      audienceFilteredRowsCacheOutput = rows;
      return rows;
    }
    const decorated = rows.map(row=>({ row, sortMeta: buildAudienceSortMeta(row) }));
    decorated.sort((a, b)=>compareAudienceSortMeta(a.sortMeta, b.sortMeta));
    const out = decorated.map(item=>item.row);
    audienceFilteredRowsCacheInput = rows;
    audienceFilteredRowsCacheKey = filterKey;
    audienceFilteredRowsCacheOutput = out;
    return out;
  }
  const canUsePriorityPartition =
    !filterAudienceErrorsOnly
    && filterAudienceProcedure === 'all'
    && filterAudienceTribunal === 'all'
    && !filterAudienceDate
    && priorityColor
    && priorityColor !== 'all'
    && rows.length > AUDIENCE_DEFAULT_SORT_MAX_ROWS;
  if(canUsePriorityPartition){
    const matched = [];
    const others = [];
    rows.forEach(row=>{
      if(String(row?.p?.color || '') === priorityColor){
        matched.push(row);
      }else{
        others.push(row);
      }
    });
    const out = matched.concat(others);
    audienceFilteredRowsCacheInput = rows;
    audienceFilteredRowsCacheKey = filterKey;
    audienceFilteredRowsCacheOutput = out;
    return out;
  }
  const duplicateKeySet = getAudienceDuplicateKeySet(rows);
  const mismatchRefClientSet = buildAudienceMismatchRefClientSet(rows);
  const filtered = rows.filter(row=>{
    const tribunalKey = resolveAudienceTribunalFilterKey(row.p.tribunal || '');
    const rowProcFilterKey = getAudienceProcedureFilterKey(row.procKey);
    if(filterAudienceProcedure !== 'all' && rowProcFilterKey !== filterAudienceProcedure) return false;
    if(filterAudienceTribunal !== 'all' && tribunalKey !== filterAudienceTribunal) return false;
    if(filterAudienceDate){
      const targetDate = normalizeIsoDateToDDMMYYYY(filterAudienceDate);
      const rowDate = getAudienceRowDateValue(row);
      if(targetDate && rowDate !== targetDate) return false;
    }
    if(filterAudienceErrorsOnly && !isAudienceRowInvalid(row, duplicateKeySet)) return false;
    return true;
  });
  const decorated = filtered.map(row=>{
    const bucket = getAudiencePriorityBucket(row, duplicateKeySet, mismatchRefClientSet);
    const colorMatch = (!filterAudienceErrorsOnly && priorityColor && priorityColor !== 'all')
      ? (String(row?.p?.color || '') === priorityColor ? 1 : 0)
      : 0;
    const sortMeta = buildAudienceSortMeta(row);
    return { row, bucket, colorMatch, sortMeta };
  });
  decorated.sort((a, b)=>{
    if(a.bucket !== b.bucket) return a.bucket - b.bucket;
    if(a.colorMatch !== b.colorMatch) return b.colorMatch - a.colorMatch;
    return compareAudienceSortMeta(a.sortMeta, b.sortMeta);
  });
  const out = decorated.map(item=>item.row);
  audienceFilteredRowsCacheInput = rows;
  audienceFilteredRowsCacheKey = filterKey;
  audienceFilteredRowsCacheOutput = out;
  return out;
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

function renderAudience(options = {}){
  if(!shouldRenderDeferredSection('audience', options)) return;
  const audienceQuery = $('filterAudience')?.value?.toLowerCase() || '';
  syncPaginationFilterState(
    'audience',
    [
      audienceQuery,
      filterAudienceColor,
      filterAudienceProcedure,
      filterAudienceTribunal,
      filterAudienceDate,
      filterAudienceErrorsOnly ? '1' : '0',
      selectedAudienceColor
    ].join('||')
  );
  const body = $('audienceBody');
  if(!body){
    queueSidebarSalleSessionsRender();
    return;
  }
  body.innerHTML='';
  if(!isManager() && getVisibleClients().length === 0){
    audienceVirtualRows = [];
    audienceVirtualDuplicateKeySet = new Set();
    audienceVirtualLastRange = { start: -1, end: -1 };
    body.innerHTML = '<tr><td colspan="11" class="diligence-empty">Aucun client assigné à ce compte. Contactez le gestionnaire.</td></tr>';
    renderPagination('audience', { totalRows: 0, page: 1, totalPages: 1, from: 0, to: 0 });
    updateAudienceCheckedCount();
    queueSidebarSalleSessionsRender();
    return;
  }

  const allRows = getAudienceRows();
  syncAudienceFilterOptions(allRows);
  const duplicateKeySet = getAudienceDuplicateKeySet(allRows);
  const rows = getFilteredAudienceRows(allRows);
  lastAudienceRenderedRows = rows;
  const pageData = paginateRows(rows, 'audience');
  const useVirtual = shouldUseAudienceVirtualization(pageData.rows.length);
  audienceVirtualRows = pageData.rows;
  audienceVirtualDuplicateKeySet = duplicateKeySet;
  audienceVirtualLastRange = { start: -1, end: -1 };
  if(!pageData.rows.length){
    body.innerHTML = '<tr><td colspan="11" class="diligence-empty">Aucune audience trouvée avec ces filtres.</td></tr>';
  }else if(useVirtual){
    renderAudienceVirtualWindow(true);
  }else{
    body.innerHTML = pageData.rows.map(row=>renderAudienceRowHtml(row, duplicateKeySet)).join('');
  }
  renderPagination('audience', pageData);
  updateAudienceCheckedCount();
  queueSidebarSalleSessionsRender();
}

function shouldUseAudienceVirtualization(rowCount){
  if(Number(rowCount) < AUDIENCE_VIRTUAL_MIN_ROWS) return false;
  const container = $('audienceTableContainer');
  if(!container) return false;
  if(typeof window === 'undefined' || typeof window.getComputedStyle !== 'function'){
    return false;
  }
  const style = window.getComputedStyle(container);
  const overflowY = String(style.overflowY || '').toLowerCase();
  const maxHeight = String(style.maxHeight || '').trim().toLowerCase();
  const height = String(style.height || '').trim().toLowerCase();
  const hasConstrainedHeight = (maxHeight && maxHeight !== 'none') || (height && height !== 'auto');
  if(!hasConstrainedHeight) return false;
  return overflowY === 'auto' || overflowY === 'scroll';
}

function captureAudienceScrollState(){
  const container = $('audienceTableContainer');
  return {
    containerTop: container ? Number(container.scrollTop) || 0 : null,
    containerLeft: container ? Number(container.scrollLeft) || 0 : null,
    pageX: (typeof window !== 'undefined' ? Number(window.scrollX) : 0) || 0,
    pageY: (typeof window !== 'undefined' ? Number(window.scrollY) : 0) || 0
  };
}

function restoreAudienceScrollState(snapshot){
  if(!snapshot || typeof snapshot !== 'object') return;
  const container = $('audienceTableContainer');
  if(container && Number.isFinite(snapshot.containerTop)){
    container.scrollTop = Math.max(0, snapshot.containerTop);
    if(Number.isFinite(snapshot.containerLeft)){
      container.scrollLeft = Math.max(0, snapshot.containerLeft);
    }
    if(Array.isArray(audienceVirtualRows) && audienceVirtualRows.length >= AUDIENCE_VIRTUAL_MIN_ROWS){
      queueAudienceVirtualRender();
    }
  }
  if(typeof window !== 'undefined' && typeof window.scrollTo === 'function'){
    window.scrollTo(snapshot.pageX || 0, snapshot.pageY || 0);
  }
}

function renderAudienceKeepingPosition(){
  const snapshot = captureAudienceScrollState();
  renderAudience();
  const apply = ()=>restoreAudienceScrollState(snapshot);
  if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'){
    window.requestAnimationFrame(()=>window.requestAnimationFrame(apply));
    return;
  }
  setTimeout(apply, 0);
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
  return getAudienceRows({ ignoreSearch: true, ignoreColor: true })
    .filter(row=>isAudienceSelectedForPrint(row.ci, row.di, row.procKey))
    .sort(compareAudienceRowsByReferenceProximity);
}

function getAudienceRowReferenceValue(row){
  return normalizeReferenceForAudienceLookup(String(row?.draft?.refDossier ?? row?.p?.referenceClient ?? '').trim());
}

function parseAudienceReferenceParts(value){
  const ref = normalizeReferenceForAudienceLookup(value);
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

function buildAudienceSortMeta(row){
  if(row?.__sortMeta && typeof row.__sortMeta === 'object'){
    return row.__sortMeta;
  }
  const ref = getAudienceRowReferenceValue(row);
  const parts = parseAudienceReferenceParts(ref);
  const out = {
    ref,
    parts,
    client: String(row?.c?.name || ''),
    refClient: String(row?.d?.referenceClient || ''),
    debiteur: String(row?.d?.debiteur || '')
  };
  if(row && typeof row === 'object') row.__sortMeta = out;
  return out;
}

function compareAudienceSortMeta(aMeta, bMeta){
  const pa = aMeta?.parts;
  const pb = bMeta?.parts;
  if(pa && pb){
    if(pa.year !== pb.year) return pb.year - pa.year;
    if(pa.middle !== pb.middle) return pa.middle - pb.middle;
    if(pa.first !== pb.first) return pa.first - pb.first;
  }else if(pa){
    return -1;
  }else if(pb){
    return 1;
  }
  const byRef = String(aMeta?.ref || '').localeCompare(String(bMeta?.ref || ''), 'fr', { numeric: true, sensitivity: 'base' });
  if(byRef !== 0) return byRef;
  const byClient = String(aMeta?.client || '').localeCompare(String(bMeta?.client || ''), 'fr', { sensitivity: 'base' });
  if(byClient !== 0) return byClient;
  const byRefClient = String(aMeta?.refClient || '').localeCompare(String(bMeta?.refClient || ''), 'fr', { sensitivity: 'base' });
  if(byRefClient !== 0) return byRefClient;
  return String(aMeta?.debiteur || '').localeCompare(String(bMeta?.debiteur || ''), 'fr', { sensitivity: 'base' });
}

function buildAudienceDuplicateKey(row){
  if(typeof row?.__dupKey === 'string') return row.__dupKey;
  const refDossier = normalizeReferenceForAudienceLookup(String(row?.draft?.refDossier ?? row?.p?.referenceClient ?? '').trim());
  const procedure = String(row?.procKey || '').trim().toLowerCase();
  const debiteur = String(row?.d?.debiteur || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if(!refDossier || !debiteur || !procedure) return '';
  // Audience rows are unique per procedure for the same dossier/debiteur.
  return `${procedure}__${debiteur}__${refDossier}`;
}

function getAudienceDuplicateKeySet(rows){
  if(rows === audienceDuplicateKeySetCacheInput){
    return audienceDuplicateKeySetCacheOutput;
  }
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
  audienceDuplicateKeySetCacheInput = rows;
  audienceDuplicateKeySetCacheOutput = duplicates;
  return duplicates;
}

function queueSidebarSalleSessionsRender(){
  if(sidebarSalleRenderTimer) return;
  sidebarSalleRenderTimer = setTimeout(()=>{
    sidebarSalleRenderTimer = null;
    renderSidebarSalleSessions();
  }, 80);
}

function getAudienceRowContentScore(row){
  if(Number.isFinite(row?.__contentScore)) return row.__contentScore;
  return computeAudienceRowContentScore(row);
}

function getDiligenceRowReferenceValue(row){
  return normalizeReferenceValue(String(row?.details?.referenceClient ?? '').trim());
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
  const missingGlobal = !!row?.p?._missingGlobal;
  const duplicateKey = buildAudienceDuplicateKey(row);
  const isDuplicate = !!(duplicateKeySet && duplicateKey && duplicateKeySet.has(duplicateKey));
  return isDuplicate || hasAttNum || missingGlobal || (!dateAudience && !juge && !sort);
}

function getAudienceErrorRows(){
  const rows = getAudienceRows();
  const duplicateKeySet = getAudienceDuplicateKeySet(rows);
  return rows.filter(row => isAudienceRowInvalid(row, duplicateKeySet));
}

function getAudienceErrorDossierCount(){
  if(audienceErrorCountCacheVersion === audienceRowsRawDataVersion){
    return audienceErrorCountCacheValue;
  }
  audienceErrorCountCacheValue = getAudienceErrorRows().length;
  audienceErrorCountCacheVersion = audienceRowsRawDataVersion;
  return audienceErrorCountCacheValue;
}

function syncAudienceFilterOptions(rows){
  const procedureSelect = $('filterAudienceProcedure');
  const tribunalSelect = $('filterAudienceTribunal');
  if(!procedureSelect || !tribunalSelect) return;
  if(rows === audienceFilterOptionsRowsRef){
    procedureSelect.value = filterAudienceProcedure;
    tribunalSelect.value = filterAudienceTribunal;
    return;
  }

  let meta = audienceFilterOptionsMetaCache.get(rows);
  if(!meta){
    const procedureSet = new Set();
    rows.forEach(row=>{
      const key = getAudienceProcedureFilterKey(row.procKey);
      if(key) procedureSet.add(key);
    });
    const tribunalState = buildAudienceTribunalClusterState(rows);
    meta = { procedureSet, tribunalState };
    audienceFilterOptionsMetaCache.set(rows, meta);
  }
  const procedureSet = meta.procedureSet;
  const tribunalState = meta.tribunalState;
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
  audienceFilterOptionsRowsRef = rows;
}

function hasAudienceProcedureData(procData, draftData){
  const p = procData || {};
  const d = draftData || {};
  const fields = [
    d.dateAudience,
    p.audience,
    d.juge,
    p.juge,
    d.sort,
    p.sort,
    d.instruction,
    p.instruction,
    p.tribunal
  ];
  return fields.some(value=>String(value || '').trim().length > 0);
}

function getAudienceRowsRawCached(){
  const viewerKey = getAudienceViewerCacheKey();
  if(
    audienceRowsRawCache
    && audienceRowsRawCacheVersion === audienceRowsRawDataVersion
    && audienceRowsRawCacheViewerKey === viewerKey
  ){
    return audienceRowsRawCache;
  }
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
        if(!hasAudienceProcedureData(p, draft)) return;
        const refDossier = normalizeReferenceForAudienceLookup(String(draft?.refDossier ?? p?.referenceClient ?? '').trim());
        const procedureNorm = String(procKey || '').trim().toLowerCase();
        const debiteurNorm = String(d?.debiteur || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const duplicateKey = (refDossier && procedureNorm && debiteurNorm)
          ? `${procedureNorm}__${debiteurNorm}__${refDossier}`
          : '';
        const row = {
          c,
          d,
          procKey,
          p,
          color: p.color || '',
          key,
          draft,
          ci,
          di,
          __dupKey: duplicateKey
        };
        rows.push(row);
      });
    });
  });
  audienceRowsRawCache = rows;
  audienceRowsRawCacheVersion = audienceRowsRawDataVersion;
  audienceRowsRawCacheViewerKey = viewerKey;
  return rows;
}

function getAudienceRowsDedupedCached(){
  const viewerKey = getAudienceViewerCacheKey();
  if(
    audienceRowsDedupeCache
    && audienceRowsDedupeCacheVersion === audienceRowsRawDataVersion
    && audienceRowsDedupeCacheViewerKey === viewerKey
  ){
    return audienceRowsDedupeCache;
  }
  const deduped = dedupeAudienceRowsByReferenceAndDebiteur(getAudienceRowsRawCached());
  audienceRowsDedupeCache = deduped;
  audienceRowsDedupeCacheVersion = audienceRowsRawDataVersion;
  audienceRowsDedupeCacheViewerKey = viewerKey;
  return deduped;
}

function getAudienceRows(options = {}){
  const opts = options && typeof options === 'object' ? options : {};
  const ignoreSearch = !!opts.ignoreSearch;
  const ignoreColor = !!opts.ignoreColor;
  const q = ignoreSearch ? '' : ($('filterAudience')?.value?.toLowerCase() || '');
  const baseRows = getAudienceRowsDedupedCached();
  const noColorFilter = ignoreColor || filterAudienceColor === 'all';
  const noSearchFilter = ignoreSearch || !q;
  const viewKey = [
    ignoreSearch ? '1' : '0',
    ignoreColor ? '1' : '0',
    ignoreSearch ? '' : q,
    ignoreColor ? '' : filterAudienceColor
  ].join('||');
  if(baseRows === audienceRowsViewCacheSource && viewKey === audienceRowsViewCacheKey){
    return audienceRowsViewCacheOutput;
  }
  if(noColorFilter && noSearchFilter){
    audienceRowsViewCacheSource = baseRows;
    audienceRowsViewCacheKey = viewKey;
    audienceRowsViewCacheOutput = baseRows;
    return baseRows;
  }
  const out = baseRows.filter(row=>{
    if(!ignoreColor && filterAudienceColor !== 'all' && row.color !== filterAudienceColor) return false;
    if(!ignoreSearch && q){
      const haystack = row.__haystack || (row.__haystack = buildAudienceSearchHaystack(row.c?.name, row.d, row.procKey, row.p, row.draft));
      if(!haystack.includes(q)) return false;
    }
    return true;
  });
  audienceRowsViewCacheSource = baseRows;
  audienceRowsViewCacheKey = viewKey;
  audienceRowsViewCacheOutput = out;
  return out;
}

function getAudienceRowsForSidebar(){
  return getAudienceRowsDedupedCached();
}

async function exportAudienceRegularXLS(){
  const audienceRows = getAudienceRows().sort(compareAudienceRowsByReferenceProximity);
  if(!audienceRows.length){
    alert('Aucune ligne à exporter.');
    return;
  }

  const headers = [
    'Client',
    'Adversaire',
    'Date dépôt',
    'N° Dossier',
    'Juge',
    'Audience',
    'Sort',
    'Tribunal'
  ];

  const rows = audienceRows.map(r=>{
    const p = r.p;
    const d = r.d;
    const draft = r.draft;
    const dossierRef = String(draft.refDossier || p.referenceClient || d.referenceClient || '').trim();
    const jugeValue = String(draft.juge || p.juge || '').trim();
    const audienceDateValue = normalizeDateDDMMYYYY(draft.dateAudience || p.audience || '')
      || String(draft.dateAudience || p.audience || '').trim();
    const sortValue = String(draft.sort || p.sort || '').trim();
    return [
      r.c.name || '',
      d.debiteur || '',
      getAudienceDateDepotDisplayValue(r),
      dossierRef || '-',
      jugeValue || '-',
      audienceDateValue || '-',
      sortValue,
      p.tribunal || ''
    ];
  });

  await exportAudienceWorkbookXlsxStyled({
    headers,
    rows,
    subtitle: 'Export standard',
    sheetName: 'Export',
    colWidths: [{ wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 24 }, { wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 46 }],
    filename: 'export_audience_standard.xlsx'
  });
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
    'Date dépôt',
    'N° Dossier',
    'Juge',
    'Instruction',
    'Sort',
    'Tribunal'
  ];

  const rows = audienceRows.map(r=>{
    const p = r.p;
    const d = r.d;
    const draft = r.draft;
    const dossierRef = String(draft.refDossier || p.referenceClient || d.referenceClient || '').trim();
    const sortValue = '';
    const instructionValue = draft.instruction || p.instruction || draft.sort || p.sort || '';
    const jugeValue = draft.juge || p.juge || '';
    const dateDepotValue = getAudienceDateDepotDisplayValue(r);
    return [
      r.c.name || '',
      d.debiteur || '',
      dateDepotValue,
      dossierRef || '-',
      jugeValue,
      instructionValue,
      sortValue,
      p.tribunal || ''
    ];
  });
  const dateAudienceTop = audienceRows
    .map(r=>normalizeDateDDMMYYYY(r?.draft?.dateAudience || r?.p?.audience || '') || String(r?.draft?.dateAudience || r?.p?.audience || '').trim())
    .find(v=>String(v || '').trim()) || '-';

  await exportAudienceWorkbookXlsxStyled({
    headers,
    rows,
    subtitle: `Date d'audience : ${dateAudienceTop}`,
    sheetName: 'Audience',
    colWidths: [{ wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 34 }, { wch: 22 }, { wch: 22 }, { wch: 34 }, { wch: 46 }],
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
    markAudienceRowsCacheDirty();
    queueAudienceColorBatchUpdate({ persist: true, dashboard: true, suivi: false });
    return;
  }
  if(selectedAudienceColor === 'all' || !allowed.has(selectedAudienceColor)){
    queueAudienceColorBatchUpdate({ persist: false, dashboard: true, suivi: false });
    return;
  }
  p.color = selectedAudienceColor;
  if(selectedAudienceColor === 'purple-dark') dossier.statut = 'Soldé';
  if(selectedAudienceColor === 'purple-light') dossier.statut = 'Arrêt définitif';
  markAudienceRowsCacheDirty();
  queueAudienceColorBatchUpdate({ persist: true, dashboard: true, suivi: true });
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

function queueAudienceColorBatchUpdate(options = {}){
  const opts = options && typeof options === 'object' ? options : {};
  if(opts.persist) audienceColorBatchNeedsPersist = true;
  if(opts.dashboard) audienceColorBatchNeedsDashboard = true;
  if(opts.suivi) audienceColorBatchNeedsSuivi = true;
  if(audienceColorBatchTimer) return;
  audienceColorBatchTimer = setTimeout(()=>{
    audienceColorBatchTimer = null;
    const doPersist = audienceColorBatchNeedsPersist;
    const doDashboard = audienceColorBatchNeedsDashboard;
    const doSuivi = audienceColorBatchNeedsSuivi;
    audienceColorBatchNeedsPersist = false;
    audienceColorBatchNeedsDashboard = false;
    audienceColorBatchNeedsSuivi = false;
    if(doPersist){
      queuePersistAppState();
    }
    if(doDashboard){
      renderDashboard();
    }
    renderAudienceKeepingPosition();
    if(doSuivi){
      renderSuivi();
    }
  }, AUDIENCE_COLOR_BATCH_MS);
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
  markAudienceRowsCacheDirty();
  if(!audienceDraft[key]) audienceDraft[key] = {};
  audienceDraft[key][field] = value;
  const { ci, di, procKey } = parseAudienceDraftKey(key);
  const dossier = AppState.clients?.[ci]?.dossiers?.[di];
  const p = getAudienceProcedure(ci, di, procKey);
  const before = getAudienceProcedureFieldValue(p, field);
  applyAudienceFieldToProcedure(p, field, value);
  const after = getAudienceProcedureFieldValue(p, field);
  const fieldMap = {
    refDossier: 'procedureDetails.referenceClient',
    dateAudience: 'procedureDetails.audience',
    juge: 'procedureDetails.juge',
    sort: 'procedureDetails.sort'
  };
  if(fieldMap[field]){
    queueDossierHistoryEntry(dossier, {
      source: 'audience',
      field: fieldMap[field],
      procedure: procKey,
      before,
      after
    });
  }
  // Avoid full-state persist and linked heavy renders on every keystroke.
  // We keep in-memory update immediate and persist through debounced autosave.
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
    const dossier = AppState.clients?.[ci]?.dossiers?.[di];
    const p = getAudienceProcedure(ci, di, procKey);
    if(data.refDossier!==undefined){
      const before = getAudienceProcedureFieldValue(p, 'refDossier');
      applyAudienceFieldToProcedure(p, 'refDossier', data.refDossier);
      const after = getAudienceProcedureFieldValue(p, 'refDossier');
      queueDossierHistoryEntry(dossier, {
        source: 'audience',
        field: 'procedureDetails.referenceClient',
        procedure: procKey,
        before,
        after
      });
    }
    if(data.dateAudience!==undefined){
      const before = getAudienceProcedureFieldValue(p, 'dateAudience');
      applyAudienceFieldToProcedure(p, 'dateAudience', data.dateAudience);
      const after = getAudienceProcedureFieldValue(p, 'dateAudience');
      queueDossierHistoryEntry(dossier, {
        source: 'audience',
        field: 'procedureDetails.audience',
        procedure: procKey,
        before,
        after
      });
    }
    if(data.juge!==undefined){
      const before = getAudienceProcedureFieldValue(p, 'juge');
      applyAudienceFieldToProcedure(p, 'juge', data.juge);
      const after = getAudienceProcedureFieldValue(p, 'juge');
      queueDossierHistoryEntry(dossier, {
        source: 'audience',
        field: 'procedureDetails.juge',
        procedure: procKey,
        before,
        after
      });
    }
    if(data.sort!==undefined){
      const before = getAudienceProcedureFieldValue(p, 'sort');
      applyAudienceFieldToProcedure(p, 'sort', data.sort);
      const after = getAudienceProcedureFieldValue(p, 'sort');
      queueDossierHistoryEntry(dossier, {
        source: 'audience',
        field: 'procedureDetails.sort',
        procedure: procKey,
        before,
        after
      });
    }
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
  }, 1200);
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
  return normalizeDateDDMMYYYY(raw) || '';
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
