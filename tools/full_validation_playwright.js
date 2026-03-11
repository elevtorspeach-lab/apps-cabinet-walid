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
const TEMP_ROOT = path.join(os.tmpdir(), `cabinet-avocat-full-validation-${Date.now()}`);
const PORT = 3700;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;
const CLIENT_COUNT = readCountArg('--clients', 100);
const DOSSIER_COUNT = readCountArg('--dossiers', 30000);
const AUDIENCE_COUNT = readCountArg('--audiences', 55000);

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
  const payload = buildPayload({
    clients: CLIENT_COUNT,
    dossiers: DOSSIER_COUNT,
    audiences: AUDIENCE_COUNT
  });
  const fixturePath = path.join(TEMP_ROOT, 'fixture.appsavocat.json');
  await fs.writeFile(fixturePath, JSON.stringify(payload), 'utf8');
  return fixturePath;
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

async function waitForDownload(page, trigger, suggestedNameFallback) {
  const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
  await trigger();
  const download = await downloadPromise;
  const targetPath = path.join(TEMP_ROOT, 'downloads', suggestedNameFallback || download.suggestedFilename());
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await download.saveAs(targetPath);
  const stat = await fs.stat(targetPath);
  return {
    filename: path.basename(targetPath),
    bytes: stat.size
  };
}

async function main() {
  await copyProjectSubset();
  await writeEmptyServerState();
  const fixturePath = await writeImportFixture();

  const server = spawn('node', ['server/index.js'], {
    cwd: TEMP_ROOT,
    env: { ...process.env, HOST, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverStderr = '';
  server.stderr.on('data', (chunk) => {
    serverStderr += String(chunk);
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const dialogs = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept().catch(() => {});
  });

  try {
    await waitForServer();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.fill('#username', 'manager');
    await page.fill('#password', '1234');
    await page.evaluate(() => login());
    await page.waitForSelector('#appContent', { state: 'visible' });

    await page.setInputFiles('#importAppsavocatInput', fixturePath);
    await page.waitForFunction(({ expectedClients, expectedDossiers }) => {
      const clients = Array.isArray(AppState?.clients) ? AppState.clients.length : 0;
      const dossiers = (Array.isArray(AppState?.clients) ? AppState.clients : []).reduce((sum, client) => (
        sum + (Array.isArray(client?.dossiers) ? client.dossiers.length : 0)
      ), 0);
      return clients === expectedClients && dossiers === expectedDossiers;
    }, { expectedClients: CLIENT_COUNT, expectedDossiers: DOSSIER_COUNT }, { timeout: 240000 });

    const dossierUpdate = await page.evaluate(async () => {
      const client = AppState.clients?.[0];
      const dossier = client?.dossiers?.[0];
      if (!client || !dossier) throw new Error('Missing first dossier.');
      const updatedDossier = { ...dossier, note: `validation-note-${Date.now()}` };
      client.dossiers[0] = updatedDossier;
      await persistDossierPatchNow({
        action: 'update',
        clientId: Number(client.id),
        dossierIndex: 0,
        targetClientId: Number(client.id),
        dossier: updatedDossier
      }, { source: 'full-validation-update' });
      return {
        clientId: Number(client.id),
        note: updatedDossier.note
      };
    });

    await page.click('#audienceLink');
    await page.waitForSelector('#audienceSection', { state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('#audienceBody tr').length > 0, { timeout: 120000 });

    const audienceSetup = await page.evaluate(async () => {
      const rows = getAudienceRows();
      const row = rows.find((item) => String(item?.p?.juge || '').trim()) || rows[0];
      if (!row) throw new Error('No audience row found.');
      const draftKey = makeAudienceDraftKey(row.ci, row.di, row.procKey);
      audienceDraft = {
        ...(audienceDraft && typeof audienceDraft === 'object' ? audienceDraft : {}),
        [draftKey]: {
          ...(audienceDraft?.[draftKey] && typeof audienceDraft[draftKey] === 'object' ? audienceDraft[draftKey] : {}),
          sort: `validation-sort-${Date.now()}`
        }
      };
      saveAllAudience();
      return {
        juge: String(row?.p?.juge || row?.draft?.juge || '').trim(),
        draftKey
      };
    });

    await page.evaluate(() => setAllVisibleAudienceRowsForPrint(true));
    await page.waitForFunction(() => {
      const text = String(document.querySelector('#audienceCheckedCount')?.textContent || '');
      const match = text.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    }, { timeout: 30000 });

    const audienceExport = await waitForDownload(
      page,
      async () => {
        await page.evaluate(async () => {
          await exportAudienceRegularXLS();
        });
      },
      'audience_standard.xlsx'
    );

    const audienceDetailExport = await waitForDownload(
      page,
      async () => {
        await page.evaluate(async () => {
          await exportAudienceXLS();
        });
      },
      'audience_detail.xlsx'
    );

    await page.evaluate(async ({ juge }) => {
      AppState.salleAssignments = [{
        id: Date.now(),
        salle: 'Salle Validation',
        juge,
        day: 'lundi'
      }];
      if (typeof invalidateSalleAssignmentsCaches === 'function') {
        invalidateSalleAssignmentsCaches();
      }
      await persistStateSliceNow('salleAssignments', AppState.salleAssignments, { source: 'full-validation-salle' });
      renderSidebarSalleSessions();
      renderSalle();
    }, { juge: audienceSetup.juge });

    await page.evaluate(() => showView('salle'));
    await page.waitForSelector('#salleSection', { state: 'visible' });
    await page.waitForFunction(() => {
      try {
        return typeof buildSalleAudienceMap === 'function' && buildSalleAudienceMap('lundi').size > 0;
      } catch {
        return false;
      }
    }, null, { timeout: 120000 });

    const salleExport = await waitForDownload(
      page,
      async () => {
        await page.evaluate(() => exportSalleAudiences(encodeURIComponent('Salle Validation'), encodeURIComponent('lundi')));
      },
      'salle_export.xlsx'
    );

    const after = await page.evaluate(() => {
      const client = AppState.clients?.[0];
      return {
        clients: Array.isArray(AppState?.clients) ? AppState.clients.length : 0,
        dossiers: (Array.isArray(AppState?.clients) ? AppState.clients : []).reduce((sum, item) => sum + ((item?.dossiers || []).length), 0),
        firstDossierNote: String(client?.dossiers?.[0]?.note || ''),
        syncText: String(document.querySelector('#syncStatusText')?.textContent || '').trim(),
        audienceChecked: String(document.querySelector('#audienceCheckedCount')?.textContent || '').trim(),
        salleExportVisible: !!document.querySelector('.btn-salle-export')
      };
    });

    console.log(JSON.stringify({
      baseUrl: BASE_URL,
      tempRoot: TEMP_ROOT,
      fixturePath,
      dossierUpdate,
      audienceSetup,
      exports: {
        audienceExport,
        audienceDetailExport,
        salleExport
      },
      after,
      dialogs
    }, null, 2));
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
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
