const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { pbkdf2Sync, randomBytes } = require('crypto');
const { chromium } = require('playwright');
const { buildPayload } = require('./benchmark_large_state');

function readCountArg(flag, fallback, options = {}) {
  const arg = process.argv.find((value) => value.startsWith(`${flag}=`));
  const rawValue = arg ? arg.slice(flag.length + 1) : process.env[flag.replace(/^--/, '').toUpperCase()];
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  if (options.allowZero === true && parsed === 0) return 0;
  return parsed > 0 ? Math.floor(parsed) : fallback;
}

const SOURCE_ROOT = path.join(__dirname, '..');
const CLIENT_COUNT = readCountArg('--clients', 600);
const DOSSIER_COUNT = readCountArg('--dossiers', 40000);
const AUDIENCE_COUNT = readCountArg('--audiences', 75000, { allowZero: true });
const TOTAL_USER_COUNT = readCountArg('--users', 20);
const VIEWER_COUNT = readCountArg('--client-users', 7, { allowZero: true });
const ADMIN_COUNT = readCountArg('--admins', 10, { allowZero: true });
const MANAGER_COUNT = readCountArg('--managers', Math.max(1, TOTAL_USER_COUNT - VIEWER_COUNT - ADMIN_COUNT), { allowZero: true });
const DURATION_MINUTES = readCountArg('--minutes', 20);
const PORT = readCountArg('--port', 3600);
const HOST = process.env.HOST || '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;
const DURATION_MS = DURATION_MINUTES * 60 * 1000;
const MONITOR_INTERVAL_MS = readCountArg('--monitor-interval-ms', 15000);
const ACTION_INTERVAL_MS = readCountArg('--action-interval-ms', 60000);
const ACTION_TIMEOUT_MS = readCountArg('--action-timeout-ms', 45000);
const SESSION_BOOT_TIMEOUT_MS = readCountArg('--session-boot-timeout-ms', 180000);
const SESSION_BATCH_SIZE = readCountArg('--session-batch-size', 4);
const SESSION_BATCH_PAUSE_MS = readCountArg('--session-batch-pause-ms', 1200);
const PAGE_EVAL_TIMEOUT_MS = readCountArg('--page-eval-timeout-ms', 10000);
const FREEZE_THRESHOLD_MS = readCountArg('--freeze-threshold-ms', 8000);
const LONG_GAP_THRESHOLD_MS = readCountArg('--long-gap-threshold-ms', 2500);
const WATCHDOG_WARMUP_MS = readCountArg('--watchdog-warmup-ms', 20000);
const TARGET_CLIENT_ID = readCountArg('--target-client-id', 1);
const DATA_READY_TIMEOUT_MS = readCountArg('--data-ready-timeout-ms', 900000);
const DOWNLOAD_TIMEOUT_MS = readCountArg('--download-timeout-ms', 900000);
const EXPORT_SELECTION_ROWS = readCountArg('--export-selection-rows', 250);
const IMPORT_EVERY_CYCLES = readCountArg('--import-every-cycles', 2);
const IMPORTERS_PER_CYCLE = readCountArg('--importers-per-cycle', 1, { allowZero: true });
const MODIFIERS_PER_CYCLE = readCountArg('--modifiers-per-cycle', 2, { allowZero: true });
const EXPORTERS_PER_CYCLE = readCountArg('--exporters-per-cycle', 4, { allowZero: true });
const BROWSERS_PER_CYCLE = readCountArg('--browsers-per-cycle', 6, { allowZero: true });
const MAX_EVENT_SAMPLES = 250;
const ROUTE_SELECTOR = {
  dashboard: '#dashboardSection',
  clients: '#clientSection',
  creation: '#creationSection',
  suivi: '#suiviSection',
  audience: '#audienceSection',
  diligence: '#diligenceSection',
  salle: '#salleSection',
  equipe: '#equipeSection',
  recycle: '#recycleSection'
};
const ROUTE_PLANS = {
  manager: ['dashboard', 'clients', 'suivi', 'audience', 'diligence', 'salle', 'equipe', 'creation', 'recycle'],
  admin: ['dashboard', 'clients', 'suivi', 'audience', 'diligence', 'salle', 'creation'],
  client: ['dashboard', 'suivi', 'audience', 'diligence', 'salle']
};

if ((VIEWER_COUNT + ADMIN_COUNT + MANAGER_COUNT) !== TOTAL_USER_COUNT) {
  throw new Error(
    `Role total mismatch: client-users(${VIEWER_COUNT}) + admins(${ADMIN_COUNT}) + managers(${MANAGER_COUNT}) must equal users(${TOTAL_USER_COUNT}).`
  );
}

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeRoleLabel(role, username) {
  if (role === 'manager' && username !== 'walid') return 'manager';
  return role;
}

function makeRoutePlan(role, index) {
  const routes = ROUTE_PLANS[role] || ROUTE_PLANS.manager;
  return routes[index % routes.length] || 'dashboard';
}

function buildUsers() {
  const users = [];
  for (let i = 1; i <= MANAGER_COUNT; i += 1) {
    users.push({
      id: i,
      username: i === 1 ? 'walid' : `manager${i}`,
      password: '1234',
      role: 'manager',
      clientIds: []
    });
  }
  for (let i = 1; i <= ADMIN_COUNT; i += 1) {
    users.push({
      id: MANAGER_COUNT + i,
      username: `admin${i}`,
      password: '1234',
      role: 'admin',
      clientIds: []
    });
  }
  for (let i = 1; i <= VIEWER_COUNT; i += 1) {
    users.push({
      id: MANAGER_COUNT + ADMIN_COUNT + i,
      username: `client${i}`,
      password: '1234',
      role: 'client',
      clientIds: [i]
    });
  }
  return users;
}

function hashPassword(password) {
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = pbkdf2Sync(String(password || ''), Buffer.from(passwordSalt, 'hex'), 120000, 32, 'sha256').toString('hex');
  return { passwordHash, passwordSalt };
}

function buildPersistedUsers(users) {
  return users.map((user) => {
    const secure = hashPassword(user.password);
    return {
      id: user.id,
      username: user.username,
      password: '',
      passwordHash: secure.passwordHash,
      passwordSalt: secure.passwordSalt,
      passwordVersion: 1,
      passwordUpdatedAt: nowIso(),
      requirePasswordChange: false,
      role: user.role,
      clientIds: Array.isArray(user.clientIds) ? user.clientIds.slice() : []
    };
  });
}

function keepLast(items, nextItem) {
  items.push(nextItem);
  if (items.length > MAX_EVENT_SAMPLES) items.splice(0, items.length - MAX_EVENT_SAMPLES);
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function summarizePropagation(delays) {
  const valid = delays.filter((value) => Number.isFinite(value));
  return {
    count: valid.length,
    maxMs: valid.length ? Math.max(...valid) : null,
    p95Ms: valid.length ? percentile(valid, 95) : null,
    avgMs: valid.length ? Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1)) : null
  };
}

function buildStressDossier(referenceClient, cycleIndex) {
  return {
    debiteur: `Stress Debiteur ${cycleIndex}`,
    boiteNo: `BOX-${cycleIndex}`,
    referenceClient,
    dateAffectation: '16/03/2026',
    procedure: 'Restitution',
    procedureList: ['Restitution'],
    procedureDetails: {
      Restitution: {
        referenceClient,
        audience: '17/03/2026',
        juge: `Juge ${cycleIndex % 12}`,
        sort: 'Renvoi',
        tribunal: 'Casablanca',
        depotLe: '16/03/2026',
        dateDepot: '16/03/2026',
        instruction: `Instruction ${cycleIndex}`,
        color: 'blue'
      }
    },
    ville: 'Casablanca',
    adresse: 'Adresse endurance',
    montant: String(10000 + cycleIndex),
    ww: `WW-${cycleIndex}`,
    marque: 'Dacia',
    type: 'Auto',
    caution: '',
    cautionAdresse: '',
    cautionVille: '',
    cautionCin: '',
    cautionRc: '',
    note: `endurance-created-${cycleIndex}`,
    avancement: 'Créé en endurance',
    statut: 'En cours',
    files: [],
    history: [],
    montantByProcedure: []
  };
}

async function copyProjectSubset(runRoot) {
  await fs.mkdir(runRoot, { recursive: true });
  for (const entry of [
    'app.js',
    'index.html',
    'style.css',
    'state-persistence.js',
    'render-dashboard.js',
    'render-audience-suivi.js',
    'render-diligence.js',
    'audience-ui-helpers.js',
    'vendor',
    'workers',
    'server'
  ]) {
    await fs.cp(path.join(SOURCE_ROOT, entry), path.join(runRoot, entry), { recursive: true });
  }
}

async function writeFixtureState(runRoot, users) {
  const payload = buildPayload({
    clients: CLIENT_COUNT,
    dossiers: DOSSIER_COUNT,
    audiences: AUDIENCE_COUNT
  });
  payload.users = buildPersistedUsers(users);
  payload.updatedAt = nowIso();
  payload.version = 0;
  const statePath = path.join(runRoot, 'server', 'data', 'state.json');
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(payload), 'utf8');
  const fixturePath = path.join(
    runRoot,
    `fixture_${CLIENT_COUNT}c_${DOSSIER_COUNT}d_${AUDIENCE_COUNT}a.appsavocat`
  );
  await fs.writeFile(fixturePath, JSON.stringify(payload), 'utf8');
  return { statePath, fixturePath };
}

async function waitForServer(timeoutMs = 30000) {
  const startedAt = Date.now();
  for (;;) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {}
    if ((Date.now() - startedAt) > timeoutMs) {
      throw new Error('Server did not become ready in time.');
    }
    await sleep(250);
  }
}

async function withTimeout(promise, timeoutMs, label) {
  let timeoutId = null;
  return await Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

class ErrorSentinel {
  constructor() {
    this.events = [];
    this.health = [];
    this.pageSnapshots = [];
    this.serverStdout = [];
    this.serverStderr = [];
    this.cycleSummaries = [];
  }

  record(type, payload = {}) {
    keepLast(this.events, {
      at: nowIso(),
      type,
      ...payload
    });
  }

  recordHealth(entry) {
    keepLast(this.health, entry);
  }

  recordSnapshot(entry) {
    keepLast(this.pageSnapshots, entry);
  }

  recordCycle(summary) {
    this.cycleSummaries.push(summary);
  }

  attachServer(server) {
    server.stdout.on('data', (chunk) => {
      keepLast(this.serverStdout, {
        at: nowIso(),
        line: String(chunk || '').trim()
      });
    });
    server.stderr.on('data', (chunk) => {
      const line = String(chunk || '').trim();
      keepLast(this.serverStderr, {
        at: nowIso(),
        line
      });
      if (line) this.record('server-stderr', { line });
    });
  }

  attachSession(session) {
    session.page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      this.record('console-error', {
        user: session.user.username,
        role: session.user.role,
        text: msg.text()
      });
    });
    session.page.on('pageerror', (error) => {
      this.record('page-error', {
        user: session.user.username,
        role: session.user.role,
        text: String(error?.message || error)
      });
    });
    session.page.on('requestfailed', (request) => {
      this.record('request-failed', {
        user: session.user.username,
        role: session.user.role,
        url: request.url(),
        method: request.method(),
        errorText: request.failure()?.errorText || ''
      });
    });
  }

  async pollSessions(sessions) {
    for (const session of sessions) {
      const startedAt = Date.now();
      try {
        const snapshot = await withTimeout(
          session.page.evaluate(() => {
            if (!window.__enduranceWatchdog || typeof window.__enduranceWatchdog.snapshot !== 'function') {
              return null;
            }
            return window.__enduranceWatchdog.snapshot();
          }),
          PAGE_EVAL_TIMEOUT_MS,
          `watchdog poll for ${session.user.username}`
        );
        const latencyMs = Date.now() - startedAt;
        const entry = {
          at: nowIso(),
          user: session.user.username,
          role: session.user.role,
          route: session.route,
          latencyMs,
          snapshot
        };
        this.recordSnapshot(entry);
        if (!snapshot) {
          this.record('watchdog-missing', {
            user: session.user.username,
            role: session.user.role,
            route: session.route
          });
          continue;
        }
        if (latencyMs > PAGE_EVAL_TIMEOUT_MS) {
          this.record('page-eval-slow', {
            user: session.user.username,
            role: session.user.role,
            route: session.route,
            latencyMs
          });
        }
        const isWarmedUp = (Date.now() - Number(snapshot.installedAt || 0)) >= WATCHDOG_WARMUP_MS;
        if (isWarmedUp && !snapshot.isHidden && (Number(snapshot.intervalMaxGapMs) > FREEZE_THRESHOLD_MS || Number(snapshot.rafMaxGapMs) > FREEZE_THRESHOLD_MS)) {
          this.record('ui-freeze-suspected', {
            user: session.user.username,
            role: session.user.role,
            route: session.route,
            intervalMaxGapMs: snapshot.intervalMaxGapMs,
            rafMaxGapMs: snapshot.rafMaxGapMs
          });
        } else if (isWarmedUp && !snapshot.isHidden && (Number(snapshot.intervalMaxGapMs) > LONG_GAP_THRESHOLD_MS || Number(snapshot.rafMaxGapMs) > LONG_GAP_THRESHOLD_MS)) {
          this.record('ui-gap-warning', {
            user: session.user.username,
            role: session.user.role,
            route: session.route,
            intervalMaxGapMs: snapshot.intervalMaxGapMs,
            rafMaxGapMs: snapshot.rafMaxGapMs
          });
        }
      } catch (error) {
        this.record('watchdog-poll-failed', {
          user: session.user.username,
          role: session.user.role,
          route: session.route,
          error: String(error?.message || error)
        });
      }
    }

    const healthStartedAt = Date.now();
    try {
      const response = await withTimeout(fetch(`${BASE_URL}/api/health`), PAGE_EVAL_TIMEOUT_MS, 'server health');
      this.recordHealth({
        at: nowIso(),
        ok: response.ok,
        status: response.status,
        latencyMs: Date.now() - healthStartedAt
      });
      if (!response.ok) {
        this.record('health-check-failed', {
          status: response.status
        });
      }
    } catch (error) {
      this.record('health-check-error', {
        error: String(error?.message || error)
      });
    }
  }

  buildSummary() {
    const freezeEvents = this.events.filter((item) => item.type === 'ui-freeze-suspected');
    const pageErrors = this.events.filter((item) => item.type === 'page-error' || item.type === 'console-error');
    const requestFailures = this.events.filter((item) => item.type === 'request-failed');
    const healthLatencies = this.health.map((item) => Number(item.latencyMs)).filter(Number.isFinite);
    return {
      totalEvents: this.events.length,
      freezeEventCount: freezeEvents.length,
      pageErrorCount: pageErrors.length,
      requestFailureCount: requestFailures.length,
      healthChecks: this.health.length,
      maxHealthLatencyMs: healthLatencies.length ? Math.max(...healthLatencies) : null,
      p95HealthLatencyMs: healthLatencies.length ? percentile(healthLatencies, 95) : null
    };
  }
}

function assessStability(sentinelSummary, cycles) {
  const cycleErrors = cycles.filter((cycle) => Array.isArray(cycle.createFailures) && cycle.createFailures.length)
    .length
    + cycles.filter((cycle) => Array.isArray(cycle.updateFailures) && cycle.updateFailures.length).length
    + cycles.filter((cycle) => Array.isArray(cycle.leakageFailures) && cycle.leakageFailures.length).length;
  const loadActionFailures = cycles.reduce((sum, cycle) => (
    sum + (Array.isArray(cycle?.loadBurst?.failures) ? cycle.loadBurst.failures.length : 0)
  ), 0);

  const reasons = [];
  if (sentinelSummary.freezeEventCount > 0) reasons.push(`${sentinelSummary.freezeEventCount} suspected UI freeze event(s)`);
  if (sentinelSummary.pageErrorCount > 0) reasons.push(`${sentinelSummary.pageErrorCount} page/console error(s)`);
  if (sentinelSummary.requestFailureCount > 0) reasons.push(`${sentinelSummary.requestFailureCount} failed request(s)`);
  if (loadActionFailures > 0) reasons.push(`${loadActionFailures} failed concurrent load action(s)`);
  if (cycleErrors > 0) reasons.push(`${cycleErrors} cycle verification issue(s)`);
  if (Number.isFinite(sentinelSummary.maxHealthLatencyMs) && sentinelSummary.maxHealthLatencyMs > 5000) {
    reasons.push(`max health latency reached ${sentinelSummary.maxHealthLatencyMs}ms`);
  }

  let status = 'stable';
  if (reasons.length > 0) status = 'warning';
  if (
    sentinelSummary.freezeEventCount > 0
    || sentinelSummary.pageErrorCount > 0
    || sentinelSummary.requestFailureCount > 0
    || loadActionFailures > 0
    || cycleErrors > 0
  ) {
    status = 'unstable';
  }

  return {
    status,
    reasons,
    loadActionFailures,
    cycleIssues: cycleErrors
  };
}

async function installWatchdog(page) {
  await page.evaluate(({ freezeThresholdMs }) => {
    if (window.__enduranceWatchdog && typeof window.__enduranceWatchdog.snapshot === 'function') return;
    const state = {
      installedAt: Date.now(),
      lastIntervalTickAt: performance.now(),
      lastRafTickAt: performance.now(),
      intervalMaxGapMs: 0,
      rafMaxGapMs: 0,
      freezeTickCount: 0,
      lastSyncText: '',
      lastVisibleSectionId: '',
      pollCount: 0,
      longTaskCount: 0
    };

    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          state.longTaskCount += entries.length;
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch {}
    }

    setInterval(() => {
      const now = performance.now();
      const gap = now - state.lastIntervalTickAt;
      if (gap > state.intervalMaxGapMs) state.intervalMaxGapMs = gap;
      if (gap > freezeThresholdMs) state.freezeTickCount += 1;
      state.lastIntervalTickAt = now;
      state.lastSyncText = String(document.querySelector('#syncStatusText')?.textContent || '').trim();
      const visible = Array.from(document.querySelectorAll('.section')).find((node) => node.style.display !== 'none');
      state.lastVisibleSectionId = visible ? visible.id : '';
    }, 1000);

    const rafLoop = () => {
      const now = performance.now();
      const gap = now - state.lastRafTickAt;
      if (gap > state.rafMaxGapMs) state.rafMaxGapMs = gap;
      state.lastRafTickAt = now;
      window.requestAnimationFrame(rafLoop);
    };
    window.requestAnimationFrame(rafLoop);

    window.__enduranceWatchdog = {
      snapshot() {
        state.pollCount += 1;
        const payload = {
          installedAt: state.installedAt,
          intervalMaxGapMs: Number(state.intervalMaxGapMs.toFixed(1)),
          rafMaxGapMs: Number(state.rafMaxGapMs.toFixed(1)),
          freezeTickCount: state.freezeTickCount,
          pollCount: state.pollCount,
          longTaskCount: state.longTaskCount,
          syncText: state.lastSyncText,
          visibleSectionId: state.lastVisibleSectionId,
          visibleClients: typeof getVisibleClients === 'function' ? getVisibleClients().length : null,
          isHidden: typeof document !== 'undefined' ? document.hidden === true : false
        };
        state.intervalMaxGapMs = 0;
        state.rafMaxGapMs = 0;
        state.freezeTickCount = 0;
        return payload;
      }
    };
  }, { freezeThresholdMs: FREEZE_THRESHOLD_MS });
}

async function showRoute(page, route) {
  if (!route || route === 'dashboard') return;
  const selector = ROUTE_SELECTOR[route] || ROUTE_SELECTOR.dashboard;
  const linkSelector = `#${route}Link`;
  const link = page.locator(linkSelector);
  if (await link.count()) {
    const visible = await link.isVisible().catch(() => false);
    if (visible) {
      await link.click();
    } else {
      await page.evaluate((targetRoute) => {
        if (typeof showView === 'function') showView(targetRoute);
      }, route);
    }
  } else {
    await page.evaluate((targetRoute) => {
      if (typeof showView === 'function') showView(targetRoute);
    }, route);
  }
  await page.waitForSelector(selector, { state: 'visible', timeout: SESSION_BOOT_TIMEOUT_MS });
}

async function waitForDataReady(session) {
  const startedAt = Date.now();
  let counts = { clients: 0, dossiers: 0 };
  for (;;) {
    counts = await session.page.evaluate(async () => {
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
    await sleep(1000);
  }
}

async function saveDownload(session, trigger, label) {
  const downloadPromise = session.page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT_MS });
  await trigger();
  const download = await downloadPromise;
  const filename = `${session.user.username}_${label}_${download.suggestedFilename()}`;
  const targetPath = path.join(session.downloadRoot, filename);
  await download.saveAs(targetPath);
  const stat = await fs.stat(targetPath);
  return {
    file: targetPath,
    bytes: stat.size
  };
}

async function runImportAction(session, fixturePath, label) {
  await session.page.setInputFiles('#importAppsavocatInput', fixturePath);
  await session.page.waitForFunction(() => {
    try {
      return importInProgress === true || (Array.isArray(AppState?.clients) && AppState.clients.length > 0);
    } catch {
      return false;
    }
  }, { timeout: 120000 });
  await waitForDataReady(session);
  await session.page.evaluate(async () => {
    if (typeof persistAppStateNow === 'function') {
      await persistAppStateNow();
    }
  });
  return {
    type: 'import',
    label
  };
}

async function runModifyExistingDossierAction(session, targetIndex, cycleIndex) {
  await waitForDataReady(session);
  return await session.page.evaluate(async ({ globalTargetIndex, cycle }) => {
    const clients = Array.isArray(AppState?.clients) ? AppState.clients : [];
    let cursor = Number(globalTargetIndex) || 0;
    for (const client of clients) {
      const dossiers = Array.isArray(client?.dossiers) ? client.dossiers : [];
      if (cursor < dossiers.length) {
        const dossierIndex = cursor;
        const current = dossiers[dossierIndex];
        const next = {
          ...current,
          note: `watchdog-modify-${cycle}-${Date.now()}`,
          avancement: `watchdog-modify-${cycle}`
        };
        dossiers[dossierIndex] = next;
        await persistAppStateNow();
        return {
          type: 'modify',
          clientId: Number(client.id),
          dossierIndex,
          referenceClient: String(next.referenceClient || '')
        };
      }
      cursor -= dossiers.length;
    }
    throw new Error(`Unable to find dossier for index ${globalTargetIndex}`);
  }, { globalTargetIndex: targetIndex, cycle: cycleIndex });
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

async function runAudienceRegularExport(session) {
  await waitForDataReady(session);
  await showRoute(session.page, 'audience');
  const download = await saveDownload(session, async () => {
    await session.page.evaluate(async () => {
      await exportAudienceRegularXLS();
    });
  }, 'audience_regular');
  return { type: 'export', exportKind: 'audience_regular', ...download };
}

async function runAudienceSelectedExport(session) {
  await waitForDataReady(session);
  await showRoute(session.page, 'audience');
  await selectAudienceRows(session, EXPORT_SELECTION_ROWS);
  const download = await saveDownload(session, async () => {
    await session.page.evaluate(async () => {
      await exportAudienceXLS();
    });
  }, 'audience_selected');
  return { type: 'export', exportKind: 'audience_selected', selectedRows: EXPORT_SELECTION_ROWS, ...download };
}

async function runSuiviExport(session) {
  await waitForDataReady(session);
  await showRoute(session.page, 'suivi');
  await selectSuiviRows(session, EXPORT_SELECTION_ROWS);
  const download = await saveDownload(session, async () => {
    await session.page.evaluate(async () => {
      await exportSuiviSelectedXLS();
    });
  }, 'suivi_selected');
  return { type: 'export', exportKind: 'suivi_selected', selectedRows: EXPORT_SELECTION_ROWS, ...download };
}

async function runDiligenceExport(session) {
  await waitForDataReady(session);
  await showRoute(session.page, 'diligence');
  await selectDiligenceRows(session, EXPORT_SELECTION_ROWS);
  const download = await saveDownload(session, async () => {
    await session.page.evaluate(() => {
      exportDiligenceXLS();
    });
  }, 'diligence_selected');
  return { type: 'export', exportKind: 'diligence_selected', selectedRows: EXPORT_SELECTION_ROWS, ...download };
}

async function runBrowseAction(session, label) {
  await waitForDataReady(session);
  const routes = ['dashboard', 'audience', 'suivi', 'diligence'];
  const visited = [];
  for (const route of routes) {
    await showRoute(session.page, route);
    visited.push(route);
    if (route === 'audience') {
      await session.page.fill('#filterAudience', 'Client');
      await session.page.waitForTimeout(150);
      await session.page.fill('#filterAudience', '');
    } else if (route === 'suivi') {
      await session.page.fill('#filterGlobal', 'REF');
      await session.page.waitForTimeout(150);
      await session.page.fill('#filterGlobal', '');
    } else if (route === 'diligence') {
      await session.page.fill('#diligenceSearchInput', 'att');
      await session.page.waitForTimeout(150);
      await session.page.fill('#diligenceSearchInput', '');
    }
  }
  return {
    type: 'browse',
    label,
    visited
  };
}

async function runConcurrentAction(session, action) {
  const startedAt = Date.now();
  try {
    let details;
    if (action.kind === 'import') {
      details = await runImportAction(session, action.fixturePath, action.label);
    } else if (action.kind === 'modify') {
      details = await runModifyExistingDossierAction(session, action.targetIndex, action.cycleIndex);
    } else if (action.kind === 'audience-regular-export') {
      details = await runAudienceRegularExport(session);
    } else if (action.kind === 'audience-selected-export') {
      details = await runAudienceSelectedExport(session);
    } else if (action.kind === 'suivi-export') {
      details = await runSuiviExport(session);
    } else if (action.kind === 'diligence-export') {
      details = await runDiligenceExport(session);
    } else if (action.kind === 'browse') {
      details = await runBrowseAction(session, action.label || `cycle-${action.cycleIndex}`);
    } else {
      throw new Error(`Unsupported concurrent action: ${action.kind}`);
    }
    return {
      ok: true,
      user: session.user.username,
      role: session.user.role,
      action: action.kind,
      durationMs: Date.now() - startedAt,
      details
    };
  } catch (error) {
    return {
      ok: false,
      user: session.user.username,
      role: session.user.role,
      action: action.kind,
      durationMs: Date.now() - startedAt,
      error: String(error?.message || error)
    };
  }
}

function summarizeConcurrentResults(results) {
  const summary = {};
  for (const result of results) {
    const key = result.action;
    if (!summary[key]) {
      summary[key] = { total: 0, ok: 0, failed: 0, maxDurationMs: 0 };
    }
    summary[key].total += 1;
    if (result.ok) summary[key].ok += 1;
    else summary[key].failed += 1;
    summary[key].maxDurationMs = Math.max(summary[key].maxDurationMs, Number(result.durationMs) || 0);
  }
  return summary;
}

async function openSession(browser, user, route, sentinel, downloadRoot) {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(SESSION_BOOT_TIMEOUT_MS);
  const session = {
    user,
    route,
    context,
    page,
    downloadRoot
  };
  sentinel.attachSession(session);

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: SESSION_BOOT_TIMEOUT_MS });
  await page.fill('#username', user.username);
  await page.fill('#password', user.password);
  await page.evaluate(() => login());
  await page.waitForSelector('#appContent', { state: 'visible', timeout: SESSION_BOOT_TIMEOUT_MS });
  await page.waitForFunction(() => {
    try {
      return typeof getVisibleClients === 'function'
        && Array.isArray(getVisibleClients())
        && getVisibleClients().length > 0
        && typeof exportAudienceRegularXLS === 'function'
        && typeof exportAudienceXLS === 'function'
        && typeof exportSuiviSelectedXLS === 'function'
        && typeof exportDiligenceXLS === 'function'
        && typeof handleAppsavocatImportFile === 'function';
    } catch {
      return false;
    }
  }, { timeout: SESSION_BOOT_TIMEOUT_MS });
  await showRoute(page, route);
  await installWatchdog(page);
  page.setDefaultTimeout(ACTION_TIMEOUT_MS);
  return session;
}

async function openSessions(browser, users, sentinel, downloadRoot) {
  const sessions = [];
  const byRoleIndex = new Map();
  await fs.mkdir(downloadRoot, { recursive: true });

  for (let index = 0; index < users.length; index += SESSION_BATCH_SIZE) {
    const chunk = users.slice(index, index + SESSION_BATCH_SIZE);
    console.log(`Opening session batch ${Math.floor(index / SESSION_BATCH_SIZE) + 1}/${Math.ceil(users.length / SESSION_BATCH_SIZE)} (${chunk.map((user) => user.username).join(', ')})`);
    const opened = await Promise.all(chunk.map(async (user) => {
      const roleIndex = byRoleIndex.get(user.role) || 0;
      byRoleIndex.set(user.role, roleIndex + 1);
      const route = makeRoutePlan(user.role, roleIndex);
      return await openSession(browser, user, route, sentinel, downloadRoot);
    }));
    sessions.push(...opened);
    if ((index + SESSION_BATCH_SIZE) < users.length) {
      await sleep(SESSION_BATCH_PAUSE_MS);
    }
  }
  return sessions;
}

async function runMutation(session, payload) {
  return await session.page.evaluate(async (data) => {
    const targetClientId = Number(data.targetClientId);
    const client = AppState.clients.find((item) => Number(item?.id) === targetClientId);
    if (!client) throw new Error(`Target client ${targetClientId} not found.`);
    if (!Array.isArray(client.dossiers)) client.dossiers = [];

    if (data.type === 'create') {
      client.dossiers.push(data.dossier);
      await persistDossierPatchNow({
        action: 'create',
        clientId: targetClientId,
        dossier: data.dossier
      }, { source: 'endurance-watchdog-create' });
      return { ok: true };
    }

    if (data.type === 'update') {
      const dossierIndex = client.dossiers.findIndex((item) => String(item?.referenceClient || '').trim() === data.referenceClient);
      if (dossierIndex === -1) throw new Error(`Dossier ${data.referenceClient} not found.`);
      const current = client.dossiers[dossierIndex];
      const next = {
        ...current,
        note: data.note,
        avancement: data.avancement,
        statut: data.statut,
        procedureDetails: {
          ...(current.procedureDetails || {}),
          Restitution: {
            ...((current.procedureDetails && current.procedureDetails.Restitution) || {}),
            sort: data.audienceSort,
            color: data.audienceColor,
            instruction: data.instruction
          }
        }
      };
      client.dossiers[dossierIndex] = next;
      await persistDossierPatchNow({
        action: 'update',
        clientId: targetClientId,
        dossierIndex,
        targetClientId,
        dossier: next
      }, { source: 'endurance-watchdog-update' });
      return { ok: true, dossierIndex };
    }

    throw new Error(`Unsupported mutation type: ${data.type}`);
  }, payload);
}

async function waitForReference(session, referenceClient, shouldExist, timeoutMs = ACTION_TIMEOUT_MS) {
  const startedAt = Date.now();
  if (shouldExist) {
    await session.page.waitForFunction((targetReference) => {
      try {
        return getVisibleClients().some((client) =>
          (Array.isArray(client?.dossiers) ? client.dossiers : []).some(
            (dossier) => String(dossier?.referenceClient || '').trim() === targetReference
          )
        );
      } catch {
        return false;
      }
    }, referenceClient, { timeout: timeoutMs });
  } else {
    await session.page.waitForTimeout(2500);
    const leaked = await session.page.evaluate((targetReference) => {
      try {
        return getVisibleClients().some((client) =>
          (Array.isArray(client?.dossiers) ? client.dossiers : []).some(
            (dossier) => String(dossier?.referenceClient || '').trim() === targetReference
          )
        );
      } catch {
        return false;
      }
    }, referenceClient);
    if (leaked) {
      throw new Error(`Unauthorized visibility for ${referenceClient}`);
    }
  }
  return Date.now() - startedAt;
}

async function waitForUpdate(session, referenceClient, note, audienceSort, timeoutMs = ACTION_TIMEOUT_MS) {
  const startedAt = Date.now();
  await session.page.waitForFunction(({ targetReference, targetNote, targetSort }) => {
    try {
      return getVisibleClients().some((client) =>
        (Array.isArray(client?.dossiers) ? client.dossiers : []).some((dossier) =>
          String(dossier?.referenceClient || '').trim() === targetReference
          && String(dossier?.note || '').trim() === targetNote
          && String(dossier?.procedureDetails?.Restitution?.sort || '').trim() === targetSort
        )
      );
    } catch {
      return false;
    }
  }, { targetReference: referenceClient, targetNote: note, targetSort: audienceSort }, { timeout: timeoutMs });
  return Date.now() - startedAt;
}

async function verifySuiviDom(session, referenceClient) {
  await showRoute(session.page, 'suivi');
  await session.page.fill('#filterGlobal', referenceClient);
  await session.page.waitForFunction((targetReference) => {
    const rows = Array.from(document.querySelectorAll('#suiviBody tr'));
    return rows.some((row) => String(row.textContent || '').includes(targetReference));
  }, referenceClient, { timeout: ACTION_TIMEOUT_MS });
  await session.page.fill('#filterGlobal', '');
}

async function verifyAudienceDom(session, referenceClient, audienceSort) {
  await showRoute(session.page, 'audience');
  await session.page.fill('#filterAudience', referenceClient);
  await session.page.waitForFunction(({ targetReference, targetSort }) => {
    const rows = Array.from(document.querySelectorAll('#audienceBody tr'));
    return rows.some((row) => {
      const values = Array.from(row.querySelectorAll('input, textarea, select'))
        .map((field) => String(field.value || '').trim());
      const text = String(row.textContent || '').trim();
      const refMatch = text.includes(targetReference) || values.some((value) => value.includes(targetReference));
      const sortMatch = text.includes(targetSort) || values.some((value) => value.includes(targetSort));
      return refMatch && sortMatch;
    });
  }, { targetReference: referenceClient, targetSort: audienceSort }, { timeout: ACTION_TIMEOUT_MS });
  await session.page.fill('#filterAudience', '');
}

async function fetchState(runRoot) {
  const statePath = path.join(runRoot, 'server', 'data', 'state.json');
  const raw = await fs.readFile(statePath, 'utf8');
  return JSON.parse(raw);
}

function selectAuthorizedSessions(sessions) {
  return sessions.filter((session) => session.user.role !== 'client' || session.user.username === 'client1');
}

function selectUnauthorizedViewerSessions(sessions) {
  return sessions.filter((session) => session.user.role === 'client' && session.user.username !== 'client1');
}

function pickObserver(sessions, role, route, fallbackRoute) {
  return sessions.find((session) => session.user.role === role && session.route === route)
    || sessions.find((session) => session.user.role === role && session.route === fallbackRoute)
    || sessions.find((session) => session.user.role === role)
    || sessions[0];
}

async function runLoadBurst(cycleIndex, sessions, sentinel, fixturePath) {
  const results = [];
  const usedSessions = new Set();
  const editorSessions = sessions.filter((session) => session.user.role !== 'client');
  const viewerSessions = sessions.filter((session) => session.user.role === 'client');
  const exportKinds = [
    'audience-regular-export',
    'audience-selected-export',
    'suivi-export',
    'diligence-export'
  ];
  let modifyIndex = (cycleIndex - 1) * Math.max(1, MODIFIERS_PER_CYCLE);

  function takeNext(pool, predicate = () => true) {
    const next = pool.find((session) => !usedSessions.has(session) && predicate(session));
    if (!next) return null;
    usedSessions.add(next);
    return next;
  }

  const tasks = [];
  if (IMPORTERS_PER_CYCLE > 0 && IMPORT_EVERY_CYCLES > 0 && (cycleIndex % IMPORT_EVERY_CYCLES) === 1) {
    for (let i = 0; i < IMPORTERS_PER_CYCLE; i += 1) {
      const session = takeNext(editorSessions);
      if (!session) break;
      tasks.push(runConcurrentAction(session, {
        kind: 'import',
        fixturePath,
        label: `cycle-${cycleIndex}-import-${i + 1}`,
        cycleIndex
      }));
    }
  }

  for (let i = 0; i < MODIFIERS_PER_CYCLE; i += 1) {
    const session = takeNext(editorSessions);
    if (!session) break;
    tasks.push(runConcurrentAction(session, {
      kind: 'modify',
      targetIndex: modifyIndex,
      cycleIndex
    }));
    modifyIndex += 1;
  }

  for (let i = 0; i < EXPORTERS_PER_CYCLE; i += 1) {
    const session = takeNext(editorSessions);
    if (!session) break;
    tasks.push(runConcurrentAction(session, {
      kind: exportKinds[i % exportKinds.length],
      cycleIndex
    }));
  }

  for (let i = 0; i < BROWSERS_PER_CYCLE; i += 1) {
    const session = takeNext(viewerSessions) || takeNext(sessions);
    if (!session) break;
    tasks.push(runConcurrentAction(session, {
      kind: 'browse',
      label: `cycle-${cycleIndex}-browse-${i + 1}`,
      cycleIndex
    }));
  }

  results.push(...(await Promise.all(tasks)));
  const failed = results.filter((item) => !item.ok);
  for (const item of failed) {
    sentinel.record('load-action-failed', {
      cycle: cycleIndex,
      user: item.user,
      role: item.role,
      action: item.action,
      error: item.error
    });
  }
  return {
    cycle: cycleIndex,
    scheduledActions: results.length,
    summary: summarizeConcurrentResults(results),
    failures: failed,
    results
  };
}

async function runCycle(cycleIndex, sessions, sentinel, fixturePath) {
  const loadBurst = await runLoadBurst(cycleIndex, sessions, sentinel, fixturePath);
  const managers = sessions.filter((session) => session.user.role === 'manager');
  const admins = sessions.filter((session) => session.user.role === 'admin');
  if (!managers.length || !admins.length) {
    throw new Error('Endurance cycle requires at least one manager and one admin session.');
  }
  const mutationManager = managers[cycleIndex % Math.max(1, managers.length)];
  const mutationAdmin = admins[cycleIndex % Math.max(1, admins.length)];
  const authorizedSessions = selectAuthorizedSessions(sessions);
  const unauthorizedViewers = selectUnauthorizedViewerSessions(sessions);
  const suiviObserver = pickObserver(authorizedSessions, 'admin', 'suivi', 'dashboard');
  const audienceObserver = pickObserver(authorizedSessions, 'client', 'audience', 'suivi');
  const referenceClient = `END-${cycleIndex}-${Date.now().toString(36)}`;
  const dossier = buildStressDossier(referenceClient, cycleIndex);
  const createStartedAt = Date.now();
  const domChecks = {
    suiviCreate: null,
    audienceCreate: null,
    audienceUpdate: null
  };

  await runMutation(mutationManager, {
    type: 'create',
    targetClientId: TARGET_CLIENT_ID,
    dossier
  });

  const createPropagation = await Promise.all(authorizedSessions.map(async (session) => {
    try {
      return {
        user: session.user.username,
        role: session.user.role,
        delayMs: await waitForReference(session, referenceClient, true)
      };
    } catch (error) {
      return {
        user: session.user.username,
        role: session.user.role,
        error: String(error?.message || error)
      };
    }
  }));
  const createLeaks = await Promise.all(unauthorizedViewers.map(async (session) => {
    try {
      await waitForReference(session, referenceClient, false);
      return {
        user: session.user.username,
        role: session.user.role,
        leaked: false
      };
    } catch (error) {
      return {
        user: session.user.username,
        role: session.user.role,
        leaked: true,
        error: String(error?.message || error)
      };
    }
  }));

  try {
    await verifySuiviDom(suiviObserver, referenceClient);
    domChecks.suiviCreate = { ok: true };
  } catch (error) {
    domChecks.suiviCreate = { ok: false, error: String(error?.message || error) };
    sentinel.record('suivi-dom-check-failed', {
      cycle: cycleIndex,
      observer: suiviObserver.user.username,
      referenceClient,
      error: domChecks.suiviCreate.error
    });
  }
  try {
    await verifyAudienceDom(audienceObserver, referenceClient, 'Renvoi');
    domChecks.audienceCreate = { ok: true };
  } catch (error) {
    domChecks.audienceCreate = { ok: false, error: String(error?.message || error) };
    sentinel.record('audience-dom-create-check-failed', {
      cycle: cycleIndex,
      observer: audienceObserver.user.username,
      referenceClient,
      error: domChecks.audienceCreate.error
    });
  }

  const updatedNote = `endurance-updated-${cycleIndex}`;
  const updatedSort = cycleIndex % 2 === 0 ? 'Délibéré' : 'Jugement';
  await runMutation(mutationAdmin, {
    type: 'update',
    targetClientId: TARGET_CLIENT_ID,
    referenceClient,
    note: updatedNote,
    avancement: `Cycle ${cycleIndex} synchronisé`,
    statut: cycleIndex % 3 === 0 ? 'Clôture' : 'En cours',
    audienceSort: updatedSort,
    audienceColor: cycleIndex % 2 === 0 ? 'green' : 'yellow',
    instruction: `Instruction update ${cycleIndex}`
  });

  const updatePropagation = await Promise.all(authorizedSessions.map(async (session) => {
    try {
      return {
        user: session.user.username,
        role: session.user.role,
        delayMs: await waitForUpdate(session, referenceClient, updatedNote, updatedSort)
      };
    } catch (error) {
      return {
        user: session.user.username,
        role: session.user.role,
        error: String(error?.message || error)
      };
    }
  }));

  try {
    await verifyAudienceDom(audienceObserver, referenceClient, updatedSort);
    domChecks.audienceUpdate = { ok: true };
  } catch (error) {
    domChecks.audienceUpdate = { ok: false, error: String(error?.message || error) };
    sentinel.record('audience-dom-update-check-failed', {
      cycle: cycleIndex,
      observer: audienceObserver.user.username,
      referenceClient,
      error: domChecks.audienceUpdate.error
    });
  }

  const createDelays = createPropagation.map((item) => item.delayMs).filter(Number.isFinite);
  const updateDelays = updatePropagation.map((item) => item.delayMs).filter(Number.isFinite);
  const createFailures = createPropagation.filter((item) => item.error);
  const updateFailures = updatePropagation.filter((item) => item.error);
  const leakageFailures = createLeaks.filter((item) => item.leaked);
  const summary = {
    cycle: cycleIndex,
    loadBurst: {
      scheduledActions: loadBurst.scheduledActions,
      summary: loadBurst.summary,
      failures: loadBurst.failures
    },
    referenceClient,
    createStartedAt: new Date(createStartedAt).toISOString(),
    createBy: mutationManager.user.username,
    updateBy: mutationAdmin.user.username,
    createPropagation: summarizePropagation(createDelays),
    updatePropagation: summarizePropagation(updateDelays),
    createFailures,
    updateFailures,
    leakageFailures,
    domChecks,
    observers: {
      suivi: suiviObserver.user.username,
      audience: audienceObserver.user.username
    }
  };
  sentinel.recordCycle(summary);
  if (createFailures.length) {
    createFailures.forEach((failure) => sentinel.record('create-propagation-failure', failure));
  }
  if (updateFailures.length) {
    updateFailures.forEach((failure) => sentinel.record('update-propagation-failure', failure));
  }
  if (leakageFailures.length) {
    leakageFailures.forEach((failure) => sentinel.record('visibility-leak', failure));
  }
  return summary;
}

async function closeSessions(sessions) {
  await Promise.all(sessions.map(async (session) => {
    await session.context.close().catch(() => {});
  }));
}

async function main() {
  const runRoot = path.join(os.tmpdir(), `applicationversion1-endurance-${Date.now()}`);
  const resultsPath = path.join(runRoot, 'results.json');
  const downloadRoot = path.join(runRoot, 'downloads');
  const users = buildUsers();
  const sentinel = new ErrorSentinel();
  const runStartedAt = nowIso();

  console.log(`Preparing endurance watchdog with ${CLIENT_COUNT} clients / ${DOSSIER_COUNT} dossiers / ${AUDIENCE_COUNT} audience entries`);
  console.log(`Opening ${TOTAL_USER_COUNT} users for ${DURATION_MINUTES} minute(s) on ${BASE_URL}`);

  await copyProjectSubset(runRoot);
  const { fixturePath } = await writeFixtureState(runRoot, users);

  const server = spawn('node', ['server/index.js'], {
    cwd: runRoot,
    env: { ...process.env, HOST, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  sentinel.attachServer(server);

  let browser = null;
  let sessions = [];
  let monitorActive = true;
  let finalResultWritten = false;
  const monitorLoop = (async () => {
    while (monitorActive) {
      if (sessions.length) {
        await sentinel.pollSessions(sessions);
      }
      await sleep(MONITOR_INTERVAL_MS);
    }
  })();

  const writeFallbackResult = async (error, options = {}) => {
    const fallbackState = await fetchState(runRoot).catch(() => ({}));
    const finalTargetClient = (Array.isArray(fallbackState.clients) ? fallbackState.clients : []).find(
      (client) => Number(client?.id) === TARGET_CLIENT_ID
    ) || null;
    const sentinelSummary = sentinel.buildSummary();
    const stability = assessStability(sentinelSummary, sentinel.cycleSummaries);
    const fallbackResult = {
      startedAt: runStartedAt,
      baseUrl: BASE_URL,
      runRoot,
      partial: true,
      error: String(error?.message || error),
      phase: options.phase || 'unknown',
      config: {
        clients: CLIENT_COUNT,
        dossiers: DOSSIER_COUNT,
        audiences: AUDIENCE_COUNT,
        users: TOTAL_USER_COUNT,
        clientUsers: VIEWER_COUNT,
        admins: ADMIN_COUNT,
        managers: MANAGER_COUNT,
        minutes: DURATION_MINUTES,
        actionIntervalMs: ACTION_INTERVAL_MS,
        monitorIntervalMs: MONITOR_INTERVAL_MS,
        targetClientId: TARGET_CLIENT_ID
      },
      users: users.map((user) => ({
        username: user.username,
        role: normalizeRoleLabel(user.role, user.username),
        clientIds: user.clientIds
      })),
      cycles: sentinel.cycleSummaries,
      finalState: {
        version: fallbackState.version,
        updatedAt: fallbackState.updatedAt,
        targetClientDossierCount: Array.isArray(finalTargetClient?.dossiers) ? finalTargetClient.dossiers.length : 0
      },
      stability,
      sentinel: {
        summary: sentinelSummary,
        recentEvents: sentinel.events,
        healthSamples: sentinel.health,
        recentPageSnapshots: sentinel.pageSnapshots,
        serverStdout: sentinel.serverStdout,
        serverStderr: sentinel.serverStderr
      }
    };
    await fs.writeFile(resultsPath, JSON.stringify(fallbackResult, null, 2), 'utf8');
    finalResultWritten = true;
  };

  try {
    try {
      await waitForServer();
    } catch (error) {
      const recentServerError = sentinel.serverStderr.length
        ? sentinel.serverStderr[sentinel.serverStderr.length - 1].line
        : '';
      throw new Error(`${String(error?.message || error)}${recentServerError ? ` | server: ${recentServerError}` : ''}`);
    }
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage']
    });
    sessions = await openSessions(browser, users, sentinel, downloadRoot);
    console.log(`Opened ${sessions.length} sessions successfully.`);
    await sentinel.pollSessions(sessions);

    const startedAt = Date.now();
    let cycleIndex = 0;
    while ((Date.now() - startedAt) < DURATION_MS) {
      cycleIndex += 1;
      try {
        const cycleSummary = await runCycle(cycleIndex, sessions, sentinel, fixturePath);
        console.log(
          `[cycle ${cycleSummary.cycle}] loadFailures=${cycleSummary.loadBurst.failures.length} | create max=${cycleSummary.createPropagation.maxMs}ms | update max=${cycleSummary.updatePropagation.maxMs}ms | leaks=${cycleSummary.leakageFailures.length}`
        );
      } catch (error) {
        sentinel.record('cycle-error', {
          cycle: cycleIndex,
          error: String(error?.message || error)
        });
        console.log(`[cycle ${cycleIndex}] error: ${String(error?.message || error)}`);
      }
      const remainingMs = DURATION_MS - (Date.now() - startedAt);
      if (remainingMs <= 0) break;
      await sleep(Math.min(ACTION_INTERVAL_MS, remainingMs));
    }

    await sentinel.pollSessions(sessions);
    const finalState = await fetchState(runRoot);
    const finalTargetClient = (Array.isArray(finalState.clients) ? finalState.clients : []).find(
      (client) => Number(client?.id) === TARGET_CLIENT_ID
    ) || null;
    const lastImportCycle = sentinel.cycleSummaries.reduce((maxCycle, cycle) => {
      const imported = Number(cycle?.loadBurst?.summary?.import?.total || 0) > 0;
      return imported ? Math.max(maxCycle, Number(cycle.cycle) || 0) : maxCycle;
    }, 0);
    const retainedReferenceSet = sentinel.cycleSummaries
      .filter((cycle) => (Number(cycle.cycle) || 0) >= Math.max(1, lastImportCycle))
      .map((cycle) => cycle.referenceClient);
    const finalReferenceCheck = retainedReferenceSet.map((referenceClient) => ({
      referenceClient,
      present: !!(Array.isArray(finalTargetClient?.dossiers) ? finalTargetClient.dossiers : []).find(
        (dossier) => String(dossier?.referenceClient || '').trim() === referenceClient
      )
    }));
    const sentinelSummary = sentinel.buildSummary();
    const stability = assessStability(sentinelSummary, sentinel.cycleSummaries);
    const result = {
      startedAt: runStartedAt,
      baseUrl: BASE_URL,
      runRoot,
      config: {
        clients: CLIENT_COUNT,
        dossiers: DOSSIER_COUNT,
        audiences: AUDIENCE_COUNT,
        users: TOTAL_USER_COUNT,
        clientUsers: VIEWER_COUNT,
        admins: ADMIN_COUNT,
        managers: MANAGER_COUNT,
        minutes: DURATION_MINUTES,
        actionIntervalMs: ACTION_INTERVAL_MS,
        monitorIntervalMs: MONITOR_INTERVAL_MS,
        targetClientId: TARGET_CLIENT_ID
      },
      users: users.map((user) => ({
        username: user.username,
        role: normalizeRoleLabel(user.role, user.username),
        clientIds: user.clientIds
      })),
      cycles: sentinel.cycleSummaries,
      finalState: {
        version: finalState.version,
        updatedAt: finalState.updatedAt,
        targetClientDossierCount: Array.isArray(finalTargetClient?.dossiers) ? finalTargetClient.dossiers.length : 0,
        lastImportCycle,
        createdReferences: finalReferenceCheck
      },
      stability,
      sentinel: {
        summary: sentinelSummary,
        recentEvents: sentinel.events,
        healthSamples: sentinel.health,
        recentPageSnapshots: sentinel.pageSnapshots,
        serverStdout: sentinel.serverStdout,
        serverStderr: sentinel.serverStderr
      }
    };

    await fs.writeFile(resultsPath, JSON.stringify(result, null, 2), 'utf8');
    finalResultWritten = true;
    console.log(JSON.stringify({
      resultsPath,
      stability: result.stability,
      sentinelSummary: result.sentinel.summary,
      cycleCount: result.cycles.length,
      finalState: result.finalState
    }, null, 2));
  } catch (error) {
    sentinel.record('run-error', {
      error: String(error?.message || error)
    });
    if (!finalResultWritten) {
      await writeFallbackResult(error, { phase: 'main' }).catch(() => {});
    }
    throw error;
  } finally {
    monitorActive = false;
    await monitorLoop.catch(() => {});
    await closeSessions(sessions).catch(() => {});
    if (browser) await browser.close().catch(() => {});
    server.kill('SIGINT');
    await sleep(500);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
