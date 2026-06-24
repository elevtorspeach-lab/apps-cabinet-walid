const fs = require('fs');
const path = require('path');
const mysql = require('../server/node_modules/mysql2/promise');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const TARGET_TIME = Date.parse('2026-06-20T14:45:45.714Z');
const WINDOW_MS = 2000;
const APPLY = process.env.APPLY === '1';

function parseData(value) {
  if (value && typeof value === 'object') return value;
  return JSON.parse(String(value || '{}'));
}

function normalizeStatus(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.includes('ok')) return 'ok';
  if (raw.includes('att')) return 'att';
  return '';
}

function getCurrentLabel(dossier, procedure) {
  const p = dossier?.procedureDetails?.[procedure] || {};
  const explicit = String(p.color || '').trim();
  if (explicit === 'white') return 'Blanc';
  if (explicit === 'blue') return 'Att sort';
  if (explicit === 'purple-dark') return 'Soldé / Arrêt définitif';
  if (explicit === 'purple-light') return 'Arrêt définitif';
  if (normalizeStatus(p.attDelegationOuDelegat) === 'att') return 'ATT DELEGATION';
  const ordonnance = normalizeStatus(p.attOrdOrOrdOk || p._audienceSortOrd);
  if (ordonnance === 'att') return 'ATT ORD';
  if (ordonnance === 'ok') return 'ORD OK';
  if (String(dossier?.statut || '').trim() === 'Soldé') return 'Soldé / Arrêt définitif';
  if (String(dossier?.statut || '').trim() === 'Arrêt définitif') return 'Arrêt définitif';
  return 'Blanc';
}

function clearCommonAudienceFlags(p) {
  delete p._disableAudienceRowColor;
  delete p._suppressAudienceOrdonnanceColor;
}

function clearOrdonnance(p) {
  delete p.attOrdOrOrdOk;
  delete p._audienceSortOrd;
}

function clearWaitingDelegation(p) {
  if (normalizeStatus(p.attDelegationOuDelegat) === 'att') delete p.attDelegationOuDelegat;
}

function restoreLabel(dossier, procedure, label) {
  if (!dossier.procedureDetails || typeof dossier.procedureDetails !== 'object') dossier.procedureDetails = {};
  if (!dossier.procedureDetails[procedure] || typeof dossier.procedureDetails[procedure] !== 'object') {
    dossier.procedureDetails[procedure] = {};
  }
  const p = dossier.procedureDetails[procedure];
  switch (label) {
    case 'ATT ORD':
      p.attOrdOrOrdOk = 'att ord';
      p._audienceSortOrd = 'att ord';
      p.color = '';
      clearWaitingDelegation(p);
      clearCommonAudienceFlags(p);
      break;
    case 'Blanc':
      p.color = 'white';
      clearWaitingDelegation(p);
      clearCommonAudienceFlags(p);
      break;
    case 'Att sort':
      clearOrdonnance(p);
      clearWaitingDelegation(p);
      clearCommonAudienceFlags(p);
      p.color = 'blue';
      break;
    case 'ATT DELEGATION':
      p.attDelegationOuDelegat = 'att';
      p._suppressAudienceOrdonnanceColor = '1';
      delete p._disableAudienceRowColor;
      p.color = '';
      break;
    case 'Soldé / Arrêt définitif':
      clearOrdonnance(p);
      clearWaitingDelegation(p);
      clearCommonAudienceFlags(p);
      p.color = 'purple-dark';
      dossier.statut = 'Soldé';
      break;
    case 'Arrêt définitif':
      clearOrdonnance(p);
      clearWaitingDelegation(p);
      clearCommonAudienceFlags(p);
      p.color = 'purple-light';
      dossier.statut = 'Arrêt définitif';
      break;
    default:
      throw new Error(`Unsupported previous color: ${label}`);
  }
}

function isTargetHistoryEntry(entry) {
  const time = Date.parse(String(entry?.at || ''));
  return String(entry?.source || '') === 'audience-color'
    && String(entry?.after || '') === 'ORD OK'
    && Number.isFinite(time)
    && Math.abs(time - TARGET_TIME) <= WINDOW_MS;
}

function hasLaterRelevantChange(history, procedure) {
  return history.some((entry) => {
    const time = Date.parse(String(entry?.at || ''));
    if (!Number.isFinite(time) || time <= TARGET_TIME + WINDOW_MS) return false;
    if (String(entry?.procedure || '') !== String(procedure || '')) return false;
    const field = String(entry?.field || '');
    return String(entry?.source || '') === 'audience-color'
      || field.includes('attOrdOrOrdOk')
      || field.includes('attDelegationOuDelegat')
      || field.includes('procedureDetails.color')
      || field === 'statut';
  });
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    if (APPLY) await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, externalId, clientId, referenceClient, debiteur, procedure_name, data
       FROM dossiers${APPLY ? ' FOR UPDATE' : ''}`
    );

    const candidates = [];
    const skippedAlreadyRestored = [];
    const skippedLaterChange = [];
    for (const row of rows) {
      const dossier = parseData(row.data);
      const originalData = JSON.parse(JSON.stringify(dossier));
      const history = Array.isArray(dossier.history) ? dossier.history : [];
      const hits = history.filter(isTargetHistoryEntry);
      for (const entry of hits) {
        const procedure = String(entry.procedure || '').trim();
        const before = String(entry.before || '').trim();
        const current = getCurrentLabel(dossier, procedure);
        const item = {
          id: row.id,
          externalId: row.externalId,
          clientId: row.clientId,
          referenceClient: row.referenceClient,
          debiteur: row.debiteur,
          procedure,
          before,
          current,
          procedure_name: row.procedure_name,
          originalData,
          dossier
        };
        if (hasLaterRelevantChange(history, procedure)) {
          skippedLaterChange.push(item);
        } else if (current === before) {
          skippedAlreadyRestored.push(item);
        } else {
          candidates.push(item);
        }
      }
    }

    const uniqueRows = new Map();
    for (const item of candidates) {
      if (!uniqueRows.has(item.id)) uniqueRows.set(item.id, item);
      restoreLabel(item.dossier, item.procedure, item.before);
    }

    const summary = {
      mode: APPLY ? 'apply' : 'dry-run',
      targetTime: new Date(TARGET_TIME).toISOString(),
      targetEntries: candidates.length + skippedAlreadyRestored.length + skippedLaterChange.length,
      restoreEntries: candidates.length,
      updateRows: uniqueRows.size,
      alreadyRestored: skippedAlreadyRestored.map(({ dossier, ...item }) => item),
      skippedLaterChange: skippedLaterChange.map(({ dossier, ...item }) => item),
      transitions: candidates.reduce((out, item) => {
        const key = `ORD OK -> ${item.before}`;
        out[key] = (out[key] || 0) + 1;
        return out;
      }, {})
    };

    if (!APPLY) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const backupDir = path.join(__dirname, '..', 'backups', 'manual-audience-color-restore');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${stamp}-before-restore.json`);
    fs.writeFileSync(backupPath, JSON.stringify({
      ...summary,
      originalRows: [...uniqueRows.values()].map(item => ({
        id: item.id,
        externalId: item.externalId,
        clientId: item.clientId,
        referenceClient: item.referenceClient,
        debiteur: item.debiteur,
        procedure_name: item.procedure_name,
        data: item.originalData
      }))
    }, null, 2), 'utf8');

    for (const item of uniqueRows.values()) {
      await connection.query('UPDATE dossiers SET data = ? WHERE id = ?', [
        JSON.stringify(item.dossier),
        item.id
      ]);
    }
    await connection.commit();
    console.log(JSON.stringify({ ...summary, backupPath }, null, 2));
  } catch (error) {
    if (APPLY) await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
