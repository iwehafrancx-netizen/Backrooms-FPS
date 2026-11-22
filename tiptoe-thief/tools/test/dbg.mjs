import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } });
p.on('pageerror', (e) => console.log('ERR', e.message, e.stack));
await p.goto('http://127.0.0.1:8770/dev/index.html');
await p.waitForFunction(() => window.__tt && window.__tt.screens && window.__tt.screens.cur === 'title-screen', null, { timeout: 120000 });
await p.evaluate(() => { const a = window.__tt; a.save.data.howSeen = true; a.startLevel(0); });
for (let i = 0; i < 4; i++) { await p.waitForTimeout(1500); console.log(await p.evaluate(() => { const g = window.__tt.game, x = g.guards[0]; return JSON.stringify({ st: g.state, gs: x.state, pos: [x.pos.x.toFixed(2), x.pos.z.toFixed(2)], ri: x.ri, wait: x.waitT.toFixed(2), path: x.path && x.path.length, cone: x.cone.visible, cone1: [...x.cone.geometry.attributes.position.array.slice(0, 6)].map((v) => v.toFixed(1)), t: g.time.toFixed(1) }); })); }
await b.close();
