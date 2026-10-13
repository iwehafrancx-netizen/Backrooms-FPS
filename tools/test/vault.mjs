import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const check = (name, ok, info = '') => { results.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { window.__cgConfig = { fast: true }; });
await page.route('https://sdk.crazygames.com/crazygames-sdk-v3.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(here, '../crazygames-test-sdk.js'), 'utf8') }));
await page.goto('http://localhost:8765/Backrooms%20FPS%20CrazyGames/index.html?debug&menu=1');
await page.waitForFunction(() => { const b = document.getElementById('boot-enter'); return b && !b.classList.contains('hidden'); }, null, { timeout: 120000 });
await page.click('#boot-enter'); await page.waitForFunction(() => window.__BR.Ui.cur === 'menu');

const run = (c) => page.evaluate(([x, y, z, yaw, jump]) => {
  const B = window.__BR, P = B.Player, a = B.Game.player;
  for (const o of B.Game.actors) if (o.bot) o.alive = false;
  const s = B.Nav.closest({ x, y, z });
  a.pos.set(s.x, s.y, s.z); P.ref = 0; P.vel.set(0, 0, 0); P.vault = null; P.onGround = true; P.jumpY = 0; P.vy = 0; a.yaw = yaw; a.pitch = 0;
  let vaulted = false, maxJ = 0;
  for (let f = 0; f < 110; f++) {
    const pressed = new Set(jump && f === 24 ? ['jump'] : []);
    P.update(1 / 60, { mx: 0, my: 1, lookX: 0, lookY: 0, fire: false, ads: false, sprint: false, crouch: false, interact: false, pressed });
    if (P.vault) vaulted = true; maxJ = Math.max(maxJ, P.jumpY);
  }
  return { x: +a.pos.x.toFixed(2), y: +a.pos.y.toFixed(2), z: +a.pos.z.toFixed(2), vaulted, maxJ: +maxJ.toFixed(2), onGround: P.onGround, nav: !!B.Nav.closest(a.pos) };
}, c);

const start = async (map) => {
  await page.evaluate((id) => { const B = window.__BR, k = B.MISSIONS.findIndex((m) => m.map === id), m = B.MISSIONS[k]; B.Save.data.unlocked = 99; B.Game.start(k, m.primary, m.secondary); }, map);
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 90000 });
  await page.evaluate(() => { window.__BR.Game.countdownT = 0; window.__BR.Loop.stop && window.__BR.Loop.stop(); });
};

await start('manor');
let r = await run([0, 0, 11.4, 0, true]);
check('Jump clears the 0.85 m barrier in the grand hall', r.z < 9.8 && r.vaulted && r.onGround, JSON.stringify(r));
r = await run([0, 0, 11.4, 0, false]);
check('Without jumping the barrier still blocks', r.z > 10.1 && !r.vaulted, JSON.stringify(r));
r = await run([14.5, 0, 2.8, 0, true]);
check('Jump clears the barrier in the east wing', r.z < 1.45 && r.vaulted, JSON.stringify(r));
r = await run([-17, 0, 12.6, Math.PI, true]);
check('Jump clears a library table between the chairs', r.z > 15.7 && r.vaulted && r.onGround, JSON.stringify(r));
r = await run([-12, 0, 5, -Math.PI / 2, true]);
check('A wall can not be jumped', r.x < -9.2 && !r.vaulted, JSON.stringify(r));
r = await run([0, 0, 17.0, 0, true]);
check('A tall display case (1.4 m) can not be jumped', r.z > 15.8 && !r.vaulted, JSON.stringify(r));
r = await run([0, 6, 10.2, 0, true]);
check('Upstairs railing over the atrium can not be jumped into the drop', r.z > 9.2 && Math.abs(r.y - 6) < 0.3 && !r.vaulted, JSON.stringify(r));
r = await run([5, 0, 3, 0.3, true]);
check('A normal jump on open floor lands back on the ground', r.onGround && r.nav, JSON.stringify(r));
check('No errors', !errors.length, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
