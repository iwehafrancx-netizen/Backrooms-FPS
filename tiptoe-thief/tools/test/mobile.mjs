// Phone (landscape) and desktop screenshots of a store build: title, heist map, in-game HUD.
import { chromium, devices } from 'playwright-core';
const out = new URL('./out/', import.meta.url).pathname;
const url = process.argv[2] || 'http://127.0.0.1:8770/builds/crazygames/index.html';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [name, ctx] of [['phone', { ...devices['Pixel 7 landscape'] }], ['desktop', { viewport: { width: 1366, height: 768 } }]]) {
  const p = await (await b.newContext(ctx)).newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.route(/sdk\.crazygames\.com|youtube\.com\/game_api/, (r) => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await p.goto(url);
  await p.waitForFunction(() => window.__tt && window.__tt.screens && window.__tt.screens.cur === 'title-screen', null, { timeout: 180000 });
  await p.waitForTimeout(800); await p.screenshot({ path: `${out}${name}-title.png` });
  await p.click('[data-act=levels]'); await p.waitForTimeout(600); await p.screenshot({ path: `${out}${name}-levels.png` });
  await p.click('[data-act=start][data-i="0"]'); await p.waitForTimeout(1200);
  if (await p.$('[data-act=howOk]')) { await p.screenshot({ path: `${out}${name}-how.png` }); await p.click('[data-act=howOk]'); }
  await p.waitForTimeout(2000); await p.screenshot({ path: `${out}${name}-game.png` });
  console.log(name, 'errors', JSON.stringify(errors));
}
await b.close();
