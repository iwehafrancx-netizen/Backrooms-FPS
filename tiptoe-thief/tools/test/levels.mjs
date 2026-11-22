// Checks every level is solvable: from the start the thief can reach every
// loot item (close enough to pick it up) and then the van, treating locked
// doors as pickable. Also reports furniture that overlaps a door or wall.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(process.argv[2] || 'http://127.0.0.1:8770/dev/index.html');
await p.waitForFunction(() => window.__tt && window.__tt.screens && window.__tt.screens.cur === 'title-screen', null, { timeout: 120000 });
const report = await p.evaluate(() => window.__tt.checkLevels());
let bad = 0;
for (const r of report) { const ok = !r.problems.length; if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.i + 1}. ${r.name}${ok ? '' : '  ' + r.problems.join(' | ')}`); }
console.log(errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors');
console.log(bad || errors.length ? 'SOME FAILED' : 'ALL PASS');
await b.close();
