const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const HOST = '127.0.0.1';
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://${HOST}:${PORT}`;
const DURATION_MS = 60000; // 1 minute de stress intense
const CONCURRENT_USERS = 55;

const METRICS = {
    requestCount: 0,
    successCount: 0,
    errorCount: 0,
    latencies: [],
    sseUpdatesReceived: 0,
    broadcastLatencies: []
};

async function post(url, data, token = null) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = http.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        }, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: resBody }));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function get(url, token = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, {
            method: 'GET',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        }, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: resBody }));
        });
        req.on('error', reject);
        req.end();
    });
}

function listenSSE(token, onUpdate) {
    const req = http.request(`${BASE_URL}/api/state/stream?token=${token}`, {
        method: 'GET',
        headers: {
            'Accept': 'text/event-stream'
        }
    }, (res) => {
        res.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            lines.forEach(line => {
                if (line.startsWith('data:')) {
                    try {
                        const data = JSON.parse(line.substring(5));
                        onUpdate(data);
                    } catch (e) {}
                }
            });
        });
    });
    req.on('error', (e) => console.error('SSE Error:', e.message));
    req.end();
    return req;
}

async function simulateUser(username) {
    try {
        // 1. Login
        const loginRes = await post(`${BASE_URL}/api/auth/login`, { username, password: '1234' });
        if (loginRes.status !== 200) throw new Error(`Login failed for ${username}`);
        const { token } = JSON.parse(loginRes.body);

        // 2. Listen for real-time updates
        listenSSE(token, (update) => {
            METRICS.sseUpdatesReceived++;
            if (update.patchKind === 'dossier' && update._stressTimestamp) {
                const diff = Date.now() - update._stressTimestamp;
                METRICS.broadcastLatencies.push(diff);
            }
        });

        const startTime = Date.now();
        while (Date.now() - startTime < DURATION_MS) {
            const action = Math.random() > 0.3 ? 'EXPORT' : 'MODIFY';
            const actionStart = Date.now();
            
            try {
                if (action === 'EXPORT') {
                    await get(`${BASE_URL}/api/state/export-page?limit=50&offset=${Math.floor(Math.random() * 1000)}`, token);
                } else {
                    const dossierIdx = Math.floor(Math.random() * 200000);
                    await post(`${BASE_URL}/api/state/dossiers`, {
                        action: 'update',
                        clientId: (dossierIdx % 20) + 1,
                        dossier: {
                            referenceClient: `R-MASS-${String(dossierIdx).padStart(7, '0')}`,
                            debiteur: `Updated by ${username} at ${new Date().toISOString()}`,
                        },
                        _stressTimestamp: Date.now() // For latency tracking
                    }, token);
                }
                
                METRICS.successCount++;
                METRICS.latencies.push(Date.now() - actionStart);
            } catch (err) {
                METRICS.errorCount++;
            }
            
            METRICS.requestCount++;
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        }
    } catch (e) {
        console.error(`Simulation failure for ${username}:`, e.message);
    }
}

async function start() {
    console.log(`🔥 Lancement de la simulation massive (${CONCURRENT_USERS} utilisateurs)...`);
    console.log(`⏱️ Durée de l'exercice: ${DURATION_MS / 1000} secondes.`);
    
    const userNames = [
        ...Array.from({length: 5}, (_, i) => `manager${i+1}`),
        ...Array.from({length: 30}, (_, i) => `admin${i+1}`),
        ...Array.from({length: 20}, (_, i) => `client_user${i+1}`)
    ];

    const tasks = userNames.map(name => simulateUser(name));
    
    await Promise.all(tasks);

    console.log('\n📊 --- RAPPORT DE STRESS TEST ---');
    console.log(`Total Requêtes: ${METRICS.requestCount}`);
    console.log(`Succès: ${METRICS.successCount} | Échecs: ${METRICS.errorCount}`);
    
    const avgLatency = METRICS.latencies.length ? (METRICS.latencies.reduce((a, b) => a + b, 0) / METRICS.latencies.length).toFixed(2) : 0;
    console.log(`Latence Moyenne (API): ${avgLatency} ms`);
    
    console.log(`Mises à jour SSE reçues: ${METRICS.sseUpdatesReceived}`);
    if (METRICS.broadcastLatencies.length > 0) {
        const avgSseLatency = (METRICS.broadcastLatencies.reduce((a, b) => a + b, 0) / METRICS.broadcastLatencies.length).toFixed(2);
        console.log(`Latence de Propagation (Real-time): ${avgSseLatency} ms`);
    } else {
        console.log(`Latence de Propagation: N/A (aucune mutation détectée via SSE)`);
    }
    
    if (METRICS.errorCount === 0 && avgLatency < 500) {
        console.log('\n👑 VERDICT: SUCCESS - Le système est robuste et fluide.');
    } else {
        console.log('\n⚠️ VERDICT: PERFORMANCE WARNING - Latence ou erreurs détectées.');
    }
}

start();
