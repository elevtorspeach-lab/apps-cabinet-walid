import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(desktopRoot, '..');
const clientDistRoot = path.join(projectRoot, 'client', 'dist');
const offlineWebRoot = path.join(desktopRoot, 'offline-web');

const pathsToCheck = [
  'index.html'
];

for(const relativePath of pathsToCheck){
  try {
    const source = await readFile(path.join(clientDistRoot, relativePath), 'utf8');
    const target = await readFile(path.join(offlineWebRoot, relativePath), 'utf8');
    if(source !== target){
      console.error(`Offline asset mismatch: ${relativePath}`);
      process.exit(1);
    }
    console.log(`Validated ${relativePath}`);
  } catch (err) {
    console.error(`Validation failed for ${relativePath}: ${err.message}`);
    process.exit(1);
  }
}
