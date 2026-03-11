const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { performance } = require('perf_hooks');
const { chromium } = require('playwright');
const { buildPayload, DOSSIER_COUNT, AUDIENCE_COUNT } = require('./benchmark_large_state');

const SOURCE_ROOT = path.join(__dirname, '..');
const TEMP_ROOT = path.join(os.tmpdir(), `cabinet-avocat-web-bench-${Date.now()}`);
const PORT = 3100;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

async function copyProjectSubset() {
  await fs.mkdir(TEMP_ROOT, { recursive: true });
  const entries = ['app.js', 'index.html', 'style.css', 'state-persistence.js', 'render-dashboard.js', 'render-audience-suivi.js', 'render-diligence.js', 'vendor', 'workers', 'server'];
  for (const entry of entries) {
    await fs.cp(path.join(SOURCE_ROOT, entry), path.join(TEMP_ROOT, entry), { recursive: true });
  }
}

async function writeFixtureState() {
  const payload = buildPayload();
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

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {}
    if ((Date.now() - start) > timeoutMs) {
      throw new Error('Server did not become ready in time');
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function runBrowserBenchmark() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const metrics = {};

  const t0 = performance.now();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginBtn');
  metrics.loadLoginScreenMs = performance.now() - t0;

  await page.fill('#username', 'manager');
  await page.fill('#password', '1234');

  const t1 = performance.now();
  await page.evaluate(() => {
    document.querySelector('#username').value = 'manager';
    document.querySelector('#password').value = '1234';
    if (typeof login === 'function') login();
  });
  try {
    await page.waitForSelector('#appContent', { state: 'visible', timeout: 30000 });
  } catch (err) {
    const errorVisible = await page.locator('#errorMsg').isVisible().catch(() => false);
    const errorText = await page.locator('#errorMsg').textContent().catch(() => '');
    const screenshotPath = path.join(TEMP_ROOT, 'login-failure.png');
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    err.message += `\nlogin error visible: ${errorVisible}\nlogin error text: ${errorText}\nscreenshot: ${screenshotPath}\nconsole errors:\n${consoleErrors.join('\n')}`;
    throw err;
  }
  await page.waitForFunction(() => document.querySelector('#totalClients')?.textContent?.trim() === '300');
  metrics.loginAndDashboardMs = performance.now() - t1;

  const totalClients = await page.locator('#totalClients').textContent();
  const totalAudienceRows = await page.locator('#audienceErrorsCount').textContent();

  const t2 = performance.now();
  await page.click('#clientsLink');
  await page.waitForSelector('#clientSection', { state: 'visible' });
  await page.waitForFunction(() => document.querySelectorAll('#clientsBody tr').length > 0);
  metrics.clientsViewMs = performance.now() - t2;
  metrics.clientsRenderedRows = await page.locator('#clientsBody tr').count();

  const t3 = performance.now();
  await page.click('#audienceLink');
  await page.waitForSelector('#audienceSection', { state: 'visible' });
  await page.waitForFunction(() => document.querySelectorAll('#audienceBody tr').length > 0);
  metrics.audienceViewMs = performance.now() - t3;
  metrics.audienceRenderedRows = await page.locator('#audienceBody tr').count();

  const t4 = performance.now();
  await page.click('#suiviLink');
  await page.waitForSelector('#suiviSection', { state: 'visible' });
  await page.waitForFunction(() => document.querySelectorAll('#suiviBody tr').length > 0);
  metrics.suiviViewMs = performance.now() - t4;
  metrics.suiviRenderedRows = await page.locator('#suiviBody tr').count();

  const perfSnapshot = await page.evaluate(() => ({
    usedHeapSize: performance.memory ? performance.memory.usedJSHeapSize : null,
    totalHeapSize: performance.memory ? performance.memory.totalJSHeapSize : null,
    bodyTextLength: document.body?.innerText?.length || 0
  }));

  await browser.close();
  return {
    metrics,
    totalClients: totalClients?.trim(),
    totalAudienceRows: totalAudienceRows?.trim(),
    consoleErrors,
    perfSnapshot
  };
}

async function main() {
  console.log(`Preparing web benchmark for ${DOSSIER_COUNT} dossiers / ${AUDIENCE_COUNT} audience entries`);
  await copyProjectSubset();
  await writeFixtureState();

  const server = spawn('node', ['server/index.js'], {
    cwd: TEMP_ROOT,
    env: {
      ...process.env,
      HOST,
      PORT: String(PORT)
    },
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

  try {
    await waitForServer();
    const result = await runBrowserBenchmark();
    console.log(JSON.stringify({
      baseUrl: BASE_URL,
      tempRoot: TEMP_ROOT,
      ...result
    }, null, 2));
  } finally {
    server.kill('SIGINT');
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (server.exitCode === null) server.kill('SIGKILL');
    if (serverStderr.trim()) {
      console.error(serverStderr.trim());
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
