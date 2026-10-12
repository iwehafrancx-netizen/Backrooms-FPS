import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'out/arena');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:8765/Backrooms%20FPS%20Arena%20Lab/index.html';
const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const MOCK = fs.readFileSync(path.join(here, '../crazygames-test-sdk.js'), 'utf8');
const only = process.argv.slice(2);
const run = (s) => !only.length || only.includes(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info = '') => { results.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); };

async function open({ w = 1280, h = 720, query = '?debug&menu=1' } = {}) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  const log = { errors: [] };
  await page.addInitScript(() => { window.__cgConfig = { fast: true }; });
  await page.route(SDK_URL, (r) => r.fulfill({ contentType: 'text/javascript', body: MOCK }));
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') log.errors.push(m.text()); });
  await page.goto(URL + query);
  await page.waitForFunction(() => { const b = document.getElementById('boot-enter'); return b && !b.classList.contains('hidden'); }, null, { timeout: 120000 });
  return { browser, page, log };
}
const inPlay = (page) => page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 60000 });
const start = async (page, i) => { await page.evaluate((k) => { const B = window.__BR, m = B.MISSIONS[k]; B.Game.start(k, m.primary, m.secondary); }, i); await inPlay(page); };

async function view(page, name, pos, look, fov = 70) {
  await page.evaluate(([p, l, f]) => {
    const B = window.__BR, W = B.World; B.Loop.stop();
    document.getElementById('ui').style.visibility = 'hidden'; document.getElementById('hud').style.visibility = 'hidden';
    W.camera.fov = f; W.camera.updateProjectionMatrix(); W.camera.position.set(...p); W.camera.lookAt(...l); W.vmVisible = false; W.render();
  }, [pos, look, fov]);
  await sleep(150);
  await page.screenshot({ path: path.join(OUT, name + '.png') });
}

if (run('look')) {
  const { browser, page, log } = await open();
  await page.click('#boot-enter'); await page.waitForFunction(() => window.__BR.Ui.cur === 'menu');
  await sleep(1500); await page.screenshot({ path: path.join(OUT, '00-menu.png') });
  await start(page, 0);
  await page.evaluate(() => { const G = window.__BR.Game; G.countdownT = 0; for (let i = 0; i < 90; i++) G.update(1 / 30); });
  await view(page, '01-overview', [-30, 11, 20], [6, 0, -4], 75);
  await view(page, '02-overview-east', [30, 11, -20], [-6, 0, 4], 75);
  await view(page, '03-blue-base', [-14, 2.2, 0], [-27, 1.5, 0], 70);
  await view(page, '04-red-base', [14, 2.2, 0], [27, 1.5, 0], 70);
  await view(page, '05-maze', [-12, 1.7, -2], [10, 1.4, 4], 70);
  await view(page, '06-mezzanine', [-24, 5.3, -20.2], [10, 3, -16], 70);
  await view(page, '07-skybridge', [0, 5.3, 16], [0, 3, -16], 70);
  await view(page, '08-stairs', [-12, 1.8, -14], [-22, 2.5, -18], 70);
  await page.evaluate(() => { document.getElementById('ui').style.visibility = ''; document.getElementById('hud').style.visibility = ''; const B = window.__BR; B.World.camera.fov = 80; B.World.camera.updateProjectionMatrix(); B.Loop.start(); });
  await sleep(1500); await page.screenshot({ path: path.join(OUT, '09-ingame.png') });
  check('arena lab boots and CTF 1 starts with no errors', !log.errors.length, log.errors.slice(0, 3).join(' | '));
  await browser.close();
}

if (run('play')) {
  const { browser, page, log } = await open();
  await page.click('#boot-enter'); await page.waitForFunction(() => window.__BR.Ui.cur === 'menu');
  await start(page, 0);
  const stairs = await page.evaluate(() => {
    const B = window.__BR, G = B.Game, P = B.Player, p = G.player;
    G.countdownT = 0; B.World.render = () => {};
    G.mode.drive = () => {};
    for (const a of G.actors) if (a.bot) { a.bot.brain.update = () => {}; a.bot.shootAt = () => {}; }
    p.pos.set(-15.4, 0, -17.5); P.ref = 0; p.yaw = Math.PI / 2; p.pitch = 0;
    const key = (type) => dispatchEvent(new KeyboardEvent(type, { code: 'KeyW', key: 'w', bubbles: true }));
    key('keydown'); const ys = [];
    for (let i = 0; i < 150; i++) { G.update(1 / 30); if (i % 15 === 0) ys.push(+p.pos.y.toFixed(2)); }
    const top = { x: +p.pos.x.toFixed(1), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(1) };
    p.yaw = 0; for (let i = 0; i < 60; i++) G.update(1 / 30);
    const deck = { x: +p.pos.x.toFixed(1), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(1) };
    key('keyup');
    return { ys, top, deck };
  });
  check('player walks up the stairs to the mezzanine (holding W)', stairs.top.y > 3.4 && stairs.deck.y > 3.4 && stairs.deck.z < -18.6, JSON.stringify(stairs));
  const cap = await page.evaluate(() => {
    const B = window.__BR, G = B.Game, M = G.mode, P = B.Player, p = G.player, out = {};
    const tp = (v) => { p.pos.set(v.x, v.y, v.z); P.ref = 0; };
    const step = (n) => { for (let i = 0; i < n; i++) G.update(1 / 30); };
    tp(M.flags.B.home); step(4); out.picked = M.flags.B.holder === p;
    tp({ x: 8, y: 0, z: 0 }); step(2); out.carried = M.flags.B.holder === p;
    p.spawnTime = -99; p.armor = 1; B.Combat.damage(p, 9999, G.actors.find((a) => a.bot && a.team === 'B'), false, 'ak47');
    step(2); out.dropped = M.flags.B.dropped && !M.flags.B.holder && !p.carrying;
    step(30 * 21); out.reset = !M.flags.B.dropped && M.flags.B.pos.distanceTo(M.flags.B.home) < 0.01;
    step(30 * 3); out.alive = p.alive;
    tp(M.flags.B.home); step(4); out.picked2 = M.flags.B.holder === p;
    tp(M.flags.A.home); step(4); out.score = M.score.A; out.flagHome = !M.flags.B.holder && M.flags.B.pos.distanceTo(M.flags.B.home) < 0.01;
    return out;
  });
  check('player CTF cycle: take enemy flag > drop on death > auto-return after 20 s > take again > capture at own dais', cap.picked && cap.carried && cap.dropped && cap.reset && cap.picked2 && cap.score === 1 && cap.flagHome, JSON.stringify(cap));
  check('no errors during the stairs and capture tests', !log.errors.length, log.errors.slice(0, 3).join(' | '));
  await browser.close();
}

if (run('match')) {
  for (const mi of [0, 1]) {
    const { browser, page, log } = await open();
    await page.click('#boot-enter'); await page.waitForFunction(() => window.__BR.Ui.cur === 'menu');
    await start(page, mi);
    await page.evaluate(() => {
      const B = window.__BR, G = B.Game, M = G.mode, p = G.player;
      G.countdownT = 0; B.World.render = () => {}; B.Player.update = () => {};
      p.pos.set(0, -50, 0); if (p.agent) p.agent.teleport({ x: 0, y: -50, z: 0 });
      const a = M.makeBot('A', { weapon: 'm4', role: 'attack' }); a.lives = Infinity; M.spawnActor(a, M.safeSpawn(a, M.zoneFor(a), 12));
      window.__trail = [];
    });
    const t0 = Date.now();
    let res;
    for (let k = 0; k < 80; k++) {
      res = await page.evaluate(() => {
        const B = window.__BR, G = B.Game, M = G.mode;
        for (let i = 0; i < 450 && !G.over; i++) G.update(1 / 30);
        const bots = G.actors.filter((a) => a.bot);
        window.__trail.push(bots.map((a) => [a.pos.x, a.pos.z]));
        return { over: G.over, time: +G.time.toFixed(0), score: { ...M.score }, stats: JSON.parse(JSON.stringify(M.stats)), kills: G.actors.reduce((s, a) => s + (a.kills || 0), 0), result: G.result && { won: G.result.won, reason: G.result.reason } };
      });
      if (res.over) break;
    }
    const moved = await page.evaluate(() => { const t = window.__trail, a = t[0], b = t[t.length - 1]; let n = 0; for (let i = 0; i < a.length && i < b.length; i++) if (Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]) > 2) n++; return `${n}/${a.length}`; });
    const m = mi === 0 ? 'CTF 1 Hangar 9 (5v5)' : 'CTF 2 Night Shift (6v6)';
    console.log(`  ${m}: ${res.over ? 'finished' : 'not finished'} at ${res.time}s game time (${((Date.now() - t0) / 1000).toFixed(0)}s real) · captures blue ${res.score.A} - red ${res.score.B} · pickups ${res.stats.pickups}, drops ${res.stats.drops}, returns ${res.stats.returns}, auto-resets ${res.stats.resets} · kills ${res.kills} · highest bot ${res.stats.maxBotY.toFixed(2)} m · bots that moved ${moved} · result ${JSON.stringify(res.result)}`);
    check(`${m}: match plays to the end with flag captures`, res.over && res.score.A + res.score.B > 0, JSON.stringify(res.score));
    check(`${m}: bots use the upstairs (mezzanine / sky-bridge)`, res.stats.maxBotY > 3.3, res.stats.maxBotY.toFixed(2));
    check(`${m}: no errors`, !log.errors.length, log.errors.slice(0, 3).join(' | '));
    await browser.close();
  }
}

console.log(`${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
