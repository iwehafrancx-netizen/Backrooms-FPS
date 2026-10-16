import { PLACED } from '../maps/common.js';
import { TEAM_COLORS } from '../../engine/blocks.js';
import { t } from '../../i18n/strings.js';
import { clock, teamName, teamColor, teamResult, kit, spawnAt } from './common.js';

const inGoal = (g, a) => Math.floor(a.pos.x) >= g.x0 && Math.floor(a.pos.x) <= g.x1 && Math.floor(a.pos.z) >= g.z0 && Math.floor(a.pos.z) <= g.z1 && a.pos.y < g.y + 0.95 && a.pos.y > g.y - 4;

export class BridgeBattle {
  constructor() { this.id = 'bridge'; this.dropsOnDeath = false; this.target = 5; this.timeLimit = 600; this.freezeT = 0; }
  attach(m) { this.m = m; this.teams = m.map.teams.map((tm) => ({ ...tm, score: 0 })); this.radius = m.map.radius; }
  setup(actors) { const n = [0, 0]; for (const a of actors) { a.slot = n[a.team]++; this.respawnAt(a); } this.freezeT = 0; }
  respawnAt(a) {
    const tm = this.teams[a.team], s = tm.spawns[a.slot % tm.spawns.length];
    spawnAt(a, s, 1.5);
    kit(a, [[101, 1], [110, 1], [TEAM_COLORS[a.team].wool, 64], [130, 2]]);
    a.home = { x: tm.center.x, z: 0 };
  }
  start() {}
  resetRound() {
    for (const a of this.m.actors) { this.respawnAt(a); a.spawnProtect = 3.2; }
    this.freezeT = 3;
  }
  update(dt) {
    const m = this.m;
    if (this.freezeT > 0) {
      this.freezeT -= dt;
      for (const a of m.actors) { const s = this.teams[a.team].spawns[a.slot % 2]; a.pos.x = s.x; a.pos.z = s.z; if (a.pos.y < s.y) a.pos.y = s.y; a.vel.x = a.vel.z = 0; a.kb.x = a.kb.z = 0; }
      if (this.freezeT <= 0) m.emit({ t: 'notice', text: t('go'), cls: 'kill', sound: 'hi' });
      return;
    }
    for (const a of m.actors) {
      if (!a.alive) continue;
      for (const tm of this.teams) {
        if (!inGoal(tm.goal, a)) continue;
        if (tm.i === a.team) { this.respawnAt(a); continue; }
        const own = this.teams[a.team];
        own.score++; a.goals = (a.goals || 0) + 1;
        m.emit({ t: 'notice', text: t('goalScored', { name: a.name, team: teamName(a.team) }), cls: 'gold', sound: 'win', big: true, team: a.team });
        if (own.score >= this.target) { m.finish(a.team); return; }
        this.resetRound();
        return;
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
    if (this.freezeT > 0) return false;
    const T = this.m.map.top;
    if (y > T + 7 || y < T - 6) return false;
    for (const tm of this.teams) {
      const g = tm.goal;
      if (x >= g.x0 - 1 && x <= g.x1 + 1 && z >= g.z0 - 1 && z <= g.z1 + 1 && y >= g.y - 4) return false;
      for (const s of tm.spawns) if (Math.abs(x + 0.5 - s.x) < 2 && Math.abs(z + 0.5 - s.z) < 2) return false;
    }
    return Math.abs(z) < 22;
  }
  dropFor(id) { return id; }
  onBreak() {}
  onDeath(a) { a.respawnT = 0.6; }
  respawn(a) { this.respawnAt(a); this.m.emit({ t: 'respawn', a }); }
  hud() {
    const lines = [{ text: clock(this.timeLimit - this.m.time) }];
    if (this.freezeT > 0) lines.push({ text: t('roundStarts', { n: Math.ceil(this.freezeT) }), cls: 'gold' });
    return { lines, chips: this.teams.map((tm) => ({ color: teamColor(tm.i), label: `${tm.score}/${this.target}`, big: true })) };
  }
  result(me) { const r = teamResult(this.m, me, `${this.teams[0].score} - ${this.teams[1].score}`); r.coins = (me.goals || 0) * 15; r.xp = (me.goals || 0) * 25; return r; }
  winnerText(w) { return w == null ? t('draw') : t('teamWins', { team: teamName(w) }); }
  startTitle(me) { return t('yourTeam', { team: teamName(me.team) }); }
  startSub() { return t('bridgeGoal', { n: this.target }); }
  botEngage(bot, ne) { const a = bot.a; if (bot.role === 'defend') return true; return ne.d < 4 || this.m.time - a.lastHurt < 2.5; }
  botPlan(bot, dt) {
    const a = bot.a, m = this.m, ctl = bot.ctlObj;
    if (this.freezeT > 0) return ctl;
    if (!bot.role) bot.role = a.slot === 0 ? 'attack' : Math.random() < 0.5 ? 'defend' : 'attack';
    const own = this.teams[a.team], foe = this.teams[1 - a.team], T = m.map.top;
    if (bot.role === 'defend') {
      const gx = own.goal.x + Math.sign(-own.goal.x) * 3;
      if (Math.hypot(a.pos.x - gx - 0.5, a.pos.z - 0.5) > 2.5) bot.goTo(gx, T + 1, 0, dt, 1, false); else { ctl.mx = ctl.mz = 0; bot.aimAt(0, T + 1.6, 0, dt * 0.4); }
      return ctl;
    }
    const g = foe.goal, side = Math.sign(g.x), ex = g.x - side * 3;
    const d = Math.hypot(a.pos.x - g.x - 0.5, a.pos.z - 0.5);
    if (d < 4.5 && Math.abs(a.pos.y - (T + 1)) < 1.5) { bot.steer(g.x + 0.5, 0.5, dt, true, true); if (a.onGround && d > 2) ctl.jump = true; return ctl; }
    bot.goTo(ex, T + 1, 0, dt, 1);
    return ctl;
  }
}
