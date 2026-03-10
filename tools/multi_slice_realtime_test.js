const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { buildPayload } = require('./benchmark_large_state');

function readCountArg(flag, fallback) {
  const arg = process.argv.find((value) => value.startsWith(`${flag}=`));
  const rawValue = arg ? arg.slice(flag.length + 1) : process.env[flag.replace(/^--/, '').toUpperCase()];
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const SOURCE_ROOT = path.join(__dirname, '..');
const TEMP_ROOT = path.join(os.tmpdir(), `cabinet-avocat-slices-${Date.now()}`);
const PORT = 3600;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

const ADMIN_COUNT = readCountArg('--admins', 20);
const GESTIONNAIRE_COUNT = readCountArg('--gestionnaires', 20);
const CLIENT_COUNT = readCountArg('--clients', 20);
const SESSION_BOOT_TIMEOUT_MS = 30000;
const ACTION_TIMEOUT_MS = 12000;
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
  for (const entry of ['app.js', 'index.html', 'style.css', 'vendor', 'workers', 'server']) {
    await fs.cp(path.join(SOURCE_ROOT, entry), path.join(TEMP_ROOT, entry), { recursive: true });
  }
}

async function writeFixtureState() {
  const payload = buildPayload({ dossiers: 12, audiences: 8, clients: 3 });
  payload.users = buildUsers();
  payload.updatedAt = new Date().toISOString();
  const statePath = path.join(TEMP_ROOT, 'server', 'data', 'state.json');
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(payload), 'utf8');
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
      await page.waitForFunction(() => {
        try {
          const text = String(document.querySelector('#syncStatusText')?.textContent || '').toLowerCase();
          return text.includes('actif') || text.includes('connecte');
        } catch {
          return false;
        }
      }, { timeout: SESSION_BOOT_TIMEOUT_MS });
      page.setDefaultTimeout(ACTION_TIMEOUT_MS);

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

async function persistUsersSlice(session, usernameMarker) {
  return await session.page.evaluate(async ({ marker, targetClientId }) => {
    const nextUsers = Array.isArray(USERS) ? USERS.map((user) => ({ ...user })) : [];
    nextUsers.push({
      id: Date.now(),
      username: marker,
      password: '1234',
      role: 'client',
      clientIds: [targetClientId]
    });
    USERS = nextUsers;
    await persistStateSliceNow('users', USERS, { source: 'slice-users-test' });
  }, { marker: usernameMarker, targetClientId: TARGET_CLIENT_ID });
}

async function persistSalleSlice(session, marker) {
  return await session.page.evaluate(async ({ marker }) => {
    const nextAssignments = Array.isArray(AppState?.salleAssignments)
      ? AppState.salleAssignments.map((row) => ({ ...row }))
      : [];
    nextAssignments.push({
      id: Date.now(),
      salle: `Salle ${marker}`,
      juge: `Juge ${marker}`,
      day: 'lundi'
    });
    AppState.salleAssignments = nextAssignments;
    await persistStateSliceNow('salleAssignments', AppState.salleAssignments, { source: 'slice-salle-test' });
  }, { marker });
}

async function persistAudienceDraftSlice(session, marker) {
  return await session.page.evaluate(async ({ marker, targetClientId }) => {
    const row = getAudienceRows().find((item) => Number(item?.c?.id) === Number(targetClientId));
    if (!row) throw new Error('No audience row found for target client.');
    const key = makeAudienceDraftKey(row.ci, row.di, row.procKey);
    audienceDraft = {
      ...(audienceDraft && typeof audienceDraft === 'object' ? audienceDraft : {}),
      [key]: {
        ...(audienceDraft?.[key] && typeof audienceDraft[key] === 'object' ? audienceDraft[key] : {}),
        juge: marker
      }
    };
    await persistStateSliceNow('audienceDraft', audienceDraft, { source: 'slice-audience-draft-test' });
    return { key };
  }, { marker, targetClientId: TARGET_CLIENT_ID });
}

async function waitForUsersSlice(session, usernameMarker, startedAt) {
  await session.page.waitForFunction((marker) => {
    try {
      return Array.isArray(USERS) && USERS.some((user) => String(user?.username || '').trim() === marker);
    } catch {
      return false;
    }
  }, usernameMarker, { timeout: ACTION_TIMEOUT_MS });
  return { user: session.user, role: session.role, delayMs: Date.now() - startedAt };
}

async function waitForSalleSlice(session, marker, startedAt) {
  await session.page.waitForFunction((value) => {
    try {
      return Array.isArray(AppState?.salleAssignments) && AppState.salleAssignments.some((row) =>
        String(row?.salle || '').trim() === `Salle ${value}` && String(row?.juge || '').trim() === `Juge ${value}`
      );
    } catch {
      return false;
    }
  }, marker, { timeout: ACTION_TIMEOUT_MS });
  return { user: session.user, role: session.role, delayMs: Date.now() - startedAt };
}

async function waitForAudienceDraftSlice(session, key, marker, startedAt) {
  await session.page.waitForFunction(({ draftKey, expectedJuge }) => {
    try {
      return String(audienceDraft?.[draftKey]?.juge || '').trim() === expectedJuge;
    } catch {
      return false;
    }
  }, { draftKey: key, expectedJuge: marker }, { timeout: ACTION_TIMEOUT_MS });
  return { user: session.user, role: session.role, delayMs: Date.now() - startedAt };
}

function summarizeStep(stepName, results) {
  const success = results.filter((item) => !item.error);
  const failures = results.filter((item) => item.error);
  const maxDelayMs = success.length ? Math.max(...success.map((item) => item.delayMs)) : null;
  return {
    step: stepName,
    sessionCount: results.length,
    successCount: success.length,
    failureCount: failures.length,
    maxDelayMs,
    within1s: failures.length === 0 && success.every((item) => item.delayMs <= 1000),
    failures
  };
}

async function measurePropagation(sessions, waiter, args) {
  const startedAt = Date.now();
  return await Promise.all(sessions.map(async (session) => {
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
}

async function closeSessions(sessions) {
  await Promise.all(sessions.map(async (session) => {
    await session.context.close().catch(() => {});
  }));
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
  server.stdout.on('data', (chunk) => { serverStdout += String(chunk); });
  server.stderr.on('data', (chunk) => { serverStderr += String(chunk); });

  const browser = await chromium.launch({ headless: true });
  let sessions = [];

  try {
    await waitForServer();
    const users = buildUsers().filter((user) => user.username !== 'manager');
    sessions = await openSessionsInBatches(browser, users);

    const managerActor = sessions.find((session) => session.user === 'gestionnaire01');
    const adminActor = sessions.find((session) => session.user === 'admin01');
    if (!managerActor || !adminActor) throw new Error('Required actor sessions are missing.');

    const userMarker = `slice-user-${Date.now()}`;
    await persistUsersSlice(managerActor, userMarker);
    const usersResults = await measurePropagation(sessions, waitForUsersSlice, [userMarker]);

    const salleMarker = `slice-salle-${Date.now()}`;
    await persistSalleSlice(adminActor, salleMarker);
    const salleResults = await measurePropagation(sessions, waitForSalleSlice, [salleMarker]);

    const audienceMarker = `slice-juge-${Date.now()}`;
    const audienceInfo = await persistAudienceDraftSlice(adminActor, audienceMarker);
    const audienceResults = await measurePropagation(sessions, waitForAudienceDraftSlice, [audienceInfo.key, audienceMarker]);

    console.log(JSON.stringify({
      baseUrl: BASE_URL,
      tempRoot: TEMP_ROOT,
      users: {
        admin: ADMIN_COUNT,
        gestionnaire: GESTIONNAIRE_COUNT,
        client: CLIENT_COUNT,
        totalSessions: sessions.length
      },
      usersSummary: summarizeStep('users_slice', usersResults),
      salleSummary: summarizeStep('salle_slice', salleResults),
      audienceDraftSummary: summarizeStep('audience_draft_slice', audienceResults),
      serverStdout: serverStdout.trim(),
      serverStderr: serverStderr.trim(),
      consoleErrors: sessions
        .filter((session) => session.consoleErrors.length)
        .map((session) => ({ user: session.user, errors: session.consoleErrors }))
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
