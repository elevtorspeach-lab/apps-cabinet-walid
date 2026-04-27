#!/usr/bin/env node

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const PLAYWRIGHT_CANDIDATES = [
  path.join(ROOT_DIR, 'node_modules', 'playwright'),
  'playwright'
];
const BASE_URL = process.env.UI_TEST_BASE_URL || 'http://127.0.0.1:3000';
const RUN_ID = `ui-step-${Date.now()}`;
const RUN_DIR = path.join(ROOT_DIR, 'bench-runs', RUN_ID);
const REPORT_FILE = path.join(RUN_DIR, 'report.json');
const CHROME_PATH = process.env.BENCH_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FREEZE_THRESHOLD_MS = 1200;
const HARD_FREEZE_THRESHOLD_MS = 3000;

function requirePlaywright() {
  for (const candidate of PLAYWRIGHT_CANDIDATES) {
    try {
      return require(candidate);
    } catch {}
  }
  throw new Error(`Playwright introuvable. Candidates: ${PLAYWRIGHT_CANDIDATES.join(', ')}`);
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
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: raw
          });
        });
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
  await fsp.mkdir(RUN_DIR, { recursive: true });
}

async function loginRemote() {
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

async function createFixtureClient(token) {
  const stamp = Date.now();
  const fixture = {
    clientName: `UI STEP CLIENT ${stamp}`,
    referenceClient: `UI-STEP-${stamp}`,
    debiteur: `Debiteur UI ${stamp}`
  };

  await postJson(`${BASE_URL}/api/state/clients?token=${token}`, {
    action: 'create',
    client: {
      name: fixture.clientName,
      dossiers: []
    }
  });

  const stateAfterClientCreate = await getJson(`${BASE_URL}/api/state?token=${token}`);
  const client = (stateAfterClientCreate.clients || []).find((entry) => entry?.name === fixture.clientName);
  if (!client) throw new Error('Fixture client not found after creation.');

  await postJson(`${BASE_URL}/api/state/dossiers?token=${token}`, {
    action: 'create',
    clientId: client.id,
    dossier: {
      referenceClient: fixture.referenceClient,
      debiteur: fixture.debiteur,
      procedure: 'Commandement, ASS',
      ville: 'Casablanca',
      montant: '25000',
      procedureDetails: {
        Commandement: {
          notifDebiteur: 'notifier',
          ordonnance: 'oui',
          date: '2026-05-01'
        },
        ASS: {
          audience: '2026-05-15',
          tribunal: 'Casablanca',
          statut: 'En cours',
          juge: 'Juge UI'
        }
      },
      history: []
    }
  });

  const stateAfterDossierCreate = await getJson(`${BASE_URL}/api/state?token=${token}`);
  const hydratedClient = (stateAfterDossierCreate.clients || []).find((entry) => entry?.name === fixture.clientName);
  const dossier = (hydratedClient?.dossiers || []).find((entry) => entry?.referenceClient === fixture.referenceClient);
  if (!hydratedClient || !dossier) throw new Error('Fixture dossier not found after creation.');

  return {
    clientId: hydratedClient.id,
    clientName: fixture.clientName,
    referenceClient: fixture.referenceClient,
    externalId: dossier.externalId
  };
}

async function cleanupFixtureClient(token, fixture) {
  if (!fixture?.clientId) return;
  await postJson(`${BASE_URL}/api/state/clients?token=${token}`, {
    action: 'delete',
    clientId: fixture.clientId
  });
}

function monitorScript() {
  return `
    (() => {
      if (window.__uiStepMonitorInstalled) return;
      window.__uiStepMonitorInstalled = true;
      const state = {
        maxRafGap: 0,
        maxIntervalGap: 0,
        freezeEvents: [],
        routeSamples: []
      };
      const getRoute = () => {
        try {
          if (typeof currentView === 'string' && currentView) return currentView;
        } catch {}
        return '';
      };
      const pushFreeze = (kind, gap) => {
        state.freezeEvents.push({
          kind,
          gap,
          route: getRoute(),
          at: new Date().toISOString(),
          hardFreeze: gap >= ${HARD_FREEZE_THRESHOLD_MS}
        });
        if (state.freezeEvents.length > 80) {
          state.freezeEvents.splice(0, state.freezeEvents.length - 80);
        }
      };
      let lastRaf = performance.now();
      const tick = (now) => {
        const gap = now - lastRaf;
        if (gap > state.maxRafGap) state.maxRafGap = gap;
        if (gap >= ${FREEZE_THRESHOLD_MS}) pushFreeze('raf', gap);
        lastRaf = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      let lastInterval = performance.now();
      setInterval(() => {
        const now = performance.now();
        const gap = now - lastInterval;
        if (gap > state.maxIntervalGap) state.maxIntervalGap = gap;
        if (gap >= ${FREEZE_THRESHOLD_MS}) pushFreeze('interval', gap);
        lastInterval = now;
      }, 1000);
      setInterval(() => {
        state.routeSamples.push({
          route: getRoute(),
          at: new Date().toISOString()
        });
        if (state.routeSamples.length > 40) {
          state.routeSamples.splice(0, state.routeSamples.length - 40);
        }
      }, 2000);
      window.__uiStepPullMetrics = () => {
        const payload = {
          maxRafGap: state.maxRafGap,
          maxIntervalGap: state.maxIntervalGap,
          freezeEvents: state.freezeEvents.slice(),
          routeSamples: state.routeSamples.slice()
        };
        state.maxRafGap = 0;
        state.maxIntervalGap = 0;
        state.freezeEvents.length = 0;
        state.routeSamples.length = 0;
        return payload;
      };
    })();
  `;
}

async function launchBrowser() {
  const launchOptions = {
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
    launchOptions.executablePath = CHROME_PATH;
  }
  return chromium.launch(launchOptions);
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
  await page.addInitScript(monitorScript());
  await page.evaluate(monitorScript());
  await page.waitForTimeout(1500);
}

async function pullMetrics(page) {
  return page.evaluate(() => {
    if (typeof window.__uiStepPullMetrics !== 'function') {
      return { maxRafGap: 0, maxIntervalGap: 0, freezeEvents: [], routeSamples: [] };
    }
    return window.__uiStepPullMetrics();
  });
}

async function measureStep(name, fn, report) {
  const started = Date.now();
  const result = await fn();
  report.steps.push({
    name,
    durationMs: Date.now() - started,
    ...result
  });
}

async function main() {
  await ensureRunDir();
  const report = {
    runId: RUN_ID,
    baseUrl: BASE_URL,
    startedAt: new Date().toISOString(),
    consoleErrors: [],
    pageErrors: [],
    steps: [],
    summary: null
  };

  let browser = null;
  let context = null;
  let page = null;
  let token = '';
  let fixture = null;

  try {
    await waitForHealth();
    token = await loginRemote();
    fixture = await createFixtureClient(token);

    browser = await launchBrowser();
    context = await browser.newContext({ acceptDownloads: false });
    page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        report.consoleErrors.push({
          text: msg.text(),
          at: new Date().toISOString()
        });
      }
    });
    page.on('pageerror', (error) => {
      report.pageErrors.push({
        message: error.message,
        at: new Date().toISOString()
      });
    });

    await loginPage(page);

    await measureStep('Clients Page', async () => {
      const details = await page.evaluate(async (clientName) => {
        showView('clients', { force: true });
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const input = document.querySelector('#searchClientInput');
        if (input) {
          input.value = clientName;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const rows = [...document.querySelectorAll('#clientsBody tr')];
        const matchingRow = rows.find((row) => String(row.textContent || '').includes(clientName));
        return {
          route: typeof currentView === 'string' ? currentView : '',
          rowCount: rows.length,
          foundFixtureClient: !!matchingRow,
          visibleText: matchingRow ? String(matchingRow.textContent || '').trim() : ''
        };
      }, fixture.clientName);
      const metrics = await pullMetrics(page);
      return { details, metrics };
    }, report);

    await measureStep('Diligence Page', async () => {
      const details = await page.evaluate(async ({ referenceClient, noteSuffix }) => {
        showView('diligence', { force: true });
        await new Promise((resolve) => setTimeout(resolve, 1400));
        const input = document.querySelector('#diligenceSearchInput');
        if (input) {
          input.value = referenceClient;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await new Promise((resolve) => setTimeout(resolve, 1400));
        const rows = typeof getDiligenceRows === 'function' ? getDiligenceRows() : [];
        const target = rows.find((row) => (
          String(row?.dossier?.referenceClient || '').trim() === referenceClient
          && String(row?.procedure || '').trim().toLowerCase() === 'commandement'
        )) || rows.find((row) => String(row?.dossier?.referenceClient || '').trim() === referenceClient);
        if (!target) {
          throw new Error('Target diligence row not found.');
        }
        const client = AppState.clients.find((entry) => Number(entry?.id) === Number(target.clientId));
        const dossier = client?.dossiers?.[target.dossierIndex];
        if (!client || !dossier) {
          throw new Error('Target diligence dossier not found.');
        }
        const procKey = String(target.procedure || '').trim();
        const proc = dossier.procedureDetails?.[procKey];
        if (!proc) {
          throw new Error(`Procedure ${procKey} not found on dossier.`);
        }
        proc.notifDebiteur = 'fait';
        proc.commentaire = `ui-step-${noteSuffix}`;
        handleDossierDataChange({ audience: false, rerenderLinked: true });
        refreshPrimaryViews({ includeRecycle: false, refreshClientDropdown: false });
        await persistDossierReferenceNow(client.id, dossier, { source: 'ui-step-diligence' });
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return {
          route: typeof currentView === 'string' ? currentView : '',
          matchedProcedure: procKey,
          updatedNotifDebiteur: proc.notifDebiteur,
          updatedCommentaire: proc.commentaire
        };
      }, { referenceClient: fixture.referenceClient, noteSuffix: Date.now() });
      const metrics = await pullMetrics(page);
      return { details, metrics };
    }, report);

    await measureStep('Audience Page', async () => {
      const details = await page.evaluate(async ({ referenceClient, stamp }) => {
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
        )) || rows.find((row) => String(row?.d?.referenceClient || '').trim() === referenceClient);
        if (!target) {
          throw new Error('Target audience row not found.');
        }
        const client = AppState.clients?.[target.ci];
        const dossier = client?.dossiers?.[target.di];
        const proc = typeof getAudienceProcedure === 'function'
          ? getAudienceProcedure(target.ci, target.di, target.procKey)
          : null;
        if (!client || !dossier || !proc) {
          throw new Error('Target audience dossier not found.');
        }
        const procKey = String(target.procKey || '').trim();
        proc.audience = '2026-06-20';
        proc.juge = `UI Judge ${stamp}`;
        proc.sort = 'Reporte';
        handleDossierDataChange({ audience: true, rerenderLinked: true });
        refreshPrimaryViews({ includeSalle: true, refreshClientDropdown: false });
        const persisted = await persistDossierReferenceNow(client.id, dossier, { source: 'ui-step-audience' });
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return {
          route: typeof currentView === 'string' ? currentView : '',
          matchedProcedure: procKey,
          updatedAudience: proc.audience,
          updatedJudge: proc.juge,
          updatedSort: proc.sort,
          persistResult: persisted
        };
      }, { referenceClient: fixture.referenceClient, stamp: Date.now() });
      const metrics = await pullMetrics(page);
      return { details, metrics };
    }, report);

    const finalState = await getJson(`${BASE_URL}/api/state?token=${token}`);
    const finalClient = (finalState.clients || []).find((entry) => Number(entry?.id) === Number(fixture.clientId));
    const finalDossier = (finalClient?.dossiers || []).find((entry) => entry?.referenceClient === fixture.referenceClient);
    const audienceStep = report.steps.find((step) => step.name === 'Audience Page');
    const matchedAudienceProcedure = String(audienceStep?.details?.matchedProcedure || 'ASS').trim() || 'ASS';
    const matchedAudienceDetails = finalDossier?.procedureDetails?.[matchedAudienceProcedure] || {};

    report.summary = {
      stable: report.pageErrors.length === 0 && report.consoleErrors.length === 0,
      consoleErrorCount: report.consoleErrors.length,
      pageErrorCount: report.pageErrors.length,
      persistedChecks: {
        diligenceCommentaire: String(finalDossier?.procedureDetails?.Commandement?.commentaire || ''),
        diligenceNotifDebiteur: String(finalDossier?.procedureDetails?.Commandement?.notifDebiteur || ''),
        audienceProcedure: matchedAudienceProcedure,
        audienceDate: String(matchedAudienceDetails?.audience || ''),
        audienceJudge: String(matchedAudienceDetails?.juge || ''),
        audienceSort: String(matchedAudienceDetails?.sort || '')
      }
    };

    report.finishedAt = new Date().toISOString();
    await fsp.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
    process.stdout.write(`${JSON.stringify({
      ok: true,
      reportFile: REPORT_FILE,
      summary: report.summary
    }, null, 2)}\n`);
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.error = {
      message: error.message,
      stack: error.stack
    };
    await fsp.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8').catch(() => {});
    process.stderr.write(`UI step test failed: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  } finally {
    if (token && fixture) {
      await cleanupFixtureClient(token, fixture).catch(() => {});
    }
    await page?.close().catch(() => {});
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }
}

if (require.main === module) {
  main();
}
