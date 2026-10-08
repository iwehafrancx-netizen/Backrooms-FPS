import { open } from './harness.mjs';

const { browser, page, log } = await open({ width: 640, height: 360 });
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 90000 });
await page.click('#boot-enter');
await page.evaluate(() => { const S = window.__BR.Save; if (S.data.owned && !S.data.owned.includes('ak47')) S.data.owned.push('ak47'); window.__BR.Game.start(0, 'ak47', 'pistol'); });
await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
const res = await page.evaluate(() => {
  const B = window.__BR, G = B.Game, P = B.Player; B.Loop.stop(); B.World.render = () => {};
  for (const a of G.actors) if (a.bot) { a.bot.agent.teleport({ x: 27, y: 0, z: -22 }); a.pos.set(27, 0, -22); a.bot.brain.update = () => {}; a.bot.perceive = () => {}; }
  const start = B.Nav.closest({ x: -20, y: 0, z: 13 });
  const run = (hz) => {
    G.countdownT = 0; P.spawn(G.player, start, Math.PI / 2); P.slot.mag = 30; P.slot.reserve = 999;
    const inp = { mx: 0, my: 1, lookX: 0, lookY: 0, fire: true, ads: false, sprint: false, crouch: false, interact: false };
    B.Input.sample = () => ({ ...inp, pressed: new Set() });
    const fired0 = P.shotsFired, p0 = G.player.pos.clone();
    for (let i = 0; i < hz * 2; i++) G.update(1 / hz);
    return { shots: P.shotsFired - fired0, moved: +G.player.pos.distanceTo(p0).toFixed(2) };
  };
  return { hz60: run(60), hz144: run(144), hz165: run(165) };
});
console.log(JSON.stringify(res));
const ok = Math.abs(res.hz60.shots - res.hz165.shots) <= 1 && Math.abs(res.hz60.moved - res.hz165.moved) < 0.15;
console.log(ok ? 'PASS  same fire rate and movement at 60, 144 and 165 Hz' : 'FAIL  frame-rate dependent', log.errors);
await browser.close();
process.exit(ok ? 0 : 1);
