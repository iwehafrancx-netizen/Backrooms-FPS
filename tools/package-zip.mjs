import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const TARGETS = {
  crazygames: ['../Backrooms FPS CrazyGames', 'backrooms-crazygames.zip'],
  'crazygames-basic': ['../Backrooms FPS CrazyGames Basic', 'backrooms-crazygames-basic.zip'],
  playables: ['../Backrooms FPS', 'backrooms-fps.zip'],
};
const target = TARGETS[process.argv[2]] ? process.argv[2] : 'playables';
const game = path.resolve(here, TARGETS[target][0]);
const dist = path.resolve(here, '../dist');
fs.mkdirSync(dist, { recursive: true });
const out = path.join(dist, TARGETS[target][1]);
if (fs.existsSync(out)) fs.rmSync(out);
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else files.push(path.relative(game, p)); } };
walk(game);
execFileSync('zip', ['-9', '-X', '-q', out, ...files], { cwd: game });
let total = 0;
for (const f of files) total += fs.statSync(path.join(game, f)).size;
const big = files.map((f) => [f, fs.statSync(path.join(game, f)).size]).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log(`files: ${files.length}  unpacked: ${(total / 1048576).toFixed(2)} MiB  zip: ${(fs.statSync(out).size / 1048576).toFixed(2)} MiB`);
for (const [f, s] of big) console.log(`  ${(s / 1024).toFixed(0).padStart(6)} KiB  ${f}`);
console.log('wrote', path.relative(path.resolve(here, '..'), out));
