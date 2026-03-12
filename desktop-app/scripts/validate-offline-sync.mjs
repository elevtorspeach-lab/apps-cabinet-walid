import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(desktopRoot, '..');
const offlineWebRoot = path.join(desktopRoot, 'offline-web');

const filesToCheck = ['app.js', 'index.html', 'style.css'];

for(const file of filesToCheck){
  const source = await readFile(path.join(projectRoot, file), 'utf8');
  const target = await readFile(path.join(offlineWebRoot, file), 'utf8');
  if(source !== target){
    console.error(`Offline asset mismatch: ${file}`);
    process.exit(1);
  }
  console.log(`Validated ${file}`);
}
