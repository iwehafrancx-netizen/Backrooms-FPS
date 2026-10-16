import { t } from '../../i18n/strings.js';
import { clock, kit, spawnAt } from './common.js';

export const fmtTime = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(2).padStart(5, '0')}`; };
export const starsFor = (time, par) => (time <= par ? 3 : time <= par * 1.4 ? 2 : 1);

export class Parkour {
  constructor(ctx = {}) {
    this.solo = !!ctx.solo; this.id = this.solo ? 'parkour' : 'race'; this.ctx = ctx;
    this.dropsOnDeath = false; this.noPvp = true; this.noFall = true; this.hideBar = true; this.timeLimit = this.solo ? 0 : 240;
  }
  attach(m) {
    this.m = m; const map = m.map; this.radius = map.radius;
    this.realVoid = map.voidY; map.voidY = -1000;
    const cps = map.checkpoints, r = map.route;
    this.cps = cps.map((c, k) => {
      const end = k + 1 < cps.length ? cps[k + 1].i : r.length;
      let lo = c.y;
      for (let i = c.i; i <= Math.min(end + 1, r.length - 1); i++) lo = Math.min(lo, r[i].y);
      return { ...c, fallY: lo - 5 };
    });
    let x0 = Infinity, x1 = -Infinity;
    for (const n of r) { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); }
    this.lowX0 = x0 - 8; this.low = new Float32Array(x1 - x0 + 17).fill(1e9);
    for (const n of r) for (let k = n.x - 6; k <= n.x + 6; k++) { const j = k - this.lowX0; if (j >= 0 && j < this.low.length) this.low[j] = Math.min(this.low[j], n.y - 5); }
    this.finishers = []; this.firstFinishT = 0;
  }
  fallY(a) { const j = Math.floor(a.pos.x) - this.lowX0; const v = j >= 0 && j < this.low.length ? this.low[j] : 1e9; return v < 1e8 ? Math.min(v, this.cps[a.cp].fallY) : this.cps[a.cp].fallY; }
  setup(actors) {
    const s = this.m.map.start;
    actors.forEach((a, i) => {
      const off = this.solo ? 0 : (i % 3 - 1) * 1.4, offx = this.solo ? 0 : -Math.floor(i / 3) * 1.3;
      spawnAt(a, { x: s.x + offx, y: s.y, z: s.z + off, yaw: s.yaw }, 0);
      kit(a, []); a.team = 0; a.cp = 0; a.finished = 0; a.finishT = 0; a.falls = 0; a.role = 'runner';
    });
  }
  allied() { return true; }
  start() { this.m.emit({ t: 'notice', text: t('runGo'), cls: 'kill', sound: 'hi' }); }
  toCheckpoint(a) {
    const c = this.cps[a.cp];
    a.pos.x = c.x; a.pos.y = c.y; a.pos.z = c.z; a.vel.x = a.vel.y = a.vel.z = 0;
    if (a.kb) { a.kb.x = a.kb.z = 0; }
    a.yaw = -Math.PI / 2; a.falls++;
    if (a._bot) { const b = a._bot; b.rI = c.i; b.waitT = 0.35 + Math.random() * 0.4; b.lastTight = false; b.slip = null; }
    if (a.local) this.m.emit({ t: 'cpback', a });
  }
  update(dt) {
    const m = this.m, w = m.world, fin = m.map.finish;
    for (const a of m.actors) {
      if (!a.alive || a.finished) continue;
      for (let k = a.cp + 1; k < this.cps.length; k++) {
        const c = this.cps[k];
        if (Math.abs(c.x - a.pos.x) < 1.6 && Math.abs(c.z - a.pos.z) < 1.6 && Math.abs(c.y - a.pos.y) < 1.2) {
          a.cp = k;
          if (a.local) m.emit({ t: 'notice', text: t('checkpointN', { n: k, total: this.cps.length - 1 }), cls: 'gold', sound: 'hi' });
        }
      }
      const at = w.get(Math.floor(a.pos.x), Math.floor(a.pos.y + 0.05), Math.floor(a.pos.z));
      const done = at === 59 || (a.pos.x >= fin.x - 0.2 && Math.abs(a.pos.y - fin.y) < 2 && Math.abs(a.pos.z - fin.z) < 3);
      if (!done && (a.pos.y < this.fallY(a) || a.pos.y < this.realVoid)) { this.toCheckpoint(a); continue; }
      if (done) {
        a.finished = this.finishers.length + 1; a.finishT = m.time; this.finishers.push(a); a.rank = a.finished;
        if (!this.firstFinishT) this.firstFinishT = m.time;
        if (this.solo) m.emit({ t: 'notice', text: fmtTime(m.time), cls: 'gold', sound: 'win', team: 0, big: true });
        else m.emit({ t: 'notice', text: t('finishedPlace', { name: a.name, n: a.finished }), cls: 'gold', sound: a.local ? 'win' : 'hi', team: a.local ? 0 : -1, big: !!a.local });
      }
    }
    if (m.over) return;
    if (this.solo) { if (this.finishers.length) m.finish(0); return; }
    const left = m.actors.some((a) => !a.finished);
    if (!left || m.time >= this.timeLimit || (this.firstFinishT && m.time - this.firstFinishT > 30)) m.finish(this.finishers.length ? 0 : -1);
  }
  canBreak() { return false; }
  canPlace() { return false; }
  dropFor() { return 0; }
  onBreak() {}
  onDeath(a) { a.alive = true; a.hp = a.maxHp; this.toCheckpoint(a); }
  respawn() {}
  standings() {
    return this.m.actors.slice().sort((p, q) => (p.finished && q.finished ? p.finished - q.finished : p.finished ? -1 : q.finished ? 1 : q.pos.x - p.pos.x));
  }
  place(me) { return this.standings().indexOf(me) + 1; }
  hudInCountdown = true;
  hud(me) {
    const m = this.m, total = this.cps.length - 1;
    const lines = [{ text: this.solo ? fmtTime(me.finished ? me.finishT : m.time) : clock(this.timeLimit - m.time), b: true }];
    if (this.solo) lines.unshift({ text: t('levelN', { n: m.map.level }), cls: 'gold' });
    else lines.push({ text: t('placeN', { n: this.place(me), total: m.actors.length }), cls: 'gold' });
    lines.push({ text: t('checkpointN', { n: me.cp, total }) });
    if (this.solo) lines.push({ text: `${t('par')} ${fmtTime(m.map.par)}` });
    return { lines };
  }
  result(me) {
    const m = this.m, L = m.map.level;
    if (this.solo) {
      const win = !!me.finished, time = me.finishT, stars = win ? starsFor(time, m.map.par) : 0;
      const pk = (this.ctx.save && this.ctx.save.parkour) || {}, prev = pk.best && pk.best[L], first = !(pk.stars && pk.stars[L]);
      const best = win && (!prev || time < prev);
      return {
        win, rank: 1, total: 1, stars, time, level: L, next: win && L < 10 ? L + 1 : 0,
        sub: win ? `${t('levelN', { n: L })} · ${fmtTime(time)}${best && prev ? ' · ' + t('newBest') : ''}` : t('levelN', { n: L }),
        coins: win ? stars * 6 + (first ? 20 : 0) : 0, xp: win ? L * 10 : 0,
        save: (d) => { if (!win) return; const p = (d.parkour = d.parkour || { best: {}, stars: {}, unlocked: 1 }); if (!p.best[L] || time < p.best[L]) p.best[L] = time; p.stars[L] = Math.max(p.stars[L] || 0, stars); p.unlocked = Math.max(p.unlocked || 1, Math.min(10, L + 1)); },
      };
    }
    const place = this.place(me), win = me.finished === 1;
    return { win, rank: place, total: m.actors.length, time: me.finished ? me.finishT : 0, sub: me.finished ? t('finishedPlace', { name: me.name, n: me.finished }) : t('placeN', { n: place, total: m.actors.length }), coins: Math.max(0, (7 - place) * 4) };
  }
  winnerText() { const f = this.finishers[0]; return f ? t('raceWinner', { name: f.name }) : t('gameOver'); }
  startTitle() { return this.solo ? t('levelN', { n: this.m.map.level }) : t('parkourRace'); }
  startSub() { return t('parkourHint'); }
  botPlan(bot, dt) {
    const a = bot.a, ctl = bot.ctlObj;
    a._bot = bot;
    if (a.finished) { ctl.mx = ctl.mz = 0; ctl.jump = false; return ctl; }
    if (bot.rI == null) { bot.rI = 0; bot.waitT = 0.1 + Math.random() * 0.8; }
    const before = bot.rI;
    bot.followRoute(this.m.map.route, dt);
    if (bot.rI !== before && Math.random() < (1 - bot.skill) * 0.55) bot.waitT = 0.15 + Math.random() * (0.9 - bot.skill * 0.5);
    return ctl;
  }
}
