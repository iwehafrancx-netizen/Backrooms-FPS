import { buildEggIslands } from '../../src/game/maps.js';
import { Match } from '../../src/game/match.js';
import { EggDefense } from '../../src/game/modes/eggdefense.js';
import { Actor } from '../../src/game/actor.js';
import { Bot } from '../../src/game/bot.js';
const seed = +(process.argv[2] || 4), who = +(process.argv[3] || 1), maxT = +(process.argv[4] || 300);
const map = buildEggIslands(seed, 'snow'); const m = new Match(map, new EggDefense(), { seed });
const bots = [];
for (let i = 0; i < 8; i++) { const a = m.add(new Actor({ name: `bot${i}`, bot: true, team: Math.floor(i / 2) })); bots.push(new Bot(a, m, 0.6)); }
m.mode.setup(m.actors);
let last = 0;
while (m.time < maxT && !m.over) {
  m.update(1 / 30); m.events.length = 0;
  if (m.time - last >= 5) { last = m.time; const b = bots[who], a = b.a; console.log(`${m.time.toFixed(0)}s role=${b.role} pos=${a.pos.x.toFixed(1)},${a.pos.y.toFixed(1)},${a.pos.z.toFixed(1)} alive=${a.alive} blocks=${a.inv.blocks()} iron=${a.inv.count(170)} gold=${a.inv.count(171)} ar=${a.inv.armorPoints()} bridge=${b.bridge ? `${b.bridge.i}/${b.bridge.cells.length} y${b.bridge.y} g(${b.bridge.gx},${b.bridge.gy},${b.bridge.gz})` : '-'} path=${b.path ? b.pi + '/' + b.path.length + (b.pathReached ? 'R' : '') : '-'} target=${b.eggTarget ? b.eggTarget.i : '-'} stuck=${b.stuckT.toFixed(1)}`); }
}
