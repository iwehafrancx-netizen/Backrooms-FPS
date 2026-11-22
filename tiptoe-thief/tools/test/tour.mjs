// Screenshots every level from a high camera so the layout can be reviewed by eye.
import { chromium } from 'playwright-core';
const out = new URL('./out/', import.meta.url).pathname;
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://127.0.0.1:8770/dev/index.html');
await p.waitForFunction(() => window.__tt && window.__tt.screens && window.__tt.screens.cur === 'title-screen', null, { timeout: 120000 });
const n = await p.evaluate(() => window.__tt.levels().length);
for (let i = 0; i < n; i++) {
  if (only && !only.includes(i + 1)) continue;
  await p.evaluate((i) => { const a = window.__tt; a.save.data.howSeen = true; a.startLevel(i); const L = a.game.level; a.game.player.pos.set(L.w / 2, 0, 0.5); a.R.camDist = Math.max(L.w, L.h) * 1.15; }, i);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}tour-${String(i + 1).padStart(2, '0')}.png` });
}
console.log('errors', JSON.stringify(errors));
await b.close();
