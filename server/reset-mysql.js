const mysql = require('mysql2/promise');
require('dotenv').config();

const db = require('./db');

const EMPTY_STATE = {
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

async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    const dbName = process.env.DB_NAME || 'cabinet_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  } finally {
    await connection.end();
  }
}

async function resetMysql() {
  console.log('Preparing clean MySQL database...');
  await ensureDatabaseExists();
  await db.initializeDatabase();
  await db.saveFullState(EMPTY_STATE);
  console.log('MySQL reset complete. The application state is now empty.');
}

resetMysql().catch((error) => {
  console.error('MySQL reset failed:', error);
  process.exit(1);
});
