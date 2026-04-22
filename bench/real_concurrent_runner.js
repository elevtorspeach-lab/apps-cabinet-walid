#!/usr/bin/env node

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const SERVER_ENTRY = path.join(SERVER_DIR, 'index.js');
require(path.join(SERVER_DIR, 'node_modules', 'dotenv')).config({ path: path.join(SERVER_DIR, '.env') });
const db = require(path.join(SERVER_DIR, 'db'));
const DATA_DIR = path.join(SERVER_DIR, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const JOURNAL_FILE = path.join(DATA_DIR, 'state.journal');
const FIXTURE_SOURCE = process.env.BENCH_FIXTURE
  || '/var/folders/fk/vk8502c94wz_ynk81ysyv3g40000gn/T/Cabinet Walid Araqi-endurance-1775392902606/fixture_300c_40000d_60000a.appsavocat';
const PLAYWRIGHT_NODE_MODULES = process.env.PLAYWRIGHT_NODE_MODULES
  || '/tmp/cabinet-playwright-runner/node_modules';
const CHROME_EXECUTABLE = process.env.BENCH_BROWSER_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const TOTAL_MANAGERS = Number(process.env.TOTAL_MANAGERS || 5);
const TOTAL_ADMINS = Number(process.env.TOTAL_ADMINS || 15);
const TOTAL_CLIENTS = Number(process.env.TOTAL_CLIENTS || 10);
const TOTAL_SESSIONS = TOTAL_MANAGERS + TOTAL_ADMINS + TOTAL_CLIENTS;
const TARGET_CLIENTS = Number(process.env.TARGET_CLIENTS || 300);
const TARGET_DOSSIERS = Number(process.env.TARGET_DOSSIERS || 40000);
const TARGET_AUDIENCE = Number(process.env.TARGET_AUDIENCE || 60000);
const TARGET_DILIGENCE = Number(process.env.TARGET_DILIGENCE || 40000);
const USE_FIXED_APP_USERS = String(process.env.BENCH_USE_FIXED_APP_USERS || '1').trim() !== '0';
const TEST_DURATION_MS = Number(process.env.BENCH_DURATION_MS || (15 * 60 * 1000));
const SESSION_OPEN_BATCH = 4;
const SESSION_OPEN_PAUSE_MS = 1500;
const POLL_INTERVAL_MS = 10000;
const FREEZE_THRESHOLD_MS = 3000;
const HARD_FREEZE_THRESHOLD_MS = 8000;
const APP_INIT_TIMEOUT_MS = 180000;
const SESSION_LOGIN_TIMEOUT_MS = 240000;
const ACTION_PAUSE_MIN_MS = 5000;
const ACTION_PAUSE_MAX_MS = 12000;
const SERVER_PORT = Number(process.env.BENCH_PORT || 3620);
const BASE_URL = `http://127.0.0.1:${SERVER_PORT}`;
const RUN_ID = `real-bench-${Date.now()}`;
const RUN_DIR = path.join(ROOT_DIR, 'bench-runs', RUN_ID);
const REPORT_FILE = path.join(RUN_DIR, 'report.json');
const PROGRESS_FILE = path.join(RUN_DIR, 'progress.json');
const SERVER_STDOUT_FILE = path.join(RUN_DIR, 'server.stdout.log');
const SERVER_STDERR_FILE = path.join(RUN_DIR, 'server.stderr.log');

const FIXED_MANAGER_USERS = [
  { username: 'manager', role: 'manager', password: '1234' },
  { username: 'walid', role: 'manager', password: 'messi@123' }
];

const FIXED_ADMIN_USERS = [
  { username: 'ghita', role: 'admin', password: 'ghita@2110' },
  { username: 'doha', role: 'admin', password: 'sahi@345' },
  { username: 'najwa', role: 'admin', password: 'najwa@1234' },
  { username: 'yasmine', role: 'admin', password: 'yasmine@092' },
  { username: 'souhaila', role: 'admin', password: 'souhaila@192' }
];

const MONITOR_INIT_SCRIPT = `
(() => {
  if (window.__realBenchMonitorInstalled) return;
  window.__realBenchMonitorInstalled = true;
  const state = {
    maxRafGap: 0,
    maxIntervalGap: 0,
    freezeEvents: [],
    routeSamples: []
  };
  const getRoute = () => {
    try {
      if (typeof currentView === 'string' && currentView) return currentView;
    } catch {}
    try {
      const active = document.querySelector('.nav-link.active');
      return active ? String(active.textContent || '').trim().toLowerCase() : '';
    } catch {
      return '';
    }
  };
  const pushFreeze = (kind, gap) => {
    state.freezeEvents.push({
      kind,
      gap,
      route: getRoute(),
      at: new Date().toISOString()
    });
    if (state.freezeEvents.length > 120) {
      state.freezeEvents.splice(0, state.freezeEvents.length - 120);
    }
  };
  let lastRaf = performance.now();
  const rafTick = (now) => {
    const gap = now - lastRaf;
    if (gap > state.maxRafGap) state.maxRafGap = gap;
    if (gap >= ${FREEZE_THRESHOLD_MS}) pushFreeze('raf', gap);
    lastRaf = now;
    requestAnimationFrame(rafTick);
  };
  requestAnimationFrame(rafTick);
  let lastInterval = performance.now();
  setInterval(() => {
    const now = performance.now();
    const gap = now - lastInterval;
    if (gap > state.maxIntervalGap) state.maxIntervalGap = gap;
    if (gap >= ${FREEZE_THRESHOLD_MS}) pushFreeze('interval', gap);
    lastInterval = now;
  }, 1000);
  setInterval(() => {
    state.routeSamples.push({
      route: getRoute(),
      at: new Date().toISOString()
    });
    if (state.routeSamples.length > 60) {
      state.routeSamples.splice(0, state.routeSamples.length - 60);
    }
  }, 5000);
  window.__realBenchPullMetrics = () => {
    const payload = {
      maxRafGap: state.maxRafGap,
      maxIntervalGap: state.maxIntervalGap,
      freezeEvents: state.freezeEvents.slice(),
      routeSamples: state.routeSamples.slice(),
      route: getRoute()
    };
    state.maxRafGap = 0;
    state.maxIntervalGap = 0;
    state.freezeEvents.length = 0;
    state.routeSamples.length = 0;
    return payload;
  };
})();
`;

function requirePlaywright() {
  const candidates = [
    path.join(PLAYWRIGHT_NODE_MODULES, 'playwright'),
    path.join(ROOT_DIR, 'node_modules', 'playwright'),
    'playwright'
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {}
  }
  throw new Error(`Playwright introuvable. Candidates: ${candidates.join(', ')}`);
}

const { chromium } = requirePlaywright();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function isAudienceProcedure(procName) {
  const value = String(procName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!value) return false;
  return value !== 'sfdc' && value !== 'sbien' && value !== 'injonction';
}

function parseProcedureToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return '';
  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (compact === 'ass') return 'ASS';
  if (compact === 'commandement' || compact === 'cmd' || compact === 'com') return 'Commandement';
  if (compact === 'sfdc') return 'SFDC';
  if (compact === 'sbien') return 'S/bien';
  if (compact === 'inj' || compact === 'injonction') return 'Injonction';
  return raw;
}

function getProcedureBaseName(procName) {
  const raw = String(procName || '').trim();
  if (!raw) return '';
  return raw.replace(/\d+$/, '').trim() || raw;
}

function isDiligenceProcedure(procName) {
  const base = getProcedureBaseName(parseProcedureToken(procName));
  return base === 'ASS'
    || base === 'SFDC'
    || base === 'S/bien'
    || base === 'Injonction'
    || base === 'Commandement';
}

function computeStateStats(state) {
  const stats = {
    clients: Array.isArray(state?.clients) ? state.clients.length : 0,
    dossiers: 0,
    audience: 0,
    diligence: 0,
    users: Array.isArray(state?.users) ? state.users.length : 0,
    salleAssignments: Array.isArray(state?.salleAssignments) ? state.salleAssignments.length : 0
  };
  for (const client of Array.isArray(state?.clients) ? state.clients : []) {
    for (const dossier of Array.isArray(client?.dossiers) ? client.dossiers : []) {
      stats.dossiers += 1;
      const procKeys = Object.keys(dossier?.procedureDetails || {});
      for (const procKey of procKeys) {
        if (isAudienceProcedure(procKey)) {
          stats.audience += 1;
        }
        if (isDiligenceProcedure(procKey)) {
          stats.diligence += 1;
        }
      }
    }
  }
  return stats;
}

function ensureProcedureString(dossier, procName) {
  const existing = String(dossier?.procedure || '').trim();
  if (!existing) {
    dossier.procedure = procName;
    return;
  }
  const parts = existing.split(/[,+/|]/).map((part) => String(part || '').trim()).filter(Boolean);
  if (!parts.includes(procName)) {
    dossier.procedure = `${existing}, ${procName}`;
  }
}

function addExtraAudienceProcedures(state, targetAudienceCount) {
  const currentStats = computeStateStats(state);
  let missing = Math.max(0, targetAudienceCount - currentStats.audience);
  if (!missing) return { added: 0, finalAudience: currentStats.audience };
  const extraNames = ['ASS NB 1', 'ASS NB 2', 'ASS NB 3'];
  let added = 0;
  let dossierCursor = 0;
  const allDossiers = [];
  for (const client of state.clients || []) {
    for (const dossier of client.dossiers || []) {
      allDossiers.push(dossier);
    }
  }
  while (missing > 0 && dossierCursor < allDossiers.length) {
    const dossier = allDossiers[dossierCursor];
    if (!dossier.procedureDetails || typeof dossier.procedureDetails !== 'object') {
      dossier.procedureDetails = {};
    }
    const procName = extraNames[added % extraNames.length];
    if (!dossier.procedureDetails[procName]) {
      const day = String((added % 27) + 1).padStart(2, '0');
      dossier.procedureDetails[procName] = {
        referenceClient: String(dossier.referenceClient || `EXTRA-${added + 1}`),
        audience: `2026-04-${day}`,
        juge: `Juge Bench ${(added % 15) + 1}`,
        tribunal: `Tribunal ${(added % 8) + 1}`,
        instruction: `Instruction ${(added % 6) + 1}`,
        sort: added % 2 === 0 ? 'En cours' : 'Renvoi'
      };
      if (!dossier.montantByProcedure || typeof dossier.montantByProcedure !== 'object') {
        dossier.montantByProcedure = {};
      }
      dossier.montantByProcedure[procName] = String(dossier.montant || '');
      ensureProcedureString(dossier, procName);
      added += 1;
      missing -= 1;
    }
    dossierCursor += 1;
    if (dossierCursor >= allDossiers.length && missing > 0) {
      dossierCursor = 0;
    }
    if (added > allDossiers.length * extraNames.length) {
      break;
    }
  }
  const finalStats = computeStateStats(state);
  return { added, finalAudience: finalStats.audience };
}

function buildUsers(clients) {
  const users = [];
  let nextId = 1;
  const pushUser = (username, role, password, clientIds = []) => {
    users.push({
      id: nextId++,
      username,
      password,
      passwordHash: '',
      passwordSalt: '',
      passwordVersion: 0,
      passwordUpdatedAt: new Date().toISOString(),
      requirePasswordChange: false,
      role,
      clientIds
    });
  };
  if (USE_FIXED_APP_USERS) {
    FIXED_MANAGER_USERS.slice(0, TOTAL_MANAGERS).forEach((user) => {
      pushUser(user.username, user.role, user.password, []);
    });
    FIXED_ADMIN_USERS.slice(0, TOTAL_ADMINS).forEach((user) => {
      pushUser(user.username, user.role, user.password, []);
    });
    for (let index = FIXED_MANAGER_USERS.length; index < TOTAL_MANAGERS; index += 1) {
      pushUser(`manager${index + 1}`, 'manager', '1234', []);
    }
    for (let index = FIXED_ADMIN_USERS.length; index < TOTAL_ADMINS; index += 1) {
      pushUser(`admin${index + 1}`, 'admin', '1234', []);
    }
  } else {
    for (let index = 0; index < TOTAL_MANAGERS; index += 1) {
      pushUser(index === 0 ? 'manager' : `manager${index + 1}`, 'manager', '1234', []);
    }
    for (let index = 0; index < TOTAL_ADMINS; index += 1) {
      pushUser(`admin${index + 1}`, 'admin', '1234', []);
    }
  }
  const clientIds = (clients || []).map((client) => Number(client?.id)).filter((id) => Number.isFinite(id));
  for (let index = 0; index < TOTAL_CLIENTS; index += 1) {
    pushUser(`client${index + 1}`, 'client', '1234', clientIds[index] ? [clientIds[index]] : []);
  }
  return users;
}

async function prepareTestState() {
  if (!fs.existsSync(FIXTURE_SOURCE)) {
    throw new Error(`Fixture introuvable: ${FIXTURE_SOURCE}`);
  }
  const raw = await fsp.readFile(FIXTURE_SOURCE, 'utf8');
  const state = JSON.parse(raw);
  state.users = buildUsers(Array.isArray(state.clients) ? state.clients : []);
  state.audienceDraft = state.audienceDraft && typeof state.audienceDraft === 'object' ? state.audienceDraft : {};
  state.recycleBin = Array.isArray(state.recycleBin) ? state.recycleBin : [];
  state.recycleArchive = Array.isArray(state.recycleArchive) ? state.recycleArchive : [];
  const addAudienceResult = addExtraAudienceProcedures(state, TARGET_AUDIENCE);
  state.version = Number(state.version || 0) + 1;
  state.updatedAt = new Date().toISOString();
  const stats = computeStateStats(state);
  return {
    state,
    stats,
    addAudienceResult
  };
}

async function ensureRunDir() {
  await fsp.mkdir(RUN_DIR, { recursive: true });
}

async function backupCurrentDataFiles() {
  await db.initializeDatabase();
  const dbState = await db.loadFullState();
  const backup = {};
  for (const file of [STATE_FILE, JOURNAL_FILE]) {
    try {
      backup[file] = await fsp.readFile(file);
    } catch {
      backup[file] = null;
    }
  }
  return {
    dbState,
    files: backup
  };
}

async function restoreCurrentDataFiles(backup) {
  if (backup?.dbState) {
    await db.initializeDatabase();
    await db.saveFullState(backup.dbState);
  }
  for (const [file, content] of Object.entries(backup?.files || {})) {
    if (content === null) {
      await fsp.unlink(file).catch(() => {});
      continue;
    }
    await fsp.writeFile(file, content);
  }
}

async function writeTestData(state) {
  await db.initializeDatabase();
  await db.saveFullState(state);
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(STATE_FILE, JSON.stringify(state), 'utf8');
  await fsp.writeFile(JOURNAL_FILE, '', 'utf8');
}

function requestJson(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error(`timeout ${timeoutMs}ms`));
    });
    req.on('error', reject);
  });
}

async function waitForHealth(url, timeoutMs = 60000) {
  const started = Date.now();
  let lastError = null;
  while ((Date.now() - started) < timeoutMs) {
    try {
      const payload = await requestJson(url, 3000);
      if (payload && (payload.ok !== false)) {
        return payload;
      }
    } catch (err) {
      lastError = err;
    }
    await sleep(1000);
  }
  throw lastError || new Error(`Health timeout after ${timeoutMs}ms`);
}

function startServer() {
  const stdout = fs.createWriteStream(SERVER_STDOUT_FILE, { flags: 'a' });
  const stderr = fs.createWriteStream(SERVER_STDERR_FILE, { flags: 'a' });
  const server = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(SERVER_PORT)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.pipe(stdout);
  server.stderr.pipe(stderr);
  return { server, stdout, stderr };
}

async function stopServer(handle) {
  if (!handle?.server) return;
  const { server, stdout, stderr } = handle;
  if (!server.killed) {
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      sleep(5000)
    ]);
    if (!server.killed) {
      server.kill('SIGKILL');
    }
  }
  stdout?.end();
  stderr?.end();
}

function createSummaryStore() {
  return {
    runId: RUN_ID,
    startedAt: new Date().toISOString(),
    assumption: `Scenario lance sur ${TOTAL_SESSIONS} sessions (${TOTAL_MANAGERS} gestionnaires, ${TOTAL_ADMINS} admins, ${TOTAL_CLIENTS} clients).`,
    baseUrl: BASE_URL,
    durationMs: TEST_DURATION_MS,
    scenario: {
      managers: TOTAL_MANAGERS,
      admins: TOTAL_ADMINS,
      clients: TOTAL_CLIENTS
    },
    targetVolume: {
      clients: TARGET_CLIENTS,
      dossiers: TARGET_DOSSIERS,
      audience: TARGET_AUDIENCE,
      diligence: TARGET_DILIGENCE
    },
    fixture: {
      source: FIXTURE_SOURCE
    },
    phase: 'init',
    opening: {
      expected: TOTAL_SESSIONS,
      opened: 0,
      inFlight: []
    },
    dataStats: null,
    events: [],
    actionStats: {},
    sessionStats: [],
    uiFreezeEvents: [],
    requestFailures: [],
    pageErrors: [],
    consoleErrors: [],
    notes: [],
    samples: [],
    finalStatus: 'running'
  };
}

function pushLimited(list, item, max = 400) {
  list.push(item);
  if (list.length > max) {
    list.splice(0, list.length - max);
  }
}

function recordAction(summary, session, name, durationMs, ok, extra = {}) {
  if (!summary.actionStats[name]) {
    summary.actionStats[name] = {
      count: 0,
      success: 0,
      failure: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
      routes: {}
    };
  }
  const entry = summary.actionStats[name];
  entry.count += 1;
  entry.success += ok ? 1 : 0;
  entry.failure += ok ? 0 : 1;
  entry.totalDurationMs += durationMs;
  entry.maxDurationMs = Math.max(entry.maxDurationMs, durationMs);
  const route = String(extra.route || session.lastRoute || '').trim() || 'unknown';
  entry.routes[route] = (entry.routes[route] || 0) + 1;
  pushLimited(summary.events, {
    at: new Date().toISOString(),
    session: session.username,
    role: session.role,
    action: name,
    durationMs,
    ok,
    route,
    error: extra.error || '',
    details: extra.details || null
  }, 600);
}

function buildOperatorProfiles() {
  return [
    ...Array.from({ length: 6 }, () => 'export-audience'),
    ...Array.from({ length: 4 }, () => 'export-salle'),
    ...Array.from({ length: 2 }, () => 'export-suivi'),
    ...Array.from({ length: 2 }, () => 'export-diligence'),
    ...Array.from({ length: 3 }, () => 'modify-dossier'),
    ...Array.from({ length: 3 }, () => 'modify-audience')
  ];
}

function createUserPlan() {
  const operatorProfiles = buildOperatorProfiles();
  const users = [];
  if (USE_FIXED_APP_USERS) {
    FIXED_MANAGER_USERS.slice(0, TOTAL_MANAGERS).forEach((user, index) => {
      users.push({
        username: user.username,
        password: user.password,
        role: user.role,
        profile: operatorProfiles[index]
      });
    });
    FIXED_ADMIN_USERS.slice(0, TOTAL_ADMINS).forEach((user, index) => {
      users.push({
        username: user.username,
        password: user.password,
        role: user.role,
        profile: operatorProfiles[TOTAL_MANAGERS + index]
      });
    });
    for (let index = FIXED_MANAGER_USERS.length; index < TOTAL_MANAGERS; index += 1) {
      users.push({
        username: `manager${index + 1}`,
        password: '1234',
        role: 'manager',
        profile: operatorProfiles[index]
      });
    }
    for (let index = FIXED_ADMIN_USERS.length; index < TOTAL_ADMINS; index += 1) {
      users.push({
        username: `admin${index + 1}`,
        password: '1234',
        role: 'admin',
        profile: operatorProfiles[TOTAL_MANAGERS + index]
      });
    }
  } else {
    for (let index = 0; index < TOTAL_MANAGERS; index += 1) {
      users.push({
        username: index === 0 ? 'manager' : `manager${index + 1}`,
        password: '1234',
        role: 'manager',
        profile: operatorProfiles[index]
      });
    }
    for (let index = 0; index < TOTAL_ADMINS; index += 1) {
      users.push({
        username: `admin${index + 1}`,
        password: '1234',
        role: 'admin',
        profile: operatorProfiles[TOTAL_MANAGERS + index]
      });
    }
  }
  for (let index = 0; index < TOTAL_CLIENTS; index += 1) {
    users.push({
      username: `client${index + 1}`,
      password: '1234',
      role: 'client',
      profile: 'browse'
    });
  }
  return users;
}

async function safePullPageMetrics(session, summary) {
  const started = Date.now();
  try {
    const payload = await session.page.evaluate(() => {
      if (typeof window.__realBenchPullMetrics !== 'function') {
        return {
          maxRafGap: 0,
          maxIntervalGap: 0,
          freezeEvents: [],
          routeSamples: [],
          route: ''
        };
      }
      return window.__realBenchPullMetrics();
    });
    const evalDurationMs = Date.now() - started;
    const route = String(payload?.route || '').trim();
    if (route) {
      session.lastRoute = route;
    }
    const freezeEvents = Array.isArray(payload?.freezeEvents) ? payload.freezeEvents : [];
    freezeEvents.forEach((event) => {
      const enriched = {
        session: session.username,
        role: session.role,
        profile: session.profile,
        route: String(event?.route || route || session.lastRoute || '').trim() || 'unknown',
        kind: event?.kind || 'unknown',
        gap: Number(event?.gap || 0),
        hardFreeze: Number(event?.gap || 0) >= HARD_FREEZE_THRESHOLD_MS,
        at: event?.at || new Date().toISOString()
      };
      pushLimited(summary.uiFreezeEvents, enriched, 600);
      session.freezeCount += 1;
      if (enriched.hardFreeze) {
        session.hardFreezeCount += 1;
      }
    });
    session.maxRafGap = Math.max(session.maxRafGap, Number(payload?.maxRafGap || 0));
    session.maxIntervalGap = Math.max(session.maxIntervalGap, Number(payload?.maxIntervalGap || 0));
    if (evalDurationMs >= 2500) {
      pushLimited(summary.notes, {
        at: new Date().toISOString(),
        type: 'slow-metrics-pull',
        session: session.username,
        durationMs: evalDurationMs,
        route: session.lastRoute || route || 'unknown'
      }, 200);
    }
  } catch (err) {
    pushLimited(summary.notes, {
      at: new Date().toISOString(),
      type: 'metrics-pull-failed',
      session: session.username,
      message: err.message
    }, 200);
  }
}

function attachPageListeners(session, summary) {
  session.page.on('requestfailed', (request) => {
    const failure = {
      at: new Date().toISOString(),
      session: session.username,
      role: session.role,
      profile: session.profile,
      route: session.lastRoute || 'unknown',
      url: request.url(),
      method: request.method(),
      errorText: request.failure()?.errorText || 'unknown'
    };
    pushLimited(summary.requestFailures, failure, 300);
    session.requestFailureCount += 1;
  });
  session.page.on('pageerror', (err) => {
    const item = {
      at: new Date().toISOString(),
      session: session.username,
      role: session.role,
      route: session.lastRoute || 'unknown',
      message: err.message
    };
    pushLimited(summary.pageErrors, item, 200);
    session.pageErrorCount += 1;
  });
  session.page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const item = {
      at: new Date().toISOString(),
      session: session.username,
      role: session.role,
      route: session.lastRoute || 'unknown',
      message: msg.text()
    };
    pushLimited(summary.consoleErrors, item, 250);
    session.consoleErrorCount += 1;
  });
}

async function createSession(browser, user, summary) {
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 900 },
    locale: 'fr-FR',
    userAgent: `CabinetRealBench/${RUN_ID}`
  });
  const page = await context.newPage();
  await page.addInitScript({ content: MONITOR_INIT_SCRIPT });
  const session = {
    username: user.username,
    password: user.password,
    role: user.role,
    profile: user.profile,
    context,
    page,
    lastRoute: '',
    actionCount: 0,
    actionFailureCount: 0,
    freezeCount: 0,
    hardFreezeCount: 0,
    requestFailureCount: 0,
    pageErrorCount: 0,
    consoleErrorCount: 0,
    maxRafGap: 0,
    maxIntervalGap: 0
  };
  attachPageListeners(session, summary);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: SESSION_LOGIN_TIMEOUT_MS });
  await page.waitForSelector('#username', { timeout: APP_INIT_TIMEOUT_MS });
  await page.waitForFunction(() => {
    try {
      return typeof login === 'function' && typeof showView === 'function';
    } catch {
      return false;
    }
  }, { timeout: APP_INIT_TIMEOUT_MS });
  await page.waitForFunction(() => {
    try {
      return typeof hasLoadedState === 'undefined' ? true : hasLoadedState === true;
    } catch {
      return false;
    }
  }, { timeout: APP_INIT_TIMEOUT_MS });
  await page.fill('#username', session.username);
  await page.fill('#password', session.password);
  await page.click('#loginBtn');
  try {
    await page.waitForFunction(() => {
      const loginScreen = document.querySelector('#loginScreen');
      const appContent = document.querySelector('#appContent');
      const loginHidden = !loginScreen || window.getComputedStyle(loginScreen).display === 'none';
      const appVisible = !!appContent && window.getComputedStyle(appContent).display !== 'none';
      let authenticated = false;
      try {
        authenticated = !!currentUser;
      } catch {}
      return loginHidden && appVisible && authenticated;
    }, { timeout: SESSION_LOGIN_TIMEOUT_MS });
  } catch (err) {
    const diagnostics = await page.evaluate(() => {
      const readDisplay = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return 'missing';
        return window.getComputedStyle(node).display || '';
      };
      let authenticated = false;
      let username = '';
      let role = '';
      let initReady = false;
      let route = '';
      try {
        authenticated = !!currentUser;
        username = String(currentUser?.username || '');
        role = String(currentUser?.role || '');
      } catch {}
      try {
        initReady = typeof hasLoadedState === 'undefined' ? false : hasLoadedState === true;
      } catch {}
      try {
        route = typeof currentView === 'string' ? currentView : '';
      } catch {}
      return {
        loginScreenDisplay: readDisplay('#loginScreen'),
        appContentDisplay: readDisplay('#appContent'),
        logoutButtonDisplay: readDisplay('#logoutBtn'),
        errorMessage: String(document.querySelector('#errorMsg')?.textContent || '').trim(),
        authenticated,
        username,
        role,
        initReady,
        route
      };
    }).catch(() => null);
    throw new Error(`Login readiness timeout for ${session.username}: ${err.message}; diagnostics=${JSON.stringify(diagnostics)}`);
  }
  await page.waitForTimeout(2000);
  await safePullPageMetrics(session, summary);
  return session;
}

async function openSessionsInBatches(browser, userPlan, summary, sessions, startedAtMs) {
  for (let index = 0; index < userPlan.length; index += SESSION_OPEN_BATCH) {
    const batch = userPlan.slice(index, index + SESSION_OPEN_BATCH);
    summary.phase = 'opening-sessions';
    summary.opening.inFlight = batch.map((user) => user.username);
    await writeProgress(summary, sessions, startedAtMs);
    const createdBatch = await Promise.all(batch.map(async (user) => {
      const session = await createSession(browser, user, summary);
      sessions.push(session);
      summary.opening.opened = sessions.length;
      await writeProgress(summary, sessions, startedAtMs);
      return session;
    }));
    summary.opening.opened = sessions.length;
    summary.opening.inFlight = [];
    await writeProgress(summary, sessions, startedAtMs);
    if ((index + SESSION_OPEN_BATCH) < userPlan.length) {
      await sleep(SESSION_OPEN_PAUSE_MS);
    }
    void createdBatch;
  }
}

async function showView(session, view) {
  const route = await session.page.evaluate(async (targetView) => {
    if (typeof showView === 'function') {
      showView(targetView, { force: true });
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
    try {
      return typeof currentView === 'string' ? currentView : targetView;
    } catch {
      return targetView;
    }
  }, view);
  session.lastRoute = String(route || view).trim();
  return session.lastRoute;
}

async function finalizeDownload(download) {
  if (!download) return null;
  try {
    await download.path();
  } catch {}
  await download.delete().catch(() => {});
  return download.suggestedFilename();
}

function captureDownloadResult(page, timeoutMs = 180000) {
  return page.waitForEvent('download', { timeout: timeoutMs })
    .then(async (download) => ({
      ok: true,
      filename: await finalizeDownload(download)
    }))
    .catch((error) => ({
      ok: false,
      error
    }));
}

async function doAudienceExport(session) {
  await showView(session, 'audience');
  const downloadPromise = captureDownloadResult(session.page, 180000);
  const details = await session.page.evaluate(async () => {
    const rows = typeof getAudienceRowsForRegularExport === 'function'
      ? getAudienceRowsForRegularExport().length
      : null;
    await exportAudienceRegularXLS();
    return { rows };
  });
  const downloadResult = await downloadPromise;
  if (!downloadResult.ok) {
    throw downloadResult.error;
  }
  return {
    route: session.lastRoute,
    details: {
      ...details,
      filename: downloadResult.filename
    }
  };
}

async function doSalleExport(session) {
  await showView(session, 'salle');
  const details = await session.page.evaluate(() => {
    const buttons = [...document.querySelectorAll('.btn-salle-export')];
    return {
      count: buttons.length
    };
  });
  if (!details.count) {
    return {
      route: session.lastRoute,
      details: {
        skipped: true,
        reason: 'no-salle-export-button'
      }
    };
  }
  const downloadPromise = captureDownloadResult(session.page, 180000);
  await session.page.evaluate(() => {
    const button = document.querySelector('.btn-salle-export');
    if (!button) throw new Error('Aucun bouton export salle visible');
    button.click();
  });
  const downloadResult = await downloadPromise;
  if (!downloadResult.ok) {
    throw downloadResult.error;
  }
  return {
    route: session.lastRoute,
    details: {
      ...details,
      filename: downloadResult.filename
    }
  };
}

async function doSuiviExport(session) {
  await showView(session, 'suivi');
  const prep = await session.page.evaluate(() => {
    if (typeof setAllFilteredSuiviRowsForPrint === 'function') {
      setAllFilteredSuiviRowsForPrint(false);
    }
    if (typeof setAllVisibleSuiviRowsForPrint === 'function') {
      setAllVisibleSuiviRowsForPrint(true);
    }
    const selected = typeof suiviPrintSelection !== 'undefined' && suiviPrintSelection
      ? suiviPrintSelection.size
      : null;
    return { selected };
  });
  const downloadPromise = captureDownloadResult(session.page, 180000);
  await session.page.evaluate(async () => {
    await exportSuiviSelectedXLS();
  });
  const downloadResult = await downloadPromise;
  if (!downloadResult.ok) {
    throw downloadResult.error;
  }
  return {
    route: session.lastRoute,
    details: {
      ...prep,
      filename: downloadResult.filename
    }
  };
}

async function doDiligenceExport(session) {
  await showView(session, 'diligence');
  const prep = await session.page.evaluate(() => {
    if (typeof setAllFilteredDiligenceRowsForPrint === 'function') {
      setAllFilteredDiligenceRowsForPrint(false);
    }
    if (typeof setAllVisibleDiligenceRowsForPrint === 'function') {
      setAllVisibleDiligenceRowsForPrint(true);
    }
    const selected = typeof diligencePrintSelection !== 'undefined' && diligencePrintSelection
      ? diligencePrintSelection.size
      : null;
    return { selected };
  });
  const downloadPromise = captureDownloadResult(session.page, 180000);
  await session.page.evaluate(async () => {
    await exportDiligenceXLS();
  });
  const downloadResult = await downloadPromise;
  if (!downloadResult.ok) {
    throw downloadResult.error;
  }
  return {
    route: session.lastRoute,
    details: {
      ...prep,
      filename: downloadResult.filename
    }
  };
}

async function doDossierModify(session) {
  await showView(session, 'clients');
  const details = await session.page.evaluate((seed) => {
    const clients = Array.isArray(AppState?.clients) ? AppState.clients : [];
    if (!clients.length) throw new Error('Aucun client');
    const clientIndex = seed % clients.length;
    const client = clients[clientIndex];
    const dossiers = Array.isArray(client?.dossiers) ? client.dossiers : [];
    if (!dossiers.length) throw new Error('Aucun dossier');
    const dossierIndex = (seed * 7) % dossiers.length;
    const dossier = dossiers[dossierIndex];
    dossier.note = `bench-note-${seed}-${Date.now()}`;
    dossier.avancement = `bench-avancement-${seed % 9}`;
    handleDossierDataChange({ audience: false, rerenderLinked: true });
    refreshPrimaryViews({ includeRecycle: true, refreshClientDropdown: false });
    persistDossierReferenceNow(client.id, dossier, { source: 'real-bench-modify-dossier' }).catch(() => {});
    return {
      clientId: client.id,
      dossierRef: dossier.referenceClient || '',
      avancement: dossier.avancement
    };
  }, session.actionCount + 1);
  return {
    route: session.lastRoute,
    details
  };
}

async function doAudienceModify(session) {
  await showView(session, 'audience');
  const details = await session.page.evaluate((seed) => {
    const rows = typeof getAudienceRows === 'function' ? getAudienceRows() : [];
    if (!rows.length) throw new Error('Aucune ligne audience');
    const row = rows[seed % rows.length];
    const client = AppState.clients?.[row.ci];
    const dossier = client?.dossiers?.[row.di];
    if (!client || !dossier) throw new Error('Audience dossier introuvable');
    const proc = getAudienceProcedure(row.ci, row.di, row.procKey);
    const day = String((seed % 27) + 1).padStart(2, '0');
    proc.audience = `2026-04-${day}`;
    proc.juge = `Bench Judge ${(seed % 12) + 1}`;
    proc.sort = seed % 2 === 0 ? 'Renvoi' : 'En cours';
    proc.instruction = `Instruction bench ${(seed % 7) + 1}`;
    handleDossierDataChange({ audience: true, rerenderLinked: true });
    refreshPrimaryViews({ includeSalle: true });
    persistDossierReferenceNow(client.id, dossier, { source: 'real-bench-modify-audience' }).catch(() => {});
    return {
      clientId: client.id,
      dossierRef: dossier.referenceClient || '',
      procedure: row.procKey,
      judge: proc.juge
    };
  }, session.actionCount + 1);
  return {
    route: session.lastRoute,
    details
  };
}

async function doBrowse(session) {
  const routes = session.role === 'client'
    ? ['dashboard', 'suivi']
    : ['dashboard', 'suivi', 'audience'];
  const target = routes[session.actionCount % routes.length];
  await showView(session, target);
  const details = await session.page.evaluate(async (seed) => {
    const candidates = [
      '#mainContent',
      '#suiviTableContainer',
      '#audienceTableContainer',
      '.table-container'
    ];
    const selector = candidates.find((item) => document.querySelector(item));
    const node = selector ? document.querySelector(selector) : null;
    if (node) {
      node.scrollTop = ((seed % 4) + 1) * 320;
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      selector: selector || '',
      scrollTop: node ? node.scrollTop : 0
    };
  }, session.actionCount + 1);
  return {
    route: session.lastRoute,
    details
  };
}

async function runSessionAction(session) {
  switch (session.profile) {
    case 'export-audience':
      return doAudienceExport(session);
    case 'export-salle':
      return doSalleExport(session);
    case 'export-suivi':
      return doSuiviExport(session);
    case 'export-diligence':
      return doDiligenceExport(session);
    case 'modify-dossier':
      return doDossierModify(session);
    case 'modify-audience':
      return doAudienceModify(session);
    default:
      return doBrowse(session);
  }
}

async function runSessionLoop(session, summary, until) {
  while (Date.now() < until) {
    const actionName = session.profile;
    const started = Date.now();
    let ok = false;
    let result = null;
    try {
      result = await runSessionAction(session);
      ok = true;
    } catch (err) {
      session.actionFailureCount += 1;
      pushLimited(summary.notes, {
        at: new Date().toISOString(),
        type: 'action-error',
        session: session.username,
        profile: session.profile,
        route: session.lastRoute || 'unknown',
        message: err.message
      }, 300);
      try {
        await session.page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
        await session.page.waitForTimeout(1200);
      } catch {}
      result = {
        route: session.lastRoute,
        error: err.message,
        details: null
      };
    } finally {
      session.actionCount += 1;
      const durationMs = Date.now() - started;
      recordAction(summary, session, actionName, durationMs, ok, {
        route: result?.route || session.lastRoute,
        error: result?.error || '',
        details: result?.details || null
      });
      await safePullPageMetrics(session, summary);
    }
    const pauseMs = randomInt(ACTION_PAUSE_MIN_MS, ACTION_PAUSE_MAX_MS);
    await sleep(Math.min(pauseMs, Math.max(0, until - Date.now())));
  }
}

function buildProgressSnapshot(summary, sessions, startedAt) {
  const elapsedMs = Date.now() - startedAt;
  const totalActionCount = sessions.reduce((total, session) => total + session.actionCount, 0);
  const actionFailureCount = sessions.reduce((total, session) => total + session.actionFailureCount, 0);
  const uiFreezeCount = summary.uiFreezeEvents.length;
  const hardFreezeCount = summary.uiFreezeEvents.filter((entry) => entry.hardFreeze).length;
  const routeFreezeCounts = {};
  summary.uiFreezeEvents.forEach((entry) => {
    const route = entry.route || 'unknown';
    routeFreezeCounts[route] = (routeFreezeCounts[route] || 0) + 1;
  });
  return {
    runId: summary.runId,
    startedAt: summary.startedAt,
    elapsedMs,
    assumption: summary.assumption,
    phase: summary.phase,
    opening: summary.opening,
    dataStats: summary.dataStats,
    actions: {
      total: totalActionCount,
      failed: actionFailureCount
    },
    errors: {
      requestFailures: summary.requestFailures.length,
      pageErrors: summary.pageErrors.length,
      consoleErrors: summary.consoleErrors.length
    },
    ui: {
      freezeCount: uiFreezeCount,
      hardFreezeCount,
      routeFreezeCounts
    },
    sessions: sessions.map((session) => ({
      username: session.username,
      role: session.role,
      profile: session.profile,
      actions: session.actionCount,
      failures: session.actionFailureCount,
      lastRoute: session.lastRoute,
      maxRafGap: session.maxRafGap,
      maxIntervalGap: session.maxIntervalGap
    }))
  };
}

async function writeProgress(summary, sessions, startedAt) {
  const snapshot = buildProgressSnapshot(summary, sessions, startedAt);
  await fsp.writeFile(PROGRESS_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
}

function computeFinalVerdict(summary, sessions) {
  const totalActions = sessions.reduce((total, session) => total + session.actionCount, 0);
  const totalActionFailures = sessions.reduce((total, session) => total + session.actionFailureCount, 0);
  const uiFreezeCount = summary.uiFreezeEvents.length;
  const hardFreezeCount = summary.uiFreezeEvents.filter((entry) => entry.hardFreeze).length;
  const maxActionDurationByType = {};
  Object.entries(summary.actionStats).forEach(([name, stats]) => {
    maxActionDurationByType[name] = stats.maxDurationMs;
  });
  const routeFreezeCounts = {};
  summary.uiFreezeEvents.forEach((entry) => {
    const route = entry.route || 'unknown';
    routeFreezeCounts[route] = (routeFreezeCounts[route] || 0) + 1;
  });
  const topFreezeRoutes = Object.entries(routeFreezeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([route, count]) => ({ route, count }));
  const stable = (
    summary.requestFailures.length === 0
    && summary.pageErrors.length === 0
    && summary.consoleErrors.length <= 3
    && totalActionFailures === 0
    && hardFreezeCount === 0
    && uiFreezeCount <= 12
  );
  return {
    stable,
    totalActions,
    totalActionFailures,
    requestFailures: summary.requestFailures.length,
    pageErrors: summary.pageErrors.length,
    consoleErrors: summary.consoleErrors.length,
    uiFreezeCount,
    hardFreezeCount,
    maxActionDurationByType,
    topFreezeRoutes
  };
}

async function main() {
  await ensureRunDir();
  const summary = createSummaryStore();
  const backup = await backupCurrentDataFiles();
  let serverHandle = null;
  let browser = null;
  let sessions = [];
  const startedAtMs = Date.now();
  try {
    const prepared = await prepareTestState();
    summary.dataStats = prepared.stats;
    summary.fixture.addedAudience = prepared.addAudienceResult.added;
    summary.fixture.finalAudience = prepared.addAudienceResult.finalAudience;
    await writeTestData(prepared.state);

    summary.phase = 'starting-server';
    await writeProgress(summary, sessions, startedAtMs);
    serverHandle = startServer();
    await waitForHealth(`${BASE_URL}/api/health`, 60000);

    summary.phase = 'launching-browser';
    await writeProgress(summary, sessions, startedAtMs);
    browser = await chromium.launch({
      headless: true,
      executablePath: CHROME_EXECUTABLE,
      args: [
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--disable-features=Translate,OptimizationHints,MediaRouter',
        '--disable-sync',
        '--disable-component-update'
      ]
    });

    const userPlan = createUserPlan();
    await openSessionsInBatches(browser, userPlan, summary, sessions, startedAtMs);

    summary.phase = 'running-workload';
    const endAt = Date.now() + TEST_DURATION_MS;
    const poller = setInterval(() => {
      writeProgress(summary, sessions, startedAtMs).catch(() => {});
    }, POLL_INTERVAL_MS);
    try {
      await Promise.all(sessions.map((session) => runSessionLoop(session, summary, endAt)));
    } finally {
      clearInterval(poller);
    }

    for (const session of sessions) {
      await safePullPageMetrics(session, summary);
    }

    summary.sessionStats = sessions.map((session) => ({
      username: session.username,
      role: session.role,
      profile: session.profile,
      actions: session.actionCount,
      failures: session.actionFailureCount,
      requestFailures: session.requestFailureCount,
      pageErrors: session.pageErrorCount,
      consoleErrors: session.consoleErrorCount,
      freezeCount: session.freezeCount,
      hardFreezeCount: session.hardFreezeCount,
      maxRafGap: session.maxRafGap,
      maxIntervalGap: session.maxIntervalGap,
      lastRoute: session.lastRoute
    }));

    const verdict = computeFinalVerdict(summary, sessions);
    summary.verdict = verdict;
    summary.finalStatus = verdict.stable ? 'stable' : 'unstable';
    summary.phase = 'finished';
    summary.finishedAt = new Date().toISOString();
    summary.notes.push({
      at: new Date().toISOString(),
      type: 'verdict',
      message: verdict.stable ? 'Benchmark stable' : 'Benchmark unstable'
    });

    await writeProgress(summary, sessions, startedAtMs);
    await fsp.writeFile(REPORT_FILE, JSON.stringify(summary, null, 2), 'utf8');
    process.stdout.write(`${JSON.stringify({
      ok: true,
      reportFile: REPORT_FILE,
      progressFile: PROGRESS_FILE,
      status: summary.finalStatus,
      verdict
    }, null, 2)}\n`);
  } catch (err) {
    summary.finalStatus = 'failed';
    summary.phase = 'failed';
    summary.finishedAt = new Date().toISOString();
    summary.error = {
      message: err.message,
      stack: err.stack
    };
    await fsp.writeFile(REPORT_FILE, JSON.stringify(summary, null, 2), 'utf8').catch(() => {});
    process.stderr.write(`Benchmark failed: ${err.stack || err.message}\n`);
    process.exitCode = 1;
  } finally {
    for (const session of sessions) {
      await session.context.close().catch(() => {});
    }
    await browser?.close().catch(() => {});
    await stopServer(serverHandle);
    await restoreCurrentDataFiles(backup).catch(() => {});
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  prepareTestState,
  computeStateStats
};
