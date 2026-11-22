// Prints a level's walkable grid ('.' free, '#' blocked) to debug unreachable spots.
import { chromium } from 'playwright-core';
const i = +(process.argv[2] || 0);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
await p.goto('http://127.0.0.1:8770/dev/index.html');
await p.waitForFunction(() => window.__tt && window.__tt.screens && window.__tt.screens.cur === 'title-screen', null, { timeout: 120000 });
console.log(await p.evaluate((i) => { const a = window.__tt; a.game.load(a.levels()[i], { quiet: true }); const L = a.game.level; let s = ''; for (let z = 0; z < L.h; z++) { for (let x = 0; x < L.w; x++) s += L.walkable(x, z) ? (L.doorAt(x, z) ? 'D' : '.') : '#'; s += '\n'; } return s; }, i));
await b.close();
