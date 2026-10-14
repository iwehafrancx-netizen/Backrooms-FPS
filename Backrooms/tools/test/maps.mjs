import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'out/maps');
fs.mkdirSync(OUT, { recursive: true });
const GAME = process.env.GAME === 'youtube' ? 'Backrooms%20FPS' : 'Backrooms%20FPS%20CrazyGames';
const URL = `http://localhost:8765/${GAME}/index.html`;
const SDK = process.env.GAME === 'youtube' ? ['https://www.youtube.com/game_api/v1', 'mock-ytgame.js'] : ['https://sdk.crazygames.com/crazygames-sdk-v3.js', '../crazygames-test-sdk.js'];
const only = process.argv.slice(2);
const run = (s) => !only.length || only.includes(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info = '') => { results.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); };

async function open(query = '?debug&menu=1') {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const log = { errors: [] };
  await page.addInitScript(() => { window.__cgConfig = { fast: true, mirrorYt: true }; });
  await page.route(SDK[0], (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(here, SDK[1]), 'utf8') }));
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') log.errors.push(m.text()); });
  await page.goto(URL + query);
  await page.waitForFunction(() => { const b = document.getElementById('boot-enter'); return b && !b.classList.contains('hidden'); }, null, { timeout: 120000 });
  await page.click('#boot-enter'); await page.waitForFunction(() => window.__BR.Ui.cur === 'menu');
  return { browser, page, log };
}
const start = async (page, i) => { await page.evaluate((k) => { const B = window.__BR, m = B.MISSIONS[k]; B.Save.data.unlocked = 99; B.Game.start(k, m.primary, m.secondary); }, i); await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 90000 }); };

if (run('all')) {
  const { browser, page, log } = await open();
  const n = await page.evaluate(() => window.__BR.MISSIONS.length);
  for (let i = 0; i < n; i++) {
    await start(page, i);
    const r = await page.evaluate(() => {
      const B = window.__BR, G = B.Game; G.countdownT = 0; G.player.armor = 0.0001;
      const ys = [];
      for (let k = 0; k < 600 && !G.over; k++) { G.update(1 / 30); if (k % 60 === 0) for (const a of G.actors) if (a.bot && a.alive) ys.push(a.pos.y); }
      return { id: G.mode.m.id, map: B.World.mapId, mode: G.mode.m.mode, actors: G.actors.length, alive: G.actors.filter((a) => a.alive).length, kills: G.actors.reduce((s, a) => s + a.kills, 0), maxY: Math.max(0, ...ys).toFixed(1), radar: !!B.Hud.radarMap };
    });
    await page.screenshot({ path: path.join(OUT, `op${String(i + 1).padStart(2, '0')}-${r.map}-${r.id}.png`) });
    check(`Op ${i + 1} ${r.id} (${r.mode}) on ${r.map}: starts and plays 20 s`, r.actors > 1 && r.radar && !log.errors.length, JSON.stringify(r) + (log.errors.length ? ' ' + log.errors.slice(0, 2).join(' | ') : ''));
    await page.evaluate(() => window.__BR.Game.toMenu('menu'));
  }
  await browser.close();
}

console.log(`${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
