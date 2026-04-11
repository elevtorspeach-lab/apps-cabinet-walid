const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

// We import the db module to use its functions
const db = require('./db');

const STATE_FILE = path.join(__dirname, 'data', 'state.json');

async function migrate() {
  console.log('Starting migration to MySQL...');

  // 1. Create database if it doesn't exist
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  const dbName = process.env.DB_NAME || 'cabinet_db';
  console.log(`Ensuring database "${dbName}" exists...`);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.end();

  // 2. Initialize tables
  console.log('Initializing tables...');
  await db.initializeDatabase();

  // 3. Read state.json
  console.log(`Reading data from ${STATE_FILE}...`);
  let state;
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    state = JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('No state.json found. Creating tables only.');
      process.exit(0);
    }
    throw err;
  }

  // 4. Save to MySQL
  console.log('Saving data to MySQL...');
  await db.saveFullState(state);

  console.log('Migration completed successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
