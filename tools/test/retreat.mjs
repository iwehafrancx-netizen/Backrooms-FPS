// A hostile engaging the player is shot down to 35% health: it must retreat out of the player's sight,
// recover, and come back.
import { open } from './harness.mjs';
const { browser, page, log } = await open({ width: 640, height: 360 });
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 90000 });
await page.click('#boot-enter');
await page.evaluate(() => window.__BR.Game.start(1, 'ak47', 'pistol'));
await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
const r = await page.evaluate(() => {
  const B = window.__BR, G = B.Game; G.countdownT = 0; G.player.armor = 0.0001; B.World.render = () => {};
  const step = (n) => { for (let i = 0; i < n; i++) G.update(1 / 30); };
  // only one hostile and the player matter: park everyone else far away and passive
  const foes = G.actors.filter((a) => a.bot && a.team === 'B'), allies = G.actors.filter((a) => a.bot && a.team === 'A');
  for (const a of [...allies, ...foes.slice(1)]) { a.bot.brain.update = () => {}; a.bot.perceive = () => {}; a.bot.agent.teleport({ x: 27, y: 0, z: -22 }); }
  const f = foes[0], p = G.player; f.spawnTime = -99;
  const c = B.Nav.closest({ x: 8, y: 0, z: 12 }); const pc = B.Nav.closest({ x: 8, y: 0, z: 19 });
  f.bot.agent.teleport(c); p.pos.set(pc.x, 0, pc.z); B.Player.ref = 0;
  step(60);
  const before = f.bot.brain.currentState.constructor.name;
  B.Combat.damage(f, f.maxHp * 0.65, p, false, 'ak47');
  const after = f.bot.brain.currentState.constructor.name, hp0 = Math.round(f.hp);
  const trace = [];
  for (let k = 0; k < 14; k++) {
    step(30);
    const eye = p.eye(new THREE.Vector3()), fc = f.chest(new THREE.Vector3());
    trace.push(`${k + 1}s ${f.bot.brain.currentState.constructor.name.slice(0, 4)} hp=${Math.round(f.hp)} d=${B.Nav && Math.hypot(f.pos.x - p.pos.x, f.pos.z - p.pos.z).toFixed(1)} seen=${B.World.los(eye, fc) ? 'Y' : 'n'}${f.bot.hiding ? ' hiding' : ''}`);
  }
  return { before, after, hp0, trace };
});
console.log(r.before, '->', r.after, 'hp', r.hp0); console.log(r.trace.join('\n'));
console.log('errors', log.errors);
await browser.close();
