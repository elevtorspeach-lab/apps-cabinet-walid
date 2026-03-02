const { app, BrowserWindow, shell } = require('electron');
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const STATE_FILE_NAME = 'appsavocat.json';

function getDesktopStateFilePath() {
  return path.join(app.getPath('downloads'), STATE_FILE_NAME);
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

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
