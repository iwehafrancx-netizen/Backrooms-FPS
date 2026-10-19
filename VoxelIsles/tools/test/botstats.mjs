import { REGISTRY } from '../../src/game/modes/index.js';
import { MODES } from '../../src/game/session.js';
import { Match } from '../../src/game/match.js';
import { Actor } from '../../src/game/actor.js';
import { Bot } from '../../src/game/bot.js';
const id = process.argv[2] || 'sky', seeds = (process.argv[3] || '1').split(',').map(Number), maxT = +(process.argv[4] || 600);
const def = MODES[id];
for (const seed of seeds) {
  let s = seed * 7919; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const mp = def.maps[seed % def.maps.length];
  const map = REGISTRY[id].build(mp), mode = REGISTRY[id].make({ save: {}, slots: [] });
  const m = new Match(map, mode, { seed, countdown: 3 });
  const actors = [], bots = [];
  for (let i = 0; i < def.players; i++) { const a = m.add(new Actor({ name: `bot${i}`, bot: true, team: def.teams ? Math.floor(i / (def.teamSize || 2)) : -1 })); bots.push(new Bot(a, m, 0.3 + (i % 4) * 0.18)); actors.push(a); }
  mode.setup(actors);
  const intents = {}, t0 = Date.now(); let frames = 0, kills = 0, notices = 0;
  const causes = {};
  while (m.time < maxT && !m.over) {
    m.update(1 / 30); frames++;
    for (const b of bots) if (b.a.alive) intents[b.brain.intent] = (intents[b.brain.intent] || 0) + 1;
    for (const e of m.events) {
      if (e.t === 'kill') { kills++; const k = e.cause + (e.by ? '+by' : ''); causes[k] = (causes[k] || 0) + 1; if (process.argv.includes('-v')) console.log('   ', m.time.toFixed(0), e.a.name, e.cause, e.by ? e.by.name : '', e.a.botRef && e.a.botRef.brain.intent, e.a.botRef && !!e.a.botRef.bridge); }
      if (e.t === 'notice') notices++;
      if (e.t === 'egg' || e.t === 'teamout' || e.t === 'over') { (globalThis.ev ||= []).push(`${e.t}@${m.time.toFixed(0)}`); }
    }
    m.events.length = 0;
  }
  globalThis.causes = causes;
  const ms = (Date.now() - t0) / frames;
  const tot = Object.values(intents).reduce((x, y) => x + y, 0);
  console.log(`== ${id} seed ${seed} ${mp.id}: ${m.over ? 'winner ' + (m.winner && m.winner.name ? m.winner.name : m.winner) : 'no winner'} at ${m.time.toFixed(0)}s, kills ${kills}, notices ${notices}, ${ms.toFixed(2)} ms/frame`);
  console.log('   causes', JSON.stringify(globalThis.causes), 'events', (globalThis.ev || []).join(' ')); globalThis.causes = {}; globalThis.ev = [];
  console.log('   placed', actors.map((a) => a.placed).join(','), 'broken', actors.map((a) => a.broken).join(','), 'profiles', bots.map((b) => b.brain.profileName.slice(0, 4)).join(','));
  console.log('   intents', Object.entries(intents).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / tot).toFixed(0)}%`).join(', '));
}
