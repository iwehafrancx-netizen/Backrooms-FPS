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
  check('first quick-play mission: AK-47 + pistol', st.slots.join() === 'ak47,pistol', st.slots.join());
  check('gameplayStart when the mission is playable', (await names(page)).includes('gameplayStart'));
  await page.evaluate(() => { const G = window.__BR.Game; G.countdownT = 0; G.openPause(); });
  n = await names(page);
  check('gameplayStop on pause', n[n.length - 1] === 'gameplayStop');
  await page.evaluate(() => window.__BR.Game.resume());
  n = await names(page);
  check('gameplayStart on resume', n[n.length - 1] === 'gameplayStart');
  await shot(page, 'cg-quickplay');
  await page.evaluate(() => window.__BR.Game.toMenu('menu'));
  await page.waitForFunction(() => window.__BR.Ui.cur === 'menu', null, { timeout: 15000 });
  check('after leaving that mission the AK-47 is locked again', await page.evaluate(() => !window.__BR.Arsenal.usable('ak47') && !window.__BR.Arsenal.owns('ak47')));
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
    const B = window.__BR, S = B.Save; S.data.cp = 2500;
    const A = B.Arsenal;
    const r = { akBefore: A.usable('ak47'), buy: A.buy('ak47'), cpAfter: S.data.cp, akAfter: A.owns('ak47'), sniperBuy: A.canBuy('sniper') };
    A.rent('shotgun', 3); r.rented = A.usable('shotgun');
    return r;
  });
  check('BUY with CP unlocks a gun for good and takes the price', !shop.akBefore && shop.buy && shop.cpAfter === 600 && shop.akAfter, JSON.stringify(shop));
  check('Sniper can be bought (when you have 7,999 CP)', !shop.sniperBuy && (await page.evaluate(() => { window.__BR.Save.data.cp = 7999; return window.__BR.Arsenal.canBuy('sniper'); })));
  await page.evaluate(() => window.__BR.Game.start(3, 'ak47', 'shotgun'));
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
  const inMission = await page.evaluate(() => window.__BR.Player.slots.map((s) => s.id).join());
  await page.evaluate(() => window.__BR.Game.toMenu('menu'));
  await page.waitForFunction(() => window.__BR.Ui.cur === 'menu', null, { timeout: 15000 });
  check('ad rental works for its mission and is gone after leaving', inMission === 'ak47,shotgun' && !(await page.evaluate(() => window.__BR.Arsenal.usable('shotgun'))), inMission);
  check('saved through the CrazyGames Data module', (await names(page)).includes('data.setItem'));
  const saved = await page.evaluate(() => JSON.parse(window.__cg.data['backrooms.save']));
  check('purchase persisted in the save', saved.owned.includes('ak47'), JSON.stringify(saved.owned));

  check('after an ad error, ad buttons stay hidden for 2 minutes', !(await page.evaluate(() => window.__BR.Platform.ads.canReward())));
  await page.evaluate(() => { const now = performance.now.bind(performance); performance.now = () => now() + 125000; });
  const offer = await page.evaluate(() => {
    const B = window.__BR, U = B.Ui, m = B.MISSIONS[4];
    U.lastOffer = null; const a = U.offerPick(m, 5);
    U.lastOffer = 5; const b = U.offerPick(m, 6);
    const c = U.offerPick(m, 7);
    return { a, b, c };
  });
  check('gun offer: shows, skips the next mission, then shows again (every other mission)', !!offer.a && offer.b === null && !!offer.c, JSON.stringify(offer));
  const rot = await page.evaluate(() => { const B = window.__BR, U = B.Ui, m = B.MISSIONS[4], got = []; for (let k = 0; k < 4; k++) { U.lastOffer = null; got.push(U.offerPick(m, 10 + k)); } return [...new Set(got.filter(Boolean))].sort().join(); });
  check('offer rotation includes every locked gun, Sniper too', rot === 'm4,shotgun,sniper', rot);

  await page.evaluate(() => { window.__BR.Save.data.cp = 3500; const U = window.__BR.Ui; U.selMission = 4; U.show('briefing'); });
  await sleep(600);
  const card = await page.evaluate(() => { const c = document.querySelector('#briefing .wcard[data-w="shotgun"] .wbuy'); return c && c.innerText.replace(/\s+/g, ' ').trim(); });
  check('affordable locked gun card reads BUY NOW (price) OR WATCH AD', /^BUY NOW 2,999 CP OR AD WATCH AD THIS MISSION$/.test(card || ''), card);
  await shot(page, 'cg-shop-card');
  await page.click('#briefing .wcard[data-w="shotgun"] [data-buy]');
  const conf = await page.evaluate(() => document.querySelector('#briefing .wcard[data-w="shotgun"] [data-buy]').innerText.replace(/\s+/g, ' ').trim());
  await page.click('#briefing .wcard[data-w="shotgun"] [data-buy]');
  await sleep(300);
  const bought = await page.evaluate(() => ({ owns: window.__BR.Arsenal.owns('shotgun'), cp: window.__BR.Save.data.cp, sel: window.__BR.Ui.loadout.secondary }));
  check('BUY asks to confirm, then buys and equips the gun', /CONFIRM/.test(conf) && bought.owns && bought.cp === 501 && bought.sel === 'shotgun', conf + ' ' + JSON.stringify(bought));
  await page.click('#briefing .wcard[data-w="sniper"] [data-rent]');
  await page.waitForFunction(() => window.__BR.Arsenal.usable('sniper'), null, { timeout: 8000 });
  check('WATCH AD on the card rents the gun for this mission', await page.evaluate(() => window.__BR.Ui.loadout.primary === 'sniper' && !window.__BR.Arsenal.owns('sniper')));
  await page.evaluate(() => { window.__BR.Arsenal.leave(); });
  await page.evaluate(() => { const U = window.__BR.Ui; U.lastOffer = null; U.selMission = 4; U.show('briefing'); });
  await sleep(600);
  await page.click('#briefing [data-a=deploy]');
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
  const atStart = await page.evaluate(() => ({ modal: window.__BR.Ui.modal, gun: window.__BR.Game.offerGun }));
  check('DEPLOY goes straight into the mission (no offer on the mission screen)', !atStart.modal && !!atStart.gun, JSON.stringify(atStart));
  await page.evaluate(() => {
    const B = window.__BR, G = B.Game; G.countdownT = 0;
    const real = B.Input.sample; window.__realSample = real;
    B.Input.sample = (dt) => ({ ...real(dt), my: 1 });
  });
  await page.waitForFunction(() => window.__BR.Ui.modal === 'm-mini', null, { timeout: 8000 });
  await page.evaluate(() => { window.__BR.Input.sample = window.__realSample; });
  n = await names(page);
  const mini = await page.evaluate(() => {
    const box = document.querySelector('#m-mini .mini-box').getBoundingClientRect();
    return { paused: window.__BR.Game.paused, w: Math.round(box.width), h: Math.round(box.height), sw: innerWidth, sh: innerHeight, buttons: [...document.querySelectorAll('#m-mini .btn')].map((b) => b.dataset.a).join(), gun: !!window.__BR.Lobby.display };
  });
  check('in the mission: first move pauses the game and pops a small offer box', mini.paused && n[n.length - 1] === 'gameplayStop' && mini.w < mini.sw * 0.5 && mini.h < mini.sh * 0.75 && mini.gun, JSON.stringify(mini));
  check('the box shows WATCH AD and NO THANKS', mini.buttons === 'ad,no', mini.buttons);
  const eq = await page.evaluate(() => document.querySelector('#m-mini [data-a=ad]').innerText.replace(/\s+/g, ' ').trim());
  check('main button reads EQUIP with a small "Watch an ad" under it', /^EQUIP AD ▶ Watch an ad$/.test(eq), eq);
  await sleep(500);
  await shot(page, 'cg-mini-offer');
  const want = await page.evaluate(() => window.__BR.Ui.lastOffer && document.querySelector('#m-mini .mini-name b').textContent);
  await page.click('#m-mini [data-a=ad]');
  await page.waitForFunction(() => !window.__BR.Ui.modal && !window.__BR.Game.paused, null, { timeout: 8000 });
  const after = await page.evaluate(() => ({ slots: window.__BR.Player.slots.map((s) => s.id + ':' + s.mag).join(), cur: window.__BR.Player.weapon.name }));
  n = await names(page);
  check('WATCH AD puts the gun in your hands with full ammo, game resumes', after.cur === want && n[n.length - 1] === 'gameplayStart', JSON.stringify(after) + ' wanted ' + want);
  await page.evaluate(() => window.__BR.Game.start(4, 'none', 'pistol'));
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
  check('next mission: no offer (every other mission)', await page.evaluate(() => window.__BR.Game.offerGun === null));

  await page.evaluate(() => { const G = window.__BR.Game; G.countdownT = 0; for (const s of window.__BR.Player.slots) { s.mag = 0; s.reserve = 0; } window.__BR.Hud.weapon(); });
  await sleep(500);
  const btn = await page.evaluate(() => { const b = document.querySelector('#hud .ammo-ad'); return { shown: !b.classList.contains('hidden'), low: b.classList.contains('low'), text: b.textContent, hint: document.querySelector('#hud .ammo .reload').textContent }; });
  check('GET AMMO button with an AD badge is on screen, glowing when out of ammo', btn.shown && btn.low && /AD/.test(btn.text) && /GET AMMO/.test(btn.text), JSON.stringify(btn));
  const place = await page.evaluate(() => { const a = document.querySelector('#hud .ammo-ad').getBoundingClientRect(), p = document.querySelector('#hud .hud-pause').getBoundingClientRect(); return { right: Math.round(a.right), pauseLeft: Math.round(p.left), top: Math.round(a.top), pTop: Math.round(p.top) }; });
  check('GET AMMO sits at the top right, just left of the pause button', place.right <= place.pauseLeft && place.pauseLeft - place.right < 16 && Math.abs(place.top - place.pTop) < 4, JSON.stringify(place));
  await shot(page, 'cg-ammo-button');
  await page.keyboard.press('g');
  await page.waitForFunction(() => window.__BR.Player.slots.every((s) => s.mag > 0) && !window.__BR.Game.paused, null, { timeout: 8000 });
  n = await names(page);
  const ammoAd = await page.evaluate(() => window.__adStates[window.__adStates.length - 1]);
  check('pressing G: rewarded ad, all guns refilled, game resumes', ammoAd[0] === 'rewarded' && n[n.length - 1] === 'gameplayStart', JSON.stringify(ammoAd));
  await page.evaluate(() => { for (const s of window.__BR.Player.slots) { s.mag = 0; s.reserve = 0; } window.__cg.next = 'error'; });
  await page.evaluate(() => window.__BR.Game.getAmmo());
  await sleep(500);
  const fail = await page.evaluate(() => ({ mag: window.__BR.Player.slot.mag, paused: window.__BR.Game.paused, toast: document.querySelector('#toast').textContent }));
  check('ad fails: no ammo given, a message, game keeps going', fail.mag === 0 && !fail.paused && fail.toast.length > 0, JSON.stringify(fail));
  const hid = await page.waitForFunction(() => document.querySelector('#hud .ammo-ad').classList.contains('hidden'), null, { timeout: 8000 }).then(() => true, () => false);
  check('GET AMMO hides while ads are unavailable', hid);
  await page.evaluate(() => { window.__cg.next = 'finish'; });
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
