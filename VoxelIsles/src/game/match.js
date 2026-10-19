import { BLOCKS, isSolid } from '../engine/blocks.js';
import { ITEMS } from './items.js';
import { stepActor, eyeHeight, height, canPlaceAt, HW } from './physics.js';
import { PLACED } from './maps.js';

const REACH_HIT = 3.2, REACH_BLOCK = 4.8;

function rayBox(o, d, minX, minY, minZ, maxX, maxY, maxZ) {
  let t0 = 0, t1 = Infinity;
  for (const [oo, dd, mn, mx] of [[o.x, d.x, minX, maxX], [o.y, d.y, minY, maxY], [o.z, d.z, minZ, maxZ]]) {
    if (Math.abs(dd) < 1e-9) { if (oo < mn || oo > mx) return -1; continue; }
    let a = (mn - oo) / dd, b = (mx - oo) / dd;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    if (t0 > t1) return -1;
  }
  return t0;
}

export class Match {
  constructor(map, mode, opts = {}) {
    this.map = map; this.world = map.world; this.mode = mode;
    this.actors = []; this.drops = []; this.projectiles = []; this.events = [];
    this.time = 0; this.state = 'countdown'; this.countdown = opts.countdown ?? 5;
    this.seed = opts.seed || 1; this.rand = mulberry(this.seed);
    this.winner = null; this.over = false;
    this.npcs = [];
    mode.attach(this);
  }
  emit(e) { this.events.push(e); if (this.events.length > 400) this.events.splice(0, 100); }
  add(a) { this.actors.push(a); a.match = this; return a; }
  teamOf(a) { return a.team; }
  enemies(a, b) { return a !== b && !this.mode.noPvp && (a.team < 0 || a.team !== b.team) && !(this.mode.allied && this.mode.allied(a, b)); }
  alive() { return this.actors.filter((a) => a.alive); }

  update(dt) {
    dt = Math.min(dt, 0.05);
    if (this.state === 'countdown') {
      this.countdown -= dt;
      for (const a of this.actors) this.stepPhysics(a, dt, a.ctl ? a.ctl(dt, this) : null, true);
      if (this.countdown <= 0) { this.state = 'play'; this.mode.start(); this.emit({ t: 'start' }); }
      return;
    }
    if (this.state === 'over') { this.time += dt; for (const a of this.actors) if (a.alive) this.stepPhysics(a, dt, null, true); return; }
    this.time += dt;
    for (const a of this.actors) {
      if (!a.alive) { if (a.respawnT > 0) { a.respawnT -= dt; if (a.respawnT <= 0) this.mode.respawn(a); } continue; }
      const ctl = a.ctl ? a.ctl(dt, this) : null;
      a.lastCtl = ctl;
      const fz = this.mode.frozen ? this.mode.frozen(a) : false;
      if (fz === 'solid') { if (ctl) { if (ctl.yaw != null) a.yaw = ctl.yaw; if (ctl.pitch != null) a.pitch = Math.max(-1.55, Math.min(1.55, ctl.pitch)); if (ctl.sel != null && ctl.sel >= 0 && ctl.sel < 9) a.sel = ctl.sel; if (ctl.use) this.use(a, ctl); } a.moveAmt = 0; continue; }
      if (fz) { this.stepPhysics(a, dt, ctl, true); continue; }
      this.tickActor(a, dt, ctl);
    }
    this.updateDrops(dt);
    this.updateProjectiles(dt);
    this.mode.update(dt);
  }

  stepPhysics(a, dt, ctl, frozen) {
    if (!a.alive) return;
    const c = ctl || {};
    if (c.yaw != null) a.yaw = c.yaw;
    if (c.pitch != null) a.pitch = Math.max(-1.55, Math.min(1.55, c.pitch));
    const r = stepActor(this.world, a, dt, frozen ? { mx: 0, mz: 0 } : c);
    a.moveAmt = Math.hypot(a.vel.x, a.vel.z);
    a.walkPhase += a.moveAmt * dt * 2.2;
    return r;
  }

  tickActor(a, dt, ctl) {
    const c = ctl || {};
    if (c.sel != null && c.sel >= 0 && c.sel < 9 && c.sel !== a.sel) { a.sel = c.sel; a.mine = null; a.eatT = 0; }
    a.sprint = !!c.sprint && !c.crouch;
    const r = this.stepPhysics(a, dt, c, false);
    a.hurtT = Math.max(0, a.hurtT - dt); a.attackCd = Math.max(0, a.attackCd - dt); a.swingT = Math.max(0, a.swingT - dt); a.spawnProtect = Math.max(0, a.spawnProtect - dt);
    if (r && r.landed > 3.5 && !this.mode.noFall) this.damage(a, Math.floor(r.landed - 3), this.recentAttacker(a, 5), 'fall');
    if (!a.alive) return;
    if (a.pos.y < this.map.voidY) { this.kill(a, this.recentAttacker(a, 10), 'void'); return; }
    if (a.hp < a.maxHp && this.time - a.lastHurt > 5) { a.regenT += dt; if (a.regenT > 2.5) { a.regenT = 0; a.hp = Math.min(a.maxHp, a.hp + 1); } }
    const held = a.held();
    if (c.attack) this.attackOrMine(a, dt, c.attackPressed);
    else a.mine = null;
    if (held && held.kind === 'food' && c.useHeld && a.hp < a.maxHp) { a.eatT += dt; if (a.eatT > 0.9) { a.eatT = 0; a.hp = Math.min(a.maxHp, a.hp + held.heal); if (held.id === 130) a.absorb = 4; a.inv.useSlot(a.sel); this.emit({ t: 'eat', a }); } }
    else a.eatT = 0;
    if (c.use) this.use(a, c);
  }

  recentAttacker(a, within) { return a.lastAttacker && this.time - a.lastAttackT < within ? a.lastAttacker : null; }

  lookHit(a, reach = REACH_BLOCK) {
    const e = a.eye(eyeHeight(a)), d = a.look();
    return this.world.raycast(e.x, e.y, e.z, d.x, d.y, d.z, reach, (id) => id !== 0 && (BLOCKS[id].solid || BLOCKS[id].pick));
  }
  lookActor(a, reach = REACH_HIT) {
    const e = a.eye(eyeHeight(a)), d = a.look();
    let best = null, bt = reach;
    for (const o of this.actors) {
      if (o === a || !o.alive || o.solid) continue;
      const h = height(o), r = o.disguise ? 0.5 : HW + 0.1;
      const t = rayBox(e, d, o.pos.x - r, o.pos.y - (o.disguise ? 0 : 0.1), o.pos.z - r, o.pos.x + r, o.pos.y + (o.disguise ? 1 : h + 0.1), o.pos.z + r);
      if (t >= 0 && t < bt) { bt = t; best = o; }
    }
    for (const n of this.npcs) {
      const t = rayBox(e, d, n.x - 0.4, n.y, n.z - 0.4, n.x + 0.4, n.y + 1.9, n.z + 0.4);
      if (t >= 0 && t < bt) { bt = t; best = n; }
    }
    if (best) { const bh = this.lookHit(a, bt); if (bh && bh.t < bt) return null; }
    return best ? { target: best, t: bt } : null;
  }

  attackOrMine(a, dt, pressed) {
    const hit = this.lookActor(a);
    if (hit && !hit.target.npc) {
      a.mine = null;
      if (a.attackCd <= 0 && (pressed || a.bot || a.autoSwing)) this.melee(a, hit.target);
      return;
    }
    if (pressed) { a.swingT = 0.25; a.swingN++; this.emit({ t: 'swing', a }); }
    const bh = this.lookHit(a);
    if (bh && pressed && this.mode.onBlockHit && this.mode.onBlockHit(a, bh)) { a.mine = null; return; }
    if (!bh || !isSolid(bh.id) && !BLOCKS[bh.id].cross) { a.mine = null; if (bh && pressed && this.mode.onUse) this.mode.onUse(a, bh); return; }
    if (!this.mode.canBreak(a, bh.x, bh.y, bh.z, bh.id)) { a.mine = null; return; }
    if (!a.mine || a.mine.x !== bh.x || a.mine.y !== bh.y || a.mine.z !== bh.z) a.mine = { x: bh.x, y: bh.y, z: bh.z, p: 0, need: this.breakTime(a, bh.id), snd: 0 };
    a.mine.p += dt; a.mine.snd += dt; if (a.swingT <= 0) { a.swingT = 0.25; a.swingN++; }
    if (a.mine.snd > 0.24) { a.mine.snd = 0; this.emit({ t: 'dig', a, id: bh.id, x: bh.x, y: bh.y, z: bh.z }); }
    if (a.mine.p >= a.mine.need) this.breakBlock(a, bh.x, bh.y, bh.z);
  }

  breakTime(a, id) {
    const b = BLOCKS[id];
    if (b.hardness <= 0) return 0.05;
    const held = a.held();
    let speed = 1;
    if (held) {
      if (held.kind === 'pick' && b.tool === 'pick') speed = held.speed;
      else if (held.kind === 'axe' && b.tool === 'axe') speed = held.speed;
      else if (held.kind === 'shears' && (b.tool === 'shears' || id === 7)) speed = held.speed;
      else if (held.kind === 'sword' && id === 7) speed = 1.5;
    }
    if (b.tool === 'shovel') speed = Math.max(speed, 1.6);
    const base = b.tool === 'pick' && (!held || held.kind !== 'pick') ? b.hardness * 2.2 : b.hardness * 1.1;
    return Math.max(0.05, base / speed);
  }

  breakBlock(a, x, y, z) {
    const id = this.world.get(x, y, z);
    if (!id) return;
    this.world.set(x, y, z, 0);
    a.mine = null; a.broken++;
    this.emit({ t: 'break', a, id, x, y, z });
    this.mode.onBreak(a, x, y, z, id);
    const drop = this.mode.dropFor(id);
    if (drop) { const left = a.inv.add(drop, 1); if (left) this.spawnDrop(drop, left, x + 0.5, y + 0.5, z + 0.5); }
    for (let yy = y + 1; yy < y + 3; yy++) { const above = this.world.get(x, yy, z); if (above && BLOCKS[above].cross) this.world.set(x, yy, z, 0); else break; }
  }

  melee(a, t) {
    a.attackCd = a.bot ? 0.42 : 0.3; a.swingT = 0.25; a.swingN++;
    this.emit({ t: 'swing', a });
    if (!this.enemies(a, t) || t.spawnProtect > 0) return;
    const held = a.held();
    let dmg = held && held.damage ? held.damage : 1;
    const crit = !a.onGround && a.vel.y < -0.5;
    if (crit) dmg *= 1.5;
    const landed = this.damage(t, dmg, a, 'melee', crit);
    if (landed) {
      const d = Math.hypot(t.pos.x - a.pos.x, t.pos.z - a.pos.z) || 1;
      const k = (a.sprint ? 7.2 : 5.2) * (t.crouch ? 0.6 : 1);
      t.kb.x = ((t.pos.x - a.pos.x) / d) * k; t.kb.z = ((t.pos.z - a.pos.z) / d) * k;
      if (t.onGround) { t.vel.y = 5.2; t.onGround = false; }
      if (a.sprint) a.sprint = false;
    }
  }

  damage(t, amount, by, cause, crit = false) {
    if (!t.alive || t.spawnProtect > 0) return false;
    if (cause === 'melee' && t.hurtT > 0) return false;
    let dmg = amount * (1 - Math.min(0.8, t.inv.armorPoints() * 0.04));
    if (t.absorb > 0 && cause !== 'border') { const s = Math.min(t.absorb, dmg); t.absorb -= s; dmg -= s; }
    t.hp -= dmg; t.hurtT = 0.45; t.lastHurt = this.time; t.regenT = 0; t.eatT = 0;
    if (by && by !== t) { t.lastAttacker = by; t.lastAttackT = this.time; }
    this.emit({ t: 'hurt', a: t, by, cause, crit, dmg });
    if (t.hp <= 0) this.kill(t, by && by !== t ? by : this.recentAttacker(t, 10), cause);
    return true;
  }

  kill(t, killer, cause) {
    if (!t.alive) return;
    t.alive = false; t.hp = 0; t.deaths++; t.mine = null;
    if (killer && killer !== t) killer.kills++;
    this.emit({ t: 'kill', a: t, by: killer, cause });
    if (cause !== 'void' && this.mode.dropsOnDeath) for (const it of t.inv.all()) this.spawnDrop(it.id, it.count, t.pos.x, t.pos.y + 0.8, t.pos.z, true);
    this.mode.onDeath(t, killer, cause);
  }

  use(a, c) {
    const held = a.held();
    if (held && this.mode.onItem && this.mode.onItem(a, held, c)) return;
    const npc = this.lookActor(a, 4);
    if (npc && npc.target.npc) { this.emit({ t: 'npc', a, npc: npc.target }); return; }
    const bh = this.lookHit(a);
    if (bh && this.mode.onUse && this.mode.onUse(a, bh)) return;
    if (bh && bh.id === 17) { const ch = this.chestAt(bh.x, bh.y, bh.z); if (ch) { this.emit({ t: 'chest', a, chest: ch }); return; } }
    if (held && held.kind === 'block' && bh) {
      const x = bh.x + bh.nx, y = bh.y + bh.ny, z = bh.z + bh.nz;
      if (BLOCKS[bh.id].cross) { this.place(a, bh.x, bh.y, bh.z, held.block); return; }
      this.place(a, x, y, z, held.block);
      return;
    }
    if (held && (held.kind === 'throw' || held.kind === 'warp')) this.throwItem(a, held.id);
  }

  place(a, x, y, z, block) {
    if (y >= this.world.sy - 1 || y < 1) return false;
    if (!this.mode.canPlace(a, x, y, z)) return false;
    if (!canPlaceAt(this.world, this.actors.filter((o) => o.alive), x, y, z)) return false;
    const s = a.inv.slots[a.sel];
    if (!s || s.id !== block) return false;
    this.world.set(x, y, z, block, PLACED);
    a.inv.useSlot(a.sel); a.placed++; a.swingT = 0.25; a.swingN++;
    this.emit({ t: 'place', a, id: block, x, y, z });
    return true;
  }

  throwItem(a, id) {
    if (a.attackCd > 0) return;
    a.attackCd = 0.3; a.swingT = 0.25; a.swingN++;
    const e = a.eye(eyeHeight(a)), d = a.look();
    this.projectiles.push({ id, owner: a, x: e.x + d.x * 0.5, y: e.y + d.y * 0.5, z: e.z + d.z * 0.5, vx: d.x * 22, vy: d.y * 22 + 2, vz: d.z * 22, age: 0 });
    a.inv.useSlot(a.sel);
    this.emit({ t: 'throw', a, id });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt; p.vy -= 18 * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      let hit = null;
      for (const o of this.actors) {
        if (!o.alive || o === p.owner && p.age < 0.3) continue;
        if (Math.abs(o.pos.x - nx) < 0.45 && Math.abs(o.pos.z - nz) < 0.45 && ny > o.pos.y && ny < o.pos.y + height(o)) { hit = o; break; }
      }
      const blockHit = isSolid(this.world.get(nx, ny, nz));
      if (hit || blockHit || p.age > 6 || ny < this.map.voidY - 10) {
        if (p.id === 131 && hit && this.enemies(p.owner, hit)) {
          const d = Math.hypot(p.vx, p.vz) || 1;
          hit.kb.x = (p.vx / d) * 4.5; hit.kb.z = (p.vz / d) * 4.5; if (hit.onGround) { hit.vel.y = 3.5; hit.onGround = false; }
          this.damage(hit, 0.5, p.owner, 'snowball');
        }
        if (p.id === 132 && p.owner.alive && (blockHit || hit) && ny > this.map.voidY) {
          const o = p.owner;
          let tx = p.x, ty = p.y, tz = p.z;
          if (blockHit) { ty = Math.floor(ny) + 1; for (let k = 0; k < 3 && this.world.boxHits(tx - HW, ty, tz - HW, tx + HW, ty + 1.8, tz + HW); k++) ty++; }
          o.pos.x = tx; o.pos.y = ty; o.pos.z = tz; o.vel.x = o.vel.y = o.vel.z = 0; o.kb.x = o.kb.z = 0;
          this.damage(o, 2, null, 'warp');
          this.emit({ t: 'warp', a: o });
        }
        this.emit({ t: 'impact', id: p.id, x: p.x, y: p.y, z: p.z });
        this.projectiles.splice(i, 1);
        continue;
      }
      p.x = nx; p.y = ny; p.z = nz;
    }
  }

  spawnDrop(id, count, x, y, z, scatter = false) {
    if (this.drops.length > 160) this.drops.shift();
    const a = this.rand() * Math.PI * 2, s = scatter ? 1.6 + this.rand() * 1.4 : 0;
    this.drops.push({ id, count, x, y, z, vx: Math.cos(a) * s, vy: scatter ? 4 : 0, vz: Math.sin(a) * s, age: 0, key: Math.random() });
  }

  updateDrops(dt) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.age += dt;
      d.vy -= 20 * dt;
      const ny = d.y + d.vy * dt;
      if (isSolid(this.world.get(d.x, ny - 0.15, d.z))) { d.y = Math.floor(ny - 0.15) + 1.15; d.vy = 0; d.vx *= 0.5; d.vz *= 0.5; } else d.y = ny;
      const nx = d.x + d.vx * dt, nz = d.z + d.vz * dt;
      if (!isSolid(this.world.get(nx, d.y, d.z))) d.x = nx; else d.vx = 0;
      if (!isSolid(this.world.get(d.x, d.y, nz))) d.z = nz; else d.vz = 0;
      d.vx *= Math.pow(0.3, dt); d.vz *= Math.pow(0.3, dt);
      if (d.y < this.map.voidY - 8 || d.age > 240) { this.drops.splice(i, 1); continue; }
      if (d.age < 0.4) continue;
      for (const a of this.actors) {
        if (!a.alive) continue;
        const dx = a.pos.x - d.x, dy = a.pos.y + 0.6 - d.y, dz = a.pos.z - d.z;
        if (dx * dx + dy * dy + dz * dz < 2.0) {
          const left = a.inv.add(d.id, d.count);
          if (left < d.count) { this.emit({ t: 'pickup', a, id: d.id, n: d.count - left }); }
          if (!left) { this.drops.splice(i, 1); break; } else d.count = left;
        }
      }
    }
  }

  chestAt(x, y, z) { return this.map.chests.find((c) => c.x === x && c.y === y && c.z === z); }
  takeFromChest(a, chest, idx) {
    const it = chest.items[idx];
    if (!it) return false;
    const left = a.inv.add(it.id, it.count);
    if (left === it.count && ITEMS[it.id].kind !== 'armor') return false;
    if (left) it.count = left; else chest.items.splice(idx, 1);
    this.emit({ t: 'pickup', a, id: it.id, n: it.count - left });
    return true;
  }
  takeAll(a, chest) { let any = false; for (let i = chest.items.length - 1; i >= 0; i--) any = this.takeFromChest(a, chest, i) || any; chest.looted = true; return any; }

  finish(winner) {
    if (this.over) return;
    this.over = true; this.state = 'over'; this.winner = winner;
    this.emit({ t: 'over', winner });
  }
}

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export { mulberry };
