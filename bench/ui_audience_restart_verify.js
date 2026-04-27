#!/usr/bin/env node

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DESKTOP_DIR = path.join(ROOT_DIR, 'desktop-app');
const REPORT_DIR = path.join(ROOT_DIR, 'bench-runs', `ui-restart-${Date.now()}`);
const REPORT_FILE = path.join(REPORT_DIR, 'report.json');
const BASE_URL = process.env.UI_TEST_BASE_URL || 'http://127.0.0.1:3000';
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
        res.on('end', () => resolve({ statusCode: res.statusCode, body: raw }));
      }
    );
    req.on('error', reject);
    if (payload !== null) req.write(body);
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

async function ensureRunDir() {
  await fsp.mkdir(REPORT_DIR, { recursive: true });
}

async function loginApi() {
  const response = await postJson(`${BASE_URL}/api/auth/login`, {
    username: 'manager',
    password: '1234'
  });
  if (!response?.token) throw new Error('Login API returned no token.');
  return response.token;
}

async function waitForHealth(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const payload = await getJson(`${BASE_URL}/api/health`);
      if (payload?.ok) return payload;
    } catch (error) {
      lastError = error;
    }
    await sleep(1000);
  }
  throw lastError || new Error(`Health timeout after ${timeoutMs}ms`);
}

async function createFixture(token) {
  const stamp = Date.now();
  const fixture = {
    clientName: `UI RESTART CLIENT ${stamp}`,
    referenceClient: `UI-RESTART-${stamp}`,
    debiteur: `Debiteur Restart ${stamp}`
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
      debiteur: fixture.debiteur,
      procedure: 'ASS',
      ville: 'Casablanca',
      montant: '31000',
      procedureDetails: {
        ASS: {
          audience: '2026-05-15',
          tribunal: 'Casablanca',
          statut: 'En cours',
          juge: 'Juge Before Restart',
          sort: ''
        }
      },
      history: []
    }
  });

  const stateAfterDossier = await getJson(`${BASE_URL}/api/state?token=${token}`);
  const hydratedClient = (stateAfterDossier.clients || []).find((entry) => entry?.name === fixture.clientName);
  const dossier = (hydratedClient?.dossiers || []).find((entry) => entry?.referenceClient === fixture.referenceClient);
  if (!hydratedClient || !dossier) throw new Error('Fixture dossier not found after creation.');

  return {
    clientId: hydratedClient.id,
    clientName: fixture.clientName,
    referenceClient: fixture.referenceClient
  };
}

async function cleanupFixture(token, fixture) {
  if (!fixture?.clientId) return;
  await postJson(`${BASE_URL}/api/state/clients?token=${token}`, {
    action: 'delete',
    clientId: fixture.clientId
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
  await page.fill('#username', 'manager');
  await page.fill('#password', '1234');
  await page.click('#loginBtn');
  await page.waitForFunction(() => {
    try {
      return !!currentUser && String(currentUser?.username || '').trim().toLowerCase() === 'manager';
    } catch {
      return false;
    }
  }, { timeout: 120000 });
  await page.waitForTimeout(1200);
}

async function modifyAudienceViaUi(page, fixture) {
  return page.evaluate(async ({ referenceClient, stamp }) => {
    showView('audience', { force: true });
    await new Promise((resolve) => setTimeout(resolve, 1600));
    const input = document.querySelector('#filterAudience');
    if (input) {
      input.value = referenceClient;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await new Promise((resolve) => setTimeout(resolve, 1600));
    const rows = typeof getAudienceRows === 'function' ? getAudienceRows() : [];
    const target = rows.find((row) => (
      String(row?.d?.referenceClient || '').trim() === referenceClient
      && String(row?.procKey || '').trim().toUpperCase() === 'ASS'
    ));
    if (!target) {
      throw new Error('Target ASS audience row not found.');
    }
    const client = AppState.clients?.[target.ci];
    const dossier = client?.dossiers?.[target.di];
    const proc = getAudienceProcedure(target.ci, target.di, target.procKey);
    if (!client || !dossier || !proc) {
      throw new Error('Target audience dossier not found.');
    }
    proc.audience = '2026-07-10';
    proc.juge = `Restart Judge ${stamp}`;
    proc.sort = 'Confirmee';
    handleDossierDataChange({ audience: true, rerenderLinked: true });
    refreshPrimaryViews({ includeSalle: true, refreshClientDropdown: false });
    const persistResult = await persistDossierReferenceNow(client.id, dossier, { source: 'ui-restart-verify' });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      procedure: String(target.procKey || ''),
      audience: String(proc.audience || ''),
      juge: String(proc.juge || ''),
      sort: String(proc.sort || ''),
      persistResult
    };
  }, {
    referenceClient: fixture.referenceClient,
    stamp: Date.now()
  });
}

function launchDesktopApp() {
  return spawn('cmd.exe', ['/d', '/s', '/c', 'npm.cmd start'], {
    cwd: DESKTOP_DIR,
    windowsHide: true,
    stdio: 'ignore'
  });
}

async function main() {
  await ensureRunDir();
  const report = {
    startedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    modifyResult: null,
    beforeRestart: null,
    afterRestart: null,
    desktopRestart: null
  };

  let token = '';
  let fixture = null;
  let browser = null;
  let context = null;
  let page = null;
  let desktopProcess = null;

  try {
    await waitForHealth();
    token = await loginApi();
    fixture = await createFixture(token);

    browser = await launchBrowser();
    context = await browser.newContext();
    page = await context.newPage();
    await loginPage(page);

    report.modifyResult = await modifyAudienceViaUi(page, fixture);

    const stateBeforeRestart = await getJson(`${BASE_URL}/api/state?token=${token}`);
    const clientBeforeRestart = (stateBeforeRestart.clients || []).find((entry) => Number(entry?.id) === Number(fixture.clientId));
    const dossierBeforeRestart = (clientBeforeRestart?.dossiers || []).find((entry) => entry?.referenceClient === fixture.referenceClient);
    report.beforeRestart = {
      audience: String(dossierBeforeRestart?.procedureDetails?.ASS?.audience || ''),
      juge: String(dossierBeforeRestart?.procedureDetails?.ASS?.juge || ''),
      sort: String(dossierBeforeRestart?.procedureDetails?.ASS?.sort || '')
    };

    desktopProcess = launchDesktopApp();
    await sleep(8000);
    report.desktopRestart = {
      launcherExitedEarly: desktopProcess.exitCode !== null,
      launcherExitCode: desktopProcess.exitCode
    };

    await waitForHealth();
    const stateAfterRestart = await getJson(`${BASE_URL}/api/state?token=${token}`);
    const clientAfterRestart = (stateAfterRestart.clients || []).find((entry) => Number(entry?.id) === Number(fixture.clientId));
    const dossierAfterRestart = (clientAfterRestart?.dossiers || []).find((entry) => entry?.referenceClient === fixture.referenceClient);
    report.afterRestart = {
      audience: String(dossierAfterRestart?.procedureDetails?.ASS?.audience || ''),
      juge: String(dossierAfterRestart?.procedureDetails?.ASS?.juge || ''),
      sort: String(dossierAfterRestart?.procedureDetails?.ASS?.sort || '')
    };

    report.summary = {
      stable: report.modifyResult?.persistResult === true
        && report.beforeRestart?.audience === '2026-07-10'
        && report.afterRestart?.audience === '2026-07-10'
        && report.afterRestart?.juge === report.modifyResult?.juge
        && report.afterRestart?.sort === report.modifyResult?.sort
    };

    report.finishedAt = new Date().toISOString();
    await fsp.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
    process.stdout.write(`${JSON.stringify({
      ok: true,
      reportFile: REPORT_FILE,
      summary: report.summary,
      beforeRestart: report.beforeRestart,
      afterRestart: report.afterRestart
    }, null, 2)}\n`);
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.error = { message: error.message, stack: error.stack };
    await fsp.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8').catch(() => {});
    process.stderr.write(`UI restart verification failed: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  } finally {
    if (token && fixture) {
      await cleanupFixture(token, fixture).catch(() => {});
    }
    await page?.close().catch(() => {});
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    if (desktopProcess && desktopProcess.exitCode === null) {
      desktopProcess.kill();
    }
  }
}

if (require.main === module) {
  main();
}
