#!/usr/bin/env node
/**
 * API Stress Test - Cabinet Avocat
 * 
 * Generates a massive fixture in a temporary directory and tests
 * the server's ability to handle it WITHOUT touching production data.
 * 
 * Targets:
 *   700 clients, 100,000 dossiers, 200,000 audience, 100,000 diligence
 *   50 admins, 10 managers, 40 client users
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const os = require('os');

// ─── CONFIG ────────────────────────────────────────────────────
const TARGET_CLIENTS       = 700;
const TARGET_DOSSIERS      = 100_000;
const TARGET_AUDIENCE      = 200_000;
const TARGET_DILIGENCE     = 100_000;
const TOTAL_MANAGERS       = 10;
const TOTAL_ADMINS         = 50;
const TOTAL_CLIENT_USERS   = 40;
const SERVER_PORT          = 3620;
const BASE_URL             = `http://127.0.0.1:${SERVER_PORT}`;
const CONCURRENT_REQUESTS  = 20;      // simultaneous HTTP requests
const ROOT_DIR             = path.resolve(__dirname, '..');
const SERVER_DIR           = path.join(ROOT_DIR, 'server');
const SERVER_ENTRY         = path.join(SERVER_DIR, 'index.js');

// ─── HELPERS ───────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const hrMs  = (start) => { const d = process.hrtime.bigint() - start; return Number(d / 1_000_000n); };
const pad   = (s, n) => String(s).padEnd(n);
const fmtMs = (ms) => ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`;
const MB    = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }
function logOk(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ✅ ${msg}`); }
function logWarn(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ⚠️  ${msg}`); }
function logFail(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ❌ ${msg}`); }

// ─── DATA GENERATOR ───────────────────────────────────────────
function generateFixture() {
  log('Generating massive fixture in memory...');
  const memBefore = process.memoryUsage().heapUsed;
  const started = process.hrtime.bigint();

  const procedures = ['ASS', 'ASS NB', 'Injonction', 'SFDC', 'S/bien', 'Commandement'];
  const tribunals = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Oujda', 'Meknès'];
  const villes = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Kenitra', 'Tétouan', 'Safi'];
  const sorts = ['En cours', 'Renvoi', 'att PV', 'PV OK', 'NB'];
  const ordonnances = ['att', 'ok', 'ATT ORD', 'ORD OK'];
  const juges = Array.from({length: 30}, (_, i) => `Juge ${i+1}`);
  const notifSorts = ['NB', 'att certificat non appel', '1 Att lettre du TR', '1 envoyer au TR'];

  const clients = [];
  let dossierCount = 0;
  let audienceCount = 0;
  let diligenceCount = 0;
  const dossiersPerClient = Math.ceil(TARGET_DOSSIERS / TARGET_CLIENTS);

  for (let c = 0; c < TARGET_CLIENTS; c++) {
    const clientId = c + 1;
    const clientName = `Client Bench ${String(clientId).padStart(4, '0')}`;
    const dossiers = [];
    const numDossiers = Math.min(dossiersPerClient, TARGET_DOSSIERS - dossierCount);

    for (let d = 0; d < numDossiers; d++) {
      dossierCount++;
      const refClient = `REF-${clientId}-${d+1}`;
      const debiteur = `Débiteur ${dossierCount}`;
      const ville = villes[dossierCount % villes.length];
      const procedureDetails = {};
      const montantByProcedure = {};

      // Distribute audience and diligence procedures
      const procsToAdd = [];
      if (audienceCount < TARGET_AUDIENCE) {
        const audienceProc = procedures[dossierCount % 3]; // ASS, ASS NB, Injonction
        procsToAdd.push(audienceProc);
        audienceCount++;
      }
      if (diligenceCount < TARGET_DILIGENCE) {
        const diligenceProc = procedures[3 + (dossierCount % 3)]; // SFDC, S/bien, Commandement
        procsToAdd.push(diligenceProc);
        diligenceCount++;
      }
      // If we need more audience, add extra procedures
      if (audienceCount < TARGET_AUDIENCE && procsToAdd.length < 3) {
        const extra = procedures[(dossierCount + 1) % 3];
        if (!procsToAdd.includes(extra)) {
          procsToAdd.push(extra);
          audienceCount++;
        }
      }

      for (const proc of procsToAdd) {
        const day = String((dossierCount % 28) + 1).padStart(2, '0');
        const month = String((dossierCount % 12) + 1).padStart(2, '0');
        procedureDetails[proc] = {
          referenceClient: refClient,
          audience: `2026-${month}-${day}`,
          juge: juges[dossierCount % juges.length],
          tribunal: tribunals[dossierCount % tribunals.length],
          sort: sorts[dossierCount % sorts.length],
          attOrdOrOrdOk: ordonnances[dossierCount % ordonnances.length],
          attDelegationOuDelegat: dossierCount % 3 === 0 ? 'att' : 'delegat',
          executionNo: dossierCount % 5 === 0 ? `EX-${dossierCount}` : '',
          notificationNo: dossierCount % 4 === 0 ? `N-${dossierCount}` : '',
          notificationSort: notifSorts[dossierCount % notifSorts.length],
          ville: ville,
          huissier: dossierCount % 6 === 0 ? `Huissier ${dossierCount % 20}` : '',
          certificatNonAppelStatus: dossierCount % 3 === 0 ? 'att certificat non appel' : '',
          pvPlice: dossierCount % 7 === 0 ? 'att' : '',
          lettreRec: proc.includes('NB') ? `Lettre ${dossierCount}` : '',
          curateurNo: proc.includes('NB') ? `CUR-${dossierCount}` : '',
          notifCurateur: proc.includes('NB') ? 'en cours' : '',
          sortNotif: proc.includes('NB') ? 'att' : '',
          avisCurateur: proc.includes('NB') ? 'att' : '',
          depotLe: `2025-${month}-${day}`
        };
        montantByProcedure[proc] = String(Math.floor(Math.random() * 500000) + 1000);
      }

      dossiers.push({
        referenceClient: refClient,
        debiteur,
        procedure: procsToAdd.join(', '),
        ville,
        montant: String(Math.floor(Math.random() * 1000000)),
        procedureDetails,
        montantByProcedure,
        archive: false,
        history: []
      });
    }

    clients.push({
      id: clientId,
      name: clientName,
      dossiers
    });
  }

  // Fill remaining audience if needed
  let fillIdx = 0;
  while (audienceCount < TARGET_AUDIENCE) {
    const client = clients[fillIdx % clients.length];
    const dossier = client.dossiers[fillIdx % client.dossiers.length];
    const extraProc = `Extra Audience ${fillIdx}`;
    if (!dossier.procedureDetails[extraProc]) {
      dossier.procedureDetails[extraProc] = {
        audience: '2026-06-15',
        juge: juges[fillIdx % juges.length],
        tribunal: tribunals[fillIdx % tribunals.length],
        sort: 'En cours'
      };
      dossier.procedure += `, ${extraProc}`;
      audienceCount++;
    }
    fillIdx++;
    if (fillIdx > TARGET_AUDIENCE * 2) break;
  }

  // Build users
  const users = [];
  let userId = 1;
  for (let i = 0; i < TOTAL_MANAGERS; i++) {
    users.push({
      id: userId++,
      username: i === 0 ? 'manager' : `manager${i+1}`,
      password: '1234', passwordHash: '', passwordSalt: '',
      passwordVersion: 0, requirePasswordChange: false,
      role: 'manager', clientIds: []
    });
  }
  for (let i = 0; i < TOTAL_ADMINS; i++) {
    users.push({
      id: userId++,
      username: `admin${i+1}`,
      password: '1234', passwordHash: '', passwordSalt: '',
      passwordVersion: 0, requirePasswordChange: false,
      role: 'admin', clientIds: []
    });
  }
  for (let i = 0; i < TOTAL_CLIENT_USERS; i++) {
    const assignedClients = [];
    const startClient = (i * Math.floor(TARGET_CLIENTS / TOTAL_CLIENT_USERS)) + 1;
    const endClient = Math.min(startClient + Math.floor(TARGET_CLIENTS / TOTAL_CLIENT_USERS), TARGET_CLIENTS);
    for (let c = startClient; c <= endClient; c++) assignedClients.push(c);
    users.push({
      id: userId++,
      username: `client${i+1}`,
      password: '1234', passwordHash: '', passwordSalt: '',
      passwordVersion: 0, requirePasswordChange: false,
      role: 'client', clientIds: assignedClients
    });
  }

  const state = {
    clients,
    users,
    salleAssignments: [],
    audienceDraft: {},
    recycleBin: [],
    recycleArchive: [],
    version: 1,
    updatedAt: new Date().toISOString()
  };

  const genMs = hrMs(started);
  const memAfter = process.memoryUsage().heapUsed;
  log(`Generated: ${TARGET_CLIENTS} clients, ${dossierCount} dossiers, ${audienceCount} audience, ${diligenceCount} diligence`);
  log(`Users: ${TOTAL_MANAGERS} managers, ${TOTAL_ADMINS} admins, ${TOTAL_CLIENT_USERS} clients`);
  log(`Generation time: ${fmtMs(genMs)} | Memory: ${MB(memAfter - memBefore)} used`);
  return state;
}

// ─── SERVER MANAGEMENT ─────────────────────────────────────────
async function startTestServer(tmpDir) {
  const dataDir = path.join(tmpDir, 'data');
  await fsp.mkdir(dataDir, { recursive: true });

  log('Serializing state to disk...');
  const serializeStart = process.hrtime.bigint();
  const state = generateFixture();
  const json = JSON.stringify(state);
  const jsonSizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(1);
  await fsp.writeFile(path.join(dataDir, 'state.json'), json, 'utf8');
  await fsp.writeFile(path.join(dataDir, 'state.journal'), '', 'utf8');
  log(`State file: ${jsonSizeMB} MB written in ${fmtMs(hrMs(serializeStart))}`);

  // Copy server files to temp
  const serverFiles = await fsp.readdir(SERVER_DIR);
  for (const f of serverFiles) {
    if (f === 'data' || f === 'ssl' || f === 'node_modules') continue;
    const src = path.join(SERVER_DIR, f);
    const dst = path.join(tmpDir, f);
    const stat = await fsp.stat(src);
    if (stat.isFile()) await fsp.copyFile(src, dst);
  }
  // Symlink node_modules
  const nmSrc = path.join(SERVER_DIR, 'node_modules');
  const nmDst = path.join(tmpDir, 'node_modules');
  if (fs.existsSync(nmSrc) && !fs.existsSync(nmDst)) {
    await fsp.symlink(nmSrc, nmDst, 'dir');
  }

  log(`Starting test server on port ${SERVER_PORT}...`);
  const server = spawn(process.execPath, ['index.js'], {
    cwd: tmpDir,
    env: {
      ...process.env,
      PORT: String(SERVER_PORT),
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      NODE_OPTIONS: '--max-old-space-size=4096'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverOutput = '';
  server.stdout.on('data', (d) => { serverOutput += d.toString(); });
  server.stderr.on('data', (d) => { serverOutput += d.toString(); });

  // Wait for server ready
  const healthStart = process.hrtime.bigint();
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const res = await httpGet(`${BASE_URL}/health`, 3000);
      if (res.statusCode === 200) { ready = true; break; }
    } catch {}
    await sleep(2000);
  }
  if (!ready) {
    server.kill('SIGKILL');
    console.error('Server output:', serverOutput.slice(-2000));
    throw new Error('Server failed to start within 240s');
  }
  logOk(`Server ready in ${fmtMs(hrMs(healthStart))}`);
  return { server, tmpDir };
}

// ─── HTTP HELPERS ──────────────────────────────────────────────
function httpGet(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        res.body = body;
        resolve(res);
      });
    });
    req.on('timeout', () => req.destroy(new Error(`timeout ${timeoutMs}ms`)));
    req.on('error', reject);
  });
}

function httpPost(url, data, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let resBody = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { resBody += c; });
      res.on('end', () => {
        res.body = resBody;
        resolve(res);
      });
    });
    req.on('timeout', () => req.destroy(new Error(`timeout ${timeoutMs}ms`)));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── BENCHMARK RUNNER ──────────────────────────────────────────
async function runBenchmark(token) {
  const results = [];

  async function bench(name, fn, opts = {}) {
    const { repeat = 1, timeout = 120000 } = opts;
    const timings = [];
    let failures = 0;
    let lastError = '';
    for (let i = 0; i < repeat; i++) {
      const start = process.hrtime.bigint();
      try {
        await fn();
        timings.push(hrMs(start));
      } catch (err) {
        timings.push(hrMs(start));
        failures++;
        lastError = err.message;
      }
    }
    const avg = timings.reduce((a,b) => a+b, 0) / timings.length;
    const max = Math.max(...timings);
    const min = Math.min(...timings);
    const status = failures === 0 ? '✅' : (failures < repeat ? '⚠️' : '❌');
    const result = { name, repeat, avg: Math.round(avg), min: Math.round(min), max: Math.round(max), failures, lastError };
    results.push(result);
    console.log(`  ${status} ${pad(name, 40)} avg=${pad(fmtMs(avg), 8)} min=${pad(fmtMs(min), 8)} max=${pad(fmtMs(max), 8)} (${repeat}x${failures > 0 ? `, ${failures} failures` : ''})`);
    return result;
  }

  const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

  log('── Test 1: Health check ──');
  await bench('GET /health', async () => {
    const res = await httpGet(`${BASE_URL}/health`, 5000);
    if (res.statusCode !== 200) throw new Error(`status ${res.statusCode}`);
  }, { repeat: 10 });

  log('── Test 2: Login (manager) ──');
  await bench('POST /api/auth/login (manager)', async () => {
    const res = await httpPost(`${BASE_URL}/api/auth/login`, { username: 'manager', password: '1234' });
    if (res.statusCode !== 200) throw new Error(`status ${res.statusCode}: ${res.body?.slice(0, 200)}`);
  }, { repeat: 5 });

  log('── Test 3: Login concurrent (multiple users) ──');
  await bench(`POST /api/auth/login x${CONCURRENT_REQUESTS} concurrent`, async () => {
    const promises = [];
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      const user = i < TOTAL_MANAGERS ? (i === 0 ? 'manager' : `manager${i+1}`)
        : (i < TOTAL_MANAGERS + TOTAL_ADMINS ? `admin${i - TOTAL_MANAGERS + 1}` : `client${i - TOTAL_MANAGERS - TOTAL_ADMINS + 1}`);
      promises.push(httpPost(`${BASE_URL}/api/auth/login`, { username: user, password: '1234' }, 60000));
    }
    const results = await Promise.all(promises);
    const failCount = results.filter(r => r.statusCode !== 200).length;
    if (failCount > 0) throw new Error(`${failCount}/${CONCURRENT_REQUESTS} logins failed`);
  }, { repeat: 3 });

  log('── Test 4: Full state load (/api/state) ──');
  await bench('GET /api/state (full load)', async () => {
    const res = await httpGet(`${BASE_URL}/api/state?token=${token}`, 120000);
    if (res.statusCode !== 200) throw new Error(`status ${res.statusCode}`);
    const sizeMB = (Buffer.byteLength(res.body) / 1024 / 1024).toFixed(1);
    // log(`  Response size: ${sizeMB} MB`);
  }, { repeat: 3 });

  log('── Test 5: State meta ──');
  await bench('GET /api/state/meta', async () => {
    const res = await httpGet(`${BASE_URL}/api/state/meta?token=${token}`, 30000);
    if (res.statusCode !== 200) throw new Error(`status ${res.statusCode}`);
  }, { repeat: 5 });

  log('── Test 6: Paged export (/api/state/export-page) ──');
  await bench('GET /api/state/export-page (page 1)', async () => {
    const res = await httpGet(`${BASE_URL}/api/state/export-page?token=${token}&page=0&limit=40`, 60000);
    if (res.statusCode !== 200) throw new Error(`status ${res.statusCode}`);
  }, { repeat: 3 });

  log('── Test 7: Concurrent state loads ──');
  const concurrentLoads = 10;
  await bench(`GET /api/state x${concurrentLoads} concurrent`, async () => {
    const promises = Array.from({ length: concurrentLoads }, () =>
      httpGet(`${BASE_URL}/api/state?token=${token}`, 180000)
    );
    const results = await Promise.all(promises);
    const failCount = results.filter(r => r.statusCode !== 200).length;
    if (failCount > 0) throw new Error(`${failCount}/${concurrentLoads} loads failed`);
  }, { repeat: 2 });

  log('── Test 8: Write (save single dossier) ──');
  await bench('POST /api/state/dossiers (single)', async () => {
    const res = await httpPost(`${BASE_URL}/api/state/dossiers?token=${token}`, {
      clientId: 1,
      dossier: {
        referenceClient: 'REF-1-1',
        debiteur: 'Débiteur Test Updated',
        procedure: 'ASS',
        ville: 'Casablanca',
        montant: '99999',
        procedureDetails: { ASS: { sort: 'En cours', juge: 'Juge Test' } }
      }
    }, 30000);
    if (res.statusCode !== 200) throw new Error(`status ${res.statusCode}: ${res.body?.slice(0, 200)}`);
  }, { repeat: 5 });

  log('── Test 9: Concurrent writes ──');
  await bench(`POST /api/state/dossiers x${CONCURRENT_REQUESTS} concurrent`, async () => {
    const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
      httpPost(`${BASE_URL}/api/state/dossiers?token=${token}`, {
        clientId: (i % TARGET_CLIENTS) + 1,
        dossier: {
          referenceClient: `REF-${(i % TARGET_CLIENTS) + 1}-1`,
          debiteur: `Concurrent Write ${i}`,
          procedure: 'ASS',
          ville: 'Rabat',
          montant: String(i * 1000)
        }
      }, 60000)
    );
    const results = await Promise.all(promises);
    const failCount = results.filter(r => r.statusCode !== 200).length;
    if (failCount > 0) throw new Error(`${failCount}/${CONCURRENT_REQUESTS} writes failed`);
  }, { repeat: 3 });

  log('── Test 10: Save users (full team) ──');
  await bench('POST /api/state/users', async () => {
    const users = [];
    for (let i = 0; i < TOTAL_MANAGERS + TOTAL_ADMINS + TOTAL_CLIENT_USERS; i++) {
      users.push({
        id: i + 1,
        username: i < TOTAL_MANAGERS ? (i === 0 ? 'manager' : `manager${i+1}`)
          : (i < TOTAL_MANAGERS + TOTAL_ADMINS ? `admin${i - TOTAL_MANAGERS + 1}` : `client${i - TOTAL_MANAGERS - TOTAL_ADMINS + 1}`),
        password: '1234',
        role: i < TOTAL_MANAGERS ? 'manager' : (i < TOTAL_MANAGERS + TOTAL_ADMINS ? 'admin' : 'client'),
        clientIds: []
      });
    }
    const res = await httpPost(`${BASE_URL}/api/state/users?token=${token}`, { users }, 30000);
    if (res.statusCode !== 200) throw new Error(`status ${res.statusCode}: ${res.body?.slice(0, 200)}`);
  }, { repeat: 3 });

  return results;
}

// ─── REPORT ────────────────────────────────────────────────────
function printReport(results) {
  console.log('\n' + '═'.repeat(90));
  console.log('  STRESS TEST REPORT');
  console.log('═'.repeat(90));
  console.log(`  Volume: ${TARGET_CLIENTS} clients | ${TARGET_DOSSIERS.toLocaleString()} dossiers | ${TARGET_AUDIENCE.toLocaleString()} audience | ${TARGET_DILIGENCE.toLocaleString()} diligence`);
  console.log(`  Users:  ${TOTAL_MANAGERS} managers | ${TOTAL_ADMINS} admins | ${TOTAL_CLIENT_USERS} clients`);
  console.log(`  Concurrent requests: ${CONCURRENT_REQUESTS}`);
  console.log('─'.repeat(90));
  console.log(`  ${pad('Test', 45)} ${pad('Avg', 10)} ${pad('Min', 10)} ${pad('Max', 10)} ${pad('Fail', 6)}`);
  console.log('─'.repeat(90));

  let totalFail = 0;
  let slowTests = 0;
  for (const r of results) {
    const status = r.failures > 0 ? '❌' : (r.max > 30000 ? '⚠️' : '✅');
    if (r.max > 30000) slowTests++;
    totalFail += r.failures;
    console.log(`  ${status} ${pad(r.name, 43)} ${pad(fmtMs(r.avg), 10)} ${pad(fmtMs(r.min), 10)} ${pad(fmtMs(r.max), 10)} ${r.failures}`);
  }

  console.log('─'.repeat(90));
  const verdict = totalFail === 0 && slowTests === 0
    ? '✅ PASS - Le serveur gère la charge sans blocage'
    : (totalFail > 0
      ? `❌ FAIL - ${totalFail} échec(s) détecté(s)`
      : `⚠️  WARN - ${slowTests} test(s) lent(s) (>30s)`);
  console.log(`  VERDICT: ${verdict}`);
  console.log('═'.repeat(90) + '\n');
}

// ─── MAIN ──────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🏋️  CABINET AVOCAT - API STRESS TEST');
  console.log('═'.repeat(60));
  log(`System: ${os.cpus()[0]?.model || 'unknown'} | ${os.cpus().length} cores | ${MB(os.totalmem())} RAM`);
  log(`Node.js: ${process.version}`);
  log(`Temp server port: ${SERVER_PORT} (production data NOT touched)`);

  // Create temp directory inside workspace
  const tmpDir = path.join(ROOT_DIR, 'bench-runs', `stress-${Date.now()}`);
  await fsp.mkdir(tmpDir, { recursive: true });
  log(`Temp dir: ${tmpDir}`);

  let serverHandle = null;
  try {
    serverHandle = await startTestServer(tmpDir);

    // Get auth token
    log('Authenticating...');
    const loginRes = await httpPost(`${BASE_URL}/api/auth/login`, { username: 'manager', password: '1234' });
    if (loginRes.statusCode !== 200) throw new Error(`Login failed: ${loginRes.body}`);
    const loginData = JSON.parse(loginRes.body);
    const token = loginData.token;
    if (!token) throw new Error('No token in login response');
    logOk('Authenticated as manager');

    // Run benchmarks
    log('Starting benchmark suite...\n');
    const results = await runBenchmark(token);

    // Print report
    printReport(results);

  } catch (err) {
    logFail(`Fatal error: ${err.message}`);
    console.error(err.stack);
  } finally {
    // Cleanup
    if (serverHandle?.server) {
      log('Stopping test server...');
      serverHandle.server.kill('SIGTERM');
      await sleep(2000);
      if (!serverHandle.server.killed) serverHandle.server.kill('SIGKILL');
      logOk('Server stopped');
    }
    // Cleanup temp files
    log(`Temp files at: ${tmpDir}`);
    log('Run `rm -rf bench-runs/` to clean up when done.');
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
