const fs = require('fs/promises');
const path = require('path');
const { performance } = require('perf_hooks');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');
const { buildPayload } = require('./benchmark_large_state');

const SOURCE_ROOT = path.join(__dirname, '..');

function readCountArg(flag, fallback, options = {}) {
  const arg = process.argv.find((value) => value.startsWith(`${flag}=`));
  const rawValue = arg ? arg.slice(flag.length + 1) : process.env[flag.replace(/^--/, '').toUpperCase()];
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  if (options.allowZero === true && parsed === 0) return 0;
  return parsed > 0 ? Math.floor(parsed) : fallback;
}

const CLIENT_COUNT = readCountArg('--clients', 600);
const DOSSIER_COUNT = readCountArg('--dossiers', 40000);
const AUDIENCE_COUNT = readCountArg('--audiences', 60000);
const USER_COUNT = readCountArg('--users', 20);
const ADMIN_COUNT = readCountArg('--admins', 10, { allowZero: true });
const MANAGER_COUNT = readCountArg('--managers', 2, { allowZero: true });
const VIEWER_COUNT = readCountArg('--clients-users', 8, { allowZero: true });
const DURATION_MINUTES = readCountArg('--minutes', 15);
const PORT = readCountArg('--port', 3900);
const HOST = process.env.HOST || '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;
const DURATION_MS = DURATION_MINUTES * 60 * 1000;
const PROGRESS_EVERY_MS = 30000;
const HTTP_TIMEOUT_MS = 120000;
const IMPORT_CHUNK_BYTES = 256 * 1024;
const RUN_ROOT = path.join(SOURCE_ROOT, '.stress-runs', `api-stress-${Date.now()}`);
const TEMP_SERVER_ROOT = path.join(RUN_ROOT, 'server');
const RESULTS_PATH = path.join(RUN_ROOT, 'results.json');

if ((ADMIN_COUNT + MANAGER_COUNT + VIEWER_COUNT) !== USER_COUNT) {
  throw new Error(`User role total mismatch: admins(${ADMIN_COUNT}) + managers(${MANAGER_COUNT}) + clients-users(${VIEWER_COUNT}) must equal users(${USER_COUNT}).`);
}

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function buildUsers() {
  const users = [];
  for (let i = 1; i <= ADMIN_COUNT; i += 1) {
    users.push({ id: i, username: `admin${i}`, role: 'admin' });
  }
  for (let i = 1; i <= MANAGER_COUNT; i += 1) {
    users.push({ id: ADMIN_COUNT + i, username: i === 1 ? 'walid' : `manager${i}`, role: 'manager' });
  }
  for (let i = 1; i <= VIEWER_COUNT; i += 1) {
    users.push({ id: ADMIN_COUNT + MANAGER_COUNT + i, username: `client${i}`, role: 'client' });
  }
  return users;
}

function buildAuthUsers() {
  return buildUsers().map((user) => ({
    id: user.id,
    username: user.username,
    password: '1234',
    role: user.role,
    clientIds: user.role === 'client' ? [((user.id - 1) % CLIENT_COUNT) + 1] : []
  }));
}

function buildStressDossier(referenceClient, suffix = '') {
  return {
    dateAffectation: '13/03/2026',
    type: 'Auto',
    procedure: 'Restitution',
    referenceClient,
    debiteur: `Stress Debiteur ${suffix || referenceClient}`,
    montant: '12000',
    ww: `WW-${referenceClient}`,
    marque: 'Dacia',
    adresse: 'Stress Adresse',
    ville: 'Casablanca',
    statut: 'En cours',
    avancement: 'Stress test',
    note: `stress-${suffix || referenceClient}`,
    procedureDetails: {
      Restitution: {
        referenceClient,
        audience: '14/03/2026',
        depotLe: '13/03/2026',
        tribunal: 'Casablanca',
        sort: 'Renvoi',
        color: 'blue'
      }
    },
    history: [],
    montantByProcedure: {}
  };
}

function summarizeMetrics(metrics) {
  const summary = {};
  for (const [action, entries] of Object.entries(metrics)) {
    const durations = entries.durations;
    summary[action] = {
      attempted: entries.attempted,
      succeeded: entries.succeeded,
      failed: entries.failed,
      conflicts: entries.conflicts,
      avgMs: durations.length ? Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1)) : null,
      p95Ms: durations.length ? percentile(durations, 95) : null,
      maxMs: durations.length ? Math.max(...durations) : null
    };
  }
  return summary;
}

function formatProgress(summary) {
  return Object.entries(summary)
    .map(([action, stats]) => `${action}:${stats.succeeded}/${stats.attempted} ok${stats.conflicts ? ` c${stats.conflicts}` : ''}`)
    .join(' | ');
}

async function copyServer() {
  await fs.mkdir(RUN_ROOT, { recursive: true });
  await fs.cp(path.join(SOURCE_ROOT, 'server'), TEMP_SERVER_ROOT, { recursive: true });
}

async function writeInitialState() {
  const payload = buildPayload({
    clients: CLIENT_COUNT,
    dossiers: DOSSIER_COUNT,
    audiences: AUDIENCE_COUNT
  });
  payload.users = buildAuthUsers();
  payload.version = 0;
  payload.updatedAt = nowIso();

  const statePath = path.join(TEMP_SERVER_ROOT, 'data', 'state.json');
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(payload), 'utf8');
  return statePath;
}

async function waitForServer(timeoutMs = 30000) {
  const startedAt = Date.now();
  for (;;) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {}
    if ((Date.now() - startedAt) > timeoutMs) throw new Error('Server did not become ready in time.');
    await sleep(250);
  }
}

async function requestJson(url, options = {}, timeoutMs = HTTP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: response.ok, status: response.status, text, json };
  } finally {
    clearTimeout(timeout);
  }
}

async function getState() {
  const response = await requestJson(`${BASE_URL}/api/state`, { method: 'GET', headers: {} });
  if (!response.ok || !response.json) {
    throw new Error(`GET /api/state failed with ${response.status}`);
  }
  return response.json;
}

async function getHealth() {
  const response = await requestJson(`${BASE_URL}/api/health`, { method: 'GET', headers: {} }, 20000);
  if (!response.ok) {
    throw new Error(`GET /api/health failed with ${response.status}`);
  }
  return response.json;
}

async function createDossierAction(shared) {
  const clientId = randomInt(1, Math.max(1, shared.currentMaxClientId));
  const referenceClient = `STRESS-DOS-${shared.nextDossierId += 1}`;
  const dossier = buildStressDossier(referenceClient, `create-${clientId}`);
  const response = await requestJson(`${BASE_URL}/api/state/dossiers`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'create',
      clientId,
      dossier,
      _sourceId: `stress-create-${referenceClient}`
    })
  });

  if (!response.ok) throw new Error(`POST /api/state/dossiers create failed with ${response.status}`);
  shared.expectedDossierRefs.add(referenceClient);
  return { clientId, referenceClient };
}

async function audienceDraftAction(shared) {
  const key = `stress-${shared.nextDraftId += 1}`;
  const response = await requestJson(`${BASE_URL}/api/state/audience-draft`, {
    method: 'POST',
    body: JSON.stringify({
      audienceDraft: {
        key,
        label: `Draft ${key}`,
        updatedAt: nowIso()
      },
      _sourceId: `stress-draft-${key}`
    })
  });
  if (!response.ok) throw new Error(`POST /api/state/audience-draft failed with ${response.status}`);
  return { key };
}

async function exportStateAction() {
  const state = await getState();
  const clientTotal = Array.isArray(state.clients) ? state.clients.length : 0;
  let dossierTotal = 0;
  for (const client of Array.isArray(state.clients) ? state.clients : []) {
    dossierTotal += Array.isArray(client?.dossiers) ? client.dossiers.length : 0;
  }
  return { clientTotal, dossierTotal, version: state.version };
}

async function importWholeStateAction(shared) {
  const currentState = await getState();
  const nextClientId = shared.currentMaxClientId + 1;
  const clientLabel = `Stress Client ${nextClientId}`;
  const dossierRef = `STRESS-IMP-${shared.nextImportId += 1}`;
  const nextState = {
    ...currentState,
    clients: [
      ...(Array.isArray(currentState.clients) ? currentState.clients : []),
      {
        id: nextClientId,
        name: clientLabel,
        dossiers: [buildStressDossier(dossierRef, `import-${nextClientId}`)]
      }
    ],
    updatedAt: nowIso()
  };

  const raw = JSON.stringify(nextState);
  const total = Math.max(1, Math.ceil(Buffer.byteLength(raw, 'utf8') / IMPORT_CHUNK_BYTES));
  const uploadId = randomUUID();
  for (let index = 0; index < total; index += 1) {
    const start = index * IMPORT_CHUNK_BYTES;
    const end = start + IMPORT_CHUNK_BYTES;
    const chunk = raw.slice(start, end);
    const response = await requestJson(`${BASE_URL}/api/state/upload-chunk`, {
      method: 'POST',
      body: JSON.stringify({
        uploadId,
        index,
        total,
        chunk,
        _sourceId: `stress-import-${uploadId}`
      })
    });
    if (!response.ok) {
      throw new Error(`POST /api/state/upload-chunk failed with ${response.status}`);
    }
  }

  shared.currentMaxClientId = nextClientId;
  shared.expectedClientNames.add(clientLabel);
  shared.expectedImportedDossierRefs.add(dossierRef);
  return { nextClientId, clientLabel, dossierRef, chunks: total };
}

async function createClientViaStateAction(shared) {
  const currentState = await getState();
  const nextClientId = shared.currentMaxClientId + 1;
  const clientLabel = `Stress Manual Client ${nextClientId}`;
  const nextState = {
    ...currentState,
    clients: [
      ...(Array.isArray(currentState.clients) ? currentState.clients : []),
      {
        id: nextClientId,
        name: clientLabel,
        dossiers: [buildStressDossier(`STRESS-MAN-${nextClientId}`, `manual-${nextClientId}`)]
      }
    ],
    updatedAt: nowIso(),
    _baseVersion: Number(currentState.version) || 0,
    _sourceId: `stress-manual-client-${nextClientId}`
  };
  const response = await requestJson(`${BASE_URL}/api/state`, {
    method: 'POST',
    body: JSON.stringify(nextState)
  });
  if (response.status === 409) {
    const error = new Error('STATE_CONFLICT');
    error.code = 'STATE_CONFLICT';
    throw error;
  }
  if (!response.ok) throw new Error(`POST /api/state failed with ${response.status}`);
  shared.currentMaxClientId = nextClientId;
  shared.expectedClientNames.add(clientLabel);
  return { nextClientId, clientLabel };
}

function createMetrics() {
  const actions = ['health', 'exportState', 'createDossier', 'audienceDraft', 'importWholeState', 'createClientViaState'];
  return Object.fromEntries(actions.map((action) => [action, {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    conflicts: 0,
    durations: []
  }]));
}

function chooseAction(user) {
  const roll = Math.random();
  if (user.role === 'client') {
    if (roll < 0.55) return 'exportState';
    return 'health';
  }
  if (user.role === 'manager') {
    if (roll < 0.30) return 'createDossier';
    if (roll < 0.50) return 'audienceDraft';
    if (roll < 0.70) return 'exportState';
    if (roll < 0.85) return 'createClientViaState';
    return 'importWholeState';
  }
  if (roll < 0.35) return 'createDossier';
  if (roll < 0.55) return 'audienceDraft';
  if (roll < 0.75) return 'exportState';
  if (roll < 0.88) return 'createClientViaState';
  return 'importWholeState';
}

async function runAction(action, shared) {
  switch (action) {
    case 'health':
      return getHealth();
    case 'exportState':
      return exportStateAction();
    case 'createDossier':
      return createDossierAction(shared);
    case 'audienceDraft':
      return audienceDraftAction(shared);
    case 'importWholeState':
      return importWholeStateAction(shared);
    case 'createClientViaState':
      return createClientViaStateAction(shared);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function runWorker(user, shared) {
  while (Date.now() < shared.deadline) {
    const action = chooseAction(user);
    const startedAt = performance.now();
    const entry = shared.metrics[action];
    entry.attempted += 1;
    try {
      await runAction(action, shared);
      entry.succeeded += 1;
      entry.durations.push(Number((performance.now() - startedAt).toFixed(1)));
    } catch (error) {
      entry.failed += 1;
      if (String(error?.code || '').includes('STATE_CONFLICT') || String(error?.message || '').includes('STATE_CONFLICT')) {
        entry.conflicts += 1;
      }
      if (shared.errorSamples.length < 30) {
        shared.errorSamples.push({
          user: user.username,
          role: user.role,
          action,
          message: String(error?.message || error)
        });
      }
      await sleep(user.role === 'client' ? 200 : 350);
    }

    if (Date.now() < shared.deadline) {
      await sleep(user.role === 'client' ? randomInt(80, 220) : randomInt(40, 180));
    }
  }
}

async function loadFinalState() {
  return getState();
}

function countDossiers(state) {
  let total = 0;
  for (const client of Array.isArray(state?.clients) ? state.clients : []) {
    total += Array.isArray(client?.dossiers) ? client.dossiers.length : 0;
  }
  return total;
}

function collectFinalMarkers(state, expectedClientNames, expectedDossierRefs, expectedImportedDossierRefs) {
  const foundClientNames = new Set();
  const foundDossierRefs = new Set();
  const foundImportedDossierRefs = new Set();

  for (const client of Array.isArray(state?.clients) ? state.clients : []) {
    const name = String(client?.name || '').trim();
    if (expectedClientNames.has(name)) foundClientNames.add(name);
    for (const dossier of Array.isArray(client?.dossiers) ? client.dossiers : []) {
      const ref = String(dossier?.referenceClient || '').trim();
      if (expectedDossierRefs.has(ref)) foundDossierRefs.add(ref);
      if (expectedImportedDossierRefs.has(ref)) foundImportedDossierRefs.add(ref);
    }
  }

  return {
    preservedClientNames: foundClientNames.size,
    expectedClientNames: expectedClientNames.size,
    preservedCreatedDossiers: foundDossierRefs.size,
    expectedCreatedDossiers: expectedDossierRefs.size,
    preservedImportedDossiers: foundImportedDossierRefs.size,
    expectedImportedDossiers: expectedImportedDossierRefs.size
  };
}

async function main() {
  await copyServer();
  const initialStatePath = await writeInitialState();
  const users = buildUsers();
  const metrics = createMetrics();
  const shared = {
    metrics,
    deadline: Date.now() + DURATION_MS,
    currentMaxClientId: CLIENT_COUNT,
    nextDossierId: 0,
    nextDraftId: 0,
    nextImportId: 0,
    expectedClientNames: new Set(),
    expectedDossierRefs: new Set(),
    expectedImportedDossierRefs: new Set(),
    errorSamples: []
  };

  const server = spawn('node', ['index.js'], {
    cwd: TEMP_SERVER_ROOT,
    env: {
      ...process.env,
      HOST,
      PORT: String(PORT)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverStdout = '';
  let serverStderr = '';
  server.stdout.on('data', (chunk) => {
    serverStdout += String(chunk);
  });
  server.stderr.on('data', (chunk) => {
    serverStderr += String(chunk);
  });

  const startedAt = Date.now();
  let progressTimer = null;

  try {
    await waitForServer();

    progressTimer = setInterval(() => {
      const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
      const summary = summarizeMetrics(metrics);
      console.log(`[progress ${elapsedSeconds}s] ${formatProgress(summary)}`);
    }, PROGRESS_EVERY_MS);

    await Promise.all(users.map((user) => runWorker(user, shared)));

    const finalState = await loadFinalState();
    const finalSummary = summarizeMetrics(metrics);
    const preservation = collectFinalMarkers(
      finalState,
      shared.expectedClientNames,
      shared.expectedDossierRefs,
      shared.expectedImportedDossierRefs
    );

    const result = {
      baseUrl: BASE_URL,
      runRoot: RUN_ROOT,
      initialStatePath,
      durationMinutes: DURATION_MINUTES,
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: nowIso(),
      config: {
        clients: CLIENT_COUNT,
        dossiers: DOSSIER_COUNT,
        audiences: AUDIENCE_COUNT,
        users: USER_COUNT,
        admins: ADMIN_COUNT,
        managers: MANAGER_COUNT,
        clientUsers: VIEWER_COUNT
      },
      finalCounts: {
        clients: Array.isArray(finalState?.clients) ? finalState.clients.length : 0,
        dossiers: countDossiers(finalState),
        version: Number(finalState?.version) || 0
      },
      metrics: finalSummary,
      preservation,
      errorSamples: shared.errorSamples,
      serverStdout: serverStdout.trim(),
      serverStderr: serverStderr.trim()
    };

    await fs.writeFile(RESULTS_PATH, JSON.stringify(result, null, 2), 'utf8');
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (progressTimer) clearInterval(progressTimer);
    server.kill('SIGINT');
    await sleep(500);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
