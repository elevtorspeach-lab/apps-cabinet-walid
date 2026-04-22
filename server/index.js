const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const https = require('https');
const path = require('path');
const { promisify } = require('util');
const zlib = require('zlib');
const db = require('./db');

const app = express();
const gzipAsync = promisify(zlib.gzip);
const PORT = Number(process.env.PORT || 3000);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);
const HOST = process.env.HOST || '0.0.0.0';
const WEB_DIR = path.join(__dirname, '..', 'client', 'dist');
const SSL_DIR = path.join(__dirname, 'ssl');
const SSL_KEY_FILE = process.env.SSL_KEY_FILE || path.join(SSL_DIR, 'local.key');
const SSL_CERT_FILE = process.env.SSL_CERT_FILE || path.join(SSL_DIR, 'local.crt');
const DEFAULT_MANAGER_USERNAME = 'manager';
const DEFAULT_MANAGER_PASSWORD = '1234';
const FIXED_TEAM_USERS = [
  { id: 1, username: 'manager', role: 'manager', password: '1234' },
  { id: 2, username: 'walid', role: 'manager', password: 'messi@123' },
  { id: 3, username: 'ghita', role: 'admin', password: 'ghita@2110' },
  { id: 4, username: 'doha', role: 'admin', password: 'sahi@345' },
  { id: 5, username: 'najwa', role: 'admin', password: 'najwa@1234' },
  { id: 6, username: 'yasmine', role: 'admin', password: 'yasmine@092' },
  { id: 7, username: 'souhaila', role: 'admin', password: 'souhaila@192' }
];
const FIXED_TEAM_USER_PASSWORDS = new Map(
  FIXED_TEAM_USERS.map((user) => [String(user.username || '').trim().toLowerCase(), String(user.password || '')])
);
const PASSWORD_HASH_ITERATIONS = 120000;
const PASSWORD_MIN_LENGTH = 1;
const AUTH_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const STATE_JOURNAL_FILE = path.join(DATA_DIR, 'state.journal');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const SERVER_BACKUP_RETENTION_COUNT = 20;
const SERVER_BACKUP_MIN_INTERVAL_MS = 3 * 60 * 1000;
const SERVER_SNAPSHOT_FLUSH_DELAY_MS = 3000;
const SERVER_SNAPSHOT_FLUSH_MAX_PENDING = 160;
const SERVER_KEEP_ALIVE_TIMEOUT_MS = 120000;
const SERVER_HEADERS_TIMEOUT_MS = 125000;
const SERVER_REQUEST_TIMEOUT_MS = 0;
const STATE_EXPORT_PAGE_CLIENT_LIMIT_DEFAULT = 40;
const STATE_EXPORT_PAGE_CLIENT_LIMIT_MAX = 120;
const STATE_EXPORT_PAGED_CLIENT_THRESHOLD = 250;
const STATE_EXPORT_PAGED_DOSSIER_THRESHOLD = 5000;
const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'https://127.0.0.1:3443',
  'https://localhost:3443',
  'null'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Dynamic CORS to allow any IP for multi-user access
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const DEFAULT_STATE = {
  clients: [],
  salleAssignments: [],
  users: [],
  audienceDraft: {},
  recycleBin: [],
  recycleArchive: [],
  importHistory: [],
  version: 0,
  updatedAt: new Date().toISOString()
};

let cachedState = null;
let cachedStateSerialized = '';
let cachedStateSerializedVersion = -1;
let cachedStateGzip = null;
let cachedStateGzipVersion = -1;
let cachedStateGzipPromise = null;
let cachedStateExportStats = null;
let cachedStateExportStatsVersion = -1;
let cachedStateCompressionToken = 0;
let cachedScopedStatePayloads = new Map();
let cachedPagedStateExportPayloads = new Map();
let cachedJournalEntries = null;
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

function hasAnyStoredPassword(user) {
  return hasStoredPasswordHash(user) || !!normalizeLoginPassword(user?.password || '');
}

function buildBootstrapUsers() {
  return FIXED_TEAM_USERS.map((user) => ({
    id: user.id,
    username: user.username,
    password: user.password,
    passwordHash: '',
    passwordSalt: '',
    passwordVersion: 0,
    passwordUpdatedAt: '',
    requirePasswordChange: false,
    role: user.role,
    clientIds: []
  }));
}

function getAuthUsersFromState(state) {
  const users = Array.isArray(state?.users) ? state.users.filter((user) => user && typeof user === 'object') : [];
  return users.length ? users : buildBootstrapUsers();
}

function ensureManagerUser(users) {
  const existingUsers = new Map(
    (Array.isArray(users) ? users : [])
      .filter((user) => user && typeof user === 'object')
      .map((user) => [String(user?.username || '').trim().toLowerCase(), user])
      .filter(([username]) => username)
  );
  const seedUsers = buildBootstrapUsers();
  const fixedUsernames = new Set(seedUsers.map((user) => String(user?.username || '').trim().toLowerCase()).filter(Boolean));
  const mergedFixedUsers = seedUsers.map((seedUser) => {
    const existingUser = existingUsers.get(String(seedUser.username || '').trim().toLowerCase());
    const bootstrapUser = {
      ...seedUser,
      username: seedUser.username,
      role: seedUser.role,
      password: seedUser.password,
      passwordHash: '',
      passwordSalt: '',
      passwordVersion: 0,
      passwordUpdatedAt: '',
      requirePasswordChange: false,
      clientIds: []
    };
    if (!existingUser || typeof existingUser !== 'object') {
      return bootstrapUser;
    }

    const mergedUser = {
      ...bootstrapUser,
      ...existingUser,
      id: seedUser.id,
      username: seedUser.username,
      role: seedUser.role,
      clientIds: []
    };

    if (!hasAnyStoredPassword(existingUser)) {
      return bootstrapUser;
    }

    if (hasStoredPasswordHash(existingUser)) {
      mergedUser.password = '';
      return mergedUser;
    }

    mergedUser.password = normalizeLoginPassword(existingUser.password || '')
      ? String(existingUser.password || '')
      : seedUser.password;
    mergedUser.passwordHash = '';
    mergedUser.passwordSalt = '';
    return mergedUser;
  });
  let nextId = mergedFixedUsers.reduce((max, user) => Math.max(max, Number(user?.id) || 0), 0) + 1;
  const usedIds = new Set(mergedFixedUsers.map((user) => Number(user?.id)).filter((id) => Number.isFinite(id)));
  const extraUsers = (Array.isArray(users) ? users : [])
    .filter((user) => user && typeof user === 'object')
    .map((user) => ({ ...user }))
    .filter((user) => {
      const username = String(user?.username || '').trim().toLowerCase();
      return username && !fixedUsernames.has(username);
    })
    .map((user) => {
      const role = String(user?.role || '').trim().toLowerCase() || 'client';
      const normalizedClientIds = role === 'client'
        ? [...new Set((Array.isArray(user?.clientIds) ? user.clientIds : [])
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value)))]
        : [];
      let userId = Number(user?.id);
      if (!Number.isFinite(userId) || usedIds.has(userId)) {
        userId = nextId++;
      }
      usedIds.add(userId);
      const normalizedUser = {
        ...user,
        id: userId,
        username: String(user?.username || '').trim(),
        role,
        clientIds: normalizedClientIds
      };
      if (hasStoredPasswordHash(user)) {
        normalizedUser.password = '';
        return normalizedUser;
      }
      normalizedUser.password = normalizeLoginPassword(user?.password || '')
        ? String(user.password || '')
        : DEFAULT_MANAGER_PASSWORD;
      normalizedUser.passwordHash = '';
      normalizedUser.passwordSalt = '';
      normalizedUser.passwordVersion = Number(user?.passwordVersion) || 0;
      normalizedUser.passwordUpdatedAt = String(user?.passwordUpdatedAt || '');
      normalizedUser.requirePasswordChange = user?.requirePasswordChange === true;
      return normalizedUser;
    });
  return [...mergedFixedUsers, ...extraUsers];
}

function isBootstrapSetupRequired(state) {
  const users = ensureManagerUser(getAuthUsersFromState(state));
  const manager = users.find(
    (user) => String(user?.username || '').trim().toLowerCase() === DEFAULT_MANAGER_USERNAME
  );
  return !manager || !hasAnyStoredPassword(manager);
}

function getPasswordPolicyError(password) {
  const value = normalizeLoginPassword(password);
  if (!value) return 'Password is required.';
  return '';
}

function secureServerUserPassword(user, rawPassword, options = {}) {
  const normalizedPassword = normalizeLoginPassword(rawPassword);
  const requirePasswordChange = options.requirePasswordChange === true;
  const baseUser = user && typeof user === 'object' ? { ...user } : {};
  if (!normalizedPassword) {
    return {
      ...baseUser,
      requirePasswordChange
    };
  }
  const passwordSalt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.pbkdf2Sync(
    normalizedPassword,
    Buffer.from(passwordSalt, 'hex'),
    PASSWORD_HASH_ITERATIONS,
    32,
    'sha256'
  ).toString('hex');
  return {
    ...baseUser,
    password: '',
    passwordHash,
    passwordSalt,
    passwordVersion: 1,
    passwordUpdatedAt: new Date().toISOString(),
    requirePasswordChange
  };
}

function verifyServerUserPassword(user, rawPassword) {
  const normalizedPassword = normalizeLoginPassword(rawPassword);
  if (!user || !normalizedPassword) return false;
  
  const fixedTeamPassword = FIXED_TEAM_USER_PASSWORDS.get(String(user.username || '').trim().toLowerCase());
  if (fixedTeamPassword && normalizedPassword === normalizeLoginPassword(fixedTeamPassword)) return true;

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
  const clientIds = Array.isArray(user?.clientIds)
    ? [...new Set(
      user.clientIds
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    )].sort((a, b) => a - b)
    : [];
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    token,
    userId: Number(user?.id) || 0,
    username: String(user?.username || '').trim().toLowerCase(),
    role: String(user?.role || '').trim().toLowerCase(),
    clientIds,
    issuedAt: Date.now(),
    expiresAt: Date.now() + AUTH_SESSION_TTL_MS
  };
  authSessions.set(token, session);
  return session;
}

function normalizeTeamRole(value) {
  const role = String(value || '').trim().toLowerCase();
  if (role === 'manager' || role === 'admin' || role === 'client') return role;
  return 'client';
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
  index: false,
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    const lower = String(filePath || '').toLowerCase();
    if(
      lower.endsWith('.html')
      || lower.endsWith('.js')
      || lower.endsWith('.css')
    ){
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
  }
}));

async function ensureDataFile() {
  await db.initializeDatabase();
}

function normalizeStoredState(rawState, previousState = null) {
  const previousVersion = Number(previousState?.version);
  const nextVersion = Number.isFinite(previousVersion) && previousVersion >= 0
    ? previousVersion + 1
    : Math.max(0, Number(rawState?.version) || 0);

  const sourceState = rawState && typeof rawState === 'object' ? rawState : {};
  const previous = previousState && typeof previousState === 'object' ? previousState : DEFAULT_STATE;
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(sourceState, key);

  return {
    ...DEFAULT_STATE,
    ...previous,
    ...sourceState,
    clients: hasOwn('clients')
      ? (Array.isArray(sourceState.clients) ? sourceState.clients : [])
      : (Array.isArray(previous.clients) ? previous.clients : []),
    salleAssignments: hasOwn('salleAssignments')
      ? (Array.isArray(sourceState.salleAssignments) ? sourceState.salleAssignments : [])
      : (Array.isArray(previous.salleAssignments) ? previous.salleAssignments : []),
    users: ensureManagerUser(
      hasOwn('users')
        ? (Array.isArray(sourceState.users) ? sourceState.users : [])
        : (Array.isArray(previous.users) ? previous.users : [])
    ),
    audienceDraft: hasOwn('audienceDraft')
      ? (sourceState.audienceDraft && typeof sourceState.audienceDraft === 'object' && !Array.isArray(sourceState.audienceDraft) ? sourceState.audienceDraft : {})
      : (previous.audienceDraft && typeof previous.audienceDraft === 'object' && !Array.isArray(previous.audienceDraft) ? previous.audienceDraft : {}),
    recycleBin: hasOwn('recycleBin')
      ? (Array.isArray(sourceState.recycleBin) ? sourceState.recycleBin : [])
      : (Array.isArray(previous.recycleBin) ? previous.recycleBin : []),
    recycleArchive: hasOwn('recycleArchive')
      ? (Array.isArray(sourceState.recycleArchive) ? sourceState.recycleArchive : [])
      : (Array.isArray(previous.recycleArchive) ? previous.recycleArchive : []),
    importHistory: hasOwn('importHistory')
      ? (Array.isArray(sourceState.importHistory) ? sourceState.importHistory : [])
      : (Array.isArray(previous.importHistory) ? previous.importHistory : []),
    version: nextVersion,
    updatedAt: new Date().toISOString()
  };
}

function hydrateStoredState(rawState) {
  const parsedVersion = Number(rawState?.version);
  return {
    ...DEFAULT_STATE,
    ...(rawState && typeof rawState === 'object' ? rawState : {}),
    users: ensureManagerUser(Array.isArray(rawState?.users) ? rawState.users : []),
    version: Number.isFinite(parsedVersion) && parsedVersion >= 0 ? parsedVersion : 0,
    updatedAt: String(rawState?.updatedAt || new Date().toISOString())
  };
}

async function readState() {
  if (cachedState) {
    return cachedState;
  }
  try {
    const state = await db.loadFullState();
    setCachedState(state);
    return state;
  } catch (err) {
    console.error('Failed to read state from MySQL, falling back to default:', err);
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
  cachedStateGzip = null;
  cachedStateGzipVersion = -1;
  cachedStateGzipPromise = null;
  cachedStateExportStats = null;
  cachedStateExportStatsVersion = -1;
  cachedStateCompressionToken += 1;
  cachedScopedStatePayloads = new Map();
  cachedPagedStateExportPayloads = new Map();
  void warmCachedStateCompression(state).catch(() => {});
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

function warmCachedStateCompression(state) {
  const version = Number(state?.version);
  if (
    cachedStateGzip
    && cachedStateGzipVersion >= 0
    && Number.isFinite(version)
    && cachedStateGzipVersion === version
  ) {
    return Promise.resolve(cachedStateGzip);
  }
  if (
    cachedStateGzipPromise
    && cachedStateGzipVersion >= 0
    && Number.isFinite(version)
    && cachedStateGzipVersion === version
  ) {
    return cachedStateGzipPromise;
  }
  const compressionToken = cachedStateCompressionToken;
  const compressionPromise = gzipAsync(getSerializedState(state))
    .then((gzipped) => {
      if (
        compressionToken === cachedStateCompressionToken
        && Number.isFinite(version)
        && version >= 0
      ) {
        cachedStateGzip = gzipped;
        cachedStateGzipVersion = version;
      }
      if (cachedStateGzipPromise === compressionPromise) {
        cachedStateGzipPromise = null;
      }
      return gzipped;
    })
    .catch((err) => {
      if (cachedStateGzipPromise === compressionPromise) {
        cachedStateGzipPromise = null;
      }
      throw err;
    });
  if (Number.isFinite(version) && version >= 0) {
    cachedStateGzipVersion = version;
  }
  cachedStateGzipPromise = compressionPromise;
  return compressionPromise;
}

function clampPositiveInteger(value, fallback, max = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.max(0, Math.min(max, Math.floor(parsed)));
}

function getStateScopeKeyForSession(session) {
  if (String(session?.role || '').trim().toLowerCase() !== 'client') return 'all';
  const clientIds = Array.isArray(session?.clientIds)
    ? session.clientIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b)
    : [];
  return clientIds.length ? `client:${clientIds.join(',')}` : 'client:none';
}

function buildScopedStatePayloadEntry(state, session) {
  const scopeKey = getStateScopeKeyForSession(session);
  if (scopeKey === 'all') return null;
  const version = Number(state?.version);
  const cacheKey = `${Number.isFinite(version) && version >= 0 ? version : 'na'}::${scopeKey}`;
  const cachedEntry = cachedScopedStatePayloads.get(cacheKey);
  if (cachedEntry) return cachedEntry;

  const allowedClientIds = new Set(
    Array.isArray(session?.clientIds)
      ? session.clientIds
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
      : []
  );
  const scopedState = {
    ...state,
    clients: (Array.isArray(state?.clients) ? state.clients : []).filter((client) => (
      allowedClientIds.has(Number(client?.id))
    ))
  };
  const nextEntry = {
    scopeKey,
    state: scopedState,
    serialized: '',
    gzip: null,
    gzipPromise: null,
    exportStats: null
  };
  cachedScopedStatePayloads.set(cacheKey, nextEntry);
  return nextEntry;
}

function getStateForSession(state, session) {
  const scopedEntry = buildScopedStatePayloadEntry(state, session);
  return scopedEntry ? scopedEntry.state : state;
}

function getSerializedStateForSession(state, session) {
  const scopedEntry = buildScopedStatePayloadEntry(state, session);
  if (!scopedEntry) return getSerializedState(state);
  if (scopedEntry.serialized) return scopedEntry.serialized;
  scopedEntry.serialized = JSON.stringify(scopedEntry.state);
  return scopedEntry.serialized;
}

async function getGzipSerializedStateForSession(state, session) {
  const scopedEntry = buildScopedStatePayloadEntry(state, session);
  if (!scopedEntry) {
    return warmCachedStateCompression(state);
  }
  if (scopedEntry.gzip) return scopedEntry.gzip;
  if (scopedEntry.gzipPromise) return scopedEntry.gzipPromise;
  const compressionPromise = gzipAsync(getSerializedStateForSession(state, session))
    .then((gzipped) => {
      if (scopedEntry.gzipPromise === compressionPromise) {
        scopedEntry.gzipPromise = null;
      }
      scopedEntry.gzip = gzipped;
      return gzipped;
    })
    .catch((err) => {
      if (scopedEntry.gzipPromise === compressionPromise) {
        scopedEntry.gzipPromise = null;
      }
      throw err;
    });
  scopedEntry.gzipPromise = compressionPromise;
  return compressionPromise;
}

function extractJournalMutation(entry) {
  if (entry?.mutation && typeof entry.mutation === 'object') return entry.mutation;
  if (entry && typeof entry === 'object' && typeof entry.type === 'string') return entry;
  return null;
}

function normalizeJournalEntry(entry) {
  const mutation = extractJournalMutation(entry);
  if (!mutation) return null;
  const version = Number(entry?.version);
  const updatedAt = String(entry?.updatedAt || '').trim();
  const patchKind = String(entry?.patchKind || '').trim();
  return {
    version: Number.isFinite(version) && version > 0 ? version : null,
    updatedAt,
    patchKind,
    patch: entry?.patch && typeof entry.patch === 'object' ? entry.patch : null,
    mutation
  };
}

async function readJournalEntries() {
  if (Array.isArray(cachedJournalEntries)) {
    return cachedJournalEntries.slice();
  }
  try {
    const journalRaw = await fsp.readFile(STATE_JOURNAL_FILE, 'utf8');
    if (!journalRaw.trim()) {
      cachedJournalEntries = [];
      return [];
    }
    cachedJournalEntries = journalRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    return cachedJournalEntries.slice();
  } catch {
    cachedJournalEntries = [];
    return [];
  }
}

function countClientDossiers(client) {
  return Array.isArray(client?.dossiers) ? client.dossiers.length : 0;
}

function computeStateExportStats(state) {
  const clients = Array.isArray(state?.clients) ? state.clients : [];
  let dossierCount = 0;
  clients.forEach((client) => {
    dossierCount += countClientDossiers(client);
  });
  const averageDossiersPerClient = clients.length > 0 ? dossierCount / clients.length : 0;
  const targetDossiersPerPage = dossierCount >= 60000 ? 10000 : 8000;
  const recommendedClientPageSize = averageDossiersPerClient > 0
    ? Math.max(
      STATE_EXPORT_PAGE_CLIENT_LIMIT_DEFAULT,
      Math.min(
        STATE_EXPORT_PAGE_CLIENT_LIMIT_MAX,
        Math.round(targetDossiersPerPage / averageDossiersPerClient)
      )
    )
    : STATE_EXPORT_PAGE_CLIENT_LIMIT_DEFAULT;
  return {
    clientCount: clients.length,
    dossierCount,
    recommendedMode: clients.length >= STATE_EXPORT_PAGED_CLIENT_THRESHOLD || dossierCount >= STATE_EXPORT_PAGED_DOSSIER_THRESHOLD
      ? 'paged'
      : 'full',
    recommendedClientPageSize
  };
}

function getStateExportStats(state) {
  const version = Number(state?.version);
  if (
    cachedStateExportStats
    && cachedStateExportStatsVersion >= 0
    && Number.isFinite(version)
    && cachedStateExportStatsVersion === version
  ) {
    return cachedStateExportStats;
  }
  const stats = computeStateExportStats(state);
  if (Number.isFinite(version) && version >= 0) {
    cachedStateExportStats = stats;
    cachedStateExportStatsVersion = version;
  }
  return stats;
}

function getStateExportStatsForSession(state, session) {
  const scopedEntry = buildScopedStatePayloadEntry(state, session);
  if (!scopedEntry) return getStateExportStats(state);
  if (scopedEntry.exportStats) return scopedEntry.exportStats;
  scopedEntry.exportStats = computeStateExportStats(scopedEntry.state);
  return scopedEntry.exportStats;
}

function buildStateExportMetadataFromStats(state, stats) {
  return {
    version: Number(state?.version) || 0,
    updatedAt: String(state?.updatedAt || new Date().toISOString()),
    clientCount: stats.clientCount,
    dossierCount: stats.dossierCount,
    recommendedMode: stats.recommendedMode,
    recommendedClientPageSize: stats.recommendedClientPageSize
  };
}

function buildStateExportMetadata(state) {
  return buildStateExportMetadataFromStats(state, getStateExportStats(state));
}

function buildStateExportMetadataForSession(state, session) {
  return buildStateExportMetadataFromStats(state, getStateExportStatsForSession(state, session));
}

function buildPagedStateExport(state, options = {}, exportMetadata = null) {
  const clients = Array.isArray(state?.clients) ? state.clients : [];
  const offset = clampPositiveInteger(options.offset, 0);
  const limit = Math.max(
    1,
    clampPositiveInteger(
      options.limit,
      STATE_EXPORT_PAGE_CLIENT_LIMIT_DEFAULT,
      STATE_EXPORT_PAGE_CLIENT_LIMIT_MAX
    )
  );
  const includeSharedState = options.includeSharedState !== false;
  const pageClients = clients.slice(offset, offset + limit);
  const nextOffset = offset + pageClients.length;
  return {
    ...(exportMetadata || buildStateExportMetadata(state)),
    mode: 'paged',
    offset,
    limit,
    returnedClientCount: pageClients.length,
    hasMore: nextOffset < clients.length,
    nextOffset: nextOffset < clients.length ? nextOffset : null,
    clients: pageClients,
    sharedState: includeSharedState ? {
      salleAssignments: Array.isArray(state?.salleAssignments) ? state.salleAssignments : [],
      users: Array.isArray(state?.users) ? state.users : [],
      audienceDraft: state?.audienceDraft && typeof state.audienceDraft === 'object' ? state.audienceDraft : {},
      recycleBin: Array.isArray(state?.recycleBin) ? state.recycleBin : [],
      recycleArchive: Array.isArray(state?.recycleArchive) ? state.recycleArchive : [],
      importHistory: Array.isArray(state?.importHistory) ? state.importHistory : []
    } : null
  };
}

function buildPagedStateExportCacheKey(state, session, options = {}) {
  const version = Number(state?.version);
  const scopeKey = getStateScopeKeyForSession(session);
  const offset = clampPositiveInteger(options.offset, 0);
  const limit = Math.max(
    1,
    clampPositiveInteger(
      options.limit,
      STATE_EXPORT_PAGE_CLIENT_LIMIT_DEFAULT,
      STATE_EXPORT_PAGE_CLIENT_LIMIT_MAX
    )
  );
  const includeSharedState = options.includeSharedState !== false ? 1 : 0;
  return `${Number.isFinite(version) && version >= 0 ? version : 'na'}::${scopeKey}::${offset}::${limit}::${includeSharedState}`;
}

function getPagedStateExportJson(state, session, options = {}) {
  const cacheKey = buildPagedStateExportCacheKey(state, session, options);
  const cachedPayload = cachedPagedStateExportPayloads.get(cacheKey);
  if (cachedPayload) return cachedPayload;
  const scopedState = getStateForSession(state, session);
  const exportMetadata = buildStateExportMetadataForSession(state, session);
  const payload = JSON.stringify({
    ok: true,
    ...buildPagedStateExport(scopedState, options, exportMetadata)
  });
  cachedPagedStateExportPayloads.set(cacheKey, payload);
  return payload;
}

function buildJournalMutationEntry(savedState, mutation, options = {}) {
  return {
    version: Number(savedState?.version) || 0,
    updatedAt: String(savedState?.updatedAt || new Date().toISOString()),
    patchKind: String(options.patchKind || '').trim(),
    patch: options.patch && typeof options.patch === 'object' ? deepCloneJson(options.patch) : null,
    mutation
  };
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

function countStateDossiers(state) {
  const clients = Array.isArray(state?.clients) ? state.clients : [];
  return clients.reduce((sum, client) => {
    const dossiers = Array.isArray(client?.dossiers) ? client.dossiers.length : 0;
    return sum + dossiers;
  }, 0);
}

function shouldCreateSafetyBackup(currentState, mutation, nextState = null) {
  const type = String(mutation?.type || '').trim();
  const body = mutation?.body && typeof mutation.body === 'object' ? mutation.body : {};

  if (type === 'clients') {
    const action = String(body?.action || '').trim().toLowerCase();
    return action === 'delete' || action === 'delete-all';
  }

  if (type === 'dossier') {
    const action = String(body?.action || '').trim().toLowerCase();
    return action === 'delete';
  }

  if (type === 'users') {
    const previousCount = Array.isArray(currentState?.users) ? currentState.users.length : 0;
    const nextCount = Array.isArray(nextState?.users) ? nextState.users.length : 0;
    return nextCount < previousCount;
  }

  if (type === 'salle-assignments') {
    const previousCount = Array.isArray(currentState?.salleAssignments) ? currentState.salleAssignments.length : 0;
    const nextCount = Array.isArray(nextState?.salleAssignments) ? nextState.salleAssignments.length : 0;
    return nextCount < previousCount;
  }

  if (type === 'replace') {
    const next = nextState && typeof nextState === 'object' ? nextState : {};
    const previousClients = Array.isArray(currentState?.clients) ? currentState.clients.length : 0;
    const nextClients = Array.isArray(next?.clients) ? next.clients.length : 0;
    const previousUsers = Array.isArray(currentState?.users) ? currentState.users.length : 0;
    const nextUsers = Array.isArray(next?.users) ? next.users.length : 0;
    const previousDossiers = countStateDossiers(currentState);
    const nextDossiers = countStateDossiers(next);
    return nextClients < previousClients || nextUsers < previousUsers || nextDossiers < previousDossiers;
  }

  return false;
}

async function writeStateSnapshot(safeState, options = {}) {
  await db.saveFullState(safeState);
  let persistedState = safeState;
  try {
    persistedState = await db.loadFullState();
  } catch (err) {
    console.warn('Failed to reload hydrated state after snapshot save, using in-memory snapshot.', err);
  }
  if (options.clearJournal !== false) {
    if (pendingSnapshotFlushTimer) {
      clearTimeout(pendingSnapshotFlushTimer);
      pendingSnapshotFlushTimer = null;
    }
    pendingJournalMutationCount = 0;
    cachedJournalEntries = [];
  }
  setCachedState(persistedState);
  return persistedState;
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
  stateMutationQueue = run.catch((err) => {
    console.error('State mutation queue error:', err);
  });
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

function tuneServerTimeouts(server) {
  if (!server) return;
  server.keepAliveTimeout = SERVER_KEEP_ALIVE_TIMEOUT_MS;
  server.headersTimeout = SERVER_HEADERS_TIMEOUT_MS;
  server.requestTimeout = SERVER_REQUEST_TIMEOUT_MS;
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

function getRequestBodyObject(req) {
  return req?.body && typeof req.body === 'object' ? req.body : {};
}

function sendJsonError(res, statusCode, code, fallbackMessage, err = null) {
  if (err) {
    console.error(`[API] ${code}:`, err);
  }
  return res.status(statusCode).json({
    ok: false,
    code,
    message: err?.message || fallbackMessage
  });
}

function sendConflictJson(res, state) {
  return res.status(409).json(buildConflictResponse(state));
}

function sendVersionedOk(res, saved, extras = {}) {
  return res.json({
    ok: true,
    version: saved?.version,
    updatedAt: saved?.updatedAt,
    ...extras
  });
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
  const previous = normalizePatchReference(body?.previousReferenceClient);
  if (previous) return previous;
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

function buildGeneratedDossierExternalId(clientId, dossier = {}) {
  const preferred = String(dossier?.externalId || '').trim();
  if (preferred) return preferred;
  const ref = String(dossier?.referenceClient || '').trim().replace(/\s+/g, '-').slice(0, 48) || 'ref';
  const debiteur = String(dossier?.debiteur || '').trim().replace(/\s+/g, '-').slice(0, 32) || 'debiteur';
  return `dossier-${String(clientId || 'unknown')}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${ref}-${debiteur}`;
}

function resolveDossierPatchSnapshot(currentState, body) {
  const action = String(body?.action || '').trim().toLowerCase();
  const clientId = Number(body?.clientId);
  const dossierIndex = Number(body?.dossierIndex);
  const targetClientId = Number(body?.targetClientId);
  const referenceClient = resolvePatchReference(body, body?.dossier);
  const clients = Array.isArray(currentState?.clients) ? currentState.clients : [];

  if (action === 'create') {
    const clientIdx = findClientIndexById(clients, clientId);
    if (clientIdx === -1) throw new Error('Client not found.');
    return {
      action,
      clientId,
      targetClientId: clientId,
      sourceClientIdx: clientIdx,
      previousDossier: null,
      previousExternalId: ''
    };
  }

  if (!Number.isFinite(clientId) || !Number.isFinite(dossierIndex)) {
    throw new Error('Invalid dossier patch coordinates.');
  }

  const sourceClientIdx = findClientIndexById(clients, clientId);
  if (sourceClientIdx === -1) throw new Error('Source client not found.');
  const sourceDossiers = Array.isArray(clients[sourceClientIdx]?.dossiers) ? clients[sourceClientIdx].dossiers : [];
  const resolvedSourceDossierIndex = findDossierIndexForPatch(sourceDossiers, dossierIndex, referenceClient);
  if (resolvedSourceDossierIndex < 0 || resolvedSourceDossierIndex >= sourceDossiers.length) {
    throw new Error('Source dossier not found.');
  }

  const previousDossier = sourceDossiers[resolvedSourceDossierIndex];
  return {
    action,
    clientId,
    targetClientId: Number.isFinite(targetClientId) ? targetClientId : clientId,
    sourceClientIdx,
    resolvedSourceDossierIndex,
    previousDossier,
    previousExternalId: String(previousDossier?.externalId || '').trim()
  };
}

function enrichDossierPatchBody(currentState, rawBody) {
  const body = rawBody && typeof rawBody === 'object' ? deepCloneJson(rawBody) : {};
  const action = String(body?.action || '').trim().toLowerCase();
  const snapshot = resolveDossierPatchSnapshot(currentState, body);

  if (action === 'create') {
    body.dossier = sanitizePatchObject(body.dossier) || {};
    body.dossier.externalId = buildGeneratedDossierExternalId(snapshot.clientId, body.dossier);
    body.dossier.clientId = snapshot.clientId;
    return body;
  }

  body.previousExternalId = snapshot.previousExternalId;
  if (action === 'update') {
    body.dossier = sanitizePatchObject(body.dossier) || {};
    body.dossier.externalId = String(body.dossier.externalId || snapshot.previousExternalId).trim();
    body.dossier.clientId = snapshot.targetClientId;
  }
  return body;
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
  // Persistence is now handled by saveFullState in writeStateSnapshot
  if (!Array.isArray(cachedJournalEntries)) {
    cachedJournalEntries = [];
  }
  cachedJournalEntries.push(entry);
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

async function persistJournalMutation(mutation, options = {}) {
  const currentState = await readState();
  const saved = applyMutationToState(currentState, mutation);
  if (shouldCreateSafetyBackup(currentState, mutation, saved)) {
    await maybeWriteBackupSnapshot(currentState);
  }
  await appendMutationJournalEntry(buildJournalMutationEntry(saved, mutation, options));
  if (mutation?.type === 'users') {
    await db.saveUsersState(saved?.users, {
      version: saved?.version,
      updatedAt: saved?.updatedAt
    });
    setCachedState(saved);
  } else if (mutation?.type === 'dossier') {
    const patch = mutation?.body && typeof mutation.body === 'object' ? mutation.body : {};
    await db.applyDossierMutation(patch, {
      version: saved?.version,
      updatedAt: saved?.updatedAt
    });
    setCachedState(saved);
  } else {
    await writeStateSnapshot(saved, { clearJournal: false });
  }
  if (pendingSnapshotFlushTimer) {
    clearTimeout(pendingSnapshotFlushTimer);
    pendingSnapshotFlushTimer = null;
  }
  pendingJournalMutationCount = 0;
  return saved;
}

async function persistJournalMutations(mutations, options = {}) {
  const safeMutations = (Array.isArray(mutations) ? mutations : [])
    .filter((mutation) => mutation && typeof mutation === 'object');
  if (!safeMutations.length) {
    throw new Error('No mutations to persist.');
  }
  let saved = await readState();
  const originalState = saved;
  const journalEntries = [];
  const safePatches = Array.isArray(options.patches) ? options.patches : [];
  for (let index = 0; index < safeMutations.length; index += 1) {
    const mutation = safeMutations[index];
    saved = applyMutationToState(saved, mutation);
    journalEntries.push(buildJournalMutationEntry(saved, mutation, {
      patchKind: options.patchKind,
      patch: safePatches[index]
    }));
  }
  if (safeMutations.some((mutation) => shouldCreateSafetyBackup(originalState, mutation, saved))) {
    await maybeWriteBackupSnapshot(originalState);
  }
  if (!Array.isArray(cachedJournalEntries)) {
    cachedJournalEntries = [];
  }
  cachedJournalEntries.push(...journalEntries);
  const dossierOnlyMutations = safeMutations.every((mutation) => mutation?.type === 'dossier');
  if (dossierOnlyMutations) {
    for (const mutation of safeMutations) {
      const patch = mutation?.body && typeof mutation.body === 'object' ? mutation.body : {};
      await db.applyDossierMutation(patch, {
        version: saved?.version,
        updatedAt: saved?.updatedAt
      });
    }
    setCachedState(saved);
  } else {
    await writeStateSnapshot(saved, { clearJournal: false });
  }
  if (pendingSnapshotFlushTimer) {
    clearTimeout(pendingSnapshotFlushTimer);
    pendingSnapshotFlushTimer = null;
  }
  pendingJournalMutationCount = 0;
  return saved;
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
  const state = await readState();
  res.json({
    ok: true,
    service: 'cabinet-api',
    ts: new Date().toISOString(),
    bootstrapSetupRequired: isBootstrapSetupRequired(state)
  });
}

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

app.post('/api/auth/bootstrap', async (req, res) => {
  await ensureDataFile();
  const state = await readState();
  if (!isBootstrapSetupRequired(state)) {
    return sendJsonError(res, 409, 'BOOTSTRAP_ALREADY_CONFIGURED', 'Bootstrap account is already configured.');
  }
  const body = getRequestBodyObject(req);
  const username = String(body.username || DEFAULT_MANAGER_USERNAME).trim().toLowerCase();
  const password = normalizeLoginPassword(body.password || '');
  if (username !== DEFAULT_MANAGER_USERNAME) {
    return sendJsonError(res, 400, 'INVALID_USERNAME', 'Bootstrap can only configure the manager account.');
  }
  const passwordPolicyError = getPasswordPolicyError(password);
  if (passwordPolicyError) {
    return sendJsonError(res, 400, 'INVALID_PASSWORD', passwordPolicyError);
  }
  const users = ensureManagerUser(getAuthUsersFromState(state));
  const managerIndex = users.findIndex(
    (user) => String(user?.username || '').trim().toLowerCase() === DEFAULT_MANAGER_USERNAME
  );
  if (managerIndex === -1) {
    return sendJsonError(res, 500, 'BOOTSTRAP_MANAGER_MISSING', 'Bootstrap manager account is missing.');
  }
  users[managerIndex] = secureServerUserPassword(users[managerIndex], password, { requirePasswordChange: false });
  const saved = await writeState(
    {
      ...state,
      users
    },
    { previousState: state }
  );
  return sendVersionedOk(res, saved, {
    user: {
      username: DEFAULT_MANAGER_USERNAME,
      role: 'manager',
      requirePasswordChange: false
    }
  });
});

app.get('/api/stats', requireApiAuth, async (req, res) => {
  try {
    const [[{ total_clients }]] = await db.pool.query('SELECT COUNT(*) as total_clients FROM clients');
    const [[{ att_sort }]] = await db.pool.query('SELECT COUNT(*) as att_sort FROM dossiers WHERE json_extract(data, "$.procedureDetails.ASS.sort") = "Att sort"');
    const [[{ total_dossiers }]] = await db.pool.query('SELECT COUNT(*) as total_dossiers FROM dossiers');
    
    res.json({
      ok: true,
      stats: {
        totalClients: total_clients,
        dossiersEnCours: total_dossiers,
        dossiersTermines: 0,
        dossiersAttSort: att_sort,
        dossiersAttDepot: 0,
        audienceErrorsCount: 0
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});
    
app.get('/api/dossiers/paginated', requireApiAuth, async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const procedure = req.query.procedure || 'all';

    const result = await db.getPaginatedDossiers(offset, limit, { search, procedure });
    res.json({ ok: true, data: result.data, total: result.total });
  } catch (err) {
    console.error('Paginated dossiers error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/api/dossiers/batch-update', requireApiAuth, async (req, res) => {
  try {
    const body = getRequestBodyObject(req);
    const updates = Array.isArray(body.updates) ? body.updates : [];
    
    if (updates.length === 0) {
      return res.json({ ok: true, updated: 0, skipped: 0 });
    }

    const result = await db.batchUpdateDossiers(updates);
    // CRITICAL: Clear cached state so it reloads with the newly updated dossier data from DB
    // preventing the next synchronization from overwriting DB with stale memory state.
    cachedState = null;
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Batch update error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.get('/api/clients/all', requireApiAuth, async (req, res) => {
  try {
    const [rows] = await db.pool.query('SELECT id, name FROM clients ORDER BY name ASC');
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('Clients fetch error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  await ensureDataFile();
  const body = getRequestBodyObject(req);
  const username = String(body.username || '').trim().toLowerCase();
  const password = normalizeLoginPassword(body.password || '');
  const state = await readState();
  if (isBootstrapSetupRequired(state)) {
    return sendJsonError(res, 428, 'BOOTSTRAP_REQUIRED', 'Initial manager password must be configured before login.');
  }
  const user = getAuthUsersFromState(state).find(
    (entry) => String(entry?.username || '').trim().toLowerCase() === username
  );
  if (!user || !verifyServerUserPassword(user, password)) {
    return sendJsonError(res, 401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
  }
  const session = createAuthSession(user);
  return res.json({
    ok: true,
    token: session.token,
    user: {
      username: String(user.username || '').trim(),
      role: String(user.role || '').trim(),
      requirePasswordChange: false
    }
  });
});

app.post('/api/team/users/upsert', requireApiAuth, async (req, res) => {
  try {
    if (String(req.authSession?.role || '').trim().toLowerCase() !== 'manager') {
      return sendJsonError(res, 403, 'FORBIDDEN', 'Manager access required.');
    }
    await ensureDataFile();
    const body = getRequestBodyObject(req);
    const state = await readState();
    const users = ensureManagerUser(Array.isArray(state?.users) ? state.users : []);
    const requestedId = Number(body?.id);
    const requestedUsername = String(body?.username || '').trim();
    const requestedPassword = normalizeLoginPassword(body?.password || '');
    const requestedRole = normalizeTeamRole(body?.role || 'client');
    const requestedClientIds = requestedRole === 'client'
      ? [...new Set((Array.isArray(body?.clientIds) ? body.clientIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0))]
      : [];

    if (!requestedUsername) {
      return sendJsonError(res, 400, 'INVALID_USERNAME', 'Username obligatoire');
    }
    if (requestedRole === 'client' && !requestedClientIds.length) {
      return sendJsonError(res, 400, 'INVALID_CLIENTS', 'Choisir au moins un client pour ce compte client');
    }

    const existingIndex = users.findIndex((user) => (
      (Number.isFinite(requestedId) && Number(user?.id) === requestedId)
      || String(user?.username || '').trim().toLowerCase() === requestedUsername.toLowerCase()
    ));
    const existingUser = existingIndex >= 0 ? users[existingIndex] : null;
    const nextId = existingUser
      ? Number(existingUser.id)
      : users.reduce((max, user) => Math.max(max, Number(user?.id) || 0), 0) + 1;

    const usernameTaken = users.some((user) => (
      String(user?.username || '').trim().toLowerCase() === requestedUsername.toLowerCase()
      && Number(user?.id) !== Number(nextId)
    ));
    if (usernameTaken) {
      return sendJsonError(res, 400, 'USERNAME_TAKEN', 'Username déjà utilisé');
    }

    let nextUser = {
      ...(existingUser && typeof existingUser === 'object' ? existingUser : {}),
      id: nextId,
      username: requestedUsername,
      role: requestedRole,
      clientIds: requestedClientIds,
      requirePasswordChange: false
    };

    if (!existingUser && !requestedPassword) {
      return sendJsonError(res, 400, 'INVALID_PASSWORD', 'Mot de passe obligatoire');
    }

    if (requestedPassword) {
      nextUser = secureServerUserPassword(nextUser, requestedPassword, { requirePasswordChange: false });
    }

    await db.upsertUserState(nextUser, {
      version: Number(state?.version || 0) + 1,
      updatedAt: new Date().toISOString()
    });

    const refreshed = await db.loadFullState();
    setCachedState(refreshed);
    return res.json({ ok: true, user: nextUser });
  } catch (err) {
    return sendJsonError(res, 500, 'TEAM_USER_UPSERT_FAILED', 'Team user save failed.', err);
  }
});

app.use('/api/state', requireApiAuth);

app.get('/api/state', async (req, res) => {
  await ensureDataFile();
  const state = await readState();
  const scopedState = getStateForSession(state, req.authSession);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const acceptEncoding = String(req.headers['accept-encoding'] || '').toLowerCase();
  if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    res.send(await getGzipSerializedStateForSession(state, req.authSession));
    return;
  }
  res.send(scopedState === state ? getSerializedState(state) : getSerializedStateForSession(state, req.authSession));
});

app.get('/api/state/meta', async (req, res) => {
  await ensureDataFile();
  const state = await readState();
  const scopedState = getStateForSession(state, req.authSession);
  res.json({
    ok: true,
    ...(
      scopedState === state
        ? buildStateExportMetadata(state)
        : buildStateExportMetadataForSession(state, req.authSession)
    )
  });
});

app.get('/api/state/export-page', async (req, res) => {
  await ensureDataFile();
  const state = await readState();
  const includeSharedState = String(req.query.includeShared || '1').trim().toLowerCase() !== '0';
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(getPagedStateExportJson(state, req.authSession, {
    offset: req.query.offset,
    limit: req.query.limit,
    includeSharedState
  }));
});

app.get('/api/state/changes', async (req, res) => {
  await ensureDataFile();
  const currentState = await readState();
  const currentVersion = Number(currentState?.version) || 0;
  const sinceVersionRaw = Number(req.query.sinceVersion);
  const sinceVersion = Number.isFinite(sinceVersionRaw) && sinceVersionRaw >= 0
    ? Math.floor(sinceVersionRaw)
    : -1;

  if (sinceVersion < 0) {
    return res.json({
      ok: true,
      version: currentVersion,
      updatedAt: currentState?.updatedAt || new Date().toISOString(),
      fromVersion: sinceVersion,
      snapshotRequired: true,
      reason: 'invalid-since-version',
      changes: []
    });
  }

  if (sinceVersion >= currentVersion) {
    return res.json({
      ok: true,
      version: currentVersion,
      updatedAt: currentState?.updatedAt || new Date().toISOString(),
      fromVersion: sinceVersion,
      snapshotRequired: false,
      changes: []
    });
  }

  const normalizedEntries = (await readJournalEntries())
    .map(normalizeJournalEntry)
    .filter(Boolean);

  if (!normalizedEntries.length) {
    return res.json({
      ok: true,
      version: currentVersion,
      updatedAt: currentState?.updatedAt || new Date().toISOString(),
      fromVersion: sinceVersion,
      snapshotRequired: true,
      reason: 'journal-empty',
      changes: []
    });
  }

  const hasIncompleteEntries = normalizedEntries.some((entry) => !Number.isFinite(entry.version) || !entry.patchKind || !entry.patch);
  if (hasIncompleteEntries) {
    return res.json({
      ok: true,
      version: currentVersion,
      updatedAt: currentState?.updatedAt || new Date().toISOString(),
      fromVersion: sinceVersion,
      snapshotRequired: true,
      reason: 'journal-incompatible',
      changes: []
    });
  }

  const firstVersion = Number(normalizedEntries[0]?.version) || 0;
  if (sinceVersion < (firstVersion - 1)) {
    return res.json({
      ok: true,
      version: currentVersion,
      updatedAt: currentState?.updatedAt || new Date().toISOString(),
      fromVersion: sinceVersion,
      snapshotRequired: true,
      reason: 'changes-not-available',
      availableFromVersion: Math.max(0, firstVersion - 1),
      changes: []
    });
  }

  const changes = normalizedEntries
    .filter((entry) => Number(entry.version) > sinceVersion)
    .map((entry) => ({
      version: Number(entry.version) || 0,
      updatedAt: entry.updatedAt || currentState?.updatedAt || new Date().toISOString(),
      patchKind: entry.patchKind,
      patch: entry.patch
    }));

  if (!changes.length) {
    return res.json({
      ok: true,
      version: currentVersion,
      updatedAt: currentState?.updatedAt || new Date().toISOString(),
      fromVersion: sinceVersion,
      snapshotRequired: true,
      reason: 'changes-not-found',
      changes: []
    });
  }

  return res.json({
    ok: true,
    version: currentVersion,
    updatedAt: currentState?.updatedAt || new Date().toISOString(),
    fromVersion: sinceVersion,
    snapshotRequired: false,
    changes
  });
});

app.post('/api/state', async (req, res) => {
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const body = getRequestBodyObject(req);
      const sourceId = String(body?._sourceId || '').trim();
      const baseVersion = extractBaseVersion(body);
      const currentState = await readState();
      if (baseVersion !== null && Number(currentState?.version || 0) !== baseVersion) {
        return { conflict: true, state: currentState };
      }
      const statePayload = { ...body };
      delete statePayload._sourceId;
      delete statePayload._baseVersion;
      const explicitUsers = Array.isArray(statePayload.users)
        ? ensureManagerUser(statePayload.users)
        : null;
      let saved = await writeState(statePayload, { previousState: currentState });
      if (explicitUsers) {
        await db.saveUsersState(explicitUsers, {
          version: saved?.version,
          updatedAt: saved?.updatedAt
        });
        try {
          saved = await db.loadFullState();
        } catch {
          saved = {
            ...saved,
            users: explicitUsers
          };
        }
        setCachedState(saved);
      }
      broadcastStateUpdated({ ...saved, sourceId });
      return { saved };
    });
    if (result?.conflict) {
      return sendConflictJson(res, result.state);
    }
    return sendVersionedOk(res, result.saved);
  } catch (err) {
    return sendJsonError(res, 500, 'STATE_SAVE_FAILED', 'State save failed.', err);
  }
});

app.post('/api/state/upload-chunk', async (req, res) => {
  cleanupChunkedUploads();
  const body = getRequestBodyObject(req);
  const uploadId = String(body.uploadId || '').trim();
  const sourceId = String(body._sourceId || '').trim();
  const baseVersion = extractBaseVersion(body);
  const uploadMode = String(body.mode || '').trim().toLowerCase() === 'merge' ? 'merge' : 'replace';
  const index = Number(body.index);
  const total = Number(body.total);
  const chunk = typeof body.chunk === 'string' ? body.chunk : '';

  if (!uploadId || !Number.isFinite(index) || !Number.isFinite(total) || total < 1 || index < 0 || index >= total) {
    return sendJsonError(res, 400, 'INVALID_UPLOAD_CHUNK', 'Invalid chunk metadata.');
  }

  let session = chunkedStateUploads.get(uploadId);
  if (!session) {
    session = {
      createdAt: Date.now(),
      total,
      chunks: new Array(total).fill(null),
      received: 0,
      sourceId,
      mode: uploadMode,
      baseVersion
    };
    chunkedStateUploads.set(uploadId, session);
  }

  if (session.total !== total) {
    chunkedStateUploads.delete(uploadId);
    return sendJsonError(res, 400, 'UPLOAD_TOTAL_MISMATCH', 'Chunk total mismatch.');
  }

  if (session.mode !== uploadMode) {
    chunkedStateUploads.delete(uploadId);
    return sendJsonError(res, 400, 'UPLOAD_MODE_MISMATCH', 'Chunk mode mismatch.');
  }

  if (session.baseVersion !== baseVersion) {
    chunkedStateUploads.delete(uploadId);
    return sendJsonError(res, 400, 'UPLOAD_BASE_VERSION_MISMATCH', 'Chunk base version mismatch.');
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
      if (session.baseVersion !== null && Number(currentState?.version || 0) !== session.baseVersion) {
        return { conflict: true, state: currentState };
      }
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
    if (result?.conflict) {
      return sendConflictJson(res, result.state);
    }
    return sendVersionedOk(res, result.saved, { complete: true });
  } catch (err) {
    return sendJsonError(res, 500, 'UPLOAD_FINALIZE_FAILED', 'Failed to finalize chunked upload.', err);
  }
});

app.post('/api/state/clients', async (req, res) => {
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const body = getRequestBodyObject(req);
      const sourceId = String(body?._sourceId || '').trim();
      const currentState = await readState();
      const nextClientState = applyClientPatch(currentState, body);
      const saved = await persistJournalMutation({
        type: 'clients',
        body
      }, {
        patchKind: 'clients',
        patch: nextClientState.patch
      });
      broadcastStateUpdated({
        ...saved,
        sourceId,
        patchKind: 'clients',
        patch: nextClientState.patch
      });
      return { saved, patch: nextClientState.patch };
    });
    return sendVersionedOk(res, result.saved, { patch: result.patch });
  } catch (err) {
    return sendJsonError(res, 400, 'INVALID_CLIENT_PATCH', 'Invalid client patch request.', err);
  }
});

app.post('/api/state/users', async (req, res) => {
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const body = getRequestBodyObject(req);
      const sourceId = String(body?._sourceId || '').trim();
      const baseVersion = extractBaseVersion(body);
      const currentState = await readState();
      if (baseVersion !== null && Number(currentState?.version || 0) !== baseVersion) {
        return { conflict: true, state: currentState };
      }
      const nextUsers = ensureManagerUser(sanitizePatchArray(body?.users));
      const saved = await persistJournalMutation({
        type: 'users',
        body: { users: nextUsers }
      }, {
        patchKind: 'users',
        patch: { users: nextUsers }
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
      return sendConflictJson(res, result.state);
    }
    return sendVersionedOk(res, result.saved);
  } catch (err) {
    return sendJsonError(res, 500, 'USERS_SAVE_FAILED', 'Users save failed.', err);
  }
});

app.post('/api/state/salle-assignments', async (req, res) => {
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const body = getRequestBodyObject(req);
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
      }, {
        patchKind: 'salle-assignments',
        patch: { salleAssignments: nextSalleAssignments }
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
      return sendConflictJson(res, result.state);
    }
    return sendVersionedOk(res, result.saved);
  } catch (err) {
    return sendJsonError(res, 500, 'SALLE_SAVE_FAILED', 'Salle save failed.', err);
  }
});

app.post('/api/state/audience-draft', async (req, res) => {
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const body = getRequestBodyObject(req);
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
      }, {
        patchKind: 'audience-draft',
        patch: { audienceDraft: nextAudienceDraft }
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
      return sendConflictJson(res, result.state);
    }
    return sendVersionedOk(res, result.saved);
  } catch (err) {
    return sendJsonError(res, 500, 'AUDIENCE_DRAFT_SAVE_FAILED', 'Audience draft save failed.', err);
  }
});

app.post('/api/state/dossiers', async (req, res) => {
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const rawBody = getRequestBodyObject(req);
      const currentState = await readState();
      const body = enrichDossierPatchBody(currentState, rawBody);
      const sourceId = String(body?._sourceId || '').trim();
      const saved = await persistJournalMutation({
        type: 'dossier',
        body
      }, {
        patchKind: 'dossier',
        patch: body
      });
      broadcastStateUpdated({
        ...saved,
        sourceId,
        patchKind: 'dossier',
        patch: body
      });
      return { saved };
    });
    return sendVersionedOk(res, result.saved);
  } catch (err) {
    return sendJsonError(res, 400, 'INVALID_DOSSIER_PATCH', 'Invalid dossier patch request.', err);
  }
});

app.post('/api/state/dossiers/batch', async (req, res) => {
  try {
    const result = await enqueueStateMutation(async () => {
      await ensureDataFile();
      const rawBody = getRequestBodyObject(req);
      const currentState = await readState();
      const body = rawBody && typeof rawBody === 'object' ? rawBody : {};
      const sourceId = String(body?._sourceId || '').trim();
      const patches = Array.isArray(body?.patches)
        ? body.patches
          .filter((patch) => patch && typeof patch === 'object')
          .map((patch) => enrichDossierPatchBody(currentState, patch))
        : [];
      if (!patches.length) {
        throw new Error('Missing dossier patches.');
      }
      const saved = await persistJournalMutations(
        patches.map((patch) => ({
          type: 'dossier',
          body: patch
        })),
        {
          patchKind: 'dossier',
          patches
        }
      );
      broadcastStateUpdated({
        ...saved,
        sourceId,
        patchKind: 'dossier-batch',
        patch: { patches }
      });
      return { saved, count: patches.length };
    });
    return sendVersionedOk(res, result.saved, { count: result.count });
  } catch (err) {
    return sendJsonError(res, 400, 'INVALID_DOSSIER_PATCH_BATCH', 'Invalid dossier patch batch request.', err);
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
    tuneServerTimeouts(httpServer);
    httpServer.listen(PORT, HOST, () => {
      console.log(`Cabinet API running on http://${HOST}:${PORT}`);
    });

    const sslCredentials = loadSslCredentials();
    if (!sslCredentials) {
      console.log(`SSL inactive. Add certificates in ${SSL_DIR} to enable https on port ${HTTPS_PORT}.`);
      return;
    }

    const httpsServer = https.createServer(sslCredentials, app);
    tuneServerTimeouts(httpsServer);
    httpsServer.listen(HTTPS_PORT, HOST, () => {
      console.log(`Cabinet API SSL running on https://${HOST}:${HTTPS_PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start API:', err);
    process.exit(1);
  });
