// Puts the thief inside the house next to the guard's route and screenshots it.
import { chromium } from 'playwright-core';
const out = new URL('./out/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://127.0.0.1:8770/dev/index.html');
await p.waitForFunction(() => window.__tt && window.__tt.screens && window.__tt.screens.cur === 'title-screen', null, { timeout: 120000 });
await p.evaluate(() => { const a = window.__tt; a.save.data.howSeen = true; a.startLevel(0); const pl = a.game.player; pl.pos.set(9.6, 0, 9.3); });
await p.waitForTimeout(3000); await p.screenshot({ path: out + 'inside.png' });
const st = await p.evaluate(() => { const g = window.__tt.game; return { guard: g.guards.map((x) => [x.state, x.pos.x.toFixed(1), x.pos.z.toFixed(1), x.suspicion.toFixed(2)]), player: [g.player.pos.x.toFixed(1), g.player.pos.z.toFixed(1)] }; });
console.log(JSON.stringify(st), 'errors', JSON.stringify(errors));
await b.close();
