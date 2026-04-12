const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const STATE_FILE_NAME = 'Cabinet Walid Araqi.json';
const EXPORTS_DIR_NAME = 'Cabinet Walid Araqi Exports';

// Dynamic Server IP Resolution
let SERVER_IP = 'localhost';
try {
  const configPath = path.join(__dirname, 'server_ip.txt');
  if (fs.existsSync(configPath)) {
    SERVER_IP = fs.readFileSync(configPath, 'utf8').trim();
  }
} catch (e) {
  console.log('Using default server IP');
}

const DESKTOP_REMOTE_API_BASE = String(process.env.CABINET_DESKTOP_API_BASE || `http://${SERVER_IP}:3000/api`).trim();
const DESKTOP_REMOTE_LOCAL_ONLY = String(process.env.CABINET_DESKTOP_LOCAL_ONLY || '1').trim();

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

  const appIndexPath = await resolveAppIndexPath();
  await win.loadFile(appIndexPath, {
    query: {
      apiBase: DESKTOP_REMOTE_API_BASE,
      localOnly: DESKTOP_REMOTE_LOCAL_ONLY
    }
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
