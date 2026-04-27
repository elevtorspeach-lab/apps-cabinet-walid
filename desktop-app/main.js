const { app, BrowserWindow, Menu, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const DESKTOP_APP_URL = 'http://192.168.1.11:3000/';

function configureDesktopUserDataPath() {
  const preferredPath = path.join(__dirname, '.electron-user-data');
  try {
    fs.mkdirSync(preferredPath, { recursive: true });
    app.setPath('userData', preferredPath);
  } catch (error) {
    console.warn('Unable to set Electron userData path.', error);
  }
}

function resolveDesktopWindowIconPath() {
  const iconCandidates = process.platform === 'win32'
    ? [
        path.join(__dirname, 'build', 'icon.ico'),
        path.join(__dirname, 'build', 'icon.png')
      ]
    : [
        path.join(__dirname, 'build', 'icon.png'),
        path.join(__dirname, 'build', 'icon.ico')
      ];
  for (const candidate of iconCandidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
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

function buildLoadErrorHtml(appUrl, detail = '') {
  const safeAppUrl = escapeHtml(appUrl);
  const safeDetail = escapeHtml(detail);
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cabinet Walid Araqi - Connexion impossible</title>
  <style>
    body{margin:0;font-family:Arial,sans-serif;background:#f3f4f6;color:#111827;display:grid;place-items:center;min-height:100vh}
    main{width:min(560px,calc(100vw - 40px));background:#fff;border:1px solid #dbe3ef;border-radius:12px;padding:28px;box-shadow:0 18px 50px rgba(15,23,42,.12)}
    h1{font-size:22px;margin:0 0 12px;color:#123b8c}
    p{font-size:15px;line-height:1.5;margin:8px 0;color:#374151}
    code{display:block;margin-top:14px;padding:12px;background:#eef2ff;color:#1e3a8a;border-radius:8px;word-break:break-all}
    .status{margin-top:18px;padding:12px;border-radius:8px;background:#fff7ed;color:#9a3412;font-weight:700}
    .actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}
    button{border:0;border-radius:8px;background:#123b8c;color:#fff;padding:11px 16px;font-weight:700;cursor:pointer}
    .secondary{background:#fff;color:#123b8c;border:1px solid #c7d2fe}
  </style>
</head>
<body>
  <main>
    <h1>Connexion au serveur impossible</h1>
    <p>Le desktop app dépend entièrement de la version web hébergée sur cette adresse.</p>
    <code>${safeAppUrl}</code>
    <div class="status">Le serveur n'est pas accessible pour le moment.</div>
    ${safeDetail ? `<p>${safeDetail}</p>` : ''}
    <div class="actions">
      <button onclick="location.reload()">Réessayer</button>
      <button class="secondary" onclick="window.open('${safeAppUrl}', '_blank')">Ouvrir l'URL</button>
    </div>
  </main>
</body>
</html>`;
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
      contextIsolation: true
    }
  });

  const loadWebApp = async () => {
    try {
      await win.loadURL(DESKTOP_APP_URL);
    } catch (error) {
      const html = buildLoadErrorHtml(DESKTOP_APP_URL, String(error?.message || error || 'Erreur inconnue'));
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    }
  };

  win.webContents.on('did-fail-load', async (_event, errorCode, errorDescription, validatedUrl) => {
    if (String(validatedUrl || '').startsWith('data:text/html')) return;
    const html = buildLoadErrorHtml(DESKTOP_APP_URL, `${errorCode} - ${errorDescription}`);
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(() => {});
  });

  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (String(url || '').startsWith(DESKTOP_APP_URL)) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (String(url || '').startsWith(DESKTOP_APP_URL)) return;
    event.preventDefault();
    shell.openExternal(url);
  });

  await loadWebApp();
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
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
