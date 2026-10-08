import { open, shot, sleep } from './harness.mjs';

if (process.env.GAME !== 'crazygames') { console.log('run with GAME=crazygames'); process.exit(1); }
const results = [];
const check = (name, ok, info = '') => { results.push([ok, name, info]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${info}`); };
const ready = (page) => page.waitForFunction(() => window.__cg && window.__cg.calls.some((c) => c[0] === 'loadingStop'), null, { timeout: 90000 });
let n = [];
const names = (page) => page.evaluate(() => window.__cg.calls.map((c) => c[0] + (c[1] && typeof c[1] === 'string' ? ':' + c[1] : '')));

{
  const { browser, page, log } = await open({ query: '?debug', lang: 'es-ES' });
  await ready(page);
  const pre = await names(page);
  check('SDK init, then loadingStart, then loadingStop', pre.indexOf('init') === 0 && pre.indexOf('loadingStart') > 0 && pre.indexOf('loadingStop') > pre.indexOf('loadingStart'), pre.slice(0, 6).join(' > '));
  check('no gameplayStart while loading', !pre.includes('gameplayStart'));
  check('language from SDK locale (es-ES → es)', (await page.evaluate(() => document.documentElement.lang)) === 'es');
  const label = await page.textContent('#boot-enter');
  await page.click('#boot-enter');
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 20000 });
  const st = await page.evaluate(() => ({ mi: window.__BR.Game.missionIndex, menu: window.__BR.Ui.cur, slots: window.__BR.Player.slots.map((s) => s.id) }));
  check('new player: one click goes straight into Operation 1', st.mi === 0 && !st.menu, `button "${label}" → mission ${st.mi + 1}, screen ${st.menu}`);
  check('starts with the pistol only', st.slots.join() === 'pistol', st.slots.join());
  check('gameplayStart when the mission is playable', (await names(page)).includes('gameplayStart'));
  await page.evaluate(() => { const G = window.__BR.Game; G.countdownT = 0; G.openPause(); });
  n = await names(page);
  check('gameplayStop on pause', n[n.length - 1] === 'gameplayStop');
  await page.evaluate(() => window.__BR.Game.resume());
  n = await names(page);
  check('gameplayStart on resume', n[n.length - 1] === 'gameplayStart');
  await shot(page, 'cg-quickplay');
  check('no page errors', !log.errors.length, log.errors.join(' | '));
  await browser.close();
}

{
  const { browser, page, log } = await open({});
  await ready(page);
  await page.click('#boot-enter');
  await page.evaluate(() => {
    const B = window.__BR;
    const real = window.CrazyGames.SDK.ad.requestAd;
    window.__adStates = [];
    window.CrazyGames.SDK.ad.requestAd = (type, cb) => { window.__adStates.push([type, B.Game.state, B.Game.paused, B.Game.over]); return real(type, cb); };
  });
  await page.evaluate(() => window.__BR.Game.start(7, 'none', 'pistol'));
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
  const kill = () => page.evaluate(() => { const B = window.__BR, G = B.Game, p = G.player; G.countdownT = 0; p.spawnTime = -99; p.armor = 1; B.Combat.damage(p, 9999, G.actors.find((a) => a.bot), false, 'ak47'); });
  const waitAlive = () => page.evaluate(() => { const G = window.__BR.Game; for (let i = 0; i < 400 && !G.player.alive; i++) G.update(1 / 20); return G.player.alive; });
  await kill(); await waitAlive(); await kill(); await waitAlive();
  const lives = await page.evaluate(() => window.__BR.Game.player.lives);
  await kill();
  await page.waitForFunction(() => window.__BR.Ui.modal === 'm-out', null, { timeout: 8000 });
  check('Holdout: after 3 deaths the REVIVE / RESTART card opens', true, `lives before last death: ${lives}`);
  check('mission is not lost while the card is up', await page.evaluate(() => !window.__BR.Game.over));
  n = await names(page);
  check('gameplayStop when the card opens', n.lastIndexOf('gameplayStop') > n.lastIndexOf('gameplayStart'));
  await shot(page, 'cg-out-card');
  await page.click('#m-out [data-a=revive]');
  await page.waitForFunction(() => window.__BR.Game.player.alive && !window.__BR.Ui.modal, null, { timeout: 8000 });
  const rv = await page.evaluate(() => ({ lives: window.__BR.Game.player.lives, hp: window.__BR.Game.player.hp, ad: window.__adStates[window.__adStates.length - 1] }));
  check('REVIVE plays a rewarded ad, then the player is back with 1 life and full HP', rv.ad[0] === 'rewarded' && rv.lives === 1 && rv.hp === 100, JSON.stringify(rv));
  n = await names(page);
  check('gameplayStart after the revive', n[n.length - 1] === 'gameplayStart');
  await kill();
  await page.waitForFunction(() => window.__BR.Ui.modal === 'm-out', null, { timeout: 8000 });
  await page.evaluate(() => { window.__cg.next = 'error'; });
  await page.click('#m-out [data-a=revive]');
  await sleep(400);
  const er = await page.evaluate(() => ({ alive: window.__BR.Game.player.alive, toast: document.querySelector('#toast').textContent, reviveBtn: !!document.querySelector('#m-out [data-a=revive]'), restartBtn: !!document.querySelector('#m-out [data-a=restart]') }));
  check('ad error: no reward, a message, and the dead REVIVE button is removed', !er.alive && er.toast.length > 0 && !er.reviveBtn && er.restartBtn, JSON.stringify(er));
  await page.evaluate(() => { window.__cg.next = 'finish'; });
  await page.click('#m-out [data-a=restart]');
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting && window.__BR.Game.player.alive && window.__BR.Game.player.lives === 3, null, { timeout: 20000 });
  const lastAd = await page.evaluate(() => window.__adStates[window.__adStates.length - 1]);
  check('RESTART requests a midgame ad, then restarts the mission with full lives', lastAd[0] === 'midgame', JSON.stringify(lastAd));

  await page.evaluate(() => window.__BR.Game.start(1, 'none', 'pistol'));
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
  for (let k = 0; k < 4; k++) { await kill(); await waitAlive(); }
  check('race-to-score mission (Team Deathmatch) never shows the card', await page.evaluate(() => window.__BR.Ui.modal !== 'm-out' && !window.__BR.Game.outCard));

  const cp0 = await page.evaluate(() => window.__BR.Save.data.cp);
  await page.evaluate(() => { const G = window.__BR.Game; G.player.headshots = 4; G.multiKills = 2; G.finish(true, 'r_win'); });
  await page.waitForFunction(() => window.__BR.Ui.cur === 'end', null, { timeout: 15000 });
  const fin = await page.evaluate(() => ({ cp: window.__BR.Save.data.cp, res: window.__BR.Game.result.cp, note: document.querySelector('#end .cp-earned') && document.querySelector('#end .cp-earned').textContent }));
  n = await names(page);
  check('win: happytime, gameplayStop', n.includes('happytime') && n.lastIndexOf('gameplayStop') > n.lastIndexOf('gameplayStart'));
  check('CP earned from the mission, headshots and multi-kills, shown on the end screen', fin.cp - cp0 === fin.res && fin.res >= 4 * 15 + 2 * 30 && !!fin.note, JSON.stringify(fin));
  await shot(page, 'cg-end');
  await page.click('#end [data-a=menu]');
  await page.waitForFunction(() => window.__BR.Ui.cur === 'missions', null, { timeout: 15000 });
  const ends = await page.evaluate(() => window.__adStates);
  check('leaving the end screen requests a midgame ad', ends[ends.length - 1][0] === 'midgame');
  check('no ad was ever requested during active gameplay', ends.every(([type, state, paused, over]) => state !== 'play' || paused || over), JSON.stringify(ends));

  const shop = await page.evaluate(() => {
    const B = window.__BR, S = B.Save; S.data.cp = 12000;
    const A = B.Arsenal;
    const r = { akBefore: A.usable('ak47'), buy: A.buy('ak47'), cpAfter: S.data.cp, akAfter: A.owns('ak47'), sniperBuy: A.canBuy('sniper') };
    A.rent('shotgun', 3); r.rented = A.usable('shotgun');
    return r;
  });
  check('BUY with CP unlocks a gun for good and takes the price', !shop.akBefore && shop.buy && shop.cpAfter === 2000 && shop.akAfter, JSON.stringify(shop));
  check('Sniper can be bought (when you have 22,000 CP)', !shop.sniperBuy && (await page.evaluate(() => { window.__BR.Save.data.cp = 22000; return window.__BR.Arsenal.canBuy('sniper'); })));
  await page.evaluate(() => window.__BR.Game.start(3, 'ak47', 'shotgun'));
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
  const inMission = await page.evaluate(() => window.__BR.Player.slots.map((s) => s.id).join());
  await page.evaluate(() => window.__BR.Game.toMenu('menu'));
  await page.waitForFunction(() => window.__BR.Ui.cur === 'menu', null, { timeout: 15000 });
  check('ad rental works for its mission and is gone after leaving', inMission === 'ak47,shotgun' && !(await page.evaluate(() => window.__BR.Arsenal.usable('shotgun'))), inMission);
  check('saved through the CrazyGames Data module', (await names(page)).includes('data.setItem'));
  const saved = await page.evaluate(() => JSON.parse(window.__cg.data['backrooms.save']));
  check('purchase persisted in the save', saved.owned.includes('ak47'), JSON.stringify(saved.owned));

  const offer = await page.evaluate(() => {
    const B = window.__BR, U = B.Ui, m = B.MISSIONS[4];
    U.deploys = 5; U.lastOffer = null; const a = U.offerPick(m);
    U.lastOffer = 5; U.deploys = 6; const b = U.offerPick(m);
    U.deploys = 7; const c = U.offerPick(m);
    return { a, b, c };
  });
  check('gun offer: shows, skips the next deploy, then shows again (every other mission)', !!offer.a && offer.b === null && !!offer.c, JSON.stringify(offer));
  await page.evaluate(() => { const U = window.__BR.Ui; U.selMission = 4; U.show('briefing'); });
  await sleep(500);
  check('after an ad error, ad buttons stay hidden for 2 minutes', !(await page.evaluate(() => window.__BR.Platform.ads.canReward())));
  await page.evaluate(() => { const now = performance.now.bind(performance); performance.now = () => now() + 125000; });
  await page.evaluate(() => { window.__BR.Ui.gunOffer('m4', 4); });
  await sleep(700);
  await shot(page, 'cg-offer');
  await page.click('#m-offer [data-a=ad]');
  await page.waitForFunction(() => !window.__BR.Ui.modal, null, { timeout: 8000 });
  check('WATCH AD in the offer rents the gun for this mission', await page.evaluate(() => window.__BR.Arsenal.usable('m4') && !window.__BR.Arsenal.owns('m4')));
  await sleep(400);
  await shot(page, 'cg-briefing');
  check('no page errors', !log.errors.length, log.errors.join(' | '));
  await browser.close();
}

{
  const { browser, page, log } = await open({ cg: { muteAudio: true } });
  await ready(page);
  check('SDK muteAudio setting is respected', !(await page.evaluate(() => window.__BR.Game && window.__BR.Audio && window.__BR.Save && window.__BR.Game.state && window.__BR.Ui && window.__BR.Lobby && window.__BR.Platform.isAudioEnabled())));
  await browser.close();
}

{
  const { browser, page, log } = await open({ blockSdk: true, query: '?debug' });
  await page.waitForSelector('#boot-enter:not(.hidden)', { timeout: 90000 });
  await page.click('#boot-enter');
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
  const r = await page.evaluate(() => ({ ads: window.__BR.Platform.ads.canReward(), sdk: window.__BR.Platform.sdkReady }));
  check('ad blocker / no SDK: the game still loads and plays, with no ad buttons', !r.ads && !r.sdk && !log.errors.length, JSON.stringify(r) + ' ' + log.errors.join(' | '));
  await browser.close();
}

const bad = results.filter((r) => !r[0]);
console.log(`\n${results.length - bad.length}/${results.length} checks passed`);
process.exit(bad.length ? 1 : 0);
