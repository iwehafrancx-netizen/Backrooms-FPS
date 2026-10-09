import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../Backrooms FPS CrazyGames');
const dst = path.resolve(here, '../Backrooms FPS');

const js = fs.readFileSync(path.join(src, 'game.js'), 'utf8');
const start = js.indexOf('const Platform = (() => {');
const endMark = '\n  return api;\n})();\n';
const end = js.indexOf(endMark, start);
if (start < 0 || end < 0) throw new Error('Platform block not found in the CrazyGames game.js');
const yt = fs.readFileSync(path.join(here, 'platform/youtube.js'), 'utf8').trimEnd() + '\n';
const out = js.slice(0, start) + yt + js.slice(end + endMark.length);
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

console.log('synced YouTube Playables build from the CrazyGames source');
