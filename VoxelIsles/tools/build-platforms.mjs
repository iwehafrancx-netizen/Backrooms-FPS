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
  const js = fs.readdirSync(out).filter((f) => /^game(\.\d+)?\.js$/.test(f)).map((f) => fs.readFileSync(path.join(out, f), 'utf8')).join('\n');
  if (p === 'youtube') for (const f of fs.readdirSync(out)) if (fs.statSync(path.join(out, f)).size > 400 * 1024) throw new Error(`${p}/${f} is over 400 KiB`);
  if (p === 'youtube' && /visibilitychange|visibilityState|document\.hidden|onvisibilitychange/.test(js + fs.readFileSync(path.join(out, 'index.html'), 'utf8'))) throw new Error('Page Visibility API text in youtube build');
  if (p !== 'crazygames' && p !== 'crazygames-basic' && /crazygames/i.test(js)) throw new Error(`CrazyGames reference in ${p}`);
  if (p !== 'youtube' && /ytgame/.test(js)) throw new Error(`ytgame reference in ${p}`);
}
