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
    // 1. Metadata Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_metadata (
        id VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 2. Users Table
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

    // 3. Clients Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255),
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 4. Dossiers Table
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

    // 5. Settings / Collections Table
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

async function loadFullState() {
  const [metadataRows] = await pool.query('SELECT * FROM app_metadata');
  const [userRows] = await pool.query('SELECT * FROM users');
  const [clientRows] = await pool.query('SELECT * FROM clients');
  const [dossierRows] = await pool.query('SELECT * FROM dossiers');
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

async function saveFullState(state) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Save Metadata
    await connection.query('REPLACE INTO app_metadata (id, value) VALUES (?, ?)', ['version', String(state.version)]);
    await connection.query('REPLACE INTO app_metadata (id, value) VALUES (?, ?)', ['updatedAt', state.updatedAt]);

    // Save Users
    await connection.query('DELETE FROM users');
    if (state.users && state.users.length > 0) {
      for (const user of state.users) {
        const { id, username, passwordHash, passwordSalt, role, ...rest } = user;
        await connection.query(
          'INSERT INTO users (id, username, passwordHash, passwordSalt, role, data) VALUES (?, ?, ?, ?, ?, ?)',
          [id, username, passwordHash, passwordSalt, role, JSON.stringify(rest)]
        );
      }
    }

    // Save Clients and Dossiers
    await connection.query('DELETE FROM dossiers');
    await connection.query('DELETE FROM clients');
    if (state.clients && state.clients.length > 0) {
      for (const client of state.clients) {
        await connection.query('INSERT INTO clients (id, name) VALUES (?, ?)', [client.id, client.name]);
        if (client.dossiers && client.dossiers.length > 0) {
          for (const dossier of client.dossiers) {
            const { referenceClient, debiteur, procedure, ...rest } = dossier;
            await connection.query(
              'INSERT INTO dossiers (clientId, referenceClient, debiteur, procedure_name, data) VALUES (?, ?, ?, ?, ?)',
              [client.id, referenceClient || '', debiteur || '', procedure || '', JSON.stringify(dossier)]
            );
          }
        }
      }
    }

    // Save Collections
    const collections = ['salleAssignments', 'audienceDraft', 'recycleBin', 'recycleArchive', 'importHistory'];
    for (const name of collections) {
      if (state[name]) {
        await connection.query('REPLACE INTO collections (name, data) VALUES (?, ?)', [name, JSON.stringify(state[name])]);
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

module.exports = {
  pool,
  initializeDatabase,
  loadFullState,
  saveFullState
};
