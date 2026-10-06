// Renders every weapon's viewmodel at hip and aiming down sights.
import { open, shot, sleep } from './harness.mjs';
const { browser, page, log } = await open();
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 60000 });
await page.click('#boot-enter');
await page.evaluate(() => { window.__BR.Save.data.unlocked = 8; window.__BR.Save.data.missions = { m1: { cleared: true }, m2: { cleared: true }, m3: { cleared: true }, m4: { cleared: true } }; });
await page.evaluate(() => window.__BR.Game.start(1, 'ak47', 'pistol'));
await page.waitForFunction(() => window.__BR.Game.state === 'play', null, { timeout: 30000 });
await page.evaluate(() => { const G = window.__BR.Game; G.countdownT = 0; for (const a of G.actors) if (a.bot) a.bot.update = () => {}; });
for (const w of ['ak47', 'm4', 'sniper', 'pistol', 'shotgun']) {
  await page.evaluate((w) => { const P = window.__BR.Player; P.setLoadout(w, w === 'pistol' ? 'shotgun' : 'pistol'); P.equip(0, true); }, w);
  await sleep(700); await shot(page, 'w-' + w + '-hip');
  await page.mouse.move(640, 360); await page.mouse.down({ button: 'right' }); await sleep(900); await shot(page, 'w-' + w + '-ads'); await page.mouse.up({ button: 'right' });
  await sleep(300);
}
console.log('errors', log.errors, log.console.slice(0, 5));
await browser.close();
