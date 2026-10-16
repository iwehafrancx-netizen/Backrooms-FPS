import { PLACED } from '../maps/common.js';
import { TEAM_COLORS } from '../../engine/blocks.js';
import { groundBelow } from '../nav.js';
import { t } from '../../i18n/strings.js';
import { clock, teamName, teamColor, teamResult, kit, spawnAt } from './common.js';

const near = (a, p, r = 1.4, h = 2.2) => Math.hypot(a.pos.x - p.x - 0.5, a.pos.z - p.z - 0.5) < r && Math.abs(a.pos.y - p.y) < h;

export class CaptureFlag {
  constructor() { this.id = 'ctf'; this.dropsOnDeath = false; this.target = 3; this.timeLimit = 480; }
  attach(m) {
    this.m = m; this.radius = m.map.radius;
    this.teams = m.map.teams.map((tm) => ({ ...tm, score: 0, flag: { team: tm.i, state: 'home', x: tm.stand.x, y: tm.stand.y, z: tm.stand.z, carrier: null, dropT: 0 } }));
    this.flags = this.teams.map((tm) => tm.flag);
  }
  setup(actors) { const n = [0, 0]; for (const a of actors) { a.slot = n[a.team]++; this.respawnAt(a); } }
  respawnAt(a) {
    const tm = this.teams[a.team], s = tm.spawns[a.slot % tm.spawns.length];
    spawnAt(a, s, 3);
    a.respawnCount = (a.respawnCount || 0) + 1;
    kit(a, [[101, 1], [110, 1], [TEAM_COLORS[a.team].wool, 32], [130, 1]]);
    a.carrying = null; a.speedMul = 1; a.home = { x: tm.stand.x + 0.5, z: tm.stand.z + 0.5 + (tm.i ? 0 : 0) };
  }
  start() {}
  notice(text, cls, sound) { this.m.emit({ t: 'notice', text, cls, sound }); }
  home(f) { f.state = 'home'; f.carrier = null; f.x = this.teams[f.team].stand.x; f.y = this.teams[f.team].stand.y; f.z = this.teams[f.team].stand.z; }
  drop(f, a) {
    f.state = 'dropped'; f.carrier = null; f.dropT = 15;
    const g = groundBelow(this.m.world, Math.floor(a.pos.x), Math.floor(a.pos.y + 0.5), Math.floor(a.pos.z), 12);
    if (g == null || a.pos.y < this.m.map.voidY + 2) { this.home(f); this.notice(t('flagReturned', { team: teamName(f.team) }), '', 'beep'); return; }
    f.x = Math.floor(a.pos.x); f.y = g; f.z = Math.floor(a.pos.z);
    a.carrying = null; a.speedMul = 1;
    this.notice(t('flagDropped', { team: teamName(f.team) }), '', 'beep');
  }
  update(dt) {
    const m = this.m;
    for (const f of this.flags) {
      if (f.state === 'carried') {
        const c = f.carrier;
        if (!c.alive) { this.drop(f, c); continue; }
        f.x = c.pos.x - 0.5; f.y = c.pos.y; f.z = c.pos.z - 0.5;
        const own = this.teams[c.team];
        if (own.flag.state === 'home' && near(c, own.stand, 1.8, 2.5)) {
          own.score++; c.caps = (c.caps || 0) + 1;
          c.carrying = null; c.speedMul = 1; this.home(f);
          m.emit({ t: 'notice', text: t('flagCaptured', { team: teamName(c.team), name: c.name }), cls: 'gold', sound: 'win', big: true, team: c.team });
          if (own.score >= this.target) m.finish(c.team);
        }
      } else if (f.state === 'dropped') {
        f.dropT -= dt;
        if (f.dropT <= 0) { this.home(f); this.notice(t('flagReturned', { team: teamName(f.team) }), '', 'beep'); }
      }
    }
    for (const a of m.actors) {
      if (!a.alive || a.spawnProtect > 2.5) continue;
      for (const f of this.flags) {
        if (f.state === 'carried') continue;
        if (!near(a, { x: f.x, y: f.y, z: f.z })) continue;
        if (f.team !== a.team && !a.carrying) {
          f.state = 'carried'; f.carrier = a; a.carrying = f; a.speedMul = 1;
          m.emit({ t: 'notice', text: t('flagTaken', { team: teamName(f.team), name: a.name }), cls: 'bad', sound: 'egg', team: f.team });
        } else if (f.team === a.team && f.state === 'dropped') { this.home(f); this.notice(t('flagReturned', { team: teamName(f.team) }), '', 'beep'); }
      }
    }
    if (m.time >= this.timeLimit && !m.over) {
      const [x, y] = this.teams, k = (i) => m.actors.filter((o) => o.team === i).reduce((q, o) => q + o.kills, 0);
      const d = x.score - y.score || k(0) - k(1);
      m.finish(d === 0 ? null : d > 0 ? 0 : 1);
    }
  }
  canBreak(a, x, y, z) { return this.m.world.flag(x, y, z) === PLACED; }
  canPlace(a, x, y, z) {
    for (const tm of this.teams) { if (Math.abs(x - tm.stand.x) <= 1 && Math.abs(z - tm.stand.z) <= 1 && y >= tm.stand.y - 1 && y <= tm.stand.y + 2) return false; for (const s of tm.spawns) if (Math.abs(x + 0.5 - s.x) < 1 && Math.abs(z + 0.5 - s.z) < 1 && Math.abs(y - s.y) < 2) return false; }
    return y > 3 && Math.abs(x) < 96 && Math.abs(z) < 64;
  }
  dropFor(id) { return id; }
  onBreak() {}
  onDeath(a) { if (a.carrying) this.drop(a.carrying, a); a.respawnT = 5; this.m.emit({ t: 'respawning', a }); }
  respawn(a) { this.respawnAt(a); this.m.emit({ t: 'respawn', a }); }
  hud(me) {
    const lines = [{ text: clock(this.timeLimit - this.m.time) }];
    if (me.carrying) lines.push({ text: t('youHaveFlag'), cls: 'gold' });
    const mine = this.teams[me.team].flag;
    if (mine.state === 'carried') lines.push({ text: t('yourFlagTaken'), cls: 'warn' });
    return { lines, chips: this.teams.map((tm) => ({ color: teamColor(tm.i), icon: tm.flag.state === 'home' ? 'flag' : 'flagGone', label: String(tm.score), big: true, mine: tm.i === me.team })) };
  }
  result(me) { const r = teamResult(this.m, me, `${this.teams[0].score} - ${this.teams[1].score}`); r.coins = (me.caps || 0) * 20; r.xp = (me.caps || 0) * 30; return r; }
  winnerText(w) { return w == null ? t('draw') : t('teamWins', { team: teamName(w) }); }
  startTitle(me) { return t('yourTeam', { team: teamName(me.team) }); }
  startSub() { return t('ctfGoal', { n: this.target }); }
  botEngage(bot, ne) {
    const a = bot.a;
    if (a.carrying) return ne.d < 2.5;
    if (ne.o.carrying && ne.o.carrying.team === a.team) return true;
    const hurt = this.m.time - a.lastHurt < 2.5;
    if (bot.role === 'attack') return hurt || (ne.d < 3 && bot.brave > 0.65) || bot.dist(this.teams[1 - a.team].stand) < 14;
    const st = this.teams[a.team].stand;
    return hurt || Math.hypot(ne.o.pos.x - st.x, ne.o.pos.z - st.z) < 18;
  }
  botPlan(bot, dt) {
    const a = bot.a, m = this.m, ctl = bot.ctlObj;
    const own = this.teams[a.team], foe = this.teams[1 - a.team];
    if (!bot.role) bot.role = a.slot === 0 ? 'defend' : 'attack';
    const go = (x, y, z, near = 1) => { const g = groundBelow(m.world, Math.floor(x), Math.floor(y) + 1, Math.floor(z), 8); bot.goTo(Math.floor(x), g ?? Math.floor(y), Math.floor(z), dt, near); return ctl; };
    if (a.carrying) return go(own.stand.x, own.stand.y, own.stand.z, 0);
    if (own.flag.state === 'carried' && (bot.role === 'defend' || bot.dist(own.flag.carrier.pos) < 40)) { const c = own.flag.carrier; return go(c.pos.x, c.pos.y, c.pos.z, 1); }
    if (own.flag.state === 'dropped') return go(own.flag.x, own.flag.y, own.flag.z, 0);
    if (bot.role === 'defend') {
      if (bot.dist({ x: own.stand.x, y: own.stand.y, z: own.stand.z }) > 7) return go(own.stand.x, own.stand.y, own.stand.z + 2, 2);
      bot.wander(dt); return ctl;
    }
    if (foe.flag.state === 'carried') { const c = foe.flag.carrier; if (c.team === a.team) return go(c.pos.x, c.pos.y, c.pos.z, 2); }
    if (bot.routeAt !== a.respawnCount) { bot.routeAt = a.respawnCount; bot.route = a.slot === 1 || Math.random() < 0.3 ? null : { x: 0, y: m.map.top + 1, z: (a.slot % 2 ? 1 : -1) * (m.map.sideZ || 34) }; }
    if (bot.route) { if (bot.dist(bot.route) < 5 || (bot.path && !bot.pathReached && !bot.bridge)) bot.route = null; else return go(bot.route.x, bot.route.y, bot.route.z, 2); }
    return go(foe.flag.x, foe.flag.y, foe.flag.z, 0);
  }
}
