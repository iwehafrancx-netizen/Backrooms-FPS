import { buildSkyIslands } from '../../src/game/maps.js';
import { Match } from '../../src/game/match.js';
import { SkyIslands } from '../../src/game/modes/skyislands.js';
import { Actor } from '../../src/game/actor.js';
import { Bot } from '../../src/game/bot.js';

const mode = process.argv[2] || 'sky', seeds = (process.argv[3] || '7').split(',').map(Number), maxT = +(process.argv[4] || 420);
for (const seed of seeds) {
  const t0 = Date.now();
  let map, m;
  if (mode === 'sky') { map = buildSkyIslands(seed, ['meadow', 'desert', 'snow', 'volcano'][seed % 4]); m = new Match(map, new SkyIslands(), { seed }); }
  else { const { buildEggIslands } = await import('../../src/game/maps.js'); const { EggDefense } = await import('../../src/game/modes/eggdefense.js'); map = buildEggIslands(seed, ['snow', 'volcano'][seed % 2]); m = new Match(map, new EggDefense(), { seed }); }
  const n = mode === 'sky' ? 8 : 8;
  const actors = [];
  for (let i = 0; i < n; i++) { const a = m.add(new Actor({ name: `bot${i}`, bot: true, team: mode === 'sky' ? -1 : Math.floor(i / 2) })); new Bot(a, m, 0.3 + (i % 4) * 0.2); actors.push(a); }
  m.mode.setup(actors);
  const log = [];
  let lastLog = 0;
  for (const e of []) log.push(e);
  const dt = 1 / 30;
  while (m.time < maxT && !m.over) {
    m.update(dt);
    for (const e of m.events) if (e.t === 'kill') log.push(`${m.time.toFixed(0)}s ${e.a.name} died (${e.cause})${e.by ? ' by ' + e.by.name : ''}`); else if (e.t === 'egg') log.push(`${m.time.toFixed(0)}s egg ${e.team} broken by ${e.by?.name}`); else if (e.t === 'refill' || e.t === 'border') log.push(`${m.time.toFixed(0)}s ${e.t}`);
    m.events.length = 0;
    if (m.time - lastLog > 60) { lastLog = m.time; log.push(`${m.time.toFixed(0)}s alive ${m.actors.filter((a) => a.alive).length} placed ${m.actors.reduce((s, a) => s + a.placed, 0)} looted ${m.map.chests.filter((c) => c.looted).length}/${m.map.chests.length}`); }
  }
  console.log(`== seed ${seed} ${mode}: ${m.over ? 'winner ' + (m.winner?.name ?? m.winner) : 'no winner'} at ${m.time.toFixed(0)}s (sim ${(Date.now() - t0) / 1000}s)`);
  console.log(log.join('\n'));
  console.log('stats', actors.map((a) => `${a.name}:k${a.kills} p${a.placed} b${a.broken} hp${a.hp.toFixed(0)} ar${a.inv.armorPoints()}`).join(' '));
}
