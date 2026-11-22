// Zips each store build into dist/tiptoe-thief-<platform>.zip, with
// index.html at the root of the zip as the portals require.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
for (const p of ['crazygames', 'crazygames-basic', 'playgama', 'youtube', 'web']) {
  const dir = path.join(root, 'builds', p);
  if (!fs.existsSync(dir)) throw new Error(`run tools/build-platforms.mjs first (${p} missing)`);
  const out = path.join(dist, `tiptoe-thief-${p}.zip`);
  fs.rmSync(out, { force: true });
  execFileSync('zip', ['-9', '-X', '-q', '-r', out, '.'], { cwd: dir });
  const files = execFileSync('unzip', ['-Z1', out], { encoding: 'utf8' }).trim().split('\n').length;
  console.log(`${path.basename(out)}: ${files} files, ${(fs.statSync(out).size / 1048576).toFixed(2)} MiB`);
}
