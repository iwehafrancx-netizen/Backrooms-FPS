import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../Backrooms FPS CrazyGames');
const dst = path.resolve(here, '../Backrooms FPS');

const js = fs.readFileSync(path.join(src, 'game.js'), 'utf8');
const start = js.indexOf('const Platform = (() => {');
const endMark = '\n  return api;\n})();\n';
const end = js.indexOf(endMark, start);
if (start < 0 || end < 0) throw new Error('Platform block not found in the CrazyGames game.js');
const yt = fs.readFileSync(path.join(here, 'platform/youtube.js'), 'utf8').trimEnd() + '\n';
let out = js.slice(0, start) + yt + js.slice(end + endMark.length);
const pvStart = out.indexOf('const PageVisibility = (() => {');
const pvEnd = out.indexOf('\n})();\n', pvStart);
if (pvStart < 0 || pvEnd < 0) throw new Error('PageVisibility block not found');
out = out.slice(0, pvStart) + 'const PageVisibility = { wired: false, hidden: false, on() {} };' + out.slice(pvEnd + 6);
if (/CrazyGames|crazygames/.test(out)) throw new Error('CrazyGames reference left in the YouTube build');
fs.writeFileSync(path.join(dst, 'game.js'), out);

const copyDir = (from, to) => {
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
};
copyDir(path.join(src, 'css'), path.join(dst, 'css'));
copyDir(path.join(src, 'assets'), path.join(dst, 'assets'));
copyDir(path.join(src, 'lib'), path.join(dst, 'lib'));
fs.copyFileSync(path.join(src, 'LICENSES.txt'), path.join(dst, 'LICENSES.txt'));

const cgHtml = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const html = cgHtml.replace(/<script src="https:\/\/sdk\.crazygames\.com\/crazygames-sdk-v3\.js"><\/script>/, '<script src="https://www.youtube.com/game_api/v1"></script>');
if (!html.includes('https://www.youtube.com/game_api/v1')) throw new Error('SDK tag swap failed');
fs.writeFileSync(path.join(dst, 'index.html'), html);

const patch = (file, pairs) => {
  const p = path.join(dst, file);
  let src = fs.readFileSync(p, 'utf8');
  for (const [a, b] of pairs) {
    const n = src.split(a).length - 1;
    if (n !== 1) throw new Error(`${file}: expected 1 match, found ${n}: ${a.slice(0, 60)}`);
    src = src.replace(a, b);
  }
  fs.writeFileSync(p, src);
};
patch('lib/three/three.min.js', [
  ['t.hidden!==void 0&&(this._pageVisibilityHandler=g_.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))', '!1'],
  ['this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null)', 'this._pageVisibilityHandler=null'],
  ['this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(', '!1?this._delta=0:('],
  ['function g_(){this._document.hidden===!1&&this.reset()}', 'function g_(){this.reset()}'],
  ['e.session.visibilityState!=="visible-blurred"', '!0'],
]);
patch('lib/ai/yuka.min.js', [
  ['this._usePageVisibilityAPI="undefined"!=typeof document&&void 0!==document.hidden', 'this._usePageVisibilityAPI=!1'],
  ['!0===this._usePageVisibilityAPI&&(this._pageVisibilityHandler=xe.bind(this),document.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))', '!1'],
  ['!0===this._usePageVisibilityAPI&&document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this', 'this'],
  ['function xe(){!1===document.hidden&&this.reset()}', 'function xe(){this.reset()}'],
]);

const music = path.join(dst, 'assets/Audio/music.mp3');
const tmp = music + '.tmp.mp3';
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(src, 'assets/Audio/music.mp3'), '-map_metadata', '-1', '-ac', '1', '-ar', '32000', '-b:a', '40k', tmp]);
fs.renameSync(tmp, music);

const PART = 400 * 1000;
const split = {};
const walkAll = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walkAll(p) : [p]; });
for (const f of walkAll(path.join(dst, 'assets'))) {
  const buf = fs.readFileSync(f);
  if (buf.length <= PART) continue;
  const n = Math.ceil(buf.length / PART);
  for (let i = 0; i < n; i++) fs.writeFileSync(`${f}.part${i}`, buf.subarray(i * PART, (i + 1) * PART));
  fs.rmSync(f);
  split[path.relative(dst, f).split(path.sep).join('/')] = n;
}
const gamePath = path.join(dst, 'game.js');
let gameJs = fs.readFileSync(gamePath, 'utf8');
if (gameJs.split('const SPLIT_FILES = {};').length !== 2) throw new Error('SPLIT_FILES placeholder not found once');
gameJs = gameJs.replace('const SPLIT_FILES = {};', `const SPLIT_FILES = ${JSON.stringify(split)};`);
fs.writeFileSync(gamePath, gameJs);
for (const url of Object.keys(split)) if (!gameJs.includes(`'${url}'`)) throw new Error(`split file not referenced by the game: ${url}`);

const PV = /document\.hidden|visibilityState|visibilitychange|onvisibilitychange/;
const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk(dst)) {
  const rel = path.relative(dst, f);
  if (fs.statSync(f).size > 1.5 * 1048576) throw new Error(`${rel} is over 1.5 MB`);
  if (rel.startsWith('assets') && fs.statSync(f).size > PART) throw new Error(`${rel} is over 400 KB`);
  if (/\.(js|html|css|json)$/.test(f) && PV.test(fs.readFileSync(f, 'utf8'))) throw new Error(`Page Visibility API text left in ${rel}`);
}

console.log('split into parts:', JSON.stringify(split));
console.log('synced YouTube Playables build from the CrazyGames source');
