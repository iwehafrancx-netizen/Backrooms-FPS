import { buildDeathRun } from '../../src/game/maps/deathrun.js';
import { buildParkour } from '../../src/game/maps/parkour.js';
import { Match } from '../../src/game/match.js';
import { Actor } from '../../src/game/actor.js';
import { Bot } from '../../src/game/bot.js';
const kind = process.argv[2] || 'deathrun', seeds = (process.argv[3] || '11,12,13,14').split(',').map(Number), skill = +(process.argv[4] || 0.9);
class Dummy { constructor() { this.id = 'test'; this.noPvp = true; this.dropsOnDeath = false; } attach(m) { this.m = m; } setup() {} start() {} update() {} canBreak() { return false; } canPlace() { return false; } dropFor() { return 0; } onBreak() {} onDeath() {} respawn() {} botPlan(bot, dt) { bot.followRoute(this.m.map.route, dt); return bot.ctlObj; } }
for (const seed of seeds) {
  const map = kind === 'deathrun' ? buildDeathRun(seed, {}) : buildParkour(seed, { level: seed });
  let ok = 0, worst = 1e9, info = [];
  for (let trial = 0; trial < 6; trial++) {
    let s = seed * 31 + trial; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const m = new Match(map, new Dummy(), { seed, countdown: 0 });
    const a = m.add(new Actor({ name: 't', bot: true }));
    const b = new Bot(a, m, skill);
    const sp = map.runnerSpawns ? map.runnerSpawns[0] : map.start;
    a.pos.x = sp.x; a.pos.y = sp.y; a.pos.z = sp.z;
    if (map.gate) for (const [x, y, z] of map.gate) map.world.set(x, y, z, 0);
    let tt = 0;
    while (tt < 200 && a.alive && (b.rI ?? 0) < map.route.length) { m.update(1 / 30); m.events.length = 0; tt += 1 / 30; }
    if (b.rI >= map.route.length) ok++;
    else info.push(`fail@node${b.rI}/${map.route.length} ${JSON.stringify(map.route[b.rI])} pos ${a.pos.x.toFixed(1)},${a.pos.y.toFixed(1)},${a.pos.z.toFixed(1)} alive ${a.alive}`);
    worst = Math.min(worst, b.rI);
  }
  console.log(`${kind} seed ${seed}: ${ok}/6 finished, ${map.route.length} nodes`, info.slice(0, 2).join(' || '));
}
