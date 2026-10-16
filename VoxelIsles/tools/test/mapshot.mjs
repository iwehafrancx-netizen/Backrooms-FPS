import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = new URL('./out/maps/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const list = JSON.parse(process.argv[2] || '[["sky","meadow",7,{}]]');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto('http://localhost:8766/dev/index.html');
await page.waitForTimeout(1500);
await page.evaluate(() => { document.getElementById('ui').style.display = 'none'; });
for (const [kind, theme, seed, opt, views] of list) {
  const t0 = Date.now();
  const info = await page.evaluate(([kind, theme, seed, opt]) => {
    const a = window.__vi, b = a.maps[kind === 'sky' ? 'buildSkyIslands' : kind === 'egg' ? 'buildEggIslands' : kind];
    const t = performance.now();
    const map = kind === 'sky' || kind === 'egg' ? b(seed, theme, kind === 'sky' ? 8 : 4, opt) : b(seed, opt);
    const gen = performance.now() - t;
    a.setScene(map, opt.sky || map.theme || theme);
    window.__map = map;
    return { gen: Math.round(gen), mesh: Math.round(performance.now() - t - gen), spawns: (map.spawns || []).length, chests: (map.chests || []).length };
  }, [kind, theme, seed, opt]);
  console.log(kind, theme, JSON.stringify(info), `${Date.now() - t0}ms`);
  const vs = views || ['over', 'spawn', 'inside', 'mid'];
  for (const [vi, v] of vs.entries()) {
    await page.evaluate((v) => {
      const a = window.__vi, m = window.__map, c = a.R.camera, s = m.spawns[0] || { x: 0, y: m.top + 1, z: 0 };
      a.camHold = true;
      const dl = Math.hypot(s.x, s.z) || 1, ux = s.x / dl, uz = s.z / dl;
      if (v === 'over') { c.position.set(m.radius * 0.95, m.top + m.radius * 0.6, m.radius * 0.95); c.lookAt(0, m.top - 6, 0); }
      else if (v === 'spawn') { c.position.set(s.x + ux * 4 - uz * 16, s.y + 9, s.z + uz * 4 + ux * 16); c.lookAt(s.x, s.y + 2, s.z); }
      else if (v === 'inside') { c.position.set(s.x, s.y + 1.62, s.z); c.lookAt(0, s.y + 1, 0); }
      else if (v === 'mid') { c.position.set(22, m.top + 14, 26); c.lookAt(0, m.top + 3, 0); }
      else if (Array.isArray(v)) { c.position.set(v[0], v[1], v[2]); c.lookAt(v[3], v[4], v[5]); }
      c.fov = 75; c.updateProjectionMatrix();
    }, v);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}${kind}-${theme}-${opt.style || ''}-${typeof v === 'string' ? v : 'cam' + vi}.png` });
  }
}
await browser.close();
