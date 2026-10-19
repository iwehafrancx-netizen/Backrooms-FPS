import { isSolid } from '../engine/blocks.js';
import { ITEMS } from './items.js';
import { eyeHeight } from './physics.js';
import { findPath, standable, lineCells, groundBelow } from './nav.js';
import { Brain } from './ai/brain.js';

const TAU = Math.PI * 2;
const wrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const cell = (p) => ({ x: Math.floor(p.x), y: Math.floor(p.y + 0.01), z: Math.floor(p.z) });
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

export class Bot {
  constructor(actor, match, skill = 0.5, profile = null) {
    this.a = actor; this.m = match; this.skill = skill; this.profile = profile;
    this.path = null; this.pi = 0; this.repath = 0; this.goal = null; this.goalT = 0;
    this.bridge = null; this.clickT = 0; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = 0; this.strafeAmt = 0.6;
    this.pause = 0; this.stuckT = 0; this.lastPos = { ...actor.pos }; this.noticeT = 0; this.target = null;
    this.jumpT = 0; this.throwT = 2 + Math.random() * 3; this.mineT = 0; this.wanderT = 0; this.patience = 50 + Math.random() * 70;
    this.yv = 0; this.pv = 0; this.jx = 0; this.jy = 0; this.lookT = 0; this.lookAt = null; this.selT = 0; this.kills = 0; this.celebrate = 0;
    this.ctlObj = { mx: 0, mz: 0, yaw: actor.yaw, pitch: actor.pitch, jump: false, crouch: false, sprint: false, attack: false, attackPressed: false, use: false, useHeld: false, sel: null };
    this.brain = new Brain(this);
    this.skill = this.brain.bot.skill;
    this.turn = 5 + this.skill * 9; this.cps = 4.5 + this.skill * 5.5; this.react = 0.5 - this.skill * 0.32;
    this.aimErr = 0.15 - this.skill * 0.11;
    this.greed = Math.random(); this.brave = Math.max(0.15, Math.min(0.95, 0.35 + Math.random() * 0.5 + this.brain.p.brave));
    this.setupEvaluators();
    actor.ctl = (dt) => this.tick(dt);
    actor.bot = true;
    actor.botRef = this;
  }

  setupEvaluators() {
    const m = this.m, mode = m.mode, B = this.brain, sky = !mode.botPlan;
    B.add('fight', 1, () => this.fightDesire());
    B.add('retreat', 1, () => this.retreatDesire());
    B.add('idle', 1, () => 0.12);
    if (sky) {
      B.add('center', 1, () => (mode.border < mode.radius && Math.hypot(this.a.pos.x, this.a.pos.z) > mode.border - 5 ? 0.95 : 0));
      B.add('tower', 1, () => (mode.rising && this.a.pos.y < m.map.voidY + 3.5 && this.a.inv.blocks() > 0 ? 0.98 : 0));
      B.add('loot', 1, () => this.lootDesire());
      B.add('mid', 1, () => this.midDesire());
      B.add('hunt', 1, () => this.huntDesire());
      B.add('build', 1, () => this.buildDesire());
    } else B.add('objective', 1, () => 0.45);
  }
  onIntent(name) { if (name !== 'fight') this.fightT = 0; if (name === 'build') this.buildPlan = null; }

  enemies() { return this.m.actors.filter((o) => o.alive && this.m.enemies(this.a, o)); }
  nearestEnemy(maxD = 999) { let best = null, bd = maxD; for (const o of this.enemies()) { const d = this.dist(o.pos); if (d < bd) { bd = d; best = o; } } return best ? { o: best, d: bd } : null; }
  dist(p) { return Math.hypot(p.x - this.a.pos.x, p.z - this.a.pos.z) + Math.abs(p.y - this.a.pos.y) * 0.5; }
  visible(o) { const a = this.a, e = a.eye(eyeHeight(a)), t = { x: o.pos.x, y: o.pos.y + 1.4, z: o.pos.z }; const dx = t.x - e.x, dy = t.y - e.y, dz = t.z - e.z, d = Math.hypot(dx, dy, dz) || 1; const h = this.m.world.raycast(e.x, e.y, e.z, dx / d, dy / d, dz / d, d, (id) => isSolid(id) && id !== 7 && id !== 12); return !h; }

  seenEnemy() {
    const vis = this.brain.visibleEnemies();
    let best = null, bd = 1e9;
    for (const o of vis) { const d = this.dist(o.pos); if (d < bd) { bd = d; best = o; } }
    const ne = this.nearestEnemy(3);
    if (ne && ne.d < bd) { best = ne.o; bd = ne.d; }
    return best ? { o: best, d: bd } : null;
  }
  fightDesire() {
    const a = this.a, m = this.m, mode = m.mode;
    const endgame = mode.border != null && mode.border < 24 && m.alive().length <= 3;
    const ne = endgame ? this.nearestEnemy(60) : this.seenEnemy();
    if (!ne) return 0;
    if (endgame) return 0.96;
    const early = m.mode.id === 'sky' && m.time < 100 && !ne.o.local;
    const range = this.bridge ? 4 : early ? 4 + this.brave * 3 : 9 + this.brave * 9;
    if (ne.d > range || Math.abs(ne.o.pos.y - a.pos.y) > 5) return 0;
    if (m.mode.botEngage && !m.mode.botEngage(this, ne)) return 0;
    const hurt = a.hurtT > 0 || m.time - (a.lastHurt || -99) < 2;
    return Math.min(0.92, 0.5 + (1 - ne.d / range) * 0.35 + (hurt ? 0.15 : 0));
  }
  retreatDesire() {
    const a = this.a, ne = this.seenEnemy();
    if (!ne || a.hp > 8 || ne.d > 9) return 0;
    const food = a.inv.slots.some((s) => s && ITEMS[s.id].kind === 'food');
    if (!food && a.inv.blocks() < 4) return 0;
    return 0.55 + (1 - a.hp / 20) * 0.4 - this.brave * 0.25;
  }
  ownChest() { const h = this.a.home, g = this.a.spawn ? this.a.spawn.group : undefined; return h ? this.nearestChest(22, (ch) => (g !== undefined && ch.group === g) || Math.hypot(ch.x - h.x, ch.z - h.z) < 10) : null; }
  lootDesire() {
    if (this.ownChest()) return 0.78;
    if (this.a.inv.blocks() < 8 && this.nearestChest(14)) return 0.62;
    if (this.a.inv.blocks() < 8) return 0.4;
    return 0;
  }
  midDesire() {
    const m = this.m, mode = m.mode;
    const geared = this.a.inv.armorPoints() + (this.a.inv.best('sword') >= 0 ? 4 : 0);
    const midLeft = m.map.chests.some((c) => c.tier !== 'spawn' && !c.looted && c.items.length);
    if (!midLeft) return m.time > this.patience ? 0.2 : 0;
    if (m.time < 25) return 0.05;
    let d = 0.28 + this.greed * 0.3 + (geared < 5 ? 0.12 : 0);
    if (mode.refilled && m.time < mode.borderAt) d += 0.08;
    return Math.min(0.66, d);
  }
  huntDesire() {
    const m = this.m, rec = this.brain.remembered();
    const ne = this.nearestEnemy(999);
    if (!rec && !ne) return 0;
    const geared = this.a.inv.armorPoints() + (this.a.inv.best('sword') >= 0 ? 4 : 0);
    const t = Math.max(0, Math.min(1, (m.time - 35) / (this.patience * (geared < 10 ? 2 : 1.4))));
    const seenRecently = rec && this.brain.W.time - rec.timeLastSensed < 6 && Math.hypot(rec.lastSensedPosition.x - this.a.pos.x, rec.lastSensedPosition.z - this.a.pos.z) < 30;
    return (seenRecently ? 0.32 : 0.08) + t * 0.5 + (geared >= 10 ? 0.06 : 0);
  }
  buildDesire() {
    if (this.built || this.a.inv.blocks() < 10 || this.m.time > this.patience * 0.8) return 0;
    return this.brain.profileName === 'builder' || this.brain.profileName === 'camper' ? 0.38 : 0.08;
  }

  aimAt(x, y, z, dt, err = 0) {
    const a = this.a, e = a.eye(eyeHeight(a));
    const dx = x - e.x, dy = y - e.y, dz = z - e.z;
    dt = Math.min(dt, 0.05);
    this.jx += (gauss() * 0.9 - this.jx * 3) * dt; this.jy += (gauss() * 0.6 - this.jy * 3) * dt;
    const ty = Math.atan2(-dx, -dz) + err * this.jx * 2.2, tp = Math.atan2(dy, Math.hypot(dx, dz)) + err * this.jy * 1.6;
    const c = this.ctlObj;
    const w = 9 + this.skill * 13, z2 = 0.62 + this.skill * 0.3;
    const ey = wrap(ty - c.yaw), ep = tp - c.pitch;
    this.yv += (w * w * ey - 2 * z2 * w * this.yv) * dt;
    this.pv += (w * w * ep - 2 * z2 * w * this.pv) * dt;
    const vmax = this.turn * 2.4;
    this.yv = Math.max(-vmax, Math.min(vmax, this.yv)); this.pv = Math.max(-vmax, Math.min(vmax, this.pv));
    c.yaw = wrap(c.yaw + this.yv * dt);
    c.pitch = Math.max(-1.55, Math.min(1.55, c.pitch + this.pv * dt));
    return Math.abs(wrap(ty - c.yaw)) + Math.abs(tp - c.pitch) * 0.5;
  }
  lookToward(x, y, z, dt, slow = 0.5) { const s = this.turn; this.turn *= slow; this.aimAt(x, y, z, dt * slow); this.turn = s; }

  selectKind(kind) { const i = this.a.inv.best(kind); if (i >= 0) { if (i !== this.a.sel) this.selT = 0.12 + Math.random() * 0.12; this.ctlObj.sel = i; } return i >= 0; }
  selectBlocks() { const i = this.a.inv.blockSlot(); if (i >= 0) { if (i !== this.a.sel) this.selT = 0.08 + Math.random() * 0.1; this.ctlObj.sel = i; } return i >= 0; }

  steer(tx, tz, dt, run = true, trust = false) {
    const a = this.a, c = this.ctlObj;
    const dx = tx - a.pos.x, dz = tz - a.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.05) { c.mx = 0; c.mz = 0; return d; }
    if (!trust && d > 1.2) { const [mx, mz] = this.brain.steerDir(tx, tz, dt); c.mx = mx; c.mz = mz; }
    else { c.mx = dx / d; c.mz = dz / d; }
    c.sprint = run && d > 2;
    if (this.unsafeAhead(c.mx, c.mz)) {
      if (!trust) { c.mx = 0; c.mz = 0; c.sprint = false; }
      else if (this.unsafeAhead(dx / d, dz / d)) { c.mx = dx / d; c.mz = dz / d; }
    }
    if (!this.lookAt && d > 1.5 && this.selT <= 0) this.lookToward(a.pos.x + c.mx * 6, a.pos.y + 1.45 + Math.sin(this.m.time * 0.7 + a.id) * 0.25, a.pos.z + c.mz * 6, dt, 0.35);
    return d;
  }
  unsafeAhead(mx, mz) {
    const a = this.a, w = this.m.world;
    if (!a.onGround) return false;
    const x = Math.floor(a.pos.x + mx * 0.55), z = Math.floor(a.pos.z + mz * 0.55), y = Math.floor(a.pos.y + 0.01);
    if (x === Math.floor(a.pos.x) && z === Math.floor(a.pos.z)) return false;
    for (let yy = y - 1; yy >= y - 4; yy--) if (isSolid(w.get(x, yy, z))) return false;
    return !isSolid(w.get(x, y, z));
  }

  goTo(gx, gy, gz, dt, near = 0, allowBridge = true) {
    const a = this.a, c = cell(a.pos), W = this.brain.W;
    this.repath -= dt;
    const goalKey = `${gx},${gy},${gz}`;
    if (this.bridge) return this.doBridge(dt);
    const need = !this.path || this.pathKey !== goalKey || this.repath <= 0 || this.pi >= this.path.length;
    if (need && (W.pathBudget > 400 || !this.path || this.pathKey !== goalKey)) {
      const far = Math.hypot(gx - c.x, gz - c.z);
      const r = findPath(this.m.world, c.x, c.y, c.z, gx, gy, gz, { near, limit: Math.max(300, Math.min(far > 40 ? 3200 : 2200, W.pathBudget)) });
      W.pathBudget -= r.nodes;
      this.path = r.path; this.pi = 1; this.pathKey = goalKey; this.repath = r.reached ? 1.4 + Math.random() * 0.8 : 2.8 + Math.random() * 1.4;
      this.pathReached = r.reached;
      if (!r.reached && allowBridge) {
        const e = r.end, remain = Math.hypot(e.x - gx, e.z - gz);
        if (remain > 2 && this.a.inv.blocks() > 0 && !(this.noBridge > 0)) {
          if (Math.hypot(e.x - c.x, e.z - c.z) < 1.5 && a.onGround) { this.startBridge(gx, gy, gz); if (this.bridge) return this.doBridge(dt); }
        }
      }
    } else if (need) this.repath = 0.05;
    if (!this.path) return false;
    let p = this.path[this.pi];
    if (!p) { this.ctlObj.mx = this.ctlObj.mz = 0; return this.pathReached; }
    const q = this.path[this.pi + 1];
    if (q && q.y === p.y && p.y === c.y && Math.hypot(q.x + 0.5 - a.pos.x, q.z + 0.5 - a.pos.z) < 2.2) { this.pi++; p = q; }
    const wide = this.wideAround(p.x, p.y, p.z);
    const d = this.steer(p.x + 0.5, p.z + 0.5, dt, true, !wide);
    if (p.y > a.pos.y + 0.4 && a.onGround && d < 1.4) this.ctlObj.jump = true;
    if (d < (wide ? 0.6 : 0.32) && Math.abs(p.y - a.pos.y) < 1.2) this.pi++;
    if (this.pi >= this.path.length && !this.pathReached && allowBridge && a.onGround && this.a.inv.blocks() > 0 && !(this.noBridge > 0)) { this.startBridge(gx, gy, gz); return false; }
    return this.pi >= this.path.length && this.pathReached;
  }
  wideAround(x, y, z) { const w = this.m.world; let n = 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (standable(w, x + dx, y, z + dz)) n++; return n >= 3; }

  startBridge(gx, gy, gz) {
    if (!this.a.onGround) return;
    const c = cell(this.a.pos);
    this.bridge = { gx, gy, gz, y: c.y, cells: lineCells(c.x, c.z, gx, gz), i: 0, t: 0, placeT: 0, style: this.skill > 0.72 ? 'speed' : this.skill > 0.4 ? 'back' : 'slow' };
    this.path = null;
  }

  doBridge(dt) {
    const a = this.a, w = this.m.world, b = this.bridge, ctl = this.ctlObj;
    b.t += dt;
    if (b.i !== b.lastI) { b.lastI = b.i; b.prog = b.t; }
    if (b.t - (b.prog || 0) > 6 || a.pos.y < b.y - 3) { this.bridge = null; this.goal = null; this.noBridge = 5; return false; }
    const here = cell(a.pos);
    if (a.onGround && here.y !== b.y && Math.abs(here.y - b.y) <= 2) b.y = here.y;
    const next = b.cells[b.i];
    if (!next) { this.bridge = null; return true; }
    const [nx, nz] = next;
    const rise = b.gy - b.y;
    const needUp = rise >= 2 && b.i % 2 === 1;
    if (!standable(w, nx, b.y, nz) && standable(w, nx, b.y + 1, nz)) {
      this.steer(nx + 0.5, nz + 0.5, dt, false, true);
      if (a.onGround) ctl.jump = true;
      if (Math.abs(a.pos.x - (nx + 0.5)) < 0.35 && Math.abs(a.pos.z - (nz + 0.5)) < 0.35 && a.pos.y > b.y + 0.9) { b.y += 1; b.i++; }
      return false;
    }
    if (isSolid(w.get(nx, b.y, nz)) || isSolid(w.get(nx, b.y + 1, nz))) {
      const by = isSolid(w.get(nx, b.y + 1, nz)) ? b.y + 1 : b.y;
      ctl.mx = 0; ctl.mz = 0;
      if (!this.m.mode.canBreak(a, nx, by, nz, w.get(nx, by, nz))) {
        if ((b.ups || 0) < 4 && !isSolid(w.get(here.x, b.y + 2, here.z)) && a.inv.blocks() > 1) { if (a.onGround && this.towerY == null) b.ups = (b.ups || 0) + 1; b.prog = b.t; this.tower(dt); return false; }
        this.bridge = null; this.goal = null; this.noBridge = 5; return false;
      }
      this.selectKind('pick') || this.selectKind('axe');
      if (this.aimAt(nx + 0.5, by + 0.5, nz + 0.5, dt) < 0.3) ctl.attack = true;
      return false;
    }
    if (!a.onGround && a.vel.y < 0.5) { ctl.mx = ctl.mz = 0; ctl.crouch = true; return false; }
    if (standable(w, nx, b.y, nz)) {
      const dx0 = nx + 0.5 - a.pos.x, dz0 = nz + 0.5 - a.pos.z;
      ctl.crouch = b.style !== 'speed' || Math.hypot(dx0, dz0) < 0.7;
      this.steer(nx + 0.5, nz + 0.5, dt, false, true);
      if (b.style === 'speed') { ctl.mx *= 1; ctl.mz *= 1; } else { ctl.mx *= 0.85; ctl.mz *= 0.85; }
      if (Math.abs(a.pos.x - (nx + 0.5)) < 0.32 && Math.abs(a.pos.z - (nz + 0.5)) < 0.32) {
        b.i++;
        if (Math.hypot(nx - b.gx, nz - b.gz) < 2.5 || (groundBelow(w, b.cells[b.i]?.[0] ?? nx, b.y, b.cells[b.i]?.[1] ?? nz, 1) != null && b.i > 3)) {
          const r = findPath(w, nx, b.y, nz, b.gx, b.gy, b.gz, { near: 1, limit: 600 });
          if (r.reached) { this.bridge = null; this.path = null; }
        }
      }
      const sdx = Math.sign(nx - here.x), sdz = Math.sign(nz - here.z);
      this.aimAt(here.x + 0.5 + sdx * 0.5, b.y - 0.45, here.z + 0.5 + sdz * 0.5, dt);
      return false;
    }
    if (needUp && standable(w, nx, b.y + 1, nz)) { ctl.jump = a.onGround; this.steer(nx + 0.5, nz + 0.5, dt, false, true); if (a.pos.y > b.y + 0.9) b.y += 1; return false; }
    ctl.sprint = false;
    if (!this.selectBlocks()) { this.bridge = null; return false; }
    if (!isSolid(w.get(here.x, b.y - 1, here.z))) {
      ctl.mx = ctl.mz = 0; ctl.crouch = true;
      const e2 = this.aimAt(here.x + 0.5, b.y - 0.5, here.z + 0.5, dt);
      b.placeT += dt;
      if (b.placeT > 0.12 && e2 < 0.5 && this.selT <= 0) { b.placeT = 0; const slot = a.inv.slots[ctl.sel ?? a.sel]; if (slot) { a.sel = ctl.sel ?? a.sel; this.m.place(a, here.x, b.y - 1, here.z, slot.id); } }
      return false;
    }
    const dx = nx + 0.5 - a.pos.x, dz = nz + 0.5 - a.pos.z, dd = Math.hypot(dx, dz) || 1;
    const sx = Math.sign(nx - here.x), sz = Math.sign(nz - here.z);
    const over = b.style === 'slow' ? 0.22 : 0.18;
    const tx = here.x + 0.5 + sx * (0.5 + over), tz = here.z + 0.5 + sz * (0.5 + over);
    const gap = Math.abs(sx) ? Math.abs(tx - a.pos.x) : Math.abs(tz - a.pos.z);
    ctl.crouch = true;
    if (gap > 0.06) { ctl.mx = (dx / dd) * 0.55; ctl.mz = (dz / dd) * 0.55; } else { ctl.mx = ctl.mz = 0; }
    const ty = needUp ? b.y : b.y - 1;
    const err = this.aimAt(here.x + 0.5 + sx * 0.5, ty + 0.5, here.z + 0.5 + sz * 0.5, dt);
    b.placeT += dt;
    const wait = b.style === 'speed' ? 0.14 : b.style === 'back' ? 0.24 : 0.42;
    const stalled = Math.hypot(a.vel.x, a.vel.z) < 0.35 && b.placeT > wait + 0.1;
    if (b.placeT > wait + Math.random() * 0.08 && err < 0.4 && (gap < 0.2 || stalled) && this.selT <= 0) {
      b.placeT = 0;
      const slot = a.inv.slots[ctl.sel ?? a.sel];
      if (slot) { a.sel = ctl.sel ?? a.sel; this.m.place(a, nx, ty, nz, slot.id); }
    }
    return false;
  }

  buildCells(cells, dt) {
    const a = this.a, w = this.m.world, ctl = this.ctlObj;
    const todo = cells.find(([x, y, z]) => (!w.get(x, y, z) || !isSolid(w.get(x, y, z))) && this.m.mode.canPlace(a, x, y, z) && [[0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].some(([dx, dy, dz]) => isSolid(w.get(x + dx, y + dy, z + dz))) && !this.m.actors.some((o) => o.alive && Math.floor(o.pos.x) === x && Math.floor(o.pos.z) === z && y >= Math.floor(o.pos.y) && y <= Math.floor(o.pos.y + 1.7)));
    if (!todo) return false;
    if (!this.selectBlocks()) return false;
    const [x, y, z] = todo, d = Math.hypot(x + 0.5 - a.pos.x, z + 0.5 - a.pos.z);
    if (d > 3.6 || Math.abs(y - a.pos.y) > 3) { const g = groundBelow(w, x + 1, y + 1, z, 5) ?? y; this.goTo(x + 1, g, z, dt, 2, false); return true; }
    if (d < 1.2) { ctl.mx = (a.pos.x - x - 0.5) / (d || 1); ctl.mz = (a.pos.z - z - 0.5) / (d || 1); }
    this.placeT = (this.placeT || 0) + dt;
    const err = this.aimAt(x + 0.5, y + 0.5, z + 0.5, dt);
    if (err < 0.35 && this.placeT > 0.3 - this.skill * 0.15 && this.selT <= 0) { this.placeT = 0; const slot = a.inv.slots[ctl.sel ?? a.sel]; if (slot) { a.sel = ctl.sel ?? a.sel; this.m.place(a, x, y, z, slot.id); } }
    return true;
  }

  lootChest(ch, dt) {
    const a = this.a;
    const d = Math.hypot(ch.x + 0.5 - a.pos.x, ch.z + 0.5 - a.pos.z);
    if (d < 2.6 && Math.abs(ch.y - a.pos.y) < 2.5) {
      this.ctlObj.mx = this.ctlObj.mz = 0;
      this.aimAt(ch.x + 0.5, ch.y + 0.5, ch.z + 0.5, dt);
      this.pause += dt;
      if (this.pause > 0.8 + (1 - this.skill) * 1.1 + Math.random() * 0.2) { this.m.takeAll(a, ch); this.pause = 0; this.equip(); this.lookT = -0.6; return true; }
      return false;
    }
    this.goTo(ch.x, ch.y, ch.z, dt, 1);
    return false;
  }
  equip() { if (!this.selectKind('sword')) this.selectKind('axe'); }

  nearestChest(maxD, filter = () => true) {
    let best = null, bd = maxD;
    for (const ch of this.m.map.chests) {
      if (ch.looted || !ch.items.length || !filter(ch)) continue;
      const d = this.dist({ x: ch.x, y: ch.y, z: ch.z });
      if (d < bd) { bd = d; best = ch; }
    }
    return best;
  }

  fight(o, d, dt) {
    const a = this.a, ctl = this.ctlObj, m = this.m;
    this.bridge = null;
    this.fightT = (this.fightT || 0) + dt;
    if (!this.selectKind('sword')) this.selectKind('axe') || this.selectKind('pick');
    const lead = 0.08 + (1 - this.skill) * 0.05;
    const err = this.aimAt(o.pos.x + o.vel.x * lead, o.pos.y + 1.25, o.pos.z + o.vel.z * lead, dt, this.aimErr);
    const reach = 2.75 + this.skill * 0.35;
    const dx = o.pos.x - a.pos.x, dz = o.pos.z - a.pos.z, dd = Math.hypot(dx, dz) || 1;
    if (d > reach + 0.6) {
      const sameLevel = Math.abs(o.pos.y - a.pos.y) < 1.5;
      if (sameLevel && d < 7) { this.steer(o.pos.x, o.pos.z, dt, true, true); if (a.blocked && a.onGround) ctl.jump = true; }
      else { const c = cell(o.pos); const g = groundBelow(m.world, c.x, c.y, c.z, 4); this.goTo(c.x, g ?? c.y, c.z, dt, 1); }
    } else {
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeT = 0.35 + Math.random() * (1.3 - this.skill * 0.5); this.strafe = Math.random() < 0.62 ? -this.strafe : this.strafe; this.strafeAmt = 0.3 + Math.random() * 0.6; }
      this.wtap = Math.max(0, (this.wtap || 0) - dt);
      if (o.hurtT > 0.4 && !this.wtapped && this.skill > 0.45) { this.wtap = 0.09 + Math.random() * 0.06; this.wtapped = true; }
      if (o.hurtT <= 0.2) this.wtapped = false;
      this.backT = Math.max(0, (this.backT || 0) - dt);
      if (a.hurtT > 0.4 && Math.random() < (1 - this.skill) * 0.5 && !this.backT) this.backT = 0.25 + Math.random() * 0.3;
      let fwd = d > 2.4 ? 0.85 : d > 1.6 ? 0.25 : -0.25;
      if (this.wtap > 0) fwd = 0;
      if (this.backT > 0) fwd = -0.7;
      ctl.mx = (dx / dd) * fwd + (-dz / dd) * this.strafe * this.strafeAmt; ctl.mz = (dz / dd) * fwd + (dx / dd) * this.strafe * this.strafeAmt;
      if (this.unsafeAhead(ctl.mx, ctl.mz)) { ctl.mx = (dx / dd) * 0.4; ctl.mz = (dz / dd) * 0.4; if (this.unsafeAhead(ctl.mx, ctl.mz)) { ctl.mx = ctl.mz = 0; } ctl.crouch = true; this.strafe = -this.strafe; }
      const ml = Math.hypot(ctl.mx, ctl.mz); if (ml > 1) { ctl.mx /= ml; ctl.mz /= ml; }
      ctl.sprint = d > 1.6 && this.wtap <= 0;
      this.jumpT -= dt;
      const edgy = this.unsafeAhead(ctl.mx * 2.2, ctl.mz * 2.2) || this.unsafeAhead(-dz / dd * 2, dx / dd * 2) || this.unsafeAhead(dz / dd * 2, -dx / dd * 2);
      if (this.jumpT <= 0 && a.onGround && !edgy && Math.random() < this.skill * 0.7) { ctl.jump = true; this.jumpT = 0.7 + Math.random() * 1.2; }
      if (edgy) ctl.crouch = ctl.crouch || this.skill > 0.5;
    }
    this.clickT -= dt;
    const critReady = !a.onGround && a.vel.y < -1;
    const wantCrit = this.skill > 0.6 && !a.onGround && a.vel.y > 0;
    if (d < reach + 0.4 && err < 0.42 && this.clickT <= 0 && this.selT <= 0 && !(wantCrit && !critReady && Math.random() < 0.5)) {
      ctl.attack = true; ctl.attackPressed = true;
      const burst = Math.random() < 0.18;
      this.clickT = (1 / this.cps) * (burst ? 0.55 : 0.7 + Math.random() * 0.65);
      if (this.brain.W) this.brain.W.noise(a.pos.x, a.pos.y, a.pos.z, a, 1);
    }
  }

  retreat(dt) {
    const a = this.a, ctl = this.ctlObj, ne = this.seenEnemy();
    if (!ne) return false;
    const o = ne.o, dx = a.pos.x - o.pos.x, dz = a.pos.z - o.pos.z, d = Math.hypot(dx, dz) || 1;
    if (this.heal(dt)) { ctl.mx = (dx / d) * 0.6; ctl.mz = (dz / d) * 0.6; if (this.unsafeAhead(ctl.mx, ctl.mz)) ctl.mx = ctl.mz = 0; this.lookToward(o.pos.x, o.pos.y + 1.3, o.pos.z, dt, 0.8); return true; }
    if (a.inv.blocks() > 3 && ne.d < 6) {
      const c = cell(a.pos), sx = Math.abs(dx) > Math.abs(dz) ? -Math.sign(dx) : 0, sz = sx ? 0 : -Math.sign(dz);
      const wall = [[c.x + sx, c.y, c.z + sz], [c.x + sx, c.y + 1, c.z + sz]];
      if (this.buildCells(wall, dt)) return true;
      if (this.tower(dt)) return true;
    }
    this.steer(a.pos.x + (dx / d) * 6, a.pos.z + (dz / d) * 6, dt, true);
    return true;
  }

  tryThrow(o, d, dt) {
    const a = this.a;
    this.throwT -= dt;
    if (this.throwT > 0 || d < 5 || d > 16 || a.inv.count(131) === 0) { this.throwing = 0; return false; }
    if (!this.throwing && !this.visible(o)) return false;
    const i = a.inv.slots.findIndex((s) => s && s.id === 131);
    if (i < 0) return false;
    this.ctlObj.sel = i;
    this.throwing = (this.throwing || 0) + dt;
    const lead = d / 22;
    const err = this.aimAt(o.pos.x + o.vel.x * lead, o.pos.y + 1.3 + d * 0.06, o.pos.z + o.vel.z * lead, dt, this.aimErr * 0.5);
    if ((err < 0.12 && a.sel === i) || this.throwing > 1) { if (a.sel === i) this.ctlObj.use = true; this.throwT = 2.5 + Math.random() * 3; this.throwing = 0; }
    return true;
  }

  heal(dt) {
    const a = this.a;
    if (a.hp > 9) return false;
    const i = a.inv.slots.findIndex((s) => s && ITEMS[s.id].kind === 'food');
    if (i < 0) return false;
    this.ctlObj.sel = i; this.ctlObj.useHeld = true;
    return true;
  }

  clutch(dt) {
    const a = this.a, w = this.m.world;
    if (a.onGround) { this.fallRoll = null; return false; }
    if (a.vel.y > -4 || a.inv.blockSlot() < 0) return false;
    const c = cell(a.pos);
    if (groundBelow(w, c.x, c.y, c.z, 6) != null) return false;
    if (this.fallRoll == null) this.fallRoll = { ok: Math.random() < this.skill * 0.75, t: 0.12 + (1 - this.skill) * 0.35 };
    if (!this.fallRoll.ok) return false;
    this.fallRoll.t -= dt;
    this.selectBlocks();
    this.aimAt(a.pos.x, a.pos.y - 2, a.pos.z + 0.01, dt);
    if (this.fallRoll.t > 0) return true;
    const i = a.inv.blockSlot(); if (i < 0) return false;
    a.sel = i; this.m.place(a, c.x, c.y - 1, c.z, a.inv.slots[i].id);
    this.fallRoll.ok = false;
    return true;
  }

  idleLook(dt) {
    const a = this.a, m = this.m;
    this.lookT -= dt;
    if (this.lookT <= 0 || !this.lookAt) {
      this.lookT = 0.6 + Math.random() * 2.2;
      const others = m.actors.filter((o) => o !== a && o.alive && Math.hypot(o.pos.x - a.pos.x, o.pos.z - a.pos.z) < 24);
      const r = Math.random();
      if (others.length && r < 0.45) { const o = others[Math.floor(Math.random() * others.length)]; this.lookAt = { o }; }
      else if (r < 0.6) this.lookAt = { x: m.map.center.x, y: m.map.center.y + 2, z: m.map.center.z };
      else { const ang = Math.random() * TAU, dd = 4 + Math.random() * 10; this.lookAt = { x: a.pos.x + Math.cos(ang) * dd, y: a.pos.y + 1.2 + (Math.random() - 0.6) * 3, z: a.pos.z + Math.sin(ang) * dd }; }
      if (Math.random() < 0.12) this.ctlObj.sel = Math.floor(Math.random() * 9);
    }
    const t = this.lookAt.o ? { x: this.lookAt.o.pos.x, y: this.lookAt.o.pos.y + 1.5, z: this.lookAt.o.pos.z } : this.lookAt;
    this.lookToward(t.x, t.y, t.z, dt, 0.45);
  }

  tells(dt) {
    const a = this.a, ctl = this.ctlObj;
    if (a.kills > this.kills) { this.kills = a.kills; if (Math.random() < this.brain.p.tbag) this.celebrate = 0.8 + Math.random() * 0.8; }
    if (this.celebrate > 0) {
      this.celebrate -= dt;
      ctl.crouch = Math.floor(this.celebrate * 7) % 2 === 0;
      if (Math.random() < 0.02 && a.onGround) ctl.jump = true;
      return true;
    }
    return false;
  }

  tick(dt) {
    const a = this.a, m = this.m, ctl = this.ctlObj;
    this.noBridge = (this.noBridge || 0) - dt;
    this.selT = Math.max(0, this.selT - dt);
    ctl.jump = false; ctl.attack = false; ctl.attackPressed = false; ctl.use = false; ctl.useHeld = false; ctl.crouch = false; ctl.mx = 0; ctl.mz = 0;
    if (m.state === 'countdown') { this.idleLook(dt); if (Math.random() < 0.01) ctl.jump = true; return ctl; }
    if (m.state !== 'play') return ctl;
    this.brain.update(dt);
    if (this.clutch(dt)) return ctl;
    const moved = Math.hypot(a.pos.x - this.lastPos.x, a.pos.z - this.lastPos.z);
    this.lastPos = { ...a.pos };
    const wantsMove = (this.path && this.pi < this.path.length) || !!this.bridge;
    this.stuckT = moved < 0.4 * dt && wantsMove && !this.bridge ? this.stuckT + dt : Math.max(0, this.stuckT - dt);
    if (this.stuckT > 1.2) { if (a.onGround && !this.unsafeAhead(ctl.mx || 0.01, ctl.mz)) ctl.jump = true; this.path = null; }
    if (this.stuckT > 3.5) { this.stuckT = 0; this.goal = null; this.bridge = null; }
    if (moved > 0.6 * dt) this.lostT = 0;
    this.lookAt = null;
    const intent = this.brain.intent;
    if (intent !== 'fight' && intent !== 'retreat' && this.tells(dt)) return ctl;
    if (intent === 'fight') {
      const ne = this.seenEnemy() || this.nearestEnemy(4);
      if (ne) {
        this.noticeT += dt;
        if (this.noticeT > this.react) {
          if (!(ne.d < 3.5) && this.heal(dt)) return ctl;
          if (this.tryThrow(ne.o, ne.d, dt)) return ctl;
          this.fight(ne.o, ne.d, dt);
          return ctl;
        }
        this.lookToward(ne.o.pos.x, ne.o.pos.y + 1.4, ne.o.pos.z, dt, 0.8);
        return ctl;
      }
    } else this.noticeT = Math.max(0, this.noticeT - dt);
    if (intent === 'retreat' && this.retreat(dt)) return ctl;
    if (this.heal(dt)) return ctl;
    if (intent === 'objective') { const plan = m.mode.botPlan(this, dt); return plan || ctl; }
    if (m.mode.botPlan) { const plan = m.mode.botPlan(this, dt); return plan || ctl; }
    return this.planSky(dt, intent) || ctl;
  }

  planSky(dt, intent) {
    const a = this.a, m = this.m, ctl = this.ctlObj;
    if (intent === 'tower' && this.tower(dt)) return ctl;
    if (intent === 'center') { this.goTo(0, m.map.center.y - 2, 0, dt, 3); return ctl; }
    if (intent === 'loot') {
      const own = this.ownChest() || (a.inv.blocks() < 8 ? this.nearestChest(14) : null);
      if (own) { this.lootChest(own, dt); return ctl; }
      if (this.mineForBlocks(dt)) return ctl;
      this.wander(dt); return ctl;
    }
    if (intent === 'build') {
      if (!this.buildPlan) this.buildPlan = this.makeBuildPlan();
      if (!this.buildPlan || !this.buildCells(this.buildPlan, dt)) { this.built = true; this.buildPlan = null; }
      return ctl;
    }
    if (intent === 'mid') {
      const home = a.home || a.pos;
      const ch = this.nearestChest(90, (c) => c.tier !== 'spawn' || Math.hypot(c.x - home.x, c.z - home.z) < 12);
      if (ch && this.dist(ch) < 70) { this.lootChest(ch, dt); return ctl; }
      this.goTo(0, m.map.center.y - 2, 0, dt, 2);
      return ctl;
    }
    if (intent === 'hunt') {
      const rec = this.brain.remembered();
      let o = rec ? rec.entity.actor : null, p = rec ? rec.lastSensedPosition : null;
      if (!o) { const ne = this.nearestEnemy(999); if (ne) { o = ne.o; p = ne.o.pos; } }
      if (!o) { this.wander(dt); return ctl; }
      if (o.pos.y - a.pos.y > 1.8 && Math.hypot(o.pos.x - a.pos.x, o.pos.z - a.pos.z) < 5 && this.tower(dt)) return ctl;
      const c = cell(p);
      const g = groundBelow(m.world, c.x, c.y, c.z, 6);
      this.goTo(c.x, g ?? c.y, c.z, dt, 1);
      return ctl;
    }
    this.wander(dt);
    return ctl;
  }

  makeBuildPlan() {
    const a = this.a, w = this.m.world, c = cell(a.pos), h = a.home || a.pos;
    const ang = Math.atan2(-h.z, -h.x), fx = Math.round(Math.cos(ang)), fz = Math.round(Math.sin(ang));
    const ox = Math.floor(h.x) + fx * 4, oz = Math.floor(h.z) + fz * 4;
    const gy = groundBelow(w, ox, c.y + 3, oz, 8);
    if (gy == null) return null;
    const cells = [], px = -fz, pz = fx;
    for (let k = -2; k <= 2; k++) for (let y = 0; y <= (Math.abs(k) === 2 ? 0 : 1); y++) cells.push([ox + px * k, gy + y, oz + pz * k]);
    return cells;
  }

  followRoute(nodes, dt) {
    const a = this.a, ctl = this.ctlObj, w = this.m.world;
    if (this.rI == null) this.rI = 0;
    let n = nodes[this.rI];
    const reachedNode = (q) => (a.onGround || !(q.jump || q.tight)) && Math.hypot(q.x + 0.5 - a.pos.x, q.z + 0.5 - a.pos.z) < (q.tight ? 0.6 : 0.85) && a.pos.y > q.y - 0.6 && a.pos.y < q.y + 1.4;
    while (n && reachedNode(n)) { this.lastTight = !!n.tight; this.rI++; n = nodes[this.rI]; }
    if (!n) { ctl.mx = ctl.mz = 0; this.idleLook(dt); return true; }
    if (this.waitT > 0) { this.waitT -= dt; ctl.mx = ctl.mz = 0; this.lookToward(n.x + 0.5, n.y + 0.5, n.z + 0.5, dt, 0.6); return false; }
    const dx = n.x + 0.5 - a.pos.x, dz = n.z + 0.5 - a.pos.z, d = Math.hypot(dx, dz) || 1;
    ctl.mx = dx / d; ctl.mz = dz / d;
    const la = nodes[this.rI + 1] || n;
    this.lookToward((n.x + la.x) / 2 + 0.5, n.y + 0.2, (n.z + la.z) / 2 + 0.5, dt, 0.9);
    const gapJump = n.jump || n.y > Math.floor(a.pos.y + 0.01);
    ctl.sprint = n.tight ? d > 2.6 : gapJump || d > 1.5;
    if (a.onGround && this.lastTight && n.jump && n.y <= Math.floor(a.pos.y + 0.01)) { this.lastTight = false; ctl.jump = true; return false; }
    if (d < 0.35 && !gapJump) { ctl.mx *= 0.4; ctl.mz *= 0.4; }
    if (a.onGround) {
      const fy = Math.floor(a.pos.y + 0.01) - 1;
      const px = Math.floor(a.pos.x + ctl.mx * 0.42), pz = Math.floor(a.pos.z + ctl.mz * 0.42);
      const edge = !w.solidAt(px, fy, pz) && !w.solidAt(px, fy - 1, pz);
      if (n.y > fy + 1 && (d < 1.7 || a.blocked)) ctl.jump = true;
      else if (edge && (n.jump || n.y >= fy + 1 || d > 1.2)) {
        if (this.slip == null) this.slip = Math.random() < (1 - this.skill) * 0.12 ? 0.08 + Math.random() * 0.12 : 0;
        if (this.slip > 0) { this.slip -= dt; if (this.slip <= 0) ctl.jump = true; }
        else ctl.jump = true;
      } else this.slip = null;
    }
    return false;
  }

  tower(dt) {
    const a = this.a, ctl = this.ctlObj, w = this.m.world;
    if (!this.selectBlocks()) return false;
    const cx = Math.floor(a.pos.x), cz = Math.floor(a.pos.z), fy = Math.floor(a.pos.y + 0.01);
    if (isSolid(w.get(cx, fy + 2, cz))) return false;
    ctl.mx = (cx + 0.5 - a.pos.x) * 2; ctl.mz = (cz + 0.5 - a.pos.z) * 2;
    this.aimAt(cx + 0.5, a.pos.y - 1, cz + 0.5 + 0.001, dt);
    if (a.onGround) { ctl.jump = true; this.towerY = fy; return true; }
    if (this.towerY != null && a.pos.y >= this.towerY + 1.05 && !w.get(cx, this.towerY, cz)) {
      const slot = a.inv.slots[ctl.sel ?? a.sel];
      if (slot) { a.sel = ctl.sel ?? a.sel; this.m.place(a, cx, this.towerY, cz, slot.id); }
      this.towerY = null;
    }
    return true;
  }

  steerOrPath(x, y, z, dt) {
    const a = this.a;
    if (Math.abs(a.pos.y - y) < 0.6 && Math.hypot(x + 0.5 - a.pos.x, z + 0.5 - a.pos.z) < 2.5) { this.steer(x + 0.5, z + 0.5, dt, false, true); return; }
    this.goTo(x, y, z, dt, 0, false);
  }

  giveUp(dt) {
    const a = this.a;
    this.lostT = (this.lostT || 0) + dt;
    if (this.lostT < 12) return false;
    const h = this.m.map.center;
    const dx = a.pos.x - h.x, dz = a.pos.z - h.z, d = Math.hypot(dx, dz) || 1;
    this.ctlObj.mx = dx / d; this.ctlObj.mz = dz / d; this.ctlObj.sprint = true;
    if (a.blocked) this.ctlObj.jump = true;
    return true;
  }

  wander(dt) {
    const a = this.a;
    this.wanderT -= dt;
    if (this.wanderT <= 0 || !this.wanderTo) { this.wanderT = 2 + Math.random() * 4; const h = a.home || a.pos; this.wanderTo = { x: h.x + (Math.random() - 0.5) * 7, z: h.z + (Math.random() - 0.5) * 7 }; this.idleJump = Math.random() < 0.3; }
    const d = this.steer(this.wanderTo.x, this.wanderTo.z, dt, false);
    if (d < 0.6) { this.ctlObj.mx = this.ctlObj.mz = 0; this.idleLook(dt); if (this.idleJump && Math.random() < 0.03 && a.onGround) this.ctlObj.jump = true; if (Math.random() < 0.004) this.celebrate = 0.5; }
  }

  mineForBlocks(dt) {
    const a = this.a, w = this.m.world, c = cell(a.pos);
    if (!this.mineTarget || !w.get(this.mineTarget.x, this.mineTarget.y, this.mineTarget.z)) {
      this.mineTarget = null;
      outer: for (let r = 1; r <= 5; r++) for (let dy = 0; dy <= 2; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const x = c.x + dx, y = c.y + dy - (dy === 2 ? 3 : 0), z = c.z + dz;
        if (dx === 0 && dz === 0) continue;
        const id = w.get(x, y, z);
        if (id && [2, 3, 4, 5, 6, 8, 9, 18, 28, 67, 69, 70, 79].includes(id) && this.m.mode.canBreak(a, x, y, z, id) && y >= c.y - 1) { this.mineTarget = { x, y, z }; break outer; }
      }
    }
    const t = this.mineTarget;
    if (!t) return false;
    const err = this.aimAt(t.x + 0.5, t.y + 0.5, t.z + 0.5, dt);
    if (err < 0.25) { this.ctlObj.attack = true; this.selectKind('pick') || this.selectKind('axe'); }
    return true;
  }

  planEgg(dt) {
    const plan = this.m.mode.botPlan ? this.m.mode.botPlan(this, dt) : null;
    return plan || this.ctlObj;
  }
}
