const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(__dirname, 'fichiers');

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

const templates = [
  {
    filename: '01 - IMPORT GLOBAL.xlsx',
    sheet: 'IMPORT GLOBAL',
    headers: [
      'client', 'n / ref', 'affectation', 'gestionnaire', 'type', 'procedure',
      'ref client', 'debiteur', 'montant', 'immatriculation', 'boite n', 'caution',
      'marque', 'adresse', 'ville', 'adresse caution', 'ville caution', 'cin caution',
      'rc', 'cin non debiteur', 'tf n', 'conservation', 'metrage',
      'ref dossier assignation', 'ref dossier restitution', 'ref dossier sfdc',
      'ref dossier injonction', 'ref dossier', 'ref expertise', 'juge', 'sort ord',
      'expert', 'date vente', 'lettre rec', 'curateur n', 'notif curateur',
      'sort notif', 'avis curateur', 'pv police', 'certificat non appel',
      'statut notification', 'delegation', 'huissier', 'date execution', 'mise a prix',
      'plie', 'pub au journal', 'plie cmd', 'lot du', 'debiteur fr', 'debiteur ar',
      'cin/rc', 'rib', 'banque fr', 'banque ar', 'adresse banque', 'avocat',
      'sort plie', 'notif banque', 'notif debiteur', 'sort notification',
      'notification n', 'execution n', 'date depot', 'sort execution', 'sort',
      'sort sci', 'observation', 'tribunal', 'statut'
    ]
  },
  {
    filename: '02 - IMPORT AUDIENCE.xlsx',
    sheet: 'IMPORT AUDIENCE',
    headers: [
      'ref client', 'debiteur', 'adversaire', 'sinistre n', 'ref dossier',
      'procedure', 'audience', 'juge', 'sort', 'sort ord', 'tribunal',
      'date depot', 'statut'
    ]
  },
  {
    filename: '03 - DILIGENCE ASS.xlsx',
    sheet: 'DILIGENCE ASS',
    headers: [
      'client', 'type', 'ref client', 'debiteur', 'date depot', 'ref dossier',
      'procedure', 'juge', 'sort', 'sort ord', 'notification n', 'plie',
      'sort notification', 'observation', 'lettre rec', 'curateur n', 'ord',
      'notif curateur', 'sort notif', 'avis curateur', 'pv police',
      'certificat non appel', 'execution n', 'ville', 'delegation', 'huissier',
      'sort execution', 'tribunal', 'boite n', 'statut'
    ]
  },
  {
    filename: '04 - DILIGENCE SFDC.xlsx',
    sheet: 'DILIGENCE SFDC',
    headers: [
      'client', 'type', 'ref client', 'debiteur', 'date depot', 'ref dossier',
      'procedure', 'sort ord', 'execution n', 'ville', 'delegation', 'huissier',
      'sort execution', 'tribunal', 'boite n', 'statut'
    ]
  },
  {
    filename: '05 - DILIGENCE INJONCTION.xlsx',
    sheet: 'DILIGENCE INJ',
    headers: [
      'client', 'type', 'ref client', 'debiteur', 'date depot', 'ref dossier',
      'procedure', 'sort ord', 'notification n', 'sort notification', 'observation',
      'certificat non appel', 'execution n', 'ville', 'delegation', 'huissier',
      'sort execution', 'tribunal', 'boite n', 'statut'
    ]
  },
  {
    filename: '06 - DILIGENCE S-BIEN.xlsx',
    sheet: 'DILIGENCE S-BIEN',
    headers: [
      'Client', 'Type', 'Référence client', 'Débiteur', 'Date dépôt',
      'Référence dossier', 'Sort ORD', 'Execution N°', 'Ville', 'Observation',
      'Délégation', 'Huissier', 'Sort exécution', 'Date execution', 'Tribunal',
      'Montant', 'Adresse', 'Boîte N°'
    ]
  },
  {
    filename: '07 - DILIGENCE SAISIE ARRET.xlsx',
    sheet: 'SAISIE ARRET',
    headers: [
      'client', 'ref client', 'lot du', 'debiteur fr', 'adresse', 'ville',
      'montant', 'rib', 'banque fr', 'adresse banque', 'date depot',
      'ref dossier', 'observation', 'sort ord', 'execution n', 'sort plie',
      'notif banque', 'notif debiteur', 'boite n', 'statut', 'tribunal',
      'avocat', 'gestionnaire', 'cin/rc'
    ]
  },
  {
    filename: '08 - DILIGENCE SCI TF.xlsx',
    sheet: 'DILIGENCE SCI TF',
    headers: [
      'client', 'lot du', 'ref client', 'cin non debiteur', 'debiteur', 'caution',
      'tf n', 'conservation', 'observation', 'date depot', 'ref dossier',
      'procedure', 'sort ord', 'sort sci', 'tribunal', 'adresse', 'montant',
      'statut', 'boite n', 'avocat', 'type'
    ]
  },
  {
    filename: '09 - DILIGENCE COMMANDEMENT.xlsx',
    sheet: 'COMMANDEMENT',
    headers: [
      'client', 'type', 'ref client', 'debiteur', 'ref dossier', 'procedure',
      'date depot', 'execution n', 'plie', 'pub au journal', 'notification n',
      'notif debiteur', 'lettre rec', 'curateur n', 'ord', 'notif curateur',
      'sort notif', 'avis curateur', 'pv police', 'ref expertise', 'expert',
      'mise a prix', 'date vente', 'tribunal', 'boite n', 'statut'
    ]
  },
  {
    filename: '10 - DILIGENCE NANTISSEMENT.xlsx',
    sheet: 'NANTISSEMENT',
    headers: [
      'client', 'type', 'ref client', 'debiteur', 'date depot', 'ref dossier',
      'procedure', 'juge', 'sort', 'sort ord', 'notification n', 'plie',
      'sort notification', 'observation', 'lettre rec', 'curateur n', 'ord',
      'notif curateur', 'sort notif', 'avis curateur', 'pv police',
      'certificat non appel', 'execution n', 'ville', 'ref expertise', 'expert',
      'mise a prix', 'date vente', 'tribunal', 'boite n', 'statut'
    ]
  },
  {
    filename: '11 - DILIGENCE NANTISSEMENT MED.xlsx',
    sheet: 'NANTISSEMENT MED',
    headers: [
      'client', 'ref client', 'procedure', 'date depot', 'ref dossier', 'ord',
      'sort ord', 'notification n', 'sort notif', 'avis curateur', 'pv police',
      'certificat non appel', 'execution n', 'ville', 'delegation', 'huissier',
      'sort execution', 'tribunal', 'boite n', 'statut'
    ]
  }
];

function columnWidth(header) {
  const text = String(header || '');
  return Math.min(34, Math.max(14, text.length + 4));
}

async function main() {
  const ExcelJS = loadExcelJs();
  fs.mkdirSync(outputDir, { recursive: true });
  const generated = [];

  for (const template of templates) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Cabinet Walid';
    workbook.company = 'Cabinet Walid';
    workbook.created = new Date();
    workbook.modified = new Date();
    const sheet = workbook.addWorksheet(template.sheet, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });
    const headerRow = sheet.getRow(1);
    template.headers.forEach((header, index) => {
      headerRow.getCell(index + 1).value = header;
    });
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: template.headers.length }
    };
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17365D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9FBAD0' } },
        left: { style: 'thin', color: { argb: 'FF9FBAD0' } },
        bottom: { style: 'thin', color: { argb: 'FF9FBAD0' } },
        right: { style: 'thin', color: { argb: 'FF9FBAD0' } }
      };
      cell.protection = { locked: true };
    });
    template.headers.forEach((header, index) => {
      sheet.getColumn(index + 1).width = columnWidth(header);
    });
    sheet.properties.defaultRowHeight = 20;
    sheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9
    };
    sheet.headerFooter.oddFooter = '&LCabinet Walid&RPage &P / &N';
    const outputPath = path.join(outputDir, template.filename);
    const buffer = await workbook.xlsx.writeBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    generated.push({
      path: outputPath,
      filename: template.filename,
      headers: template.headers.length
    });
  }

  fs.writeFileSync(
    path.join(__dirname, 'manifest.json'),
    JSON.stringify(generated, null, 2),
    'utf8'
  );
  console.log(JSON.stringify({ outputDir, generated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
