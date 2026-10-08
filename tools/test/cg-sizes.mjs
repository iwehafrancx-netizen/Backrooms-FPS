import { open, shot, sleep } from './harness.mjs';

const save = JSON.stringify({ v: 1, unlocked: 5, missions: { m1: { best: 4200, stars: 2, cleared: true, plays: 1 } }, xp: 5000, cp: 7400, owned: ['shotgun'], played: 3 });
for (const [w, h, touch] of [[800, 450, true], [907, 510, false]]) {
  const { browser, page, log } = await open({ width: w, height: h, touch, save });
  await page.waitForFunction(() => window.__cg && window.__cg.calls.some((c) => c[0] === 'loadingStop'), null, { timeout: 90000 });
  await page.click('#boot-enter'); await sleep(900);
  await shot(page, `cg-${w}-menu`);
  await page.evaluate(() => { const U = window.__BR.Ui; U.selMission = 2; U.show('briefing'); }); await sleep(900);
  await shot(page, `cg-${w}-briefing`);
  await page.evaluate(() => { window.__BR.Ui.gunOffer('ak47', 2); }); await sleep(1800);
  await shot(page, `cg-${w}-offer`);
  await page.evaluate(() => window.__BR.Ui.closeModal());
  await page.evaluate(() => window.__BR.Game.start(2, 'none', 'shotgun'));
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
  await page.evaluate(() => { const G = window.__BR.Game; G.countdownT = 0; }); await sleep(800);
  await shot(page, `cg-${w}-hud`);
  await page.evaluate(() => { const G = window.__BR.Game; G.player.lives = 1; G.player.spawnTime = -99; window.__BR.Combat.damage(G.player, 9999, G.actors.find((a) => a.bot), false, 'ak47'); });
  await page.waitForFunction(() => window.__BR.Ui.modal === 'm-out', null, { timeout: 8000 }); await sleep(500);
  await shot(page, `cg-${w}-out`);
  const over = await page.evaluate(() => [...document.querySelectorAll('.btn, .wcard, .offer-card, .box')].filter((e) => e.offsetParent && (e.getBoundingClientRect().right > innerWidth + 1 || e.getBoundingClientRect().bottom > innerHeight + 1)).map((e) => e.className).slice(0, 6));
  console.log(w, 'x', h, 'overflowing:', over, 'errors:', log.errors);
  await browser.close();
}
