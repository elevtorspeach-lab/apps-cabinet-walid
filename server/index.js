const express = require('express');
const crypto = require('crypto');
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
const DEFAULT_MANAGER_USERNAME = 'walid';
const DEFAULT_MANAGER_PASSWORD = '1234';
const PASSWORD_HASH_ITERATIONS = 120000;
const AUTH_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const STATE_JOURNAL_FILE = path.join(DATA_DIR, 'state.journal');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const SERVER_BACKUP_RETENTION_COUNT = 20;
const SERVER_BACKUP_MIN_INTERVAL_MS = 3 * 60 * 1000;
const SERVER_SNAPSHOT_FLUSH_DELAY_MS = 250;
const SERVER_SNAPSHOT_FLUSH_MAX_PENDING = 40;
const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'https://127.0.0.1:3443',
  'https://localhost:3443',
  'null'
];

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
let cachedStateSerialized = '';
let cachedStateSerializedVersion = -1;
let lastBackupSignature = '';
let lastBackupAt = 0;
const sseClients = new Set();
const authSessions = new Map();
let stateMutationQueue = Promise.resolve();
const chunkedStateUploads = new Map();
let pendingSnapshotFlushTimer = null;
let pendingJournalMutationCount = 0;

function buildAllowedOrigins() {
  const rawOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const values = rawOrigins.length ? rawOrigins : DEFAULT_ALLOWED_ORIGINS;
  return new Set(values);
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

function normalizeLoginPassword(value) {
  return String(value || '')
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776));
}

function hasStoredPasswordHash(user) {
  return !!String(user?.passwordHash || '').trim() && !!String(user?.passwordSalt || '').trim();
}

function buildBootstrapUsers() {
  return [
    {
      id: 1,
      username: DEFAULT_MANAGER_USERNAME,
      password: DEFAULT_MANAGER_PASSWORD,
      passwordHash: '',
      passwordSalt: '',
      passwordVersion: 0,
      passwordUpdatedAt: '',
      requirePasswordChange: true,
      role: 'manager',
      clientIds: []
    }
  ];
}

function getAuthUsersFromState(state) {
  const users = Array.isArray(state?.users) ? state.users.filter((user) => user && typeof user === 'object') : [];
  return users.length ? users : buildBootstrapUsers();
}

function verifyServerUserPassword(user, rawPassword) {
  const normalizedPassword = normalizeLoginPassword(rawPassword);
  if (!user || !normalizedPassword) return false;
  if (hasStoredPasswordHash(user)) {
    try {
      const derived = crypto.pbkdf2Sync(
        normalizedPassword,
        Buffer.from(String(user.passwordSalt || ''), 'hex'),
        PASSWORD_HASH_ITERATIONS,
        32,
        'sha256'
      );
      const expected = Buffer.from(String(user.passwordHash || ''), 'hex');
      return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
    } catch {
      return false;
    }
  }
  return normalizeLoginPassword(user.password || '') === normalizedPassword;
}

function createAuthSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    token,
    username: String(user?.username || '').trim().toLowerCase(),
    role: String(user?.role || '').trim().toLowerCase(),
    issuedAt: Date.now(),
    expiresAt: Date.now() + AUTH_SESSION_TTL_MS
  };
  authSessions.set(token, session);
  return session;
}

function cleanupAuthSessions() {
  const now = Date.now();
  for (const [token, session] of authSessions.entries()) {
    if (!session || Number(session.expiresAt || 0) <= now) {
      authSessions.delete(token);
    }
  }
}

function getRequestAuthToken(req) {
  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return String(req.query?.token || '').trim();
}

function requireApiAuth(req, res, next) {
  cleanupAuthSessions();
  const token = getRequestAuthToken(req);
  const session = token ? authSessions.get(token) : null;
  if (!session) {
    return res.status(401).json({ ok: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' });
  }
  session.expiresAt = Date.now() + AUTH_SESSION_TTL_MS;
  req.authSession = session;
  next();
}

app.use(express.json({ limit: '250mb' }));
app.use(express.static(WEB_DIR, {
  index: false
}));

app.use((req, res, next) => {
  const requestOrigin = String(req.headers.origin || '').trim();
  const allowOrigin = !requestOrigin || ALLOWED_ORIGINS.has(requestOrigin);
  if (requestOrigin && allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return allowOrigin ? res.sendStatus(204) : res.sendStatus(403);
  }
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
  try {
    await fsp.access(STATE_JOURNAL_FILE, fs.constants.F_OK);
  } catch {
    await fsp.writeFile(STATE_JOURNAL_FILE, '', 'utf8');
  }
}

function normalizeStoredState(rawState, previousState = null) {
  const previousVersion = Number(previousState?.version);
  const nextVersion = Number.isFinite(previousVersion) && previousVersion >= 0
    ? previousVersion + 1
    : Math.max(0, Number(rawState?.version) || 0);
  return {
    ...DEFAULT_STATE,
    ...(rawState && typeof rawState === 'object' ? rawState : {}),
    version: nextVersion,
    updatedAt: new Date().toISOString()
  };
}

function hydrateStoredState(rawState) {
  const parsedVersion = Number(rawState?.version);
  return {
    ...DEFAULT_STATE,
    ...(rawState && typeof rawState === 'object' ? rawState : {}),
    version: Number.isFinite(parsedVersion) && parsedVersion >= 0 ? parsedVersion : 0,
    updatedAt: String(rawState?.updatedAt || new Date().toISOString())
  };
}

async function readState() {
  if (cachedState) return cachedState;
  try {
    const raw = await fsp.readFile(STATE_FILE, 'utf8');
    const parsed = hydrateStoredState(JSON.parse(raw));
    setCachedState(parsed);
    try {
      const journalRaw = await fsp.readFile(STATE_JOURNAL_FILE, 'utf8');
      if (journalRaw.trim()) {
        const journalEntries = journalRaw
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line));
        let replayedState = cachedState;
        journalEntries.forEach((entry) => {
          replayedState = applyMutationToState(replayedState, entry);
        });
        setCachedState(replayedState);
      }
    } catch {}
    return cachedState;
  } catch {
    setCachedState({ ...DEFAULT_STATE });
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

function setCachedState(state) {
  cachedState = state;
  cachedStateSerialized = '';
  cachedStateSerializedVersion = -1;
}

function getSerializedState(state) {
  const version = Number(state?.version);
  if (
    cachedStateSerialized
    && cachedStateSerializedVersion >= 0
    && Number.isFinite(version)
    && cachedStateSerializedVersion === version
  ) {
    return cachedStateSerialized;
  }
  const serialized = JSON.stringify(state);
  if (Number.isFinite(version) && version >= 0) {
    cachedStateSerialized = serialized;
    cachedStateSerializedVersion = version;
  }
  return serialized;
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

async function writeStateSnapshot(safeState, options = {}) {
  const tmpFile = `${STATE_FILE}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await fsp.writeFile(tmpFile, getSerializedState(safeState), 'utf8');
  await fsp.rename(tmpFile, STATE_FILE);
  if (options.clearJournal !== false) {
    if (pendingSnapshotFlushTimer) {
      clearTimeout(pendingSnapshotFlushTimer);
      pendingSnapshotFlushTimer = null;
    }
    await fsp.writeFile(STATE_JOURNAL_FILE, '', 'utf8');
    pendingJournalMutationCount = 0;
  }
  setCachedState(safeState);
  await maybeWriteBackupSnapshot(safeState);
  return safeState;
}

async function writeState(nextState, options = {}) {
  const previousState = options.previousState && typeof options.previousState === 'object'
    ? options.previousState
    : null;
  const safe = normalizeStoredState(nextState, previousState);
  return writeStateSnapshot(safe, { clearJournal: true });
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

function normalizePatchReference(value) {
  return String(value || '').trim().toLowerCase();
}

function resolvePatchReference(body, dossier) {
  const direct = normalizePatchReference(body?.referenceClient);
  if (direct) return direct;
  return normalizePatchReference(dossier?.referenceClient);
}

function findDossierIndexForPatch(dossiers, requestedIndex, referenceClient) {
  const normalizedReference = normalizePatchReference(referenceClient);
  const safeDossiers = Array.isArray(dossiers) ? dossiers : [];
  if (Number.isFinite(requestedIndex) && requestedIndex >= 0 && requestedIndex < safeDossiers.length) {
    const indexed = safeDossiers[requestedIndex];
    if (!normalizedReference || normalizePatchReference(indexed?.referenceClient) === normalizedReference) {
      return requestedIndex;
    }
  }
  if (!normalizedReference) return requestedIndex;
  return safeDossiers.findIndex((entry) => normalizePatchReference(entry?.referenceClient) === normalizedReference);
}

function deepCloneJson(value) {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeClientMatchKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeReferenceValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeDateValue(value) {
  return String(value || '').trim().replace(/[^\d]/g, '');
}

function getDossierProcedureKeys(dossier) {
  const values = new Set();
  String(dossier?.procedure || '')
    .split(/[,+/]/)
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .forEach((value) => values.add(value));
  const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
    ? dossier.procedureDetails
    : {};
  Object.keys(details)
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .forEach((value) => values.add(value));
  return [...values].sort();
}

function buildDossierMergeSignature(dossier) {
  if (!dossier || typeof dossier !== 'object') return '';
  const ref = normalizeReferenceValue(dossier.referenceClient || '');
  const debiteur = normalizeClientMatchKey(dossier.debiteur || '');
  const procedures = getDossierProcedureKeys(dossier).join('|');
  const dateAffectation = normalizeDateValue(dossier.dateAffectation || '');
  return [ref, debiteur, procedures, dateAffectation].join('::');
}

function getNextAvailableClientId(clients, preferredId = null) {
  const existingIds = new Set(
    (Array.isArray(clients) ? clients : [])
      .map((client) => Number(client?.id))
      .filter((value) => Number.isFinite(value) && value > 0)
  );
  const safePreferredId = Number(preferredId);
  if (Number.isFinite(safePreferredId) && safePreferredId > 0 && !existingIds.has(safePreferredId)) {
    return safePreferredId;
  }
  let maxId = 0;
  existingIds.forEach((value) => {
    if (value > maxId) maxId = value;
  });
  let nextId = Math.max(1, maxId + 1);
  while (existingIds.has(nextId)) nextId += 1;
  return nextId;
}

function getNextAvailableClientIdFromSet(existingIds, preferredId = null) {
  const safePreferredId = Number(preferredId);
  if (Number.isFinite(safePreferredId) && safePreferredId > 0 && !existingIds.has(safePreferredId)) {
    existingIds.add(safePreferredId);
    return safePreferredId;
  }
  let maxId = 0;
  existingIds.forEach((value) => {
    if (value > maxId) maxId = value;
  });
  let nextId = Math.max(1, maxId + 1);
  while (existingIds.has(nextId)) nextId += 1;
  existingIds.add(nextId);
  return nextId;
}

function sanitizeClientRecord(rawClient, preferredId = null) {
  if (!rawClient || typeof rawClient !== 'object') return null;
  const client = deepCloneJson(rawClient);
  const name = String(client?.name || '').trim();
  if (!name) return null;
  const rawId = preferredId !== null && preferredId !== undefined ? preferredId : client.id;
  const clientId = Number(rawId);
  return {
    ...client,
    id: Number.isFinite(clientId) && clientId > 0 ? Math.floor(clientId) : 0,
    name,
    dossiers: Array.isArray(client?.dossiers) ? client.dossiers : []
  };
}

function mergeJsonArrayEntries(currentEntries, incomingEntries) {
  const next = Array.isArray(currentEntries) ? currentEntries.slice() : [];
  const seen = new Set(next.map((entry) => JSON.stringify(entry)));
  (Array.isArray(incomingEntries) ? incomingEntries : []).forEach((entry) => {
    const signature = JSON.stringify(entry);
    if (seen.has(signature)) return;
    seen.add(signature);
    next.push(deepCloneJson(entry));
  });
  return next;
}

function mergeUsers(currentUsers, incomingUsers, importedClientIdToResolvedId) {
  const nextUsers = Array.isArray(currentUsers) ? currentUsers.slice() : [];
  const byUsername = new Map();
  nextUsers.forEach((user) => {
    const key = normalizeClientMatchKey(user?.username || '');
    if (key) byUsername.set(key, user);
  });
  (Array.isArray(incomingUsers) ? incomingUsers : []).forEach((rawUser) => {
    if (!rawUser || typeof rawUser !== 'object') return;
    const username = String(rawUser.username || '').trim();
    const key = normalizeClientMatchKey(username);
    if (!key || byUsername.has(key)) return;
    const user = deepCloneJson(rawUser);
    const mappedClientIds = Array.isArray(user.clientIds)
      ? [...new Set(user.clientIds
        .map((clientId) => {
          const numericClientId = Number(clientId);
          if (!Number.isFinite(numericClientId)) return null;
          return importedClientIdToResolvedId.has(numericClientId)
            ? importedClientIdToResolvedId.get(numericClientId)
            : numericClientId;
        })
        .filter((clientId) => Number.isFinite(clientId) && clientId > 0))]
      : [];
    user.clientIds = mappedClientIds;
    nextUsers.push(user);
    byUsername.set(key, user);
  });
  return nextUsers;
}

function mergeImportedState(currentState, importedState) {
  const nextState = {
    ...(currentState && typeof currentState === 'object' ? currentState : {}),
    clients: Array.isArray(currentState?.clients) ? currentState.clients.slice() : [],
    users: Array.isArray(currentState?.users) ? currentState.users.slice() : [],
    salleAssignments: Array.isArray(currentState?.salleAssignments) ? currentState.salleAssignments.slice() : [],
    audienceDraft: currentState?.audienceDraft && typeof currentState.audienceDraft === 'object'
      ? { ...currentState.audienceDraft }
      : {},
    recycleBin: Array.isArray(currentState?.recycleBin) ? currentState.recycleBin.slice() : [],
    recycleArchive: Array.isArray(currentState?.recycleArchive) ? currentState.recycleArchive.slice() : [],
    importHistory: Array.isArray(currentState?.importHistory) ? currentState.importHistory.slice() : []
  };
  const existingByName = new Map();
  const existingIds = new Set();
  const importedClientIdToResolvedId = new Map();
  const mutableClients = new Set();

  const ensureMutableClient = (client) => {
    if (!client || mutableClients.has(client)) return client;
    const idx = nextState.clients.indexOf(client);
    if (idx === -1) return client;
    const mutableClient = {
      ...client,
      dossiers: Array.isArray(client?.dossiers) ? client.dossiers.slice() : []
    };
    nextState.clients[idx] = mutableClient;
    mutableClients.add(mutableClient);
    return mutableClient;
  };

  nextState.clients.forEach((client) => {
    const key = normalizeClientMatchKey(client?.name || '');
    if (key) existingByName.set(key, client);
    const clientId = Number(client?.id);
    if (Number.isFinite(clientId) && clientId > 0) existingIds.add(clientId);
  });

  (Array.isArray(importedState?.clients) ? importedState.clients : []).forEach((rawClient) => {
    const importedClient = sanitizeClientRecord(rawClient);
    if (!importedClient) return;
    const key = normalizeClientMatchKey(importedClient.name);
    const existingClient = existingByName.get(key);

    if (!existingClient) {
      const resolvedId = getNextAvailableClientIdFromSet(existingIds, importedClient.id);
      const nextClient = {
        ...importedClient,
        id: resolvedId,
        dossiers: Array.isArray(importedClient.dossiers) ? deepCloneJson(importedClient.dossiers) : []
      };
      nextState.clients.push(nextClient);
      existingByName.set(key, nextClient);
      if (Number.isFinite(Number(importedClient.id)) && Number(importedClient.id) > 0) {
        importedClientIdToResolvedId.set(Number(importedClient.id), resolvedId);
      }
      return;
    }

    if (Number.isFinite(Number(importedClient.id)) && Number(importedClient.id) > 0) {
      importedClientIdToResolvedId.set(Number(importedClient.id), Number(existingClient.id));
    }

    let mutableClient = existingClient;
    if (!Array.isArray(mutableClient.dossiers)) {
      mutableClient = ensureMutableClient(existingClient);
      mutableClient.dossiers = [];
    }
    const existingSignatures = new Set(
      mutableClient.dossiers
        .map((dossier) => buildDossierMergeSignature(dossier))
        .filter(Boolean)
    );
    (Array.isArray(importedClient.dossiers) ? importedClient.dossiers : []).forEach((dossier) => {
      const signature = buildDossierMergeSignature(dossier);
      if (signature && existingSignatures.has(signature)) return;
      if (signature) existingSignatures.add(signature);
      mutableClient = ensureMutableClient(mutableClient);
      mutableClient.dossiers.push(deepCloneJson(dossier));
    });
  });

  nextState.users = mergeUsers(nextState.users, importedState?.users, importedClientIdToResolvedId);
  nextState.salleAssignments = mergeJsonArrayEntries(nextState.salleAssignments, importedState?.salleAssignments);
  nextState.recycleBin = mergeJsonArrayEntries(nextState.recycleBin, importedState?.recycleBin);
  nextState.recycleArchive = mergeJsonArrayEntries(nextState.recycleArchive, importedState?.recycleArchive);
  nextState.importHistory = mergeJsonArrayEntries(nextState.importHistory, importedState?.importHistory);
  if (importedState?.audienceDraft && typeof importedState.audienceDraft === 'object') {
    nextState.audienceDraft = {
      ...importedState.audienceDraft,
      ...nextState.audienceDraft
    };
  }

  return nextState;
}

function applyClientPatch(currentState, body) {
  const action = String(body?.action || '').trim().toLowerCase();
  const sourceClients = Array.isArray(currentState?.clients) ? currentState.clients : [];
  const sourceUsers = Array.isArray(currentState?.users) ? currentState.users : [];

  if (!action) throw new Error('Missing client patch action.');

  if (action === 'create') {
    const incomingClient = sanitizeClientRecord(body?.client);
    if (!incomingClient) throw new Error('Invalid client payload.');
    const existingClient = sourceClients.find(
      (client) => normalizeClientMatchKey(client?.name || '') === normalizeClientMatchKey(incomingClient.name)
    );
    if (existingClient) {
      return {
        clients: sourceClients,
        users: sourceUsers,
        patch: {
          action: 'create',
          client: existingClient
        }
      };
    }
    const clients = sourceClients.slice();
    const nextClient = {
      ...incomingClient,
      id: getNextAvailableClientId(clients, incomingClient.id),
      dossiers: Array.isArray(incomingClient.dossiers) ? deepCloneJson(incomingClient.dossiers) : []
    };
    clients.push(nextClient);
    return {
      clients,
      users: sourceUsers,
      patch: {
        action: 'create',
        client: nextClient
      }
    };
  }

  if (action === 'delete') {
    const clientId = Number(body?.clientId);
    const clientNameKey = normalizeClientMatchKey(body?.clientName || '');
    const clients = sourceClients.slice();
    const clientIndex = Number.isFinite(clientId)
      ? findClientIndexById(clients, clientId)
      : clients.findIndex((client) => normalizeClientMatchKey(client?.name || '') === clientNameKey);
    if (clientIndex === -1) throw new Error('Client not found.');
    const removedClient = clients.splice(clientIndex, 1)[0] || null;
    const removedClientId = Number(removedClient?.id);
    const nextUsers = sourceUsers.map((user) => {
      if (!Array.isArray(user?.clientIds)) return user;
      return {
        ...user,
        clientIds: user.clientIds.filter((id) => Number(id) !== removedClientId)
      };
    });
    return {
      clients,
      users: nextUsers,
      patch: {
        action: 'delete',
        clientId: removedClientId,
        users: nextUsers
      }
    };
  }

  if (action === 'delete-all') {
    const nextUsers = sourceUsers.map((user) => ({
      ...user,
      clientIds: []
    }));
    return {
      clients: [],
      users: nextUsers,
      audienceDraft: {},
      importHistory: [],
      patch: {
        action: 'delete-all',
        users: nextUsers
      }
    };
  }

  throw new Error('Unsupported client patch action.');
}

function applyMutationToState(currentState, mutation) {
  const safeCurrentState = currentState && typeof currentState === 'object'
    ? currentState
    : DEFAULT_STATE;
  const type = String(mutation?.type || '').trim();
  const body = mutation?.body && typeof mutation.body === 'object' ? mutation.body : {};

  if (type === 'replace') {
    const statePayload = { ...body };
    delete statePayload._sourceId;
    delete statePayload._baseVersion;
    return normalizeStoredState(statePayload, safeCurrentState);
  }

  if (type === 'merge-import') {
    return normalizeStoredState(mergeImportedState(safeCurrentState, body), safeCurrentState);
  }

  if (type === 'users') {
    return normalizeStoredState({
      ...safeCurrentState,
      users: sanitizePatchArray(body?.users)
    }, safeCurrentState);
  }

  if (type === 'salle-assignments') {
    return normalizeStoredState({
      ...safeCurrentState,
      salleAssignments: sanitizePatchArray(body?.salleAssignments)
    }, safeCurrentState);
  }

  if (type === 'audience-draft') {
    return normalizeStoredState({
      ...safeCurrentState,
      audienceDraft: body?.audienceDraft && typeof body.audienceDraft === 'object'
        ? body.audienceDraft
        : {}
    }, safeCurrentState);
  }

  if (type === 'dossier') {
    return normalizeStoredState({
      ...safeCurrentState,
      clients: applyDossierPatch(safeCurrentState, body)
    }, safeCurrentState);
  }

  if (type === 'clients') {
    const nextClientState = applyClientPatch(safeCurrentState, body);
    return normalizeStoredState({
      ...safeCurrentState,
      clients: nextClientState.clients,
      users: nextClientState.users,
      audienceDraft: Object.prototype.hasOwnProperty.call(nextClientState, 'audienceDraft')
        ? nextClientState.audienceDraft
        : safeCurrentState.audienceDraft,
      importHistory: Object.prototype.hasOwnProperty.call(nextClientState, 'importHistory')
        ? nextClientState.importHistory
        : safeCurrentState.importHistory
    }, safeCurrentState);
  }

  throw new Error(`Unsupported mutation type: ${type || 'unknown'}`);
}

async function appendMutationJournalEntry(entry) {
  await fsp.appendFile(STATE_JOURNAL_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
}

function scheduleSnapshotFlush(delayMs = SERVER_SNAPSHOT_FLUSH_DELAY_MS) {
  if (pendingSnapshotFlushTimer) return;
  pendingSnapshotFlushTimer = setTimeout(() => {
    pendingSnapshotFlushTimer = null;
    enqueueStateMutation(async () => {
      if (!pendingJournalMutationCount || !cachedState) return;
      await writeStateSnapshot(cachedState, { clearJournal: true });
    }).catch((err) => {
      console.warn('Failed to flush state snapshot:', err);
    });
  }, Math.max(0, Number(delayMs) || 0));
}

async function persistJournalMutation(mutation) {
  const currentState = await readState();
  const saved = applyMutationToState(currentState, mutation);
  setCachedState(saved);
  try {
    await appendMutationJournalEntry(mutation);
    pendingJournalMutationCount += 1;
    if (pendingJournalMutationCount >= SERVER_SNAPSHOT_FLUSH_MAX_PENDING) {
      await writeStateSnapshot(saved, { clearJournal: true });
    } else {
      scheduleSnapshotFlush();
    }
    return saved;
  } catch (err) {
    await writeStateSnapshot(saved, { clearJournal: true });
    return saved;
  }
}

function applyDossierPatch(currentState, body) {
  const action = String(body?.action || '').trim().toLowerCase();
  const clientId = Number(body?.clientId);
  const dossierIndex = Number(body?.dossierIndex);
  const targetClientId = Number(body?.targetClientId);
  const dossier = sanitizePatchObject(body?.dossier);
  const referenceClient = resolvePatchReference(body, dossier);
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
  const resolvedSourceDossierIndex = findDossierIndexForPatch(sourceDossiers, dossierIndex, referenceClient);
  sourceClient.dossiers = sourceDossiers;
  clients[sourceClientIdx] = sourceClient;

  if (action === 'delete') {
    if (resolvedSourceDossierIndex < 0 || resolvedSourceDossierIndex >= sourceDossiers.length) {
      throw new Error('Source dossier not found.');
    }
    sourceDossiers.splice(resolvedSourceDossierIndex, 1);
    return clients;
  }

  if (!dossier) throw new Error('Missing dossier payload.');

  if (action === 'update') {
    if (resolvedSourceDossierIndex < 0 || resolvedSourceDossierIndex >= clients[sourceClientIdx].dossiers.length) {
      throw new Error('Source dossier not found.');
    }
    const nextTargetClientId = Number.isFinite(targetClientId) ? targetClientId : clientId;
    const targetClientIdx = findClientIndexById(clients, nextTargetClientId);
    if (targetClientIdx === -1) throw new Error('Target client not found.');

    if (targetClientIdx === sourceClientIdx) {
      sourceDossiers[resolvedSourceDossierIndex] = dossier;
      return clients;
    }

    const targetClient = clients[targetClientIdx] && typeof clients[targetClientIdx] === 'object'
      ? { ...clients[targetClientIdx] }
      : null;
    if (!targetClient) throw new Error('Target client not found.');
    const targetDossiers = Array.isArray(targetClient.dossiers) ? targetClient.dossiers.slice() : [];
    sourceDossiers.splice(resolvedSourceDossierIndex, 1);
    targetDossiers.push(dossier);
    targetClient.dossiers = targetDossiers;
    clients[targetClientIdx] = targetClient;
    return clients;
  }

  throw new Error('Unsupported dossier patch action.');
}

async function handleHealth(req, res) {
  await ensureDataFile();
  res.json({ ok: true, service: 'cabinet-api', ts: new Date().toISOString() });
}

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

app.post('/api/auth/login', async (req, res) => {
  await ensureDataFile();
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const username = String(body.username || '').trim().toLowerCase();
  const password = normalizeLoginPassword(body.password || '');
  const state = await readState();
  const user = getAuthUsersFromState(state).find(
    (entry) => String(entry?.username || '').trim().toLowerCase() === username
  );
  if (!user || !verifyServerUserPassword(user, password)) {
    return res.status(401).json({ ok: false, code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' });
  }
  const session = createAuthSession(user);
  return res.json({
    ok: true,
    token: session.token,
    user: {
      username: String(user.username || '').trim(),
      role: String(user.role || '').trim(),
      requirePasswordChange: user.requirePasswordChange === true
    }
  });
});

app.use('/api/state', requireApiAuth);

app.get('/api/state', async (req, res) => {
  await ensureDataFile();
  const state = await readState();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(getSerializedState(state));
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
  const uploadMode = String(body.mode || '').trim().toLowerCase() === 'merge' ? 'merge' : 'replace';
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
      sourceId,
      mode: uploadMode
    };
    chunkedStateUploads.set(uploadId, session);
  }

  if (session.total !== total) {
    chunkedStateUploads.delete(uploadId);
    return res.status(400).json({ ok: false, code: 'UPLOAD_TOTAL_MISMATCH', message: 'Chunk total mismatch.' });
  }

  if (session.mode !== uploadMode) {
    chunkedStateUploads.delete(uploadId);
    return res.status(400).json({ ok: false, code: 'UPLOAD_MODE_MISMATCH', message: 'Chunk mode mismatch.' });
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
      const nextState = session.mode === 'merge'
        ? mergeImportedState(currentState, statePayload)
        : statePayload;
      const saved = await writeState(nextState, { previousState: currentState });
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

app.post('/api/state/clients', async (req, res) => {
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const sourceId = String(body?._sourceId || '').trim();
      const currentState = await readState();
      const nextClientState = applyClientPatch(currentState, body);
      const saved = await persistJournalMutation({
        type: 'clients',
        body
      });
      broadcastStateUpdated({
        ...saved,
        sourceId,
        patchKind: 'clients',
        patch: nextClientState.patch
      });
      return { saved, patch: nextClientState.patch };
    });
    res.json({
      ok: true,
      version: result.saved.version,
      updatedAt: result.saved.updatedAt,
      patch: result.patch
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_CLIENT_PATCH',
      message: err?.message || 'Invalid client patch request.'
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
      const saved = await persistJournalMutation({
        type: 'users',
        body: { users: nextUsers }
      });
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
      const saved = await persistJournalMutation({
        type: 'salle-assignments',
        body: { salleAssignments: nextSalleAssignments }
      });
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
      const saved = await persistJournalMutation({
        type: 'audience-draft',
        body: { audienceDraft: nextAudienceDraft }
      });
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
      const saved = await persistJournalMutation({
        type: 'dossier',
        body
      });
      broadcastStateUpdated({
        ...saved,
        sourceId,
        patchKind: 'dossier',
        patch: body
      });
      return { saved };
    });
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
