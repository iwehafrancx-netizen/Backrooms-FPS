import { open, shot, sleep } from './harness.mjs';
const { browser, page, log } = await open({ width: 960, height: 540 });
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 90000 });
await page.click('#boot-enter');
await page.evaluate(() => window.__BR.Game.start(0, 'ak47', 'pistol'));
await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
const setup = await page.evaluate(() => {
  const B = window.__BR, G = B.Game; G.countdownT = 0; G.player.armor = 0.0001; G.actors.forEach((a) => { a.spawnTime = -99; });
  const foes = G.actors.filter((a) => a.bot);
  for (const f of foes) { f.bot.brain.update = () => {}; f.bot.shootAt = () => {}; }
  const f = foes[0];
  const p = G.player; const yaw = p.yaw;
  const tx = p.pos.x - Math.sin(yaw) * 7, tz = p.pos.z - Math.cos(yaw) * 7;
  const c = B.Nav.closest({ x: tx, y: 0, z: tz });
  f.bot.agent.teleport(c); f.bot.agent.resetMoveTarget();
  p.yaw = Math.atan2(-(c.x - p.pos.x), -(c.z - p.pos.z)); p.pitch = -0.02;
  window.__f = f; return { hp: f.hp, d: Math.hypot(c.x - p.pos.x, c.z - p.pos.z).toFixed(1) };
});
console.log('target placed', setup);
await sleep(600);
const st = () => page.evaluate(() => { const B = window.__BR, G = B.Game; return { yaw: +G.player.yaw.toFixed(3), pitch: +G.player.pitch.toFixed(3), locked: B.Input.st.locked, lf: B.Input.lockFailed, pos: G.player.pos.toArray().map((v) => +v.toFixed(2)), foe: window.__f.pos.toArray().map((v) => +v.toFixed(2)) }; });
console.log('before', JSON.stringify(await st()));
await page.mouse.down(); await sleep(100); console.log('down', JSON.stringify(await st())); await sleep(1600); await shot(page, 'shoot-mid'); await page.mouse.up();
await sleep(500); await shot(page, 'shoot-after');
const r = await page.evaluate(() => { const B = window.__BR, G = B.Game, f = window.__f; return { targetAlive: f.alive, targetHp: Math.round(f.hp), kills: G.player.kills, fired: B.Player.shotsFired, hits: B.Player.shotsHit, mag: B.Player.slot.mag, feed: document.querySelector('.killfeed').textContent }; });
console.log(JSON.stringify(r));
console.log(log.errors, log.console.slice(0, 4));
await browser.close();
