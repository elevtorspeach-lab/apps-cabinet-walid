import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(desktopRoot, '..');
const offlineWebRoot = path.join(desktopRoot, 'offline-web');

const pathsToCheck = [
  'app.js',
  'index.html',
  'style.css',
  'state-persistence.js',
  'render-dashboard.js',
  'render-audience-suivi.js',
  'render-diligence.js',
  'audience-ui-helpers.js',
  'workers/export-xlsx.worker.js',
  'workers/diligence-filter.worker.js',
  'workers/suivi-filter.worker.js',
  'workers/audience-filter.worker.js',
  'workers/client-filter.worker.js',
  'vendor/libs/xlsx.full.min.js',
  'vendor/libs/exceljs.min.js',
  'vendor/local-icons.css'
];

for(const relativePath of pathsToCheck){
  const source = await readFile(path.join(projectRoot, relativePath), 'utf8');
  const target = await readFile(path.join(offlineWebRoot, relativePath), 'utf8');
  if(source !== target){
    console.error(`Offline asset mismatch: ${relativePath}`);
    process.exit(1);
  }
  console.log(`Validated ${relativePath}`);
}
