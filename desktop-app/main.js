const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const { spawn } = require('child_process');

const STATE_FILE_NAME = 'Cabinet Walid Araqi.json';
const EXPORTS_DIR_NAME = 'Cabinet Walid Araqi Exports';
const API_PORT = 3000;
const SERVER_START_TIMEOUT_MS = 20000;
const DEFAULT_SERVER_HOST = '192.168.1.11';
const SERVER_RETRY_INTERVAL_MS = 4000;

const SERVER_IP_CONFIG_PATH = path.join(__dirname, 'server_ip.txt');
let desktopServerStartPromise = null;

function configureDesktopUserDataPath() {
  const preferredPath = path.join(__dirname, '.electron-user-data');
  try {
    fs.mkdirSync(preferredPath, { recursive: true });
    app.setPath('userData', preferredPath);
  } catch (error) {
    console.warn('Unable to set Electron userData path.', error);
  }
}

function getPowerShellExecutableCandidates() {
  const candidates = [];
  const windowsRootCandidates = [
    process.env.SystemRoot,
    process.env.WINDIR,
    'C:\\Windows'
  ].filter(Boolean);
  for (const windowsRoot of windowsRootCandidates) {
    candidates.push(path.join(windowsRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'));
    candidates.push(path.join(windowsRoot, 'Sysnative', 'WindowsPowerShell', 'v1.0', 'powershell.exe'));
  }
  candidates.push('powershell.exe', 'pwsh.exe');
  return Array.from(new Set(candidates));
}

function resolvePowerShellExecutable() {
  const candidates = getPowerShellExecutableCandidates();
  for (const candidate of candidates) {
    if (!candidate.includes('\\')) return candidate;
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch (_) {}
  }
  return 'powershell.exe';
}

function getCmdExecutableCandidates() {
  const candidates = [];
  const windowsRootCandidates = [
    process.env.SystemRoot,
    process.env.WINDIR,
    'C:\\Windows'
  ].filter(Boolean);
  for (const windowsRoot of windowsRootCandidates) {
    candidates.push(path.join(windowsRoot, 'System32', 'cmd.exe'));
    candidates.push(path.join(windowsRoot, 'Sysnative', 'cmd.exe'));
  }
  candidates.push(process.env.ComSpec, 'cmd.exe');
  return Array.from(new Set(candidates.filter(Boolean)));
}

function resolveCmdExecutable() {
  const candidates = getCmdExecutableCandidates();
  for (const candidate of candidates) {
    if (!candidate.includes('\\')) return candidate;
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch (_) {}
  }
  return 'cmd.exe';
}

function resolveDesktopWindowIconPath() {
  const iconCandidates = process.platform === 'win32'
    ? [
        path.join(__dirname, 'build', 'icon.ico'),
        path.join(process.resourcesPath || '', 'build', 'icon.ico'),
        path.join(__dirname, 'build', 'icon.png'),
        path.join(process.resourcesPath || '', 'build', 'icon.png')
      ]
    : [
        path.join(__dirname, 'build', 'icon.png'),
        path.join(process.resourcesPath || '', 'build', 'icon.png'),
        path.join(__dirname, 'build', 'icon.ico'),
        path.join(process.resourcesPath || '', 'build', 'icon.ico')
      ];
  for (const candidate of iconCandidates) {
    try {
      if (candidate && fs.existsSync(candidate)) return candidate;
    } catch (_) {}
  }
  return undefined;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildServerWaitingHtml(appUrl, detail = '') {
  const safeAppUrl = escapeHtml(appUrl);
  const safeDetail = escapeHtml(detail);
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cabinet Walid Araqi - Connexion serveur</title>
  <style>
    body{margin:0;font-family:Arial,sans-serif;background:#f3f4f6;color:#111827;display:grid;place-items:center;min-height:100vh}
    main{width:min(560px,calc(100vw - 40px));background:#fff;border:1px solid #dbe3ef;border-radius:10px;padding:28px;box-shadow:0 18px 50px rgba(15,23,42,.12)}
    h1{font-size:22px;margin:0 0 12px;color:#123b8c}
    p{font-size:15px;line-height:1.5;margin:8px 0;color:#374151}
    code{display:block;margin-top:14px;padding:12px;background:#eef2ff;color:#1e3a8a;border-radius:8px;word-break:break-all}
    .status{margin-top:18px;padding:12px;border-radius:8px;background:#fff7ed;color:#9a3412;font-weight:700}
    button{margin-top:18px;border:0;border-radius:8px;background:#123b8c;color:#fff;padding:11px 16px;font-weight:700;cursor:pointer}
  </style>
</head>
<body>
  <main>
    <h1>Connexion au serveur...</h1>
    <p>L'application reste liée au serveur. Elle va réessayer automatiquement jusqu'à ce que le serveur revienne.</p>
    <code>${safeAppUrl}</code>
    <div class="status">Nouvelle tentative toutes les 4 secondes.</div>
    ${safeDetail ? `<p>${safeDetail}</p>` : ''}
    <button onclick="location.reload()">Réessayer maintenant</button>
  </main>
</body>
</html>`;
}

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
  add(DEFAULT_SERVER_HOST);
  add(os.hostname());
  add('localhost');
  add('127.0.0.1');
  getLanIpv4Candidates().forEach(add);

  return ordered;
}

function buildApiBaseForHost(host) {
  return `http://${host}:${API_PORT}/api`;
}

function buildAppUrlForHost(host) {
  return `http://${host}:${API_PORT}`;
}

async function canReachServer(host) {
  return new Promise((resolve) => {
    const req = http.get(`${buildApiBaseForHost(host)}/health`, { timeout: 1800 }, (res) => {
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

function getDesktopServerDirCandidates() {
  return [
    path.resolve(__dirname, '..', 'server'),
    path.join(process.resourcesPath || '', 'server'),
    path.join(path.dirname(process.execPath || ''), 'server')
  ].filter(Boolean);
}

function resolveDesktopServerStarterScript() {
  for (const serverDir of getDesktopServerDirCandidates()) {
    const starterCommand = path.join(serverDir, 'start-server-background.cmd');
    if (fs.existsSync(starterCommand)) {
      return { serverDir, starterScript: starterCommand, useCmdWrapper: true };
    }
    const starterScript = path.join(serverDir, 'start-server-background.ps1');
    if (fs.existsSync(starterScript)) {
      return { serverDir, starterScript, useCmdWrapper: false };
    }
  }
  return null;
}

async function waitForReachableServer(hosts, timeoutMs = SERVER_START_TIMEOUT_MS) {
  const deadline = Date.now() + Math.max(2000, Number(timeoutMs) || SERVER_START_TIMEOUT_MS);
  const candidates = Array.from(new Set((hosts || []).map(host => String(host || '').trim()).filter(Boolean)));
  while (Date.now() < deadline) {
    for (const host of candidates) {
      if (await canReachServer(host)) {
        return host;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 900));
  }
  return '';
}

async function ensureDesktopBundledServerRunning() {
  if (desktopServerStartPromise) return desktopServerStartPromise;

  desktopServerStartPromise = (async () => {
    const localHosts = ['127.0.0.1', 'localhost'];
    const alreadyReachable = await waitForReachableServer(localHosts, 1200);
    if (alreadyReachable) {
      return alreadyReachable;
    }

    const starter = resolveDesktopServerStarterScript();
    if (!starter) {
      return '';
    }

    try {
      const shouldUseCmdWrapper = starter.useCmdWrapper !== false;
      const executable = shouldUseCmdWrapper ? resolveCmdExecutable() : resolvePowerShellExecutable();
      const args = shouldUseCmdWrapper
        ? ['/d', '/s', '/c', starter.starterScript]
        : ['-ExecutionPolicy', 'Bypass', '-File', starter.starterScript];
      const child = spawn(
        executable,
        args,
        {
          cwd: starter.serverDir,
          windowsHide: true,
          detached: true,
          stdio: 'ignore'
        }
      );
      child.once('error', (err) => {
        console.warn(`Unable to start bundled server automatically via ${executable}.`, err);
      });
      child.unref();
    } catch (err) {
      console.warn('Unable to start bundled server automatically.', err);
      return '';
    }

    const reachableAfterStart = await waitForReachableServer(localHosts, SERVER_START_TIMEOUT_MS);
    return reachableAfterStart || '';
  })().finally(() => {
    desktopServerStartPromise = null;
  });

  return desktopServerStartPromise;
}

async function resolveDesktopServerHost() {
  const candidates = buildServerHostCandidates();
  for (const host of candidates) {
    if (await canReachServer(host)) {
      return host;
    }
  }
  const localHost = await ensureDesktopBundledServerRunning();
  if (localHost) {
    return localHost;
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
  Menu.setApplicationMenu(null);
  const windowIconPath = resolveDesktopWindowIconPath();

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: 'Cabinet Walid Araqi',
    icon: windowIconPath,
    backgroundColor: '#f0f2f5',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  {
    const preferredHosts = buildServerHostCandidates();
    let currentHost = preferredHosts[0] || readConfiguredServerHost() || DEFAULT_SERVER_HOST || 'localhost';
    let retryTimer = null;
    let retryInFlight = false;

    const clearRetryTimer = () => {
      if (!retryTimer) return;
      clearTimeout(retryTimer);
      retryTimer = null;
    };

    const scheduleRetry = (detail = '') => {
      if (win.isDestroyed()) return;
      const appUrl = buildAppUrlForHost(currentHost);
      const html = buildServerWaitingHtml(appUrl, detail);
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(() => {});
      clearRetryTimer();
      retryTimer = setTimeout(() => {
        tryLoadServer();
      }, SERVER_RETRY_INTERVAL_MS);
    };

    const tryLoadServer = async () => {
      if (retryInFlight || win.isDestroyed()) return;
      retryInFlight = true;
      clearRetryTimer();
      try {
        const reachableHost = await resolveDesktopServerHost();
        if (!reachableHost) {
          scheduleRetry(`Serveur indisponible sur ${currentHost}:3000.`);
          return;
        }
        currentHost = reachableHost;
        await win.loadURL(buildAppUrlForHost(currentHost));
      } catch (err) {
        scheduleRetry(String(err?.message || err || 'Erreur de connexion'));
      } finally {
        retryInFlight = false;
      }
    };

    win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
      const failedUrl = String(validatedUrl || '').trim();
      if (failedUrl) {
        try {
          currentHost = new URL(failedUrl).hostname || currentHost;
        } catch (_error) {}
      }
      scheduleRetry(`${errorCode} - ${errorDescription}`);
    });

    win.on('closed', clearRetryTimer);
    await tryLoadServer();
  }

  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const currentUrl = win.webContents.getURL();
    if (!currentUrl || url === currentUrl || url.startsWith('file://')) return;
    event.preventDefault();
    shell.openExternal(url);
  });
}

configureDesktopUserDataPath();

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.setAppUserModelId('com.walidaraqi.cabinet');

  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
}

if (gotSingleInstanceLock) {
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
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
