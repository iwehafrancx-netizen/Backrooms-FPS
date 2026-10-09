import { open, shot, sleep } from './harness.mjs';
const { browser, page, log } = await open({ query: '?debug&menu=1' });
const t0 = Date.now();
try {
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 60000 });
console.log('gameReady after', Date.now() - t0, 'ms');
await shot(page, '01-boot-ready');
await page.click('#boot-enter');
await sleep(900); await shot(page, '02-menu');
await page.click('#menu [data-a=play]');
await sleep(1200); await shot(page, '03-missions');
await page.click('#missions .mcard:not(.locked)');
await sleep(1500); await shot(page, '04-briefing');
await page.click('#briefing [data-a=deploy]');
await page.waitForFunction(() => window.__BR.Game.state === 'play', null, { timeout: 30000 });
await sleep(1500); await shot(page, '05-countdown');
await sleep(3000); await shot(page, '06-gameplay');
} catch (e) { console.log('FAILED:', e.message); await shot(page, '99-fail'); }
const calls = await page.evaluate(() => window.__yt.calls.map((c) => c[0]));
console.log('sdk calls:', [...new Set(calls)].join(', '));
console.log('external requests:', log.external);
console.log('page errors:', log.errors);
console.log('console:', log.console.slice(0, 20));
await browser.close();
