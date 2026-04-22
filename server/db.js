const crypto = require('crypto');
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cabinet_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  supportBigNumbers: true,
  bigNumberStrings: true
});

let databaseInitializationPromise = null;

const COLLECTION_DEFAULTS = {
  salleAssignments: [],
  audienceDraft: {},
  recycleBin: [],
  recycleArchive: [],
  importHistory: []
};

function logDatabaseError(context, error, details = {}) {
  console.error(`[DB] ${context}`, {
    message: error?.message || 'Unknown database error',
    code: error?.code || null,
    errno: error?.errno || null,
    sqlState: error?.sqlState || null,
    sqlMessage: error?.sqlMessage || null,
    details,
    sql: error?.sql || null
  });
}

async function runQuery(executor, sql, params = [], context = 'query') {
  try {
    return await executor.query(sql, params);
  } catch (error) {
    logDatabaseError(context, error, { params });
    throw error;
  }
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonValue(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      logDatabaseError('Invalid JSON column payload', error, {
        preview: value.slice(0, 200)
      });
      return fallback;
    }
  }
  if (typeof value === 'object') {
    return value;
  }
  return fallback;
}

function serializeJsonValue(value, fallback) {
  const safeValue = value === undefined ? fallback : value;
  try {
    return JSON.stringify(safeValue);
  } catch (error) {
    logDatabaseError('JSON serialization failed', error, {
      valueType: typeof safeValue
    });
    return JSON.stringify(fallback);
  }
}

function normalizeDatabaseId(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
    return Number.isSafeInteger(value) ? value : String(Math.trunc(value));
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  const text = String(value).trim();
  if (!/^-?\d+$/.test(text)) return null;
  const numeric = Number(text);
  if (Number.isSafeInteger(numeric)) {
    return numeric;
  }
  return text;
}

function normalizeIdKey(value) {
  const normalized = normalizeDatabaseId(value);
  return normalized === null ? '' : String(normalized);
}

function buildDossierExternalId(clientId, dossier, index) {
  const preferred = [
    dossier?.externalId,
    dossier?.importUid,
    dossier?.uid,
    dossier?.id
  ].map((value) => String(value || '').trim()).find(Boolean);
  if (preferred) return preferred;
  const hashInput = JSON.stringify({
    clientId: String(clientId || ''),
    index,
    referenceClient: String(dossier?.referenceClient || '').trim(),
    debiteur: String(dossier?.debiteur || '').trim(),
    procedure: String(dossier?.procedure || '').trim(),
    dateAffectation: String(dossier?.dateAffectation || '').trim(),
    createdAt: String(dossier?.createdAt || '').trim()
  });
  const digest = crypto.createHash('sha1').update(hashInput).digest('hex').slice(0, 24);
  return `dossier-${String(clientId || 'unknown')}-${index}-${digest}`;
}

async function getCurrentDatabaseName(connection) {
  const [[row]] = await runQuery(connection, 'SELECT DATABASE() AS dbName', [], 'Resolve database name');
  return String(row?.dbName || '').trim();
}

async function hasColumn(connection, databaseName, tableName, columnName) {
  const [rows] = await runQuery(
    connection,
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [databaseName, tableName, columnName],
    `Check column ${tableName}.${columnName}`
  );
  return rows.length > 0;
}

async function hasIndex(connection, databaseName, tableName, indexName) {
  const [rows] = await runQuery(
    connection,
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [databaseName, tableName, indexName],
    `Check index ${tableName}.${indexName}`
  );
  return rows.length > 0;
}

async function ensureDossiersSchema(connection) {
  const databaseName = await getCurrentDatabaseName(connection);
  const hasExternalIdColumn = await hasColumn(connection, databaseName, 'dossiers', 'externalId');
  if (!hasExternalIdColumn) {
    await runQuery(
      connection,
      'ALTER TABLE dossiers ADD COLUMN externalId VARCHAR(255) NULL AFTER id',
      [],
      'Add dossiers.externalId'
    );
  }

  if (await hasIndex(connection, databaseName, 'dossiers', 'uk_dossier_rel')) {
    await runQuery(
      connection,
      'ALTER TABLE dossiers DROP INDEX uk_dossier_rel',
      [],
      'Drop legacy dossier unique key'
    );
  }

  await runQuery(
    connection,
    "UPDATE dossiers SET externalId = CONCAT('legacy-', id) WHERE externalId IS NULL OR TRIM(externalId) = ''",
    [],
    'Backfill dossiers.externalId'
  );

  await runQuery(
    connection,
    'ALTER TABLE dossiers MODIFY COLUMN externalId VARCHAR(255) NOT NULL',
    [],
    'Make dossiers.externalId mandatory'
  );

  const hasExternalIdUniqueKey = await hasIndex(connection, databaseName, 'dossiers', 'uk_dossier_external');
  if (!hasExternalIdUniqueKey) {
    await runQuery(
      connection,
      'ALTER TABLE dossiers ADD UNIQUE KEY uk_dossier_external (externalId)',
      [],
      'Add dossier external id unique key'
    );
  }
}

function initializeDatabase() {
  if (databaseInitializationPromise) {
    return databaseInitializationPromise;
  }

  databaseInitializationPromise = (async () => {
    const connection = await pool.getConnection();
    try {
      await runQuery(connection, `
        CREATE TABLE IF NOT EXISTS app_metadata (
          id VARCHAR(255) PRIMARY KEY,
          value TEXT,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `, [], 'Create app_metadata table');

      await runQuery(connection, `
        CREATE TABLE IF NOT EXISTS users (
          id BIGINT PRIMARY KEY,
          username VARCHAR(255) UNIQUE,
          passwordHash TEXT,
          passwordSalt TEXT,
          role VARCHAR(50),
          data JSON,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `, [], 'Create users table');

      await runQuery(connection, `
        CREATE TABLE IF NOT EXISTS clients (
          id BIGINT PRIMARY KEY,
          name VARCHAR(255),
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `, [], 'Create clients table');

      await runQuery(connection, `
        CREATE TABLE IF NOT EXISTS dossiers (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          externalId VARCHAR(255) NOT NULL,
          clientId BIGINT,
          referenceClient VARCHAR(255),
          debiteur VARCHAR(255),
          procedure_name TEXT,
          data JSON,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_dossier_external (externalId),
          INDEX(clientId),
          INDEX(referenceClient),
          INDEX(debiteur)
        )
      `, [], 'Create dossiers table');

      await runQuery(connection, `
        CREATE TABLE IF NOT EXISTS collections (
          name VARCHAR(255) PRIMARY KEY,
          data JSON,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `, [], 'Create collections table');

      await ensureDossiersSchema(connection);
    } finally {
      connection.release();
    }
  })().catch((error) => {
    databaseInitializationPromise = null;
    throw error;
  });

  return databaseInitializationPromise;
}

async function getPaginatedDossiers(offset = 0, limit = 50, filters = {}) {
  let query = `
    SELECT d.*, c.name AS clientName,
      (
        SELECT COUNT(*)
        FROM dossiers d2
        WHERE REPLACE(d2.referenceClient, ' ', '') = REPLACE(d.referenceClient, ' ', '')
          AND d2.referenceClient REGEXP '[0-9]'
      ) AS duplicateCount
    FROM dossiers d
    LEFT JOIN clients c ON d.clientId = c.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.search) {
    query += ` AND (c.name LIKE ? OR d.referenceClient LIKE ? OR d.debiteur LIKE ? OR JSON_EXTRACT(d.data, '$.reference') LIKE ?)`;
    const searchValue = `%${filters.search}%`;
    params.push(searchValue, searchValue, searchValue, searchValue);
  }

  if (filters.procedure && filters.procedure !== 'all') {
    query += ' AND d.procedure_name LIKE ?';
    params.push(`%${filters.procedure}%`);
  }

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM dossiers d
    LEFT JOIN clients c ON d.clientId = c.id
    WHERE 1=1
    ${filters.search ? "AND (c.name LIKE ? OR d.referenceClient LIKE ? OR d.debiteur LIKE ? OR JSON_EXTRACT(d.data, '$.reference') LIKE ?)" : ''}
    ${(filters.procedure && filters.procedure !== 'all') ? 'AND d.procedure_name LIKE ?' : ''}
  `;
  const countParams = [];
  if (filters.search) {
    const searchValue = `%${filters.search}%`;
    countParams.push(searchValue, searchValue, searchValue, searchValue);
  }
  if (filters.procedure && filters.procedure !== 'all') {
    countParams.push(`%${filters.procedure}%`);
  }

  const [countRows] = await runQuery(pool, countQuery, countParams, 'Count paginated dossiers');
  const total = Number(countRows[0]?.total || 0);

  query += ' ORDER BY d.id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const [rows] = await runQuery(pool, query, params, 'Fetch paginated dossiers');
  return {
    data: rows.map((row) => {
      const parsedData = parseJsonValue(row.data, {});
      return {
        ...parsedData,
        externalId: String(row.externalId || '').trim(),
        clientId: normalizeDatabaseId(row.clientId),
        clientName: row.clientName,
        referenceClient: row.referenceClient,
        debiteur: row.debiteur,
        procedure: row.procedure_name,
        dossierId: normalizeDatabaseId(row.id),
        isDuplicate: Number(row.duplicateCount || 0) > 1
      };
    }),
    total
  };
}

async function loadFullState() {
  try {
    const [metadataRows] = await runQuery(pool, 'SELECT * FROM app_metadata', [], 'Load app metadata');
    const [userRows] = await runQuery(pool, 'SELECT * FROM users ORDER BY username ASC', [], 'Load users');
    const [clientRows] = await runQuery(pool, 'SELECT * FROM clients ORDER BY name ASC', [], 'Load clients');
    const [dossierRows] = await runQuery(pool, 'SELECT * FROM dossiers ORDER BY id ASC', [], 'Load dossiers');
    const [collectionRows] = await runQuery(pool, 'SELECT * FROM collections', [], 'Load collections');

    const metadata = {};
    metadataRows.forEach((row) => {
      metadata[row.id] = row.value;
    });

    const dossierMap = new Map();
    dossierRows.forEach((row) => {
      const clientKey = normalizeIdKey(row.clientId);
      if (!clientKey) return;
      const payload = parseJsonValue(row.data, {});
      const dossier = {
        ...(isPlainObject(payload) ? payload : {}),
        externalId: String(row.externalId || '').trim(),
        clientId: normalizeDatabaseId(row.clientId),
        referenceClient: String(row.referenceClient || '').trim(),
        debiteur: String(row.debiteur || '').trim(),
        procedure: String(row.procedure_name || payload?.procedure || '').trim()
      };
      if (!dossierMap.has(clientKey)) {
        dossierMap.set(clientKey, []);
      }
      dossierMap.get(clientKey).push(dossier);
    });

    const state = {
      version: parseInt(metadata.version, 10) || 0,
      updatedAt: String(metadata.updatedAt || new Date().toISOString()),
      users: userRows.map((row) => {
        const extra = parseJsonValue(row.data, {});
        return {
          id: normalizeDatabaseId(row.id),
          username: row.username,
          passwordHash: row.passwordHash,
          passwordSalt: row.passwordSalt,
          role: row.role,
          ...(isPlainObject(extra) ? extra : {})
        };
      }),
      clients: clientRows.map((row) => {
        const clientId = normalizeDatabaseId(row.id);
        const clientKey = normalizeIdKey(clientId);
        return {
          id: clientId,
          name: row.name,
          dossiers: dossierMap.get(clientKey) || []
        };
      }),
      salleAssignments: [],
      audienceDraft: {},
      recycleBin: [],
      recycleArchive: [],
      importHistory: []
    };

    collectionRows.forEach((row) => {
      if (!Object.prototype.hasOwnProperty.call(state, row.name)) return;
      state[row.name] = parseJsonValue(row.data, COLLECTION_DEFAULTS[row.name]);
    });

    return state;
  } catch (error) {
    logDatabaseError('Load full state failed', error);
    throw error;
  }
}

async function saveClientState(client) {
  const currentState = await loadFullState();
  const nextClients = Array.isArray(currentState.clients) ? currentState.clients.slice() : [];
  const nextClientId = normalizeDatabaseId(client?.id);
  if (nextClientId === null) {
    throw new Error('Invalid client ID.');
  }
  const nextClient = {
    ...(client && typeof client === 'object' ? client : {}),
    id: nextClientId,
    dossiers: Array.isArray(client?.dossiers) ? client.dossiers : []
  };
  const existingIndex = nextClients.findIndex((item) => normalizeIdKey(item?.id) === normalizeIdKey(nextClientId));
  if (existingIndex >= 0) {
    nextClients[existingIndex] = nextClient;
  } else {
    nextClients.push(nextClient);
  }
  await saveFullState({
    ...currentState,
    clients: nextClients,
    updatedAt: new Date().toISOString()
  });
}

async function saveFullState(state) {
  const connection = await pool.getConnection();
  const safeState = state && typeof state === 'object' ? state : {};
  const safeClients = Array.isArray(safeState.clients) ? safeState.clients : [];
  const safeUsers = Array.isArray(safeState.users) ? safeState.users : [];

  try {
    await connection.beginTransaction();

    await runQuery(connection, 'DELETE FROM dossiers', [], 'Clear dossiers before snapshot insert');
    await runQuery(connection, 'DELETE FROM clients', [], 'Clear clients before snapshot insert');
    await runQuery(connection, 'DELETE FROM users', [], 'Clear users before snapshot insert');
    await runQuery(connection, 'DELETE FROM collections', [], 'Clear collections before snapshot insert');
    await runQuery(connection, 'DELETE FROM app_metadata', [], 'Clear metadata before snapshot insert');

    await runQuery(
      connection,
      'INSERT INTO app_metadata (id, value) VALUES (?, ?)',
      ['version', String(Number(safeState.version) || 0)],
      'Insert metadata.version'
    );
    await runQuery(
      connection,
      'INSERT INTO app_metadata (id, value) VALUES (?, ?)',
      ['updatedAt', String(safeState.updatedAt || new Date().toISOString())],
      'Insert metadata.updatedAt'
    );

    for (const user of safeUsers) {
      const userId = normalizeDatabaseId(user?.id);
      if (userId === null) {
        console.warn('[DB] Skipping user with invalid ID during snapshot save:', user?.id);
        continue;
      }
      const { id, username, passwordHash, passwordSalt, role, ...rest } = user;
      await runQuery(
        connection,
        'INSERT INTO users (id, username, passwordHash, passwordSalt, role, data) VALUES (?, ?, ?, ?, ?, ?)',
        [
          String(userId),
          String(username || '').trim(),
          String(passwordHash || ''),
          String(passwordSalt || ''),
          String(role || ''),
          serializeJsonValue(rest, {})
        ],
        `Insert user ${String(username || userId)}`
      );
    }

    let insertedDossiers = 0;
    for (const client of safeClients) {
      const clientId = normalizeDatabaseId(client?.id);
      if (clientId === null) {
        console.warn('[DB] Skipping client with invalid ID during snapshot save:', client?.id);
        continue;
      }

      await runQuery(
        connection,
        'INSERT INTO clients (id, name) VALUES (?, ?)',
        [String(clientId), String(client?.name || '').trim()],
        `Insert client ${String(client?.name || clientId)}`
      );

      const dossiers = Array.isArray(client?.dossiers) ? client.dossiers : [];
      for (let index = 0; index < dossiers.length; index += 1) {
        const dossier = dossiers[index];
        const externalId = buildDossierExternalId(clientId, dossier, index);
        await runQuery(
          connection,
          'INSERT INTO dossiers (externalId, clientId, referenceClient, debiteur, procedure_name, data) VALUES (?, ?, ?, ?, ?, ?)',
          [
            externalId,
            String(clientId),
            String(dossier?.referenceClient || '').trim(),
            String(dossier?.debiteur || '').trim(),
            String(dossier?.procedure || '').trim(),
            serializeJsonValue({
              ...(isPlainObject(dossier) ? dossier : {}),
              externalId,
              clientId
            }, {})
          ],
          `Insert dossier ${externalId}`
        );
        insertedDossiers += 1;
      }
    }

    for (const [collectionName, fallbackValue] of Object.entries(COLLECTION_DEFAULTS)) {
      const collectionValue = Object.prototype.hasOwnProperty.call(safeState, collectionName)
        ? safeState[collectionName]
        : fallbackValue;
      await runQuery(
        connection,
        'INSERT INTO collections (name, data) VALUES (?, ?)',
        [collectionName, serializeJsonValue(collectionValue, fallbackValue)],
        `Insert collection ${collectionName}`
      );
    }

    await connection.commit();
    console.info('[DB] Full snapshot committed', {
      users: safeUsers.length,
      clients: safeClients.length,
      dossiers: insertedDossiers
    });
  } catch (error) {
    await connection.rollback();
    logDatabaseError('Full snapshot save failed', error, {
      users: safeUsers.length,
      clients: safeClients.length
    });
    throw error;
  } finally {
    connection.release();
  }
}

async function saveStateMetadata(connection, meta = {}) {
  const version = String(Number(meta?.version) || 0);
  const updatedAt = String(meta?.updatedAt || new Date().toISOString());
  await runQuery(
    connection,
    'INSERT INTO app_metadata (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    ['version', version],
    'Upsert metadata.version'
  );
  await runQuery(
    connection,
    'INSERT INTO app_metadata (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    ['updatedAt', updatedAt],
    'Upsert metadata.updatedAt'
  );
}

async function saveUsersState(users, meta = {}) {
  const connection = await pool.getConnection();
  const safeUsers = Array.isArray(users) ? users : [];
  try {
    await connection.beginTransaction();
    await runQuery(connection, 'DELETE FROM users', [], 'Clear users before partial save');
    for (const user of safeUsers) {
      const userId = normalizeDatabaseId(user?.id);
      if (userId === null) continue;
      const { id, username, passwordHash, passwordSalt, role, ...rest } = user;
      await runQuery(
        connection,
        'INSERT INTO users (id, username, passwordHash, passwordSalt, role, data) VALUES (?, ?, ?, ?, ?, ?)',
        [
          String(userId),
          String(username || '').trim(),
          String(passwordHash || ''),
          String(passwordSalt || ''),
          String(role || ''),
          serializeJsonValue(rest, {})
        ],
        `Insert partial user ${String(username || userId)}`
      );
    }
    await saveStateMetadata(connection, meta);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    logDatabaseError('Partial users save failed', error, { users: safeUsers.length });
    throw error;
  } finally {
    connection.release();
  }
}

async function upsertUserState(user, meta = {}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const userId = normalizeDatabaseId(user?.id);
    if (userId === null) {
      throw new Error('Invalid user ID.');
    }
    const { id, username, passwordHash, passwordSalt, role, ...rest } = user || {};
    await runQuery(
      connection,
      `
        INSERT INTO users (id, username, passwordHash, passwordSalt, role, data)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          username = VALUES(username),
          passwordHash = VALUES(passwordHash),
          passwordSalt = VALUES(passwordSalt),
          role = VALUES(role),
          data = VALUES(data)
      `,
      [
        String(userId),
        String(username || '').trim(),
        String(passwordHash || ''),
        String(passwordSalt || ''),
        String(role || ''),
        serializeJsonValue(rest, {})
      ],
      `Upsert user ${String(username || userId)}`
    );
    await saveStateMetadata(connection, meta);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    logDatabaseError('User upsert failed', error, { username: user?.username || '', id: user?.id || null });
    throw error;
  } finally {
    connection.release();
  }
}

async function applyDossierMutation(patch, meta = {}) {
  const connection = await pool.getConnection();
  const action = String(patch?.action || '').trim().toLowerCase();
  const clientId = normalizeDatabaseId(patch?.clientId);
  const targetClientId = normalizeDatabaseId(patch?.targetClientId);
  const previousExternalId = String(patch?.previousExternalId || '').trim();
  const dossier = isPlainObject(patch?.dossier) ? patch.dossier : null;

  try {
    await connection.beginTransaction();

    if (action === 'create') {
      if (clientId === null || !dossier) {
        throw new Error('Invalid dossier create payload.');
      }
      const externalId = buildDossierExternalId(clientId, dossier, Date.now());
      const payload = {
        ...dossier,
        externalId,
        clientId
      };
      await runQuery(
        connection,
        'INSERT INTO dossiers (externalId, clientId, referenceClient, debiteur, procedure_name, data) VALUES (?, ?, ?, ?, ?, ?)',
        [
          externalId,
          String(clientId),
          String(dossier.referenceClient || '').trim(),
          String(dossier.debiteur || '').trim(),
          String(dossier.procedure || '').trim(),
          serializeJsonValue(payload, {})
        ],
        `Insert dossier ${externalId}`
      );
    } else if (action === 'update') {
      if (!previousExternalId || !dossier) {
        throw new Error('Invalid dossier update payload.');
      }
      const nextClientId = targetClientId === null ? clientId : targetClientId;
      const payload = {
        ...dossier,
        externalId: String(dossier.externalId || previousExternalId).trim() || previousExternalId,
        clientId: nextClientId
      };
      await runQuery(
        connection,
        'UPDATE dossiers SET externalId = ?, clientId = ?, referenceClient = ?, debiteur = ?, procedure_name = ?, data = ? WHERE externalId = ?',
        [
          String(payload.externalId),
          String(nextClientId),
          String(dossier.referenceClient || '').trim(),
          String(dossier.debiteur || '').trim(),
          String(dossier.procedure || '').trim(),
          serializeJsonValue(payload, {}),
          previousExternalId
        ],
        `Update dossier ${previousExternalId}`
      );
    } else if (action === 'delete') {
      if (!previousExternalId) {
        throw new Error('Invalid dossier delete payload.');
      }
      await runQuery(
        connection,
        'DELETE FROM dossiers WHERE externalId = ?',
        [previousExternalId],
        `Delete dossier ${previousExternalId}`
      );
    } else {
      throw new Error(`Unsupported dossier mutation action: ${action || 'unknown'}`);
    }

    await saveStateMetadata(connection, meta);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    logDatabaseError('Partial dossier mutation failed', error, { action, clientId, targetClientId, previousExternalId });
    throw error;
  } finally {
    connection.release();
  }
}

async function batchUpdateDossiers(updates) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const results = { updated: 0, skipped: 0, errors: [] };

    for (const update of updates) {
      const referenceClient = String(update?.referenceClient || '').trim();
      const debiteur = String(update?.debiteur || '').trim();
      const procedure = String(update?.procedure || '').trim();
      const data = isPlainObject(update?.data) ? update.data : {};

      if (!referenceClient) {
        results.skipped += 1;
        continue;
      }

      let findQuery = 'SELECT id, data FROM dossiers WHERE referenceClient = ?';
      const findParams = [referenceClient];
      if (debiteur) {
        findQuery += ' AND (debiteur LIKE ? OR debiteur = ?)';
        findParams.push(`%${debiteur}%`, debiteur);
      }

      const [existing] = await runQuery(connection, findQuery, findParams, `Find dossier ${referenceClient}`);
      if (!existing.length) {
        results.skipped += 1;
        continue;
      }

      const dossierId = normalizeDatabaseId(existing[0].id);
      const currentData = parseJsonValue(existing[0].data, {});
      const nextData = {
        ...(isPlainObject(currentData) ? currentData : {}),
        ...data
      };

      if (isPlainObject(data.procedureDetails) && isPlainObject(currentData.procedureDetails)) {
        nextData.procedureDetails = {
          ...currentData.procedureDetails,
          ...data.procedureDetails
        };
        Object.keys(data.procedureDetails).forEach((procedureName) => {
          nextData.procedureDetails[procedureName] = {
            ...(currentData.procedureDetails[procedureName] || {}),
            ...(data.procedureDetails[procedureName] || {})
          };
        });
      }

      await runQuery(
        connection,
        'UPDATE dossiers SET data = ?, procedure_name = COALESCE(?, procedure_name), debiteur = COALESCE(?, debiteur) WHERE id = ?',
        [
          serializeJsonValue(nextData, {}),
          procedure || null,
          debiteur || null,
          String(dossierId)
        ],
        `Update dossier ${referenceClient}`
      );
      results.updated += 1;
    }

    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    logDatabaseError('Batch dossier update failed', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  initializeDatabase,
  getPaginatedDossiers,
  saveClientState,
  loadFullState,
  saveFullState,
  saveUsersState,
  upsertUserState,
  applyDossierMutation,
  batchUpdateDossiers
};
