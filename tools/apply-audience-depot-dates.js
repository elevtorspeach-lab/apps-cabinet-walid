const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
process.chdir(SERVER_DIR);

const db = require(path.join(SERVER_DIR, 'db'));

const DEFAULT_TARGET_FILES = [
  'audience assignation  OK .xlsx',
  'audience rest OK .xlsx',
  'audience ASS hors global ok .xlsx',
  'audience rest hors global OK .xlsx',
  'audience saham bank  ok  .xlsx',
  'audience salafin ok .xlsx',
  'audience rest salafin OK .xlsx',
  'audience sofac ok .xlsx'
];

const DOWNLOADS_DIR = 'C:\\Users\\Administrator\\Downloads';
const dryRun = process.argv.includes('--dry-run');
const requestedFiles = process.argv
  .slice(2)
  .filter((arg) => arg !== '--dry-run')
  .map((arg) => path.basename(arg));
const TARGET_FILES = requestedFiles.length ? requestedFiles : DEFAULT_TARGET_FILES;

function loadXlsx() {
  const xlsxPath = path.join(ROOT_DIR, 'client', 'public', 'vendor', 'libs', 'xlsx.full.min.js');
  const code = fs.readFileSync(xlsxPath, 'utf8');
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  if (!sandbox.XLSX) throw new Error('XLSX library not loaded.');
  return sandbox.XLSX;
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeHeader(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ء-ي]+/g, ' ')
    .trim();
}

function refKey(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function normalizeDate(value) {
  if (value === null || value === undefined) return '';
  const isDateObject = Object.prototype.toString.call(value) === '[object Date]';
  if (isDateObject && !Number.isNaN(value.getTime())) {
    return `${pad2(value.getDate())}/${pad2(value.getMonth() + 1)}/${value.getFullYear()}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 1900 && value <= 2200 && Number.isInteger(value)) return String(value);
    if (value < 30000) return '';
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!Number.isNaN(date.getTime())) {
      return `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
    }
  }
  const text = normalizeText(value);
  if (!text) return '';
  if (/^(19|20|21|22)\d{2}$/.test(text)) return text;
  const match = text.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (!match) return text;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  let day = Number(match[1]);
  let month = Number(match[2]);
  if (month > 12 && day <= 12) {
    day = Number(match[2]);
    month = Number(match[1]);
  }
  if (day < 1 || day > 31 || month < 1 || month > 12) return '';
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

function findHeaderIndexes(row) {
  const headers = row.map(normalizeHeader);
  let refIndex = -1;
  let depotIndex = -1;
  headers.forEach((header, index) => {
    if (
      refIndex < 0 &&
      (
        header.includes('reference dossier') ||
        header.includes('ref dossier') ||
        header.includes('ref ass') ||
        header.includes('n dossier') ||
        header === 'ref'
      )
    ) {
      refIndex = index;
    }
    if (depotIndex < 0 && header.includes('date depot')) {
      depotIndex = index;
    }
  });
  return { refIndex, depotIndex };
}

function extractDepotDatesByRef(XLSX, filePath) {
  const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer', cellDates: true });
  const datesByRef = new Map();
  const conflicts = [];
  let rowsWithRef = 0;
  let rowsWithDepot = 0;

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true, cellDates: true });
    let headerRowIndex = -1;
    let refIndex = -1;
    let depotIndex = -1;

    for (let rowIndex = 0; rowIndex < Math.min(rows.length, 40); rowIndex += 1) {
      const found = findHeaderIndexes(rows[rowIndex] || []);
      if (found.refIndex >= 0 && found.depotIndex >= 0) {
        headerRowIndex = rowIndex;
        refIndex = found.refIndex;
        depotIndex = found.depotIndex;
        break;
      }
    }

    if (headerRowIndex < 0) return;

    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const dossierRef = refKey(row[refIndex]);
      const depotDate = normalizeDate(row[depotIndex]);
      if (!dossierRef) continue;
      rowsWithRef += 1;
      if (depotDate) rowsWithDepot += 1;
      const existing = datesByRef.get(dossierRef);
      if (existing && existing !== depotDate) {
        conflicts.push({ ref: dossierRef, first: existing, second: depotDate, sheetName, row: rowIndex + 1 });
        continue;
      }
      datesByRef.set(dossierRef, depotDate);
    }
  });

  return { datesByRef, conflicts, rowsWithRef, rowsWithDepot };
}

function dossierUid(dossier) {
  return normalizeText(dossier?.externalId || dossier?.importUid || dossier?.uid || dossier?.id);
}

async function main() {
  const XLSX = loadXlsx();
  const state = await db.loadFullState();
  const clients = Array.isArray(state.clients) ? state.clients : [];

  const dossiersByUid = new Map();
  clients.forEach((client) => {
    (Array.isArray(client.dossiers) ? client.dossiers : []).forEach((dossier) => {
      const uid = dossierUid(dossier);
      if (uid) dossiersByUid.set(uid, dossier);
    });
  });

  const excelByFile = new Map();
  const missingFiles = [];
  TARGET_FILES.forEach((fileName) => {
    const filePath = path.join(DOWNLOADS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(fileName);
      return;
    }
    excelByFile.set(fileName, extractDepotDatesByRef(XLSX, filePath));
  });

  const changes = [];
  const skippedNoExcelDate = [];
  const skippedMissingDossier = [];
  const skippedMissingProcedure = [];

  (Array.isArray(state.importHistory) ? state.importHistory : []).forEach((entry) => {
    const fileName = normalizeText(entry?.fileName);
    if (normalizeText(entry?.type).toLowerCase() !== 'audience') return;
    if (!TARGET_FILES.includes(fileName)) return;
    const excelInfo = excelByFile.get(fileName);
    if (!excelInfo) return;

    (Array.isArray(entry.operations) ? entry.operations : []).forEach((operation) => {
      const uid = normalizeText(operation?.dossierUid);
      const procKey = normalizeText(operation?.procKey);
      if (!uid || !procKey) return;
      const dossier = dossiersByUid.get(uid);
      if (!dossier) {
        skippedMissingDossier.push({ fileName, uid, procKey });
        return;
      }
      const details = dossier.procedureDetails?.[procKey];
      if (!details) {
        skippedMissingProcedure.push({ fileName, uid, procKey });
        return;
      }
      const dossierRef = refKey(details.referenceClient || dossier.referenceClient || operation?.beforeProc?.referenceClient);
      if (!excelInfo.datesByRef.has(dossierRef)) {
        skippedNoExcelDate.push({ fileName, ref: dossierRef, procKey });
        return;
      }
      const depotDate = excelInfo.datesByRef.get(dossierRef) || '';
      const currentDepot = normalizeText(details.depotLe || details.dateDepot);
      if (currentDepot === depotDate && normalizeText(details.depotLe) === depotDate && normalizeText(details.dateDepot) === depotDate) return;
      changes.push({
        fileName,
        uid,
        procKey,
        ref: dossierRef,
        beforeDepotLe: normalizeText(details.depotLe),
        beforeDateDepot: normalizeText(details.dateDepot),
        after: depotDate,
        details
      });
    });
  });

  const summary = {
    dryRun,
    filesFound: Array.from(excelByFile.keys()),
    missingFiles,
    excelRowsWithRef: Array.from(excelByFile.entries()).reduce((sum, [, info]) => sum + info.rowsWithRef, 0),
    excelRowsWithDepot: Array.from(excelByFile.entries()).reduce((sum, [, info]) => sum + info.rowsWithDepot, 0),
    excelUniqueRefsWithDepot: Array.from(excelByFile.entries()).reduce((sum, [, info]) => sum + info.datesByRef.size, 0),
    excelConflicts: Array.from(excelByFile.entries()).reduce((sum, [, info]) => sum + info.conflicts.length, 0),
    changes: changes.length,
    skippedNoExcelDate: skippedNoExcelDate.length,
    skippedMissingDossier: skippedMissingDossier.length,
    skippedMissingProcedure: skippedMissingProcedure.length,
    examples: changes.slice(0, 12).map((change) => ({
      fileName: change.fileName,
      ref: change.ref,
      procKey: change.procKey,
      beforeDepotLe: change.beforeDepotLe,
      beforeDateDepot: change.beforeDateDepot,
      after: change.after
    }))
  };

  console.log(JSON.stringify(summary, null, 2));

  if (dryRun) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(ROOT_DIR, 'backups', 'manual', stamp);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(
    path.join(backupDir, 'mysql-state-before-audience-depot-date-update.json'),
    JSON.stringify(state, null, 2),
    'utf8'
  );

  changes.forEach((change) => {
    change.details.depotLe = change.after;
    change.details.dateDepot = change.after;
  });

  const nextState = {
    ...state,
    version: Number(state.version || 0) + 1,
    updatedAt: new Date().toISOString()
  };
  await db.saveFullState(nextState);
  console.log(JSON.stringify({ saved: true, backupDir, changes: changes.length }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    db.pool.end().catch(() => {});
  });
