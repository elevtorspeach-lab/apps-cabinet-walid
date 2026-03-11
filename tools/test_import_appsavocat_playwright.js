const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { buildPayload, DOSSIER_COUNT, AUDIENCE_COUNT } = require('./benchmark_large_state');

const SOURCE_ROOT = path.join(__dirname, '..');
const TEMP_ROOT = path.join(os.tmpdir(), `cabinet-avocat-import-test-${Date.now()}`);
const PORT = 3200;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

async function copyProjectSubset() {
  await fs.mkdir(TEMP_ROOT, { recursive: true });
  for (const entry of ['app.js', 'index.html', 'style.css', 'state-persistence.js', 'render-dashboard.js', 'render-audience-suivi.js', 'render-diligence.js', 'vendor', 'workers', 'server']) {
    await fs.cp(path.join(SOURCE_ROOT, entry), path.join(TEMP_ROOT, entry), { recursive: true });
  }
}

async function writeEmptyServerState() {
  const statePath = path.join(TEMP_ROOT, 'server', 'data', 'state.json');
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(
    statePath,
    JSON.stringify({
      clients: [],
      salleAssignments: [],
      users: [],
      audienceDraft: {},
      recycleBin: [],
      recycleArchive: [],
      updatedAt: new Date().toISOString()
    }),
    'utf8'
  );
}

async function writeImportFixture() {
  const payload = buildPayload();
  const fixturePath = path.join(TEMP_ROOT, 'fixture.appsavocat.json');
  await fs.writeFile(fixturePath, JSON.stringify(payload), 'utf8');
  return { payload, fixturePath };
}

async function waitForServer(timeoutMs = 15000) {
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

function countAudienceEntries(payload) {
  let total = 0;
  for (const client of payload.clients || []) {
    for (const dossier of client.dossiers || []) {
      const details = dossier && typeof dossier.procedureDetails === 'object' ? dossier.procedureDetails : {};
      for (const [procName, procDetails] of Object.entries(details)) {
        const value = String(procName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const isAudience = value && value !== 'sfdc' && value !== 'sbien' && value !== 'injonction';
        if (!isAudience) continue;
        if (procDetails && typeof procDetails === 'object') total += 1;
      }
    }
  }
  return total;
}

async function runImportTest(fixturePath, expected) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const dialogs = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept().catch(() => {});
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.fill('#username', 'manager');
  await page.fill('#password', '1234');
  await page.evaluate(() => {
    document.querySelector('#username').value = 'manager';
    document.querySelector('#password').value = '1234';
    login();
  });
  await page.waitForSelector('#appContent', { state: 'visible' });

  const before = await page.evaluate(() => ({
    clients: Array.isArray(AppState?.clients) ? AppState.clients.length : -1,
    dossiers: (Array.isArray(AppState?.clients) ? AppState.clients : []).reduce((sum, client) => (
      sum + (Array.isArray(client?.dossiers) ? client.dossiers.length : 0)
    ), 0)
  }));

  await page.setInputFiles('#importAppsavocatInput', fixturePath);
  await page.waitForFunction(() => {
    const clients = Array.isArray(AppState?.clients) ? AppState.clients.length : 0;
    const dossiers = (Array.isArray(AppState?.clients) ? AppState.clients : []).reduce((sum, client) => (
      sum + (Array.isArray(client?.dossiers) ? client.dossiers.length : 0)
    ), 0);
    return clients > 0 && dossiers > 0;
  }, { timeout: 180000 });

  await page.waitForFunction(() => {
    const modal = document.querySelector('#importProgressModal');
    return !modal || modal.style.display === 'none' || modal.hidden === true;
  }, { timeout: 180000 }).catch(() => {});

  const after = await page.evaluate(() => {
    const clients = Array.isArray(AppState?.clients) ? AppState.clients : [];
    let dossiers = 0;
    let audiences = 0;
    clients.forEach((client) => {
      (Array.isArray(client?.dossiers) ? client.dossiers : []).forEach((dossier) => {
        dossiers += 1;
        const details = dossier?.procedureDetails && typeof dossier.procedureDetails === 'object'
          ? dossier.procedureDetails
          : {};
        Object.entries(details).forEach(([procName, procDetails]) => {
          const value = String(procName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          const isAudience = value && value !== 'sfdc' && value !== 'sbien' && value !== 'injonction';
          if (isAudience && procDetails && typeof procDetails === 'object') audiences += 1;
        });
      });
    });
    return {
      clients: clients.length,
      dossiers,
      audiences,
      users: Array.isArray(window.USERS) ? window.USERS.length : null,
      dashboardClients: document.querySelector('#totalClients')?.textContent?.trim() || '',
      syncText: document.querySelector('#syncStatusText')?.textContent?.trim() || ''
    };
  });

  await browser.close();
  return {
    before,
    after,
    expected,
    dialogs
  };
}

async function main() {
  await copyProjectSubset();
  await writeEmptyServerState();
  const { payload, fixturePath } = await writeImportFixture();
  const expected = {
    clients: Array.isArray(payload.clients) ? payload.clients.length : 0,
    dossiers: (payload.clients || []).reduce((sum, client) => sum + ((client.dossiers || []).length), 0),
    audiences: countAudienceEntries(payload)
  };

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
    const result = await runImportTest(fixturePath, expected);
    console.log(JSON.stringify({
      baseUrl: BASE_URL,
      tempRoot: TEMP_ROOT,
      fixturePath,
      result
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
