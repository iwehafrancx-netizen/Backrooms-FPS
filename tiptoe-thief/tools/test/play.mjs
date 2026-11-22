// Plays level 1 for real: walk to the target loot, back to the van, expect the
// win screen. Then a second run where the thief stands in front of the guard
// and must be caught. Runs on game time, so a slow machine only makes it slower.
import { chromium } from 'playwright-core';
const URL_ = process.argv[2] || 'http://127.0.0.1:8770/dev/index.html';
const results = []; const check = (n, ok, info = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${info}`); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(URL_);
await p.waitForFunction(() => window.__tt && window.__tt.screens && window.__tt.screens.cur === 'title-screen', null, { timeout: 120000 });
const start = () => p.evaluate(() => { const a = window.__tt; a.save.data.howSeen = true; a.startLevel(0); });
const gameTime = (sec) => p.waitForFunction((s) => window.__tt.game.time > s, sec, { timeout: 600000, polling: 250 });

// 1) heist: guard put to sleep far away so this checks movement, pickup and exit
await start();
await p.evaluate(() => { const g = window.__tt.game; for (const x of g.guards) { x.update = () => {}; x.cone.visible = false; } });
const target = await p.evaluate(() => { const l = window.__tt.game.loot.find((x) => x.target); return { x: l.pos.x, z: l.pos.z + 0.75 }; });
await p.evaluate((t) => window.__tt.game.player.walkTo({ x: t.x, z: t.z }), target);
await p.waitForFunction(() => window.__tt.game.targetsLeft() === 0 || !window.__tt.game.player.path, null, { timeout: 600000, polling: 250 });
await p.waitForFunction(() => window.__tt.game.targetsLeft() === 0, null, { timeout: 30000, polling: 250 }).catch(() => {});
const took = await p.evaluate(() => ({ left: window.__tt.game.targetsLeft(), pos: [window.__tt.game.player.pos.x.toFixed(2), window.__tt.game.player.pos.z.toFixed(2)] }));
check('walked through the front and bedroom doors and took the jewels', took.left === 0, JSON.stringify(took));
await p.evaluate(() => { const g = window.__tt.game; g.player.walkTo(g.exitPos.clone()); });
await p.waitForFunction(() => window.__tt.screens.cur === 'result', null, { timeout: 600000, polling: 250 }).catch(() => {});
const res = await p.evaluate(() => ({ cur: window.__tt.screens.cur, text: document.querySelector('#screen').innerText.replace(/\s+/g, ' ').slice(0, 120), stars: window.__tt.save.data.stars }));
check('reaching the van wins and shows the stars', res.cur === 'result' && /ESCAPED/.test(res.text) && res.stars['first-night'] >= 1, JSON.stringify(res));

// 2) caught: stand right in front of the guard
await start();
await p.evaluate(() => { const g = window.__tt.game, gd = g.guards[0]; gd.route = []; const f = gd.char.forward(); g.player.pos.set(gd.pos.x + f.x * 2.5, 0, gd.pos.z + f.z * 2.5); });
await p.waitForFunction(() => window.__tt.screens.cur === 'result', null, { timeout: 600000, polling: 250 }).catch(() => {});
const lose = await p.evaluate(() => ({ cur: window.__tt.screens.cur, text: document.querySelector('#screen').innerText.slice(0, 40), guard: window.__tt.game.guards[0].state }));
check('a guard who sees the thief chases and catches them', lose.cur === 'result' && /CAUGHT/.test(lose.text), JSON.stringify(lose));

// 3) hiding: thief hides in the wardrobe in front of a guard who has not noticed -> not caught
await start();
await p.evaluate(() => { const g = window.__tt.game, w = g.level.hideSpots.find((h) => h.t === 'wardrobe'); g.player.hide(w); const gd = g.guards[0]; gd.route = []; gd.pos.set(w.x, 0, w.z + 1.6); gd.char.root.rotation.y = 0; });
await gameTime(4);
const hid = await p.evaluate(() => ({ state: window.__tt.game.state, guard: window.__tt.game.guards[0].state, susp: window.__tt.game.guards[0].suspicion }));
check('hidden in a wardrobe, the guard does not see the thief', hid.state === 'play' && hid.susp === 0, JSON.stringify(hid));

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED');
await b.close();
