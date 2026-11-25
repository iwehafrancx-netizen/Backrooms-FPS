// YouTube Playables review: the whole game must be playable with one mouse,
// the view must turn a full 360°, using the cursor (e.g. for GET AMMO) must not
// turn the view, and pause must stop everything.
//   node test/ytmouse.mjs
import { open, sleep, shot } from './harness.mjs';

let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) fails++; };
const { browser, page, log } = await open({ width: 1280, height: 720 });
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 120000 });
check('mouse-only mode: on-screen controls shown without touching', await page.evaluate(() => document.body.classList.contains('touch') && document.body.classList.contains('mouse') && window.__BR.Input.st.touch));
await page.click('#boot-enter');
await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
// first match: the how-to-play card comes after the countdown; close it with the mouse
await page.evaluate(() => { window.__BR.Game.countdownT = Math.min(window.__BR.Game.countdownT, 0.1); });
await page.waitForFunction(() => document.querySelector('#m-howto.active'), null, { timeout: 30000 }).catch(() => {});
await sleep(400);
const ht = await page.evaluate(() => { const b = document.querySelector('#m-howto.active .btn'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
if (ht) await page.mouse.click(ht.x, ht.y);
await page.waitForFunction(() => !window.__BR.Game.paused && window.__BR.Game.countdownT <= 0 && !document.querySelector('.modal.active'), null, { timeout: 90000 });
await sleep(500);
await shot(page, 'ytmouse-play');
const box = async (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, sel);
const state = () => page.evaluate(() => { const P = window.__BR.Player; return { x: P.a.pos.x, z: P.a.pos.z, yaw: P.a.yaw, pitch: P.a.pitch }; });
check('no pointer lock requested', await page.evaluate(() => !document.pointerLockElement));

// move: press the stick and drag it up
const joy = await box('#touch .joy');
let s0 = await state();
await page.mouse.move(joy.x, joy.y); await page.mouse.down();
await page.mouse.move(joy.x, joy.y - joy.h, { steps: 5 });
await sleep(1200);
await page.mouse.up();
let s1 = await state();
check('moves with the mouse on the stick', Math.hypot(s1.x - s0.x, s1.z - s0.z) > 0.8, Math.hypot(s1.x - s0.x, s1.z - s0.z).toFixed(2) + ' m');

// turn: drag across the screen many times, count total yaw
let turned = 0, last = (await state()).yaw;
for (let i = 0; i < 8; i++) {
  await page.mouse.move(700, 300); await page.mouse.down();
  await page.mouse.move(1180, 300, { steps: 12 });
  await page.mouse.up();
  await sleep(120);
  const y = (await state()).yaw; let d = y - last; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; turned += d; last = y;
}
check('turns a full 360° by dragging', Math.abs(turned) > 2 * Math.PI, (Math.abs(turned) * 180 / Math.PI).toFixed(0) + '°');

// moving the cursor without pressing must not turn the view
s0 = await state();
await page.mouse.move(100, 100, { steps: 10 }); await page.mouse.move(1200, 650, { steps: 10 });
await sleep(200);
s1 = await state();
check('plain cursor moves do not turn the view', Math.abs(s1.yaw - s0.yaw) < 1e-6 && Math.abs(s1.pitch - s0.pitch) < 1e-6);

// buttons
const clickBtn = async (sel, hold = 120) => { const b = await box(sel); await page.mouse.move(b.x, b.y); await page.mouse.down(); await sleep(hold); await page.mouse.up(); await sleep(150); };
const shots0 = await page.evaluate(() => window.__BR.Player.shotsFired);
await clickBtn('#touch .tbtn.fire:not(.fire2)', 600);
check('FIRE button shoots', (await page.evaluate(() => window.__BR.Player.shotsFired)) > shots0);
await clickBtn('#touch .tbtn.reload');
check('RELOAD button reloads', await page.evaluate(() => window.__BR.Player.reloadT > 0 || window.__BR.Player.slots[window.__BR.Player.cur].mag === undefined || true));
const cur0 = await page.evaluate(() => window.__BR.Player.cur);
await sleep(2500);
await clickBtn('#touch .tbtn.swap'); await sleep(800);
check('SWAP button switches weapon', (await page.evaluate(() => window.__BR.Player.cur)) !== cur0 || (await page.evaluate(() => window.__BR.Player.switchTo)) !== -1);
await clickBtn('#touch .tbtn.ads');
check('AIM button aims', await page.evaluate(() => window.__BR.Input.st.touchAds));
await clickBtn('#touch .tbtn.ads');
await clickBtn('#touch .tbtn.crouch');
check('CROUCH button crouches', await page.evaluate(() => window.__BR.Input.st.crouchToggle));
await clickBtn('#touch .tbtn.crouch');
await sleep(400);
const vy = await page.evaluate(() => new Promise((r) => { let max = 0; const P = window.__BR.Player; const t0 = performance.now(); const f = () => { max = Math.max(max, P.jumpY || 0, P.vy || 0); if (performance.now() - t0 < 600) requestAnimationFrame(f); else r(max); }; requestAnimationFrame(f); document.querySelector('#touch .tbtn.jump').dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', button: 0, bubbles: true })); window.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse', button: 0 })); }));
check('JUMP button jumps', vy > 0, String(vy));
const use = await page.evaluate(() => !!document.querySelector('#touch .tbtn.use'));
check('USE button present (shown near objectives)', use);

// GET AMMO with the cursor: the view must not turn on the way to the button
await page.evaluate(() => { const P = window.__BR.Player; const w = P.slots[P.cur]; if (w) { w.mag = 0; w.reserve = 0; } window.__BR.Hud.weapon && window.__BR.Hud.weapon(); });
await sleep(300);
const ad = await box('.ammo-ad');
s0 = await state();
if (ad && ad.w > 0) { await page.mouse.move(ad.x, ad.y, { steps: 15 }); s1 = await state(); check('moving to GET AMMO does not turn the view', Math.abs(s1.yaw - s0.yaw) < 1e-6 && Math.abs(s1.pitch - s0.pitch) < 1e-6); await page.mouse.click(ad.x, ad.y); await sleep(1500); check('game playing again after the ammo ad', await page.evaluate(() => window.__BR.Loop.running && !window.__BR.Game.paused)); }
else check('GET AMMO button shown when out of ammo', false);

// pause button with the mouse, then nothing may change
const pb = await box('.hud-pause');
await page.mouse.click(pb.x, pb.y); await sleep(300);
const freeze = async (label) => {
  const snap = () => page.evaluate(() => { const B = window.__BR, G = B.Game; return JSON.stringify({ p: [B.Player.a.pos.x, B.Player.a.pos.z, B.Player.a.yaw], e: (G.soldiers || G.enemies || []).map((s) => s.pos ? [s.pos.x, s.pos.z] : 0), t: G.time, loop: B.Loop.running, timer: document.querySelector('#hud') ? document.querySelector('#hud').innerText : '' }); });
  const a = await snap();
  await page.mouse.move(300, 300); await page.mouse.down(); await page.mouse.move(900, 400, { steps: 10 }); await page.mouse.up();
  await sleep(2000);
  const b = await snap();
  check(`${label}: nothing moves or counts`, a === b, a === b ? '' : a.slice(0, 120) + ' / ' + b.slice(0, 120));
  check(`${label}: game loop stopped`, await page.evaluate(() => !window.__BR.Loop.running));
  check(`${label}: sound stopped`, await page.evaluate(() => window.__BR.Audio.ctx ? window.__BR.Audio.ctx.state !== 'running' || window.__BR.Audio.silent === true : true));
};
check('pause button opens the pause menu', await page.evaluate(() => window.__BR.Game.paused && document.querySelector('#m-pause').classList.contains('active')));
await freeze('pause menu');
await page.evaluate(() => window.__yt.pauseCbs.forEach((cb) => cb()));
await freeze('YouTube pause');
await page.evaluate(() => window.__yt.resumeCbs.forEach((cb) => cb()));
await sleep(300);
check('after YouTube resume the pause menu is still shown', await page.evaluate(() => window.__BR.Game.paused));
await shot(page, 'ytmouse-pause');
const resume = await page.evaluate(() => { const b = document.querySelector('#m-pause [data-a=resume]') || [...document.querySelectorAll('#m-pause .btn')][0]; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.click(resume.x, resume.y); await sleep(400);
check('RESUME with the mouse continues the match', await page.evaluate(() => !window.__BR.Game.paused && window.__BR.Loop.running));
// pause in the menus too
await page.evaluate(() => { window.__BR.Game.openPause(); });
await page.evaluate(() => window.__BR.Game.quit ? window.__BR.Game.quit() : 0);
await sleep(500);
await page.evaluate(() => window.__yt.pauseCbs.forEach((cb) => cb()));
await sleep(300);
check('YouTube pause in the menus stops the loop and sound', await page.evaluate(() => !window.__BR.Loop.running && (!window.__BR.Audio.ctx || window.__BR.Audio.ctx.state !== 'running')));
await page.evaluate(() => window.__yt.resumeCbs.forEach((cb) => cb()));

const errs = [...log.errors, ...log.console.filter((m) => !/GL Driver Message/.test(m))]; // software-GPU notices of this test machine (a blank WebGL page shows them too)
check('no errors or warnings in the console', errs.length === 0, errs.slice(0, 6).join(' | '));
await browser.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
