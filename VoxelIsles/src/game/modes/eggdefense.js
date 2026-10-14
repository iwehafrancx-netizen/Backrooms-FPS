import { TEAM_COLORS } from '../../engine/blocks.js';
import { ARMOR_ID, ITEMS } from '../items.js';
import { PLACED } from '../maps.js';
import { groundBelow } from '../nav.js';

export const SHOP = [
  { id: 'wool', cat: 'blocks', give: [['wool', 16]], cost: [170, 4] },
  { id: 'planks', cat: 'blocks', give: [[5, 16]], cost: [170, 10] },
  { id: 'stone', cat: 'blocks', give: [[3, 12]], cost: [171, 3] },
  { id: 'obsidian', cat: 'blocks', give: [[13, 2]], cost: [172, 2] },
  { id: 'stone_sword', cat: 'combat', give: [[101, 1]], cost: [170, 12] },
  { id: 'iron_sword', cat: 'combat', give: [[102, 1]], cost: [171, 6] },
  { id: 'diamond_sword', cat: 'combat', give: [[103, 1]], cost: [172, 4] },
  { id: 'chain_set', cat: 'armor', give: [0, 1, 2, 3].map((s) => [ARMOR_ID(1, s), 1]), cost: [170, 28] },
  { id: 'iron_set', cat: 'armor', give: [0, 1, 2, 3].map((s) => [ARMOR_ID(2, s), 1]), cost: [171, 14] },
  { id: 'diamond_set', cat: 'armor', give: [0, 1, 2, 3].map((s) => [ARMOR_ID(3, s), 1]), cost: [172, 8] },
  { id: 'stone_pick', cat: 'tools', give: [[111, 1]], cost: [170, 10] },
  { id: 'iron_pick', cat: 'tools', give: [[112, 1]], cost: [171, 4] },
  { id: 'shears', cat: 'tools', give: [[180, 1]], cost: [170, 16] },
  { id: 'gapple', cat: 'utility', give: [[130, 1]], cost: [171, 3] },
  { id: 'snowball', cat: 'utility', give: [[131, 4]], cost: [170, 6] },
  { id: 'orb', cat: 'utility', give: [[132, 1]], cost: [172, 3] },
];

export class EggDefense {
  constructor() { this.id = 'egg'; this.dropsOnDeath = false; this.suddenAt = 420; this.timeLimit = 600; }
  attach(m) {
    this.m = m; this.radius = m.map.radius; this.border = this.radius;
    this.teams = m.map.teams.map((t) => ({ ...t, eggAlive: true, out: false }));
    for (const g of m.map.gens) g.t = Math.random() * g.every;
    m.npcs = m.map.npcs;
  }
  setup(actors) {
    actors.forEach((a) => { this.respawnAt(a); a.home = this.teams[a.team].spawn; });
  }
  teamWool(a) { return TEAM_COLORS[a.team].wool; }
  kit(a) { a.inv.clear(); a.inv.add(100, 1); a.inv.add(110, 1); a.sel = 0; }
  respawnAt(a) {
    const t = this.teams[a.team], s = t.spawn;
    a.reset(); a.alive = true;
    a.pos.x = s.x + (Math.random() - 0.5) * 1.5; a.pos.y = s.y; a.pos.z = s.z + (Math.random() - 0.5) * 1.5;
    a.yaw = Math.atan2(s.x, s.z); a.pitch = -0.1;
    a.spawnProtect = 3; this.kit(a);
  }
  start() { this.m.emit({ t: 'eggstart' }); }
  update(dt) {
    const m = this.m;
    for (const g of m.map.gens) {
      g.t += dt;
      if (g.t < g.every) continue;
      g.t = 0;
      let near = 0;
      for (const d of m.drops) if (d.id === g.item && Math.abs(d.x - g.x - 0.5) < 1.5 && Math.abs(d.z - g.z - 0.5) < 1.5) near += d.count;
      if (near < g.cap) m.spawnDrop(g.item, 1, g.x + 0.5, g.y + 1.3, g.z + 0.5);
    }
    if (!this.sudden && m.time >= this.suddenAt) {
      this.sudden = true;
      for (const t of this.teams) if (t.eggAlive) this.breakEgg(t, null);
      m.emit({ t: 'sudden' });
    }
    for (const t of this.teams) {
      if (t.out) continue;
      const members = m.actors.filter((a) => a.team === t.i);
      if (!t.eggAlive && members.every((a) => !a.alive)) { t.out = true; m.emit({ t: 'teamout', team: t.i }); for (const a of members) a.rank = this.teams.filter((x) => !x.out).length + 1; }
    }
    const left = this.teams.filter((t) => !t.out);
    if (left.length <= 1 && !m.over) { for (const a of m.actors) if (left[0] && a.team === left[0].i) a.rank = 1; m.finish(left[0] ? left[0].i : null); }
    if (m.time >= this.timeLimit && !m.over) {
      const score = (t) => m.actors.filter((a) => a.team === t.i && a.alive).length * 100 + m.actors.filter((a) => a.team === t.i).reduce((s, a) => s + a.kills, 0);
      const best = left.sort((x, y) => score(y) - score(x))[0];
      m.finish(best ? best.i : null);
    }
  }
  breakEgg(t, by) {
    if (!t.eggAlive) return;
    t.eggAlive = false;
    if (this.m.world.get(t.egg.x, t.egg.y, t.egg.z) === 45) this.m.world.set(t.egg.x, t.egg.y, t.egg.z, 0);
    this.m.emit({ t: 'egg', team: t.i, by });
  }
  canBreak(a, x, y, z, id) {
    if (id === 45) { const t = this.teams.find((tt) => tt.egg.x === x && tt.egg.y === y && tt.egg.z === z); return !!t && t.i !== a.team && t.eggAlive; }
    return this.m.world.flag(x, y, z) === PLACED;
  }
  canPlace(a, x, y, z) {
    if (Math.hypot(x, z) > this.radius) return false;
    for (const t of this.teams) if (Math.abs(x - t.egg.x) <= 0 && Math.abs(z - t.egg.z) <= 0 && y >= t.egg.y && y <= t.egg.y) return false;
    for (const g of this.m.map.gens) if (x === g.x && z === g.z && y === g.y + 1) return false;
    return y > 2;
  }
  dropFor(id) { return id === 45 ? 0 : id; }
  onBreak(a, x, y, z, id) { if (id === 45) { const t = this.teams.find((tt) => tt.egg.x === x && tt.egg.y === y && tt.egg.z === z); if (t) this.breakEgg(t, a); } }
  onDeath(t, killer, cause) {
    const m = this.m;
    if (cause !== 'void') for (const it of t.inv.all()) if (ITEMS[it.id].kind === 'currency') m.spawnDrop(it.id, it.count, t.pos.x, t.pos.y + 0.8, t.pos.z, true);
    if (killer && killer.alive) for (const it of t.inv.all()) if (ITEMS[it.id].kind === 'currency' && cause === 'void') killer.inv.add(it.id, it.count);
    const team = this.teams[t.team];
    if (team.eggAlive) { t.respawnT = 5; m.emit({ t: 'respawning', a: t }); }
    else t.eliminated = true;
  }
  respawn(a) { if (!this.teams[a.team].eggAlive) return; this.respawnAt(a); this.m.emit({ t: 'respawn', a }); }
  canBuy(a, offer) { return a.inv.count(offer.cost[0]) >= offer.cost[1]; }
  buy(a, id) {
    const offer = SHOP.find((o) => o.id === id);
    if (!offer || !this.canBuy(a, offer)) return false;
    a.inv.take(offer.cost[0], offer.cost[1]);
    for (const [it, n] of offer.give) a.inv.add(it === 'wool' ? this.teamWool(a) : it, n);
    this.m.emit({ t: 'buy', a, id });
    return true;
  }
  nearShop(a) { return this.m.npcs.find((n) => n.team === a.team && Math.hypot(n.x - a.pos.x, n.z - a.pos.z) < 3.6 && Math.abs(n.y - a.pos.y) < 2); }
  info() { return { teams: this.teams.map((t) => ({ i: t.i, egg: t.eggAlive, out: t.out, alive: this.m.actors.filter((a) => a.team === t.i && a.alive).length })), suddenIn: Math.max(0, this.suddenAt - this.m.time) }; }

  botPlan(bot, dt) {
    const a = bot.a, m = this.m, ctl = bot.ctlObj, team = this.teams[a.team];
    if (!bot.role) bot.role = m.actors.filter((o) => o.team === a.team).indexOf(a) === 0 && Math.random() < 0.6 ? 'defend' : 'rush';
    const shop = this.nearShop(a);
    if (shop) this.botShop(bot);
    const iron = a.inv.count(170), gold = a.inv.count(171);
    const s0 = m.npcs.find((n) => n.team === a.team);
    const atHome = Math.hypot(team.spawn.x - a.pos.x, team.spawn.z - a.pos.z) < 11 && Math.abs(team.spawn.y - a.pos.y) < 3;
    const basics = a.inv.blocks() >= 16 && a.inv.slots.some((s) => s && s.id >= 101 && s.id <= 103);
    const canAfford = SHOP.some((o) => this.wanted(a, o.id) && this.canBuy(a, o));
    if (atHome && canAfford && !shop) { bot.goTo(Math.floor(s0.x), s0.y, Math.floor(s0.z), dt, 1, false); return ctl; }
    if (atHome && (!basics || (bot.role === 'defend' && !this.botGeared(a))) && m.time < 600) {
      const gen = m.map.gens.find((g) => g.team === a.team && g.item === (iron < 16 || gold >= 6 ? 170 : 171));
      if (gen && Math.hypot(gen.x + 0.5 - a.pos.x, gen.z + 0.5 - a.pos.z) > 0.6) { bot.steerOrPath(gen.x, gen.y + 1, gen.z, dt); return ctl; }
      ctl.mx = ctl.mz = 0; bot.aimAt(team.center.x, a.pos.y + 1, team.center.z, dt * 0.3);
      return ctl;
    }
    if (a.inv.blocks() < 4 && !atHome) { if (bot.giveUp(dt)) return ctl; }
    if (bot.role === 'defend' && team.eggAlive && m.time < 420) {
      const e = team.egg;
      if (bot.dist({ x: e.x, y: e.y, z: e.z }) > 4) bot.goTo(e.x, e.y - 1, e.z - 1, dt, 2, false);
      else bot.wander(dt);
      return ctl;
    }
    const targets = this.teams.filter((t) => t.i !== a.team && !t.out);
    if (!targets.length) return ctl;
    if (!bot.eggTarget || bot.eggTarget.out || (!bot.eggTarget.eggAlive && Math.random() < 0.01)) bot.eggTarget = targets.sort((x, y) => (y.eggAlive - x.eggAlive) || Math.hypot(x.egg.x - a.pos.x, x.egg.z - a.pos.z) - Math.hypot(y.egg.x - a.pos.x, y.egg.z - a.pos.z))[0];
    const t = bot.eggTarget;
    if (t.eggAlive) {
      const e = t.egg;
      const d = Math.hypot(e.x + 0.5 - a.pos.x, e.z + 0.5 - a.pos.z);
      if (d < 2.6 && Math.abs(e.y - a.pos.y) < 3) {
        ctl.mx = ctl.mz = 0;
        const err = bot.aimAt(e.x + 0.5, e.y + 0.5, e.z + 0.5, dt);
        if (err < 0.3) { ctl.attack = true; bot.selectKind('pick') || bot.selectKind('sword'); }
        const cover = this.coverOf(e);
        if (cover) { const err2 = bot.aimAt(cover.x + 0.5, cover.y + 0.5, cover.z + 0.5, dt); if (err2 < 0.3) ctl.attack = true; }
        return ctl;
      }
      const g = groundBelow(m.world, e.x + 1, e.y, e.z, 4) ?? e.y - 1;
      bot.goTo(e.x + 1, g, e.z, dt, 1);
      return ctl;
    }
    const prey = m.actors.filter((o) => o.alive && o.team === t.i).sort((x, y) => bot.dist(x.pos) - bot.dist(y.pos))[0];
    if (prey) { const c = { x: Math.floor(prey.pos.x), y: Math.floor(prey.pos.y), z: Math.floor(prey.pos.z) }; bot.goTo(c.x, groundBelow(m.world, c.x, c.y, c.z, 6) ?? c.y, c.z, dt, 1); }
    return ctl;
  }
  coverOf(e) {
    const w = this.m.world;
    for (const [dx, dy, dz] of [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) if (w.flag(e.x + dx, e.y + dy, e.z + dz) === PLACED) return { x: e.x + dx, y: e.y + dy, z: e.z + dz };
    return null;
  }
  wanted(a, id) {
    if (id === 'wool') return a.inv.blocks() < 24;
    if (id === 'stone_sword') return !a.inv.slots.some((s) => s && s.id >= 101 && s.id <= 103);
    if (id === 'iron_sword') return !a.inv.slots.some((s) => s && s.id >= 102 && s.id <= 103);
    if (id === 'diamond_sword') return !a.inv.slots.some((s) => s && s.id === 103);
    if (id === 'chain_set') return a.inv.armorPoints() < 12;
    if (id === 'iron_set') return a.inv.armorPoints() < 15;
    if (id === 'diamond_set') return a.inv.armorPoints() < 20;
    if (id === 'gapple') return a.inv.count(130) < 1;
    return false;
  }
  botGeared(a) { return a.inv.armorPoints() >= 12 && a.inv.best('sword') >= 0 && a.inv.slots.some((s) => s && s.id >= 101 && s.id <= 103); }
  botShop(bot) {
    const a = bot.a;
    for (const id of ['wool', 'stone_sword', 'iron_sword', 'diamond_sword', 'diamond_set', 'iron_set', 'chain_set', 'gapple']) if (this.wanted(a, id)) this.buy(a, id);
    bot.equip();
  }
}
