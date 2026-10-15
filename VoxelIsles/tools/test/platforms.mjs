import { chromium } from 'playwright-core';
import fs from 'node:fs';
const here = new URL('.', import.meta.url).pathname;
const ytMock = fs.readFileSync(here + 'mock-ytgame.js', 'utf8');
const cgMock = fs.readFileSync(here + 'crazygames-test-sdk.js', 'utf8');
const which = process.argv.slice(2);
const targets = which.length ? which : ['youtube', 'crazygames', 'crazygames-basic', 'playgama'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
let allOk = true;
for (const p of targets) {
  console.log(`\n== ${p}`);
  const results = [];
  const check = (name, ok, info = '') => { results.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [], external = [], sent = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { const tx = m.text(), mm = /sendMessage\(\)\s.*\s(\w+)$/.exec(tx); if (mm) sent.push(mm[1]); if (m.type() === 'error' && !/Failed to load resource/.test(tx)) errors.push(tx); });
  await page.route('https://www.youtube.com/game_api/v1', (r) => r.fulfill({ contentType: 'text/javascript', body: ytMock }));
  await page.route('https://sdk.crazygames.com/crazygames-sdk-v3.js', (r) => r.fulfill({ contentType: 'text/javascript', body: cgMock }));
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith('http://localhost:8766/') && !u.startsWith('data:') && !u.startsWith('blob:') && !/youtube\.com\/game_api|sdk\.crazygames\.com/.test(u)) external.push(u); });
  if (p.startsWith('crazygames')) await page.addInitScript(() => { window.__cgConfig = { fast: true }; });
  await page.goto(`http://localhost:8766/builds/${p}/index.html${p === 'playgama' ? '?debug' : ''}`);
  await page.waitForFunction(() => window.__vi && window.__vi.ui && window.__vi.ui.screen === 'menu' && window.__vi.firstFramed, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  const calls = () => page.evaluate(() => (window.__yt ? window.__yt.calls : window.__cg ? window.__cg.calls : []).map((c) => c[0] + (c[1] != null ? ':' + c[1] : '')));
  if (p === 'youtube') {
    const c = await calls();
    const ff = c.indexOf('firstFrameReady'), gr = c.indexOf('gameReady');
    check('firstFrameReady then gameReady, once each', ff >= 0 && gr > ff && c.filter((x) => x === 'gameReady').length === 1 && c.filter((x) => x === 'firstFrameReady').length === 1, c.join(','));
    check('loadData via ytgame', c.includes('loadData'));
    check('language from ytgame', c.includes('getLanguage'));
    check('pause/resume and audio hooks registered', c.includes('onPause') && c.includes('onResume') && c.includes('onAudioEnabledChange'));
    await page.evaluate(() => { window.__yt.audio = false; window.__yt.audioCbs.forEach((f) => f(false)); });
    check('audio-disabled mutes', await page.evaluate(() => window.__vi.audio.muted === true));
    await page.evaluate(() => window.__yt.audioCbs.forEach((f) => f(true)));
  } else if (p.startsWith('crazygames')) {
    const c = await calls();
    check('SDK init + loadingStart + loadingStop', c.includes('init') && c.includes('loadingStart') && c.includes('loadingStop'), c.join(','));
  } else {
    const b = await page.evaluate(() => ({ init: !!(window.bridge && window.bridge.isInitialized), ready: window.__vi && (window.__vi.platformReady ?? null) }));
    check('Playgama Bridge initializes', b.init, JSON.stringify(b));
    check('game_ready sent', sent.includes('game_ready'), sent.join(','));
  }
  await page.click('[data-act=modes]');
  await page.click('[data-act=mode][data-mode=sky]');
  await page.waitForFunction(() => window.__vi.state === 'play' && window.__vi.m, null, { timeout: 30000 });
  check('lobby fills with bots and match starts', await page.evaluate(() => window.__vi.m.actors.length === 8));
  if (p.startsWith('crazygames')) check('gameplayStart on match', (await calls()).includes('gameplayStart'));
  if (p === 'playgama') check('gameplay_started sent', sent.includes('gameplay_started'), sent.join(','));
  await page.evaluate(() => { const a = window.__vi; a.m.kill(a.me, null, 'void'); });
  await page.waitForFunction(() => window.__vi.state === 'results', null, { timeout: 15000 });
  if (p.startsWith('crazygames')) check('gameplayStop on results', (await calls()).includes('gameplayStop'));
  if (p === 'playgama') check('gameplay_stopped sent', sent.includes('gameplay_stopped'), sent.join(','));
  const coins0 = await page.evaluate(() => window.__vi.save.data.coins);
  const dbl = await page.$('[data-act=double]');
  if (p === 'crazygames-basic') check('no rewarded button in Basic', !dbl);
  else if (p === 'youtube' || p === 'crazygames') {
    check('rewarded "double coins" offered', !!dbl);
    if (dbl) { await dbl.click(); await page.waitForTimeout(800); const coins1 = await page.evaluate(() => window.__vi.save.data.coins); check('rewarded doubles coins', coins1 > coins0, `${coins0}->${coins1}`); }
  }
  await page.click('[data-act=again]');
  await page.waitForFunction(() => window.__vi.state === 'lobby' || window.__vi.state === 'play', null, { timeout: 40000 });
  const c2 = await calls();
  if (p === 'crazygames') check('midgame ad on Play again', c2.includes('requestAd:midgame'), c2.filter((x) => x.startsWith('requestAd')).join(','));
  if (p === 'crazygames-basic') check('Basic requests no ads at all', !c2.some((x) => x.startsWith('requestAd')));
  if (p === 'youtube') {
    check('interstitial at Play again', c2.includes('requestInterstitialAd'));
    await page.waitForTimeout(600);
    check('saveData via ytgame', (await calls()).some((x) => x.startsWith('saveData')));
    await page.evaluate(() => window.__yt.pauseCbs.forEach((f) => f()));
    await page.waitForTimeout(200);
    check('onPause suspends audio', await page.evaluate(() => window.__vi.audio.suspended === true));
    await page.evaluate(() => window.__yt.resumeCbs.forEach((f) => f()));
  }
  if (p.startsWith('crazygames')) { await page.waitForTimeout(600); check('save via SDK data', (await calls()).some((x) => x.startsWith('data.setItem'))); }
  check('no external requests', !external.length, external.join(' '));
  check('no page errors', !errors.length, errors.slice(0, 3).join(' | '));
  if (!results.every(Boolean)) allOk = false;
  await ctx.close();
}
console.log(allOk ? '\nALL PLATFORMS PASS' : '\nSOME FAILED');
await browser.close();
