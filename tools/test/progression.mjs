// Kill streak rewards, medals, supply drops, weapon mastery, daily challenges and the end-screen breakdown.
import { open, shot, sleep } from './harness.mjs';
const { browser, page, log } = await open({ width: 1280, height: 720 });
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 90000 });
await page.click('#boot-enter'); await sleep(800);
await shot(page, 'prog-menu');
await page.evaluate(() => window.__BR.Game.start(0, 'ak47', 'pistol'));
await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
const r = await page.evaluate(() => {
  const B = window.__BR, G = B.Game, p = G.player, M = window.__BR.Meta; G.countdownT = 0; p.armor = 0.0001;
  const step = (n) => { for (let i = 0; i < n; i++) G.update(1 / 30); };
  const out = {};
  const foes = G.actors.filter((a) => a.bot);
  for (const f of foes) { f.bot.shootAt = () => {}; f.spawnTime = -99; }
  // 3 quick kills -> double/triple + recon; then 2 more -> adrenaline
  for (let i = 0; i < 5; i++) { const f = foes[i % foes.length]; if (!f.alive) { f.bot.spawn(f.pos); } f.spawnTime = -99; B.Combat.damage(f, 999, p, i === 0, 'ak47'); step(6); }
  out.streak = M.streak; out.recon = M.reconT > 0; out.adren = M.adrenT > 0; out.medals = M.medals.slice();
  out.drops = B.Drops ? B.Drops.list.length : -1;
  // walk onto a drop
  const d = window.__BR.Drops.list[0]; const resBefore = B.Player.slots[0].reserve; B.Player.slots[0].reserve = 10;
  p.pos.set(d.x, 0, d.z); B.Player.ref = 0; step(3);
  out.ammoPicked = B.Player.slots[0].reserve > 10;
  // finish -> commit
  G.finish(true, 'r_win');
  out.mastery = B.Save.data.mastery.ak47; out.daily = B.Save.data.daily; out.result = { missionXp: G.result.missionXp, medalXp: G.result.meta.medalXp };
  return out;
});
console.log(JSON.stringify(r, null, 1));
await page.waitForFunction(() => window.__BR.Ui.cur === 'end', null, { timeout: 15000 }); await sleep(2200);
await shot(page, 'prog-end');
const saved = await page.evaluate(() => JSON.parse(window.__yt.saved));
console.log('saved mastery', JSON.stringify(saved.mastery), 'daily day', saved.daily && saved.daily.day);
console.log('errors', log.errors, log.console.slice(0, 4));
await browser.close();
