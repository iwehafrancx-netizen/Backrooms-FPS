import { chromium } from 'playwright-core';
const url = process.argv[2] || 'http://localhost:8766/dev/index.html';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${info}`); };
const ev = (f, a) => page.evaluate(f, a);
await page.goto(url);
await page.waitForTimeout(1500);
await ev(() => window.__vi.startLobby('sky', { fast: true, countdown: 0, firstWait: 0, map: 'meadow' }));
await page.waitForFunction(() => window.__vi.m && window.__vi.m.state === 'play', null, { timeout: 20000 });
await ev(() => { const a = window.__vi; a.input.locked = true; for (const o of a.m.actors) if (o !== a.me) { o.ctl = null; o.pos.y = 200; o.vel.y = 0; } a.m.update = ((u) => function (dt) { for (const o of this.actors) if (o !== a.me && o.alive) { o.pos.y = 200; o.vel.y = 0; } return u.call(this, dt); })(a.m.update); });
await page.mouse.move(480, 270);

const p0 = await ev(() => ({ ...window.__vi.me.pos }));
await page.keyboard.down('KeyW'); await page.waitForTimeout(700); await page.keyboard.up('KeyW');
const p1 = await ev(() => ({ ...window.__vi.me.pos }));
check('walk forward', Math.hypot(p1.x - p0.x, p1.z - p0.z) > 1, Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2));

await page.keyboard.down('Space'); await page.waitForTimeout(150);
const jy = await ev(() => window.__vi.me.pos.y);
await page.keyboard.up('Space'); await page.waitForTimeout(800);
check('jump', jy > p1.y + 0.3, (jy - p1.y).toFixed(2));

await ev(() => { const a = window.__vi; a.me.pitch = -1.45; a.me.inv.clear(); a.me.inv.add(112, 1); a.me.sel = 0; });
await page.waitForTimeout(200);
const b0 = await ev(() => window.__vi.me.broken);
await page.mouse.down(); await page.waitForTimeout(2500); await page.mouse.up();
const b1 = await ev(() => ({ broken: window.__vi.me.broken, inv: window.__vi.me.inv.slots.filter(Boolean).map((s) => s.id + 'x' + s.count) }));
check('break block by holding click', b1.broken > b0, JSON.stringify(b1));

await ev(() => { const a = window.__vi; a.me.inv.add(5, 10); a.me.sel = a.me.inv.blockSlot(); a.me.pitch = -0.9; a.me.yaw += 0.6; });
await page.waitForTimeout(200);
const pl0 = await ev(() => window.__vi.me.placed);
await page.mouse.down({ button: 'right' }); await page.waitForTimeout(80); await page.mouse.up({ button: 'right' });
await page.waitForTimeout(200);
const pl1 = await ev(() => window.__vi.me.placed);
check('place block by right click', pl1 > pl0, `${pl0}->${pl1}`);

await page.keyboard.press('Digit3'); await page.waitForTimeout(100);
check('hotbar key 3', (await ev(() => window.__vi.me.sel)) === 2);
await page.mouse.wheel(0, 100); await page.waitForTimeout(100);
check('hotbar wheel', (await ev(() => window.__vi.me.sel)) === 3);

const edge = await ev(() => {
  const a = window.__vi, w = a.m.world, me = a.me;
  const x = Math.floor(me.pos.x), z = Math.floor(me.pos.z), y = Math.floor(me.pos.y) - 1;
  for (let d = 1; d < 12; d++) for (const [dx, dz, yaw] of [[1, 0, -Math.PI / 2], [-1, 0, Math.PI / 2], [0, 1, Math.PI], [0, -1, 0]]) {
    if (!w.get(x + dx * d, y, z + dz * d) && !w.get(x + dx * d, y - 1, z + dz * d) && !w.get(x + dx * d, y - 2, z + dz * d)) { me.yaw = yaw; me.pitch = 0; return { d, yaw }; }
  }
  return null;
});
if (edge) {
  const y0 = await ev(() => window.__vi.me.pos.y);
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW');
  await page.waitForTimeout(edge.d * 800 + 1200);
  await page.keyboard.up('KeyW');
  const y1 = await ev(() => window.__vi.me.pos.y);
  check('sneak stops at edge', Math.abs(y1 - y0) < 0.2, `${y0.toFixed(2)}->${y1.toFixed(2)}`);
  await page.keyboard.up('ShiftLeft');
  await ev(() => { const a = window.__vi; a.me.pitch = -0.35; a.me.yaw += Math.PI; a.me.inv.add(5, 20); a.me.sel = a.me.inv.blockSlot(); });
  await page.waitForTimeout(300);
  await ev(() => { const a = window.__vi; a.uses = []; const u = a.m.use.bind(a.m); a.m.use = (x, c) => { if (x === a.me) a.uses.push(JSON.stringify(a.m.lookHit(a.me))); return u(x, c); }; });
  const pb = await ev(() => window.__vi.me.placed);
  await page.mouse.down({ button: 'right' }); await page.waitForTimeout(1100); await page.mouse.up({ button: 'right' });
  const uses = await ev(() => window.__vi.uses.length);
  check('hold right click repeats placing', uses >= 4 && (await ev(() => window.__vi.me.placed)) - pb >= 1, `${uses} uses`);
} else check('found edge', false);

await ev(() => { const a = window.__vi; const o = a.m.actors[1]; o.alive = true; o.hp = 20; o.airTop = null; o.pos.x = a.me.pos.x; o.pos.y = a.me.pos.y; o.pos.z = a.me.pos.z - 2; o.vel.y = 0; a.m.update = Object.getPrototypeOf(a.m).update; a.me.yaw = 0; a.me.pitch = -0.25; a.me.inv.add(102, 1); a.me.sel = a.me.inv.best('sword'); a.m.actors.forEach((x) => (x.spawnProtect = 0)); });
await page.waitForTimeout(100);
const hp0 = await ev(() => window.__vi.m.actors[1].hp);
await page.mouse.down(); await page.waitForTimeout(120); await page.mouse.up();
await page.waitForTimeout(150);
const hp1 = await ev(() => window.__vi.m.actors[1].hp);
check('melee hit damages', hp1 < hp0, `${hp0}->${hp1}`);

await ev(() => { const a = window.__vi; a.me.hp = 10; a.me.lastHurt = a.m.time; a.me.inv.add(130, 1); a.me.sel = a.me.inv.slots.findIndex((s) => s && s.id === 130); });
await page.mouse.down({ button: 'right' }); await page.waitForTimeout(1300); await page.mouse.up({ button: 'right' });
check('eat golden apple', (await ev(() => window.__vi.me.hp)) >= 17, String(await ev(() => window.__vi.me.hp)));

await ev(() => { window.__vi.input.locked = false; });
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
check('escape pauses', (await ev(() => window.__vi.state)) === 'paused');
const t0 = await ev(() => window.__vi.m.time); await page.waitForTimeout(500);
check('paused freezes match', (await ev(() => window.__vi.m.time)) === t0);
await page.click('[data-act=resume]'); await page.waitForTimeout(300);
check('resume', (await ev(() => window.__vi.state)) === 'play');
await page.screenshot({ path: new URL('./out/play-end.png', import.meta.url).pathname });
console.log(errors.length ? errors.join('\n') : 'no page errors');
console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED');
await browser.close();
