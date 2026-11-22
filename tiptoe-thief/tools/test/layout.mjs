// UI layout check for store review: on many screen sizes, open every screen and
// report any two visible UI boxes that overlap, and anything that runs off screen.
//
//   node tools/test/layout.mjs [url] [--shots]
//
// Boxes that are nested (a label inside its button) are not compared with each
// other, and content scrolled out of a scroll area is ignored (you can scroll to it).
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const url = process.argv.find((a) => a.startsWith('http')) || 'http://127.0.0.1:8770/dev/index.html';
const shots = process.argv.includes('--shots');
const out = new URL('./out/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop-1920x1080', viewport: { width: 1920, height: 1080 } },
  { name: 'desktop-1366x768', viewport: { width: 1366, height: 768 } },
  { name: 'desktop-1280x720', viewport: { width: 1280, height: 720 } },
  { name: 'desktop-1024x768', viewport: { width: 1024, height: 768 } },
  { name: 'desktop-800x600', viewport: { width: 800, height: 600 } },
  { name: 'phone-568x320', viewport: { width: 568, height: 320 }, touch: true },
  { name: 'phone-667x375', viewport: { width: 667, height: 375 }, touch: true },
  { name: 'phone-844x390', viewport: { width: 844, height: 390 }, touch: true },
  { name: 'tablet-1180x820', viewport: { width: 1180, height: 820 }, touch: true },
  { name: 'portrait-360x640', viewport: { width: 360, height: 640 }, touch: true },
  { name: 'portrait-390x844', viewport: { width: 390, height: 844 }, touch: true },
];

// What is measured on each screen.
const MENU_SEL = '#screen h1, #screen .sub, #screen h2, #screen h3, #screen p, #screen button, #screen .stars, #screen li, #screen label, #screen .coins, #screen .g-ico';
const HUD_SEL = '.hud-level, .hud-stats span, .btn-pause, .toast, .desk-hint, .joy, .btns button, .mark';
const SCREENS = [
  ['title', `() => window.__tt.screens.title()`, MENU_SEL],
  ['levels', `() => window.__tt.screens.levels(window.__tt.levels())`, MENU_SEL],
  ['shop', `() => window.__tt.screens.shop()`, MENU_SEL],
  ['settings', `() => window.__tt.screens.settings()`, MENU_SEL],
  ['how', `() => window.__tt.screens.how()`, MENU_SEL],
  ['pause', `() => window.__tt.screens.pause()`, MENU_SEL],
  ['win', `() => window.__tt.screens.results({ won: true, stars: 3, allLoot: true, unseen: true, cash: 1230, earned: 138, canDouble: true, hasNext: true })`, MENU_SEL],
  ['caught', `() => window.__tt.screens.results({ won: false })`, MENU_SEL],
  // in a heist: the long tip toast, a loot toast, the action button ready and a "!" mark
  ['hud', `() => { const a = window.__tt; a.save.data.howSeen = true; a.startLevel(1); const g = a.game; g.state = 'paused'; a.hud.toast('+$160', 'loot', 60000); a.hud.toast(a.t('alarm'), 'bad', 60000); a.hud.setAction({ kind: 'safe' }); a.hud.mark(g.guards[0], '!'); a.hud.update(g); }`, HUD_SEL],
  ['lockpick', `() => { const a = window.__tt; a.hud.lockpick(3, 1, () => {}); }`, HUD_SEL.replace('.mark', '.lockpick p, .lp-ring')],
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let problems = 0;
for (const vp of VIEWPORTS) {
  const ctx = await b.newContext({ viewport: vp.viewport, hasTouch: !!vp.touch, isMobile: !!vp.touch, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(url);
  await p.waitForFunction(() => window.__tt && window.__tt.screens && window.__tt.screens.cur === 'title-screen', null, { timeout: 240000 });
  for (const [name, open, sel] of SCREENS) {
    // menus are drawn over the game, so close the HUD for them (and vice versa)
    await p.evaluate(`(${open})()`);
    await p.evaluate((menu) => { if (menu) { window.__tt.hud.show(false); } else { window.__tt.screens.hide(); window.__tt.hud.show(true); } }, sel === MENU_SEL);
    await p.waitForTimeout(name === 'hud' ? 1500 : 250);
    const found = await p.evaluate((sel) => {
      const W = innerWidth, H = innerHeight, res = [];
      const vis = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; for (let n = e; n; n = n.parentElement) if (getComputedStyle(n).display === 'none') return false; return true; };
      const label = (e) => (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : e.tagName.toLowerCase()) + (e.textContent.trim() ? ` "${e.textContent.trim().slice(0, 22)}"` : '');
      const items = [];
      for (const e of document.querySelectorAll(sel)) {
        if (!vis(e)) continue;
        let r = e.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        // clip to the scroll area it lives in; skip it if it is scrolled out of view
        const sc = e.closest('.scroll');
        if (sc) {
          const s = sc.getBoundingClientRect();
          const x0 = Math.max(r.left, s.left), y0 = Math.max(r.top, s.top), x1 = Math.min(r.right, s.right), y1 = Math.min(r.bottom, s.bottom);
          if (x1 - x0 < 2 || y1 - y0 < 2) continue;
          r = { left: x0, top: y0, right: x1, bottom: y1 };
        }
        items.push({ e, r });
        if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) res.push(`off screen: ${label(e)} [${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}]`);
      }
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const A = items[i], B = items[j];
        if (A.e.contains(B.e) || B.e.contains(A.e)) continue;
        const ox = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left), oy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
        if (ox > 2 && oy > 2) res.push(`overlap: ${label(A.e)} × ${label(B.e)} (${Math.round(ox)}×${Math.round(oy)} px)`);
      }
      return res;
    }, sel);
    if (shots) await p.screenshot({ path: `${out}layout-${vp.name}-${name}.png` });
    for (const f of found) console.log(`FAIL  ${vp.name}  ${name}  ${f}`);
    problems += found.length;
    // tidy up between screens
    await p.evaluate(() => { const a = window.__tt; document.querySelector('.lockpick')?.classList.add('hidden'); a.input.enabled = true; a.hud.el.toasts.innerHTML = ''; });
  }
  if (errors.length) { problems++; console.log(`FAIL  ${vp.name}  page errors: ${errors.join(' | ')}`); }
  console.log(`done  ${vp.name}`);
  await ctx.close();
}
console.log(problems ? `${problems} PROBLEMS` : 'ALL PASS - nothing overlaps or runs off screen');
await b.close();
