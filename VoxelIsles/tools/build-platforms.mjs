import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const all = ['crazygames', 'crazygames-basic', 'youtube', 'playgama'];
const want = process.argv.slice(2).filter((a) => all.includes(a));
for (const p of want.length ? want : all) {
  const out = path.join(root, 'builds', p);
  fs.rmSync(out, { recursive: true, force: true });
  execFileSync('node', [path.join(here, 'build.mjs'), `--platform=${p}`, `--out=builds/${p}`], { stdio: 'inherit' });
  if (p === 'playgama') {
    fs.copyFileSync(path.join(here, 'vendor/playgama-bridge.js'), path.join(out, 'playgama-bridge.js'));
    fs.writeFileSync(path.join(out, 'playgama-bridge-config.json'), JSON.stringify({ game: { adaptToSafeArea: true }, advertisement: { interstitial: { preloadOnStart: 'true' }, rewarded: { preloadOnStart: 'true' } } }, null, 2) + '\n');
  }
  fs.copyFileSync(path.join(root, 'LICENSES.txt'), path.join(out, 'LICENSES.txt'));
  const js = fs.readFileSync(path.join(out, 'game.js'), 'utf8');
  if (p !== 'crazygames' && p !== 'crazygames-basic' && /crazygames/i.test(js)) throw new Error(`CrazyGames reference in ${p}`);
  if (p !== 'youtube' && /ytgame/.test(js)) throw new Error(`ytgame reference in ${p}`);
}
