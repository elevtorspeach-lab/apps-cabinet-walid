const { execFileSync } = require('child_process');
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

function git(args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function getTrackedFiles() {
  return git(['ls-files', '-z'])
    .split('\0')
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => !file.startsWith('backups/'));
}

async function copyTrackedFiles(files, targetFilesDir) {
  for (const relativeFile of files) {
    const source = path.join(repoRoot, relativeFile);
    const target = path.join(targetFilesDir, relativeFile);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }
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
  const commit = git(['rev-parse', 'HEAD']).trim();

  await fs.mkdir(snapshotDir, { recursive: true });
  await copyTrackedFiles(files, filesDir);

  let mysqlStateSaved = false;
  if (!options.codeOnly) {
    const state = await readMysqlState();
    await fs.writeFile(
      path.join(snapshotDir, 'mysql-state.json'),
      JSON.stringify(state, null, 2),
      'utf8'
    );
    mysqlStateSaved = true;
  }

  const metadata = {
    id: snapshotId,
    createdAt: now.toISOString(),
    localTime: now.toString(),
    label: options.label,
    commit,
    fileCount: files.length,
    mysqlStateSaved,
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

  console.log(`Snapshot created: ${snapshotDir}`);
  console.log(`Files: ${files.length}`);
  console.log(`MySQL state: ${mysqlStateSaved ? 'saved' : 'skipped'}`);
}

main().catch((error) => {
  console.error('Snapshot failed:', error);
  process.exit(1);
});
