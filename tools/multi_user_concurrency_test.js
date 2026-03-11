const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { buildPayload } = require('./benchmark_large_state');

const dossierArg = process.argv.find((arg) => arg.startsWith('--dossiers='));
const audienceArg = process.argv.find((arg) => arg.startsWith('--audiences='));
const clientArg = process.argv.find((arg) => arg.startsWith('--clients='));
const DOSSIER_COUNT = Math.max(1, Number(process.env.BENCH_DOSSIERS || (dossierArg ? dossierArg.slice('--dossiers='.length) : 90000)) || 90000);
const AUDIENCE_COUNT = Math.max(0, Number(process.env.BENCH_AUDIENCES || (audienceArg ? audienceArg.slice('--audiences='.length) : 13000)) || 13000);
const CLIENT_COUNT = Math.max(1, Number(process.env.BENCH_CLIENTS || (clientArg ? clientArg.slice('--clients='.length) : 300)) || 300);
const USER_COUNT = 10;
const SESSION_TIMEOUT_MS = 90000;

const SOURCE_ROOT = path.join(__dirname, '..');
const TEMP_ROOT = path.join(os.tmpdir(), `cabinet-avocat-multiuser-${Date.now()}`);
const PORT = 3400;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;
const PAGE_ROUTE_SEQUENCE = ['dashboard', 'clients', 'creation', 'suivi', 'audience', 'diligence', 'salle', 'equipe', 'clients', 'suivi'];

function buildUsers() {
  const users = [{ id: 1, username: 'manager', password: '1234', role: 'manager', clientIds: [] }];
  for (let i = 0; i < USER_COUNT - 1; i += 1) {
    users.push({
      id: i + 2,
      username: `admin${i + 1}`,
      password: '1234',
      role: 'admin',
      clientIds: []
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
    clients: CLIENT_COUNT
  });
  payload.users = buildUsers();
  const statePath = path.join(TEMP_ROOT, 'server', 'data', 'state.json');
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(
    statePath,
    JSON.stringify({
      ...payload,
      updatedAt: new Date().toISOString()
    }),
    'utf8'
  );
  return statePath;
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {}
    if (Date.now() - start > timeoutMs) throw new Error('Server did not become ready in time');
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function routeToSelector(route) {
  return {
    dashboard: '#dashboardSection',
    clients: '#clientSection',
    creation: '#creationSection',
    suivi: '#suiviSection',
    audience: '#audienceSection',
    diligence: '#diligenceSection',
    salle: '#salleSection',
    equipe: '#equipeSection'
  }[route] || '#dashboardSection';
}

async function runUserSession(browser, user, index) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const route = PAGE_ROUTE_SEQUENCE[index] || 'dashboard';
  const marker = `multi-user-marker-${user.username}`;
  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.fill('#username', user.username);
    await page.fill('#password', user.password);
    await page.evaluate(() => login());
    await page.waitForSelector('#appContent', { state: 'visible' });
    await page.waitForFunction((expected) => document.querySelector('#totalClients')?.textContent?.trim() === String(expected), CLIENT_COUNT);

    if (route !== 'dashboard') {
      await page.click(`#${route}Link`);
      await page.waitForSelector(routeToSelector(route), { state: 'visible' });
    }

    await page.evaluate(async ({ sessionIndex, note }) => {
      const clientIndex = sessionIndex;
      const dossierIndex = 0;
      const client = AppState.clients[clientIndex];
      if (!client || !Array.isArray(client.dossiers) || !client.dossiers[dossierIndex]) {
        throw new Error(`Missing target dossier for session ${sessionIndex}`);
      }
      client.dossiers[dossierIndex].note = note;
      await persistAppStateNow();
    }, { sessionIndex: index, note: marker });

    const syncText = await page.locator('#syncStatusText').textContent().catch(() => '');
    await context.close();
    return {
      user: user.username,
      route,
      marker,
      ok: true,
      syncText: String(syncText || '').trim(),
      consoleErrors
    };
  } catch (err) {
    await context.close().catch(() => {});
    return {
      user: user.username,
      route,
      marker,
      ok: false,
      error: String(err?.message || err),
      consoleErrors
    };
  }
}

async function runUserSessionWithTimeout(browser, user, index) {
  return await Promise.race([
    runUserSession(browser, user, index),
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          user: user.username,
          route: PAGE_ROUTE_SEQUENCE[index] || 'dashboard',
          marker: `multi-user-marker-${user.username}`,
          ok: false,
          error: `Session timeout after ${SESSION_TIMEOUT_MS}ms`,
          consoleErrors: []
        });
      }, SESSION_TIMEOUT_MS);
    })
  ]);
}

async function main() {
  await copyProjectSubset();
  const statePath = await writeFixtureState();

  const server = spawn('node', ['server/index.js'], {
    cwd: TEMP_ROOT,
    env: { ...process.env, HOST, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverStderr = '';
  server.stderr.on('data', (chunk) => {
    serverStderr += String(chunk);
  });

  try {
    await waitForServer();
    const browser = await chromium.launch({ headless: true });
    const users = buildUsers();
    const sessionResults = await Promise.all(users.map((user, index) => runUserSessionWithTimeout(browser, user, index)));
    await browser.close();

    const raw = await fs.readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    const notes = [];
    (parsed.clients || []).forEach((client) => {
      (client.dossiers || []).forEach((dossier) => {
        const note = String(dossier?.note || '');
        if (note.startsWith('multi-user-marker-')) notes.push(note);
      });
    });

    const expectedMarkers = sessionResults.map((result) => result.marker);
    const preservedMarkers = expectedMarkers.filter((marker) => notes.includes(marker));

    console.log(JSON.stringify({
      baseUrl: BASE_URL,
      tempRoot: TEMP_ROOT,
      dossiers: DOSSIER_COUNT,
      audiences: AUDIENCE_COUNT,
      users: users.map((u) => ({ username: u.username, role: u.role })),
      sessionResults,
      finalState: {
        expectedMarkerCount: expectedMarkers.length,
        preservedMarkerCount: preservedMarkers.length,
        preservedMarkers
      }
    }, null, 2));
  } finally {
    server.kill('SIGINT');
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (server.exitCode === null) server.kill('SIGKILL');
    if (serverStderr.trim()) console.error(serverStderr.trim());
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
