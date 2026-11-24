// UI layout check for store review (Playgama asked for no overlapping elements).
//
//   GAME=crazygames node test/layout.mjs [--shots] [--only=568x320,360x640] [--lang=en,es,pt,fr] [--modes]
//
//   --lang   check every screen in each of these languages (default: en)
//   --modes  also check the in-game HUD of every mission type (CTF, siege, waves…)
//
// On many screen sizes it opens every screen, popup and the in-game HUD, takes
// every visible text, button and control on it, and reports any two that
// overlap and anything that runs off screen. Elements nested in each other are
// not compared, and content clipped by a scroll area is only measured where it
// is visible.
import { open, sleep, OUT } from './harness.mjs';
import path from 'node:path';

const shots = process.argv.includes('--shots');
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const LANGS = ((process.argv.find((a) => a.startsWith('--lang=')) || '--lang=en').slice(7)).split(',').filter(Boolean);
const LOCALE = { en: 'en-US', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR' };
const allModes = process.argv.includes('--modes');
const SIZES = [
  [1920, 1080, false], [1366, 768, false], [1280, 720, false], [1024, 768, false], [800, 600, false],
  [568, 320, true], [667, 375, true], [844, 390, true], [1180, 820, true], [360, 640, true], [390, 844, true],
].filter(([w, h]) => !only.length || only.includes(`${w}x${h}`));
const SAVE = JSON.stringify({ v: 1, unlocked: 12, missions: { m1: { best: 4200, stars: 2, cleared: true, plays: 1 } }, xp: 5000, cp: 7400, owned: ['shotgun'], played: 3 });

// Collect the problems on whatever is showing right now.
function measure() {
  const B = window.__BR, W = innerWidth, H = innerHeight, out = [];
  const modal = B.Ui.modal && document.getElementById(B.Ui.modal);
  const roots = modal ? [modal] : B.Game.state === 'play' ? [document.getElementById('hud'), document.getElementById('touch')] : [document.querySelector('.screen.active')];
  // decorative or world-space layers, not UI boxes
  const SKIP = '.markers, .crosshair, .hitmarker, .dmg-dir, .progress-ring, .countdown, .deathcard:not(.on), .spectate:not(.on), .fps, .radar, .mcard .num, .mcard.locked > :not(.lock)';
  const visible = (e) => {
    for (let n = e; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false;
    }
    return true;
  };
  const isBox = (e) => /^(BUTTON|INPUT|CANVAS|IMG|SVG|KBD|SELECT)$/i.test(e.tagName) || e.matches('.btn, .tbtn, .joy, .seg button, .toggle, .bar, .radar') ||
    [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const label = (e) => (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase()) + (e.textContent.trim() ? ` "${e.textContent.trim().replace(/\s+/g, ' ').slice(0, 24)}"` : '');
  const items = [];
  for (const root of roots) {
    if (!root) continue;
    for (const e of root.querySelectorAll('*')) {
      if (e.closest(SKIP) || !isBox(e) || !visible(e)) continue;
      let r = e.getBoundingClientRect(), box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
      // clip to every scrolling / clipping ancestor; text clipped by a box that
      // does not scroll is text the player cannot read ("cut off")
      let cut = false;
      for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
        const c = n.getBoundingClientRect();
        const nb = { l: Math.max(box.l, c.left), t: Math.max(box.t, c.top), r: Math.min(box.r, c.right), b: Math.min(box.b, c.bottom) };
        const scrolls = /auto|scroll/.test(s.overflowX + s.overflowY);
        if (!scrolls && (nb.b < box.b - 2 || nb.r < box.r - 2 || nb.t > box.t + 2 || nb.l > box.l + 2) && nb.b > nb.t && nb.r > nb.l) cut = true;
        box = nb;
      }
      if (cut && e.textContent.trim()) out.push(`cut off: ${label(e)}`);
      if (box.r - box.l < 3 || box.b - box.t < 3) continue;
      items.push({ e, box });
      if (box.l < -1 || box.t < -1 || box.r > W + 1 || box.b > H + 1) out.push(`off screen: ${label(e)} [${Math.round(box.l)},${Math.round(box.t)} → ${Math.round(box.r)},${Math.round(box.b)}]`);
    }
  }
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const A = items[i], Bx = items[j];
    if (A.e.contains(Bx.e) || Bx.e.contains(A.e)) continue;
    const ox = Math.min(A.box.r, Bx.box.r) - Math.max(A.box.l, Bx.box.l), oy = Math.min(A.box.b, Bx.box.b) - Math.max(A.box.t, Bx.box.t);
    if (ox > 3 && oy > 3) out.push(`overlap: ${label(A.e)} × ${label(Bx.e)} (${Math.round(ox)}×${Math.round(oy)}px)`);
  }
  return out;
}

let total = 0;
for (const [w, h, touch] of SIZES) for (const lang of LANGS) {
  const { browser, page, log } = await open({ width: w, height: h, touch, save: SAVE, lang: LOCALE[lang] || lang });
  const size = `${w}x${h}${lang === 'en' ? '' : '-' + lang}`;
  const check = async (name) => {
    await sleep(700);
    const found = await page.evaluate(measure);
    for (const f of found) console.log(`FAIL  ${size}  ${name}  ${f}`);
    total += found.length;
    if (shots) await page.screenshot({ path: path.join(OUT, `layout-${size}-${name}.png`) });
  };
  try {
    await page.waitForFunction(() => { const b = document.getElementById('boot-enter'); return b && !b.classList.contains('hidden'); }, null, { timeout: 180000 });
    await page.evaluate(() => { document.querySelector('#boot').classList.add('active'); }).catch(() => {});
    await check('boot');
    // phones and tablets: the game switches to its touch layout on the first touch
    if (touch) await page.evaluate(() => window.dispatchEvent(new TouchEvent('touchstart')));
    await page.evaluate(() => document.getElementById('boot-enter').click());
    await page.waitForFunction(() => window.__BR.Ui.cur === 'menu', null, { timeout: 30000 });
    await check('menu');
    await page.evaluate(() => window.__BR.Ui.show('missions')); await check('missions');
    await page.evaluate(() => { const U = window.__BR.Ui; U.selMission = 3; U.show('briefing'); }); await check('briefing');
    for (const m of ['m-settings', 'm-controls', 'm-howto']) { await page.evaluate((m) => window.__BR.Ui.openModal(m), m); await check(m); await page.evaluate(() => window.__BR.Ui.closeModal()); }
    await page.evaluate(() => { window.__BR.Ui.gunOffer('ak47', 2); }); await sleep(1200); await check('m-offer'); await page.evaluate(() => window.__BR.Ui.closeModal());
    await page.evaluate(() => window.__BR.Ui.confirmReset(() => {})); await check('m-confirm'); await page.evaluate(() => window.__BR.Ui.closeModal());
    // in a mission
    await page.evaluate(() => window.__BR.Game.start(3, 'none', 'shotgun'));
    await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 90000 });
    await page.evaluate(() => {
      const B = window.__BR, G = B.Game; G.countdownT = 0;
      const bot = G.actors.find((a) => a.bot);
      for (let i = 0; i < 3; i++) B.Hud.killfeed(G.player, bot, 'shotgun', i === 0);
    });
    await check('hud');
    await page.evaluate(() => window.__BR.Game.openPause()); await check('m-pause');
    await page.evaluate(() => window.__BR.Game.resume());
    await page.evaluate(() => { const G = window.__BR.Game; G.offerGun = 'sniper'; G.inGameOffer(); }); await sleep(1200);
    if (await page.evaluate(() => window.__BR.Ui.modal)) { await check('m-mini'); await page.evaluate(() => window.__BR.Ui.closeModal()); }
    // the death card and the spectate line (shown between lives in team modes)
    await page.evaluate(() => { const B = window.__BR, G = B.Game; B.Hud.death(G.actors.find((a) => a.bot), 3, false); }); await check('death');
    await page.evaluate(() => { const B = window.__BR; B.Hud.els.death.classList.remove('on'); B.Hud.spectate('VIPER'); }); await check('spectate');
    await page.evaluate(() => window.__BR.Hud.els.spec.classList.remove('on'));
    await page.evaluate(() => { const B = window.__BR, G = B.Game; G.player.lives = 1; G.player.spawnTime = -99; B.Combat.damage(G.player, 9999, G.actors.find((a) => a.bot), false, 'ak47'); });
    await page.waitForFunction(() => window.__BR.Ui.modal === 'm-out', null, { timeout: 15000 }).catch(() => {});
    if (await page.evaluate(() => window.__BR.Ui.modal === 'm-out')) await check('m-out');
    // the results screens, each from a fresh mission
    await page.evaluate(() => { window.__BR.Ui.closeModal(); window.__BR.Game.toMenu(); });
    await sleep(800);
    await page.evaluate(() => window.__BR.Game.start(3, 'none', 'shotgun'));
    await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 90000 });
    await page.evaluate(() => { const G = window.__BR.Game; G.player.hp = 1; G.finish(false, 'r_dead'); });
    await page.waitForFunction(() => window.__BR.Ui.cur === 'end', null, { timeout: 20000 }); await sleep(2200); await check('end-lose');
    await page.evaluate(() => window.__BR.Game.start(3, 'none', 'shotgun'));
    await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 90000 });
    await page.evaluate(() => window.__BR.Game.finish(true, 'r_extract'));
    await page.waitForFunction(() => window.__BR.Ui.cur === 'end', null, { timeout: 20000 }); await sleep(2500); await check('end-win');
    await page.evaluate(() => window.__BR.Game.toMenu('complete')); await sleep(1200);
    if (await page.evaluate(() => window.__BR.Ui.cur === 'complete')) await check('complete');
    // the HUD of every other mission type
    if (allModes) {
      const picks = await page.evaluate(() => { const seen = new Set(), out = []; window.__BR.MISSIONS.forEach((m, i) => { if (!seen.has(m.mode)) { seen.add(m.mode); out.push([i, m.mode]); } }); return out; });
      for (const [i, mode] of picks) {
        await page.evaluate(() => { const U = window.__BR.Ui; U.closeModal(); window.__BR.Game.toMenu(); });
        await sleep(600);
        await page.evaluate((i) => { const B = window.__BR, m = B.MISSIONS[i]; B.Game.start(i, m.primary, m.secondary); }, i);
        await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 120000 });
        await page.evaluate(() => { const B = window.__BR, G = B.Game; G.countdownT = 0; const bot = G.actors.find((a) => a.bot); if (bot) for (let k = 0; k < 3; k++) B.Hud.killfeed(G.player, bot, G.player.slots?.[0]?.id || 'pistol', k === 0); });
        await sleep(1500);
        await check('hud-' + mode);
        // the longest announcement (title + subtitle) in this language, over this mission's HUD
        await page.evaluate(() => {
          const B = window.__BR, t = B.t;
          const pairs = [['b_alarm', 'b_alarmSub'], ['b_lights', 'b_hunt'], ['b_boss', 'b_exit'], ['b_flagReturned'], ['b_waveClear'], ['b_squadOut'], ['b_caseLost'], ['b_hpMove']];
          const [a, b] = pairs.sort((p, q) => (t(q[0]) + (q[1] ? t(q[1]) : '')).length - (t(p[0]) + (p[1] ? t(p[1]) : '')).length)[0];
          B.Hud.banner(t(a), b ? t(b) : undefined);
        });
        await sleep(400);
        await check('banner-' + mode);
      }
    }
  } catch (e) { console.log(`FAIL  ${size}  test error: ${e.message.split('\n')[0]}`); total++; }
  if (log.errors.length) { console.log(`FAIL  ${size}  page errors: ${log.errors.join(' | ')}`); total++; }
  console.log(`done  ${size}`);
  await browser.close();
}
console.log(total ? `${total} PROBLEMS` : 'ALL PASS - nothing overlaps or runs off screen');
