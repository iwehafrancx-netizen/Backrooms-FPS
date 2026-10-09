import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const ZIP = path.join(ROOT, 'dist/backrooms-crazygames.zip');
const QA = path.join(here, 'out/qa');
const GAME_DIR = path.join(QA, 'game');
const SHOTS = path.join(QA, 'shots');
const HOST = 'http://localhost:8765/tools/test/out/qa/host.html';
const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const MOCK = fs.readFileSync(path.join(here, '../crazygames-test-sdk.js'), 'utf8');
const only = process.argv.slice(2);

const results = [];
const todo = [];
let section = '';
const check = (name, ok, info = '') => { results.push({ section, name, ok: !!ok, info: String(info) }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${section}] ${name}${info ? '  ' + info : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (s) => !only.length || only.includes(s);

fs.rmSync(QA, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
execFileSync('unzip', ['-q', '-o', ZIP, '-d', GAME_DIR]);
fs.writeFileSync(path.join(QA, 'host.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>QA host</title>
<style>html,body{margin:0;background:#202020}body{height:3000px}#frame{display:block;border:0;margin:0 auto;background:#000}</style></head><body>
<iframe id="frame" allow="autoplay; pointer-lock; gamepad; fullscreen" scrolling="no"></iframe>
<script>const p=new URLSearchParams(location.search),f=document.getElementById('frame');f.width=p.get('w');f.height=p.get('h');f.src='game/index.html'+(p.get('q')||'');</script></body></html>`);

async function open({ w = 800, h = 450, vw, vh, dpr = 1, touch = false, query = '?debug', save = '', locale = 'en-US', cg = {}, blockSdk = false } = {}) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: vw || (touch ? w : w + 200), height: vh || (touch ? h : h + 200) }, hasTouch: touch, isMobile: touch, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  const log = { errors: [], warnings: [], bad: [], external: [] };
  await page.addInitScript(([c]) => {
    const keep = sessionStorage.getItem('qaKeep');
    window.__cgConfig = { fast: true, ...c, save: keep ? undefined : c.save };
    const AC = window.AudioContext;
    window.__acs = [];
    if (AC) window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__acs.push(this); } };
    window.__locks = 0;
    const rl = HTMLCanvasElement.prototype.requestPointerLock;
    HTMLCanvasElement.prototype.requestPointerLock = function (...a) { window.__locks++; return rl && rl.apply(this, a); };
  }, [{ save, locale, ...cg }]);
  await page.route(SDK_URL, (r) => (blockSdk ? r.abort() : r.fulfill({ contentType: 'text/javascript', body: MOCK })));
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith('http://localhost:8765/') && !u.startsWith('data:') && !u.startsWith('blob:') && u !== SDK_URL) log.external.push(u); });
  page.on('response', (r) => { if (r.status() >= 400) log.bad.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', (r) => { if (r.url() !== SDK_URL) log.bad.push('failed ' + r.url()); });
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !(blockSdk && /Failed to load resource: net::ERR_FAILED/.test(m.text()))) log.errors.push(m.text()); else if (m.type() === 'warning') log.warnings.push(m.text()); });
  const t0 = Date.now();
  await page.goto(`${HOST}?w=${w}&h=${h}&q=${encodeURIComponent(query)}`);
  await page.waitForFunction(() => { const f = document.getElementById('frame'); return f && f.contentWindow && f.contentWindow.document.readyState !== 'loading'; });
  const f = page.frame({ url: /\/game\/index\.html/ });
  return { browser, page, f, log, t0 };
}
const ready = (f, blockSdk) => blockSdk
  ? f.waitForFunction(() => { const b = document.getElementById('boot-enter'); return b && !b.classList.contains('hidden'); }, null, { timeout: 120000 })
  : f.waitForFunction(() => window.__cg && window.__cg.calls.some((c) => c[0] === 'loadingStop'), null, { timeout: 120000 });
const inPlay = (f) => f.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 60000 });
const onScreen = (f, id) => f.waitForFunction((s) => window.__BR.Ui.cur === s, id, { timeout: 30000 });
const calls = (f) => f.evaluate(() => window.__cg ? window.__cg.calls.map((c) => c[0] + (typeof c[1] === 'string' ? ':' + c[1] : '')) : []);
const lastGameplay = async (f) => { const n = (await calls(f)).filter((c) => c === 'gameplayStart' || c === 'gameplayStop'); return n[n.length - 1]; };
const startMission = async (f, i, p = 'none', s = 'pistol') => { await f.evaluate(([a, b, c]) => { window.__BR.Game.start(a, b, c); }, [i, p, s]); await inPlay(f); await f.evaluate(() => { window.__BR.Game.countdownT = 0; }); };
const shotName = (n) => path.join(SHOTS, n.replace(/[^a-z0-9-]+/gi, '_') + '.png');

const audit = (f) => f.evaluate(() => {
  const W = innerWidth, H = innerHeight, out = [], clip = [], tiny = [];
  let min = 99;
  const seen = (e) => { const st = getComputedStyle(e); if (st.visibility === 'hidden' || +st.opacity === 0 || st.display === 'none') return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const visibleChain = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) { const st = getComputedStyle(n); if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity < 0.05) return false; } return true; };
  const label = (e) => (e.id ? '#' + e.id : '') + '.' + String(e.className || e.tagName).split(' ').slice(0, 2).join('.') + ' "' + (e.innerText || '').trim().slice(0, 24) + '"';
  for (const e of document.querySelectorAll('#ui .screen.active *, #ui .modal.active *, #hud *')) {
    if (!seen(e) || !visibleChain(e)) continue;
    if (e.closest('#hud') && !document.body.classList.contains('ingame') && !document.querySelector('#hud.on')) continue;
    const r = e.getBoundingClientRect();
    let inScroll = false; for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const st = getComputedStyle(n); if (/(auto|scroll)/.test(st.overflowY + st.overflowX) && (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)) { inScroll = true; const cr = n.getBoundingClientRect(); if (cr.right > W + 1 || cr.bottom > H + 1) out.push('scroll box ' + label(n)); break; } }
    if (!inScroll && e.matches('.btn, .wcard, .mcard, .box, .offer-card, .mini-box, .ammo-ad, .hud-pause, .tbtn') && (r.right > W + 1 || r.bottom > H + 1 || r.left < -1 || r.top < -1)) out.push(label(e));
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const fs = parseFloat(getComputedStyle(e).fontSize);
    let sc = 1; for (let n = e; n && n !== document.documentElement; n = n.parentElement) { const tf = getComputedStyle(n).transform; if (tf && tf !== 'none') { const m = tf.match(/matrix\(([^,]+),\s*([^,]+)/); if (m) sc *= Math.hypot(+m[1], +m[2]); } }
    const px = fs * sc;
    if (px < min) min = px;
    if (px < 9) tiny.push(label(e) + ' ' + px.toFixed(1) + 'px');
    const st = getComputedStyle(e);
    if ((st.overflow === 'hidden' || st.overflowX === 'hidden' || st.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 2) clip.push(label(e));
  }
  return { out: [...new Set(out)], clip: [...new Set(clip)], tiny: [...new Set(tiny)], min: +min.toFixed(1) };
});

const pressG = (f) => f.evaluate(() => { dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG', key: 'g', bubbles: true })); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyG', key: 'g', bubbles: true })); });
const settle = (f) => f.evaluate(() => Promise.race([
  Promise.all(document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))),
  new Promise((r) => setTimeout(r, 8000)),
]).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
const allTiny = new Map();
async function screens(f, page, tag, opts) {
  const res = {};
  const snap = async (name) => {
    await sleep(400);
    await settle(f);
    await page.screenshot({ path: shotName(`${tag}-${name}`) });
    res[name] = await audit(f);
    if (process.env.QA_DEBUG) console.log(name, await f.evaluate(() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 3); const c = document.getElementById(window.__BR.Ui.cur || 'x'); return [e && (e.id || e.className), window.__BR.Ui.cur, c && c.className, c && getComputedStyle(c).opacity, document.body.className]; }));
  };
  await f.evaluate(() => window.__BR.Game.toMenu('menu'));
  await onScreen(f, 'menu'); await snap('menu');
  await f.evaluate(() => window.__BR.Ui.show('missions')); await onScreen(f, 'missions'); await snap('missions');
  await f.evaluate(() => { const U = window.__BR.Ui; U.selMission = 2; U.show('briefing'); }); await onScreen(f, 'briefing'); await snap('briefing');
  await f.evaluate(() => { window.__BR.Ui.gunOffer('sniper', 2); }); await sleep(900); await snap('gun-offer');
  await f.evaluate(() => window.__BR.Ui.closeModal());
  await f.evaluate(() => window.__BR.Ui.openModal('m-settings')); await snap('settings');
  await f.evaluate(() => window.__BR.Ui.closeModal());
  await startMission(f, 2, 'none', 'pistol');
  await f.evaluate(() => { window.__BR.Hud.root.querySelector('.ammo-ad') && window.__BR.Player.slot && (window.__BR.Player.slot.mag = 1, window.__BR.Player.slot.reserve = 0); });
  await sleep(1200); await snap('hud');
  await f.evaluate(() => { const G = window.__BR.Game; G.player.mag = 0; G.holdForAd(); window.__BR.Ui.miniOffer('m4', G.missionIndex); }); await sleep(900); await snap('mini-offer');
  await f.evaluate(() => { const U = window.__BR.Ui; U.closeModal(); window.__BR.Lobby.showcase(null); window.__BR.Game.releaseAfterAd(); });
  await f.evaluate(() => window.__BR.Game.openPause()); await snap('pause');
  await f.evaluate(() => window.__BR.Game.resume());
  await f.evaluate(() => { const B = window.__BR, G = B.Game; G.player.lives = 1; G.player.spawnTime = -99; G.player.armor = 0; B.Combat.damage(G.player, 9999, G.actors.find((a) => a.bot), false, 'ak47'); });
  await f.waitForFunction(() => window.__BR.Ui.modal === 'm-out', null, { timeout: 10000 }); await snap('out-card');
  await f.evaluate(() => { const B = window.__BR; B.Ui.closeModal(); B.Game.outCard = false; B.Game.paused = false; B.Game.finish(true, 'r_win'); });
  await onScreen(f, 'end'); await sleep(1500); await snap('results');
  const bad = [];
  for (const [k, v] of Object.entries(res)) {
    if (v.out.length) bad.push(`${k}: off-screen ${v.out.join(', ')}`);
    if (v.clip.length) bad.push(`${k}: cut-off text ${v.clip.join(', ')}`);
    for (const t of v.tiny) allTiny.set(t.replace(/ [\d.]+px$/, ''), t);
  }
  const min = Math.min(...Object.values(res).map((v) => v.min));
  check(`${tag}: no button, card or text off-screen or cut off on 10 screens`, !bad.length, bad.slice(0, 6).join(' | '));
  check(`${tag}: smallest text is at least 7 px`, min >= 7, `smallest ${min}px`);
  return res;
}

if (run('A')) {
  section = 'A package';
  check('upload zip exists', fs.existsSync(ZIP), ZIP);
  const list = execFileSync('unzip', ['-Z1', ZIP], { encoding: 'utf8' }).trim().split('\n');
  const files = list.filter((n) => !n.endsWith('/'));
  check('index.html is at the root of the zip', files.includes('index.html'));
  check('file count is under 1500', files.length <= 1500, `${files.length} files`);
  const sizes = files.map((n) => fs.statSync(path.join(GAME_DIR, n)).size);
  const total = sizes.reduce((a, b) => a + b, 0);
  check('initial download under 20 MB (mobile homepage) and 50 MB (hard limit)', total < 20 * 1048576, `${(total / 1048576).toFixed(2)} MB, zip ${(fs.statSync(ZIP).size / 1048576).toFixed(2)} MB`);
  check('nothing dev-only shipped (tests, mock SDK, source maps, sources)', !files.some((n) => /test|mock|\.map$|source-assets|node_modules|\.md$|\.mjs$/i.test(n)), files.filter((n) => /test|mock|\.map$|\.md$|\.mjs$/i.test(n)).join(','));
  const html = fs.readFileSync(path.join(GAME_DIR, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(GAME_DIR, 'game.js'), 'utf8');
  const css = fs.readFileSync(path.join(GAME_DIR, 'css/style.css'), 'utf8');
  const own = html + js + css;
  const urls = [...own.matchAll(/https?:\/\/[^\s'"`)<>]+/g)].map((m) => m[0]).filter((u) => !/w3\.org/.test(u));
  check('only external URL is the CrazyGames SDK', urls.every((u) => u === SDK_URL), [...new Set(urls)].join(', '));
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => u !== SDK_URL);
  check('all file paths are relative', refs.every((u) => !/^(\/|[a-z]+:)/i.test(u)), refs.join(', '));
  const sdkTag = html.indexOf(SDK_URL), firstScript = html.indexOf('<script');
  check('CrazyGames SDK v3 script tag is in <head>, before the game', sdkTag > 0 && sdkTag < html.indexOf('</head>') && firstScript < sdkTag && html.indexOf('game.js') > sdkTag);
  const banned = { 'fullscreen button': /requestFullscreen|webkitRequestFullscreen/, 'window.open / external link': /window\.open\(|target=["']_blank/, 'alert/confirm/prompt': /\b(alert|confirm|prompt)\(/, 'service worker': /serviceWorker/, 'other ad networks': /googlesyndication|adsbygoogle|imasdk|gamedistribution|poki|applovin|unityads/i, 'real-money purchases': /paypal|js\.stripe|checkout\.stripe|\$\d+\.\d\d|\bUSD\b|in-app purchase/i, 'cross-promotion': /play more games|more games|download (the|our) app/i };
  for (const [k, re] of Object.entries(banned)) check(`no ${k}`, !re.test(own), (own.match(re) || [''])[0]);
  check('page title is "Backrooms - FPS", html lang="en"', /<title>Backrooms - FPS<\/title>/.test(html) && /<html lang="en">/.test(html));
  check('debug hook only exists with ?debug', /if \(\/\[\?&\]debug\\b\/\.test\(location\.search\)\) window\.__BR/.test(js));
  const lines = js.split('\n');
  const keysOf = (a, b) => new Set([...lines.slice(a, b).join('\n').matchAll(/([a-zA-Z0-9_]+)\s*:\s*['"`[]/g)].map((m) => m[1]));
  const starts = lines.map((l, i) => [l.match(/^  (en|es|pt|fr): \{$/), i]).filter(([m]) => m).map(([m, i]) => [m[1], i]);
  const groups = [starts.slice(0, 4), starts.slice(4, 8)];
  let missing = [];
  for (const g of groups) {
    if (g.length !== 4) { missing.push('could not find 4 language tables'); continue; }
    const ends = g.map((x, k) => (k < 3 ? g[k + 1][1] : lines.findIndex((l, i) => i > x[1] && /^};$/.test(l))));
    const sets = g.map(([, s], k) => keysOf(s, ends[k]));
    for (let k = 1; k < 4; k++) for (const key of sets[0]) if (!sets[k].has(key)) missing.push(g[k][0] + '.' + key);
  }
  check('every text exists in English, Spanish, Portuguese and French', !missing.length, missing.slice(0, 8).join(', '));
  check('no blood or gore in the game code', !/blood|gore|dismember|decapitat/i.test(js));
  const lic = fs.readFileSync(path.join(GAME_DIR, 'LICENSES.txt'), 'utf8');
  check('LICENSES.txt ships with library credits', /three\.js/.test(lic) && /Yuka/.test(lic) && /recast/i.test(lic));
  const ccby = [...lic.matchAll(/: "([^"]+)" by ([^(\n]+?) \(https[^\n]*\n[^\n]*\n\s*License: CC BY/g)].map((m) => m[2].trim());
  check('every CC BY model author is credited in the game (Settings > Credits)', ccby.length > 0 && ccby.every((a) => js.includes(a)), ccby.join(', '));
  check('LICENSES.txt has a line for every 3D model (no placeholders)', !/<model name>/.test(lic) && ['backroom.glb', 'operator.glb', 'pistol.glb', 'shotgun.glb', 'ak47.glb', 'm4.glb', 'sniper.glb'].every((n) => lic.includes(n)));
  const unknown = (lic.match(/author details not recorded/g) || []).length;
  if (unknown) { todo.push(`${unknown} downloaded models (map, M4, sniper) have no recorded author or license (your choice to skip)`); console.log(`NOTE  [A package] ${unknown} downloaded models have no recorded author/license (owner's choice)`); }
  check('gun prices: Tri-Barrel 2,999, AK-47 1,900, M4 4,999, Sniper 7,999 CP', /const SHOP = \{ shotgun: 2999, ak47: 1900, m4: 4999, sniper: 7999 \};/.test(js));
  check('the old fluorescent hum is gone; menu music file ships in the zip', !/startHum|humNodes/.test(js) && files.includes('assets/Audio/music.mp3'));
}

const SIZES = [
  { w: 800, h: 450, dpr: 1 }, { w: 800, h: 450, dpr: 2 }, { w: 907, h: 510, dpr: 1 }, { w: 907, h: 510, dpr: 2 },
  { w: 1280, h: 720, dpr: 1 }, { w: 844, h: 390, dpr: 3, touch: true }, { w: 390, h: 844, dpr: 3, touch: true },
];

if (run('B')) {
  section = 'B load + first click';
  for (const s of process.env.QA_SIZE ? [SIZES[+process.env.QA_SIZE]] : SIZES) {
    const tag = `${s.w}x${s.h}@${s.dpr}x${s.touch ? '-touch' : ''}`;
    const { browser, page, f, log, t0 } = await open({ ...s });
    await ready(f);
    const loadMs = Date.now() - t0;
    const pre = await calls(f);
    const order = pre.indexOf('init') === 0 && pre.indexOf('loadingStart') > 0 && pre.indexOf('loadingStop') > pre.indexOf('loadingStart');
    check(`${tag}: loads inside an iframe, SDK init > loadingStart > loadingStop`, order, `${(loadMs / 1000).toFixed(1)} s (software GPU)`);
    check(`${tag}: no gameplayStart before the player clicks`, !pre.includes('gameplayStart'));
    const label = await f.textContent('#boot-enter');
    await page.screenshot({ path: shotName(`${tag}-boot`) });
    if (s.touch) await f.tap('#boot-enter'); else await f.click('#boot-enter');
    await inPlay(f);
    const st = await f.evaluate(() => ({ mi: window.__BR.Game.missionIndex, menu: window.__BR.Ui.cur, slots: window.__BR.Player.slots.map((x) => x.id).join() }));
    check(`${tag}: new player, 1 click ("${label}") > Operation 1 with AK-47 + pistol`, st.mi === 0 && !st.menu && st.slots === 'ak47,pistol', JSON.stringify(st));
    check(`${tag}: gameplayStart once the mission is playable`, (await calls(f)).includes('gameplayStart'));
    const cv = await f.evaluate(() => { const c = window.__BR.World.renderer.domElement, cam = window.__BR.World.camera; return { cw: c.clientWidth, ch: c.clientHeight, iw: innerWidth, ih: innerHeight, aspect: cam.aspect, bw: c.width, bh: c.height, dpr: devicePixelRatio }; });
    check(`${tag}: 3D view fills the frame, correct aspect, sharp but capped resolution`, Math.abs(cv.cw - cv.iw) <= 1 && Math.abs(cv.ch - cv.ih) <= 1 && Math.abs(cv.aspect - cv.iw / cv.ih) < 0.01 && cv.bw >= cv.cw * 0.5, JSON.stringify(cv));
    if (s.w === 800 && s.dpr === 1 || s.w === 390 || s.w === 1280 || (s.w === 907 && s.dpr === 2) || s.w === 844) await screens(f, page, tag, s);
    check(`${tag}: no errors, no missing files, no external requests`, !log.errors.length && !log.bad.length && !log.external.length, [...log.errors, ...log.bad, ...log.external].slice(0, 4).join(' | '));
    await browser.close();
  }
  {
    const { browser, page, f, log } = await open({ w: 800, h: 450, locale: 'fr-FR' });
    await ready(f);
    await f.click('#boot-enter'); await inPlay(f);
    await screens(f, page, '800x450-french', {});
    await browser.close();
  }
  {
    const { browser, page, f, log } = await open({ w: 390, h: 844, dpr: 3, touch: true, locale: 'pt-BR' });
    await ready(f);
    await f.tap('#boot-enter'); await inPlay(f);
    await screens(f, page, '390x844-portuguese', {});
    await browser.close();
  }
  const save = JSON.stringify({ v: 1, unlocked: 3, missions: { m1: { best: 4200, stars: 2, cleared: true, plays: 1 } }, xp: 500, cp: 1200, owned: [], played: 2 });
  const { browser, f, log } = await open({ save });
  await ready(f);
  await f.click('#boot-enter');
  await onScreen(f, 'menu');
  check('returning player: ENTER opens the menu (progress kept)', await f.evaluate(() => window.__BR.Ui.cur === 'menu' && window.__BR.Save.data.missions.m1.cleared));
  await browser.close();
}

if (run('D')) {
  section = 'D gameplay events + ads';
  const { browser, page, f, log } = await open({ w: 1280, h: 720, query: '?debug&menu=1' });
  await ready(f);
  await f.click('#boot-enter');
  await onScreen(f, 'menu');
  await f.evaluate(() => {
    const B = window.__BR, S = window.CrazyGames.SDK, real = S.ad.requestAd.bind(S.ad);
    window.__ads = []; window.__hold = null; window.__muted = [];
    const sam = B.Audio.setAdMuted; B.Audio.setAdMuted = (m) => { window.__muted.push(m); return sam(m); };
    S.ad.requestAd = (type, cb) => {
      const n = window.__cg.calls.map((c) => c[0]).filter((c) => c === 'gameplayStart' || c === 'gameplayStop');
      window.__ads.push({ type, loop: B.Loop.running, gp: n[n.length - 1] || 'none', state: B.Game.state, paused: B.Game.paused, over: B.Game.over });
      if (window.__holdNext) { window.__holdNext = false; window.__hold = cb; window.__cg.calls.push(['requestAd', type]); return; }
      return real(type, cb);
    };
  });
  await startMission(f, 2, 'none', 'pistol');
  await f.evaluate(() => { for (const a of window.__BR.Game.actors) if (a.bot) { a.bot.brain.update = () => {}; a.bot.perceive = () => {}; a.bot.shootAt = () => {}; } });
  check('gameplayStart when the mission starts', (await lastGameplay(f)) === 'gameplayStart');
  await f.evaluate(() => window.__BR.Game.openPause());
  check('gameplayStop on pause', (await lastGameplay(f)) === 'gameplayStop');
  await f.evaluate(() => window.__BR.Game.resume());
  check('gameplayStart on resume', (await lastGameplay(f)) === 'gameplayStart');

  await f.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(400);
  const hid = await f.evaluate(() => ({ paused: window.__BR.Game.paused, loop: window.__BR.Loop.running, audio: window.__acs.map((a) => a.state).join() }));
  check('tab hidden: game pauses, loop stops, sound suspended, gameplayStop', hid.paused && !hid.loop && !/running/.test(hid.audio) && (await lastGameplay(f)) === 'gameplayStop', JSON.stringify(hid));
  await f.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(400);
  const back = await f.evaluate(() => ({ paused: window.__BR.Game.paused, modal: window.__BR.Ui.modal, audio: window.__acs.map((a) => a.state).join() }));
  check('tab visible again: waits on the pause menu (no surprise restart), sound back', back.paused && back.modal === 'm-pause' && /running/.test(back.audio), JSON.stringify(back));
  await f.evaluate(() => window.__BR.Game.resume());

  await f.waitForFunction(() => !document.querySelector('#hud .ammo-ad').classList.contains('hidden'), null, { timeout: 10000 });
  await f.evaluate(() => { const s = window.__BR.Player.slot; s.mag = 0; s.reserve = 0; window.__holdNext = true; });
  await pressG(f);
  await f.waitForFunction(() => !!window.__hold, null, { timeout: 5000 });
  await f.evaluate(() => window.__hold.adStarted());
  await sleep(200);
  const during = await f.evaluate(() => {
    const B = window.__BR, a = document.getElementById('adblock'), r = a.getBoundingClientRect(), top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    const kd = new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }); dispatchEvent(kd);
    const inp = B.Input.sample(0.016); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
    return { loop: B.Loop.running, on: a.classList.contains('on'), covers: r.width >= innerWidth - 1 && r.height >= innerHeight - 1, top: top && top.id, muted: window.__muted[window.__muted.length - 1], moveWhileAd: inp.my };
  });
  check('during an ad: loop stopped, screen covered, clicks blocked, sound muted, keys ignored', !during.loop && during.on && during.covers && during.top === 'adblock' && during.muted === true && !during.moveWhileAd, JSON.stringify(during));
  check('during an ad: gameplayStop was sent', (await lastGameplay(f)) === 'gameplayStop');
  await f.evaluate(() => window.__hold.adFinished());
  await sleep(400);
  const after = await f.evaluate(() => ({ loop: window.__BR.Loop.running, paused: window.__BR.Game.paused, muted: window.__muted[window.__muted.length - 1], mag: window.__BR.Player.slot.mag, adblock: document.getElementById('adblock').classList.contains('on') }));
  check('after a rewarded ad: reward given (ammo), game resumes, sound back, gameplayStart', after.loop && !after.paused && after.muted === false && after.mag > 0 && !after.adblock && (await lastGameplay(f)) === 'gameplayStart', JSON.stringify(after));

  await f.evaluate(() => { const s = window.__BR.Player.slot; s.mag = 0; s.reserve = 0; window.__cg.next = 'error'; });
  const reqs = await f.evaluate(() => window.__ads.length);
  await pressG(f);
  await f.waitForFunction((n) => window.__ads.length > n && !window.__BR.Platform.ads.canReward() && window.__BR.Loop.running, reqs, { timeout: 15000 }).catch(() => {});
  await sleep(300);
  const err = await f.evaluate(() => ({ alive: window.__BR.Game.player.alive, mag: window.__BR.Player.slot.mag, toast: document.getElementById('toast').textContent, loop: window.__BR.Loop.running, paused: window.__BR.Game.paused, btnHidden: document.querySelector('#hud .ammo-ad').classList.contains('hidden'), canReward: window.__BR.Platform.ads.canReward() }));
  check('ad error: no reward, a message, game resumes, ad button hides (no dead button)', err.mag === 0 && err.toast.length > 0 && err.loop && !err.paused && err.btnHidden && !err.canReward, JSON.stringify(err));
  await f.evaluate(() => { window.__cg.next = 'finish'; const now = performance.now.bind(performance); performance.now = () => now() + 125000; });

  await f.evaluate(() => { window.__holdNext = true; });
  await f.evaluate(() => { const G = window.__BR.Game; G.holdForAd(); window.__p = window.__BR.Platform.ads.rewarded().then((ok) => { window.__rw = ok; G.releaseAfterAd(); }); });
  await f.waitForFunction(() => !!window.__hold, null, { timeout: 5000 });
  await sleep(31000);
  const timeout = await f.evaluate(() => ({ rw: window.__rw, loop: window.__BR.Loop.running, adblock: document.getElementById('adblock').classList.contains('on') }));
  check('an ad that never starts gives up after 30 s and the game carries on (no reward)', timeout.rw === false && timeout.loop && !timeout.adblock, JSON.stringify(timeout));
  await f.evaluate(() => { const now = performance.now.bind(performance); performance.now = () => now() + 125000; });

  await f.evaluate(() => { const B = window.__BR; B.Game.finish(true, 'r_win'); });
  await onScreen(f, 'end');
  check('win: happytime + gameplayStop', (await calls(f)).includes('happytime') && (await lastGameplay(f)) === 'gameplayStop');
  await f.click('#end [data-a=menu]');
  await onScreen(f, 'missions');
  const ads = await f.evaluate(() => window.__ads);
  check('leaving results plays a midgame ad', ads[ads.length - 1].type === 'midgame');
  check('every ad (midgame and rewarded) was requested with gameplay stopped', ads.every((a) => !a.loop && a.gp === 'gameplayStop'), JSON.stringify(ads));
  check('no midgame ad during active play (only at breaks)', ads.filter((a) => a.type === 'midgame').every((a) => a.state !== 'play' || a.over || a.paused), JSON.stringify(ads.filter((a) => a.type === 'midgame')));
  const n = (await calls(f)).filter((c) => c === 'gameplayStart' || c === 'gameplayStop');
  const dbl = n.findIndex((c, i) => i && c === n[i - 1]);
  check('gameplayStart / gameplayStop never sent twice in a row', dbl < 0, dbl < 0 ? `${n.length} events` : `at ${dbl}: ${n.slice(Math.max(0, dbl - 3), dbl + 2).join(' > ')}`);
  check('no errors', !log.errors.length, log.errors.slice(0, 4).join(' | '));
  await browser.close();
}

if (run('F')) {
  section = 'F ad blocker + Basic Launch';
  {
    const { browser, page, f, log } = await open({ w: 800, h: 450, blockSdk: true });
    await ready(f, true);
    await f.click('#boot-enter');
    await inPlay(f);
    check('SDK blocked (ad blocker): game still loads and one click starts Operation 1', await f.evaluate(() => window.__BR.Game.missionIndex === 0));
    await f.evaluate(() => { window.__BR.Game.countdownT = 0; const s = window.__BR.Player.slot; s.mag = 0; s.reserve = 0; }); await sleep(800);
    check('ad blocker: no GET AMMO button', await f.evaluate(() => document.querySelector('#hud .ammo-ad').classList.contains('hidden')));
    await f.evaluate(() => { const B = window.__BR; B.Game.finish(true, 'r_win'); });
    await onScreen(f, 'end');
    await f.click('#end [data-a=menu]');
    await onScreen(f, 'missions');
    await f.evaluate(() => { const U = window.__BR.Ui; U.selMission = 2; U.show('briefing'); }); await onScreen(f, 'briefing'); await sleep(500);
    const b = await f.evaluate(() => ({ rent: document.querySelectorAll('#briefing [data-rent]').length, buy: document.querySelectorAll('#briefing [data-buy]').length, offer: window.__BR.Ui.offerPick(window.__BR.MISSIONS[2], 9) }));
    check('ad blocker: no WATCH AD buttons, BUY with CP still there, no gun offer', b.rent === 0 && b.buy > 0 && b.offer === null, JSON.stringify(b));
    await f.click('#briefing [data-a=deploy]');
    await inPlay(f);
    await f.evaluate(() => { const B = window.__BR, G = B.Game; G.countdownT = 0; G.player.lives = 1; G.player.spawnTime = -99; G.player.armor = 0; B.Combat.damage(G.player, 9999, G.actors.find((a) => a.bot), false, 'ak47'); });
    await f.waitForFunction(() => window.__BR.Ui.modal === 'm-out', null, { timeout: 10000 });
    const o = await f.evaluate(() => ({ revive: !!document.querySelector('#m-out [data-a=revive]'), restart: !!document.querySelector('#m-out [data-a=restart]') }));
    check('ad blocker: out of lives shows RESTART only (no dead REVIVE)', !o.revive && o.restart, JSON.stringify(o));
    await f.click('#m-out [data-a=restart]');
    await f.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting && window.__BR.Game.player.alive && !window.__BR.Ui.modal, null, { timeout: 30000 });
    check('ad blocker: RESTART works', true);
    const saved = await f.evaluate(() => { try { return !!localStorage.getItem('backrooms.save'); } catch (e) { return false; } });
    check('ad blocker: progress saved to browser storage instead', saved);
    await page.evaluate(() => sessionStorage.setItem('qaKeep', '1'));
    await page.reload();
    const f2 = page.frame({ url: /\/game\/index\.html/ });
    await ready(f2, true);
    check('ad blocker: progress survives a reload', await f2.evaluate(() => !!(window.__BR.Save.data.missions.m1 && window.__BR.Save.data.missions.m1.cleared)));
    check('ad blocker: no errors or missing files (only the blocked SDK fails)', !log.errors.length && !log.external.length && !log.bad.length, [...log.errors, ...log.external, ...log.bad].slice(0, 4).join(' | '));
    await browser.close();
  }
  {
    const { browser, page, f, log } = await open({ w: 800, h: 450, query: '?debug&menu=1', cg: { environment: 'crazygames', next: 'error' }, save: JSON.stringify({ v: 1, unlocked: 12, missions: {}, xp: 0, cp: 6500, owned: [], played: 3 }) });
    await ready(f);
    await f.click('#boot-enter');
    await onScreen(f, 'menu');
    const startable = [];
    const total = await f.evaluate(() => window.__BR.MISSIONS.length);
    for (let i = 0; i < total; i++) {
      await f.evaluate((k) => { const U = window.__BR.Ui; U.selMission = k; U.show('briefing'); }, i); await onScreen(f, 'briefing'); await sleep(250);
      const rent = await f.$('#briefing [data-rent]');
      if (i === 0 && rent) { await rent.click(); await sleep(500); }
      await f.click('#briefing [data-a=deploy]');
      await inPlay(f);
      await f.evaluate(() => { const G = window.__BR.Game; G.countdownT = 0; for (let k = 0; k < 30; k++) G.update(1 / 30); });
      const ok = await f.evaluate(() => window.__BR.Game.state === 'play' && window.__BR.Player.slots.length > 0);
      startable.push(ok ? 1 : 0);
      await f.evaluate(() => window.__BR.Game.toMenu('missions')); await onScreen(f, 'missions');
    }
    check(`Basic Launch (every ad fails): all ${total} missions can be started from DEPLOY without an ad`, startable.every(Boolean), startable.join(''));
    check('Basic Launch: after the first failed ad, WATCH AD buttons hide', await f.evaluate(() => !window.__BR.Platform.ads.canReward()));
    await f.evaluate(() => { const U = window.__BR.Ui; U.selMission = 2; U.show('briefing'); }); await onScreen(f, 'briefing'); await sleep(400);
    const noRent = await f.evaluate(() => document.querySelectorAll('#briefing [data-rent]').length);
    check('Basic Launch: no WATCH AD on the loadout while ads are failing', noRent === 0, `${noRent} visible`);
    await f.click('#briefing .wcard[data-w="shotgun"] [data-buy]'); await f.click('#briefing .wcard[data-w="shotgun"] [data-buy]'); await sleep(300);
    check('Basic Launch: guns can still be bought with CP', await f.evaluate(() => window.__BR.Arsenal.owns('shotgun')));
    await f.click('#briefing [data-a=deploy]'); await inPlay(f);
    await f.evaluate(() => { const B = window.__BR, G = B.Game; G.countdownT = 0; G.player.lives = 1; G.player.spawnTime = -99; G.player.armor = 0; B.Combat.damage(G.player, 9999, G.actors.find((a) => a.bot), false, 'ak47'); });
    await f.waitForFunction(() => window.__BR.Ui.modal === 'm-out', null, { timeout: 10000 });
    check('Basic Launch: out card shows RESTART only', await f.evaluate(() => !document.querySelector('#m-out [data-a=revive]') && !!document.querySelector('#m-out [data-a=restart]')));
    await f.click('#m-out [data-a=restart]');
    await f.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting && window.__BR.Game.player.alive && !window.__BR.Ui.modal, null, { timeout: 30000 });
    check('Basic Launch: RESTART still restarts when the midgame ad fails', true);
    check('Basic Launch: no errors', !log.errors.length, log.errors.slice(0, 4).join(' | '));
    await browser.close();
  }
}

if (run('G')) {
  section = 'G sound + language';
  {
    const { browser, page, f } = await open({ w: 800, h: 450, query: '?debug&menu=1', cg: { muteAudio: true } });
    await ready(f);
    await f.click('#boot-enter'); await onScreen(f, 'menu'); await sleep(500);
    const a = await f.evaluate(() => window.__acs.map((x) => x.state).join());
    check('CrazyGames "mute" setting on at load: game stays silent', a && !/running/.test(a), a);
    await f.evaluate(() => window.__cg.settingsCbs.forEach((cb) => cb({ muteAudio: false }))); await sleep(400);
    const b = await f.evaluate(() => window.__acs.map((x) => x.state).join());
    await f.evaluate(() => window.__cg.settingsCbs.forEach((cb) => cb({ muteAudio: true }))); await sleep(400);
    const c = await f.evaluate(() => window.__acs.map((x) => x.state).join());
    check('mute setting changed live: sound follows it', /running/.test(b) && !/running/.test(c), `${b} > ${c}`);
    await browser.close();
  }
  for (const [loc, lang, word] of [['es-ES', 'es', /JUGAR|ENTRAR|CAMPAÑA/], ['pt-BR', 'pt', /JOGAR|ENTRAR|CAMPANHA/], ['fr-FR', 'fr', /JOUER|ENTRER|CAMPAGNE/], ['de-DE', 'en', /PLAY|ENTER|CAMPAIGN/]]) {
    const { browser, f } = await open({ w: 800, h: 450, query: '?debug&menu=1', locale: loc });
    await ready(f);
    await f.click('#boot-enter'); await onScreen(f, 'menu'); await sleep(400);
    const got = await f.evaluate(() => ({ lang: document.documentElement.lang, txt: document.getElementById('menu').innerText.toUpperCase() }));
    check(`locale ${loc} > ${lang === 'en' ? 'English fallback' : lang}`, got.lang === lang && word.test(got.txt), got.lang);
    await browser.close();
  }
}

if (run('H')) {
  section = 'H controls + page';
  const { browser, page, f, log } = await open({ w: 800, h: 450, query: '?debug&menu=1' });
  await ready(f);
  await f.click('#boot-enter'); await onScreen(f, 'menu');
  await page.mouse.move(500, 300); await page.mouse.wheel(0, 800); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Space'); await page.keyboard.press('PageDown'); await sleep(300);
  check('menus: wheel, arrows, Space, PageDown never scroll the host page', (await page.evaluate(() => scrollY)) === 0, `scrollY ${await page.evaluate(() => scrollY)}`);
  await startMission(f, 0, 'ak47', 'pistol');
  await f.click('#view canvas', { position: { x: 400, y: 225 } }).catch(() => {});
  await sleep(300);
  check('click in game asks for mouse lock', (await f.evaluate(() => window.__locks)) > 0, `${await f.evaluate(() => window.__locks)} requests`);
  await page.mouse.wheel(0, 800);
  for (const k of ['ArrowDown', 'ArrowUp', 'Space', 'PageDown', 'Tab']) await page.keyboard.press(k);
  await sleep(300);
  check('in game: wheel, arrows, Space, PageDown, Tab never scroll the host page', (await page.evaluate(() => scrollY)) === 0, `scrollY ${await page.evaluate(() => scrollY)}`);
  const ctxm = await f.evaluate(() => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); window.__BR.World.renderer.domElement.dispatchEvent(e); return e.defaultPrevented; });
  check('right-click menu is blocked in game', ctxm);
  const az = await f.evaluate(() => {
    const I = window.__BR.Input, ev = (t, code, key) => dispatchEvent(new KeyboardEvent(t, { code, key, bubbles: true }));
    I.sample(0); ev('keydown', 'KeyW', 'z'); ev('keydown', 'KeyA', 'q'); const a = I.sample(0.016); ev('keyup', 'KeyW', 'z'); ev('keyup', 'KeyA', 'q');
    ev('keydown', 'ArrowUp', 'ArrowUp'); const b = I.sample(0.016); ev('keyup', 'ArrowUp', 'ArrowUp');
    ev('keydown', 'KeyW', 'w'); dispatchEvent(new Event('blur')); const c = I.sample(0.016);
    return { azerty: [a.mx, a.my], arrows: b.my, afterBlur: c.my };
  });
  check('AZERTY keyboards: Z/Q move forward/left (physical keys), arrow keys also move', az.azerty[0] < -0.5 && az.azerty[1] > 0.5 && az.arrows === 1, JSON.stringify(az));
  check('switching window releases held keys (no stuck movement)', az.afterBlur === 0, JSON.stringify(az));
  await page.keyboard.press('Escape'); await sleep(500);
  const esc = await f.evaluate(() => ({ paused: window.__BR.Game.paused, modal: window.__BR.Ui.modal, locked: !!document.pointerLockElement }));
  check('Esc pauses the game and frees the mouse', esc.paused && esc.modal === 'm-pause' && !esc.locked, JSON.stringify(esc));
  await f.evaluate(() => window.__BR.Game.resume());
  await page.evaluate(() => { const fr = document.getElementById('frame'); fr.width = 1280; fr.height = 720; });
  await sleep(1200);
  const rs = await f.evaluate(() => { const c = window.__BR.World.renderer.domElement, cam = window.__BR.World.camera; return { cw: c.clientWidth, ch: c.clientHeight, iw: innerWidth, ih: innerHeight, aspect: +cam.aspect.toFixed(3) }; });
  check('resizing the frame mid-game: picture refits, no stretching', rs.iw === 1280 && Math.abs(rs.cw - 1280) <= 1 && Math.abs(rs.ch - 720) <= 1 && Math.abs(rs.aspect - 1280 / 720) < 0.01, JSON.stringify(rs));
  await page.screenshot({ path: shotName('resize-1280x720') });
  check('no errors', !log.errors.length, log.errors.slice(0, 4).join(' | '));
  await browser.close();
  {
    const { browser, page, f } = await open({ w: 800, h: 450, query: '?debug&menu=1' });
    await page.addInitScript(() => { HTMLCanvasElement.prototype.requestPointerLock = function () { return Promise.reject(new Error('blocked')); }; });
    await page.reload();
    const f2 = page.frame({ url: /\/game\/index\.html/ });
    await ready(f2);
    await f2.click('#boot-enter'); await onScreen(f2, 'menu');
    await startMission(f2, 0, 'none', 'pistol');
    const fb = await f2.evaluate(async () => {
      const B = window.__BR, I = B.Input, cv = B.World.renderer.domElement;
      for (let k = 0; k < 4; k++) { cv.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })); window.dispatchEvent(new MouseEvent('mouseup', { button: 0 })); await new Promise((r) => setTimeout(r, 60)); }
      I.st.lookX = 0; dispatchEvent(new MouseEvent('mousemove', { movementX: 50 }));
      return { fallback: I.lockFailed, look: I.st.lookX };
    });
    check('a browser that never allows mouse lock still plays (free mouse-look after 3 refusals)', fb.fallback && fb.look === 50, JSON.stringify(fb));
    await browser.close();
  }
}

if (run('J')) {
  section = 'J saving';
  {
    const { browser, page, f, log } = await open({ w: 800, h: 450 });
    await ready(f);
    await f.click('#boot-enter'); await inPlay(f);
    await f.evaluate(() => { const G = window.__BR.Game; G.countdownT = 0; G.finish(true, 'r_win'); });
    await onScreen(f, 'end'); await sleep(500);
    const cp = await f.evaluate(() => window.__BR.Save.data.cp);
    check('progress is written through the CrazyGames Data module', (await calls(f)).includes('data.setItem'));
    await page.evaluate(() => sessionStorage.setItem('qaKeep', '1'));
    await page.reload();
    const f2 = page.frame({ url: /\/game\/index\.html/ });
    await ready(f2);
    const s = await f2.evaluate(() => ({ cleared: !!(window.__BR.Save.data.missions.m1 && window.__BR.Save.data.missions.m1.cleared), cp: window.__BR.Save.data.cp, read: window.__cg.calls.some((c) => c[0] === 'data.getItem') }));
    check('reload: progress and CP come back from the Data module', s.cleared && s.cp === cp && s.read, JSON.stringify(s));
    await f2.click('#boot-enter'); await onScreen(f2, 'menu');
    check('reload: returning player lands on the menu, not a forced mission', await f2.evaluate(() => window.__BR.Ui.cur === 'menu'));
    await browser.close();
  }
  for (const [name, save] of [['broken JSON', '{not json'], ['wrong types', '{"v":1,"missions":null,"cp":"lots","owned":7,"settings":"x","loadout":{"primary":"laser"}}'], ['bad mission records', '{"v":1,"missions":{"m1":null,"m2":5},"settings":{"volume":"loud"}}'], ['empty object', '{}']]) {
    const { browser, f, log } = await open({ w: 800, h: 450, save });
    await ready(f);
    await f.click('#boot-enter');
    await f.waitForFunction(() => (window.__BR.Game.state === 'play' && !window.__BR.Game.starting) || window.__BR.Ui.cur === 'menu', null, { timeout: 60000 });
    check(`corrupted save (${name}): game still starts, no errors`, !log.errors.length, log.errors.slice(0, 3).join(' | '));
    await browser.close();
  }
}

if (run('P')) {
  section = 'P shop + soldiers';
  const { browser, page, f, log } = await open({ w: 800, h: 450, query: '?debug&menu=1', save: JSON.stringify({ v: 1, unlocked: 12, missions: {}, xp: 0, cp: 2000, owned: [], played: 3 }) });
  await ready(f);
  await f.click('#boot-enter'); await onScreen(f, 'menu');
  await f.evaluate(() => { const U = window.__BR.Ui; U.selMission = 2; U.show('briefing'); }); await onScreen(f, 'briefing'); await settle(f);
  const cards = await f.evaluate(() => Object.fromEntries(['ak47', 'shotgun', 'm4', 'sniper'].map((id) => { const b = document.querySelector(`#briefing .wcard[data-w="${id}"] [data-buy]`); return [id, b ? { txt: b.innerText.replace(/\s+/g, ' ').trim(), can: b.classList.contains('can'), bg: getComputedStyle(b).backgroundColor } : null]; })));
  await page.screenshot({ path: shotName('shop-buy-now') });
  check('2,000 CP: AK-47 shows a green BUY NOW with the price', cards.ak47 && cards.ak47.can && /^BUY NOW 1,900 CP$/.test(cards.ak47.txt) && cards.ak47.bg !== cards.m4.bg, JSON.stringify(cards));
  check('2,000 CP: Tri-Barrel, M4 and Sniper show a dim BUY with their price (not affordable yet)', !cards.shotgun.can && /^BUY 2,999 CP$/.test(cards.shotgun.txt) && !cards.m4.can && /^BUY 4,999 CP$/.test(cards.m4.txt) && !cards.sniper.can && /^BUY 7,999 CP$/.test(cards.sniper.txt), JSON.stringify([cards.shotgun, cards.m4, cards.sniper]));
  await f.click('#briefing .wcard[data-w="ak47"] [data-buy]'); await f.click('#briefing .wcard[data-w="ak47"] [data-buy]'); await sleep(300);
  check('BUY NOW: confirm tap buys the AK-47 for 1,900 CP', await f.evaluate(() => window.__BR.Arsenal.owns('ak47') && window.__BR.Save.data.cp === 100));

  await f.evaluate(() => window.__BR.Game.start(1, 'ak47', 'pistol'));
  await inPlay(f);
  await f.waitForFunction(() => window.__BR.Game.countdownT > 0 && window.__BR.Game.countdownT < 2.3, null, { timeout: 30000 });
  const cd = await f.evaluate(() => {
    const B = window.__BR, G = B.Game, src = {};
    B.Assets.npc.scene.traverse((o) => { if (o.isBone) src[o.name] = o.quaternion; });
    return { countdown: G.countdownT, bots: G.actors.filter((a) => a.bot).map((a) => {
      let arm = null; a.bot.model.traverse((o) => { if (!arm && o.isBone && /RightArm$/.test(o.name)) arm = o; });
      const rest = src[arm.name];
      return { t: +a.bot.mixer.time.toFixed(2), anim: a.bot.anim && a.bot.anim.getClip().name, moved: +(2 * Math.acos(Math.min(1, Math.abs(arm.quaternion.dot(rest))))).toFixed(2) };
    }) };
  });
  await page.screenshot({ path: shotName('countdown-squad') });
  check('during the 3-2-1 countdown every soldier is animated in the gun pose (no T-pose)', cd.countdown > 0 && cd.bots.length > 0 && cd.bots.every((b) => b.t > 0.3 && b.anim === 'aim_idle' && b.moved > 0.2), JSON.stringify(cd).slice(0, 300));

  await f.evaluate(() => { const G = window.__BR.Game; G.countdownT = 0; for (const a of G.actors) if (a.bot) { a.bot.brain.update = () => {}; a.bot.perceive = () => {}; a.bot.shootAt = () => {}; } });
  const air = await f.evaluate(() => {
    const B = window.__BR, G = B.Game, bot = G.actors.find((a) => a.bot && a.team !== G.player.team).bot;
    bot.jump(); for (let i = 0; i < 18; i++) G.update(1 / 60);
    const ground = bot.a.pos.y - bot.jumpY, atDeath = bot.root.position.y;
    bot.a.spawnTime = -99; bot.a.armor = 0; B.Combat.damage(bot.a, 9999, G.player, false, 'ak47');
    if (!bot.corpse) return { died: bot.a.alive === false, hp: bot.a.hp };
    const ys = [];
    for (let i = 0; i < 90; i++) { G.update(1 / 60); if (i % 10 === 0) ys.push(+bot.corpse.root.position.y.toFixed(3)); }
    const body = bot.bodies.find((b) => b.root.visible && b.groundY != null);
    return { ground: +ground.toFixed(3), atDeath: +atDeath.toFixed(3), end: body ? +body.root.position.y.toFixed(3) : null, ys, mono: ys.every((y, i) => !i || y <= ys[i - 1] + 1e-6) };
  });
  check('soldier killed mid-jump falls to the floor while dying (no floating corpse)', air.atDeath > air.ground + 0.2 && Math.abs(air.end - air.ground) < 0.01 && air.mono, JSON.stringify(air));
  await f.evaluate(() => window.__BR.Game.toMenu('menu')); await onScreen(f, 'menu');
  await startMission(f, 3, 'none', 'pistol');
  const mimic = await f.evaluate(() => {
    const B = window.__BR, G = B.Game, boss = G.mode.boss, rounds = [];
    for (const a of G.actors) if (a.bot) { a.bot.shootAt = () => {}; }
    G.player.spawnTime = -99;
    const snap = () => ({ hp: boss.maxHp, elite: boss.bot.elite, armor: boss.armor || 1, banner: (B.Hud.els.banner.textContent || '').trim() });
    rounds.push(snap());
    for (let r = 0; r < 3; r++) {
      boss.spawnTime = -99; B.Combat.damage(boss, 99999, G.player, false, 'sniper');
      for (let i = 0; i < 300 && !boss.alive; i++) G.update(1 / 30);
      rounds.push(snap());
    }
    return rounds;
  });
  check('Duel: the Mimic stays strong every round (290 HP, armour, elite)', mimic.every((m) => m.hp === 290 && m.elite && m.armor === 0.8), JSON.stringify(mimic.map((m) => [m.hp, m.elite])));
  check('Duel: no banner tells the player about the Mimic', mimic.every((m) => !/MIMIC/.test(m.banner)), JSON.stringify(mimic.map((m) => m.banner)));
  {
    const src = fs.readFileSync(path.join(ROOT, 'Backrooms FPS CrazyGames/game.js'), 'utf8');
    const knobs = ['let p = 0.155 + 0.58 * this.skill;', 'lerp(0.87, 0.19, b.skill)', 'rand(0.55, 1.05) : rand(0.85, 1.7)', '0.43 + this.skill * 0.39 + (this.elite ? 0.14 : 0)', '(b.elite ? 0.17 : 0.075)) b.jump()', '(this.elite ? 0.35 : 0.45) && Game.time - this.lastRetreat > 6'];
    check('NPC strength back to just under the previous level', knobs.every((k) => src.includes(k)), knobs.filter((k) => !src.includes(k)).join(' | '));
  }
  check('no errors', !log.errors.length, log.errors.slice(0, 4).join(' | '));
  await browser.close();
}

if (run('M')) {
  section = 'M menu, music, progression, graphics';
  {
    const strip = (src) => { const a = src.indexOf('const Platform = (() => {'), e = '\n  return api;\n})();\n', b = src.indexOf(e, a); return src.slice(0, a) + src.slice(b + e.length); };
    const cgJs = fs.readFileSync(path.join(ROOT, 'Backrooms FPS CrazyGames/game.js'), 'utf8'), ytJs = fs.readFileSync(path.join(ROOT, 'Backrooms FPS/game.js'), 'utf8');
    const sameAssets = ['assets/NPCs/operator.glb', 'assets/Audio/music.mp3', 'css/style.css', 'LICENSES.txt'].every((f) => fs.readFileSync(path.join(ROOT, 'Backrooms FPS CrazyGames', f)).equals(fs.readFileSync(path.join(ROOT, 'Backrooms FPS', f))));
    check('YouTube Playables build is the same game (only the SDK platform layer differs)', strip(cgJs) === strip(ytJs) && sameAssets && /ytgame/.test(ytJs) && !/CrazyGames/.test(ytJs));
  }
  const { browser, page, f, log } = await open({ w: 1280, h: 720, query: '?debug&menu=1', save: JSON.stringify({ v: 1, unlocked: 12, missions: {}, xp: 0, cp: 0, owned: [], played: 3 }) });
  await ready(f);
  await f.click('#boot-enter'); await onScreen(f, 'menu');
  await f.waitForFunction(() => window.__BR.Audio.musicLoaded, null, { timeout: 30000 });
  await sleep(2500);
  const menu = await f.evaluate(() => {
    const B = window.__BR, h = B.Lobby.hero, cam = B.World.camera;
    const rigs = new Set(); B.World.scene.traverse((o) => { if (o.isSkinnedMesh && o.visible) { let v = true; for (let n = o; n; n = n.parent) if (!n.visible) v = false; if (v) rigs.add(o.skeleton.bones[0]); } }); const skinned = rigs.size;
    let head = null; h.root.traverse((o) => { if (o.isBone && /Head$/.test(o.name)) head = o; });
    const hp = head.getWorldPosition(cam.position.clone()), sp = hp.clone().project(cam);
    return { skinned, dist: +cam.position.distanceTo(h.root.position).toFixed(2), headX: +sp.x.toFixed(2), headY: +sp.y.toFixed(2), music: B.Audio.musicOn, lights: h.lights.map(([l]) => l.intensity) };
  });
  await page.screenshot({ path: shotName('menu-hero-1280') });
  check('menu shows one soldier, close to the camera, framed right of the menu', menu.skinned === 1 && menu.dist < 2.2 && menu.headX > 0 && menu.headX < 0.6 && menu.headY > 0.2 && menu.headY < 0.85 && menu.lights.every((x) => x > 0), JSON.stringify(menu));
  check('menu music is playing', menu.music);
  await f.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(500);
  const hidden = await f.evaluate(() => window.__BR.Audio.musicOn);
  await f.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(1500);
  const back = await f.evaluate(() => window.__BR.Audio.musicOn);
  await f.evaluate(() => window.__cg.settingsCbs.forEach((cb) => cb({ muteAudio: true }))); await sleep(500);
  const muted = await f.evaluate(() => window.__BR.Audio.musicOn);
  await f.evaluate(() => window.__cg.settingsCbs.forEach((cb) => cb({ muteAudio: false }))); await sleep(1500);
  check('music stops when the tab is hidden or CrazyGames mutes, and comes back after', !hidden && back && !muted && (await f.evaluate(() => window.__BR.Audio.musicOn)), JSON.stringify({ hidden, back, muted }));
  await startMission(f, 0, 'none', 'pistol');
  await sleep(2500);
  check('music fades out when a mission starts (menus only)', !(await f.evaluate(() => window.__BR.Audio.musicOn)));
  await f.evaluate(() => window.__BR.Game.toMenu('menu')); await onScreen(f, 'menu'); await sleep(2000);
  check('music comes back in the menu after a mission', await f.evaluate(() => window.__BR.Audio.musicOn));

  const curve = await f.evaluate(() => {
    const B = window.__BR, ops = B.MISSIONS.map((m, i) => i);
    return ops.map((i) => { B.Game.missionIndex = i; return Object.fromEntries(['ak47', 'm4', 'sniper', 'shotgun', 'pistol'].map((w) => [w, +B.armorMul(w, i).toFixed(3)])); });
  });
  const dps = (c) => ({ ak: c.ak47 * 31 * 600, m4: c.m4 * 25 * 780 });
  check('hostiles get tougher for the AK-47 every operation from Op 3 (down to 64%)', curve[0].ak47 === 1 && curve[1].ak47 === 1 && curve[2].ak47 < 1 && curve.every((c, i) => !i || c.ak47 <= curve[i - 1].ak47) && Math.min(...curve.map((c) => c.ak47)) >= 0.64, curve.map((c) => c.ak47).join(' '));
  check('M4 weakens later and less (Op 5 on, down to 80%), always stronger than the AK-47', curve.slice(0, 4).every((c) => c.m4 === 1) && curve[4].m4 < 1 && Math.min(...curve.map((c) => c.m4)) >= 0.8 && curve.every((c) => dps(c).m4 > dps(c).ak), curve.map((c) => c.m4).join(' '));
  check('Sniper, Tri-Barrel and pistol are never weakened', curve.every((c) => c.sniper === 1 && c.shotgun === 1 && c.pistol === 1));
  await startMission(f, 8, 'none', 'pistol');
  const hit = await f.evaluate(() => {
    const B = window.__BR, G = B.Game, bots = G.actors.filter((a) => a.bot && a.team !== G.player.team).slice(0, 2);
    const take = (bot, w) => { bot.spawnTime = -99; bot.hp = 1000; B.Combat.damage(bot, 100, G.player, false, w); return 1000 - bot.hp; };
    return { ak: take(bots[0], 'ak47'), sniper: take(bots[1], 'sniper'), npcHpUnchanged: bots.every((b) => b.maxHp === bots[0].maxHp) };
  });
  check('in Operation 9 an AK-47 hit does 64% of a Sniper hit of the same strength (NPC code untouched)', Math.abs(hit.ak / hit.sniper - 0.64) < 0.01, JSON.stringify(hit));
  await f.evaluate(() => window.__BR.Game.toMenu('menu')); await onScreen(f, 'menu');
  const warn = [];
  for (const i of [0, 1, 2, 7]) { await f.evaluate((k) => { const U = window.__BR.Ui; U.selMission = k; U.show('briefing'); }, i); await onScreen(f, 'briefing'); warn.push(await f.evaluate(() => { const e = document.querySelector('#briefing .threat'); return e ? e.innerText : ''; })); }
  await settle(f); await page.screenshot({ path: shotName('briefing-threat') });
  check('briefing warns "HOSTILES ARE GETTING STRONGER EVERY OPERATION" from Operation 3', !warn[0] && !warn[1] && /STRONGER EVERY OPERATION/.test(warn[2]) && /STRONGER/.test(warn[3]), JSON.stringify(warn));

  const gfx = await f.evaluate(() => {
    const B = window.__BR, W = B.World, S = B.Save.settings, out = {};
    const run = (secs, fps) => { for (let i = 0; i < secs * fps; i++) W.adapt(1 / fps); };
    S.quality = 'auto'; delete S.autoLevel; W.perf.slow = 0; W.dropComposer(); W.applyQuality(); out.start = W.qualityLevel; out.bloom = !!W.composer;
    run(8, 60); out.smooth = W.qualityLevel;
    run(5, 25); out.lag1 = W.qualityLevel;
    run(5, 22); out.lag2 = W.qualityLevel; out.saved = S.autoLevel;
    S.quality = 'high'; W.dropComposer(); W.applyQuality(); run(10, 15); out.manualHigh = W.qualityLevel;
    S.quality = 'med'; W.applyQuality(); run(10, 15); out.manualMed = W.qualityLevel;
    S.quality = 'auto'; delete S.autoLevel; W.perf.slow = 0;
    Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ effectiveType: '2g', saveData: false }) });
    W.applyQuality(); out.slowNet = W.qualityLevel;
    Object.defineProperty(navigator, 'connection', { configurable: true, get: () => undefined });
    delete S.autoLevel; W.applyQuality();
    return out;
  });
  check('graphics Auto starts on High (with bloom) and stays High while smooth', gfx.start === 'high' && gfx.bloom && gfx.smooth === 'high', JSON.stringify(gfx));
  check('graphics Auto drops to Medium when it lags, then Low if it still lags, and remembers it', gfx.lag1 === 'med' && gfx.lag2 === 'low' && gfx.saved === 'low', JSON.stringify(gfx));
  check('a manual High or Medium choice is never changed automatically', gfx.manualHigh === 'high' && gfx.manualMed === 'med', JSON.stringify(gfx));
  check('a slow connection (2G / data saver) starts Auto on Medium', gfx.slowNet === 'med', JSON.stringify(gfx));
  const hands = await f.evaluate(() => {
    const B = window.__BR, h = B.Lobby.hero, V = B.World.camera.position.constructor, g = h.gun;
    const fwd = new V(0, 0, -1).applyQuaternion(g.quaternion), off = (bone) => { const d = bone.getWorldPosition(new V()).sub(g.position); return +d.sub(fwd.clone().multiplyScalar(d.dot(fwd))).length().toFixed(3); };
    return { left: off(h.left), right: off(h.hand) };
  });
  check('menu soldier holds the rifle with both hands (palms within 4 cm of the rifle)', hands.left < 0.04 && hands.right < 0.04, JSON.stringify(hands));
  await startMission(f, 2, 'none', 'pistol');
  const hp = await f.evaluate(() => [...new Set(window.__BR.Game.actors.filter((a) => a.bot).map((a) => a.maxHp))]);
  check('NPC soldiers have their original 125 HP', hp.length === 1 && hp[0] === 125, JSON.stringify(hp));
  await f.evaluate(() => { const G = window.__BR.Game; for (const a of G.actors) if (a.bot) { a.bot.brain.update = () => {}; a.bot.shootAt = () => {}; } });
  const progs = [];
  progs.push(await f.evaluate(() => window.__BR.World.renderer.info.programs.length));
  await f.evaluate(() => { const G = window.__BR.Game; G.offerGun = 'sniper'; G.inGameOffer(); }); await sleep(1500);
  progs.push(await f.evaluate(() => window.__BR.World.renderer.info.programs.length));
  await f.click('#m-mini [data-a=no]'); await sleep(1500);
  progs.push(await f.evaluate(() => window.__BR.World.renderer.info.programs.length));
  check('gun pop-up opens and closes without compiling shaders mid-game (no lag spike)', progs.every((n) => n === progs[0]), progs.join(' > '));
  const lock = await f.evaluate(async () => {
    const B = window.__BR, I = B.Input, cv = B.World.renderer.domElement, out = {};
    let mode = 'reject'; const calls = [];
    HTMLCanvasElement.prototype.requestPointerLock = function () { calls.push(mode); return mode === 'reject' ? Promise.reject(new Error('refused')) : Promise.resolve(); };
    if (document.pointerLockElement) { document.exitPointerLock(); for (let k = 0; k < 60 && !B.Game.paused; k++) await new Promise((r) => setTimeout(r, 100)); }
    if (B.Game.paused) B.Game.resume();
    await new Promise((r) => setTimeout(r, 600));
    out.lockedAtStart = I.st.locked;
    out.giveUpAfterOne = I.lockFailed;
    dispatchEvent(new MouseEvent('mousemove', { movementX: 200, movementY: 0 }));
    out.lookWhileUnlocked = I.st.lookX;
    await new Promise((r) => setTimeout(r, 300));
    out.hint = document.querySelector('#hud .lock-hint').classList.contains('on');
    cv.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })); await new Promise((r) => setTimeout(r, 50));
    out.clickRetried = calls.length >= 2; out.clickFired = I.sample(0.016).fire;
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    cv.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })); await new Promise((r) => setTimeout(r, 50));
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    out.fallbackAfter3 = I.lockFailed;
    return out;
  });
  check('a refused mouse lock (e.g. Resume too soon after Esc) is retried on the next click, never given up', !lock.lockedAtStart && !lock.giveUpAfterOne && lock.clickRetried, JSON.stringify(lock));
  check('while the mouse is not locked it cannot drag the camera, "CLICK TO AIM" shows, and that click does not shoot', lock.lookWhileUnlocked === 0 && lock.hint && !lock.clickFired, JSON.stringify(lock));
  check('once mouse lock has worked, later refusals never switch to free mouse-look', lock.fallbackAfter3 === false, JSON.stringify(lock));
  check('no errors', !log.errors.length, log.errors.slice(0, 4).join(' | '));
  await browser.close();
}

if (run('L')) {
  section = 'L stability';
  const { browser, page, f, log } = await open({ w: 800, h: 450, query: '?debug&menu=1', save: JSON.stringify({ v: 1, unlocked: 12, missions: {}, xp: 0, cp: 0, owned: [], played: 3 }) });
  await ready(f);
  await f.click('#boot-enter'); await onScreen(f, 'menu');
  await f.evaluate(() => { window.__cg.fast = true; });
  const total = await f.evaluate(() => window.__BR.MISSIONS.length);
  const fails = [];
  for (let i = 0; i < (process.env.QA_SKIP_MISSIONS ? 0 : total); i++) {
    for (const won of [true, false]) {
      const e0 = log.errors.length;
      await startMission(f, i, 'none', 'pistol');
      await f.evaluate(() => { const G = window.__BR.Game; for (let k = 0; k < 120; k++) G.update(1 / 60); });
      await f.evaluate((w) => { const G = window.__BR.Game; if (!G.over) G.finish(w, w ? 'r_win' : 'r_time'); }, won);
      await onScreen(f, 'end'); await sleep(300);
      await f.click('#end [data-a=menu]'); await onScreen(f, 'missions');
      if (log.errors.length > e0) fails.push(`${i}${won ? 'W' : 'L'}: ${log.errors[e0]}`);
    }
  }
  check(`all ${total} missions start, play, and finish (win and loss) without errors`, !fails.length, fails.slice(0, 3).join(' | '));
  const mem = [];
  for (let k = 0; k < (+process.env.QA_CYCLES || 20); k++) {
    await startMission(f, k % 3, 'none', 'pistol');
    await f.evaluate(() => { const G = window.__BR.Game; for (let j = 0; j < 30; j++) G.update(1 / 60); });
    await f.evaluate(() => window.__BR.Game.toMenu('menu')); await onScreen(f, 'menu');
    mem.push(await f.evaluate(() => { const i = window.__BR.World.renderer.info; return [i.memory.geometries, i.memory.textures, Math.round((performance.memory ? performance.memory.usedJSHeapSize : 0) / 1048576)]; }));
  }
  if (process.env.QA_DEBUG) console.log(JSON.stringify(mem));
  const [g5, t5] = mem[Math.min(4, mem.length - 1)], [g20, t20] = mem[mem.length - 1];
  check('20 x start + quit: GPU geometry and textures stay flat (no leak)', g20 <= g5 * 1.05 + 2 && t20 <= t5 * 1.05 + 2, `geometries ${g5}>${g20}, textures ${t5}>${t20}, JS heap ${mem[Math.min(4, mem.length - 1)][2]}>${mem[mem.length - 1][2]} MB`);
  await f.evaluate(() => window.__BR.Arsenal.rent('ak47', 0));
  await startMission(f, 0, 'ak47', 'pistol');
  const fr = await f.evaluate(() => {
    const B = window.__BR, G = B.Game, P = B.Player; B.Loop.stop(); const rend = B.World.render; B.World.render = () => {};
    for (const a of G.actors) if (a.bot) { a.bot.agent.teleport({ x: 27, y: 0, z: -22 }); a.pos.set(27, 0, -22); a.bot.brain.update = () => {}; a.bot.perceive = () => {}; }
    const start = B.Nav.closest({ x: -20, y: 0, z: 13 }), sample = B.Input.sample;
    const go = (hz) => {
      G.countdownT = 0; P.spawn(G.player, start, Math.PI / 2); P.slot.mag = 30; P.slot.reserve = 999;
      const inp = { mx: 0, my: 1, lookX: 0, lookY: 0, fire: true, ads: false, sprint: false, crouch: false, interact: false };
      B.Input.sample = () => ({ ...inp, pressed: new Set() });
      const f0 = P.shotsFired, p0 = G.player.pos.clone();
      for (let i = 0; i < hz * 2; i++) G.update(1 / hz);
      return { shots: P.shotsFired - f0, moved: +G.player.pos.distanceTo(p0).toFixed(2) };
    };
    const r = { hz30: go(30), hz60: go(60), hz144: go(144), hz165: go(165), hz240: go(240) };
    B.Input.sample = sample; B.World.render = rend;
    return r;
  });
  const base = fr.hz60;
  check('same movement and fire rate at 30, 60, 144, 165 and 240 Hz', Object.values(fr).every((v) => Math.abs(v.shots - base.shots) <= 1 && Math.abs(v.moved - base.moved) < 0.2), JSON.stringify(fr));
  check('no errors', !log.errors.length, log.errors.slice(0, 4).join(' | '));
  await browser.close();
}

if (allTiny.size) console.log('\nsmall text (under 9 px):\n  ' + [...allTiny.values()].slice(0, 30).join('\n  '));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed${todo.length ? `, ${todo.length} for you to do` : ''}`);
fs.writeFileSync(path.join(QA, 'results.json'), JSON.stringify({ when: new Date().toISOString(), results, todo, tiny: [...allTiny.values()] }, null, 2));
process.exit(failed.length ? 1 : 0);
