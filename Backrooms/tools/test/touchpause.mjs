import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const GAME = process.env.GAME || 'Backrooms%20FPS%20CrazyGames';
const results = [];
const check = (name, ok, info = '') => { results.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h] of [[844, 390], [390, 844]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.__cgConfig = { fast: true }; });
  await page.route('https://sdk.crazygames.com/crazygames-sdk-v3.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(here, '../crazygames-test-sdk.js'), 'utf8') }));
  await page.route('https://www.youtube.com/game_api/v1', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(here, 'mock-ytgame.js'), 'utf8') }));
  await page.goto(`http://localhost:8765/${GAME}/index.html?debug&menu=1`);
  await page.waitForFunction(() => { const b = document.getElementById('boot-enter'); return b && !b.classList.contains('hidden'); }, null, { timeout: 120000 });
  const bb = await page.locator('#boot-enter').boundingBox();
  await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.waitForFunction(() => window.__BR.Ui.cur === 'menu', null, { timeout: 30000 });
  await page.evaluate(() => { const B = window.__BR, m = B.MISSIONS[1]; B.Save.data.unlocked = 99; B.Game.start(1, m.primary, m.secondary); });
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 90000 });
  await page.evaluate(() => { window.__BR.Game.countdownT = 0; });
  await page.waitForTimeout(800);
  const pb = await page.locator('.hud-pause').boundingBox();
  const top = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.closest('.hud-pause') ? 'pause' : e.className || e.tagName) : 'none'; }, [pb.x + pb.width / 2, pb.y + pb.height / 2]);
  check(`${w}x${h} touch: the pause button is on top (not covered by the look area)`, top === 'pause', top);
  await page.touchscreen.tap(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.waitForTimeout(400);
  const st = await page.evaluate(() => ({ paused: window.__BR.Game.paused, modal: window.__BR.Ui.modal }));
  check(`${w}x${h} touch: tapping pause pauses the game and opens the pause menu`, st.paused && st.modal === 'm-pause', JSON.stringify(st));
  const rb = await page.locator('#m-pause [data-a=resume]').boundingBox().catch(() => null);
  if (rb) { await page.touchscreen.tap(rb.x + rb.width / 2, rb.y + rb.height / 2); await page.waitForTimeout(400); }
  const after = await page.evaluate(() => ({ paused: window.__BR.Game.paused, modal: window.__BR.Ui.modal }));
  check(`${w}x${h} touch: RESUME continues the game`, !!rb && !after.paused && !after.modal, JSON.stringify(after));
  await page.waitForTimeout(300);
  const lz = await page.evaluate(() => { const r = document.querySelector('.look-zone').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e ? e.className : 'none'; });
  check(`${w}x${h} touch: the look area still works in the middle of the screen`, /look-zone/.test(lz), lz);
  check(`${w}x${h} touch: no errors`, !errors.length, errors.slice(0, 2).join(' | '));
  await page.context().close();
}
await browser.close();
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
