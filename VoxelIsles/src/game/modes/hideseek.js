import { t } from '../../i18n/strings.js';
import { BLOCKS, isSolid } from '../../engine/blocks.js';
import { ITEMS } from '../items.js';
import { clock, kit, spawnAt } from './common.js';
import { groundBelow, standable } from '../nav.js';
import { eyeHeight } from '../physics.js';

export const HIDE = 4;
const SOLID_T = 3;

export class HideSeek {
  constructor(ctx = {}) {
    this.id = 'hideseek'; this.ctx = ctx; this.dropsOnDeath = false; this.noFall = true;
    this.hideT = 30; this.timeLimit = 270; this.phase = 'hide'; this.tauntCd = 10; this.pulseEvery = 20; this.pulseT = 0;
  }
  attach(m) { this.m = m; this.radius = m.map.radius; this.disguises = m.map.disguises.length ? m.map.disguises : [5, 73, 55, 4]; }
  setup(actors) {
    const first = !(this.ctx.save && this.ctx.save.played && this.ctx.save.played.hideseek);
    const pool = actors.filter((a) => a.bot || (!first && Math.random() < 0.12));
    const seekers = new Set();
    while (seekers.size < Math.min(2, pool.length)) seekers.add(pool[Math.floor(Math.random() * pool.length)]);
    let hi = 0, si = 0;
    for (const a of actors) {
      if (seekers.has(a)) this.makeSeeker(a, this.m.map.seekerSpawns[si++ % 12], false);
      else {
        a.role = 'hider'; a.team = 0;
        spawnAt(a, this.m.map.hiderSpawns[hi++ % 12], 0);
        kit(a, [[100, 1], [134, 1], [135, 1]]);
        a.disguise = this.disguises[Math.floor(Math.random() * this.disguises.length)];
        a.stillT = 0; a.solid = null; a.tauntCd = 4; a.taunts = 0; a.survived = false;
      }
      a.finds = 0; a.home = { x: a.pos.x, z: a.pos.z };
    }
  }
  makeSeeker(a, sp, announce = true) {
    this.unsolid(a);
    a.role = 'seeker'; a.team = 1; a.disguise = null; a.speedMul = 1.12;
    spawnAt(a, sp || this.m.map.seekerSpawns[Math.floor(Math.random() * 12)], announce ? 2 : 0);
    kit(a, [[102, 1]]);
    a.home = { x: a.pos.x, z: a.pos.z };
  }
  start() { this.phase = 'hide'; this.m.emit({ t: 'notice', text: t('hideNow', { n: this.hideT }), cls: 'gold', sound: 'hi' }); }
  allied(a, b) { return a.team === b.team; }
  frozen(a) {
    if (a.role === 'seeker' && this.phase === 'hide') return true;
    if (a.solid) return 'solid';
    return false;
  }
  solidify(a) {
    const w = this.m.world, x = Math.floor(a.pos.x), y = Math.floor(a.pos.y + 0.01), z = Math.floor(a.pos.z);
    if (w.get(x, y, z) || !isSolid(w.get(x, y - 1, z))) return false;
    if (this.m.actors.some((o) => o !== a && o.alive && Math.floor(o.pos.x) === x && Math.floor(o.pos.z) === z && Math.abs(o.pos.y - y) < 1.8)) return false;
    w.set(x, y, z, a.disguise, HIDE);
    a.solid = { x, y, z }; a.pos.x = x + 0.5; a.pos.y = y; a.pos.z = z + 0.5; a.vel.x = a.vel.y = a.vel.z = 0;
    if (a.local) this.m.emit({ t: 'notice', text: t('youAreSolid'), cls: 'gold' });
    return true;
  }
  unsolid(a) {
    if (!a.solid) return;
    const { x, y, z } = a.solid, w = this.m.world;
    if (w.flag(x, y, z) === HIDE) w.set(x, y, z, 0);
    a.solid = null; a.stillT = 0;
  }
  sees(a, c) {
    const e = a.eye(eyeHeight(a)), tx = c.x + 0.5, ty = c.y + 0.5, tz = c.z + 0.5, dx = tx - e.x, dy = ty - e.y, dz = tz - e.z, d = Math.hypot(dx, dy, dz) || 1;
    const hit = this.m.world.raycast(e.x, e.y, e.z, dx / d, dy / d, dz / d, d, (id, x, y, z) => isSolid(id) && !(x === c.x && y === c.y && z === c.z) && id !== 7 && id !== 82 && id !== 83);
    return !hit;
  }
  hiderAt(x, y, z) { return this.m.actors.find((o) => o.solid && o.solid.x === x && o.solid.y === y && o.solid.z === z); }
  update(dt) {
    const m = this.m;
    if (this.phase === 'hide' && m.time >= this.hideT) {
      this.phase = 'seek';
      m.emit({ t: 'notice', text: t('seekersReleased'), cls: 'bad', sound: 'lo', big: true });
    }
    for (const a of m.actors) {
      if (!a.alive || a.role !== 'hider') continue;
      a.tauntCd = Math.max(0, a.tauntCd - dt);
      a.revealT = Math.max(0, (a.revealT || 0) - dt);
      const c = a.lastCtl;
      const wants = c && (Math.abs(c.mx) > 0.05 || Math.abs(c.mz) > 0.05 || c.jump);
      if (a.solid) { if (wants) this.unsolid(a); continue; }
      if (!wants && a.onGround && a.moveAmt < 0.2) { a.stillT += dt; if (a.stillT >= SOLID_T) { if (!this.solidify(a)) a.stillT = SOLID_T - 0.5; } }
      else a.stillT = 0;
    }
    if (this.phase === 'seek') {
      const left = this.timeLimit - (m.time - this.hideT);
      if (left < 60) {
        this.pulseT -= dt;
        if (this.pulseT <= 0) {
          this.pulseT = this.pulseEvery;
          for (const h of m.actors.filter((o) => o.alive && o.role === 'hider')) { m.emit({ t: 'taunt', a: h, x: h.pos.x, y: h.pos.y, z: h.pos.z, pulse: true }); if (m.ai) m.ai.noise(h.pos.x, h.pos.y, h.pos.z, h, 2); }
        }
      }
      const hiders = m.actors.filter((o) => o.role === 'hider' && o.alive);
      if (!m.over && !hiders.length) m.finish(1);
      else if (!m.over && left <= 0) { for (const h of hiders) h.survived = true; m.finish(0); }
    }
  }
  onItem(a, held) {
    if (a.role !== 'hider') return false;
    if (held.id === 134) {
      if (a.tauntCd > 0) { if (a.local) this.m.emit({ t: 'notice', text: t('tauntCooling', { n: Math.ceil(a.tauntCd) }), cls: 'bad' }); return true; }
      a.tauntCd = this.tauntCd; a.taunts++;
      this.m.emit({ t: 'taunt', a, x: a.pos.x, y: a.pos.y, z: a.pos.z });
      if (this.m.ai) this.m.ai.noise(a.pos.x, a.pos.y, a.pos.z, a, 1.6);
      return true;
    }
    if (held.id === 135) {
      if (a.solid) return true;
      const i = this.disguises.indexOf(a.disguise);
      a.disguise = this.disguises[(i + 1) % this.disguises.length];
      if (a.local) this.m.emit({ t: 'notice', text: t('disguisedAs', { b: BLOCKS[a.disguise].name }), cls: 'gold' });
      return true;
    }
    return false;
  }
  onUse(a, bh) {
    if (a.role !== 'hider' || !bh || a.solid) return false;
    if (this.disguises.includes(bh.id) && bh.id !== a.disguise) { a.disguise = bh.id; if (a.local) this.m.emit({ t: 'notice', text: t('disguisedAs', { b: BLOCKS[a.disguise].name }), cls: 'gold' }); return true; }
    return false;
  }
  onBlockHit(a, bh) {
    if (a.role !== 'seeker' || this.phase !== 'seek') return false;
    if (this.m.world.flag(bh.x, bh.y, bh.z) !== HIDE) return false;
    const h = this.hiderAt(bh.x, bh.y, bh.z);
    if (!h) return false;
    this.unsolid(h); h.revealT = 2;
    const held = a.held(), dmg = held && ITEMS[held.id].damage ? ITEMS[held.id].damage : 1;
    if (a.attackCd <= 0) { a.attackCd = 0.4; a.swingT = 0.25; a.swingN++; this.m.damage(h, dmg, a, 'melee'); }
    if (h.alive) this.m.emit({ t: 'notice', text: t('hiderSpotted', { name: h.name }), cls: 'bad', sound: 'hi', team: -1 });
    return true;
  }
  canBreak() { return false; }
  canPlace() { return false; }
  dropFor() { return 0; }
  onBreak() {}
  onDeath(a, by) {
    if (a.role === 'hider') {
      this.unsolid(a);
      if (by && by.role === 'seeker') by.finds = (by.finds || 0) + 1;
      a.wasHider = true; a.foundAt = this.m.time;
      this.m.emit({ t: 'notice', text: t('hiderFound', { name: a.name }), cls: 'kill', sound: 'hi' });
      a.role = 'seeker'; a.team = 1; a.disguise = null;
    }
    a.respawnT = 3;
  }
  respawn(a) { this.makeSeeker(a); this.m.emit({ t: 'respawn', a }); if (a.local && a.wasHider) this.m.emit({ t: 'notice', text: t('nowSeeker'), cls: 'bad', big: true, team: -1 }); }
  hudInCountdown = true;
  hud(me) {
    const m = this.m, hiders = m.actors.filter((o) => o.role === 'hider' && o.alive).length;
    const lines = [];
    if (this.phase === 'hide') lines.push({ text: t('seekersIn', { t: clock(this.hideT - m.time) }), b: true, cls: 'gold' });
    else lines.push({ text: clock(this.timeLimit - (m.time - this.hideT)), b: true });
    lines.push({ text: t('hidersLeft', { n: hiders }) });
    if (me.role === 'hider') {
      lines.unshift({ text: t('youHide'), cls: 'gold' });
      lines.push({ text: `${t('disguise')}: ${BLOCKS[me.disguise].name}` });
      lines.push(me.solid ? { text: t('solidNow'), cls: 'gold' } : { text: `${t('solidIn')} ${'●'.repeat(Math.floor((me.stillT / SOLID_T) * 5))}${'○'.repeat(5 - Math.floor((me.stillT / SOLID_T) * 5))}` });
      lines.push({ text: me.tauntCd > 0 ? `${t('taunt')}: ${Math.ceil(me.tauntCd)}s` : `${t('taunt')}: ${t('ready')}`, cls: me.tauntCd > 0 ? '' : 'gold' });
    } else lines.unshift({ text: t('youSeek'), cls: 'warn' });
    return { lines, blind: me.role === 'seeker' && this.phase === 'hide' };
  }
  result(me) {
    const m = this.m;
    if (me.wasHider || me.role === 'hider') {
      const win = me.role === 'hider' && me.alive && m.winner === 0;
      return { win, rank: win ? 1 : 2, total: 2, sub: win ? t('youSurvived') : t('youWereFound'), coins: (win ? 30 : 0) + (me.taunts || 0) * 5 + (me.finds || 0) * 8, xp: (me.taunts || 0) * 5, save: (d) => { d.played = d.played || {}; d.played.hideseek = (d.played.hideseek || 0) + 1; } };
    }
    const win = m.winner === 1;
    return { win, rank: win ? 1 : 2, total: 2, sub: win ? t('allFound') : t('hidersSurvived'), coins: (me.finds || 0) * 10, xp: (me.finds || 0) * 10, save: (d) => { d.played = d.played || {}; d.played.hideseek = (d.played.hideseek || 0) + 1; } };
  }
  winnerText(w) { return w === 1 ? t('seekersWin') : t('hidersWin'); }
  startTitle(me) { return me.role === 'hider' ? t('youHide') : t('youSeek'); }
  startSub(me) { return me.role === 'hider' ? t('hideHint') : t('seekHint'); }
  botEngage(bot, ne) {
    const a = bot.a, o = ne.o;
    if (a.role === 'hider') return ne.d < 2.6 && this.m.time - (a.lastHurt || -99) < 2;
    if (this.phase !== 'seek') return false;
    return !o.solid && (o.revealT > 0 || o.moveAmt > 0.6 || ne.d < 1.8 || o === bot.chase);
  }
  botPlan(bot, dt) {
    const a = bot.a, ctl = bot.ctlObj;
    if (a.role === 'hider') return this.planHider(bot, dt);
    if (this.phase === 'hide') { bot.idleLook(dt); return ctl; }
    return this.planSeeker(bot, dt);
  }
  scoreSpot(x, y, z, id) {
    const w = this.m.world;
    let same = 0, walls = 0;
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]]) { const b = w.get(x + dx, y + dy, z + dz); if (b === id) same++; if (isSolid(b)) walls++; }
    let near = 0;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) for (let dy = 0; dy <= 1; dy++) if (w.get(x + dx, y + dy, z + dz) === id) near++;
    return same * 3 + near * 0.6 + walls * 0.8;
  }
  pickSpot(bot) {
    const a = bot.a, cells = this.m.map.cells, w = this.m.world;
    let best = null, bs = -1;
    for (let k = 0; k < 70; k++) {
      const [x, y, z] = cells[Math.floor(Math.random() * cells.length)];
      if (w.get(x, y, z) || this.m.actors.some((o) => o !== a && o.solid && o.solid.x === x && o.solid.z === z)) continue;
      if (Math.hypot(x - a.pos.x, z - a.pos.z) > 42) continue;
      for (const id of this.disguises) {
        const s = this.scoreSpot(x, y, z, id) + Math.random() * 2 - (bot.avoid ? Math.max(0, 8 - Math.hypot(x - bot.avoid.x, z - bot.avoid.z)) : 0);
        if (s > bs) { bs = s; best = { x, y, z, id }; }
      }
    }
    return best;
  }
  planHider(bot, dt) {
    const a = bot.a, ctl = bot.ctlObj, m = this.m;
    const seeker = m.actors.filter((o) => o.alive && o.role === 'seeker').map((o) => ({ o, d: Math.hypot(o.pos.x - a.pos.x, o.pos.z - a.pos.z) })).sort((p, q) => p.d - q.d)[0];
    const threatened = seeker && this.phase === 'seek' && (a.revealT > 0 || (seeker.d < 1.8 && Math.random() < (0.35 - bot.skill * 0.25) * dt));
    if (threatened && !bot.fleeing) { bot.fleeing = 3 + Math.random() * 2; bot.hs = null; bot.avoid = { x: seeker.o.pos.x, z: seeker.o.pos.z }; }
    if (bot.fleeing > 0) {
      bot.fleeing -= dt;
      const dx = a.pos.x - seeker.o.pos.x, dz = a.pos.z - seeker.o.pos.z, d = Math.hypot(dx, dz) || 1;
      bot.steer(a.pos.x + (dx / d) * 6, a.pos.z + (dz / d) * 6, dt, true);
      if (a.blocked && a.onGround) ctl.jump = true;
      if (bot.fleeing <= 0) bot.fleeing = 0;
      return ctl;
    }
    if (!bot.hs) { bot.hs = this.pickSpot(bot); bot.hsT = 0; if (bot.hs && !a.solid) a.disguise = bot.hs.id; }
    const s = bot.hs;
    if (!s) { bot.wander(dt); return ctl; }
    bot.hsT += dt;
    const d = Math.hypot(s.x + 0.5 - a.pos.x, s.z + 0.5 - a.pos.z);
    if (d > 0.35 || Math.abs(a.pos.y - s.y) > 0.6) {
      if (a.solid) return ctl;
      if (bot.hsT > 25 || m.world.get(s.x, s.y, s.z)) { bot.hs = null; return ctl; }
      if (d < 2.5 && Math.abs(a.pos.y - s.y) < 0.6) bot.steer(s.x + 0.5, s.z + 0.5, dt, false, true); else bot.goTo(s.x, s.y, s.z, dt, 0, false);
      return ctl;
    }
    ctl.mx = ctl.mz = 0;
    if (a.solid && a.tauntCd <= 0 && (!seeker || seeker.d > 16) && this.phase === 'seek' && Math.random() < 0.003 * (bot.brain.p.tbag + 0.3)) this.onItem(a, { id: 134 });
    bot.idleLook(dt);
    return ctl;
  }
  planSeeker(bot, dt) {
    const a = bot.a, ctl = bot.ctlObj, m = this.m, w = m.world;
    if (bot.chase && (!bot.chase.alive || bot.chase.solid || bot.chase.role !== 'hider')) bot.chase = null;
    if (bot.probe) {
      const p = bot.probe, d = Math.hypot(p.x + 0.5 - a.pos.x, p.z + 0.5 - a.pos.z);
      if (w.get(p.x, p.y, p.z) !== p.id || (bot.probeT += dt) > 8) { bot.probe = null; return ctl; }
      if (d > 2.6) { const g = groundBelow(w, p.x + 1, p.y + 1, p.z, 4) ?? p.y; bot.goTo(p.x + 1, g, p.z, dt, 1, false); return ctl; }
      ctl.mx = ctl.mz = 0;
      bot.selectKind('sword');
      const err = bot.aimAt(p.x + 0.5, p.y + 0.5, p.z + 0.5, dt);
      if (err < 0.3 && a.attackCd <= 0) { ctl.attack = true; ctl.attackPressed = true; bot.probeHits = (bot.probeHits || 0) + 1; if (bot.probeHits > 2) { bot.probe = null; bot.probeHits = 0; } }
      return ctl;
    }
    bot.scanT = (bot.scanT || 0) - dt;
    if (bot.scanT <= 0) {
      bot.scanT = 0.4;
      for (const h of m.actors) {
        if (!h.alive || h.role !== 'hider' || !h.solid) continue;
        const d = Math.hypot(h.pos.x - a.pos.x, h.pos.z - a.pos.z);
        if (d > 9 || !this.sees(a, h.solid)) continue;
        const same = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]].reduce((n, [dx, dy, dz]) => n + (w.get(h.solid.x + dx, h.solid.y + dy, h.solid.z + dz) === h.disguise ? 1 : 0), 0);
        const sus = same === 0 ? 1 : same === 1 ? 0.45 : 0.18;
        const p = (0.055 + bot.skill * 0.11) * sus * (d < 4 ? 1.6 : 1);
        if (Math.random() < p) { bot.probe = { ...h.solid, id: h.disguise }; bot.probeT = 0; return ctl; }
      }
      if (Math.random() < 0.06) {
        const c = { x: Math.floor(a.pos.x), y: Math.floor(a.pos.y), z: Math.floor(a.pos.z) };
        for (let k = 0; k < 12; k++) { const x = c.x + Math.floor(Math.random() * 9) - 4, z = c.z + Math.floor(Math.random() * 9) - 4, y = c.y + (Math.random() < 0.5 ? 0 : 1); const id = w.get(x, y, z); if (id && this.disguises.includes(id)) { bot.probe = { x, y, z, id }; bot.probeT = 0; break; } }
      }
    }
    const rec = bot.brain.remembered();
    if (rec && bot.brain.W.time - rec.timeLastSensed < 8) {
      const p = rec.lastSensedPosition, d = Math.hypot(p.x - a.pos.x, p.z - a.pos.z);
      if (d > 3) { const c = { x: Math.floor(p.x), z: Math.floor(p.z) }; const g = groundBelow(w, c.x, Math.floor(p.y) + 2, c.z, 5) ?? Math.floor(p.y); bot.goTo(c.x, g, c.z, dt, 2, false); return ctl; }
    }
    if (!bot.zone || Math.hypot(bot.zone.x - a.pos.x, bot.zone.z - a.pos.z) < 3 || (bot.zoneT += dt) > 22) {
      bot.visited = bot.visited || new Set();
      if (bot.zone) bot.visited.add(bot.zone.k);
      const zones = [];
      for (let zx = -48; zx <= 48; zx += 12) for (let zz = -48; zz <= 48; zz += 12) { const k = `${zx},${zz}`; if (Math.hypot(zx, zz) < 52 && !bot.visited.has(k)) zones.push({ x: zx, z: zz, k }); }
      if (!zones.length) { bot.visited.clear(); return ctl; }
      zones.sort((p, q) => Math.hypot(p.x - a.pos.x, p.z - a.pos.z) - Math.hypot(q.x - a.pos.x, q.z - a.pos.z));
      const z = zones[Math.min(zones.length - 1, Math.floor(Math.random() * 2.5))];
      const y = groundBelow(w, z.x, m.map.top + 6, z.z, 8);
      let tx = z.x, tz = z.z;
      if (y == null || !standable(w, tx, y, tz)) { const cs = m.map.cells.filter(([cx, , cz]) => Math.abs(cx - z.x) < 6 && Math.abs(cz - z.z) < 6); if (cs.length) { const c = cs[Math.floor(Math.random() * cs.length)]; tx = c[0]; tz = c[2]; } }
      bot.zone = { x: tx, z: tz, y: groundBelow(w, tx, m.map.top + 6, tz, 8) ?? m.map.top + 1, k: z.k }; bot.zoneT = 0;
    }
    bot.goTo(bot.zone.x, bot.zone.y, bot.zone.z, dt, 1, false);
    return ctl;
  }
}
