// Bot behaviour simulation: starts a mission, makes the player invulnerable and idle, and lets the AI fight.
// usage: node test/sim.mjs <missionIndex> <seconds>
import { open, shot, sleep } from './harness.mjs';
const mi = +(process.argv[2] || 1), secs = +(process.argv[3] || 40);
const { browser, page, log } = await open();
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 60000 });
await page.click('#boot-enter');
await page.evaluate((mi) => { const B = window.__BR; B.Save.data.unlocked = 8; const m = B.MISSIONS[mi]; B.Game.start(mi, m.primary, m.secondary); }, mi);
await page.waitForFunction(() => window.__BR.Game.state === 'play', null, { timeout: 30000 });
await page.evaluate(() => {
  const B = window.__BR, G = B.Game; G.countdownT = 0; G.player.armor = 0.0001;
  // headless fast-forward: skip rendering, step the simulation in fixed 1/30 s ticks
  B.World._render = B.World.render; B.World.render = () => {};
  window.__step = (n) => { for (let i = 0; i < n && !G.over; i++) G.update(1 / 30); };
});
let n = 0;
for (let q = 0; q < 4; q++) {
  await page.evaluate((k) => window.__step(k), Math.round(secs * 30 / 4));
  await page.evaluate(() => window.__BR.World._render());
  const s = await page.evaluate(() => {
    const G = window.__BR.Game;
    return { t: G.time.toFixed(1), over: G.over, hud: JSON.stringify(G.mode.hud()).slice(0, 160), actors: G.actors.map((a) => `${a.name}:${a.team}:${a.alive ? 'A' : 'd'}:${Math.round(a.hp)}:${a.kills}k:${a.bot ? a.bot.brain.currentState && a.bot.brain.currentState.constructor.name : 'P'}`).join(' ') };
  });
  console.log(JSON.stringify(s));
  await shot(page, `sim${mi}-${n++}`);
}
const fps = await page.evaluate(() => new Promise((r) => { let f = 0; const t = performance.now(); const tick = () => { f++; if (performance.now() - t < 2000) requestAnimationFrame(tick); else r(f / 2); }; requestAnimationFrame(tick); }));
console.log('fps (swiftshader):', fps);
console.log('errors', log.errors, log.console.slice(0, 8));
await browser.close();
