import { ITEMS } from './items.js';

export class Inventory {
  constructor(n = 9) { this.slots = Array.from({ length: n }, () => null); this.armor = [0, 0, 0, 0]; }
  count(id) { let c = 0; for (const s of this.slots) if (s && s.id === id) c += s.count; return c; }
  add(id, count = 1) {
    const it = ITEMS[id];
    if (!it) return count;
    if (it.kind === 'armor') { if (!this.armor[it.slot] || ITEMS[this.armor[it.slot]].points < it.points) { this.armor[it.slot] = id; return 0; } if (this.armor[it.slot] === id || ITEMS[this.armor[it.slot]].points >= it.points) return 0; }
    for (const s of this.slots) if (s && s.id === id && s.count < it.stack) { const k = Math.min(count, it.stack - s.count); s.count += k; count -= k; if (!count) return 0; }
    for (let i = 0; i < this.slots.length && count > 0; i++) if (!this.slots[i]) { const k = Math.min(count, it.stack); this.slots[i] = { id, count: k }; count -= k; }
    return count;
  }
  take(id, count = 1) {
    if (this.count(id) < count) return false;
    for (let i = this.slots.length - 1; i >= 0 && count > 0; i--) { const s = this.slots[i]; if (s && s.id === id) { const k = Math.min(count, s.count); s.count -= k; count -= k; if (!s.count) this.slots[i] = null; } }
    return true;
  }
  useSlot(i, n = 1) { const s = this.slots[i]; if (!s) return; s.count -= n; if (s.count <= 0) this.slots[i] = null; }
  armorPoints() { let p = 0; for (const id of this.armor) if (id) p += ITEMS[id].points; return p; }
  best(kind) { let b = -1, bi = -1; this.slots.forEach((s, i) => { const it = s && ITEMS[s.id]; if (it && it.kind === kind && (it.damage ?? it.tier ?? 0) > b) { b = it.damage ?? it.tier ?? 0; bi = i; } }); return bi; }
  blockSlot() { let bi = -1, bc = 0; this.slots.forEach((s, i) => { if (s && s.id < 100 && ITEMS[s.id].kind === 'block' && s.count > bc) { bc = s.count; bi = i; } }); return bi; }
  blocks() { let c = 0; for (const s of this.slots) if (s && s.id < 100) c += s.count; return c; }
  clear() { this.slots.fill(null); this.armor = [0, 0, 0, 0]; }
  all() { const out = []; for (const s of this.slots) if (s) out.push({ ...s }); for (const id of this.armor) if (id) out.push({ id, count: 1 }); return out; }
}

let NEXT = 1;
export class Actor {
  constructor({ name, team = -1, bot = false, skin = 0, local = false }) {
    this.id = NEXT++;
    this.name = name; this.team = team; this.bot = bot; this.local = local; this.skin = skin;
    this.pos = { x: 0, y: 0, z: 0 }; this.vel = { x: 0, y: 0, z: 0 }; this.kb = { x: 0, z: 0 };
    this.yaw = 0; this.pitch = 0; this.onGround = false; this.crouch = false; this.sprint = false;
    this.inv = new Inventory(9); this.sel = 0;
    this.hp = 20; this.maxHp = 20; this.alive = true; this.eliminated = false;
    this.hurtT = 0; this.attackCd = 0; this.swingT = 0; this.swingN = 0; this.lastAttacker = null; this.lastAttackT = -99;
    this.kills = 0; this.deaths = 0; this.placed = 0; this.broken = 0;
    this.mine = null; this.eatT = 0; this.regenT = 0; this.respawnT = 0; this.spawnProtect = 0;
    this.walkPhase = 0; this.moveAmt = 0; this.lastHurt = -99; this.absorb = 0; this.rank = 0;
  }
  held() { const s = this.inv.slots[this.sel]; return s ? ITEMS[s.id] : null; }
  eye(h) { return { x: this.pos.x, y: this.pos.y + h, z: this.pos.z }; }
  look() { const cp = Math.cos(this.pitch); return { x: -Math.sin(this.yaw) * cp, y: Math.sin(this.pitch), z: -Math.cos(this.yaw) * cp }; }
  reset() { this.vel.x = this.vel.y = this.vel.z = 0; this.kb.x = this.kb.z = 0; this.hp = this.maxHp; this.hurtT = 0; this.mine = null; this.eatT = 0; this.airTop = null; this.onGround = false; this.crouch = false; }
}
