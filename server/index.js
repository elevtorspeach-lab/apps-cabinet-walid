const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const WEB_DIR = path.join(__dirname, '..');

const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const DEFAULT_STATE = {
  clients: [],
  salleAssignments: [],
  users: [],
  audienceDraft: {},
  recycleBin: [],
  recycleArchive: [],
  updatedAt: new Date().toISOString()
};

let cachedState = null;
const sseClients = new Set();

app.use(express.json({ limit: '120mb' }));
app.use(express.static(WEB_DIR, {
  index: false
}));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

async function ensureDataFile() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(STATE_FILE, fs.constants.F_OK);
  } catch {
    await writeState(DEFAULT_STATE);
  }
}

async function readState() {
  if (cachedState) return cachedState;
  try {
    const raw = await fsp.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    cachedState = {
      ...DEFAULT_STATE,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
      updatedAt: String(parsed?.updatedAt || new Date().toISOString())
    };
    return cachedState;
  } catch {
    cachedState = { ...DEFAULT_STATE };
    return cachedState;
  }
}

async function writeState(nextState) {
  const safe = {
    ...DEFAULT_STATE,
    ...(nextState && typeof nextState === 'object' ? nextState : {}),
    updatedAt: new Date().toISOString()
  };
  const tmpFile = `${STATE_FILE}.tmp`;
  await fsp.writeFile(tmpFile, JSON.stringify(safe), 'utf8');
  await fsp.rename(tmpFile, STATE_FILE);
  cachedState = safe;
  return safe;
}

function broadcastStateUpdated(payload) {
  const data = `event: state-updated\ndata: ${JSON.stringify({
    updatedAt: payload?.updatedAt || new Date().toISOString()
  })}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(data);
    } catch {
      sseClients.delete(res);
    }
  });
}

app.get('/api/health', async (req, res) => {
  await ensureDataFile();
  res.json({ ok: true, service: 'cabinet-api', ts: new Date().toISOString() });
});

app.get('/api/state', async (req, res) => {
  await ensureDataFile();
  const state = await readState();
  res.json(state);
});

app.post('/api/state', async (req, res) => {
  await ensureDataFile();
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const saved = await writeState(body);
  broadcastStateUpdated(saved);
  res.json({ ok: true, updatedAt: saved.updatedAt });
});

app.get('/api/state/stream', async (req, res) => {
  await ensureDataFile();
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);
  const current = await readState();
  res.write(`event: state-updated\ndata: ${JSON.stringify({ updatedAt: current.updatedAt })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {}
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
    res.end();
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(WEB_DIR, 'index.html'));
});

ensureDataFile()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Cabinet API running on http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start API:', err);
    process.exit(1);
  });
