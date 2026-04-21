import { copyFile, cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(desktopRoot, '..');
const clientDistRoot = path.join(projectRoot, 'client', 'dist');
const offlineWebRoot = path.join(desktopRoot, 'offline-web');

const pathsToSync = [
  'index.html',
  'assets',
  'legacy',
  'vendor',
  'workers',
  'favicon.png',
  'favicon.svg',
  'icons.svg',
  'logo_cabinet.png'
];

await mkdir(offlineWebRoot, { recursive: true });

for(const relativePath of pathsToSync){
  const source = path.join(clientDistRoot, relativePath);
  const target = path.join(offlineWebRoot, relativePath);
  
  try {
    const sourceStat = await stat(source);
    await mkdir(path.dirname(target), { recursive: true });
    if(sourceStat.isDirectory()){
      await rm(target, { recursive: true, force: true });
      await cp(source, target, { recursive: true, force: true });
    }else{
      await copyFile(source, target);
    }
    console.log(`Synced ${relativePath}`);
  } catch (err) {
    console.warn(`Warning: Could not sync ${relativePath}. ${err.message}`);
  }
}
