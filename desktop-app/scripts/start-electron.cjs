const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const electronBinary = require('electron');
const appRoot = path.resolve(__dirname, '..');
const userDataDir = path.join(appRoot, '.electron-user-data');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

fs.mkdirSync(userDataDir, { recursive: true });

const child = spawn(electronBinary, ['.', `--user-data-dir=${userDataDir}`], {
  cwd: appRoot,
  env,
  stdio: 'inherit',
  windowsHide: false
});

child.once('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.once('error', (error) => {
  console.error('Unable to start Electron.', error);
  process.exit(1);
});
