import { copyFile, cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(desktopRoot, '..');
const offlineWebRoot = path.join(desktopRoot, 'offline-web');

const pathsToSync = [
  'app.js',
  'index.html',
  'style.css',
  'state-persistence.js',
  'render-dashboard.js',
  'render-audience-suivi.js',
  'render-diligence.js',
  'audience-ui-helpers.js',
  'assets',
  'workers',
  'vendor'
];

await mkdir(offlineWebRoot, { recursive: true });

for(const relativePath of pathsToSync){
  const source = path.join(projectRoot, relativePath);
  const target = path.join(offlineWebRoot, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  const sourceStat = await stat(source);
  if(sourceStat.isDirectory()){
    await cp(source, target, { recursive: true, force: true });
  }else{
    await copyFile(source, target);
  }
  console.log(`Synced ${relativePath}`);
}
