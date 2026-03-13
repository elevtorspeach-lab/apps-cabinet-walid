const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { buildPayload } = require('./benchmark_large_state');

const SOURCE_ROOT = path.join(__dirname, '..');
const TEMP_ROOT = path.join(os.tmpdir(), `applicationversion1-realtime-${Date.now()}`);
const PORT = 3500;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

function readCountArg(flag, fallback, options = {}) {
  const arg = process.argv.find((value) => value.startsWith(`${flag}=`));
  const rawValue = arg ? arg.slice(flag.length + 1) : process.env[flag.replace(/^--/, '').toUpperCase()];
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  if (options.allowZero === true && parsed === 0) return 0;
  return parsed > 0 ? Math.floor(parsed) : fallback;
}

const ADMIN_COUNT = readCountArg('--admins', 10);
const GESTIONNAIRE_COUNT = readCountArg('--gestionnaires', 10);
const CLIENT_COUNT = readCountArg('--clients', 10, { allowZero: true });
const DOSSIER_COUNT = readCountArg('--dossiers', 12);
const AUDIENCE_COUNT = readCountArg('--audiences', 6);
const FIXTURE_CLIENT_COUNT = readCountArg('--fixture-clients', 3);
const SYNC_TARGET_MS = 1000;
const ACTION_TIMEOUT_MS = 10000;
const SESSION_BOOT_TIMEOUT_MS = 30000;
const SESSION_OPEN_BATCH_SIZE = 5;
const SESSION_OPEN_BATCH_PAUSE_MS = 250;
const TARGET_CLIENT_ID = 1;

function buildUsers() {
  const users = [
    { id: 1, username: 'manager', password: '1234', role: 'manager', clientIds: [] }
  ];

  for (let i = 1; i <= ADMIN_COUNT; i += 1) {
    users.push({
      id: 100 + i,
      username: `admin${String(i).padStart(2, '0')}`,
      password: '1234',
      role: 'admin',
      clientIds: []
    });
  }

  for (let i = 1; i <= GESTIONNAIRE_COUNT; i += 1) {
    users.push({
      id: 200 + i,
      username: `gestionnaire${String(i).padStart(2, '0')}`,
      password: '1234',
      role: 'manager',
      clientIds: []
    });
  }

  for (let i = 1; i <= CLIENT_COUNT; i += 1) {
    users.push({
      id: 300 + i,
      username: `client${String(i).padStart(2, '0')}`,
      password: '1234',
      role: 'client',
      clientIds: [TARGET_CLIENT_ID]
    });
  }

  return users;
}

async function copyProjectSubset() {
  await fs.mkdir(TEMP_ROOT, { recursive: true });
  for (const entry of ['app.js', 'index.html', 'style.css', 'state-persistence.js', 'render-dashboard.js', 'render-audience-suivi.js', 'render-diligence.js', 'vendor', 'workers', 'server']) {
    await fs.cp(path.join(SOURCE_ROOT, entry), path.join(TEMP_ROOT, entry), { recursive: true });
  }
}

async function writeFixtureState() {
  const payload = buildPayload({
    dossiers: DOSSIER_COUNT,
    audiences: AUDIENCE_COUNT,
    clients: FIXTURE_CLIENT_COUNT
  });
  payload.users = buildUsers();
  payload.updatedAt = new Date().toISOString();
  const statePath = path.join(TEMP_ROOT, 'server', 'data', 'state.json');
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(payload), 'utf8');
  return statePath;
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {}
    if (Date.now() - start > timeoutMs) {
      throw new Error('Server did not become ready in time');
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function openSession(browser, user) {
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(SESSION_BOOT_TIMEOUT_MS);
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: SESSION_BOOT_TIMEOUT_MS });
      await page.fill('#username', user.username);
      await page.fill('#password', user.password);
      await page.evaluate(() => login());
      await page.waitForSelector('#appContent', { state: 'visible', timeout: SESSION_BOOT_TIMEOUT_MS });
      await page.waitForFunction(() => {
        try {
          return typeof getVisibleClients === 'function' && getVisibleClients().length > 0;
        } catch {
          return false;
        }
      }, { timeout: SESSION_BOOT_TIMEOUT_MS });

      return {
        user: user.username,
        role: user.role === 'manager' && user.username.startsWith('gestionnaire') ? 'gestionnaire' : user.role,
        context,
        page,
        consoleErrors
      };
    } catch (error) {
      lastError = error;
      await context.close().catch(() => {});
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
  throw lastError;
}

async function waitForLiveSync(session) {
  await session.page.waitForFunction(() => {
    try {
      const text = String(document.querySelector('#syncStatusText')?.textContent || '').toLowerCase();
      return text.includes('actif') || text.includes('connecte');
    } catch {
      return false;
    }
  }, { timeout: SESSION_BOOT_TIMEOUT_MS });
  session.page.setDefaultTimeout(ACTION_TIMEOUT_MS);
}

async function createDossier(session, reference) {
  return await session.page.evaluate(async ({ targetClientId, referenceClient }) => {
    const client = AppState.clients.find((item) => Number(item?.id) === Number(targetClientId));
    if (!client) throw new Error('Target client not found.');
    if (!Array.isArray(client.dossiers)) client.dossiers = [];
    const dossier = {
      debiteur: 'Debiteur Sync Test',
      boiteNo: 'SYNC-BOX-01',
      referenceClient,
      dateAffectation: '10/03/2026',
      procedure: 'SFDC',
      procedureList: ['SFDC'],
      procedureDetails: {
        SFDC: {
          referenceClient: `${referenceClient}-PROC`
        }
      },
      ville: 'Casablanca',
      adresse: 'Adresse Sync',
      montant: '10000',
      montantByProcedure: [],
      ww: 'WW-SYNC',
      marque: 'Dacia',
      type: 'Auto',
      caution: '',
      cautionAdresse: '',
      cautionVille: '',
      cautionCin: '',
      cautionRc: '',
      note: 'created-by-admin',
      avancement: 'Nouveau',
      statut: 'En cours',
      files: [],
      history: []
    };
    client.dossiers.push(dossier);
    await persistDossierPatchNow({
      action: 'create',
      clientId: Number(targetClientId),
      dossier
    }, { source: 'multi-role-realtime-test-create' });
    return {
      dossierCount: client.dossiers.length
    };
  }, { targetClientId: TARGET_CLIENT_ID, referenceClient: reference });
}

async function updateDossier(session, reference, noteValue) {
  return await session.page.evaluate(async ({ targetClientId, referenceClient, note }) => {
    const client = AppState.clients.find((item) => Number(item?.id) === Number(targetClientId));
    if (!client || !Array.isArray(client.dossiers)) throw new Error('Target client not found.');
    const dossierIndex = client.dossiers.findIndex((item) => String(item?.referenceClient || '').trim() === referenceClient);
    if (dossierIndex === -1) throw new Error('Target dossier not found.');
    const dossier = {
      ...client.dossiers[dossierIndex],
      note,
      avancement: 'Synchronise'
    };
    client.dossiers[dossierIndex] = dossier;
    await persistDossierPatchNow({
      action: 'update',
      clientId: Number(targetClientId),
      dossierIndex,
      targetClientId: Number(targetClientId),
      dossier
    }, { source: 'multi-role-realtime-test-update' });
    return {
      dossierIndex
    };
  }, { targetClientId: TARGET_CLIENT_ID, referenceClient: reference, note: noteValue });
}

async function waitForReference(session, reference, startedAt) {
  await session.page.waitForFunction((targetReference) => {
    try {
      return getVisibleClients().some((client) =>
        (Array.isArray(client?.dossiers) ? client.dossiers : []).some(
          (dossier) => String(dossier?.referenceClient || '').trim() === targetReference
        )
      );
    } catch {
      return false;
    }
  }, reference, { timeout: ACTION_TIMEOUT_MS });

  return {
    user: session.user,
    role: session.role,
    delayMs: Date.now() - startedAt
  };
}

async function waitForNote(session, reference, note, startedAt) {
  await session.page.waitForFunction(({ targetReference, targetNote }) => {
    try {
      return getVisibleClients().some((client) =>
        (Array.isArray(client?.dossiers) ? client.dossiers : []).some((dossier) =>
          String(dossier?.referenceClient || '').trim() === targetReference
          && String(dossier?.note || '').trim() === targetNote
        )
      );
    } catch {
      return false;
    }
  }, { targetReference: reference, targetNote: note }, { timeout: ACTION_TIMEOUT_MS });

  return {
    user: session.user,
    role: session.role,
    delayMs: Date.now() - startedAt
  };
}

function summarizeStep(stepName, results) {
  const success = results.filter((item) => !item.error);
  const failures = results.filter((item) => item.error);
  const maxDelayMs = success.length ? Math.max(...success.map((item) => item.delayMs)) : null;
  const overTarget = success.filter((item) => item.delayMs > SYNC_TARGET_MS);
  return {
    step: stepName,
    sessionCount: results.length,
    successCount: success.length,
    failureCount: failures.length,
    maxDelayMs,
    within1s: failures.length === 0 && overTarget.length === 0,
    overTarget,
    failures
  };
}

async function measurePropagation(sessions, waiter, args) {
  const startedAt = Date.now();
  const results = await Promise.all(sessions.map(async (session) => {
    try {
      return await waiter(session, ...args, startedAt);
    } catch (error) {
      return {
        user: session.user,
        role: session.role,
        error: String(error?.message || error)
      };
    }
  }));
  return results;
}

async function closeSessions(sessions) {
  await Promise.all(sessions.map(async (session) => {
    await session.context.close().catch(() => {});
  }));
}

async function openSessionsInBatches(browser, users) {
  const sessions = [];
  for (let index = 0; index < users.length; index += SESSION_OPEN_BATCH_SIZE) {
    const chunk = users.slice(index, index + SESSION_OPEN_BATCH_SIZE);
    const openedChunk = await Promise.all(chunk.map((user) => openSession(browser, user)));
    sessions.push(...openedChunk);
    if ((index + SESSION_OPEN_BATCH_SIZE) < users.length) {
      await new Promise((resolve) => setTimeout(resolve, SESSION_OPEN_BATCH_PAUSE_MS));
    }
  }
  return sessions;
}

async function main() {
  await copyProjectSubset();
  await writeFixtureState();

  const server = spawn('node', ['server/index.js'], {
    cwd: TEMP_ROOT,
    env: { ...process.env, HOST, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverStdout = '';
  let serverStderr = '';
  server.stdout.on('data', (chunk) => {
    serverStdout += String(chunk);
  });
  server.stderr.on('data', (chunk) => {
    serverStderr += String(chunk);
  });

  const browser = await chromium.launch({ headless: true });
  let sessions = [];

  try {
    await waitForServer();
    const users = buildUsers().filter((user) => user.username !== 'manager');
    sessions = await openSessionsInBatches(browser, users);
    await Promise.all(sessions.map((session) => waitForLiveSync(session)));

    const createReference = `SYNC-CREATE-${Date.now()}`;
    const updateNote = `sync-note-${Date.now()}`;
    const adminActor = sessions.find((session) => session.user === 'admin01');
    const gestionnaireActor = sessions.find((session) => session.user === 'gestionnaire01');

    if (!adminActor) throw new Error('admin01 session not available.');
    if (!gestionnaireActor) throw new Error('gestionnaire01 session not available.');

    await createDossier(adminActor, createReference);
    const createResults = await measurePropagation(sessions, waitForReference, [createReference]);
    await waitForReference(gestionnaireActor, createReference, Date.now());

    await updateDossier(gestionnaireActor, createReference, updateNote);
    const updateResults = await measurePropagation(sessions, waitForNote, [createReference, updateNote]);

    const createSummary = summarizeStep('create_dossier', createResults);
    const updateSummary = summarizeStep('update_dossier', updateResults);

    console.log(JSON.stringify({
      baseUrl: BASE_URL,
      tempRoot: TEMP_ROOT,
      syncTargetMs: SYNC_TARGET_MS,
      users: {
        admin: ADMIN_COUNT,
        gestionnaire: GESTIONNAIRE_COUNT,
        client: CLIENT_COUNT,
        totalSessions: sessions.length
      },
      createSummary,
      updateSummary,
      serverStdout: serverStdout.trim(),
      serverStderr: serverStderr.trim(),
      consoleErrors: sessions
        .filter((session) => session.consoleErrors.length)
        .map((session) => ({
          user: session.user,
          errors: session.consoleErrors
        }))
    }, null, 2));
  } finally {
    await closeSessions(sessions);
    await browser.close().catch(() => {});
    server.kill('SIGINT');
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
