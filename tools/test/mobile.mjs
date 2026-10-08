import { open, shot, sleep } from './harness.mjs';
for (const [w, h, tag] of [[844, 390, 'land'], [390, 844, 'port']]) {
  const { browser, page, log } = await open({ width: w, height: h, touch: true });
  await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 90000 });
  await page.tap('#boot-enter'); await sleep(1000); await shot(page, `m-${tag}-menu`);
  await page.tap('#menu [data-a=play]'); await sleep(1300); await shot(page, `m-${tag}-missions`);
  await page.tap('#missions .mcard:not(.locked)'); await sleep(1600); await shot(page, `m-${tag}-briefing`);
  await page.evaluate(() => { const B = window.__BR; B.Game.start(1, 'ak47', 'pistol'); });
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
  await page.evaluate(() => { window.__BR.Game.countdownT = 0; });
  await sleep(2500); await shot(page, `m-${tag}-hud`);
  await page.evaluate(() => window.__BR.Game.openPause()); await sleep(600); await shot(page, `m-${tag}-pause`);
  console.log(tag, log.errors, log.console.slice(0, 4));
  await browser.close();
}
