const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

const db = require('./db');

const BACKUP_DIR = path.join(__dirname, 'data', 'manual-backups');

function buildBackupFileName() {
  const now = new Date();
  const yyyy = String(now.getFullYear()).padStart(4, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `mysql-state-backup-${yyyy}${mm}${dd}-${hh}${min}${ss}.json`;
}

async function backupMysqlState() {
  console.log('Loading current state from MySQL...');
  await db.initializeDatabase();
  const state = await db.loadFullState();

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(BACKUP_DIR, buildBackupFileName());
  await fs.writeFile(backupPath, JSON.stringify(state, null, 2), 'utf8');

  console.log(`Backup created: ${backupPath}`);
}

backupMysqlState().catch((error) => {
  console.error('MySQL backup failed:', error);
  process.exit(1);
});
