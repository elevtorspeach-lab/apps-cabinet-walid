const fs = require('fs/promises');
const path = require('path');
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
const RUN_ROOT = path.join(SOURCE_ROOT, '.stress-runs', `concurrent-${Date.now()}`);
const SERVER_ROOT = path.join(RUN_ROOT, 'server');
const DATA_ROOT = path.join(SERVER_ROOT, 'data');
const DOWNLOAD_ROOT = path.join(RUN_ROOT, 'downloads');
const PORT = readCountArg('--port', 3800);
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

const CLIENT_COUNT = readCountArg('--clients', 100);
const DOSSIER_COUNT = readCountArg('--dossiers', 30000);
const AUDIENCE_COUNT = readCountArg('--audiences', 50000);
const USER_COUNT = readCountArg('--users', 20);
const SELECTED_EXPORT_ROWS = readCountArg('--selected-export-rows', 250);
const STARTUP_TIMEOUT_MS = 120000;
const DATA_READY_TIMEOUT_MS = 900000;
const DOWNLOAD_TIMEOUT_MS = 900000;

function buildUsers() {
  const users = [{ id: 1, username: 'manager', password: '1234', role: 'manager', clientIds: [] }];
  for (let i = 1; i < USER_COUNT; i += 1) {
    users.push({
      id: i + 1,
      username: `admin${String(i).padStart(2, '0')}`,
      password: '1234',
      role: 'admin',
      clientIds: []
    });
  }
  return users;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyEntry(relativePath) {
  const source = path.join(SOURCE_ROOT, relativePath);
  const dest = path.join(RUN_ROOT, relativePath);
  await fs.cp(source, dest, { recursive: true });
}

async function prepareRunWorkspace() {
  await ensureDir(RUN_ROOT);
  for (const entry of [
    'app.js',
    'index.html',
    'style.css',
    'state-persistence.js',
    'render-dashboard.js',
    'render-audience-suivi.js',
    'render-diligence.js',
    'vendor',
    'workers'
  ]) {
    await copyEntry(entry);
  }
  await ensureDir(SERVER_ROOT);
  await fs.copyFile(path.join(SOURCE_ROOT, 'server', 'index.js'), path.join(SERVER_ROOT, 'index.js'));
  await fs.copyFile(path.join(SOURCE_ROOT, 'server', 'package.json'), path.join(SERVER_ROOT, 'package.json'));
  await ensureDir(DATA_ROOT);
  await ensureDir(path.join(DATA_ROOT, 'backups'));
  await ensureDir(DOWNLOAD_ROOT);
}

async function writeInitialState(users) {
  const state = {
    clients: [],
    salleAssignments: [],
    users,
    audienceDraft: {},
    recycleBin: [],
    recycleArchive: [],
    version: 0,
    updatedAt: new Date().toISOString()
  };
  await fs.writeFile(path.join(DATA_ROOT, 'state.json'), JSON.stringify(state), 'utf8');
}

async function writeFixtureFiles(users) {
  const payload = buildPayload({
    clients: CLIENT_COUNT,
    dossiers: DOSSIER_COUNT,
    audiences: AUDIENCE_COUNT
  });
  payload.users = clone(users);
  payload.updatedAt = new Date().toISOString();
  const fixturePath = path.join(RUN_ROOT, `fixture_${CLIENT_COUNT}c_${DOSSIER_COUNT}d_${AUDIENCE_COUNT}a.appsavocat`);
  await fs.writeFile(fixturePath, JSON.stringify(payload), 'utf8');
  return { fixturePath };
}

async function waitForServer(timeoutMs = STARTUP_TIMEOUT_MS) {
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {}
    if ((Date.now() - start) > timeoutMs) {
      throw new Error('Server did not become ready in time.');
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function stateSummary(state) {
  const clients = Array.isArray(state?.clients) ? state.clients : [];
  const dossiers = clients.reduce((sum, client) => sum + (Array.isArray(client?.dossiers) ? client.dossiers.length : 0), 0);
  const audiences = clients.reduce((sum, client) => sum + (Array.isArray(client?.dossiers)
    ? client.dossiers.reduce((inner, dossier) => inner + Object.keys(dossier?.procedureDetails || {}).length, 0)
    : 0), 0);
  return { clients: clients.length, dossiers, audiences };
}

async function readFinalState() {
  const raw = await fs.readFile(path.join(DATA_ROOT, 'state.json'), 'utf8');
  return JSON.parse(raw);
}

async function openSession(browser, user, slot) {
  console.log(`[open] start ${user.username} (${slot})`);
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(STARTUP_TIMEOUT_MS);
  const dialogs = [];
  const consoleErrors = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept().catch(() => {});
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.fill('#username', user.username);
  await page.fill('#password', user.password);
  await page.evaluate(() => login());
  await page.waitForSelector('#appContent', { state: 'visible' });
  await page.waitForFunction(() => {
    try {
      return typeof exportAudienceRegularXLS === 'function'
        && typeof exportSuiviSelectedXLS === 'function'
        && typeof handleAppsavocatImportFile === 'function';
    } catch {
      return false;
    }
  });
  console.log(`[open] ready ${user.username} (${slot})`);

  return {
    user,
    slot,
    context,
    page,
    dialogs,
    consoleErrors
  };
}

async function waitForDataReady(session) {
  const startedAt = Date.now();
  for (;;) {
    const counts = await session.page.evaluate(async () => {
      try {
        if (typeof refreshRemoteState === 'function') {
          await refreshRemoteState();
        }
      } catch {}
      const clients = Array.isArray(AppState?.clients) ? AppState.clients.length : 0;
      const dossiers = (Array.isArray(AppState?.clients) ? AppState.clients : []).reduce((sum, client) => (
        sum + (Array.isArray(client?.dossiers) ? client.dossiers.length : 0)
      ), 0);
      return { clients, dossiers };
    });
    if (counts.clients >= CLIENT_COUNT && counts.dossiers >= DOSSIER_COUNT) return counts;
    if ((Date.now() - startedAt) > DATA_READY_TIMEOUT_MS) {
      throw new Error(`Timed out waiting for data sync. Last counts: ${counts.clients} clients / ${counts.dossiers} dossiers`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function saveDownload(session, trigger, label) {
  const downloadPromise = session.page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT_MS });
  await trigger();
  const download = await downloadPromise;
  const filename = `${session.user.username}_${label}_${download.suggestedFilename()}`;
  const targetPath = path.join(DOWNLOAD_ROOT, filename);
  await download.saveAs(targetPath);
  const stat = await fs.stat(targetPath);
  return {
    file: targetPath,
    bytes: stat.size
  };
}

async function runImportAction(session, fixturePath, label) {
  console.log(`[${session.user.username}] import start (${label})`);
  await session.page.setInputFiles('#importAppsavocatInput', fixturePath);
  await session.page.waitForFunction(() => {
    try {
      return importInProgress === true || (Array.isArray(AppState?.clients) && AppState.clients.length > 0);
    } catch {
      return false;
    }
  }, { timeout: 120000 });
  await session.page.waitForFunction((expectedClients) => {
    try {
      return Array.isArray(AppState?.clients) && AppState.clients.length >= expectedClients;
    } catch {
      return false;
    }
  }, CLIENT_COUNT, { timeout: DATA_READY_TIMEOUT_MS });
  await session.page.evaluate(async () => {
    try {
      if (typeof persistAppStateNow === 'function') {
        await persistAppStateNow();
      }
    } catch (error) {
      throw new Error(String(error?.message || error));
    }
  });
  console.log(`[${session.user.username}] import done (${label})`);
  return {
    type: 'import',
    label,
    dialogs: session.dialogs.slice(-2)
  };
}

async function runModifyAction(session, targetIndex) {
  await waitForDataReady(session);
  console.log(`[${session.user.username}] modify start #${targetIndex}`);
  const result = await session.page.evaluate(async ({ sessionIndex, marker }) => {
    const clients = Array.isArray(AppState?.clients) ? AppState.clients : [];
    if (!clients.length) throw new Error('No clients loaded.');
    let cursor = Number(sessionIndex) || 0;
    for (const client of clients) {
      const dossiers = Array.isArray(client?.dossiers) ? client.dossiers : [];
      if (cursor < dossiers.length) {
        const dossierIndex = cursor;
        const dossier = dossiers[dossierIndex];
        const updated = {
          ...dossier,
          note: marker,
          avancement: `stress-${sessionIndex}`
        };
        dossiers[dossierIndex] = updated;
        await persistAppStateNow();
        return {
          clientId: Number(client.id),
          dossierIndex,
          referenceClient: String(updated.referenceClient || '')
        };
      }
      cursor -= dossiers.length;
    }
    throw new Error('Unable to find target dossier.');
  }, { sessionIndex: targetIndex, marker: `stress-note-${session.user.username}-${Date.now()}` });
  return {
    type: 'modify',
    ...result
  };
}

async function selectAudienceRows(session, limit) {
  await session.page.evaluate((rowLimit) => {
    const rows = getAudienceRows({ ignoreSearch: true, ignoreColor: true }).slice(0, rowLimit);
    rows.forEach((row) => toggleAudiencePrintSelection(row.ci, row.di, row.procKey, true));
  }, limit);
}

async function selectSuiviRows(session, limit) {
  await session.page.evaluate((rowLimit) => {
    const rows = getAllSuiviRows().slice(0, rowLimit);
    rows.forEach((row) => toggleSuiviPrintSelection(row.c?.id, row.index, true));
  }, limit);
}

async function selectDiligenceRows(session, limit) {
  await session.page.evaluate((rowLimit) => {
    const rows = getDiligenceRows().slice(0, rowLimit);
    rows.forEach((row) => toggleDiligencePrintSelection(row.clientId, row.dossierIndex, row.procedure, true));
  }, limit);
}

async function openSection(session, section) {
  await session.page.evaluate((nextSection) => {
    if(typeof showView !== 'function'){
      throw new Error('showView is not available.');
    }
    showView(nextSection);
  }, section);
}

async function runAudienceRegularExport(session) {
  await waitForDataReady(session);
  console.log(`[${session.user.username}] audience regular export start`);
  await openSection(session, 'audience');
  await session.page.waitForSelector('#audienceSection', { state: 'visible' });
  const download = await saveDownload(session, async () => {
    await session.page.evaluate(async () => {
      await exportAudienceRegularXLS();
    });
  }, 'audience_regular');
  console.log(`[${session.user.username}] audience regular export done`);
  return { type: 'export', exportKind: 'audience_regular', ...download };
}

async function runAudienceSelectedExport(session) {
  await waitForDataReady(session);
  console.log(`[${session.user.username}] audience selected export start`);
  await openSection(session, 'audience');
  await session.page.waitForSelector('#audienceSection', { state: 'visible' });
  await selectAudienceRows(session, SELECTED_EXPORT_ROWS);
  const download = await saveDownload(session, async () => {
    await session.page.evaluate(async () => {
      await exportAudienceXLS();
    });
  }, 'audience_selected');
  console.log(`[${session.user.username}] audience selected export done`);
  return { type: 'export', exportKind: 'audience_selected', selectedRows: SELECTED_EXPORT_ROWS, ...download };
}

async function runSuiviExport(session) {
  await waitForDataReady(session);
  console.log(`[${session.user.username}] suivi export start`);
  await openSection(session, 'suivi');
  await session.page.waitForSelector('#suiviSection', { state: 'visible' });
  await selectSuiviRows(session, SELECTED_EXPORT_ROWS);
  const download = await saveDownload(session, async () => {
    await session.page.evaluate(async () => {
      await exportSuiviSelectedXLS();
    });
  }, 'suivi_selected');
  console.log(`[${session.user.username}] suivi export done`);
  return { type: 'export', exportKind: 'suivi_selected', selectedRows: SELECTED_EXPORT_ROWS, ...download };
}

async function runDiligenceExport(session) {
  await waitForDataReady(session);
  console.log(`[${session.user.username}] diligence export start`);
  await openSection(session, 'diligence');
  await session.page.waitForSelector('#diligenceSection', { state: 'visible' });
  await selectDiligenceRows(session, SELECTED_EXPORT_ROWS);
  const download = await saveDownload(session, async () => {
    await session.page.evaluate(() => {
      exportDiligenceXLS();
    });
  }, 'diligence_selected');
  console.log(`[${session.user.username}] diligence export done`);
  return { type: 'export', exportKind: 'diligence_selected', selectedRows: SELECTED_EXPORT_ROWS, ...download };
}

async function runAction(session, action) {
  const startedAt = Date.now();
  try {
    let details;
    if (action.kind === 'import') {
      details = await runImportAction(session, action.fixturePath, action.label);
    } else if (action.kind === 'modify') {
      details = await runModifyAction(session, action.targetIndex);
    } else if (action.kind === 'audience-regular-export') {
      details = await runAudienceRegularExport(session);
    } else if (action.kind === 'audience-selected-export') {
      details = await runAudienceSelectedExport(session);
    } else if (action.kind === 'suivi-export') {
      details = await runSuiviExport(session);
    } else if (action.kind === 'diligence-export') {
      details = await runDiligenceExport(session);
    } else {
      throw new Error(`Unsupported action: ${action.kind}`);
    }
    return {
      ok: true,
      user: session.user.username,
      role: session.user.role,
      action: action.kind,
      durationMs: Date.now() - startedAt,
      details,
      dialogs: session.dialogs,
      consoleErrors: session.consoleErrors
    };
  } catch (error) {
    return {
      ok: false,
      user: session.user.username,
      role: session.user.role,
      action: action.kind,
      durationMs: Date.now() - startedAt,
      error: String(error?.message || error),
      dialogs: session.dialogs,
      consoleErrors: session.consoleErrors
    };
  }
}

function buildActionPlan(fixturePath) {
  const actions = [];
  if (USER_COUNT >= 1) actions.push({ kind: 'import', fixturePath, label: 'primary' });
  if (USER_COUNT >= 2) actions.push({ kind: 'import', fixturePath, label: 'secondary' });

  const actionFactories = [
    { usesModifyIndex: true, build: (index) => ({ kind: 'modify', targetIndex: index }) },
    { usesModifyIndex: false, build: () => ({ kind: 'audience-regular-export' }) },
    { usesModifyIndex: false, build: () => ({ kind: 'audience-selected-export' }) },
    { usesModifyIndex: false, build: () => ({ kind: 'suivi-export' }) },
    { usesModifyIndex: false, build: () => ({ kind: 'diligence-export' }) },
    { usesModifyIndex: true, build: (index) => ({ kind: 'modify', targetIndex: index }) },
    { usesModifyIndex: false, build: () => ({ kind: 'suivi-export' }) },
    { usesModifyIndex: false, build: () => ({ kind: 'diligence-export' }) },
    { usesModifyIndex: false, build: () => ({ kind: 'audience-selected-export' }) },
    { usesModifyIndex: false, build: () => ({ kind: 'audience-regular-export' }) }
  ];

  let modifyIndex = 0;
  while (actions.length < USER_COUNT) {
    const factory = actionFactories[(actions.length - Math.min(USER_COUNT, 2)) % actionFactories.length];
    actions.push(factory.build(modifyIndex));
    if (factory.usesModifyIndex) {
      modifyIndex += 1;
    }
  }

  if (actions.length !== USER_COUNT) {
    throw new Error(`Action plan size ${actions.length} does not match USER_COUNT ${USER_COUNT}.`);
  }
  return actions;
}

function summarizeResults(results) {
  const summary = {};
  results.forEach((result) => {
    const key = result.action;
    if (!summary[key]) {
      summary[key] = { total: 0, ok: 0, failed: 0 };
    }
    summary[key].total += 1;
    if (result.ok) summary[key].ok += 1;
    else summary[key].failed += 1;
  });
  return summary;
}

async function main() {
  const users = buildUsers();
  await prepareRunWorkspace();
  await writeInitialState(users);
  const { fixturePath } = await writeFixtureFiles(users);

  const server = spawn('node', ['index.js'], {
    cwd: SERVER_ROOT,
    env: {
      ...process.env,
      HOST,
      PORT: String(PORT),
      NODE_PATH: path.join(SOURCE_ROOT, 'server', 'node_modules')
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

  let browser;
  const sessions = [];
  try {
    await waitForServer();
    console.log(`server ready on ${BASE_URL}`);
    browser = await chromium.launch({ headless: true });
    for (let i = 0; i < users.length; i += 1) {
      sessions.push(await openSession(browser, users[i], i));
    }
    console.log(`opened ${sessions.length} sessions`);

    const actionPlan = buildActionPlan(fixturePath);
    console.log('starting concurrent actions');
    const results = await Promise.all(sessions.map((session, index) => runAction(session, actionPlan[index])));
    const finalState = await readFinalState();
    const finalSummary = stateSummary(finalState);

    console.log(JSON.stringify({
      baseUrl: BASE_URL,
      runRoot: RUN_ROOT,
      input: {
        clients: CLIENT_COUNT,
        dossiers: DOSSIER_COUNT,
        audiences: AUDIENCE_COUNT,
        users: USER_COUNT,
        selectedExportRows: SELECTED_EXPORT_ROWS
      },
      fixturePath,
      results,
      summary: summarizeResults(results),
      finalState: {
        ...finalSummary,
        users: Array.isArray(finalState?.users) ? finalState.users.length : 0,
        version: Number(finalState?.version) || 0
      },
      failedActions: results.filter((result) => !result.ok),
      serverStdout: serverStdout.trim(),
      serverStderr: serverStderr.trim()
    }, null, 2));
  } finally {
    await Promise.all(sessions.map(async (session) => {
      await session.context.close().catch(() => {});
    }));
    if (browser) await browser.close().catch(() => {});
    server.kill('SIGINT');
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
