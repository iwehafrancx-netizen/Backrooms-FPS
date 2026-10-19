import { t } from '../../i18n/strings.js';
import { clock, kit, spawnAt } from './common.js';

const TRAP_ON = { dropfloor: 0, lava: 66, door: 47, pillars: 0 };
const DUR = { dropfloor: 2.4, lava: 3, door: 3.5, pillars: 2.4 };

export class DeathRun {
  constructor(ctx = {}) { this.id = 'deathrun'; this.dropsOnDeath = false; this.noPvp = true; this.noFall = false; this.timeLimit = 300; this.cooldown = 7; this.ctx = ctx; }
  attach(m) { this.m = m; this.traps = m.map.traps.map((tr) => ({ ...tr, active: 0, cd: 0 })); this.radius = m.map.radius; this.finishers = []; }
  setup(actors) {
    const first = !(this.ctx.save && this.ctx.save.played && this.ctx.save.played.deathrun);
    const human = actors.findIndex((a) => !a.bot);
    let di = Math.floor(Math.random() * actors.length);
    if (human >= 0 && (first || Math.random() < 0.875) && di === human) di = (di + 1) % actors.length;
    this.death = actors[di];
    let k = 0;
    for (const a of actors) {
      a.team = a === this.death ? 1 : 0;
      if (a === this.death) { spawnAt(a, this.m.map.deathSpawn, 0); a.role = 'death'; }
      else { spawnAt(a, this.m.map.runnerSpawns[k++ % 8], 0); a.role = 'runner'; }
      kit(a, []); a.finished = 0;
      a.home = { x: a.pos.x, z: a.pos.z };
    }
  }
  allied() { return true; }
  start() { for (const [x, y, z] of this.m.map.gate) this.m.world.set(x, y, z, 0); this.m.emit({ t: 'notice', text: t('runGo'), cls: 'kill', sound: 'hi' }); }
  trigger(i, by) {
    const tr = this.traps[i];
    if (!tr || tr.cd > 0 || this.m.state !== 'play') return false;
    tr.active = DUR[tr.kind]; tr.cd = this.cooldown;
    const on = TRAP_ON[tr.kind];
    for (const [x, y, z] of tr.cells) this.m.world.set(x, y, z, on);
    this.m.emit({ t: 'trap', i, by, x: (tr.x0 + tr.x1) / 2, y: this.m.map.top, z: 0 });
    return true;
  }
  onUse(a, bh) {
    if (a !== this.death || bh.id !== 60) return false;
    const tr = this.traps.find((q) => q.button.x === bh.x && q.button.z === bh.z);
    if (tr) { if (!this.trigger(tr.i, a)) this.m.emit({ t: 'notice', text: t('trapCooling'), cls: 'bad' }); }
    return true;
  }
  update(dt) {
    const m = this.m, w = m.world;
    for (const tr of this.traps) {
      if (tr.cd > 0) tr.cd -= dt;
      if (tr.active > 0) { tr.active -= dt; if (tr.active <= 0) for (const [x, y, z, id] of tr.cells) w.set(x, y, z, id); }
    }
    for (const a of m.actors) {
      if (!a.alive || a.role !== 'runner' || a.finished) continue;
      const under = w.get(Math.floor(a.pos.x), Math.floor(a.pos.y - 0.05), Math.floor(a.pos.z));
      if (under === 66 && a.onGround) m.damage(a, 20, this.death, 'trap');
      const at = w.get(Math.floor(a.pos.x), Math.floor(a.pos.y + 0.05), Math.floor(a.pos.z));
      const fin = m.map.finish;
      if (at === 59 || (a.pos.x >= fin.x && Math.abs(a.pos.z) < 5 && Math.abs(a.pos.y - fin.y) < 3)) {
        a.finished = this.finishers.length + 1; this.finishers.push(a); a.rank = a.finished;
        m.emit({ t: 'notice', text: t('finishedPlace', { name: a.name, n: a.finished }), cls: 'gold', sound: a.local ? 'win' : 'hi', team: a.local ? 0 : -1, big: !!a.local });
        a.alive = false; a.eliminated = true;
      }
    }
    const runners = m.actors.filter((a) => a.role === 'runner');
    const running = runners.filter((a) => a.alive && !a.finished);
    if (!m.over && (!running.length || m.time >= this.timeLimit)) m.finish(this.finishers.length ? 0 : 1);
  }
  canBreak() { return false; }
  canPlace() { return false; }
  dropFor() { return 0; }
  onBreak() {}
  onDeath(a) { a.eliminated = true; if (a.role === 'runner') a.rank = 0; }
  respawn() {}
  hudInCountdown = true;
  hud(me) {
    const m = this.m, running = m.actors.filter((a) => a.role === 'runner' && a.alive && !a.finished).length;
    const lines = [{ text: clock(this.timeLimit - m.time) }, { text: t('runnersLeft', { n: running }), b: true }];
    if (me.role === 'death') {
      lines.unshift({ text: t('youAreDeath'), cls: 'warn' });
      const near = this.traps.filter((tr) => Math.abs(tr.button.x + 0.5 - me.pos.x) < 14).slice(0, 3);
      for (const tr of near) lines.push({ text: `${t('trap_' + tr.kind)}: ${tr.cd > 0 ? Math.ceil(tr.cd) + 's' : t('ready')}`, cls: tr.cd > 0 ? '' : 'gold' });
    } else if (me.finished) lines.push({ text: t('finishedPlace', { name: me.name, n: me.finished }), cls: 'gold' });
    return { lines };
  }
  result(me) {
    const m = this.m;
    if (me.role === 'death') { const win = this.finishers.length === 0; return { win, rank: win ? 1 : 2, total: 2, sub: win ? t('deathWins') : t('runnersEscaped', { n: this.finishers.length }), coins: m.actors.filter((a) => a.role === 'runner' && !a.finished).length * 4 }; }
    const win = !!me.finished;
    return { win, rank: win ? me.finished : m.actors.length, total: m.actors.length - 1, sub: win ? t('finishedPlace', { name: me.name, n: me.finished }) : t('youDidntMakeIt'), coins: win ? Math.max(0, 30 - me.finished * 5) : 0, save: (d) => { d.played = d.played || {}; d.played.deathrun = (d.played.deathrun || 0) + 1; } };
  }
  winnerText(w) { return w === 1 ? t('deathWins') : t('runnersWin'); }
  startTitle(me) { return me.role === 'death' ? t('youAreDeath') : t('youAreRunner'); }
  startSub(me) { return me.role === 'death' ? t('deathHint') : t('runnerHint'); }
  botPlan(bot, dt) {
    const a = bot.a, m = this.m, ctl = bot.ctlObj;
    if (a.role === 'runner') {
      if (bot.rI == null) { bot.rI = 0; bot.waitT = 0.3 + Math.random() * 3.2; }
      bot.followRoute(m.map.route, dt);
      return ctl;
    }
    const runners = m.actors.filter((o) => o.role === 'runner' && o.alive && !o.finished);
    if (!runners.length) { ctl.mx = ctl.mz = 0; return ctl; }
    const lead = runners.reduce((p, o) => (o.pos.x > p.pos.x ? o : p));
    const target = this.traps.find((tr) => tr.cd <= 0 && runners.some((o) => o.pos.x >= tr.x0 - 0.5 && o.pos.x <= tr.x1 + 1)) || this.traps.find((tr) => tr.x1 >= lead.pos.x - 2) || this.traps[this.traps.length - 1];
    const bx = target.button.x + 0.5, dx = bx - a.pos.x;
    if (Math.abs(dx) > 1.2) { ctl.mx = Math.sign(dx); ctl.mz = (m.map.lane.z + 0.5 - a.pos.z) * 0.8; ctl.sprint = Math.abs(dx) > 4; bot.lookToward(a.pos.x + Math.sign(dx) * 8, a.pos.y + 1.1, m.map.lane.z + 0.5, dt, 0.7); bot.pressT = 0; return ctl; }
    ctl.mx = ctl.mz = 0;
    bot.aimAt(bx, target.button.y + 0.1, target.button.z + 0.5, dt);
    const inZone = runners.filter((o) => o.pos.x >= target.x0 - 0.5 && o.pos.x <= target.x1 + 1).length;
    if (inZone && target.cd <= 0) { bot.pressT = (bot.pressT || 0) + dt; if (bot.pressT > 0.6 + (1 - bot.skill) * 1.2 + Math.random() * 0.6) { this.trigger(target.i, a); bot.pressT = 0; } }
    return ctl;
  }
}
