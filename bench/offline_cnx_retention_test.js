#!/usr/bin/env node

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const http = require('http');
const { execFileSync, spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const REPORT_DIR = path.join(ROOT_DIR, 'bench-runs', `offline-cnx-${Date.now()}`);
const REPORT_FILE = path.join(REPORT_DIR, 'report.json');
const BASE_URL = process.env.UI_TEST_BASE_URL || 'http://127.0.0.1:3000';
const USERNAME = process.env.UI_TEST_USERNAME || 'manager';
const PASSWORD = process.env.UI_TEST_PASSWORD || '1234';
const OFFLINE_MS = Number(process.env.OFFLINE_TEST_MS || 120000);
const CHROME_PATH = process.env.BENCH_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function requirePlaywright() {
  const candidates = [
    path.join(ROOT_DIR, 'node_modules', 'playwright'),
    'playwright'
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {}
  }
  throw new Error(`Playwright introuvable. Candidates: ${candidates.join(', ')}`);
}

const { chromium } = requirePlaywright();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = options.payload === undefined ? '' : JSON.stringify(options.payload);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      timeout: options.timeout || 3000,
      headers: body
        ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        : {}
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: raw ? JSON.parse(raw) : null });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('HTTP timeout')));
    if (body) req.write(body);
    req.end();
  });
}

async function postJson(url, payload, timeout = 5000) {
  const response = await requestJson(url, { method: 'POST', payload, timeout });
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`POST ${url} failed with ${response.statusCode}: ${JSON.stringify(response.body)}`);
  }
  return response.body || {};
}

async function getJson(url, timeout = 5000) {
  const response = await requestJson(url, { timeout });
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`GET ${url} failed with ${response.statusCode}: ${JSON.stringify(response.body)}`);
  }
  return response.body || {};
}

async function waitForHealth(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await requestJson(`${BASE_URL}/api/health`, { timeout: 3000 });
      if (response.statusCode >= 200 && response.statusCode < 300 && response.body?.ok) {
        return response.body;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(1000);
  }
  throw lastError || new Error('Health check timeout');
}

async function loginApi() {
  const response = await postJson(`${BASE_URL}/api/auth/login`, {
    username: USERNAME,
    password: PASSWORD
  });
  if (!response?.token) throw new Error('Login API returned no token.');
  return response.token;
}

async function createFixture(token) {
  const stamp = Date.now();
  const fixture = {
    clientName: `OFFLINE CNX TEST ${stamp}`,
    referenceClient: `OFFLINE-CNX-${stamp}`
  };

  await postJson(`${BASE_URL}/api/state/clients?token=${token}`, {
    action: 'create',
    client: {
      name: fixture.clientName,
      dossiers: []
    }
  });

  const stateAfterClient = await getJson(`${BASE_URL}/api/state?token=${token}`);
  const client = (stateAfterClient.clients || []).find((entry) => entry?.name === fixture.clientName);
  if (!client) throw new Error('Fixture client not found after creation.');

  await postJson(`${BASE_URL}/api/state/dossiers?token=${token}`, {
    action: 'create',
    clientId: client.id,
    dossier: {
      referenceClient: fixture.referenceClient,
      debiteur: `Debiteur ${stamp}`,
      procedure: 'ASS',
      ville: 'Casablanca',
      montant: '1000',
      procedureDetails: {
        ASS: {
          audience: '2026-06-01',
          tribunal: 'Casablanca',
          statut: 'En cours',
          juge: 'Offline CNX Judge',
          sort: ''
        }
      },
      history: []
    }
  });

  return {
    ...fixture,
    clientId: client.id
  };
}

async function cleanupFixture(token, fixture) {
  if (!token || !fixture?.clientId) return;
  await postJson(`${BASE_URL}/api/state/clients?token=${token}`, {
    action: 'delete',
    clientId: fixture.clientId
  }).catch(() => {});
}

function getListeningPid(port = 3000) {
  const output = execFileSync('netstat.exe', ['-ano'], { encoding: 'utf8' });
  const line = output
    .split(/\r?\n/)
    .find((entry) => entry.includes(`:${port}`) && /\bLISTENING\b/i.test(entry));
  if (!line) return null;
  const match = line.trim().match(/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

function stopServerProcess(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  execFileSync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    `Stop-Process -Id ${pid} -Force`
  ], { stdio: 'ignore' });
  return true;
}

function startServerBackground() {
  return spawn('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    path.join(SERVER_DIR, 'start-server-background.ps1')
  ], {
    cwd: SERVER_DIR,
    windowsHide: true,
    stdio: 'ignore'
  });
}

async function launchBrowser() {
  const options = {
    headless: true,
    args: [
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-sync'
    ]
  };
  if (fs.existsSync(CHROME_PATH)) {
    options.executablePath = CHROME_PATH;
  }
  return chromium.launch(options);
}

async function loginPage(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => typeof hasLoadedState !== 'undefined' && hasLoadedState === true, { timeout: 120000 });
  await page.fill('#username', USERNAME);
  await page.fill('#password', PASSWORD);
  await page.click('#loginBtn');
  await page.waitForFunction((username) => {
    try {
      return !!currentUser && String(currentUser?.username || '').trim().toLowerCase() === String(username || '').toLowerCase();
    } catch {
      return false;
    }
  }, USERNAME, { timeout: 120000 });
  await page.waitForTimeout(1500);
}

async function readAppSnapshot(page) {
  return page.evaluate(async () => {
    const state = typeof AppState !== 'undefined' ? AppState : window.AppState;
    const clients = Array.isArray(state?.clients) ? state.clients : [];
    const dossierCount = clients.reduce((total, client) => (
      total + (Array.isArray(client?.dossiers) ? client.dossiers.length : 0)
    ), 0);
    let indexedDbStateOk = false;
    try {
      const db = await new Promise((resolve) => {
        const req = indexedDB.open('cabinet-avocat-db-v1');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (db) {
        indexedDbStateOk = await new Promise((resolve) => {
          const tx = db.transaction('state_store', 'readonly');
          const store = tx.objectStore('state_store');
          const req = store.get('app_state');
          req.onsuccess = () => resolve(!!req.result);
          req.onerror = () => resolve(false);
        });
        db.close();
      }
    } catch {}
    return {
      clients: clients.length,
      dossiers: dossierCount,
      loaded: typeof hasLoadedState !== 'undefined' ? !!hasLoadedState : !!window.hasLoadedState,
      syncText: String(document.querySelector('#syncStatusText')?.innerText || '').trim(),
      indexedDbStateOk
    };
  });
}

async function main() {
  await fsp.mkdir(REPORT_DIR, { recursive: true });
  const report = {
    startedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    offlineMs: OFFLINE_MS
  };

  let browser = null;
  let context = null;
  let page = null;
  let originalPid = null;
  let restartProcess = null;
  let token = '';
  let fixture = null;

  try {
    report.healthBefore = await waitForHealth();
    token = await loginApi();
    fixture = await createFixture(token);
    report.fixture = {
      clientId: fixture.clientId,
      clientName: fixture.clientName,
      referenceClient: fixture.referenceClient
    };
    originalPid = getListeningPid(3000);
    report.originalPid = originalPid;

    browser = await launchBrowser();
    context = await browser.newContext();
    page = await context.newPage();
    await loginPage(page);

    report.beforeCut = await readAppSnapshot(page);

    stopServerProcess(originalPid);
    await sleep(2500);
    report.healthWhileCut = await requestJson(`${BASE_URL}/api/health`, { timeout: 1500 })
      .then(() => ({ reachable: true }))
      .catch((error) => ({ reachable: false, error: error.message }));

    await sleep(OFFLINE_MS);
    report.afterTwoMinutesOffline = await readAppSnapshot(page);

    restartProcess = startServerBackground();
    await waitForHealth(60000);
    await page.waitForTimeout(3500);
    report.afterReconnect = await readAppSnapshot(page);
    report.restartedPid = getListeningPid(3000);

    report.summary = {
      retainedWhileOffline: report.beforeCut.loaded === true
        && report.afterTwoMinutesOffline.loaded === true
        && report.beforeCut.clients === report.afterTwoMinutesOffline.clients
        && report.beforeCut.dossiers === report.afterTwoMinutesOffline.dossiers,
      serverWasCut: report.healthWhileCut?.reachable === false,
      serverRestored: Number.isFinite(report.restartedPid),
      hadLocalIndexedDbSnapshot: report.afterTwoMinutesOffline.indexedDbStateOk === true
    };

    report.finishedAt = new Date().toISOString();
    await fsp.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
    process.stdout.write(`${JSON.stringify({
      ok: true,
      reportFile: REPORT_FILE,
      summary: report.summary,
      beforeCut: report.beforeCut,
      afterTwoMinutesOffline: report.afterTwoMinutesOffline,
      afterReconnect: report.afterReconnect
    }, null, 2)}\n`);
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.error = { message: error.message, stack: error.stack };
    await fsp.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8').catch(() => {});
    process.stderr.write(`Offline CNX retention test failed: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  } finally {
    if (restartProcess && restartProcess.exitCode === null) {
      restartProcess.kill();
    }
    if (token && fixture) {
      await cleanupFixture(token, fixture);
    }
    await page?.close().catch(() => {});
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }
}

if (require.main === module) {
  main();
}
