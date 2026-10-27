import { Bot } from '../game/bot.js';
import { HW, height } from '../game/physics.js';
import { packSnap, readSnap, r3, wrap } from './pack.js';

const now = () => performance.now();
const EXTRA = 0.15;
const invOf = (a) => a.inv.slots.map((s) => (s ? [s.id, s.count] : 0));
const setInv = (a, s, r) => { a.inv.slots = s.map((x) => (x ? { id: x[0], count: x[1] } : null)); a.inv.armor = r.slice(0, 4); };
const sigInv = (a) => a.inv.slots.map((s) => (s ? s.id * 100 + s.count : 0)).join() + '|' + a.inv.armor.join();
const sigChest = (c) => c.items.map((it) => it.id * 100 + it.count).join() + (c.looted ? 'L' : '');

export class NetGame {
  constructor(app, m, info) {
    this.app = app; this.m = m; this.net = info.net; this.mesh = info.mesh; this.chan = info.chan;
    this.myId = info.net.id; this.pid = info.ppl.map((p) => p.id || null); this.names = info.ppl.map((p) => p.name);
    this.meIdx = info.meIdx; this.me = m.actors[this.meIdx];
    this.hostId = info.host; this.backupId = info.backup; this.score = info.ppl.map((p) => p.s || 0);
    this.rem = []; this.buf = m.actors.map(() => []); this.seq = 0; this.inSeq = 0; this.tpSeq = 0; this.pend = []; this.actSeq = 0;
    this.clk = 0; this.off = null; this.jit = 0; this.delay = 0.1; this.lastSnap = 0; this.lastSeq = -1; this.full = null; this.sendT = 0; this.inT = 0; this.fullT = 0; this.chestT = 0;
    this.snapCount = 0; this.closed = false;
    m.net = this;
    this.mesh.onMsg = (p, msg) => this.onMsg(p, msg);
    this.mesh.onBin = (p, b) => this.onBin(p, b);
    this.mesh.onLost = (pid) => this.onLost(pid);
    this.mesh.onOpen = () => {};
    this.chan.on('host', (d) => this.onHostMsg(d));
    if (this.hostId === this.myId) this.becomeHost(false); else { m.replica = true; this.isHost = false; }
    for (const q of info.queue || []) this.onMsg(q.p, q.m);
    for (const b of info.bins || []) this.onBin(b.p, b.b);
    this.wantPeers();
  }

  humans() { return this.pid.filter((id) => id && id !== this.myId); }
  wantPeers() {
    if (this.closed) return;
    const ids = this.isHost || this.backupId === this.myId ? this.humans() : [this.hostId, this.backupId].filter((x) => x && x !== this.myId);
    this.mesh.want(ids);
  }
  idx(a) { return a ? this.m.actors.indexOf(a) : -1; }
  act(i) { return i >= 0 ? this.m.actors[i] || null : null; }
  online() { return 1 + this.humans().length; }
  ping() { return this.isHost ? 0 : Math.round(this.mesh.rtt(this.hostId)); }

  becomeHost(migrated) {
    const m = this.m;
    this.isHost = true; this.hostId = this.myId; m.replica = false;
    if (migrated && this.off != null) this.clk = now() / 1000 - this.off;
    this.blk = []; this.evq = []; this.known = new Set(m.drops.map((d) => d.key)); this.projSeen = new WeakSet(m.projectiles);
    this.chestSig = migrated ? m.map.chests.map(sigChest) : [];
    if (!this.wl) { this.wl = (x, y, z, id) => { if (this.isHost) this.blk.push(x, y, z, id, m.world.flag(x, y, z)); }; m.world.listeners.push(this.wl); }
    m.actors.forEach((a, i) => {
      if (i === this.meIdx) return;
      const id = this.pid[i];
      if (id && (!migrated || this.mesh.isOpen(id))) { a.remote = true; a.local = true; this.rem[i] = { in: null, seq: -1, tp: migrated ? null : 0, acc: now(), bad: 0, sig: '', ack: 0 }; a.ctl = () => this.rctl(i); }
      else if (migrated) { this.pid[i] = null; this.toBot(a); }
    });
    if (migrated) {
      this.buf = m.actors.map(() => []);
      const md = m.mode, f = this.full;
      if (f) { f.inv.forEach((x, i) => { const a = m.actors[i]; if (a && i !== this.meIdx && x) { setInv(a, x[0], x[1]); a.sel = x[2] || 0; } }); }
      md.borderWarned = md.borderWarned || m.time >= md.borderAt;
      if (md.rising) md.voidBase = md.voidBase ?? 2;
      if (m.state === 'over') m.over = true;
      this.pickBackup();
      this.announce();
    }
  }
  toBot(a) {
    a.remote = false;
    if (a.botRef) a.ctl = (dt) => a.botRef.tick(dt);
    else new Bot(a, this.m, 0.55);
  }
  pickBackup() {
    let best = null, bs = -1;
    this.pid.forEach((id, i) => { if (id && id !== this.myId && this.mesh.isOpen(id) && this.score[i] > bs) { bs = this.score[i]; best = id; } });
    if (!best) this.pid.forEach((id) => { if (!best && id && id !== this.myId) best = id; });
    this.backupId = best;
  }
  announce() {
    const d = { h: this.myId, b: this.backupId, pid: this.pid };
    this.mesh.sendAll({ t: 'host', ...d });
    try { this.chan.send('host', d); } catch (e) {}
    this.wantPeers();
  }
  onHostMsg(d) {
    if (!d || this.closed || d.h === this.myId) return;
    if (this.isHost) return;
    if (d.h !== this.hostId) this.lastSeq = -1;
    this.hostId = d.h; this.backupId = d.b;
    if (Array.isArray(d.pid)) this.pid = d.pid.map((x, i) => (x === undefined ? this.pid[i] : x));
    this.lost = 0;
    this.wantPeers();
  }

  rctl(i) {
    const r = this.rem[i] && this.rem[i].in;
    if (!r) return { mx: 0, mz: 0 };
    return { mx: 0, mz: 0, yaw: r.p[6], pitch: r.p[7], sel: r.s, sprint: !!(r.f & 2), crouch: !!(r.f & 1), useHeld: !!(r.f & 8), jump: false, attack: false, attackPressed: false, use: false };
  }
  remoteStep(a, dt, frozen) {
    const i = this.idx(a), R = this.rem[i], r = R && R.in;
    if (r && R.tp == null) R.tp = r.n;
    if (!r || r.n !== R.tp || frozen) { a.vel.x = a.vel.z = 0; a.moveAmt = 0; return { landed: 0 }; }
    const [x, y, z, vx, vy, vz] = r.p;
    const el = Math.max(0.05, (now() - R.acc) / 1000), dh = Math.hypot(x - a.pos.x, z - a.pos.z);
    if (dh > 12 * el + 2 || y - a.pos.y > 12 * el + 2.5) { if (++R.bad > 4) this.tp(a); return { landed: 0 }; }
    const h = height({ crouch: !!(r.f & 1) }) - 0.1;
    if (this.m.world.boxHits(x - HW + 0.06, y + 0.06, z - HW + 0.06, x + HW - 0.06, y + h, z + HW - 0.06)) { if (++R.bad > 30) this.tp(a); return { landed: 0 }; }
    R.acc = now(); R.bad = 0;
    a.pos.x = x; a.pos.y = y; a.pos.z = z; a.vel.x = vx; a.vel.y = vy; a.vel.z = vz;
    const was = a.onGround;
    a.onGround = !!(r.f & 4); a.crouch = !!(r.f & 1);
    if (r.w !== a.swingN) { a.swingN = r.w; a.swingT = 0.25; }
    a.moveAmt = Math.hypot(vx, vz); a.walkPhase += a.moveAmt * dt * 2.2;
    let landed = 0;
    if (!a.onGround) a.airTop = Math.max(a.airTop ?? a.pos.y, a.pos.y);
    else if (!was) { landed = (a.airTop ?? a.pos.y) - a.pos.y; a.airTop = null; }
    else a.airTop = null;
    return { landed };
  }
  tp(a) {
    const i = this.idx(a), R = this.rem[i];
    if (!R) return;
    R.tp = (R.tp ?? 0) + 1; R.bad = 0; R.acc = now();
    this.mesh.send(this.pid[i], { t: 'tp', n: R.tp, x: r3(a.pos.x), y: r3(a.pos.y), z: r3(a.pos.z), yaw: r3(a.yaw), al: a.alive });
  }
  kb(t) {
    const i = this.idx(t);
    if (this.pid[i]) this.mesh.send(this.pid[i], { t: 'kb', x: r3(t.kb.x), z: r3(t.kb.z), vy: t.onGround ? 0 : r3(t.vel.y) });
  }

  ser(e) {
    const I = (a) => this.idx(a);
    switch (e.t) {
      case 'hurt': return { t: e.t, a: I(e.a), by: I(e.by), cause: e.cause, crit: e.crit, dmg: e.dmg };
      case 'kill': return { t: e.t, a: I(e.a), by: I(e.by), cause: e.cause };
      case 'break': case 'place': case 'dig': return { t: e.t, a: I(e.a), id: e.id, x: e.x, y: e.y, z: e.z };
      case 'eat': case 'pickup': case 'throw': case 'warp': case 'respawn': return { t: e.t, a: I(e.a), id: e.id, n: e.n };
      case 'refill': case 'border': case 'voidrise': return { t: e.t };
      case 'notice': return { t: e.t, text: e.text, k: e.k, p: e.p, cls: e.cls, sound: e.sound, big: e.big, team: e.team, to: I(e.to) };
      default: return null;
    }
  }
  des(e) {
    const me = this.me, out = { ...e };
    for (const k of ['a', 'by', 'to']) if (k in e) out[k] = this.act(e[k]);
    if ((e.t === 'place' || e.t === 'break' || e.t === 'dig') && out.a === me) return null;
    if (e.t === 'notice' && e.to >= 0 && out.to !== me) return null;
    return out;
  }

  pre(dt) {
    if (this.closed) return;
    this.mesh.tick(dt);
    if (this.isHost) return;
    const m = this.m, me = this.me;
    if (this.waitHost && now() - this.waitHost > 3500) { this.waitHost = 0; this.solo(); return; }
    if (this.off == null) return;
    const hn = now() / 1000 - this.off, rt = hn - this.delay;
    if (m.state === 'play' && this.snapTime != null) m.time = this.snapTime + Math.max(0, hn - this.snapClk);
    m.actors.forEach((a, i) => {
      if (a === me) return;
      a.hurtT = Math.max(0, a.hurtT - dt); a.swingT = Math.max(0, a.swingT - dt);
      const b = this.buf[i];
      if (!b.length) return;
      let s0 = b[0], s1 = null;
      for (let k = b.length - 1; k >= 0; k--) if (b[k].t <= rt) { s0 = b[k]; s1 = b[k + 1] || null; break; }
      let x, y, z, yaw, pitch;
      if (s1) {
        const k = Math.max(0, Math.min(1, (rt - s0.t) / Math.max(1e-4, s1.t - s0.t)));
        x = s0.x + (s1.x - s0.x) * k; y = s0.y + (s1.y - s0.y) * k; z = s0.z + (s1.z - s0.z) * k;
        yaw = s0.yaw + wrap(s1.yaw - s0.yaw) * k; pitch = s0.pitch + (s1.pitch - s0.pitch) * k;
      } else {
        const e = Math.max(0, Math.min(EXTRA, rt - s0.t));
        x = s0.x + s0.vx * e; y = s0.y + (s0.og ? 0 : s0.vy * e); z = s0.z + s0.vz * e; yaw = s0.yaw; pitch = s0.pitch;
      }
      if (!s1 && rt - s0.t > 0.03) this.off += Math.min(0.004, (rt - s0.t) * 0.02);
      a.vel.x = s0.vx; a.vel.y = s0.vy; a.vel.z = s0.vz;
      const ex = x - a.pos.x, ey = y - a.pos.y, ez = z - a.pos.z;
      if (ex * ex + ey * ey + ez * ez > 9 || !a.seen) { a.pos.x = x; a.pos.y = y; a.pos.z = z; a.seen = true; }
      else { const k = 1 - Math.exp(-dt * 25); a.pos.x += ex * k; a.pos.y += ey * k; a.pos.z += ez * k; }
      a.yaw = yaw; a.pitch = pitch; a.onGround = s0.og;
      a.moveAmt = Math.hypot(s0.vx, s0.vz); a.walkPhase += a.moveAmt * dt * 2.2;
    });
  }

  post(dt) {
    if (this.closed) return;
    const m = this.m;
    this.clk += dt;
    if (this.isHost) this.hostPost(dt); else this.clientPost(dt);
  }

  hostPost(dt) {
    const m = this.m, mesh = this.mesh;
    for (const e of m.events) { const s = this.ser(e); if (s) this.evq.push(s); }
    this.sendT -= dt;
    if (this.sendT > 0) return;
    this.sendT = 0.05;
    if (!this.humans().some((id) => mesh.isOpen(id))) { this.blk.length = 0; this.evq.length = 0; }
    const u = { t: 'u' };
    if (this.blk.length) { u.b = this.blk; this.blk = []; }
    if (this.evq.length) { u.e = this.evq; this.evq = []; }
    const cur = new Set(), nd = [];
    for (const d of m.drops) { cur.add(d.key); if (!this.known.has(d.key)) { this.known.add(d.key); nd.push([d.key, d.id, d.count, r3(d.x), r3(d.y), r3(d.z), r3(d.vx), r3(d.vy), r3(d.vz)]); } }
    const gone = [];
    for (const k of this.known) if (!cur.has(k)) { gone.push(k); this.known.delete(k); }
    if (nd.length) u.d = nd;
    if (gone.length) u.x = gone;
    const np = [];
    for (const p of m.projectiles) if (!this.projSeen.has(p)) { this.projSeen.add(p); np.push([p.id, r3(p.x), r3(p.y), r3(p.z), r3(p.vx), r3(p.vy), r3(p.vz)]); }
    if (np.length) u.p = np;
    this.chestT -= 0.05;
    if (this.chestT <= 0) {
      this.chestT = 0.5;
      const cl = [];
      m.map.chests.forEach((c, i) => { const s = sigChest(c); if (this.chestSig[i] !== s) { this.chestSig[i] = s; cl.push([i, c.items.map((it) => [it.id, it.count]), c.looted ? 1 : 0]); } });
      if (cl.length) u.c = cl;
    }
    if (Object.keys(u).length > 1) mesh.sendAll(u);
    m.actors.forEach((a, i) => {
      const R = this.rem[i], id = this.pid[i];
      if (!R || !a.remote || !id) return;
      const s = sigInv(a);
      if (s !== R.sig || R.ack !== R.sentAck) { R.sig = s; R.sentAck = R.ack; mesh.send(id, { t: 'inv', s: invOf(a), r: a.inv.armor, k: R.ack }); }
    });
    mesh.sendAll(packSnap(m, this.clk, this.seq++), true);
    this.fullT -= 0.05;
    if (this.fullT <= 0 && this.backupId) {
      this.fullT = 2;
      mesh.send(this.backupId, { t: 'full', inv: m.actors.map((a) => [invOf(a), a.inv.armor, a.sel]) });
    }
  }

  clientPost(dt) {
    const me = this.me, m = this.m;
    this.inT -= dt;
    if (this.inT > 0 || !this.mesh.isOpen(this.hostId)) return;
    this.inT = 1 / 30;
    const f = (me.crouch ? 1 : 0) | (me.sprint ? 2 : 0) | (me.onGround ? 4 : 0) | (this.app.pc.useHeld ? 8 : 0);
    this.mesh.send(this.hostId, JSON.stringify({ t: 'in', q: this.inSeq++, p: [r3(me.pos.x), r3(me.pos.y), r3(me.pos.z), r3(me.vel.x), r3(me.vel.y), r3(me.vel.z), r3(me.yaw), r3(me.pitch)], f, s: me.sel, w: me.swingN, n: this.tpSeq }), true);
  }

  action(k, d) {
    if (this.isHost) return;
    const q = ++this.actSeq;
    this.mesh.send(this.hostId, { t: 'a', k, q, ...d });
    return q;
  }
  placed(a, x, y, z, id) { const q = this.action('pl', { x, y, z, id, sel: a.sel }); this.pend.push({ q, k: 'p', id }); }
  broke(a, x, y, z, drop) { const q = this.action('bk', { x, y, z, sel: a.sel }); if (drop) this.pend.push({ q, k: 'b', id: drop }); }
  hit(a, t) { this.action('hit', { i: this.idx(t), yaw: r3(a.yaw), pitch: r3(a.pitch), sel: a.sel }); }
  threw(a) { this.action('th', { sel: a.sel, yaw: r3(a.yaw), pitch: r3(a.pitch) }); }
  take(chest, i) { this.action('tk', { c: this.m.map.chests.indexOf(chest), i }); }
  takeAll(chest) { this.action('ta', { c: this.m.map.chests.indexOf(chest) }); }

  hostAction(i, d) {
    const m = this.m, a = m.actors[i], R = this.rem[i];
    if (!a || !R) return;
    R.ack = Math.max(R.ack, d.q || 0);
    const fix = (x, y, z) => this.mesh.send(this.pid[i], { t: 'u', b: [x, y, z, m.world.get(x, y, z), m.world.flag(x, y, z)] });
    if (d.sel != null && d.sel >= 0 && d.sel < 9) a.sel = d.sel;
    if (d.yaw != null) { a.yaw = d.yaw; a.pitch = d.pitch; }
    const near = (x, y, z, r) => Math.hypot(x + 0.5 - a.pos.x, y + 0.5 - a.pos.y - 1.5, z + 0.5 - a.pos.z) < r;
    switch (d.k) {
      case 'pl': if (!a.alive || !near(d.x, d.y, d.z, 7.5) || !m.place(a, d.x, d.y, d.z, d.id)) fix(d.x, d.y, d.z); break;
      case 'bk': {
        const id = m.world.get(d.x, d.y, d.z);
        if (a.alive && id && near(d.x, d.y, d.z, 7.5) && m.mode.canBreak(a, d.x, d.y, d.z, id)) m.breakBlock(a, d.x, d.y, d.z); else fix(d.x, d.y, d.z);
        break;
      }
      case 'hit': {
        const t = m.actors[d.i];
        if (a.alive && t && t.alive && Math.hypot(t.pos.x - a.pos.x, t.pos.z - a.pos.z) < 5.2 && Math.abs(t.pos.y - a.pos.y) < 3.2) { a.attackCd = 0; m.melee(a, t); }
        break;
      }
      case 'th': { const h = a.held(); if (a.alive && h && (h.kind === 'throw' || h.kind === 'warp')) { a.attackCd = 0; m.throwItem(a, h.id); } break; }
      case 'tk': { const c = m.map.chests[d.c]; if (a.alive && c && near(c.x, c.y, c.z, 7)) m.takeFromChest(a, c, d.i); break; }
      case 'ta': { const c = m.map.chests[d.c]; if (a.alive && c && near(c.x, c.y, c.z, 7)) m.takeAll(a, c); break; }
    }
  }

  onMsg(p, d) {
    if (this.closed || !d) return;
    const m = this.m;
    if (d.t === 'bye') { this.mesh.drop(p.id, true); return; }
    if (this.isHost) {
      const i = this.pid.indexOf(p.id);
      if (i < 0) return;
      if (d.t === 'in') { const R = this.rem[i]; if (R && d.q > R.seq) { R.seq = d.q; R.in = d; } }
      else if (d.t === 'a') this.hostAction(i, d);
      return;
    }
    if (d.t === 'host') { this.onHostMsg(d); return; }
    if (d.t === 'full') { this.full = d; return; }
    if (p.id !== this.hostId) return;
    switch (d.t) {
      case 'u': {
        if (d.b) for (let k = 0; k < d.b.length; k += 5) m.world.set(d.b[k], d.b[k + 1], d.b[k + 2], d.b[k + 3], d.b[k + 4]);
        if (d.e) for (const e of d.e) { const x = this.des(e); if (x) m.events.push(x); }
        if (d.d) for (const [key, id, count, x, y, z, vx, vy, vz] of d.d) if (!m.drops.some((q) => q.key === key)) m.drops.push({ key, id, count, x, y, z, vx, vy, vz, age: 0 });
        if (d.x) { const g = new Set(d.x); m.drops = m.drops.filter((q) => !g.has(q.key)); }
        if (d.p) for (const [id, x, y, z, vx, vy, vz] of d.p) m.projectiles.push({ id, owner: null, x, y, z, vx, vy, vz, age: 0 });
        if (d.c) for (const [i, items, looted] of d.c) { const c = m.map.chests[i]; if (!c) continue; c.items = items.map(([id, count]) => ({ id, count })); c.looted = !!looted; if (this.app.chest === c) this.app.ui.chest(c, this.me); }
        break;
      }
      case 'inv': {
        const me = this.me;
        setInv(me, d.s, d.r);
        this.pend = this.pend.filter((q) => q.q > d.k);
        for (const q of this.pend) { if (q.k === 'p') me.inv.take(q.id, 1); else me.inv.add(q.id, 1); }
        if (this.app.chest) this.app.ui.chest(this.app.chest, me);
        break;
      }
      case 'tp': {
        const me = this.me;
        me.pos.x = d.x; me.pos.y = d.y; me.pos.z = d.z; me.vel.x = me.vel.y = me.vel.z = 0; me.kb.x = me.kb.z = 0;
        if (d.al && !me.alive) { me.alive = true; me.eliminated = false; me.yaw = d.yaw; me.pitch = -0.08; me.reset(); }
        this.tpSeq = d.n;
        break;
      }
      case 'kb': { const me = this.me; me.kb.x = d.x; me.kb.z = d.z; if (d.vy) { me.vel.y = d.vy; me.onGround = false; } break; }
    }
  }

  onBin(p, b) {
    if (this.closed || this.isHost || p.id !== this.hostId) return;
    const s = readSnap(b);
    if (!s) return;
    if (this.lastSeq >= 0 && ((s.seq - this.lastSeq) & 0xffff) > 0x8000) return;
    this.lastSeq = s.seq; this.waitHost = 0; this.snapCount++;
    const t = now() / 1000, m = this.m, me = this.me, md = m.mode;
    const smp = t - s.clk;
    if (this.off == null || Math.abs(smp - this.off) > 0.5) { this.off = smp; this.jit = 0; }
    else { this.jit += (Math.abs(smp - this.off) - this.jit) * 0.05; this.off += (smp - this.off) * (smp < this.off ? 0.3 : 0.02); }
    const want = Math.min(0.25, Math.max(0.1, 0.06 + this.jit * 2.5));
    this.delay += (want - this.delay) * (want > this.delay ? 0.2 : 0.02);
    this.snapTime = s.time; this.snapClk = s.clk;
    md.refilled = !!(s.mf & 1); md.rising = !!(s.mf & 2); md.respawnsOn = !!(s.mf & 4); md.borderWarned = !!(s.mf & 8);
    md.border = s.border; m.map.voidY = s.voidY;
    if (s.st === 0) m.countdown = s.cd;
    if (s.st >= 1 && m.state === 'countdown') { m.state = 'play'; m.countdown = 0; md.start(); m.emit({ t: 'start' }); }
    if (s.st === 2 && !m.over) { m.over = true; m.state = 'over'; m.winner = this.act(s.win === 255 ? -1 : s.win); m.emit({ t: 'over', winner: m.winner }); }
    s.A.forEach((q, i) => {
      const a = m.actors[i];
      if (!a) return;
      a.hp = q.hp; a.eliminated = q.elim; a.lives = q.lives === 255 ? a.lives : q.lives; a.kills = q.kills; a.deaths = q.deaths; a.rank = q.rank; a.respawnT = q.respawnT; a.absorb = q.absorb;
      if (a === me) {
        if (!q.alive && me.alive) { me.alive = false; me.mine = null; }
        if (q.prot) me.spawnProtect = Math.max(me.spawnProtect, 0.2); else me.spawnProtect = 0;
        return;
      }
      if (q.hurt && a.hurtT <= 0) a.hurtT = 0.45;
      if (q.sw !== (a.swingN & 255)) { a.swingN = q.sw; a.swingT = 0.25; if (a.alive) m.emit({ t: 'swing', a }); }
      a.crouch = q.crouch; a.sprint = q.sprint; a.eatT = q.eat ? 0.1 : 0; a.spawnProtect = q.prot ? 1 : 0;
      a.sel = 0; a.inv.slots[0] = q.held ? { id: q.held, count: 1 } : null; a.inv.armor = q.armor;
      const b = this.buf[i];
      const last = b[b.length - 1];
      if ((q.alive && !a.alive) || (last && Math.hypot(q.x - last.x, q.y - last.y, q.z - last.z) > 8)) { b.length = 0; a.seen = false; }
      a.alive = q.alive;
      if (last && s.clk <= last.t) return;
      b.push({ t: s.clk, x: q.x, y: q.y, z: q.z, vx: q.vx, vy: q.vy, vz: q.vz, yaw: q.yaw, pitch: q.pitch, og: q.og });
      if (b.length > 12) b.shift();
    });
  }

  onLost(pid) {
    if (this.closed) return;
    const m = this.m, i = this.pid.indexOf(pid);
    if (this.isHost) {
      if (i < 0) return;
      const a = m.actors[i];
      this.pid[i] = null; this.rem[i] = null;
      if (a) { this.toBot(a); if (!m.over) this.app.netToast && this.app.netToast('left', a.name); }
      if (pid === this.backupId) this.pickBackup();
      this.announce();
      return;
    }
    if (pid === this.hostId) {
      if (m.over) return;
      if (this.backupId === this.myId) { this.becomeHost(true); this.app.netToast && this.app.netToast('host', this.me.name); }
      else if (this.backupId && this.mesh.isOpen(this.backupId)) { this.hostId = this.backupId; this.lastSeq = -1; this.waitHost = now(); this.app.netToast && this.app.netToast('host', this.names[this.pid.indexOf(this.backupId)] || ''); }
      else this.solo();
    } else if (pid === this.backupId) this.backupId = null;
  }
  solo() {
    if (this.isHost) return;
    this.pid = this.pid.map((id) => (id === this.myId ? id : null));
    this.becomeHost(true);
    this.mesh.close();
  }

  close(now) {
    if (this.closed) return;
    if (this.isHost && this.backupId && !this.m.over) this.mesh.send(this.backupId, { t: 'full', inv: this.m.actors.map((a) => [invOf(a), a.inv.armor, a.sel]) });
    this.mesh.sendAll({ t: 'bye' });
    this.closed = true;
    if (this.wl) { const L = this.m.world.listeners, k = L.indexOf(this.wl); if (k >= 0) L.splice(k, 1); }
    const end = () => { this.mesh.close(); try { this.chan.close(); } catch (e) {} };
    if (now) end(); else setTimeout(end, 60);
  }
}
