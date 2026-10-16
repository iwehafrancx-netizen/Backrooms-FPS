import { isSolid } from '../engine/blocks.js';
import { ITEMS } from './items.js';
import { eyeHeight } from './physics.js';
import { findPath, standable, lineCells, groundBelow } from './nav.js';

const TAU = Math.PI * 2;
const wrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const cell = (p) => ({ x: Math.floor(p.x), y: Math.floor(p.y + 0.01), z: Math.floor(p.z) });

export class Bot {
  constructor(actor, match, skill = 0.5) {
    this.a = actor; this.m = match; this.skill = skill;
    this.turn = 5 + skill * 9; this.cps = 3.2 + skill * 5; this.react = 0.55 - skill * 0.35;
    this.aimErr = 0.16 - skill * 0.12;
    this.greed = Math.random(); this.brave = 0.35 + Math.random() * 0.5;
    this.path = null; this.pi = 0; this.repath = 0; this.goal = null; this.goalT = 0;
    this.bridge = null; this.clickT = 0; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = 0;
    this.pause = 0; this.stuckT = 0; this.lastPos = { ...actor.pos }; this.noticeT = 0; this.target = null;
    this.jumpT = 0; this.throwT = 2 + Math.random() * 3; this.mineT = 0; this.wanderT = 0; this.patience = 50 + Math.random() * 70;
    this.ctlObj = { mx: 0, mz: 0, yaw: actor.yaw, pitch: actor.pitch, jump: false, crouch: false, sprint: false, attack: false, attackPressed: false, use: false, useHeld: false, sel: null };
    actor.ctl = (dt) => this.tick(dt);
  }

  enemies() { return this.m.actors.filter((o) => o.alive && this.m.enemies(this.a, o)); }
  nearestEnemy(maxD = 999) { let best = null, bd = maxD; for (const o of this.enemies()) { const d = this.dist(o.pos); if (d < bd) { bd = d; best = o; } } return best ? { o: best, d: bd } : null; }
  dist(p) { return Math.hypot(p.x - this.a.pos.x, p.z - this.a.pos.z) + Math.abs(p.y - this.a.pos.y) * 0.5; }
  visible(o) { const a = this.a, e = a.eye(eyeHeight(a)), t = { x: o.pos.x, y: o.pos.y + 1.4, z: o.pos.z }; const dx = t.x - e.x, dy = t.y - e.y, dz = t.z - e.z, d = Math.hypot(dx, dy, dz) || 1; const h = this.m.world.raycast(e.x, e.y, e.z, dx / d, dy / d, dz / d, d, (id) => isSolid(id) && id !== 7 && id !== 12); return !h; }

  aimAt(x, y, z, dt, err = 0) {
    const a = this.a, e = a.eye(eyeHeight(a));
    const dx = x - e.x, dy = y - e.y, dz = z - e.z;
    const ty = Math.atan2(-dx, -dz) + err * Math.sin(this.m.time * 3.1 + a.id), tp = Math.atan2(dy, Math.hypot(dx, dz)) + err * 0.5 * Math.cos(this.m.time * 2.3 + a.id);
    const c = this.ctlObj, step = this.turn * dt;
    const dyaw = wrap(ty - c.yaw);
    c.yaw = wrap(c.yaw + Math.max(-step, Math.min(step, dyaw)));
    c.pitch += Math.max(-step, Math.min(step, tp - c.pitch));
    return Math.abs(dyaw) + Math.abs(tp - c.pitch) * 0.5;
  }

  selectKind(kind) { const i = this.a.inv.best(kind); if (i >= 0) this.ctlObj.sel = i; return i >= 0; }
  selectBlocks() { const i = this.a.inv.blockSlot(); if (i >= 0) this.ctlObj.sel = i; return i >= 0; }

  steer(tx, tz, dt, run = true, trust = false) {
    const a = this.a, c = this.ctlObj;
    const dx = tx - a.pos.x, dz = tz - a.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.05) { c.mx = 0; c.mz = 0; return d; }
    c.mx = dx / d; c.mz = dz / d;
    c.sprint = run && d > 2;
    if (!trust && this.unsafeAhead(c.mx, c.mz)) { c.mx = 0; c.mz = 0; c.sprint = false; }
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
    const a = this.a, c = cell(a.pos);
    this.repath -= dt;
    const goalKey = `${gx},${gy},${gz}`;
    if (this.bridge) return this.doBridge(dt);
    if (!this.path || this.pathKey !== goalKey || this.repath <= 0 || this.pi >= this.path.length) {
      const r = findPath(this.m.world, c.x, c.y, c.z, gx, gy, gz, { near, limit: 2200 });
      this.path = r.path; this.pi = 1; this.pathKey = goalKey; this.repath = r.reached ? 1.2 + Math.random() * 0.6 : 2.6 + Math.random() * 1.2;
      this.pathReached = r.reached;
      if (!r.reached && allowBridge) {
        const e = r.end, remain = Math.hypot(e.x - gx, e.z - gz);
        if (remain > 2 && this.a.inv.blocks() > 0 && !(this.noBridge > 0)) {
          if (Math.hypot(e.x - c.x, e.z - c.z) < 1.5) { this.startBridge(gx, gy, gz); return this.doBridge(dt); }
        }
      }
    }
    const p = this.path[this.pi];
    if (!p) { this.ctlObj.mx = this.ctlObj.mz = 0; return this.pathReached; }
    const d = this.steer(p.x + 0.5, p.z + 0.5, dt, true, true);
    if (p.y > a.pos.y + 0.4 && a.onGround && d < 1.4) this.ctlObj.jump = true;
    if (d < 0.32 && Math.abs(p.y - a.pos.y) < 1.2) this.pi++;
    if (this.pi >= this.path.length && !this.pathReached && allowBridge && this.a.inv.blocks() > 0 && !(this.noBridge > 0)) { this.startBridge(gx, gy, gz); return false; }
    return this.pi >= this.path.length && this.pathReached;
  }

  startBridge(gx, gy, gz) {
    const c = cell(this.a.pos);
    this.bridge = { gx, gy, gz, y: c.y, cells: lineCells(c.x, c.z, gx, gz), i: 0, t: 0, placeT: 0 };
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
      if (!this.m.mode.canBreak(a, nx, by, nz, w.get(nx, by, nz))) { this.bridge = null; this.goal = null; this.noBridge = 5; return false; }
      this.selectKind('pick') || this.selectKind('axe');
      if (this.aimAt(nx + 0.5, by + 0.5, nz + 0.5, dt) < 0.3) ctl.attack = true;
      return false;
    }
    if (standable(w, nx, b.y, nz)) {
      ctl.crouch = true;
      this.steer(nx + 0.5, nz + 0.5, dt, false);
      ctl.mx *= 0.8; ctl.mz *= 0.8;
      if (Math.abs(a.pos.x - (nx + 0.5)) < 0.3 && Math.abs(a.pos.z - (nz + 0.5)) < 0.3) {
        b.i++;
        if (Math.hypot(nx - b.gx, nz - b.gz) < 2.5 || groundBelow(w, b.cells[b.i]?.[0] ?? nx, b.y, b.cells[b.i]?.[1] ?? nz, 1) != null && b.i > 3) {
          const r = findPath(w, nx, b.y, nz, b.gx, b.gy, b.gz, { near: 1, limit: 600 });
          if (r.reached) { this.bridge = null; this.path = null; }
        }
      }
      this.aimAt(nx + 0.5, b.y - 0.5, nz + 0.5, dt);
      return false;
    }
    if (needUp && standable(w, nx, b.y + 1, nz)) { ctl.jump = a.onGround; this.steer(nx + 0.5, nz + 0.5, dt, false); if (a.pos.y > b.y + 0.9) b.y += 1; return false; }
    ctl.mx = 0; ctl.mz = 0; ctl.crouch = true; ctl.sprint = false;
    if (!this.selectBlocks()) { this.bridge = null; return false; }
    const dx = nx + 0.5 - a.pos.x, dz = nz + 0.5 - a.pos.z, dd = Math.hypot(dx, dz) || 1;
    const edge = Math.abs(dx) > Math.abs(dz) ? Math.abs(a.pos.x - (here.x + 0.5 + Math.sign(dx) * 0.28)) : Math.abs(a.pos.z - (here.z + 0.5 + Math.sign(dz) * 0.28));
    if (edge > 0.12 && here.x === Math.floor(a.pos.x)) { ctl.mx = (dx / dd) * 0.5; ctl.mz = (dz / dd) * 0.5; }
    const ty = needUp ? b.y : b.y - 1;
    const err = this.aimAt(nx + 0.5, ty + 0.5, nz + 0.5, dt);
    b.placeT += dt;
    if (b.placeT > 0.62 - this.skill * 0.28 && err < 0.6) {
      b.placeT = 0;
      const slot = a.inv.slots[ctl.sel ?? a.sel];
      if (slot) {
        a.sel = ctl.sel ?? a.sel;
        if (!isSolid(w.get(nx, ty - 0 + (needUp ? -1 : 0), nz)) && needUp) this.m.place(a, nx, b.y - 1, nz, slot.id);
        else this.m.place(a, nx, ty, nz, slot.id);
      }
    }
    return false;
  }

  lootChest(ch, dt) {
    const a = this.a;
    const d = Math.hypot(ch.x + 0.5 - a.pos.x, ch.z + 0.5 - a.pos.z);
    if (d < 2.6 && Math.abs(ch.y - a.pos.y) < 2.5) {
      this.ctlObj.mx = this.ctlObj.mz = 0;
      this.aimAt(ch.x + 0.5, ch.y + 0.5, ch.z + 0.5, dt);
      this.pause += dt;
      if (this.pause > 1.1 + (1 - this.skill) * 0.9) { this.m.takeAll(a, ch); this.pause = 0; this.equip(); return true; }
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
    const a = this.a, ctl = this.ctlObj;
    this.bridge = null;
    if (!this.selectKind('sword')) this.selectKind('axe') || this.selectKind('pick');
    const err = this.aimAt(o.pos.x, o.pos.y + 1.2, o.pos.z, dt, this.aimErr);
    const reach = 2.8 + this.skill * 0.3;
    if (d > reach - 0.4) {
      const sameLevel = Math.abs(o.pos.y - a.pos.y) < 1.5;
      if (sameLevel && d < 6) { this.steer(o.pos.x, o.pos.z, dt); if (a.blocked && a.onGround) ctl.jump = true; }
      else { const c = cell(o.pos); const g = groundBelow(this.m.world, c.x, c.y, c.z, 4); this.goTo(c.x, g ?? c.y, c.z, dt, 1); }
    } else {
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeT = 0.6 + Math.random() * 0.9; this.strafe = Math.random() < 0.5 ? 1 : -1; }
      const dx = o.pos.x - a.pos.x, dz = o.pos.z - a.pos.z, dd = Math.hypot(dx, dz) || 1;
      const fwd = d > 2.2 ? 0.7 : -0.1;
      ctl.mx = (dx / dd) * fwd + (-dz / dd) * this.strafe * 0.6; ctl.mz = (dz / dd) * fwd + (dx / dd) * this.strafe * 0.6;
      if (this.unsafeAhead(ctl.mx, ctl.mz)) { ctl.mx = dx / dd * 0.4; ctl.mz = dz / dd * 0.4; if (this.unsafeAhead(ctl.mx, ctl.mz)) { ctl.mx = ctl.mz = 0; } ctl.crouch = true; }
      ctl.sprint = d > 1.8;
      this.jumpT -= dt;
      if (this.jumpT <= 0 && a.onGround && Math.random() < this.skill * 0.6) { ctl.jump = true; this.jumpT = 0.9 + Math.random(); }
    }
    this.clickT -= dt;
    if (d < reach + 0.5 && err < 0.45 && this.clickT <= 0) { ctl.attack = true; ctl.attackPressed = true; this.clickT = 1 / this.cps; }
  }

  tryThrow(o, d, dt) {
    const a = this.a;
    this.throwT -= dt;
    if (this.throwT > 0 || d < 5 || d > 16 || a.inv.count(131) === 0 || !this.visible(o)) return false;
    this.throwT = 2.5 + Math.random() * 3;
    const i = a.inv.slots.findIndex((s) => s && s.id === 131);
    if (i < 0) return false;
    a.sel = i; this.ctlObj.sel = i;
    const lead = d / 22;
    const err = this.aimAt(o.pos.x + o.vel.x * lead, o.pos.y + 1.3 + d * 0.06, o.pos.z + o.vel.z * lead, 1, 0);
    if (err < 0.5) { this.ctlObj.use = true; return true; }
    return false;
  }

  heal(dt) {
    const a = this.a;
    if (a.hp > 9) return false;
    const i = a.inv.slots.findIndex((s) => s && ITEMS[s.id].kind === 'food');
    if (i < 0) return false;
    this.ctlObj.sel = i; this.ctlObj.useHeld = true;
    return true;
  }

  clutch() {
    const a = this.a, w = this.m.world;
    if (a.onGround || a.vel.y > -6 || this.skill < 0.35) return;
    const c = cell(a.pos);
    if (groundBelow(w, c.x, c.y, c.z, 5) != null) return;
    if (Math.random() > this.skill * 0.08) return;
    const i = a.inv.blockSlot(); if (i < 0) return;
    a.sel = i; this.m.place(a, c.x, c.y - 1, c.z, a.inv.slots[i].id);
  }

  tick(dt) {
    const a = this.a, m = this.m, ctl = this.ctlObj;
    this.noBridge = (this.noBridge || 0) - dt;
    ctl.jump = false; ctl.attack = false; ctl.attackPressed = false; ctl.use = false; ctl.useHeld = false; ctl.crouch = false; ctl.mx = 0; ctl.mz = 0;
    if (m.state !== 'play') return ctl;
    this.clutch();
    const moved = Math.hypot(a.pos.x - this.lastPos.x, a.pos.z - this.lastPos.z);
    this.lastPos = { ...a.pos };
    const wantsMove = (this.path && this.pi < this.path.length) || !!this.bridge || (this.goal && this.goal.t !== 'idle');
    this.stuckT = moved < 0.4 * dt && wantsMove && !this.bridge ? this.stuckT + dt : Math.max(0, this.stuckT - dt);
    if (this.stuckT > 1.2) { ctl.jump = true; this.path = null; }
    if (this.stuckT > 3.5) { this.stuckT = 0; this.goal = null; this.bridge = null; }
    if (moved > 0.6 * dt) this.lostT = 0;

    const ne = this.nearestEnemy(30);
    if (ne) {
      this.noticeT += dt;
      const vis = ne.d < 3 || this.visible(ne.o);
      const early = m.mode.id === 'sky' && m.time < 100 && !ne.o.local;
      const engage = ne.d < (this.bridge ? 4 : early ? 4 + this.brave * 3 : 9 + this.brave * 8) && vis && Math.abs(ne.o.pos.y - a.pos.y) < 5;
      if (engage && this.noticeT > this.react && (!m.mode.botEngage || m.mode.botEngage(this, ne))) {
        if (!(ne.d < 3.5) && this.heal(dt)) return ctl;
        if (this.tryThrow(ne.o, ne.d, dt)) return ctl;
        this.fight(ne.o, ne.d, dt);
        return ctl;
      }
    } else this.noticeT = 0;
    if (this.heal(dt)) return ctl;
    const plan = m.mode.botPlan ? m.mode.botPlan(this, dt) : this.planSky(dt);
    return plan || ctl;
  }

  planSky(dt) {
    const a = this.a, m = this.m, ctl = this.ctlObj, mode = m.mode;
    if (mode.rising && a.pos.y < m.map.voidY + 5 && this.tower(dt)) return ctl;
    if (mode.border < mode.radius && Math.hypot(a.pos.x, a.pos.z) > mode.border - 5) { this.goal = { t: 'center' }; this.goTo(0, m.map.center.y - 2, 0, dt, 3); return ctl; }
    const home = a.home;
    const own = this.nearestChest(14, (ch) => Math.hypot(ch.x - home.x, ch.z - home.z) < 9);
    if (own) { this.goal = { t: 'loot' }; this.lootChest(own, dt); return ctl; }
    const blocks = a.inv.blocks();
    if (blocks < 8) {
      const near = this.nearestChest(12);
      if (near) { this.goal = { t: 'loot' }; this.lootChest(near, dt); return ctl; }
      if (this.mineForBlocks(dt)) return ctl;
    }
    const geared = a.inv.armorPoints() + (a.inv.best('sword') >= 0 ? 4 : 0);
    if (!this.goal || this.goal.t === 'loot' || this.goal.t === 'idle' || (this.goalT -= dt) <= 0) {
      this.goalT = 6 + Math.random() * 6;
      const midLeft = m.map.chests.some((c) => c.tier === 'mid' && !c.looted && c.items.length);
      const ne = this.nearestEnemy(999);
      if (m.time < this.patience * (geared < 10 ? 1 : 0.75)) this.goal = { t: midLeft && m.time > 25 && this.greed > 0.8 ? 'mid' : 'idle' };
      else if (midLeft && (this.greed > 0.6 || geared < 5) && (m.time < 150 || (mode.refilled && m.time < mode.borderAt && Math.random() < 0.5))) this.goal = { t: 'mid' };
      else if (ne) this.goal = { t: 'hunt', o: ne.o };
      else this.goal = { t: 'mid' };
    }
    if (this.goal.t === 'idle') { this.goalT = Math.min(this.goalT, 3); this.wander(dt); return ctl; }
    if (this.goal.t === 'mid') {
      const ch = this.nearestChest(80, (c) => c.tier !== 'spawn' || Math.hypot(c.x - home.x, c.z - home.z) < 9);
      if (ch && this.dist(ch) < 60) { this.lootChest(ch, dt); return ctl; }
      this.goTo(0, m.map.center.y - 2, 0, dt, 2);
      return ctl;
    }
    if (this.goal.t === 'hunt') {
      const o = this.goal.o;
      if (!o || !o.alive) { this.goal = null; return ctl; }
      if (o.pos.y - a.pos.y > 1.8 && Math.hypot(o.pos.x - a.pos.x, o.pos.z - a.pos.z) < 5 && this.tower(dt)) return ctl;
      const c = cell(o.pos);
      const g = groundBelow(m.world, c.x, c.y, c.z, 6);
      this.goTo(c.x, g ?? c.y, c.z, dt, 1);
      return ctl;
    }
    return ctl;
  }

  followRoute(nodes, dt) {
    const a = this.a, ctl = this.ctlObj, w = this.m.world;
    if (this.rI == null) this.rI = 0;
    let n = nodes[this.rI];
    const reachedNode = (q) => (a.onGround || !(q.jump || q.tight)) && Math.hypot(q.x + 0.5 - a.pos.x, q.z + 0.5 - a.pos.z) < (q.tight ? 0.6 : 0.85) && a.pos.y > q.y - 0.6 && a.pos.y < q.y + 1.4;
    while (n && reachedNode(n)) { this.lastTight = !!n.tight; this.rI++; n = nodes[this.rI]; }
    if (!n) { ctl.mx = ctl.mz = 0; return true; }
    if (this.waitT > 0) { this.waitT -= dt; ctl.mx = ctl.mz = 0; return false; }
    const dx = n.x + 0.5 - a.pos.x, dz = n.z + 0.5 - a.pos.z, d = Math.hypot(dx, dz) || 1;
    ctl.mx = dx / d; ctl.mz = dz / d;
    ctl.yaw = Math.atan2(-dx, -dz); ctl.pitch = -0.15;
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
    if (Math.abs(a.pos.y - y) < 0.6 && Math.hypot(x + 0.5 - a.pos.x, z + 0.5 - a.pos.z) < 2.5) { this.steer(x + 0.5, z + 0.5, dt, false); return; }
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
    if (this.wanderT <= 0 || !this.wanderTo) { this.wanderT = 2 + Math.random() * 3; const h = a.home; this.wanderTo = { x: h.x + (Math.random() - 0.5) * 5, z: h.z + (Math.random() - 0.5) * 5 }; }
    const d = this.steer(this.wanderTo.x, this.wanderTo.z, dt, false);
    if (d < 0.5) { this.ctlObj.mx = this.ctlObj.mz = 0; this.aimAt(0, a.pos.y + 1, 0, dt * 0.3); }
  }

  mineForBlocks(dt) {
    const a = this.a, w = this.m.world, c = cell(a.pos);
    if (!this.mineTarget || !w.get(this.mineTarget.x, this.mineTarget.y, this.mineTarget.z)) {
      this.mineTarget = null;
      outer: for (let r = 1; r <= 5; r++) for (let dy = 0; dy <= 2; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const x = c.x + dx, y = c.y + dy - (dy === 2 ? 3 : 0), z = c.z + dz;
        if (dx === 0 && dz === 0) continue;
        const id = w.get(x, y, z);
        if (id && [2, 3, 4, 5, 6, 8, 9, 18, 28].includes(id) && this.m.mode.canBreak(a, x, y, z, id) && y >= c.y - 1) { this.mineTarget = { x, y, z }; break outer; }
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
