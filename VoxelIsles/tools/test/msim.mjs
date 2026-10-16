import { REGISTRY } from '../../src/game/modes/index.js';
import { MODES } from '../../src/game/session.js';
import { Match } from '../../src/game/match.js';
import { Actor } from '../../src/game/actor.js';
import { Bot } from '../../src/game/bot.js';

const id = process.argv[2] || 'ctf', seeds = (process.argv[3] || '1').split(',').map(Number), maxT = +(process.argv[4] || 600), verbose = process.argv.includes('-v');
const def = MODES[id];
for (const seed of seeds) {
  let s = seed * 7919; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const t0 = Date.now();
  const mp = def.maps[seed % def.maps.length];
  const map = REGISTRY[id].build(mp);
  const mode = REGISTRY[id].make({ save: {}, slots: [] });
  const m = new Match(map, mode, { seed });
  const actors = [];
  for (let i = 0; i < def.players; i++) { const a = m.add(new Actor({ name: `bot${i}`, bot: true, team: def.teams ? Math.floor(i / (def.teamSize || 2)) : -1 })); new Bot(a, m, 0.3 + (i % 4) * 0.18); actors.push(a); }
  mode.setup(actors);
  const log = [];
  let notices = 0, kills = 0;
  const dt = 1 / 30;
  while (m.time < maxT && !m.over) {
    m.update(dt);
    for (const e of m.events) {
      if (e.t === 'notice') { notices++; log.push(`${m.time.toFixed(0)}s ${e.text}`); }
      if (e.t === 'kill') { kills++; if (verbose) log.push(`${m.time.toFixed(0)}s ${e.a.name} died (${e.cause})${e.by ? ' by ' + e.by.name : ''}`); }
    }
    m.events.length = 0;
  }
  const hud = mode.hud ? mode.hud(actors[0]) : null;
  console.log(`== ${id} seed ${seed} map ${mp.id}: ${m.over ? 'winner ' + (m.winner && m.winner.name ? m.winner.name : m.winner) : 'no winner'} at ${m.time.toFixed(0)}s, ${kills} kills, ${notices} notices (sim ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  if (hud) console.log('   hud:', JSON.stringify(hud).slice(0, 300));
  console.log(log.slice(0, verbose ? 200 : 14).map((l) => '   ' + l).join('\n'));
}
