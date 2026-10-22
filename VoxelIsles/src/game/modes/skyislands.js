import { BLOCKS, TEAM_COLORS } from '../../engine/blocks.js';
import { ARMOR_ID } from '../items.js';
import { t } from '../../i18n/strings.js';
import { clock, kit, spawnAt } from './common.js';

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const between = (r, a, b) => a + Math.floor(r() * (b - a + 1));

function armorPiece(r, tiers) { return ARMOR_ID(pick(r, tiers), Math.floor(r() * 4)); }

export function lootFor(r, tier, guarantee = false) {
  const out = [];
  const add = (id, count = 1) => out.push({ id, count });
  if (tier === 'spawn') {
    add(pick(r, [5, 5, 4, 3]), between(r, 14, 24));
    if (guarantee || r() < 0.45) add(r() < 0.6 ? 101 : 100);
    if (guarantee || r() < 0.55) add(armorPiece(r, [0, 0, 1]));
    if (r() < 0.45) add(armorPiece(r, [0, 1, 1, 2]));
    if (r() < 0.4) add(131, between(r, 4, 8));
    if (r() < 0.35) add(133, between(r, 1, 3));
    if (r() < 0.25) add(111);
    if (r() < 0.12) add(130);
    if (r() < 0.12) add(102);
  } else if (tier === 'satellite') {
    add(pick(r, [5, 4, 3]), between(r, 12, 20));
    add(armorPiece(r, [1, 2, 2]));
    if (r() < 0.5) add(armorPiece(r, [2, 2, 3]));
    if (r() < 0.45) add(102);
    if (r() < 0.5) add(130);
    if (r() < 0.3) add(132);
    if (r() < 0.4) add(131, between(r, 6, 12));
  } else {
    add(pick(r, [5, 4, 3]), between(r, 20, 32));
    add(armorPiece(r, [2, 3, 3]));
    if (r() < 0.65) add(armorPiece(r, [2, 3]));
    if (r() < 0.55) add(r() < 0.5 ? 103 : 102);
    if (r() < 0.75) add(130, between(r, 1, 2));
    if (r() < 0.5) add(132, between(r, 1, 2));
    if (r() < 0.35) add(112);
    if (r() < 0.4) add(131, between(r, 8, 16));
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

export class SkyIslands {
  constructor() { this.id = 'sky'; this.dropsOnDeath = true; this.refillAt = 180; this.borderAt = 300; this.borderDur = 120; this.refilled = false; this.cages = []; this.ranks = []; }
  attach(m) {
    this.m = m; this.radius = m.map.radius; this.border = this.radius; this.respawnsOn = true;
    this.spawnRing = Math.max(...m.map.spawns.map((sp) => Math.hypot(sp.x, sp.z)));
    this.fillChests(false);
  }
  fillChests(refill) {
    const r = this.m.rand, seen = new Set();
    for (const c of this.m.map.chests) {
      const key = c.group ?? `${Math.round(c.x / 12)},${Math.round(c.z / 12)}`;
      const first = !seen.has(key); seen.add(key);
      const items = lootFor(r, c.tier, first && c.tier === 'spawn' && !refill);
      c.items = refill ? [...c.items, ...items].slice(0, 12) : items;
      c.looted = false;
    }
  }
  setup(actors) {
    const sp = this.m.map.spawns;
    actors.forEach((a, i) => {
      const s = sp[i % sp.length];
      a.pos.x = s.x; a.pos.y = s.y; a.pos.z = s.z; a.yaw = s.yaw; a.pitch = -0.15; a.spawn = s; a.home = s; a.lives = 3;
      this.cage(Math.floor(s.x), Math.floor(s.y), Math.floor(s.z), true);
    });
  }
  cage(x, y, z, on) {
    const w = this.m.world;
    for (let yy = y; yy <= y + 2; yy++) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (on ? !w.get(x + dx, yy, z + dz) : w.get(x + dx, yy, z + dz) === 12) w.set(x + dx, yy, z + dz, on ? 12 : 0, 2);
    if (on ? !w.get(x, y + 2, z) : w.get(x, y + 2, z) === 12) w.set(x, y + 2, z, on ? 12 : 0, 2);
    if (on) this.cages.push([x, y, z]);
  }
  start() { for (const [x, y, z] of this.cages) this.cage(x, y, z, false); this.cages = []; for (const a of this.m.actors) a.spawnProtect = 3; }
  update(dt) {
    const m = this.m;
    if (!this.refilled && m.time >= this.refillAt) { this.refilled = true; this.fillChests(true); m.emit({ t: 'refill' }); }
    if (m.time >= this.borderAt) {
      const k = Math.min(1, (m.time - this.borderAt) / this.borderDur);
      this.border = this.radius + (6 - this.radius) * k;
      if (!this.borderWarned) { this.borderWarned = true; m.emit({ t: 'border' }); }
      this.borderTick = (this.borderTick || 0) + dt;
      if (this.borderTick > 1) {
        this.borderTick = 0;
        for (const a of m.actors) if (a.alive && Math.hypot(a.pos.x, a.pos.z) > this.border) m.damage(a, 1.5, m.recentAttacker(a, 10), 'border');
      }
    }
    if (m.time >= this.borderAt + this.borderDur - 20) {
      if (!this.rising) { this.rising = true; this.voidBase = m.map.voidY; m.emit({ t: 'voidrise' }); }
      m.map.voidY = Math.min(m.map.top + 6, m.map.voidY + dt * 0.3);
    }
    if (this.respawnsOn && this.border < this.spawnRing + 3) { this.respawnsOn = false; m.emit({ t: 'notice', text: t('respawnsOff'), cls: 'bad', sound: 'lo' }); }
    const alive = m.actors.filter((a) => !a.eliminated && (a.alive || a.respawnT > 0));
    if (alive.length <= 1 && !m.over) { const w = alive[0] && alive[0].alive ? alive[0] : alive[0] || null; if (w) w.rank = 1; m.finish(w); }
  }
  canBreak(a, x, y, z, id) { const b = BLOCKS[id]; return !b.unbreakable && id !== 17 && Math.hypot(x, z) < this.radius + 6; }
  canPlace(a, x, y, z) { return Math.hypot(x + 0.5, z + 0.5) < this.radius + 4 && y > 2; }
  dropFor(id) { if (id === 1) return 2; if (id === 7 || (id >= 40 && id <= 43) || id === 12 || id === 11) return 0; if (id === 10) return 10; return id; }
  onBreak() {}
  onDeath(a) {
    const m = this.m;
    a.lives = Math.max(0, (a.lives ?? 1) - 1);
    if (a.lives > 0 && this.respawnsOn) {
      a.respawnT = 5;
      if (a.local) m.emit({ t: 'notice', text: a.lives === 1 ? t('finalLife') : t('livesLeft', { n: a.lives }), cls: 'bad' });
      return;
    }
    a.eliminated = true; a.lives = 0;
    a.rank = m.actors.filter((o) => o !== a && !o.eliminated).length + 1;
  }
  respawn(a) {
    const m = this.m, w = m.world, s = a.spawn, x = Math.floor(s.x), y = Math.floor(s.y), z = Math.floor(s.z);
    if (a.botRef) { const b = a.botRef; b.path = null; b.bridge = null; b.buildPlan = null; b.mineTarget = null; b.fallRoll = null; }
    if (!w.get(x, y - 1, z)) { const wool = TEAM_COLORS[(s.group ?? 0) % TEAM_COLORS.length].wool; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!w.get(x + dx, y - 1, z + dz)) w.set(x + dx, y - 1, z + dz, wool, 1); }
    for (let yy = y; yy <= y + 1; yy++) if (w.get(x, yy, z) && BLOCKS[w.get(x, yy, z)].solid) w.set(x, yy, z, 0);
    spawnAt(a, s, 3);
    kit(a, [[100, 1], [5, 16]]);
    m.emit({ t: 'respawn', a });
  }
  hud(me) {
    const i = this.info(), lines = [{ text: t('alive', { n: i.alive }), b: true }];
    if (me.lives != null) lines.push({ text: `${t('lives')}: ${'❤'.repeat(me.lives)}${'♡'.repeat(Math.max(0, 3 - me.lives))}`, cls: me.lives === 1 ? 'warn' : '' });
    if (i.refillIn > 0) lines.push({ text: t('refillIn', { t: clock(i.refillIn) }) });
    lines.push(i.rising ? { text: t('voidRise'), cls: 'warn' } : i.borderIn > 0 ? { text: t('borderIn', { t: clock(i.borderIn) }) } : { text: t('borderNow'), cls: 'warn' });
    return { lines };
  }
  result(me) {
    const m = this.m, win = m.over && m.winner === me, total = m.actors.length;
    const rank = win ? 1 : me.rank || m.actors.filter((a) => !a.eliminated).length;
    return { win, rank, total, sub: t('placeOf', { n: rank, m: total }) };
  }
  winnerText(w) { return w ? t('winnerIs', { name: w.name }) : t('gameOver'); }
  info() { const m = this.m; return { rising: !!this.rising, alive: m.actors.filter((a) => !a.eliminated).length, total: m.actors.length, refillIn: this.refilled ? 0 : Math.max(0, this.refillAt - m.time), borderIn: Math.max(0, this.borderAt - m.time), border: this.border }; }
}
