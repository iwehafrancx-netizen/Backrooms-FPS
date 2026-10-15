import { buildSkyIslands } from '../../src/game/maps.js';
import { Match } from '../../src/game/match.js';
import { SkyIslands } from '../../src/game/modes/skyislands.js';
import { Actor } from '../../src/game/actor.js';
import { Bot } from '../../src/game/bot.js';
const seed = +(process.argv[2] || 7);
let s = seed; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const map = buildSkyIslands(seed, 'meadow'); const m = new Match(map, new SkyIslands(), { seed });
const bots = [];
for (let i = 0; i < 8; i++) { const a = m.add(new Actor({ name: `bot${i}`, bot: true })); bots.push(new Bot(a, m, 0.3 + (i % 4) * 0.2)); }
m.mode.setup(bots.map((b) => b.a));
const dt = 1 / 30; let next = 60;
while (m.time < 560 && !m.over) {
  m.update(dt);
  for (const e of m.events) if (e.t === 'kill') console.log(`${m.time.toFixed(0)}s ${e.a.name} died (${e.cause})${e.by ? ' by ' + e.by.name : ''}`);
  m.events.length = 0;
  if (m.time > next) { next += 50; for (const b of bots) if (b.a.alive) { const a = b.a; console.log(`${m.time.toFixed(0)} ${a.name} goal=${b.goal && b.goal.t}${b.goal && b.goal.o ? ':' + b.goal.o.name : ''} pos=${a.pos.x.toFixed(1)},${a.pos.y.toFixed(1)},${a.pos.z.toFixed(1)} blocks=${a.inv.blocks()} bridge=${!!b.bridge} path=${b.path ? b.path.length + '/' + b.pi + (b.pathReached ? 'R' : 'U') : '-'} mine=${!!b.mineTarget} stuck=${b.stuckT.toFixed(1)}`); } }
}
console.log('end', m.time.toFixed(0), m.over ? m.winner && m.winner.name : 'none');
const b = bots[3], a = b.a, w = m.world;
for (let k = 0; k < 90; k++) {
  m.update(dt);
  if (k % 15 === 0 && b.bridge) { const br = b.bridge, n = br.cells[br.i]; const ids = []; for (let y = br.y - 2; y <= br.y + 2; y++) ids.push(w.get(n[0], y, n[1])); console.log('bridge', JSON.stringify({ i: br.i, len: br.cells.length, next: n, by: br.y, gy: br.gy, t: br.t.toFixed(1), pos: [a.pos.x.toFixed(2), a.pos.y.toFixed(2), a.pos.z.toFixed(2)], col: ids, ctl: { mx: b.ctlObj.mx.toFixed(2), mz: b.ctlObj.mz.toFixed(2), crouch: b.ctlObj.crouch, yaw: b.ctlObj.yaw.toFixed(2), pitch: b.ctlObj.pitch.toFixed(2) }, here: [Math.floor(a.pos.x), Math.floor(a.pos.y), Math.floor(a.pos.z)], under: w.get(Math.floor(a.pos.x), Math.floor(a.pos.y) - 1, Math.floor(a.pos.z)) })); }
}
