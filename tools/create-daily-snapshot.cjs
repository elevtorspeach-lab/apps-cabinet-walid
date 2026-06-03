const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fsSync = require('fs');
const fs = require('fs/promises');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const backupRoot = path.join(repoRoot, 'backups', 'daily');

function pad(value) {
  return String(value).padStart(2, '0');
}

function buildTimestamp(date = new Date()) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + '_' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('-');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    label: '',
    codeOnly: false
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--label') {
      out.label = String(args[index + 1] || '').trim();
      index += 1;
    } else if (arg.startsWith('--label=')) {
      out.label = arg.slice('--label='.length).trim();
    } else if (arg === '--code-only') {
      out.codeOnly = true;
    }
  }
  return out;
}

function resolveGitPath() {
  const candidates = [
    process.env.GIT_EXE,
    'C:\\Program Files\\Git\\cmd\\git.exe',
    'C:\\Program Files\\Git\\bin\\git.exe',
    'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
    'git'
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'git' || fsSync.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'git';
}

const gitPath = resolveGitPath();

function git(args) {
  return execFileSync(gitPath, ['-c', `safe.directory=${repoRoot}`, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_) {
    return false;
  }
}

function hashText(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

async function hashFile(filePath) {
  return crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
}

function getTrackedFiles() {
  return git(['ls-files', '-z'])
    .split('\0')
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => !file.startsWith('backups/'))
    .filter((file) => fsSync.existsSync(path.join(repoRoot, file)));
}

async function copyTrackedFiles(files, targetFilesDir) {
  for (const relativeFile of files) {
    const source = path.join(repoRoot, relativeFile);
    const target = path.join(targetFilesDir, relativeFile);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }
}

async function hashTrackedFiles(files) {
  const out = {};
  for (const relativeFile of files) {
    out[relativeFile] = await hashFile(path.join(repoRoot, relativeFile));
  }
  return out;
}

function snapshotDateFromId(id) {
  const match = String(id || '').match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6])
  );
}

async function walkSnapshots() {
  if (!(await pathExists(backupRoot))) return [];
  const days = await fs.readdir(backupRoot, { withFileTypes: true });
  const snapshots = [];
  for (const day of days) {
    if (!day.isDirectory()) continue;
    const dayPath = path.join(backupRoot, day.name);
    const entries = await fs.readdir(dayPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const createdAt = snapshotDateFromId(entry.name);
      if (!createdAt) continue;
      snapshots.push({
        id: entry.name,
        day: day.name,
        dir: path.join(dayPath, entry.name),
        createdAt
      });
    }
  }
  snapshots.sort((a, b) => a.createdAt - b.createdAt);
  return snapshots;
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

async function loadSnapshotFileIndex(snapshot) {
  if (!snapshot) return {};
  const existingIndex = await readJsonIfExists(path.join(snapshot.dir, 'file-index.json'), null);
  if (existingIndex && typeof existingIndex === 'object' && !Array.isArray(existingIndex)) {
    return existingIndex;
  }
  const manifest = await readJsonIfExists(path.join(snapshot.dir, 'manifest.json'), []);
  const files = Array.isArray(manifest) ? manifest : [];
  const index = {};
  for (const relativeFile of files) {
    const filePath = path.join(snapshot.dir, 'files', relativeFile);
    if (await pathExists(filePath)) {
      index[relativeFile] = await hashFile(filePath);
    }
  }
  return index;
}

async function loadSnapshotMysqlHash(snapshot) {
  if (!snapshot) return '';
  const metadata = await readJsonIfExists(path.join(snapshot.dir, 'metadata.json'), {});
  if (metadata && typeof metadata.mysqlStateHash === 'string' && metadata.mysqlStateHash) {
    return metadata.mysqlStateHash;
  }
  const statePath = path.join(snapshot.dir, 'mysql-state.json');
  if (!(await pathExists(statePath))) return '';
  return hashFile(statePath);
}

async function loadServerEnv() {
  const envPath = path.join(repoRoot, 'server', '.env');
  try {
    const text = await fs.readFile(envPath, 'utf8');
    text.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex === -1) return;
      const key = trimmed.slice(0, equalsIndex).trim();
      const rawValue = trimmed.slice(equalsIndex + 1).trim();
      if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) return;
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    });
  } catch (_) {}
}

async function readMysqlState() {
  await loadServerEnv();
  const db = require(path.join(repoRoot, 'server', 'db'));
  try {
    await db.initializeDatabase();
    return await db.loadFullState();
  } finally {
    await db.pool.end().catch(() => {});
  }
}

async function main() {
  const options = parseArgs();
  const now = new Date();
  const dayDir = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('-');
  const snapshotId = buildTimestamp(now);
  const snapshotDir = path.join(backupRoot, dayDir, snapshotId);
  const filesDir = path.join(snapshotDir, 'files');
  const files = getTrackedFiles();
  const fileIndex = await hashTrackedFiles(files);
  const commit = git(['rev-parse', 'HEAD']).trim();
  const previousSnapshot = (await walkSnapshots()).at(-1) || null;
  const previousFileIndex = await loadSnapshotFileIndex(previousSnapshot);

  const changedFiles = files.filter((file) => previousFileIndex[file] !== fileIndex[file]);
  const deletedFiles = Object.keys(previousFileIndex).filter((file) => !Object.prototype.hasOwnProperty.call(fileIndex, file));

  let mysqlStateSaved = false;
  let mysqlStateHash = '';
  let mysqlStateChanged = false;
  if (!options.codeOnly) {
    const state = await readMysqlState();
    const mysqlStateJson = JSON.stringify(state, null, 2);
    mysqlStateHash = hashText(mysqlStateJson);
    const previousMysqlStateHash = await loadSnapshotMysqlHash(previousSnapshot);
    mysqlStateChanged = mysqlStateHash !== previousMysqlStateHash;
    if (mysqlStateChanged) {
      await fs.mkdir(snapshotDir, { recursive: true });
      await fs.writeFile(path.join(snapshotDir, 'mysql-state.json'), mysqlStateJson, 'utf8');
      mysqlStateSaved = true;
    }
  }

  if (!changedFiles.length && !deletedFiles.length && !mysqlStateChanged) {
    console.log('No changes since last snapshot. Snapshot skipped.');
    if (previousSnapshot) console.log(`Latest snapshot: ${previousSnapshot.dir}`);
    return;
  }

  await fs.mkdir(snapshotDir, { recursive: true });
  await copyTrackedFiles(changedFiles, filesDir);

  if (options.codeOnly) {
    mysqlStateHash = await loadSnapshotMysqlHash(previousSnapshot);
  }

  const metadata = {
    id: snapshotId,
    createdAt: now.toISOString(),
    localTime: now.toString(),
    label: options.label,
    backupMode: previousSnapshot ? 'incremental' : 'full',
    baseSnapshotId: previousSnapshot?.id || '',
    commit,
    fileCount: files.length,
    changedFileCount: changedFiles.length,
    deletedFileCount: deletedFiles.length,
    changedFiles,
    deletedFiles,
    mysqlStateSaved,
    mysqlStateHash,
    mysqlStateChanged,
    restoreCommand: `node tools/restore-daily-snapshot.cjs "${dayDir} ${snapshotId.slice(11).replace(/-/g, ':')}" --yes --exact`
  };
  await fs.writeFile(
    path.join(snapshotDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );
  await fs.writeFile(
    path.join(snapshotDir, 'manifest.json'),
    JSON.stringify(files, null, 2),
    'utf8'
  );
  await fs.writeFile(
    path.join(snapshotDir, 'file-index.json'),
    JSON.stringify(fileIndex, null, 2),
    'utf8'
  );

  console.log(`Snapshot created: ${snapshotDir}`);
  console.log(`Files: ${files.length} tracked, ${changedFiles.length} changed, ${deletedFiles.length} deleted`);
  console.log(`MySQL state: ${mysqlStateSaved ? 'saved' : 'unchanged'}`);
}

main().catch((error) => {
  console.error('Snapshot failed:', error);
  process.exit(1);
});
