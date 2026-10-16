import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = new URL('./out/vm/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const cfg = process.argv[2] ? JSON.parse(process.argv[2]) : null;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:8766/dev/index.html');
await page.waitForTimeout(1500);
await page.evaluate(() => window.__vi.startLobby('sky', { firstWait: 0, gap: [0, 0], countdown: 0.1, fast: true }));
await page.waitForFunction(() => window.__vi.state === 'play' && window.__vi.m && window.__vi.m.state === 'play', null, { timeout: 30000 });
await page.evaluate((cfg) => { const a = window.__vi; if (cfg) { Object.assign(a.view.vmCfg, cfg); a.view.buildViewmodelArm(); } a.me.inv.clear(); for (const id of [100, 112, 5, 130, 121, 131]) a.me.inv.add(id, id === 5 ? 32 : 1); a.me.pitch = 0.05; a.pc.pitch = 0.05; document.getElementById('hud').style.opacity = '0.25'; for (const o of a.m.actors) if (o !== a.me) { o.ctl = () => ({}); } }, cfg);
const geo = [];
for (const [i, name] of ['sword', 'pick', 'block', 'gapple', 'axe', 'snowball'].entries()) {
  await page.evaluate((i) => { const a = window.__vi; a.me.sel = i; a.pc.sel = i; }, i);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}${name}.png` });
  geo.push(await page.evaluate(() => { const v = window.__vi.view; const p = new v.vmHand.position.constructor(); v.vmHand.getWorldPosition(p); return p.toArray().map((x) => +x.toFixed(3)); }));
  if (i < 3) { await page.evaluate(() => { window.__vi.me.swingN++; }); await page.waitForTimeout(110); await page.screenshot({ path: `${out}${name}-swing.png` }); await page.waitForTimeout(400); }
}
console.log(JSON.stringify(geo), errors.join('\n') || 'no errors');
await browser.close();
