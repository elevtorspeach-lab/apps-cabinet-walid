const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { performance } = require('perf_hooks');
const { chromium } = require('playwright');
const { buildPayload } = require('./benchmark_large_state');

const dossierArg = process.argv.find((arg) => arg.startsWith('--dossiers='));
const audienceArg = process.argv.find((arg) => arg.startsWith('--audiences='));
const clientArg = process.argv.find((arg) => arg.startsWith('--clients='));
const DOSSIER_COUNT = Math.max(1, Number(process.env.BENCH_DOSSIERS || (dossierArg ? dossierArg.slice('--dossiers='.length) : 100000)) || 100000);
const AUDIENCE_COUNT = Math.max(0, Number(process.env.BENCH_AUDIENCES || (audienceArg ? audienceArg.slice('--audiences='.length) : 150000)) || 150000);
const CLIENT_COUNT = Math.max(1, Number(process.env.BENCH_CLIENTS || (clientArg ? clientArg.slice('--clients='.length) : 300)) || 300);

const SOURCE_ROOT = path.join(__dirname, '..');
const TEMP_ROOT = path.join(os.tmpdir(), `cabinet-avocat-stress-${Date.now()}`);
const PORT = 3300;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

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

async function measureStep(metrics, label, fn) {
  const start = performance.now();
  const details = await fn();
  metrics[label] = {
    ms: Number((performance.now() - start).toFixed(1)),
    ...(details && typeof details === 'object' ? details : {})
  };
}

async function runStress() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(180000);
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const metrics = {};
  await measureStep(metrics, 'loadLogin', async () => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loginBtn');
    return {};
  });

  await measureStep(metrics, 'loginDashboard', async () => {
    await page.fill('#username', 'manager');
    await page.fill('#password', '1234');
    await page.evaluate(() => {
      document.querySelector('#username').value = 'manager';
      document.querySelector('#password').value = '1234';
      login();
    });
    await page.waitForSelector('#appContent', { state: 'visible' });
    await page.waitForFunction((expectedClients) => {
      return document.querySelector('#totalClients')?.textContent?.trim() === String(expectedClients);
    }, CLIENT_COUNT);
    return {
      totalClients: await page.locator('#totalClients').textContent(),
      dashboardCalendarReady: await page.locator('#dashboardCalendarGrid').isVisible()
    };
  });

  await measureStep(metrics, 'clientsPage', async () => {
    await page.click('#clientsLink');
    await page.waitForSelector('#clientSection', { state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('#clientsBody tr').length > 0);
    await page.fill('#searchClientInput', 'Client 299');
    await page.waitForTimeout(250);
    const filteredRows = await page.locator('#clientsBody tr').count();
    await page.fill('#searchClientInput', '');
    await page.waitForTimeout(250);
    return {
      rows: await page.locator('#clientsBody tr').count(),
      filteredRows
    };
  });

  await measureStep(metrics, 'creationPage', async () => {
    await page.click('#creationLink');
    await page.waitForSelector('#creationSection', { state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('#selectClient option').length > 1);
    await page.selectOption('#selectClient', { index: 1 });
    return {
      clientOptions: await page.locator('#selectClient option').count(),
      selectedClient: await page.locator('#selectClient').inputValue()
    };
  });

  await measureStep(metrics, 'suiviPage', async () => {
    await page.click('#suiviLink');
    await page.waitForSelector('#suiviSection', { state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('#suiviBody tr').length > 0);
    await page.fill('#filterGlobal', 'REF-99999');
    await page.waitForTimeout(350);
    const filteredRows = await page.locator('#suiviBody tr').count();
    await page.fill('#filterGlobal', '');
    await page.waitForTimeout(350);
    return {
      rows: await page.locator('#suiviBody tr').count(),
      filteredRows
    };
  });

  await measureStep(metrics, 'audiencePage', async () => {
    await page.click('#audienceLink');
    await page.waitForSelector('#audienceSection', { state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('#audienceBody tr').length > 0);
    await page.click('.color-btn.blue');
    await page.waitForTimeout(350);
    const blueRows = await page.locator('#audienceBody tr').count();
    await page.click('.color-btn.all');
    await page.waitForTimeout(350);
    return {
      rows: await page.locator('#audienceBody tr').count(),
      checkedCountText: (await page.locator('#audienceCheckedCount').textContent())?.trim() || '',
      blueRows
    };
  });

  await measureStep(metrics, 'diligencePage', async () => {
    await page.click('#diligenceLink');
    await page.waitForSelector('#diligenceSection', { state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('#diligenceBody tr').length > 0 || document.querySelector('#diligenceCount')?.textContent?.length > 0);
    const procedureOptions = await page.locator('#diligenceProcedureFilter option').count();
    if (procedureOptions > 1) {
      await page.selectOption('#diligenceProcedureFilter', { index: 1 });
      await page.waitForTimeout(350);
    }
    const filteredRows = await page.locator('#diligenceBody tr').count();
    return {
      rows: await page.locator('#diligenceBody tr').count(),
      countText: (await page.locator('#diligenceCount').textContent())?.trim() || '',
      filteredRows,
      procedureOptions
    };
  });

  await measureStep(metrics, 'sallePage', async () => {
    await page.click('#salleLink');
    await page.waitForSelector('#salleSection', { state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('#salleDayTabs button').length > 0);
    const tabs = await page.locator('#salleDayTabs button').count();
    if (tabs > 1) {
      await page.locator('#salleDayTabs button').nth(1).click();
      await page.waitForTimeout(250);
    }
    return {
      rows: await page.locator('#salleBody tr').count(),
      tabs
    };
  });

  await measureStep(metrics, 'equipePage', async () => {
    await page.click('#equipeLink');
    await page.waitForSelector('#equipeSection', { state: 'visible' });
    await page.waitForFunction(() => {
      const panel = document.querySelector('#teamManagerPanel');
      const locked = document.querySelector('#teamLocked');
      return (panel && panel.offsetParent !== null) || (locked && locked.offsetParent !== null);
    });
    await page.fill('#teamClientSearchInput', 'Client 12');
    await page.waitForTimeout(250);
    return {
      rows: await page.locator('#teamUsersBody tr').count(),
      managerPanelVisible: await page.locator('#teamManagerPanel').isVisible(),
      teamClientCount: (await page.locator('#teamClientCount').textContent())?.trim() || ''
    };
  });

  await measureStep(metrics, 'recyclePage', async () => {
    await page.click('#recycleLink');
    await page.waitForSelector('#recycleSection', { state: 'visible' });
    await page.waitForSelector('#recycleBody');
    return {
      rows: await page.locator('#recycleBody tr').count(),
      restoreAllVisible: await page.locator('#restoreAllRecycleBtn').isVisible(),
      clearVisible: await page.locator('#clearRecycleBinBtn').isVisible()
    };
  });

  const perfSnapshot = await page.evaluate(() => ({
    usedHeapSize: performance.memory ? performance.memory.usedJSHeapSize : null,
    totalHeapSize: performance.memory ? performance.memory.totalJSHeapSize : null,
    totalClients: document.querySelector('#totalClients')?.textContent?.trim() || ''
  }));

  await browser.close();
  return { metrics, consoleErrors, perfSnapshot };
}

async function main() {
  console.log(`Preparing all-pages stress test for ${DOSSIER_COUNT} dossiers / ${AUDIENCE_COUNT} audience entries`);
  await copyProjectSubset();
  await writeFixtureState();

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
    const result = await runStress();
    console.log(JSON.stringify({
      baseUrl: BASE_URL,
      tempRoot: TEMP_ROOT,
      dossiers: DOSSIER_COUNT,
      audiences: AUDIENCE_COUNT,
      clients: CLIENT_COUNT,
      ...result
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
