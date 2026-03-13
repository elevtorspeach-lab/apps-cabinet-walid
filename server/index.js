const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const https = require('https');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);
const HOST = process.env.HOST || '0.0.0.0';
const WEB_DIR = path.join(__dirname, '..');
const SSL_DIR = path.join(__dirname, 'ssl');
const SSL_KEY_FILE = process.env.SSL_KEY_FILE || path.join(SSL_DIR, 'local.key');
const SSL_CERT_FILE = process.env.SSL_CERT_FILE || path.join(SSL_DIR, 'local.crt');

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
let stateMutationQueue = Promise.resolve();
const chunkedStateUploads = new Map();

app.use(express.json({ limit: '250mb' }));
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
  if (lastBackupAt && (now - lastBackupAt) < SERVER_BACKUP_MIN_INTERVAL_MS) return;
  const signature = buildBackupSignature(state);
  if (signature && signature === lastBackupSignature) return;

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
  const tmpFile = `${STATE_FILE}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await fsp.writeFile(tmpFile, JSON.stringify(safe), 'utf8');
  await fsp.rename(tmpFile, STATE_FILE);
  cachedState = safe;
  await maybeWriteBackupSnapshot(safe);
  return safe;
}

function enqueueStateMutation(task) {
  const run = stateMutationQueue.then(task, task);
  stateMutationQueue = run.catch(() => {});
  return run;
}

function cleanupChunkedUploads(maxAgeMs = 15 * 60 * 1000) {
  const now = Date.now();
  for (const [uploadId, session] of chunkedStateUploads.entries()) {
    if (!session || (now - Number(session.createdAt || 0)) <= maxAgeMs) continue;
    chunkedStateUploads.delete(uploadId);
  }
}

function loadSslCredentials() {
  try {
    if (!fs.existsSync(SSL_KEY_FILE) || !fs.existsSync(SSL_CERT_FILE)) {
      return null;
    }
    return {
      key: fs.readFileSync(SSL_KEY_FILE, 'utf8'),
      cert: fs.readFileSync(SSL_CERT_FILE, 'utf8')
    };
  } catch (err) {
    console.warn('Failed to load SSL certificates:', err);
    return null;
  }
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

function findClientIndexById(clients, clientId) {
  return clients.findIndex((client) => Number(client?.id) === Number(clientId));
}

function applyDossierPatch(currentState, body) {
  const action = String(body?.action || '').trim().toLowerCase();
  const clientId = Number(body?.clientId);
  const dossierIndex = Number(body?.dossierIndex);
  const targetClientId = Number(body?.targetClientId);
  const dossier = sanitizePatchObject(body?.dossier);
  const sourceClients = Array.isArray(currentState?.clients) ? currentState.clients : [];
  const clients = sourceClients.slice();

  if (!action) {
    throw new Error('Missing dossier patch action.');
  }

  if (action === 'create') {
    const clientIdx = findClientIndexById(clients, clientId);
    if (clientIdx === -1) throw new Error('Client not found.');
    const client = clients[clientIdx] && typeof clients[clientIdx] === 'object'
      ? { ...clients[clientIdx] }
      : null;
    if (!client) throw new Error('Client not found.');
    const dossiers = Array.isArray(client.dossiers) ? client.dossiers.slice() : [];
    if (!dossier) throw new Error('Missing dossier payload.');
    dossiers.push(dossier);
    client.dossiers = dossiers;
    clients[clientIdx] = client;
    return clients;
  }

  if (!Number.isFinite(clientId) || !Number.isFinite(dossierIndex)) {
    throw new Error('Invalid dossier patch coordinates.');
  }

  const sourceClientIdx = findClientIndexById(clients, clientId);
  if (sourceClientIdx === -1) throw new Error('Source client not found.');
  const sourceClient = clients[sourceClientIdx] && typeof clients[sourceClientIdx] === 'object'
    ? { ...clients[sourceClientIdx] }
    : null;
  if (!sourceClient) throw new Error('Source client not found.');
  const sourceDossiers = Array.isArray(sourceClient.dossiers) ? sourceClient.dossiers.slice() : [];
  sourceClient.dossiers = sourceDossiers;
  clients[sourceClientIdx] = sourceClient;

  if (action === 'delete') {
    if (dossierIndex < 0 || dossierIndex >= sourceDossiers.length) {
      throw new Error('Source dossier not found.');
    }
    sourceDossiers.splice(dossierIndex, 1);
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

    if (targetClientIdx === sourceClientIdx) {
      sourceDossiers[dossierIndex] = dossier;
      return clients;
    }

    const targetClient = clients[targetClientIdx] && typeof clients[targetClientIdx] === 'object'
      ? { ...clients[targetClientIdx] }
      : null;
    if (!targetClient) throw new Error('Target client not found.');
    const targetDossiers = Array.isArray(targetClient.dossiers) ? targetClient.dossiers.slice() : [];
    sourceDossiers.splice(dossierIndex, 1);
    targetDossiers.push(dossier);
    targetClient.dossiers = targetDossiers;
    clients[targetClientIdx] = targetClient;
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
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const sourceId = String(body?._sourceId || '').trim();
      const baseVersion = extractBaseVersion(body);
      const currentState = await readState();
      if (baseVersion !== null && Number(currentState?.version || 0) !== baseVersion) {
        return { conflict: true, state: currentState };
      }
      const statePayload = { ...body };
      delete statePayload._sourceId;
      delete statePayload._baseVersion;
      const saved = await writeState(statePayload, { previousState: currentState });
      broadcastStateUpdated({ ...saved, sourceId });
      return { saved };
    });
    if (result?.conflict) {
      return res.status(409).json(buildConflictResponse(result.state));
    }
    res.json({ ok: true, version: result.saved.version, updatedAt: result.saved.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, code: 'STATE_SAVE_FAILED', message: err?.message || 'State save failed.' });
  }
});

app.post('/api/state/upload-chunk', async (req, res) => {
  cleanupChunkedUploads();
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const uploadId = String(body.uploadId || '').trim();
  const sourceId = String(body._sourceId || '').trim();
  const index = Number(body.index);
  const total = Number(body.total);
  const chunk = typeof body.chunk === 'string' ? body.chunk : '';

  if (!uploadId || !Number.isFinite(index) || !Number.isFinite(total) || total < 1 || index < 0 || index >= total) {
    return res.status(400).json({ ok: false, code: 'INVALID_UPLOAD_CHUNK', message: 'Invalid chunk metadata.' });
  }

  let session = chunkedStateUploads.get(uploadId);
  if (!session) {
    session = {
      createdAt: Date.now(),
      total,
      chunks: new Array(total).fill(null),
      received: 0,
      sourceId
    };
    chunkedStateUploads.set(uploadId, session);
  }

  if (session.total !== total) {
    chunkedStateUploads.delete(uploadId);
    return res.status(400).json({ ok: false, code: 'UPLOAD_TOTAL_MISMATCH', message: 'Chunk total mismatch.' });
  }

  if (session.chunks[index] === null) {
    session.chunks[index] = chunk;
    session.received += 1;
  }

  if (session.received < session.total) {
    return res.json({ ok: true, complete: false, received: session.received, total: session.total });
  }

  chunkedStateUploads.delete(uploadId);

  try {
    const raw = session.chunks.join('');
    const parsed = JSON.parse(raw);
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const currentState = await readState();
      const statePayload = parsed && typeof parsed === 'object' ? { ...parsed } : {};
      delete statePayload._sourceId;
      delete statePayload._baseVersion;
      const saved = await writeState(statePayload, { previousState: currentState });
      broadcastStateUpdated({ ...saved, sourceId: session.sourceId });
      return { saved };
    });
    return res.json({
      ok: true,
      complete: true,
      version: result.saved.version,
      updatedAt: result.saved.updatedAt
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      code: 'UPLOAD_FINALIZE_FAILED',
      message: err?.message || 'Failed to finalize chunked upload.'
    });
  }
});

app.post('/api/state/users', async (req, res) => {
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const sourceId = String(body?._sourceId || '').trim();
      const baseVersion = extractBaseVersion(body);
      const currentState = await readState();
      if (baseVersion !== null && Number(currentState?.version || 0) !== baseVersion) {
        return { conflict: true, state: currentState };
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
      return { saved };
    });
    if (result?.conflict) {
      return res.status(409).json(buildConflictResponse(result.state));
    }
    res.json({ ok: true, version: result.saved.version, updatedAt: result.saved.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, code: 'USERS_SAVE_FAILED', message: err?.message || 'Users save failed.' });
  }
});

app.post('/api/state/salle-assignments', async (req, res) => {
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const sourceId = String(body?._sourceId || '').trim();
      const baseVersion = extractBaseVersion(body);
      const currentState = await readState();
      if (baseVersion !== null && Number(currentState?.version || 0) !== baseVersion) {
        return { conflict: true, state: currentState };
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
      return { saved };
    });
    if (result?.conflict) {
      return res.status(409).json(buildConflictResponse(result.state));
    }
    res.json({ ok: true, version: result.saved.version, updatedAt: result.saved.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, code: 'SALLE_SAVE_FAILED', message: err?.message || 'Salle save failed.' });
  }
});

app.post('/api/state/audience-draft', async (req, res) => {
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const sourceId = String(body?._sourceId || '').trim();
      const baseVersion = extractBaseVersion(body);
      const currentState = await readState();
      if (baseVersion !== null && Number(currentState?.version || 0) !== baseVersion) {
        return { conflict: true, state: currentState };
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
      return { saved };
    });
    if (result?.conflict) {
      return res.status(409).json(buildConflictResponse(result.state));
    }
    res.json({ ok: true, version: result.saved.version, updatedAt: result.saved.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, code: 'AUDIENCE_DRAFT_SAVE_FAILED', message: err?.message || 'Audience draft save failed.' });
  }
});

app.post('/api/state/dossiers', async (req, res) => {
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const sourceId = String(body?._sourceId || '').trim();
      const baseVersion = extractBaseVersion(body);
      const currentState = await readState();
      if (baseVersion !== null && Number(currentState?.version || 0) !== baseVersion) {
        return { conflict: true, state: currentState };
      }
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
      return { saved };
    });
    if (result?.conflict) {
      return res.status(409).json(buildConflictResponse(result.state));
    }
    res.json({ ok: true, version: result.saved.version, updatedAt: result.saved.updatedAt });
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
    const httpServer = http.createServer(app);
    httpServer.listen(PORT, HOST, () => {
      console.log(`Cabinet API running on http://${HOST}:${PORT}`);
    });

    const sslCredentials = loadSslCredentials();
    if (!sslCredentials) {
      console.log(`SSL inactive. Add certificates in ${SSL_DIR} to enable https on port ${HTTPS_PORT}.`);
      return;
    }

    const httpsServer = https.createServer(sslCredentials, app);
    httpsServer.listen(HTTPS_PORT, HOST, () => {
      console.log(`Cabinet API SSL running on https://${HOST}:${HTTPS_PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start API:', err);
    process.exit(1);
  });
