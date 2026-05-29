const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(os.homedir(), 'Desktop', 'Sauvegarde Cabinet Excel');
const clientsFilename = 'Sauvegarde Excel Clients.xlsx';
const diligenceFilename = 'Sauvegarde Excel Diligence.xlsx';

function loadXlsx() {
  const sourcePath = path.join(repoRoot, 'client', 'public', 'vendor', 'libs', 'xlsx.full.min.js');
  const sandbox = {
    Buffer,
    console,
    process,
    require,
    module: {},
    exports: {}
  };
  vm.runInNewContext(fs.readFileSync(sourcePath, 'utf8'), sandbox, { filename: sourcePath });
  if (typeof sandbox.make_xlsx_lib === 'function') {
    sandbox.make_xlsx_lib(sandbox.XLSX);
  }
  if (!sandbox.XLSX || !sandbox.XLSX.utils) {
    throw new Error('XLSX library unavailable.');
  }
  return sandbox.XLSX;
}

function loadExcelJs() {
  const sourcePath = path.join(repoRoot, 'client', 'public', 'vendor', 'libs', 'exceljs.min.js');
  const sandbox = {
    Buffer,
    console,
    process,
    require,
    setImmediate,
    clearImmediate,
    setTimeout,
    clearTimeout,
    module: { exports: {} },
    exports: {}
  };
  vm.runInNewContext(fs.readFileSync(sourcePath, 'utf8'), sandbox, { filename: sourcePath });
  const ExcelJS = sandbox.module.exports;
  if (!ExcelJS || typeof ExcelJS.Workbook !== 'function') {
    throw new Error('ExcelJS library unavailable.');
  }
  return ExcelJS;
}

function loadServerEnv() {
  const envPath = path.join(repoRoot, 'server', '.env');
  try {
    const text = fs.readFileSync(envPath, 'utf8');
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

async function loadState() {
  loadServerEnv();
  const db = require(path.join(repoRoot, 'server', 'db'));
  try {
    await db.initializeDatabase();
    return await db.loadFullState();
  } finally {
    await db.pool.end().catch(() => {});
  }
}

function clean(value) {
  return String(value ?? '').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim();
}

function fillToCols(row, size) {
  return [...row, ...Array(Math.max(0, size - row.length)).fill('')];
}

function normalizeProcedureToken(value) {
  return clean(value).replace(/\s+/g, ' ');
}

function normalizeProcedures(dossier) {
  if (!dossier || typeof dossier !== 'object') return [];
  const out = [];
  const seen = new Set();
  const push = (value) => {
    const normalized = normalizeProcedureToken(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };
  if (Array.isArray(dossier.procedureList)) {
    dossier.procedureList.forEach(push);
  }
  clean(dossier.procedure)
    .split(/[,+|;]+/)
    .forEach(push);
  if (dossier.procedureDetails && typeof dossier.procedureDetails === 'object') {
    Object.keys(dossier.procedureDetails).forEach(push);
  }
  return out;
}

function getProcedureBaseName(procedure) {
  const raw = normalizeProcedureToken(procedure);
  const lower = raw.toLowerCase();
  if (lower.includes('commandement')) return 'Commandement';
  if (lower.includes('injonction')) return 'Injonction';
  if (lower.includes('s/bien')) return 'S/bien';
  if (lower.includes('sfdc')) return 'SFDC';
  if (lower.includes('nantissement')) return 'Nantissement';
  if (lower === 'ass' || lower.includes('assignation')) return 'ASS';
  if (lower.includes('saisie') && lower.includes('arr')) return 'SAISIE ARRET';
  return raw;
}

function isAudienceProcedure(procedure) {
  const base = getProcedureBaseName(procedure);
  return ['ASS', 'Restitution', 'SFDC', 'S/bien', 'Injonction', 'Nantissement'].includes(base);
}

function isDiligenceProcedure(procedure) {
  const base = getProcedureBaseName(procedure);
  return ['ASS', 'SFDC', 'S/bien', 'Injonction', 'Commandement', 'Nantissement', 'SAISIE ARRET'].includes(base);
}

function normalizeAttOk(value) {
  const raw = clean(value).toLowerCase();
  if (!raw) return '';
  if (raw.includes('ok')) return 'ok';
  if (raw.includes('att')) return 'att';
  return '';
}

function isNotificationNumberOrdOk(value) {
  const raw = clean(value).replace(/\s+/g, '');
  return !!raw && (/^\d+$/.test(raw) || /^\d+(\/\d+)+$/.test(raw));
}

function getOrdonnanceLabel(details = {}) {
  const status = normalizeAttOk(details.attOrdOrOrdOk || details._audienceSortOrd || '');
  if (status === 'ok' || (!status && isNotificationNumberOrdOk(details.notificationNo))) return 'ORD OK';
  if (status === 'att') return 'ATT ORD';
  return '';
}

function normalizeDiligenceSort(value) {
  const raw = clean(value).toLowerCase();
  if (!raw) return 'Att PV';
  if (raw.includes('ok')) return 'PV OK';
  if (raw.includes('att') || raw === 'pv') return 'Att PV';
  return clean(value);
}

function normalizeNotificationSort(value, procedure) {
  const raw = clean(value).toLowerCase();
  if (!raw && ['ASS', 'Nantissement'].includes(getProcedureBaseName(procedure))) return '-';
  if (raw === 'nb' || raw.startsWith('nb ')) return 'NB';
  if (raw.includes('curateur') && raw.includes('notif')) return 'curateur notifie';
  if (raw.includes('notif')) return 'notifier';
  return clean(value);
}

function isAssNbLayout(row) {
  return ['ASS', 'Nantissement'].includes(getProcedureBaseName(row.procedure))
    && normalizeNotificationSort(row.details.notificationSort, row.procedure) === 'NB';
}

function getDiligenceReference(row) {
  if (getProcedureBaseName(row.procedure) === 'Commandement') return clean(row.details.refExpertise);
  return clean(row.details.referenceClient);
}

function getDiligenceRowCells(row) {
  const details = row.details || {};
  const dossier = row.dossier || {};
  const base = getProcedureBaseName(row.procedure);
  const commandement = base === 'Commandement';
  const assNb = isAssNbLayout(row);
  return [
    clean(row.procedure),
    clean(dossier.referenceClient),
    clean(dossier.debiteur),
    clean(details.depotLe || details.dateDepot),
    getDiligenceReference(row),
    commandement ? clean(details.juge) : clean(details.juge),
    ['ASS', 'Nantissement'].includes(base) ? clean(details.sort) : '',
    commandement ? clean(details.ord) : getOrdonnanceLabel(details),
    commandement ? clean(details.notifConservateur) : clean(details.notificationNo),
    commandement ? clean(details.notifDebiteur) : normalizeNotificationSort(details.notificationSort, row.procedure),
    assNb ? clean(details.lettreRec) : clean(details.certificatNonAppelStatus),
    assNb ? clean(details.curateurNo) : clean(details.executionNo),
    assNb ? getOrdonnanceLabel(details) : clean(dossier.ville || details.ville),
    commandement ? clean(details.dateVente) : (assNb ? clean(details.notifCurateur) : normalizeAttOk(details.attDelegationOuDelegat)),
    commandement ? clean(details.expert) : (assNb ? clean(details.sortNotif) : clean(details.huissier)),
    commandement ? clean(details.sort) : (assNb ? clean(details.avisCurateur) : (['SFDC', 'Injonction'].includes(base) ? clean(details.sort) : normalizeDiligenceSort(details.sort))),
    clean(details.dateExecution),
    clean(details.tribunal)
  ];
}

function buildClientsRows(state) {
  const dossierHeaders = [
    'client', 'affectation', 'type', 'procedure', 'ref client', 'debiteur', 'montant',
    'immatriculation', 'marque', 'adresse', 'ville', 'ref dossier assignation',
    'ref dossier restitution', 'ref dossier sfdc'
  ];
  const audienceHeaders = [
    'ref client', 'debiteur', 'ref dossier', 'audience', 'juge', 'sort', 'tribunal', 'date depot', 'statut'
  ];
  const totalCols = 14;
  const rows = [fillToCols(['SAUVEGARDE IMPORTABLE'], totalCols)];
  const clients = Array.isArray(state.clients) ? state.clients : [];
  clients.forEach((client, clientIndex) => {
    rows.push(fillToCols([`CLIENT : ${clean(client.name) || '-'}`], totalCols));
    rows.push(fillToCols(dossierHeaders, totalCols));
    const audienceRows = [];
    const dossiers = Array.isArray(client.dossiers) ? client.dossiers : [];
    if (dossiers.length) {
      dossiers.forEach((dossier) => {
        const procedures = normalizeProcedures(dossier);
        const details = dossier.procedureDetails && typeof dossier.procedureDetails === 'object' ? dossier.procedureDetails : {};
        rows.push(fillToCols([
          clean(client.name),
          clean(dossier.dateAffectation),
          clean(dossier.type),
          procedures.join('+'),
          clean(dossier.referenceClient),
          clean(dossier.debiteur),
          clean(dossier.montant),
          clean(dossier.ww),
          clean(dossier.marque),
          clean(dossier.adresse),
          clean(dossier.ville),
          clean(details.ASS?.referenceClient),
          clean(details.Restitution?.referenceClient),
          clean(details.SFDC?.referenceClient || details['S/bien']?.referenceClient || details.Injonction?.referenceClient)
        ], totalCols));
        Object.entries(details).forEach(([procName, procDetails]) => {
          if (!isAudienceProcedure(procName)) return;
          const p = procDetails || {};
          audienceRows.push(fillToCols([
            clean(dossier.referenceClient),
            clean(dossier.debiteur),
            clean(p.referenceClient),
            clean(p.audience),
            clean(p.juge),
            clean(p.sort),
            clean(p.tribunal),
            clean(p.depotLe || p.dateDepot),
            clean(dossier.statut || 'En cours')
          ], totalCols));
        });
      });
    } else {
      rows.push(fillToCols([''], totalCols));
    }
    rows.push(fillToCols([''], totalCols));
    rows.push(fillToCols(audienceHeaders, totalCols));
    if (audienceRows.length) audienceRows.forEach((row) => rows.push(row));
    else rows.push(fillToCols([''], totalCols));
    if (clientIndex < clients.length - 1) {
      rows.push(fillToCols([''], totalCols));
      rows.push(fillToCols([''], totalCols));
    }
  });
  return rows;
}

function buildClientsWorkbook(XLSX, state) {
  const rows = buildClientsRows(state);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [18, 15, 12, 26, 16, 20, 14, 16, 14, 30, 14, 20, 20, 20].map((wch) => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sauvegarde');
  return workbook;
}

function buildDiligenceRows(state) {
  const headers = [
    'Procedure', 'Reference client', 'Nom', 'Date depot', 'Reference dossier', 'Juge', 'Sort',
    'Ordonnance', 'Notification No', 'Sort notification', 'Certificat non appel / Lettre Rec',
    'Execution No / Curateur No', 'Ville / ORD', 'Delegation / Notif curateur',
    'Huissier / Sort notif', 'Avis curateur / Sort execution', 'Date execution', 'Tribunal'
  ];
  const rows = [
    ['SAUVEGARDE EXCEL - DILIGENCE'],
    [`Edition le ${new Date().toLocaleDateString('fr-FR')}`],
    []
  ];
  const clients = Array.isArray(state.clients) ? state.clients : [];
  clients.forEach((client, clientIndex) => {
    const diligenceRows = [];
    (Array.isArray(client.dossiers) ? client.dossiers : []).forEach((dossier) => {
      const detailsByProc = dossier.procedureDetails && typeof dossier.procedureDetails === 'object' ? dossier.procedureDetails : {};
      normalizeProcedures(dossier).forEach((procedure) => {
        if (!isDiligenceProcedure(procedure)) return;
        const row = {
          procedure,
          dossier,
          details: detailsByProc[procedure] || {},
        };
        diligenceRows.push(getDiligenceRowCells(row));
      });
    });
    if (!diligenceRows.length) return;
    rows.push([`CLIENT : ${clean(client.name) || '-'}`]);
    rows.push(headers);
    diligenceRows.forEach((row) => rows.push(row));
    if (clientIndex < clients.length - 1) rows.push([]);
  });
  return rows;
}

function buildDiligenceWorkbook(XLSX, state) {
  const rows = buildDiligenceRows(state);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [20, 24, 30, 18, 24, 22, 18, 18, 20, 22, 26, 22, 20, 24, 24, 24, 18, 32].map((wch) => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sauvegarde');
  return workbook;
}

function isNonEmptyCell(cell) {
  return String(cell?.value ?? '').trim() !== '';
}

function getLastUsedColumn(worksheet) {
  let max = 1;
  worksheet.eachRow((row) => {
    row.eachCell((cell, colNumber) => {
      if (isNonEmptyCell(cell)) max = Math.max(max, colNumber);
    });
  });
  return max;
}

function applyCellBorder(cell, color = 'FFD9E2F3') {
  cell.border = {
    top: { style: 'thin', color: { argb: color } },
    left: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } }
  };
}

function styleHeaderRow(row, lastCol) {
  row.height = 22;
  for (let col = 1; col <= lastCol; col += 1) {
    const cell = row.getCell(col);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    applyCellBorder(cell, 'FF9EADCC');
  }
}

function styleSectionRow(row, lastCol) {
  row.height = 22;
  for (let col = 1; col <= lastCol; col += 1) {
    const cell = row.getCell(col);
    cell.font = { bold: true, color: { argb: 'FF17365D' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAF7' } };
    cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'center', wrapText: true };
    applyCellBorder(cell, 'FFB7CEE8');
  }
}

function styleTitleRow(worksheet, row, lastCol) {
  row.height = 28;
  const start = row.getCell(1).address;
  const end = row.getCell(lastCol).address;
  try {
    worksheet.mergeCells(`${start}:${end}`);
  } catch (_) {}
  const cell = row.getCell(1);
  cell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123B8C' } };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
}

function styleDataRow(row, lastCol) {
  row.height = 20;
  for (let col = 1; col <= lastCol; col += 1) {
    const cell = row.getCell(col);
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    applyCellBorder(cell);
  }
}

function isClientsHeader(values) {
  const first = String(values[0] || '').toLowerCase();
  return first === 'client' || first === 'ref client';
}

function isDiligenceHeader(values) {
  return String(values[0] || '').toLowerCase() === 'procedure'
    && String(values[1] || '').toLowerCase().includes('reference');
}

async function writeStyledWorkbookFile(rows, filePath, kind) {
  const ExcelJS = loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Cabinet Walid Araqi';
  workbook.lastModifiedBy = 'Cabinet Walid Araqi';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Sauvegarde');
  rows.forEach((row, rowIndex) => {
    const values = Array.isArray(row) ? row : [];
    values.forEach((value, colIndex) => {
      worksheet.getCell(rowIndex + 1, colIndex + 1).value = value;
    });
  });

  const lastCol = getLastUsedColumn(worksheet);
  worksheet.properties.defaultRowHeight = 20;
  worksheet.views = [{ state: 'frozen', ySplit: kind === 'diligence' ? 3 : 1 }];
  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0
  };

  const widths = kind === 'diligence'
    ? [20, 24, 30, 16, 24, 22, 16, 18, 20, 22, 28, 22, 20, 24, 24, 24, 18, 32]
    : [22, 16, 14, 28, 18, 24, 14, 18, 16, 34, 16, 22, 22, 22];
  widths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  let firstHeaderRow = null;
  worksheet.eachRow((row, rowNumber) => {
    const values = [];
    for (let col = 1; col <= lastCol; col += 1) {
      values.push(String(row.getCell(col).value ?? '').trim());
    }
    const firstValue = values[0] || '';
    if (firstValue.startsWith('SAUVEGARDE')) {
      styleTitleRow(worksheet, row, lastCol);
      return;
    }
    if (firstValue.startsWith('CLIENT :')) {
      styleSectionRow(row, lastCol);
      return;
    }
    if ((kind === 'clients' && isClientsHeader(values)) || (kind === 'diligence' && isDiligenceHeader(values))) {
      if (!firstHeaderRow) firstHeaderRow = rowNumber;
      styleHeaderRow(row, lastCol);
      return;
    }
    if (values.some(Boolean)) {
      styleDataRow(row, lastCol);
    }
  });

  if (kind === 'diligence' && firstHeaderRow) {
    worksheet.autoFilter = {
      from: { row: firstHeaderRow, column: 1 },
      to: { row: firstHeaderRow, column: lastCol }
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  await fsp.writeFile(filePath, Buffer.from(buffer));
}

async function replaceOutputFiles(XLSX, state) {
  await fsp.mkdir(outputDir, { recursive: true });
  const clientsPath = path.join(outputDir, clientsFilename);
  const diligencePath = path.join(outputDir, diligenceFilename);
  await Promise.all([
    fsp.rm(clientsPath, { force: true }),
    fsp.rm(diligencePath, { force: true })
  ]);
  await Promise.all([
    writeStyledWorkbookFile(buildClientsRows(state), clientsPath, 'clients'),
    writeStyledWorkbookFile(buildDiligenceRows(state), diligencePath, 'diligence')
  ]);
  return { clientsPath, diligencePath };
}

async function main() {
  const XLSX = loadXlsx();
  const state = await loadState();
  const result = await replaceOutputFiles(XLSX, state);
  console.log(`Excel backups written:\n${result.clientsPath}\n${result.diligencePath}`);
}

main().catch((error) => {
  console.error('Excel backup failed:', error);
  process.exit(1);
});
