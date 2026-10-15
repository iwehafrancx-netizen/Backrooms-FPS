import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const all = ['crazygames', 'crazygames-basic', 'youtube', 'playgama'];
const want = process.argv.slice(2).filter((a) => all.includes(a));
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
for (const p of want.length ? want : all) {
  const game = path.join(root, 'builds', p);
  const out = path.join(dist, `voxel-isles-${p}.zip`);
  if (fs.existsSync(out)) fs.rmSync(out);
  const files = fs.readdirSync(game).sort();
  execFileSync('zip', ['-9', '-X', '-q', out, ...files], { cwd: game });
  const total = files.reduce((s, f) => s + fs.statSync(path.join(game, f)).size, 0);
  console.log(`${path.basename(out)}: ${files.length} files, ${(total / 1048576).toFixed(2)} MiB unpacked, ${(fs.statSync(out).size / 1048576).toFixed(2)} MiB zip`);
}
