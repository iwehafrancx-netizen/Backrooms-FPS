import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await page.addInitScript(() => { window.__cgConfig = { fast: true }; });
await page.route('https://sdk.crazygames.com/crazygames-sdk-v3.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(here, '../crazygames-test-sdk.js'), 'utf8') }));
await page.goto('http://localhost:8765/Backrooms%20FPS%20CrazyGames/index.html?debug&menu=1');
await page.waitForFunction(() => { const b = document.getElementById('boot-enter'); return b && !b.classList.contains('hidden'); }, null, { timeout: 120000 });
await page.click('#boot-enter'); await page.waitForFunction(() => window.__BR.Ui.cur === 'menu');
const rows = [];
for (const id of (process.argv[2] || 'ctf1,m1,m2,m3,lss').split(',')) {
  await page.evaluate((mid) => { const B = window.__BR, k = B.MISSIONS.findIndex((m) => m.id === mid), m = B.MISSIONS[k]; B.Save.data.unlocked = 99; B.Game.start(k, m.primary, m.secondary); }, id);
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 90000 });
  const r = await page.evaluate(() => {
    const B = window.__BR, G = B.Game, W = B.World; G.countdownT = 0; G.player.armor = 1e9; G.player.hp = 1e9;
    let rays = 0; const orig = W.rayWalls.bind(W); W.rayWalls = (...a) => { rays++; return orig(...a); };
    for (let k = 0; k < 30; k++) G.update(1 / 60);
    rays = 0; let tu = 0, tr = 0;
    W.renderer.info.autoReset = false; let calls = 0, tris = 0; for (let k = 0; k < 120; k++) { const t0 = performance.now(); G.update(1 / 60); const t1 = performance.now(); W.renderer.info.reset(); W.renderer.render(W.scene, W.camera); calls += W.renderer.info.render.calls; tris += W.renderer.info.render.triangles; W.renderer.getContext().finish(); tr += performance.now() - t1; tu += t1 - t0; } W.renderer.info.autoReset = true;
    W.rayWalls = orig;
    const info = { calls: calls / 120 | 0, triangles: tris / 120 | 0 };
    return { map: W.mapId, update: (tu / 120).toFixed(2), render: (tr / 120).toFixed(2), raysPerFrame: (rays / 120).toFixed(1), meshes: W.wallMeshes.length, calls: info.calls, tris: info.triangles };
  });
  rows.push({ id, ...r }); console.log(JSON.stringify(rows.at(-1)));
  await page.evaluate(() => window.__BR.Game.toMenu('menu'));
}
await browser.close();
