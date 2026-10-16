import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const zip = path.resolve(here, '../../dist/backrooms-fps.zip');
const results = [];
const check = (name, ok, info = '') => { results.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };
const rows = execFileSync('unzip', ['-Zl', zip], { encoding: 'utf8' }).split('\n').map((l) => l.trim().split(/\s+/)).filter((r) => r.length >= 10 && /^[-d]/.test(r[0]));
const entries = rows.filter((r) => r[0][0] === '-').map((r) => ({ name: r.slice(9).join(' '), size: +r[3], stored: +r[5] }));
const PV = /document\.hidden|document\.visibilityState|visibilityState|visibilitychange|onvisibilitychange/g;
const hits = [];
for (const e of entries) {
  if (!/\.(js|html|css|json|mjs|txt)$/.test(e.name)) continue;
  const txt = execFileSync('unzip', ['-p', zip, e.name], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const m = txt.match(PV);
  if (m) hits.push(`${e.name}: ${[...new Set(m)].join(', ')}`);
}
check('No Page Visibility API text in any entry (MediaCube static scan)', hits.length === 0, hits.join(' | '));
const big = entries.sort((a, b) => b.stored - a.stored);
check('Every entry stored size < 15 MB', big[0].stored < 15e6, `largest ${big[0].name} ${(big[0].stored / 1e6).toFixed(2)} MB`);
check('Every entry < 1.5 MB raw', [...big].sort((a, b) => b.size - a.size)[0].size < 1.5e6, big.slice(0, 3).map((e) => `${e.name} ${(e.size / 1e6).toFixed(2)} MB`).join(', '));
check('Every entry stored size < 512 KiB (Google per-file recommendation)', big[0].stored < 512 * 1024, big.slice(0, 5).map((e) => `${e.name} ${(e.stored / 1024).toFixed(0)} KiB stored`).join(', '));
check('ytgame pause/resume wired in the build', /yt\.system\.onPause\(/.test(execFileSync('unzip', ['-p', zip, 'game.js'], { encoding: 'utf8', maxBuffer: 64 << 20 })));
console.log(results.every(Boolean) ? '\nALL PASS' : '\nSOME FAILED');
