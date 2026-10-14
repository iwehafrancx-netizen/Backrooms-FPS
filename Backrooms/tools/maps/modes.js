Models.flag = (color) => {
  const T = THREE, g = new T.Group();
  const pole = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 2.3, 8), new T.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.8, roughness: 0.35 }));
  pole.position.y = 1.15; g.add(pole);
  const knob = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), new T.MeshStandardMaterial({ color: 0xf2c230, metalness: 0.6, roughness: 0.3 }));
  knob.position.y = 2.33; g.add(knob);
  const geo = new T.PlaneGeometry(1.0, 0.62, 10, 4); geo.translate(0.5, 0, 0);
  const cloth = new T.Mesh(geo, new T.MeshBasicMaterial({ color, side: T.DoubleSide }));
  cloth.position.set(0.035, 1.95, 0); g.add(cloth);
  const stripe = new T.Mesh(new T.PlaneGeometry(1.0, 0.1, 10, 1).translate(0.5, 0, 0.004), new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide }));
  cloth.add(stripe);
  g.userData.cloth = cloth; g.userData.rest = geo.attributes.position.array.slice();
  return g;
};

class CaptureTheFlag extends Mode {
  setup() {
    const p = Game.player; p.team = 'A';
    this.respawnDelay = 4; this.botDamageMul = 0.55; this.regen = 14; this.sweep = 0.25;
    const n = this.m.teamSize || 5;
    for (let i = 0; i < n - 1; i++) this.makeBot('A', { weapon: pick(['ak47', 'm4']), role: i % 2 === 0 ? 'attack' : 'defend' });
    for (let i = 0; i < n; i++) this.makeBot('B', { weapon: pick(['ak47', 'm4', 'shotgun', 'ak47']), role: i % 2 === 0 ? 'attack' : 'defend', dmgMul: 0.8 });
    this.score = { A: 0, B: 0 };
    this.stats = { pickups: 0, drops: 0, returns: 0, resets: 0, maxBotY: 0 };
    this.flags = {};
    for (const team of ['A', 'B']) {
      const b = MAP.ctf[team], c = Nav.closest({ x: b.x, y: 0.3, z: b.z }), col = team === 'A' ? 0x3d8bff : 0xff4a3d;
      const home = new THREE.Vector3(c.x, c.y, c.z);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.04, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 }));
      pad.position.set(home.x, home.y + 0.03, home.z); this.props.add(pad);
      const beam = Models.beam(col); beam.position.set(home.x, home.y + 1.4, home.z); this.props.add(beam);
      const model = Models.flag(col); this.props.add(model);
      this.flags[team] = { team, home, pos: home.clone(), model, beam, holder: null, dropped: false, dropT: 0 };
    }
    for (const a of Game.actors) { a.lives = Infinity; this.spawnActor(a, this.safeSpawn(a, this.zoneFor(a), 12)); }
    this.shareT = 0;
  }
  zoneFor(a) { return a.team === 'B' ? MAP.zones.east : MAP.zones.west; }
  foe(team) { return team === 'A' ? 'B' : 'A'; }
  near(a, p, r = 1.5) { return dist2D(a.pos, p) < r && Math.abs(a.pos.y - p.y) < 1.4; }
  take(a, f) {
    f.holder = a; f.dropped = false; a.carrying = f.model; this.stats.pickups++;
    if (a.isPlayer) { Hud.banner(t('b_flagYou')); Audio.pickup(); this.objectiveScore += 300; }
    else if (f.team === 'A') { Hud.banner(t('b_flagTaken')); Audio.alarm(); }
    else Hud.banner(t('b_flagAlly'));
    for (const o of Game.actors) if (o.bot && o.alive && o.team === f.team) o.bot.sense(a, false, true);
  }
  dropCarry(a) {
    for (const f of Object.values(this.flags)) {
      if (f.holder !== a) continue;
      f.holder = null; a.carrying = null; f.dropped = true; f.dropT = 20; this.stats.drops++;
      const c = Nav.closest({ x: a.pos.x, y: a.pos.y, z: a.pos.z }) || a.pos;
      f.pos.set(c.x, c.y, c.z);
      if (f.team === 'B' || a.isPlayer) Hud.banner(t('b_flagDropped'));
    }
  }
  home(f) { if (f.holder) f.holder.carrying = null; f.holder = null; f.dropped = false; f.pos.copy(f.home); }
  reset(f, by) {
    this.home(f);
    if (by) { this.stats.returns++; if (by.isPlayer) this.objectiveScore += 150; } else this.stats.resets++;
    Hud.banner(f.team === 'A' ? t('b_flagReturned') : t('b_flagReset'));
  }
  capture(h, f) {
    const team = h.team; this.score[team]++;
    this.home(f);
    if (team === 'A') { Hud.banner(t('b_capture'), `${this.score.A} / ${this.m.target}`); Audio.pickup(); this.objectiveScore += h.isPlayer ? 1000 : 400; }
    else { Hud.banner(t('b_enemyCapture'), `${this.score.B} / ${this.m.target}`); Audio.alarm(); }
    if (this.score.A >= this.m.target) Game.finish(true, 'r_win');
    else if (this.score.B >= this.m.target) Game.finish(false, 'r_ctfLost');
  }
  drive(dt) {
    this.driveT = (this.driveT || 0) - dt;
    if (this.driveT > 0) return;
    this.driveT = 0.4;
    for (const a of Game.actors) {
      const b = a.bot;
      if (!b || !a.alive || !b.agent) continue;
      const enemyF = this.flags[this.foe(a.team)], ownF = this.flags[a.team], carrier = enemyF.holder === a;
      const goal = carrier ? ownF.home : b.role !== 'attack' ? null : enemyF.holder ? enemyF.holder.pos : enemyF.pos;
      if (!goal) continue;
      if (b.brain.in('hunt')) { for (let i = 0, m; i < 8 && (m = b.bestMemory()); i++) b.forget(m); b.brain.changeTo('patrol'); }
      const engaged = b.brain.in('engage');
      if (!carrier && engaged && dist2D(a.pos, goal) > 18) continue;
      b.moveTo(goal); b.setSpeed(b.runSpeed); b.goalT = 0.6;
      if (engaged) b.strafeT = 0.6;
    }
  }
  update(dt) {
    super.update(dt);
    if (Game.over) return;
    this.drive(dt);
    this.shareT -= dt;
    const share = this.shareT <= 0; if (share) this.shareT = 1;
    for (const a of Game.actors) if (a.bot && a.alive && a.pos.y > this.stats.maxBotY) this.stats.maxBotY = a.pos.y;
    for (const f of Object.values(this.flags)) {
      const m = f.model, foe = this.foe(f.team);
      if (f.holder) {
        const h = f.holder;
        m.visible = !h.isPlayer;
        m.position.set(h.pos.x - Math.sin(h.yaw || 0) * 0.25, h.pos.y + 0.35, h.pos.z - Math.cos(h.yaw || 0) * 0.25);
        m.scale.setScalar(0.75);
        if (share) for (const o of Game.actors) if (o.bot && o.alive && o.team === f.team) o.bot.sense(h, false, true);
        const own = this.flags[foe];
        if (h.alive && !own.holder && !own.dropped && this.near(h, own.home, 1.8)) { this.capture(h, f); if (Game.over) return; }
      } else {
        m.visible = true; m.scale.setScalar(1);
        m.position.set(f.pos.x, f.pos.y + (f.dropped ? 0.05 : 0.02), f.pos.z);
        if (f.dropped) { f.dropT -= dt; if (f.dropT <= 0) { this.reset(f, null); continue; } }
        for (const a of Game.actors) {
          if (!a.alive || !this.near(a, f.pos)) continue;
          if (a.team === f.team) { if (f.dropped) { this.reset(f, a); break; } }
          else if (!a.carrying) { this.take(a, f); break; }
        }
      }
      const cl = m.userData.cloth, pos = cl.geometry.attributes.position, rest = m.userData.rest;
      for (let i = 0; i < pos.count; i++) { const x = rest[i * 3]; pos.array[i * 3 + 2] = Math.sin(x * 5 - Game.time * 7 + f.home.x) * 0.07 * x; }
      pos.needsUpdate = true;
      f.beam.material.opacity = f.holder || f.dropped ? 0.06 : 0.16 + Math.sin(Game.time * 3) * 0.04;
    }
  }
  botGoal(b) {
    const me = b.a, my = me.team, ownF = this.flags[my], enemyF = this.flags[this.foe(my)];
    if (enemyF.holder === me) return { pos: ownF.home, run: true, hold: true };
    if (ownF.holder && (b.role === 'defend' || dist2D(me.pos, ownF.holder.pos) < 22)) return { pos: ownF.holder.pos, run: true, hold: true };
    if (ownF.dropped && (b.role === 'defend' || dist2D(me.pos, ownF.pos) < 22)) return { pos: ownF.pos, run: true, hold: true };
    if (b.role === 'attack') {
      if (enemyF.holder) return { pos: Nav.randomAround(enemyF.holder.pos, 3), run: true, hold: true };
      return { pos: enemyF.pos, run: true, hold: dist2D(me.pos, enemyF.pos) < 8 };
    }
    const spots = MAP.ctf.guard[my], s = spots[(me.id + Math.floor(Game.time / 25)) % spots.length];
    return { pos: Nav.randomAround(s, 2.5), run: dist2D(me.pos, s) > 12, patrol: true };
  }
  markersNow() {
    const out = [];
    for (const team of ['A', 'B']) {
      const f = this.flags[team];
      if (f.holder && f.holder.isPlayer) continue;
      out.push({ pos: f.holder ? f.holder.pos : f.pos, cls: team === 'A' ? 'own' : 'enemy', label: f.holder ? f.holder.name : f.dropped ? t('f_dropped') : t(team === 'A' ? 'f_ours' : 'f_theirs'), h: f.holder ? 2.3 : 2.7 });
    }
    if (this.flags.B.holder === Game.player) out.push({ pos: this.flags.A.home, cls: 'exit', label: t('f_home'), h: 1.4 });
    return out;
  }
  hud() {
    const you = this.flags.B.holder === Game.player, own = this.flags.A;
    const objective = you ? (own.holder || own.dropped ? t('o_ctfWait') : t('o_ctfCarry')) : own.holder ? t('o_ctfTaken') : t('o_ctf', { a: this.score.A, t: this.m.target });
    return { ally: this.score.A, enemy: this.score.B, clock: this.timeLeft, objective };
  }
  onTimeUp() { const w = this.score.A > this.score.B; Game.finish(w, w ? 'r_win' : 'r_time'); }
  stars(won) { return won ? (this.score.B === 0 ? 3 : this.score.B === 1 ? 2 : 1) : 0; }
  finalScore(won) { return super.finalScore(won) + this.score.A * 500; }
  intel() { const n = this.m.teamSize || 5; return { teams: `${n} vs ${n}`, time: fmtTime(this.timeLimit) }; }
}

class LastSquad extends Survival {
  setup() {
    const p = Game.player; p.team = 'A';
    this.respawn = false; this.regen = 9; this.botDamageMul = 0.6; this.sweep = 0.7;
    const teams = ['A', 'B', 'C', 'D'].slice(0, this.m.squads || 4), n = this.m.squadSize || 3;
    this.zones = {}; teams.forEach((tm, i) => { this.zones[tm] = MAP.survival[i % MAP.survival.length]; });
    this.allies = [];
    for (let i = 0; i < n - 1; i++) this.allies.push(this.makeBot('A', { weapon: pick(['ak47', 'm4']) }));
    this.ally = this.allies[0];
    for (const tm of teams.slice(1)) for (let i = 0; i < n; i++) this.makeBot(tm, { weapon: pick(['ak47', 'm4', 'shotgun', 'ak47']), dmgMul: 0.8 });
    for (const a of Game.actors) { a.lives = 1; this.spawnActor(a, this.safeSpawn(a, this.zones[a.team], 10)); }
    const L = MAP.lss || { x: 0, z: 0, r0: 30, r1: 6 };
    this.center = new THREE.Vector3(L.x, 0, L.z); this.r0 = L.r0; this.r1 = L.r1; this.radius = L.r0; this.hurtT = 0; this.warned = 0;
    this.ring = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 14, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xff4a3d, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.ring.position.set(L.x, 6, L.z); this.props.add(this.ring);
  }
  spectateTarget() { return this.allies.find((a) => a.alive) || null; }
  onKill(k, v) {
    super.onKill(k, v);
    if (v.isPlayer) { const a = this.spectateTarget(); if (a) setTimeout(() => Game.active && Hud.spectate(a.name), 1800); }
  }
  update(dt) {
    super.update(dt);
    if (Game.over) return;
    const k = clamp((Game.time - 30) / Math.max(60, this.timeLimit - 90), 0, 1);
    this.radius = this.r0 + (this.r1 - this.r0) * k;
    this.ring.scale.set(this.radius, 1, this.radius);
    this.ring.material.opacity = 0.12 + Math.sin(Game.time * 2) * 0.04;
    if (k > 0 && this.warned === 0) { this.warned = 1; Hud.banner(t('b_zone')); }
    this.hurtT -= dt;
    if (this.hurtT <= 0) {
      this.hurtT = 1;
      for (const a of Game.actors) {
        if (!a.alive || dist2D(a.pos, this.center) <= this.radius) continue;
        if (a.isPlayer && Game.time - (this.outWarn || -99) > 6) { this.outWarn = Game.time; Hud.banner(t('b_outside')); }
        Combat.damage(a, 6 + k * 14, null, false, 'zone');
      }
    }
  }
  botGoal(b) {
    const d = dist2D(b.a.pos, this.center);
    if (d > this.radius * 0.7) return { pos: Nav.randomAround(this.center, Math.max(3, this.radius * 0.5)), run: true };
    return super.botGoal ? Mode.prototype.botGoal.call(this, b) : null;
  }
  zoneFor(a) { return this.zones[a.team]; }
  onTimeUp() { const alive = this.aliveTeams(); Game.finish(alive.has('A') && alive.size === 1, alive.has('A') && alive.size === 1 ? 'r_win' : 'r_time'); }
  hud() { return { objective: t('o_lss', { n: this.aliveTeams().size }), clock: this.timeLeft, lives: Game.player.alive ? 1 : 0 }; }
  intel() { const n = this.m.squadSize || 3; return { teams: Array(this.m.squads || 4).fill(n).join(' vs '), time: fmtTime(this.timeLimit) }; }
}

