import { open, sleep } from './harness.mjs';
const { browser, page, log } = await open({ query: '?debug&menu=1' });
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 120000 });
await page.click('#boot-enter');
await sleep(500);
for (const map of ['manor', 'station']) {
  const idx = await page.evaluate((map) => window.__BR.MISSIONS.findIndex((m) => m.map === map), map);
  await page.evaluate((i) => { const B = window.__BR, m = B.MISSIONS[i]; B.Save.data.unlocked = 99; B.Game.start(i, m.primary, m.secondary); }, idx);
  const ok = await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 120000 }).then(() => true).catch(() => false);
  const info = await page.evaluate(() => ({ actors: window.__BR.Game.actors.length, meshes: window.__BR.World.mapMeshes.length }));
  console.log(`${ok && info.meshes > 0 && info.actors > 1 ? 'PASS' : 'FAIL'}  ${map} map loads from split parts and the mission starts  — ${JSON.stringify(info)}`);
  await page.evaluate(() => window.__BR.Game.toMenu('menu'));
  await sleep(800);
}
const guns = await page.evaluate(() => Object.keys(window.__BR.Assets.guns).sort().join(','));
console.log(`${/ak47/.test(guns) && /sniper/.test(guns) ? 'PASS' : 'FAIL'}  split gun models (AK-47, sniper) loaded  — ${guns}`);
console.log(`${log.errors.length ? 'FAIL' : 'PASS'}  no page errors ${log.errors.slice(0, 3).join(' | ')}`);
await browser.close();
