// A killed NPC must stay down (death pose, then sink) while it respawns elsewhere in its spare body.
import { open, shot, sleep } from './harness.mjs';
const { browser, page, log } = await open({ width: 1280, height: 720 });
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 90000 });
await page.click('#boot-enter');
await page.evaluate(() => window.__BR.Game.start(0, 'ak47', 'pistol'));
await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
const r = await page.evaluate(() => {
  const B = window.__BR, G = B.Game, p = G.player; G.countdownT = 0; p.armor = 0.0001;
  const step = (n) => { for (let i = 0; i < n; i++) G.update(1 / 30); };
  const f = G.actors.find((a) => a.bot); f.spawnTime = -99;
  for (const a of G.actors) if (a.bot) { a.bot.shootAt = () => {}; }
  const c = B.Nav.closest({ x: p.pos.x - Math.sin(p.yaw) * 6, y: 0, z: p.pos.z - Math.cos(p.yaw) * 6 });
  f.bot.agent.teleport(c); f.bot.brain.update = () => {}; step(5);
  const deathSpot = f.pos.clone();
  B.Combat.damage(f, 999, p, false, 'ak47');
  const corpseBody = f.bot.body, log = [];
  for (let k = 1; k <= 6; k++) {
    step(30);
    const cb = corpseBody.root;
    log.push(`${k}s alive=${f.alive} corpseVisible=${cb.visible} corpseAt=${Math.hypot(cb.position.x - deathSpot.x, cb.position.z - deathSpot.z).toFixed(2)}m y=${cb.position.y.toFixed(2)} corpseAnim=${corpseBody.anim && corpseBody.anim.getClip().name} activeIsCorpse=${f.bot.body === corpseBody} activeAnim=${f.bot.anim && f.bot.anim.getClip().name} activeAt=${Math.hypot(f.bot.root.position.x - deathSpot.x, f.bot.root.position.z - deathSpot.z).toFixed(1)}m`);
  }
  // camera on the death spot 2 s after death for a screenshot
  return log;
});
console.log(r.join('\n'));
// visual: a fresh kill, frame 2 s later
await page.evaluate(() => {
  const B = window.__BR, G = B.Game, p = G.player, step = (n) => { for (let i = 0; i < n; i++) G.update(1 / 30); };
  const f = G.actors.find((a) => a.bot && a.alive); f.spawnTime = -99; f.bot.brain.update = () => {};
  const c = B.Nav.closest({ x: p.pos.x - Math.sin(p.yaw) * 5, y: 0, z: p.pos.z - Math.cos(p.yaw) * 5 });
  f.bot.agent.teleport(c); step(3); B.Combat.damage(f, 999, p, false, 'ak47'); step(60);
  B.Loop.stop(); B.World.render();
});
await shot(page, 'corpse-2s');
console.log(log.errors);
await browser.close();
