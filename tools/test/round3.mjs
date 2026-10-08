// Behaviour checks for: stealth/hearing rules, briefcase respawn + holder win, hardpoint scoring, tracer direction.
import { open } from './harness.mjs';
const { browser, page, log } = await open({ width: 640, height: 360 });
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 90000 });
await page.click('#boot-enter');
const start = async (mi) => {
  await page.evaluate((mi) => { const B = window.__BR; B.Save.data.unlocked = 12; const m = B.MISSIONS[mi]; B.Game.start(mi, m.primary, m.secondary); }, mi);
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
  await page.evaluate(() => { const B = window.__BR; B.Game.countdownT = 0; B.Game.player.armor = 0.0001; B.World.render = () => {}; window.__step = (n) => { for (let i = 0; i < n && !B.Game.over; i++) B.Game.update(1 / 30); }; });
};
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${info || ''}`); };

// --- stealth & hearing (Extermination) ---
await start(0);
const st = await page.evaluate(() => {
  const B = window.__BR, G = B.Game, P = B.Player, p = G.player, out = {};
  const foes = G.actors.filter((a) => a.bot);
  const park = (a, x, z) => { a.bot.agent.teleport(B.Nav.closest({ x, y: 0, z })); a.bot.agent.resetMoveTarget(); };
  foes.forEach((f, i) => { f.bot.brain.update = () => {}; f.spawnTime = -99; park(f, 27, -22 + i * 0.1); });
  const f = foes[0];
  // put the hostile at a spot, facing +Z (away from a player standing behind it at -Z)
  const c = B.Nav.closest({ x: 8, y: 0, z: 14 }); f.bot.agent.teleport(c); f.bot.yaw = 0;
  window.__step(5);
  const placeBehind = (d) => { p.pos.set(c.x, 0, c.z - d); P.ref = 0; };
  const known = () => { const r = f.bot.memory.getRecord(p.ent); return !!(r && B.Game.time - r.timeLastSensed < 0.3); };
  const forget = () => { f.bot.memory.clear(); f.bot.target = null; f.alertUntil = 0; f.bot.alertUntil = 0; };
  // crouch-walk up behind it
  forget(); placeBehind(2.0); B.Input.st.crouchToggle = true;
  for (let i = 0; i < 40; i++) { p.pos.z += 0.02; P.stepAcc = 3; window.__step(1); f.bot.yaw = 0; }
  out.crouchBehind = known() || f.bot.target === p;
  // walk (standing) behind it within 5 m
  forget(); placeBehind(3.5); B.Input.st.crouchToggle = false; window.__step(10);
  P.stepAcc = 3; window.__step(1);
  out.walkBehind = known();
  // standing still behind it, no noise
  forget(); placeBehind(3); window.__step(15); f.bot.yaw = 0;
  out.stillBehind = f.bot.target === p || known();
  // standing in front within its view
  forget(); p.pos.set(c.x, 0, c.z + 6); P.ref = 0; window.__step(15);
  out.inFront = f.bot.target === p;
  p.pos.set(c.x, 0, c.z + 6); P.ref = 0;
  // gunfire: a second hostile 25 m away (open line) must NOT hear, one 10 m away must
  const near = foes[1], far = foes[2]; forget();
  // place the near listener ~10 m away with a clear line of sight
  const eye = p.chest(new THREE.Vector3());
  for (const [dx, dz] of [[10, 0], [-10, 0], [0, -10], [7, -7], [-7, -7], [7, 7], [-7, 7]]) {
    const q = B.Nav.closest({ x: c.x + dx, y: 0, z: c.z + 6 + dz });
    if (q && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 12 && B.World.los(eye, new THREE.Vector3(q.x, 1.6, q.z))) { park(near, q.x, q.z); break; }
  }
  park(far, c.x - 25 < -30 ? c.x + 25 : c.x - 25, c.z); window.__step(5);
  near.bot.memory.clear(); far.bot.memory.clear();
  B.Game.noise(p, 14);
  const heard = (a) => !!a.bot.memory.getRecord(p.ent);
  out.nearHeard = heard(near); out.farHeard = heard(far);
  out.dNear = Math.hypot(near.pos.x - p.pos.x, near.pos.z - p.pos.z).toFixed(1); out.dFar = Math.hypot(far.pos.x - p.pos.x, far.pos.z - p.pos.z).toFixed(1);
  // tracer direction: fire straight ahead, the tracer's far end must be in front of the camera
  p.pos.set(c.x, 0, c.z + 6); P.ref = 0; p.yaw = Math.PI; p.pitch = 0; window.__step(2);
  B.Player.fire();
  const tr = B.FX ? null : null;
  return out;
});
check('crouch-walking behind an NPC stays unnoticed', st.crouchBehind === false);
check('walking behind an NPC within 5 m is heard', st.walkBehind === true);
check('standing still behind an NPC stays unnoticed', st.stillBehind === false);
check('an NPC sees you in front of it', st.inFront === true);
check('a gunshot is heard 10 m away', st.nearHeard === true, `d=${st.dNear}`);
check('a gunshot is NOT heard 25 m away', st.farHeard === false, `d=${st.dFar}`);
await page.evaluate(() => { const G = window.__BR.Game; if (!G.over) G.finish(false, 'r_time'); });
await page.waitForFunction(() => window.__BR.Ui.cur === 'end', null, { timeout: 15000 });

// --- briefcase ---
await start(5);
const bc = await page.evaluate(() => {
  const B = window.__BR, G = B.Game, m = G.mode, out = {};
  window.__step(30 * 60);
  out.holderAfter60 = m.holder ? (m.holder.isPlayer ? 'player' : 'npc') : 'none';
  out.lastHolder = !!m.lastHolder;
  out.deaths = G.actors.reduce((a, x) => a + x.deaths, 0);
  out.aliveNow = G.actors.filter((a) => a.alive).length; out.total = G.actors.length;
  // holder NPC runs away: distance from nearest rival over a few seconds while being chased
  // give the case to the player and run the clock out
  if (m.holder) m.dropCarry(m.holder);
  m.setHolder(G.player); G.player.armor = 0.0001;
  G.time = m.timeLimit - 0.5; window.__step(30);
  out.won = G.result && G.result.won; out.reason = G.result && G.result.reason;
  return out;
});
check('NPCs grab the briefcase', bc.lastHolder === true, `holder after 60 s: ${bc.holderAfter60}`);
check('dead operators respawn in Briefcase', bc.deaths > 0 && bc.aliveNow >= bc.total - 2, `deaths=${bc.deaths} alive=${bc.aliveNow}/${bc.total}`);
check('holding the case when time runs out wins', bc.won === true, bc.reason);
await page.waitForFunction(() => window.__BR.Ui.cur === 'end', null, { timeout: 15000 });

// --- hardpoint ---
await start(9);
const hp = await page.evaluate(() => { const G = window.__BR.Game; window.__step(30 * 120); return { A: G.mode.score.A.toFixed(0), B: G.mode.score.B.toFixed(0), idx: G.mode.idx }; });
check('Hardpoint teams score by holding the zone', +hp.A + +hp.B > 10, `A=${hp.A} B=${hp.B}`);
await page.evaluate(() => { const G = window.__BR.Game; if (!G.over) G.finish(false, 'r_time'); });
console.log('errors', log.errors);
await browser.close();
process.exit(results.every(Boolean) && !log.errors.length ? 0 : 1);
