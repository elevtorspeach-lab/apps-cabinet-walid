const { app, BrowserWindow, shell } = require('electron');
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const STATE_FILE_NAME = 'applicationversion1.json';
const EXPORTS_DIR_NAME = 'Cabinet ARAQI Exports';

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

async function writeDesktopExportFile(payload) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const fileName = sanitizeExportFilename(safePayload.filename);
  const bytes = safePayload.bytes;
  if (!bytes) {
    throw new Error('Missing export bytes');
  }
  const exportDir = getDesktopExportDirectoryPath();
  await fs.mkdir(exportDir, { recursive: true });
  const filePath = path.join(exportDir, fileName);
  const tempPath = `${filePath}.tmp`;
  const buffer = Buffer.isBuffer(bytes)
    ? bytes
    : Buffer.from(ArrayBuffer.isView(bytes) ? bytes : new Uint8Array(bytes));
  await fs.writeFile(tempPath, buffer);
  await fs.rename(tempPath, filePath);
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
  await fs.writeFile(tempPath, body, 'utf8');
  await fs.rename(tempPath, filePath);
  return filePath;
}

async function readDesktopState() {
  const filePath = getDesktopStateFilePath();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
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
  const filePath = await writeDesktopState({
    clients: [],
    salleAssignments: [],
    users: [],
    audienceDraft: {}
  });
  return filePath;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#f0f2f5',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const appIndexPath = path.join(__dirname, 'offline-web', 'index.html');
  await win.loadFile(appIndexPath);

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
    console.warn('Unable to initialize applicationversion1.json', err);
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
    const filePath = getDesktopStateFilePath();
    try {
      await fs.access(filePath);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        await writeDesktopState({
          clients: [],
          salleAssignments: [],
          users: [],
          audienceDraft: {}
        });
      } else {
        throw err;
      }
    }
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
