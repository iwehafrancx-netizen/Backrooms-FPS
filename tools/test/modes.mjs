// Runs every mission headless for a while (bots only, player invulnerable), then drives it to an end state.
import { open, shot } from './harness.mjs';
const { browser, page, log } = await open({ width: 640, height: 360 });
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 60000 });
await page.click('#boot-enter');
await page.evaluate(() => { const B = window.__BR; B.World._render = B.World.render; B.World.render = () => {}; });
const results = [];
for (let mi = 0; mi < 12; mi++) {
  await page.evaluate((mi) => { const B = window.__BR; B.Save.data.unlocked = 12; const m = B.MISSIONS[mi]; B.Game.start(mi, m.primary, m.secondary); }, mi);
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
  const r = await page.evaluate(async (mi) => {
    const B = window.__BR, G = B.Game; G.countdownT = 0; G.player.armor = 0.0001;
    const step = (n) => { for (let i = 0; i < n && !G.over; i++) G.update(1 / 30); };
    const t0 = performance.now(); step(30 * 90); const ms = performance.now() - t0;
    const kills = G.actors.reduce((a, x) => a + x.kills, 0);
    const hud = G.mode.hud();
    const mode = G.mode;
    // drive to a win
    if (!G.over) {
      if (mode.keys) { for (const k of mode.keys) if (!k.got) mode.grab(k); G.player.pos.copy(mode.exit); const it = mode.interactable(G.player); it && it.done(); }
      else if (mode.switches) { for (const s of mode.switches) if (s.team === 'B' && !s.pressed) mode.press(s, 'A'); }
      else if (mode.casePos) { for (const a of G.actors) if (!a.isPlayer && a.alive) { a.armor = 1; B.Game.actors && window.__BR.Game.mode && (a.spawnTime = -99); } mode.setHolder(G.player); for (const a of G.actors) if (!a.isPlayer && a.alive) { a.spawnTime = -99; window.__kill && 0; } }
    }
    return { mi, mode: B.MISSIONS[mi].mode, simMsPer90s: Math.round(ms), kills, over: G.over, hud: (hud.objective || '').replace(/<[^>]+>/g, ''), alive: G.actors.filter((a) => a.alive).length };
  }, mi);
  // force-finish anything still running so the end screen renders
  await page.evaluate(() => { const G = window.__BR.Game; if (!G.over) G.finish(true, 'r_win'); });
  await page.waitForFunction(() => window.__BR.Ui.cur === 'end', null, { timeout: 15000 });
  await page.evaluate(() => window.__BR.World._render());
  await shot(page, `mode-${mi}-end`);
  results.push(r);
  console.log(JSON.stringify(r));
}
const save = await page.evaluate(() => JSON.parse(window.__yt.saved));
console.log('save unlocked', save.unlocked, 'missions', Object.keys(save.missions).length, 'scores sent', await page.evaluate(() => window.__yt.scores.slice(-3)));
console.log('errors', log.errors, log.console.slice(0, 10));
await browser.close();
