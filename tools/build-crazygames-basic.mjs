import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../Backrooms FPS CrazyGames');
const out = path.resolve(here, '../Backrooms FPS CrazyGames Basic');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const item of ['css', 'lib', 'assets', 'LICENSES.txt', 'index.html']) fs.cpSync(path.join(src, item), path.join(out, item), { recursive: true });

let js = fs.readFileSync(path.join(src, 'game.js'), 'utf8');
const a = js.indexOf('    ads: {\n      canReward()');
const endMark = "      rewarded() { return this.request('rewarded'); },\n    },\n";
const b = js.indexOf(endMark, a);
if (a < 0 || b < 0) throw new Error('ads block not found in the CrazyGames game.js');
js = js.slice(0, a) + '    ads: { canReward: () => false, async midgame() {}, async rewarded() { return false; } },\n' + js.slice(b + endMark.length);
js = js.replace('let SDK = null, ready = false, playing = false, adBusy = false, adCooldownUntil = 0;', 'let SDK = null, ready = false, playing = false;');
if (/requestAd|adBusy|adCooldownUntil/.test(js)) throw new Error('ad code left in the Basic Launch build');
fs.writeFileSync(path.join(out, 'game.js'), js);
console.log('wrote', path.relative(path.resolve(here, '..'), out), '(Basic Launch: no ads)');
