import { chromium } from 'playwright-core';
import fs from 'node:fs';
const url = 'http://localhost:8766/dev/index.html';
const mode = process.argv[2] || 'ctf';
const [w, h] = (process.argv[3] || '1280x720').split('x').map(Number);
const touch = process.argv.includes('--touch');
const out = new URL('./out/v2/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + e.stack));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const tag = `${mode}-${w}x${h}${touch ? '-touch' : ''}`;
const shot = (n) => page.screenshot({ path: `${out}${tag}-${n}.png` });
await page.goto(url);
await page.waitForTimeout(2500);
await page.click('[data-act=modes]');
await page.waitForTimeout(500);
await shot('1-modes');
if (mode === 'race' || mode === 'solo') {
  await page.click('[data-act=mode][data-mode=parkour]');
  await page.waitForTimeout(400);
  await shot('2-pick');
  if (mode === 'race') await page.click('[data-act=pkRace]');
  else {
    await page.click('[data-act=pkSolo]');
    await page.waitForTimeout(400);
    await shot('3-levels');
    await page.click('[data-act=level][data-level="1"]');
  }
} else await page.click(`[data-act=mode][data-mode=${mode}]`);
if (mode !== 'solo') { await page.waitForTimeout(3000); await shot('3-lobby'); }
await page.waitForFunction(() => window.__vi.state === 'play' && window.__vi.m, null, { timeout: 30000 });
await page.waitForTimeout(1200);
await shot('4-countdown');
await page.waitForFunction(() => window.__vi.m.state === 'play', null, { timeout: 15000 });
await page.waitForTimeout(6000);
await shot('5-play');
const info = await page.evaluate(() => { const a = window.__vi, m = a.m; return { mode: m.mode.id, time: +m.time.toFixed(1), actors: m.actors.map((x) => `${x.name}${x.bot ? '' : '*'}:${x.team}:${x.role || ''}:${x.pos.x.toFixed(0)}`), hud: document.querySelector('#hud .info').innerText.replace(/\n/g, ' | ') }; });
console.log(JSON.stringify(info));
if (mode === 'deathrun') {
  const r = await page.evaluate(() => { const a = window.__vi, md = a.m.mode; const ok = md.trigger(0, md.death); return { ok, role: a.me.role }; });
  await page.waitForTimeout(300);
  await shot('6-trap');
  console.log('trap', JSON.stringify(r));
}
if (mode === 'solo') {
  await page.evaluate(() => { const a = window.__vi; a.me.pos.y -= 30; });
  await page.waitForTimeout(600);
  const back = await page.evaluate(() => { const a = window.__vi; return { y: a.me.pos.y.toFixed(1), falls: a.me.falls, alive: a.me.alive }; });
  console.log('fall', JSON.stringify(back));
  await shot('6-fallback');
  await page.evaluate(() => { const a = window.__vi, f = a.m.map.finish; a.me.pos.x = f.x + 0.5; a.me.pos.y = f.y; a.me.pos.z = f.z + 0.5; a.me.vel.x = a.me.vel.y = a.me.vel.z = 0; });
} else {
  await page.evaluate(() => {
    const a = window.__vi, m = a.m, md = m.mode;
    if (md.id === 'race') { for (const o of m.actors) { const f = m.map.finish; o.pos.x = f.x + 0.5; o.pos.y = f.y; o.pos.z = f.z + 0.5; o.vel.y = 0; } }
    else if (md.id === 'deathrun') { for (const o of m.actors) if (o.role === 'runner') { const f = m.map.finish; o.pos.x = f.x + 0.5; o.pos.y = f.y; o.pos.z = 0.5; o.vel.y = 0; } }
    else m.finish(a.me.team);
  });
}
await page.waitForTimeout(5500);
await shot('7-results');
const fin = await page.evaluate(() => ({ state: window.__vi.state, res: document.querySelector('#screen') ? document.querySelector('#screen').innerText.replace(/\n+/g, ' | ').slice(0, 260) : '', pk: JSON.stringify(window.__vi.save.data.parkour || null) }));
console.log(JSON.stringify(fin));
if (mode === 'solo' && fin.state === 'results') {
  await page.click('[data-act=pkLevels]');
  await page.waitForTimeout(800);
  await shot('8-levels-after');
}
console.log(errors.length ? errors.slice(0, 8).join('\n') : 'no errors');
await browser.close();
