// Builds every store version into builds/<platform>/ and checks each one:
// the right SDK tag is in index.html and the YouTube build talks to no outside host.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const ALL = ['web', 'crazygames', 'crazygames-basic', 'playgama', 'youtube'];
for (const p of ALL) {
  execFileSync('node', [path.join(here, 'build.mjs'), `--platform=${p}`], { stdio: 'inherit' });
  const html = fs.readFileSync(path.join(root, 'builds', p, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'builds', p, 'game.js'), 'utf8');
  const expect = { crazygames: 'sdk.crazygames.com', 'crazygames-basic': 'sdk.crazygames.com', playgama: 'playgama-bridge.js', youtube: 'youtube.com/game_api' }[p];
  if (expect && !html.includes(expect)) throw new Error(`${p}: SDK tag missing`);
  if (p === 'youtube' && /https?:\/\/(?!www\.youtube\.com\/game_api)/.test(html)) throw new Error('youtube: outside URL in index.html');
  if (p === 'crazygames-basic' && /requestAd\(/.test(js)) throw new Error('basic build still asks for ads');
}
console.log('all platforms built');
