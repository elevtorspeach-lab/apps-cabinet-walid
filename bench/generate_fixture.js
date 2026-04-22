#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_CLIENTS = Number(process.env.TARGET_CLIENTS || 2);
const TARGET_DOSSIERS = Number(process.env.TARGET_DOSSIERS || 8_000);
const TARGET_AUDIENCE = Number(process.env.TARGET_AUDIENCE || 12_000);
const TARGET_DILIGENCE = Number(process.env.TARGET_DILIGENCE || 8_000);
const TOTAL_MANAGERS = Number(process.env.TOTAL_MANAGERS || 1);
const TOTAL_ADMINS = Number(process.env.TOTAL_ADMINS || 8);
const TOTAL_CLIENT_USERS = Number(process.env.TOTAL_CLIENT_USERS || 2);
const USE_FIXED_APP_USERS = String(process.env.BENCH_USE_FIXED_APP_USERS || '1').trim() !== '0';
const OUTPUT_FILE = path.resolve(process.env.OUTPUT_FILE || path.join(ROOT_DIR, 'bench-runs', `fixture-${Date.now()}.json`));

const FIXED_MANAGER_USERS = [
  { username: 'manager', role: 'manager', password: '1234' },
  { username: 'walid', role: 'manager', password: 'messi@123' }
];

const FIXED_ADMIN_USERS = [
  { username: 'ghita', role: 'admin', password: 'ghita@2110' },
  { username: 'doha', role: 'admin', password: 'sahi@345' },
  { username: 'najwa', role: 'admin', password: 'najwa@1234' },
  { username: 'yasmine', role: 'admin', password: 'yasmine@092' },
  { username: 'souhaila', role: 'admin', password: 'souhaila@192' }
];

const DEFAULT_CLIENT_NAMES = [
  'Eqdom',
  'Salafin',
  'Sanlam',
  'Saham Assurance',
  'SOFAC'
];

function log(message) {
  console.log(`[fixture] ${message}`);
}

function resolveBenchClientNames() {
  const raw = String(process.env.BENCH_CLIENT_NAMES || '').trim();
  if (!raw) return DEFAULT_CLIENT_NAMES;
  const names = raw
    .split(/[|,;]/)
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return names.length ? names : DEFAULT_CLIENT_NAMES;
}

function parseProcedureToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return '';
  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (compact === 'ass') return 'ASS';
  if (compact === 'commandement' || compact === 'cmd' || compact === 'com') return 'Commandement';
  if (compact === 'sfdc') return 'SFDC';
  if (compact === 'sbien') return 'S/bien';
  if (compact === 'inj' || compact === 'injonction') return 'Injonction';
  return raw;
}

function getProcedureBaseName(procName) {
  const raw = String(procName || '').trim();
  if (!raw) return '';
  return raw.replace(/\d+$/, '').trim() || raw;
}

function isAudienceProcedure(procName) {
  const value = String(procName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!value) return false;
  return value !== 'sfdc' && value !== 'sbien' && value !== 'injonction';
}

function isDiligenceProcedure(procName) {
  const base = getProcedureBaseName(parseProcedureToken(procName));
  return base === 'ASS'
    || base === 'SFDC'
    || base === 'S/bien'
    || base === 'Injonction'
    || base === 'Commandement';
}

function buildUsers(clientIds) {
  const users = [];
  let nextId = 1;
  const pushUser = (username, role, password, assignedClientIds = []) => {
    users.push({
      id: nextId++,
      username,
      password,
      passwordHash: '',
      passwordSalt: '',
      passwordVersion: 0,
      passwordUpdatedAt: new Date().toISOString(),
      requirePasswordChange: false,
      role,
      clientIds: assignedClientIds
    });
  };

  if (USE_FIXED_APP_USERS) {
    FIXED_MANAGER_USERS.slice(0, TOTAL_MANAGERS).forEach((user) => {
      pushUser(user.username, user.role, user.password, []);
    });
    FIXED_ADMIN_USERS.slice(0, TOTAL_ADMINS).forEach((user) => {
      pushUser(user.username, user.role, user.password, []);
    });
    for (let index = FIXED_MANAGER_USERS.length; index < TOTAL_MANAGERS; index += 1) {
      pushUser(`manager${index + 1}`, 'manager', '1234', []);
    }
    for (let index = FIXED_ADMIN_USERS.length; index < TOTAL_ADMINS; index += 1) {
      pushUser(`admin${index + 1}`, 'admin', '1234', []);
    }
  } else {
    for (let index = 0; index < TOTAL_MANAGERS; index += 1) {
      pushUser(index === 0 ? 'manager' : `manager${index + 1}`, 'manager', '1234', []);
    }
    for (let index = 0; index < TOTAL_ADMINS; index += 1) {
      pushUser(`admin${index + 1}`, 'admin', '1234', []);
    }
  }
  for (let index = 0; index < TOTAL_CLIENT_USERS; index += 1) {
    const targetClientId = clientIds[index % Math.max(1, clientIds.length)] || null;
    pushUser(`client${index + 1}`, 'client', '1234', targetClientId ? [targetClientId] : []);
  }

  return users;
}

function generateFixture() {
  const benchClientNames = resolveBenchClientNames();
  const diligenceProcedures = ['ASS', 'Commandement', 'SFDC', 'S/bien', 'Injonction'];
  const tribunals = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Oujda', 'Meknès'];
  const villes = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Kenitra', 'Tétouan', 'Safi'];
  const sorts = ['En cours', 'Renvoi', 'att PV', 'PV OK', 'NB'];
  const ordonnances = ['att', 'ok', 'ATT ORD', 'ORD OK'];
  const juges = Array.from({ length: 30 }, (_, index) => `Juge ${index + 1}`);
  const notifSorts = ['NB', 'att certificat non appel', '1 Att lettre du TR', '1 envoyer au TR'];

  const clients = [];
  let dossierCount = 0;
  let audienceCount = 0;
  let diligenceCount = 0;
  const dossiersPerClient = Math.ceil(TARGET_DOSSIERS / Math.max(1, TARGET_CLIENTS));

  for (let clientIndex = 0; clientIndex < TARGET_CLIENTS; clientIndex += 1) {
    const clientId = clientIndex + 1;
    const dossiers = [];
    const numDossiers = Math.min(dossiersPerClient, TARGET_DOSSIERS - dossierCount);

    for (let dossierIndex = 0; dossierIndex < numDossiers; dossierIndex += 1) {
      dossierCount += 1;
      const refClient = `REF-${clientId}-${dossierIndex + 1}`;
      const debiteur = `Debiteur ${dossierCount}`;
      const ville = villes[dossierCount % villes.length];
      const procedureDetails = {};
      const montantByProcedure = {};
      const selectedProcedures = [];

      if (diligenceCount < TARGET_DILIGENCE) {
        const diligenceProc = diligenceProcedures[dossierCount % diligenceProcedures.length];
        selectedProcedures.push(diligenceProc);
        diligenceCount += 1;
        if (isAudienceProcedure(diligenceProc)) {
          audienceCount += 1;
        }
      }

      for (const proc of selectedProcedures) {
        const day = String((dossierCount % 28) + 1).padStart(2, '0');
        const month = String((dossierCount % 12) + 1).padStart(2, '0');
        procedureDetails[proc] = {
          referenceClient: refClient,
          audience: `2026-${month}-${day}`,
          juge: juges[dossierCount % juges.length],
          tribunal: tribunals[dossierCount % tribunals.length],
          sort: sorts[dossierCount % sorts.length],
          attOrdOrOrdOk: ordonnances[dossierCount % ordonnances.length],
          attDelegationOuDelegat: dossierCount % 3 === 0 ? 'att' : 'delegat',
          executionNo: dossierCount % 5 === 0 ? `EX-${dossierCount}` : '',
          notificationNo: dossierCount % 4 === 0 ? `N-${dossierCount}` : '',
          notificationSort: notifSorts[dossierCount % notifSorts.length],
          ville,
          huissier: dossierCount % 6 === 0 ? `Huissier ${dossierCount % 20}` : '',
          certificatNonAppelStatus: dossierCount % 3 === 0 ? 'att certificat non appel' : '',
          pvPlice: dossierCount % 7 === 0 ? 'att' : '',
          lettreRec: proc.includes('NB') ? `Lettre ${dossierCount}` : '',
          curateurNo: proc.includes('NB') ? `CUR-${dossierCount}` : '',
          notifCurateur: proc.includes('NB') ? 'en cours' : '',
          sortNotif: proc.includes('NB') ? 'att' : '',
          avisCurateur: proc.includes('NB') ? 'att' : '',
          depotLe: `2025-${month}-${day}`
        };
        montantByProcedure[proc] = String(1_000 + ((dossierCount * 137) % 500_000));
      }

      dossiers.push({
        referenceClient: refClient,
        debiteur,
        procedure: selectedProcedures.join(', '),
        ville,
        montant: String(10_000 + ((dossierCount * 277) % 900_000)),
        procedureDetails,
        montantByProcedure,
        archive: false,
        history: []
      });
    }

    clients.push({
      id: clientId,
      name: benchClientNames[clientIndex] || `Client Bench ${String(clientId).padStart(2, '0')}`,
      dossiers
    });
  }

  let fillIndex = 0;
  while (audienceCount < TARGET_AUDIENCE) {
    const client = clients[fillIndex % Math.max(1, clients.length)];
    const dossier = client?.dossiers?.[fillIndex % Math.max(1, client?.dossiers?.length || 1)];
    if (!dossier) break;
    const extraProc = `ASS NB ${fillIndex + 1}`;
    if (!dossier.procedureDetails[extraProc]) {
      dossier.procedureDetails[extraProc] = {
        referenceClient: String(dossier.referenceClient || `EXTRA-${fillIndex + 1}`),
        audience: '2026-06-15',
        juge: juges[fillIndex % juges.length],
        tribunal: tribunals[fillIndex % tribunals.length],
        sort: 'En cours',
        depotLe: '2025-06-15'
      };
      dossier.procedure = dossier.procedure ? `${dossier.procedure}, ${extraProc}` : extraProc;
      dossier.montantByProcedure[extraProc] = dossier.montant || '0';
      audienceCount += 1;
    }
    fillIndex += 1;
    if (fillIndex > TARGET_AUDIENCE * 2) break;
  }

  const users = buildUsers(clients.map((client) => client.id));
  return {
    clients,
    users,
    salleAssignments: [],
    audienceDraft: {},
    recycleBin: [],
    recycleArchive: [],
    importHistory: [],
    version: 1,
    updatedAt: new Date().toISOString()
  };
}

async function main() {
  const started = Date.now();
  const fixture = generateFixture();
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(fixture), 'utf8');

  let dossiers = 0;
  let audience = 0;
  let diligence = 0;
  for (const client of fixture.clients) {
    dossiers += Array.isArray(client.dossiers) ? client.dossiers.length : 0;
    for (const dossier of client.dossiers || []) {
      const procKeys = Object.keys(dossier.procedureDetails || {});
      for (const procKey of procKeys) {
        if (isAudienceProcedure(procKey)) {
          audience += 1;
        }
        if (isDiligenceProcedure(procKey)) {
          diligence += 1;
        }
      }
    }
  }

  log(`Fixture written to ${OUTPUT_FILE}`);
  log(`Users: ${fixture.users.length} (${TOTAL_MANAGERS} managers, ${TOTAL_ADMINS} admins, ${TOTAL_CLIENT_USERS} clients)`);
  log(`Data: ${fixture.clients.length} clients, ${dossiers} dossiers, ${audience} audience, ${diligence} diligence`);
  log(`Done in ${Date.now() - started}ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
