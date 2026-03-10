const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const WEB_DIR = path.join(__dirname, '..');

const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const SERVER_BACKUP_RETENTION_COUNT = 20;
const SERVER_BACKUP_MIN_INTERVAL_MS = 3 * 60 * 1000;

const DEFAULT_STATE = {
  clients: [],
  salleAssignments: [],
  users: [],
  audienceDraft: {},
  recycleBin: [],
  recycleArchive: [],
  version: 0,
  updatedAt: new Date().toISOString()
};

let cachedState = null;
let lastBackupSignature = '';
let lastBackupAt = 0;
const sseClients = new Set();

app.use(express.json({ limit: '120mb' }));
app.use(express.static(WEB_DIR, {
  index: false
}));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

async function ensureDataFile() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  try {
    await fsp.access(STATE_FILE, fs.constants.F_OK);
  } catch {
    await writeState(DEFAULT_STATE);
  }
}

async function readState() {
  if (cachedState) return cachedState;
  try {
    const raw = await fsp.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const parsedVersion = Number(parsed?.version);
    cachedState = {
      ...DEFAULT_STATE,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
      version: Number.isFinite(parsedVersion) && parsedVersion >= 0 ? parsedVersion : 0,
      updatedAt: String(parsed?.updatedAt || new Date().toISOString())
    };
    return cachedState;
  } catch {
    cachedState = { ...DEFAULT_STATE };
    return cachedState;
  }
}

function buildBackupSignature(state) {
  try {
    return JSON.stringify({
      clients: Array.isArray(state?.clients) ? state.clients : [],
      salleAssignments: Array.isArray(state?.salleAssignments) ? state.salleAssignments : [],
      users: Array.isArray(state?.users) ? state.users : [],
      audienceDraft: state?.audienceDraft && typeof state.audienceDraft === 'object' ? state.audienceDraft : {},
      recycleBin: Array.isArray(state?.recycleBin) ? state.recycleBin : [],
      recycleArchive: Array.isArray(state?.recycleArchive) ? state.recycleArchive : []
    });
  } catch {
    return '';
  }
}

function buildBackupFileName(ts = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `state_${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}-${pad(ts.getSeconds())}.json`;
}

async function pruneBackupFiles() {
  try {
    const entries = await fsp.readdir(BACKUP_DIR, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort()
      .reverse();
    const extras = files.slice(SERVER_BACKUP_RETENTION_COUNT);
    await Promise.all(extras.map((name) => fsp.unlink(path.join(BACKUP_DIR, name)).catch(() => {})));
  } catch (err) {
    console.warn('Failed to prune state backups:', err);
  }
}

async function maybeWriteBackupSnapshot(state) {
  const now = Date.now();
  const signature = buildBackupSignature(state);
  if (signature && signature === lastBackupSignature) return;
  if (lastBackupAt && (now - lastBackupAt) < SERVER_BACKUP_MIN_INTERVAL_MS) return;

  const snapshot = {
    savedAt: new Date(now).toISOString(),
    ...state
  };
  const backupPath = path.join(BACKUP_DIR, buildBackupFileName(new Date(now)));
  await fsp.writeFile(backupPath, JSON.stringify(snapshot, null, 2), 'utf8');
  lastBackupAt = now;
  lastBackupSignature = signature;
  await pruneBackupFiles();
}

async function writeState(nextState, options = {}) {
  const previousState = options.previousState && typeof options.previousState === 'object'
    ? options.previousState
    : null;
  const previousVersion = Number(previousState?.version);
  const nextVersion = Number.isFinite(previousVersion) && previousVersion >= 0
    ? previousVersion + 1
    : 0;
  const safe = {
    ...DEFAULT_STATE,
    ...(nextState && typeof nextState === 'object' ? nextState : {}),
    version: nextVersion,
    updatedAt: new Date().toISOString()
  };
  const tmpFile = `${STATE_FILE}.tmp`;
  await fsp.writeFile(tmpFile, JSON.stringify(safe), 'utf8');
  await fsp.rename(tmpFile, STATE_FILE);
  cachedState = safe;
  await maybeWriteBackupSnapshot(safe);
  return safe;
}

function broadcastStateUpdated(payload) {
  const data = `event: state-updated\ndata: ${JSON.stringify({
    version: Number(payload?.version) || 0,
    updatedAt: payload?.updatedAt || new Date().toISOString(),
    sourceId: payload?.sourceId || '',
    patchKind: payload?.patchKind || '',
    patch: payload?.patch && typeof payload.patch === 'object' ? payload.patch : null
  })}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(data);
    } catch {
      sseClients.delete(res);
    }
  });
}

function extractBaseVersion(body) {
  const rawBaseVersion = Number(body?._baseVersion);
  return Number.isFinite(rawBaseVersion) && rawBaseVersion >= 0 ? rawBaseVersion : null;
}

function buildConflictResponse(state) {
  return {
    ok: false,
    code: 'STATE_CONFLICT',
    message: 'Server state is newer than the submitted state.',
    version: Number(state?.version) || 0,
    updatedAt: state?.updatedAt || new Date().toISOString()
  };
}

function sanitizePatchArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizePatchObject(value) {
  return value && typeof value === 'object' ? value : null;
}

function cloneClients(state) {
  return Array.isArray(state?.clients)
    ? JSON.parse(JSON.stringify(state.clients))
    : [];
}

function findClientIndexById(clients, clientId) {
  return clients.findIndex((client) => Number(client?.id) === Number(clientId));
}

function applyDossierPatch(currentState, body) {
  const clients = cloneClients(currentState);
  const action = String(body?.action || '').trim().toLowerCase();
  const clientId = Number(body?.clientId);
  const dossierIndex = Number(body?.dossierIndex);
  const targetClientId = Number(body?.targetClientId);
  const dossier = sanitizePatchObject(body?.dossier);

  if (!action) {
    throw new Error('Missing dossier patch action.');
  }

  if (action === 'create') {
    const clientIdx = findClientIndexById(clients, clientId);
    if (clientIdx === -1) throw new Error('Client not found.');
    if (!Array.isArray(clients[clientIdx].dossiers)) clients[clientIdx].dossiers = [];
    if (!dossier) throw new Error('Missing dossier payload.');
    clients[clientIdx].dossiers.push(dossier);
    return clients;
  }

  if (!Number.isFinite(clientId) || !Number.isFinite(dossierIndex)) {
    throw new Error('Invalid dossier patch coordinates.');
  }

  const sourceClientIdx = findClientIndexById(clients, clientId);
  if (sourceClientIdx === -1) throw new Error('Source client not found.');
  if (!Array.isArray(clients[sourceClientIdx].dossiers)) clients[sourceClientIdx].dossiers = [];

  if (action === 'delete') {
    if (dossierIndex < 0 || dossierIndex >= clients[sourceClientIdx].dossiers.length) {
      throw new Error('Source dossier not found.');
    }
    clients[sourceClientIdx].dossiers.splice(dossierIndex, 1);
    return clients;
  }

  if (!dossier) throw new Error('Missing dossier payload.');

  if (action === 'update') {
    if (dossierIndex < 0 || dossierIndex >= clients[sourceClientIdx].dossiers.length) {
      throw new Error('Source dossier not found.');
    }
    const nextTargetClientId = Number.isFinite(targetClientId) ? targetClientId : clientId;
    const targetClientIdx = findClientIndexById(clients, nextTargetClientId);
    if (targetClientIdx === -1) throw new Error('Target client not found.');
    if (!Array.isArray(clients[targetClientIdx].dossiers)) clients[targetClientIdx].dossiers = [];

    if (targetClientIdx === sourceClientIdx) {
      clients[sourceClientIdx].dossiers[dossierIndex] = dossier;
      return clients;
    }

    clients[sourceClientIdx].dossiers.splice(dossierIndex, 1);
    clients[targetClientIdx].dossiers.push(dossier);
    return clients;
  }

  throw new Error('Unsupported dossier patch action.');
}

app.get('/api/health', async (req, res) => {
  await ensureDataFile();
  res.json({ ok: true, service: 'cabinet-api', ts: new Date().toISOString() });
});

app.get('/api/state', async (req, res) => {
  await ensureDataFile();
  const state = await readState();
  res.json(state);
});

app.post('/api/state', async (req, res) => {
  await ensureDataFile();
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const sourceId = String(body?._sourceId || '').trim();
  const baseVersion = extractBaseVersion(body);
  const currentState = await readState();
  if (baseVersion !== null && Number(currentState?.version || 0) !== baseVersion) {
    return res.status(409).json(buildConflictResponse(currentState));
  }
  const statePayload = { ...body };
  delete statePayload._sourceId;
  delete statePayload._baseVersion;
  const saved = await writeState(statePayload, { previousState: currentState });
  broadcastStateUpdated({ ...saved, sourceId });
  res.json({ ok: true, version: saved.version, updatedAt: saved.updatedAt });
});

app.post('/api/state/users', async (req, res) => {
  await ensureDataFile();
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const sourceId = String(body?._sourceId || '').trim();
  const baseVersion = extractBaseVersion(body);
  const currentState = await readState();
  if (baseVersion !== null && Number(currentState?.version || 0) !== baseVersion) {
    return res.status(409).json(buildConflictResponse(currentState));
  }
  const nextUsers = sanitizePatchArray(body?.users);
  const saved = await writeState({
    ...currentState,
    users: nextUsers
  }, { previousState: currentState });
  broadcastStateUpdated({
    ...saved,
    sourceId,
    patchKind: 'users',
    patch: { users: nextUsers }
  });
  res.json({ ok: true, version: saved.version, updatedAt: saved.updatedAt });
});

app.post('/api/state/salle-assignments', async (req, res) => {
  await ensureDataFile();
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const sourceId = String(body?._sourceId || '').trim();
  const baseVersion = extractBaseVersion(body);
  const currentState = await readState();
  if (baseVersion !== null && Number(currentState?.version || 0) !== baseVersion) {
    return res.status(409).json(buildConflictResponse(currentState));
  }
  const nextSalleAssignments = sanitizePatchArray(body?.salleAssignments);
  const saved = await writeState({
    ...currentState,
    salleAssignments: nextSalleAssignments
  }, { previousState: currentState });
  broadcastStateUpdated({
    ...saved,
    sourceId,
    patchKind: 'salle-assignments',
    patch: { salleAssignments: nextSalleAssignments }
  });
  res.json({ ok: true, version: saved.version, updatedAt: saved.updatedAt });
});

app.post('/api/state/audience-draft', async (req, res) => {
  await ensureDataFile();
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const sourceId = String(body?._sourceId || '').trim();
  const baseVersion = extractBaseVersion(body);
  const currentState = await readState();
  if (baseVersion !== null && Number(currentState?.version || 0) !== baseVersion) {
    return res.status(409).json(buildConflictResponse(currentState));
  }
  const nextAudienceDraft = body?.audienceDraft && typeof body.audienceDraft === 'object'
    ? body.audienceDraft
    : {};
  const saved = await writeState({
    ...currentState,
    audienceDraft: nextAudienceDraft
  }, { previousState: currentState });
  broadcastStateUpdated({
    ...saved,
    sourceId,
    patchKind: 'audience-draft',
    patch: { audienceDraft: nextAudienceDraft }
  });
  res.json({ ok: true, version: saved.version, updatedAt: saved.updatedAt });
});

app.post('/api/state/dossiers', async (req, res) => {
  await ensureDataFile();
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const sourceId = String(body?._sourceId || '').trim();
  const baseVersion = extractBaseVersion(body);
  const currentState = await readState();
  if (baseVersion !== null && Number(currentState?.version || 0) !== baseVersion) {
    return res.status(409).json(buildConflictResponse(currentState));
  }
  try {
    const nextClients = applyDossierPatch(currentState, body);
    const saved = await writeState({
      ...currentState,
      clients: nextClients
    }, { previousState: currentState });
    broadcastStateUpdated({
      ...saved,
      sourceId,
      patchKind: 'dossier',
      patch: body
    });
    res.json({ ok: true, version: saved.version, updatedAt: saved.updatedAt });
  } catch (err) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_DOSSIER_PATCH',
      message: err?.message || 'Invalid dossier patch request.'
    });
  }
});

app.get('/api/state/stream', async (req, res) => {
  await ensureDataFile();
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);
  const current = await readState();
  res.write(`event: state-updated\ndata: ${JSON.stringify({
    version: Number(current?.version) || 0,
    updatedAt: current.updatedAt
  })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {}
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
    res.end();
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(WEB_DIR, 'index.html'));
});

ensureDataFile()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Cabinet API running on http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start API:', err);
    process.exit(1);
  });
