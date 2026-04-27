const http = require('http');

const SERVER_PORT = Number(process.env.PORT || 3000);
const BASE_URL = `http://127.0.0.1:${SERVER_PORT}`;
const DURATION_MINUTES = Number(process.env.SOAK_MINUTES || 15);
const RUN_UNTIL = Date.now() + Math.max(1, DURATION_MINUTES) * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(method, url, payload = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = payload === null ? '' : JSON.stringify(payload);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers: payload === null
          ? {}
          : {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body)
            }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: raw
          });
        });
      }
    );
    req.on('error', reject);
    if (payload !== null) {
      req.write(body);
    }
    req.end();
  });
}

async function getJson(url) {
  const response = await request('GET', url);
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`GET ${url} failed with ${response.statusCode}: ${response.body}`);
  }
  return response.body ? JSON.parse(response.body) : {};
}

async function postJson(url, payload) {
  const response = await request('POST', url, payload);
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`POST ${url} failed with ${response.statusCode}: ${response.body}`);
  }
  return response.body ? JSON.parse(response.body) : {};
}

function buildTestNames(cycle) {
  const stamp = `${Date.now()}-${cycle}`;
  return {
    clientName: `SOAK CLIENT ${stamp}`,
    referenceClient: `SOAK-REF-${stamp}`,
    debiteur: `Debiteur ${stamp}`
  };
}

function findClientByName(state, clientName) {
  return (Array.isArray(state?.clients) ? state.clients : []).find((client) => client?.name === clientName) || null;
}

function findDossierByReference(client, referenceClient) {
  return (Array.isArray(client?.dossiers) ? client.dossiers : []).find(
    (dossier) => String(dossier?.referenceClient || '').trim() === referenceClient
  ) || null;
}

async function login() {
  const response = await postJson(`${BASE_URL}/api/auth/login`, {
    username: 'manager',
    password: '1234'
  });
  if (!response?.token) {
    throw new Error('Auth succeeded without token.');
  }
  return response.token;
}

async function verifyHealth() {
  const health = await getJson(`${BASE_URL}/api/health`);
  if (!health?.ok) {
    throw new Error(`Health check returned unexpected payload: ${JSON.stringify(health)}`);
  }
}

async function runCycle(token, cycle) {
  const names = buildTestNames(cycle);

  await postJson(`${BASE_URL}/api/state/clients?token=${token}`, {
    action: 'create',
    client: {
      name: names.clientName,
      dossiers: []
    }
  });

  const stateAfterClientCreate = await getJson(`${BASE_URL}/api/state?token=${token}`);
  const createdClient = findClientByName(stateAfterClientCreate, names.clientName);
  if (!createdClient) {
    throw new Error(`Created client not found for cycle ${cycle}.`);
  }

  await postJson(`${BASE_URL}/api/state/dossiers?token=${token}`, {
    action: 'create',
    clientId: createdClient.id,
    dossier: {
      referenceClient: names.referenceClient,
      debiteur: names.debiteur,
      procedure: 'Commandement, ASS',
      ville: 'Casablanca',
      montant: String(10000 + cycle),
      procedureDetails: {
        Commandement: {
          notifDebiteur: 'notifier',
          ordonnance: 'oui',
          date: '2026-05-01'
        },
        ASS: {
          audience: '2026-05-15',
          tribunal: 'Casablanca',
          statut: 'En cours'
        }
      },
      history: [
        {
          date: new Date().toISOString(),
          action: 'create',
          note: `soak-create-${cycle}`
        }
      ]
    }
  });

  const stateAfterCreate = await getJson(`${BASE_URL}/api/state?token=${token}`);
  const hydratedClient = findClientByName(stateAfterCreate, names.clientName);
  if (!hydratedClient) {
    throw new Error(`Hydrated client not found for cycle ${cycle}.`);
  }
  const createdDossier = findDossierByReference(hydratedClient, names.referenceClient);
  if (!createdDossier) {
    throw new Error(`Created dossier not found for cycle ${cycle}.`);
  }

  const updatedDossier = {
    ...createdDossier,
    montant: String(20000 + cycle),
    ville: 'Rabat',
    procedure: 'Commandement, ASS, SFDC',
    procedureDetails: {
      ...(createdDossier.procedureDetails || {}),
      Commandement: {
        ...((createdDossier.procedureDetails || {}).Commandement || {}),
        notifDebiteur: 'fait',
        ordonnance: 'non',
        commentaire: `maj-diligence-${cycle}`
      },
      ASS: {
        ...((createdDossier.procedureDetails || {}).ASS || {}),
        audience: '2026-06-20',
        statut: 'Reporte'
      },
      SFDC: {
        referenceClient: names.referenceClient,
        ville: 'Rabat',
        statut: 'Programme'
      }
    },
    history: [
      ...(Array.isArray(createdDossier.history) ? createdDossier.history : []),
      {
        date: new Date().toISOString(),
        action: 'update',
        note: `soak-update-${cycle}`
      }
    ]
  };

  await postJson(`${BASE_URL}/api/state/dossiers?token=${token}`, {
    action: 'update',
    clientId: createdClient.id,
    dossierIndex: 0,
    previousExternalId: createdDossier.externalId,
    previousReferenceClient: createdDossier.referenceClient,
    dossier: updatedDossier
  });

  const draftPayload = {
    currentClientId: createdClient.id,
    currentReferenceClient: names.referenceClient,
    sessionLabel: `draft-${cycle}`,
    notes: `audience-draft-${Date.now()}`
  };
  await postJson(`${BASE_URL}/api/state/audience-draft?token=${token}`, {
    audienceDraft: draftPayload
  });

  const stateAfterUpdate = await getJson(`${BASE_URL}/api/state?token=${token}`);
  const updatedClient = findClientByName(stateAfterUpdate, names.clientName);
  const persistedDossier = findDossierByReference(updatedClient, names.referenceClient);
  if (!persistedDossier) {
    throw new Error(`Updated dossier missing after save for cycle ${cycle}.`);
  }
  if (String(persistedDossier?.procedureDetails?.ASS?.audience || '') !== '2026-06-20') {
    throw new Error(`Audience update did not persist for cycle ${cycle}.`);
  }
  if (String(persistedDossier?.procedureDetails?.Commandement?.notifDebiteur || '') !== 'fait') {
    throw new Error(`Diligence update did not persist for cycle ${cycle}.`);
  }
  if (String(stateAfterUpdate?.audienceDraft?.sessionLabel || '') !== `draft-${cycle}`) {
    throw new Error(`Audience draft did not persist for cycle ${cycle}.`);
  }

  await postJson(`${BASE_URL}/api/state/clients?token=${token}`, {
    action: 'delete',
    clientId: createdClient.id
  });

  const stateAfterCleanup = await getJson(`${BASE_URL}/api/state?token=${token}`);
  if (findClientByName(stateAfterCleanup, names.clientName)) {
    throw new Error(`Cleanup failed for cycle ${cycle}.`);
  }

  return {
    clientId: createdClient.id,
    externalId: createdDossier.externalId
  };
}

async function main() {
  console.log(`Starting desktop online soak test for ${DURATION_MINUTES} minute(s).`);
  await verifyHealth();
  const token = await login();
  let cycle = 0;
  while (Date.now() < RUN_UNTIL) {
    cycle += 1;
    const startedAt = Date.now();
    const result = await runCycle(token, cycle);
    await verifyHealth();
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(
      `[cycle ${cycle}] ok in ${elapsed}s clientId=${result.clientId} externalId=${result.externalId}`
    );
    await sleep(1500);
  }
  console.log(`Soak test completed successfully after ${cycle} cycle(s).`);
}

main().catch((error) => {
  console.error('Desktop online soak test failed:', error);
  process.exit(1);
});
