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
});

async function initializeDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_metadata (
        id VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        username VARCHAR(255) UNIQUE,
        passwordHash TEXT,
        passwordSalt TEXT,
        role VARCHAR(50),
        data JSON,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255),
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Normalized dossiers table storing JSON safely but indexing keys
    await connection.query(`
      CREATE TABLE IF NOT EXISTS dossiers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        clientId BIGINT,
        referenceClient VARCHAR(255),
        debiteur VARCHAR(255),
        procedure_name TEXT,
        data JSON,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX(clientId),
        INDEX(referenceClient),
        INDEX(debiteur)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS collections (
        name VARCHAR(255) PRIMARY KEY,
        data JSON,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } finally {
    connection.release();
  }
}

// Enterprise Pagination Functions
async function getPaginatedDossiers(offset = 0, limit = 50, filters = {}) {
  let query = `
    SELECT d.*, c.name as clientName,
      (SELECT COUNT(*) FROM dossiers d2 
       WHERE REPLACE(d2.referenceClient, ' ', '') = REPLACE(d.referenceClient, ' ', '') 
       AND d2.referenceClient REGEXP '[0-9]'
      ) as duplicateCount
    FROM dossiers d 
    LEFT JOIN clients c ON d.clientId = c.id
    WHERE 1=1
  `;
  const params = [];
  
  if (filters.search) {
    query += ` AND (c.name LIKE ? OR d.referenceClient LIKE ? OR d.debiteur LIKE ? OR JSON_EXTRACT(d.data, '$.reference') LIKE ?)`;
    const s = `%${filters.search}%`;
    params.push(s, s, s, s);
  }

  if (filters.procedure && filters.procedure !== 'all') {
    query += ` AND d.procedure_name LIKE ?`;
    params.push(`%${filters.procedure}%`);
  }

  // Count total matches (using a simpler count query to avoid subquery overhead for total count)
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM dossiers d 
    LEFT JOIN clients c ON d.clientId = c.id
    WHERE 1=1
    ${filters.search ? "AND (c.name LIKE ? OR d.referenceClient LIKE ? OR d.debiteur LIKE ? OR JSON_EXTRACT(d.data, '$.reference') LIKE ?)" : ""}
    ${(filters.procedure && filters.procedure !== 'all') ? "AND d.procedure_name LIKE ?" : ""}
  `;
  const countParams = [];
  if (filters.search) {
    const s = `%${filters.search}%`;
    countParams.push(s, s, s, s);
  }
  if (filters.procedure && filters.procedure !== 'all') {
    countParams.push(`%${filters.procedure}%`);
  }
  
  const [countRows] = await pool.query(countQuery, countParams);
  const total = countRows[0].total;

  // Append pagination
  query += ` ORDER BY d.id DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.query(query, params);
  return {
    data: rows.map(r => ({
      ...r.data,
      clientId: r.clientId,
      clientName: r.clientName,
      referenceClient: r.referenceClient,
      debiteur: r.debiteur,
      procedure: r.procedure_name,
      dossierId: r.id,
      isDuplicate: (r.duplicateCount || 0) > 1
    })),
    total
  };
}

// Deprecated fallback for legacy compatibility during transition
async function loadFullState() {
  const [metadataRows] = await pool.query('SELECT * FROM app_metadata');
  const [userRows] = await pool.query('SELECT * FROM users');
  const [clientRows] = await pool.query('SELECT * FROM clients');
  const [dossierRows] = await pool.query('SELECT * FROM dossiers LIMIT 1000'); // Failsafe limit
  const [collectionRows] = await pool.query('SELECT * FROM collections');

  const metadata = {};
  metadataRows.forEach(row => metadata[row.id] = row.value);

  const state = {
    version: parseInt(metadata.version) || 0,
    updatedAt: metadata.updatedAt || new Date().toISOString(),
    users: userRows.map(row => ({
      id: row.id,
      username: row.username,
      passwordHash: row.passwordHash,
      passwordSalt: row.passwordSalt,
      role: row.role,
      ...(row.data || {})
    })),
    clients: clientRows.map(row => {
      const clientDossiers = dossierRows
        .filter(d => d.clientId === row.id)
        .map(d => ({
          ...d.data,
          clientId: d.clientId,
          referenceClient: d.referenceClient,
          debiteur: d.debiteur
        }));
      return {
        id: row.id,
        name: row.name,
        dossiers: clientDossiers
      };
    }),
    salleAssignments: [],
    audienceDraft: {},
    recycleBin: [],
    recycleArchive: [],
    importHistory: []
  };

  collectionRows.forEach(row => {
    if (state.hasOwnProperty(row.name)) {
      state[row.name] = row.data;
    }
  });

  return state;
}

// Ensure Legacy app.js form submissions can persist a single client directly
async function saveClientState(client) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('INSERT IGNORE INTO clients (id, name) VALUES (?, ?)', [client.id, client.name]);
    
    // Legacy mapping: delete client dossiers then re-insert to avoid ID tracking complexity for now
    if (client.dossiers) {
       await connection.query('DELETE FROM dossiers WHERE clientId = ?', [client.id]);
       for (const dossier of client.dossiers) {
          const { referenceClient, debiteur, procedure, ...rest } = dossier;
          await connection.query(
            'INSERT INTO dossiers (clientId, referenceClient, debiteur, procedure_name, data) VALUES (?, ?, ?, ?, ?)',
            [client.id, referenceClient || '', debiteur || '', procedure || '', JSON.stringify(dossier)]
          );
       }
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function saveFullState(state) {
  // Safe minimal implementation for metadata
  await pool.query('REPLACE INTO app_metadata (id, value) VALUES (?, ?)', ['version', String(state.version)]);
  await pool.query('REPLACE INTO app_metadata (id, value) VALUES (?, ?)', ['updatedAt', state.updatedAt]);
  
  if (state.users) {
    await pool.query('DELETE FROM users');
    for (const user of state.users) {
      const { id, username, passwordHash, passwordSalt, role, ...rest } = user;
      await pool.query(
        'INSERT INTO users (id, username, passwordHash, passwordSalt, role, data) VALUES (?, ?, ?, ?, ?, ?)',
        [id, username, passwordHash, passwordSalt, role, JSON.stringify(rest)]
      );
    }
  }
}

async function batchUpdateDossiers(updates) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const results = { updated: 0, skipped: 0, errors: [] };

    for (const update of updates) {
      const { referenceClient, debiteur, procedure, data } = update;
      
      // Try to find the dossier by referenceClient
      // If referenceClient is missing, we skip it
      if (!referenceClient) {
        results.skipped++;
        continue;
      }

      // Find the dossier. If debiteur is provided, use it to disambiguate
      let findQuery = 'SELECT id, data FROM dossiers WHERE referenceClient = ?';
      const findParams = [referenceClient];
      if (debiteur) {
        findQuery += ' AND (debiteur LIKE ? OR debiteur = ?)';
        const d = `%${debiteur}%`;
        findParams.push(d, debiteur);
      }

      const [existing] = await connection.query(findQuery, findParams);

      if (existing.length > 0) {
        // Use the first match (most recent or best match)
        const dossierId = existing[0].id;
        const currentData = existing[0].data || {};
        
        // Merge procedureDetails specifically if present
        const nextData = { ...currentData, ...data };
        if (data.procedureDetails && currentData.procedureDetails) {
          nextData.procedureDetails = {
            ...currentData.procedureDetails,
            ...data.procedureDetails
          };
          // Deep merge for each procedure name in update
          Object.keys(data.procedureDetails).forEach(procName => {
            nextData.procedureDetails[procName] = {
              ...(currentData.procedureDetails[procName] || {}),
              ...(data.procedureDetails[procName] || {})
            };
          });
        }

        await connection.query(
          'UPDATE dossiers SET data = ?, procedure_name = COALESCE(?, procedure_name), debiteur = COALESCE(?, debiteur) WHERE id = ?',
          [JSON.stringify(nextData), procedure || null, debiteur || null, dossierId]
        );
        results.updated++;
      } else {
        results.skipped++;
      }
    }

    await connection.commit();
    return results;
  } catch (err) {
    await connection.rollback();
    throw err;
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
  batchUpdateDossiers
};
