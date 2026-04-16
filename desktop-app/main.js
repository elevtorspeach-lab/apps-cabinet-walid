const { app, BrowserWindow, shell, ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const STATE_FILE_NAME = 'Cabinet Walid Araqi.json';
const EXPORTS_DIR_NAME = 'Cabinet Walid Araqi Exports';

const SERVER_IP_CONFIG_PATH = path.join(__dirname, 'server_ip.txt');
const DESKTOP_REMOTE_LOCAL_ONLY = String(process.env.CABINET_DESKTOP_LOCAL_ONLY || '1').trim();

function readConfiguredServerHost() {
  try {
    if (fs.existsSync(SERVER_IP_CONFIG_PATH)) {
      return String(fs.readFileSync(SERVER_IP_CONFIG_PATH, 'utf8') || '').trim();
    }
  } catch (_error) {
    console.log('Using automatic server detection');
  }
  return '';
}

function isPrivateIpv4(address) {
  if (!address || typeof address !== 'string') return false;
  return (
    address.startsWith('10.')
    || address.startsWith('192.168.')
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function getLanIpv4Candidates() {
  const interfaces = os.networkInterfaces();
  const preferred = [];
  const others = [];

  Object.entries(interfaces).forEach(([name, entries]) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.family !== 'IPv4' || entry.internal || !entry.address) return;
      const candidate = {
        name,
        address: entry.address
      };
      if (/wi-?fi|wlan|wireless/i.test(name) && isPrivateIpv4(entry.address)) {
        preferred.push(candidate);
      } else {
        others.push(candidate);
      }
    });
  });

  return [...preferred, ...others].map((item) => item.address);
}

function buildServerHostCandidates() {
  const unique = new Set();
  const ordered = [];
  const add = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized || unique.has(normalized.toLowerCase())) return;
    unique.add(normalized.toLowerCase());
    ordered.push(normalized);
  };

  const envBase = String(process.env.CABINET_DESKTOP_API_BASE || '').trim();
  if (envBase) {
    try {
      add(new URL(envBase).hostname);
    } catch (_error) {
      add(envBase);
    }
  }

  add(readConfiguredServerHost());
  add(os.hostname());
  add('localhost');
  add('127.0.0.1');
  getLanIpv4Candidates().forEach(add);

  return ordered;
}

function buildApiBaseForHost(host) {
  return `http://${host}:3000/api`;
}

async function canReachServer(host) {
  return new Promise((resolve) => {
    const req = require('http').get(`${buildApiBaseForHost(host)}/health`, { timeout: 1800 }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

async function resolveDesktopServerHost() {
  const candidates = buildServerHostCandidates();
  for (const host of candidates) {
    if (await canReachServer(host)) {
      return host;
    }
  }
  return candidates[0] || 'localhost';
}

function getDesktopStateFilePath() {
  return path.join(app.getPath('downloads'), STATE_FILE_NAME);
}

function sanitizeExportFilename(value) {
  const fallback = 'cabinet_export.xlsx';
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const sanitized = raw.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').replace(/\s+/g, ' ').trim();
  return sanitized || fallback;
}

function getDesktopExportDirectoryPath() {
  return path.join(app.getPath('downloads'), EXPORTS_DIR_NAME);
}

function buildDefaultDesktopStatePayload() {
  return {
    clients: [],
    salleAssignments: [],
    users: [],
    audienceDraft: {}
  };
}

async function writeDesktopExportFile(payload) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const fileName = sanitizeExportFilename(safePayload.filename);
  const bytes = safePayload.bytes;
  if (!bytes) {
    throw new Error('Missing export bytes');
  }
  const exportDir = getDesktopExportDirectoryPath();
  await fsp.mkdir(exportDir, { recursive: true });
  const filePath = path.join(exportDir, fileName);
  const tempPath = `${filePath}.tmp`;
  const buffer = Buffer.isBuffer(bytes)
    ? bytes
    : Buffer.from(ArrayBuffer.isView(bytes) ? bytes : new Uint8Array(bytes));
  await fsp.writeFile(tempPath, buffer);
  await fsp.rename(tempPath, filePath);
  return filePath;
}

async function writeDesktopState(payload) {
  const filePath = getDesktopStateFilePath();
  const tempPath = `${filePath}.tmp`;
  const body = JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      ...payload
    },
    null,
    2
  );
  await fsp.writeFile(tempPath, body, 'utf8');
  await fsp.rename(tempPath, filePath);
  return filePath;
}

async function readDesktopState() {
  const filePath = getDesktopStateFilePath();
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return { filePath, data: parsed };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return { filePath, data: null };
    }
    throw err;
  }
}

async function ensureDesktopStateFileExists() {
  const result = await readDesktopState();
  if (result && result.data) return result.filePath;
  const filePath = await writeDesktopState(buildDefaultDesktopStatePayload());
  return filePath;
}

async function ensureDesktopStateFileForOpen() {
  const filePath = getDesktopStateFilePath();
  try {
    await fsp.access(filePath);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      await writeDesktopState(buildDefaultDesktopStatePayload());
    } else {
      throw err;
    }
  }
  return filePath;
}

async function resolveAppIndexPath() {
  const packagedIndexPath = path.join(__dirname, 'offline-web', 'index.html');
  if (app.isPackaged) {
    return packagedIndexPath;
  }

  const projectRootIndexPath = path.resolve(__dirname, '..', 'index.html');
  try {
    await fsp.access(projectRootIndexPath);
    return projectRootIndexPath;
  } catch (_err) {
    return packagedIndexPath;
  }
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Cabinet Walid Araqi',
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#f0f2f5',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const resolvedHost = await resolveDesktopServerHost();
  const appUrl = `http://${resolvedHost}:3000`;
  const remoteApiBase = String(process.env.CABINET_DESKTOP_API_BASE || buildApiBaseForHost(resolvedHost)).trim();

  win.loadURL(appUrl).catch(() => {
    console.warn('Live server not reachable, falling back to local files.');
    resolveAppIndexPath().then(appIndexPath => {
      win.loadFile(appIndexPath, {
        query: {
          apiBase: remoteApiBase,
          localOnly: DESKTOP_REMOTE_LOCAL_ONLY
        }
      });
    });
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  ensureDesktopStateFileExists().catch((err) => {
    console.warn('Unable to initialize Cabinet Walid Araqi.json', err);
  });

  ipcMain.handle('desktop-state:get-path', async () => {
    return getDesktopStateFilePath();
  });

  ipcMain.handle('desktop-state:read', async () => {
    const result = await readDesktopState();
    return result;
  });

  ipcMain.handle('desktop-state:write', async (_event, payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid desktop-state payload');
    }
    const filePath = await writeDesktopState(payload);
    return { ok: true, filePath };
  });

  ipcMain.handle('desktop-state:open-file', async () => {
    const filePath = await ensureDesktopStateFileForOpen();
    const openError = await shell.openPath(filePath);
    return { ok: !openError, filePath, error: openError || '' };
  });

  ipcMain.handle('desktop-export:save-open', async (_event, payload) => {
    const filePath = await writeDesktopExportFile(payload);
    const openError = await shell.openPath(filePath);
    return { ok: !openError, filePath, error: openError || '' };
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
