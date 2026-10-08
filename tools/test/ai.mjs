import { open } from './harness.mjs';
const { browser, page, log } = await open({ width: 640, height: 360 });
await page.waitForFunction(() => window.__yt && window.__yt.calls.some((c) => c[0] === 'gameReady'), null, { timeout: 90000 });
await page.click('#boot-enter');
const start = async (i) => {
  await page.evaluate((i) => window.__BR.Game.start(i, 'ak47', 'pistol'), i);
  await page.waitForFunction(() => window.__BR.Game.state === 'play' && !window.__BR.Game.starting, null, { timeout: 30000 });
};
const out = {};

await start(0);
out.coverage = await page.evaluate(() => {
  const B = window.__BR, G = B.Game; G.countdownT = 0; B.World.render = () => {};
  window.__noise = G.noise; G.noise = () => {}; for (const a of G.actors) if (a.bot) a.bot.vision.visible = () => false;
  const step = (n) => { for (let i = 0; i < n; i++) G.update(1 / 20); };
  const res = [];
  for (const sec of [60, 120, 180, 240, 300]) {
    step(20 * 60);
    const v = B.Nav.visits('B'); let n = 0; for (const t of v) if (t > 0) n++;
    res.push(`${sec}s ${Math.round((n / v.length) * 100)}%`);
  }
  return { cells: B.Nav.cells.length, progress: res.join(' · ') };
});

await start(0);
out.noMagic = await page.evaluate(() => {
  const B = window.__BR, G = B.Game, p = G.player; G.countdownT = 0; B.World.render = () => {}; p.armor = 0.0001; G.noise = window.__noise;
  const spot = B.Nav.closest({ x: -28, y: 0, z: 19 });
  p.pos.set(spot.x, 0, spot.z); B.Player.ref = 0;
  const losFrom = (b) => B.World.los(new THREE.Vector3(b.a.pos.x, b.a.pos.y + 1.5, b.a.pos.z), new THREE.Vector3(p.pos.x, p.pos.y + (p.crouching ? 1.0 : 1.35), p.pos.z));
  let lag = 0, shots = 0, blind = 0, picks = 0, blindPicks = 0, firstSeen = null;
  for (const a of G.actors) if (a.bot) {
    const b = a.bot, orig = b.shootAt.bind(b);
    b.shootAt = (tg) => { if (tg === p) { shots++; if (losFrom(b)) b._sawAt = G.time; else { blind++; lag = Math.max(lag, G.time - (b._sawAt ?? -99)); } } return orig(tg); };
  }
  for (let i = 0; i < 20 * 120; i++) {
    p.crouching = true; p.hp = p.maxHp; G.update(1 / 20);
    for (const a of G.actors) if (a.bot && a.alive && a.bot.target === p && a.bot.perceiveT > 0.15) { picks++; if (!losFrom(a.bot)) blindPicks++; if (firstSeen == null) firstSeen = Math.round(G.time); }
  }
  return { shots, shotsWithoutSight: blind, longestSinceLastSight: lag.toFixed(2) + 's', targetFrames: picks, targetWithoutSight: blindPicks, firstSpottedAt: firstSeen };
});

out.hearing = await page.evaluate(() => {
  const B = window.__BR, G = B.Game, p = G.player, errs = [];
  for (const a of G.actors) if (a.bot) { a.bot.vision.visible = () => false; a.bot.memory.records.forEach((r) => { r.visible = false; }); }
  for (let k = 0; k < 40; k++) {
    for (const a of G.actors) if (a.bot && a.alive) {
      const d = Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z); if (d > 12) { const c = B.Nav.randomAround(p.pos, 8); a.bot.agent.teleport(c); a.pos.set(c.x, c.y, c.z); }
      a.bot.forget && a.bot.memory.records.forEach((r) => a.bot.forget(r));
    }
    G.noise(p, 14);
    for (const a of G.actors) if (a.bot && a.alive) { const r = a.bot.memory.getRecord(p.ent); if (r && G.time - r.timeLastSensed < 0.01 && !r.visible) errs.push(Math.hypot(r.lastSensedPosition.x - p.pos.x, r.lastSensedPosition.z - p.pos.z)); }
  }
  errs.sort((a, b) => a - b);
  return { samples: errs.length, minErr: errs[0]?.toFixed(2), medianErr: errs[errs.length >> 1]?.toFixed(2), exact: errs.filter((e) => e < 0.05).length };
});

await start(1);
out.decisions = await page.evaluate(() => {
  const B = window.__BR, G = B.Game, p = G.player; G.countdownT = 0; B.World.render = () => {}; p.armor = 0.0001;
  const step = (n) => { for (let i = 0; i < n; i++) G.update(1 / 30); };
  const foes = G.actors.filter((a) => a.bot && a.team === 'B'), allies = G.actors.filter((a) => a.bot && a.team === 'A');
  const park = (list) => { for (const a of list) { a.bot.brain.update = () => {}; a.bot.perceive = () => { a.bot.target = null; }; a.bot.agent.teleport({ x: 27, y: 0, z: -22 }); a.pos.set(27, 0, -22); } };
  park([...allies, ...foes.slice(1)]);
  const f = foes[0], b = f.bot; f.spawnTime = -99; for (const a of foes.slice(1)) a.spawnTime = -99;
  const st = () => b.brain.currentState.constructor.name;
  const place = (fp, pp, faceAway) => {
    const c = B.Nav.closest(fp), pc = B.Nav.closest(pp);
    b.brain.changeTo('patrol'); b.target = null; b.memory.records.forEach((r) => b.forget(r)); b.lastRetreat = -99; f.hp = f.maxHp; b.mag = 30; b.reloadT = 0;
    b.agent.teleport(c); f.pos.set(c.x, c.y, c.z); p.pos.set(pc.x, 0, pc.z); B.Player.ref = 0; p.hp = p.maxHp;
    const toP = Math.atan2(pc.x - c.x, pc.z - c.z); b.yaw = faceAway ? toP + Math.PI : toP; f.lastHurt = -99;
  };
  const r = {};
  place({ x: 8, y: 0, z: 12 }, { x: 8, y: 0, z: 19 }, true);
  b.patrolZone = null; b.brain.update = () => {}; b.perceive(); const before = b.target;
  B.Combat.damage(f, 20, p, false, 'ak47');
  const rec = b.memory.getRecord(p.ent);
  r.unseenHit = { targetBefore: !!before, stateAfter: st(), reason: st() === 'Retreat' ? b.retreatReason : '-', guessErr: rec ? Math.hypot(rec.lastSensedPosition.x - p.pos.x, rec.lastSensedPosition.z - p.pos.z).toFixed(2) : null, turning: Math.abs(((b.lookYaw - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI).toFixed(2) };
  delete b.brain.update;
  place({ x: 8, y: 0, z: 12 }, { x: 8, y: 0, z: 22 }, false);
  step(20); r.reloadBefore = st();
  b.mag = 0; b.reloadT = 0; step(2);
  r.emptyMag = { state: st(), reason: b.retreatReason, coverHidden: b.coverPos ? !B.World.los(p.eye(new THREE.Vector3()), new THREE.Vector3(b.coverPos.x, 1.3, b.coverPos.z)) : null };
  const trail = []; for (let k = 0; k < 8; k++) { step(15); trail.push(`${st().slice(0,4)} hid=${b.hiding} rt=${(b.retreatT||0).toFixed(1)} dc=${b.coverPos ? Math.hypot(b.coverPos.x - f.pos.x, b.coverPos.z - f.pos.z).toFixed(1) : '-'} mag=${b.mag} rl=${b.reloadT.toFixed(1)} ht=${(b.hideT||0).toFixed(1)}`); } r.emptyMag.trail = trail;
  place({ x: 8, y: 0, z: 12 }, { x: 8, y: 0, z: 22 }, false);
  step(20); p.hp = p.maxHp * 0.2; b.assessT = 0; step(2);
  r.weakTarget = { state: st(), push: b.push };
  p.hp = p.maxHp; b.assessT = 0; step(2); r.healthyTarget = { state: st(), push: b.push };
  place({ x: 8, y: 0, z: 12 }, { x: 8, y: 0, z: 22 }, false);
  const ally = allies[0]; const ac = B.Nav.closest({ x: 10, y: 0, z: 21 }); ally.pos.set(ac.x, ac.y, ac.z); ally.bot.agent.teleport(ac);
  step(20); f.hp = f.maxHp * 0.6; b.assessT = 0; step(2);
  r.outnumbered = { state: st(), reason: b.retreatReason, seen: b.memory.records.filter((x) => x.visible).length };
  place({ x: 8, y: 0, z: 12 }, { x: 8, y: 0, z: 22 }, false);
  ally.pos.set(27, 0, -22); ally.bot.agent.teleport({ x: 27, y: 0, z: -22 });
  step(20); B.Combat.damage(f, f.maxHp * 0.65, p, false, 'ak47');
  const hurt = { state: st(), reason: b.retreatReason, hp: Math.round(f.hp) };
  for (let k = 0; k < 12 && st() === 'Retreat'; k++) step(30);
  hurt.after = st() + ' hp=' + Math.round(f.hp); r.hurt = hurt;
  return r;
});
console.log(JSON.stringify(out, null, 1));
console.log('errors', log.errors);
await browser.close();
