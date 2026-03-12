import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(desktopRoot, '..');
const offlineWebRoot = path.join(desktopRoot, 'offline-web');

const filesToSync = ['app.js', 'index.html', 'style.css'];

await mkdir(offlineWebRoot, { recursive: true });

for(const file of filesToSync){
  const source = path.join(projectRoot, file);
  const target = path.join(offlineWebRoot, file);
  await copyFile(source, target);
  console.log(`Synced ${file}`);
}
