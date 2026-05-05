const fs = require('fs/promises');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const backupRoot = path.join(repoRoot, 'backups', 'daily');

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseTargetDate(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/[àa]\s*/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const fr = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2})(?::|h)?(\d{0,2})?)?$/);
  if (fr) {
    const day = Number(fr[1]);
    const month = Number(fr[2]) - 1;
    const year = Number(fr[3]);
    const hour = fr[4] === undefined ? 23 : Number(fr[4]);
    const minute = fr[5] ? Number(fr[5]) : 59;
    return new Date(year, month, day, hour, minute, 59);
  }

  const iso = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T_](\d{1,2})(?::|-)?(\d{0,2})?(?::|-)?(\d{0,2})?)?$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]) - 1;
    const day = Number(iso[3]);
    const hour = iso[4] === undefined ? 23 : Number(iso[4]);
    const minute = iso[5] ? Number(iso[5]) : 59;
    const second = iso[6] ? Number(iso[6]) : 59;
    return new Date(year, month, day, hour, minute, second);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    target: '',
    yes: false,
    exact: false,
    codeOnly: false,
    dataOnly: false,
    noPreRestoreSnapshot: false,
    list: false
  };
  const parts = [];
  args.forEach((arg) => {
    if (arg === '--yes') out.yes = true;
    else if (arg === '--exact') out.exact = true;
    else if (arg === '--code-only') out.codeOnly = true;
    else if (arg === '--data-only') out.dataOnly = true;
    else if (arg === '--no-pre-restore-snapshot') out.noPreRestoreSnapshot = true;
    else if (arg === '--list') out.list = true;
    else parts.push(arg);
  });
  out.target = parts.join(' ').trim();
  return out;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_) {
    return false;
  }
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
      const snapshotDir = path.join(dayPath, entry.name);
      snapshots.push({
        id: entry.name,
        day: day.name,
        dir: snapshotDir,
        createdAt
      });
    }
  }
  snapshots.sort((a, b) => a.createdAt - b.createdAt);
  return snapshots;
}

function findSnapshot(snapshots, targetDate) {
  const candidates = snapshots.filter((snapshot) => snapshot.createdAt <= targetDate);
  if (candidates.length) return candidates[candidates.length - 1];
  return snapshots[0] || null;
}

async function listSnapshots() {
  const snapshots = await walkSnapshots();
  if (!snapshots.length) {
    console.log('No snapshots found.');
    return;
  }
  snapshots.forEach((snapshot) => {
    console.log(`${snapshot.id}  ${snapshot.dir}`);
  });
}

async function copyDirectory(sourceDir, targetDir) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await fs.mkdir(target, { recursive: true });
      await copyDirectory(source, target);
    } else if (entry.isFile()) {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target);
    }
  }
}

async function restoreFiles(snapshot, options) {
  const filesDir = path.join(snapshot.dir, 'files');
  const manifestPath = path.join(snapshot.dir, 'manifest.json');
  if (!(await pathExists(filesDir)) || !(await pathExists(manifestPath))) {
    throw new Error(`Snapshot files are incomplete: ${snapshot.dir}`);
  }

  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const snapshotFileSet = new Set(Array.isArray(manifest) ? manifest : []);

  await copyDirectory(filesDir, repoRoot);

  if (!options.exact) return;

  const { execFileSync } = require('child_process');
  const currentTracked = execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
    .split('\0')
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => !file.startsWith('backups/'));

  for (const file of currentTracked) {
    if (snapshotFileSet.has(file)) continue;
    await fs.rm(path.join(repoRoot, file), { force: true });
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

async function restoreMysqlState(snapshot) {
  const statePath = path.join(snapshot.dir, 'mysql-state.json');
  if (!(await pathExists(statePath))) {
    throw new Error(`Snapshot has no mysql-state.json: ${snapshot.dir}`);
  }
  const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
  await loadServerEnv();
  const db = require(path.join(repoRoot, 'server', 'db'));
  try {
    await db.initializeDatabase();
    await db.saveFullState({
      ...state,
      updatedAt: new Date().toISOString()
    });
  } finally {
    await db.pool.end().catch(() => {});
  }
}

async function createPreRestoreSnapshot() {
  const { execFileSync } = require('child_process');
  execFileSync(
    process.execPath,
    [path.join(__dirname, 'create-daily-snapshot.cjs'), '--label', 'pre-restore'],
    {
      cwd: repoRoot,
      stdio: 'inherit'
    }
  );
}

async function main() {
  const options = parseArgs();
  if (options.list) {
    await listSnapshots();
    return;
  }
  if (options.codeOnly && options.dataOnly) {
    throw new Error('Use only one of --code-only or --data-only.');
  }

  const targetDate = parseTargetDate(options.target);
  if (!targetDate) {
    throw new Error('Give a target date, for example: "04/05/2026 15:00". Use --list to list snapshots.');
  }
  const snapshots = await walkSnapshots();
  const snapshot = findSnapshot(snapshots, targetDate);
  if (!snapshot) {
    throw new Error('No snapshots found.');
  }

  console.log(`Target: ${targetDate.toString()}`);
  console.log(`Selected snapshot: ${snapshot.id}`);
  console.log(snapshot.dir);

  if (!options.yes) {
    console.log('');
    console.log('Dry run only. Add --yes to restore.');
    console.log('Use --exact to remove tracked files that did not exist in the snapshot.');
    return;
  }

  if (!options.noPreRestoreSnapshot) {
    await createPreRestoreSnapshot();
  }
  if (!options.dataOnly) {
    await restoreFiles(snapshot, options);
    console.log('Code/files restored.');
  }
  if (!options.codeOnly) {
    await restoreMysqlState(snapshot);
    console.log('MySQL state restored.');
  }
}

main().catch((error) => {
  console.error('Restore failed:', error);
  process.exit(1);
});
