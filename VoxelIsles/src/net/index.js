import { MODES, botName } from '../game/session.js';
import { NET } from './config.js';
import { Mesh } from './peer.js';
import { supabaseBackend } from './backend-supabase.js';
import { localBackend } from './backend-local.js';
import { NetGame } from './game.js';

const V = 1, MAX = 8, WAIT = 9, WAIT_MAX = 20, CD = 4;
const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const region = () => Math.round(-new Date().getTimezoneOffset() / 180);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.now() / 1000;

export function createNet(app) {
  let q = null;
  try { q = new URLSearchParams(location.search).get('net'); } catch (e) {}
  if (q === 'off' || typeof RTCPeerConnection === 'undefined' || typeof WebSocket === 'undefined') return null;
  if (q !== 'local' && (!NET.url || !NET.key)) return null;
  return new Net(app, q === 'local');
}

class Net {
  constructor(app, local) {
    this.app = app; this.id = rid(); this.backend = (local ? localBackend : supabaseBackend)(this.id); this.kind = this.backend.kind;
    this.ice = NET.ice; this.lob = null; this.lobDead = false; this.syncWait = [];
    addEventListener('pagehide', () => { if (this.game) this.game.close(true); if (this.lobbyRef) this.lobbyRef.leave(true); });
  }
  warm() {
    if (this.lob && !this.lobDead) return;
    this.lobDead = false; this.synced = false;
    try { this.lob = this.backend.open('vi-sky-v' + V); } catch (e) { this.lobDead = true; return; }
    const lob = this.lob;
    lob.ready.catch(() => { if (this.lob === lob) this.lobDead = true; });
    lob.onSync(() => { this.synced = true; const w = this.syncWait; this.syncWait = []; for (const f of w) f(); if (this.lobbyRef) this.lobbyRef.onLobSync(); });
    if (NET.turnUrl && !this.turnP) this.turnP = fetch(NET.turnUrl).then((r) => r.json()).then((l) => { if (Array.isArray(l) && l.length) this.ice = [...NET.ice.filter((s) => !/^turns?:/.test(String(s.urls))), ...l]; }).catch(() => {});
  }
  score() {
    const ft = this.app.perf || 16.7, fps = Math.min(144, 1000 / Math.max(4, ft));
    const cores = Math.min(16, navigator.hardwareConcurrency || 4), mobile = this.app.input && this.app.input.touch;
    const c = navigator.connection, cell = c && (c.type === 'cellular' || /2g|3g/.test(c.effectiveType || ''));
    return Math.round(cores * 3 + fps * 0.5 + (mobile ? 0 : 25) + (cell ? 0 : 12));
  }
  cool() { if (this.lob) { const l = this.lob; this.lob = null; this.synced = false; try { l.untrack(); l.close(); } catch (e) {} } }
  lobby(me) { this.warm(); const L = new NetLobby(this, me); this.lobbyRef = L; L.find(); return L; }
}

class NetLobby {
  constructor(net, me) {
    this.net = net; this.isNet = true; this.mode = MODES.sky; this.state = 'search'; this.cd = CD; this.t = 0;
    this.me = { id: net.id, name: me.name, skin: me.skin, s: net.score() };
    this.slots = [{ ...this.me, bot: false, me: true }];
    this.map = this.mode.maps[Math.floor(Math.random() * this.mode.maps.length)];
    this.phase = 'find'; this.bad = new Set(); this.role = null; this.ppl = null; this.chan = null; this.mesh = null; this.lid = null;
    this.queue = []; this.bins = []; this.dead = false; this.rosterT = 0; this.tickT = 0; this.joinT = 0;
  }
  get online() { return this.ppl ? this.ppl.filter((p) => p.id).length : 1; }

  async find() {
    if (this.dead) return;
    this.phase = 'find'; this.role = null;
    const net = this.net, lob = net.lob;
    if (!lob || net.lobDead) return this.offline();
    const ok = await Promise.race([lob.ready.then(() => true, () => false), wait(2600).then(() => false)]);
    if (this.dead || this.phase !== 'find') return;
    if (!ok) return this.offline();
    if (!net.synced) await Promise.race([new Promise((r) => net.syncWait.push(r)), wait(900)]);
    if (this.dead || this.phase !== 'find') return;
    const R = region();
    let best = null, bs = -1;
    for (const l of lob.members()) {
      if (!l || l.v !== V || !l.open || l.h === net.id || this.bad.has(l.lid) || l.n >= MAX) continue;
      const sc = l.n * 10 + (l.r === R ? 25 : 0) + Math.min(5, l.left || 0);
      if (sc > bs) { bs = sc; best = l; }
    }
    if (best) this.join(best.lid); else this.host();
  }

  openChan(lid) {
    if (this.lid === lid && this.chan) return this.chan;
    if (this.chan) { try { this.chan.close(); } catch (e) {} }
    if (this.mesh) this.mesh.close();
    this.lid = lid;
    const ch = this.chan = this.net.backend.open('vi-l-' + lid);
    if (this.mesh) this.mesh.setChan(ch); else this.mesh = new Mesh(this.net.id, ch, this.net.ice);
    this.mesh.ice = this.net.ice;
    this.mesh.onMsg = (p, m) => { if (m.t === 'bye') this.mesh.drop(p.id, true); else if (m.t === 'start') this.onStart(m); else if (this.state === 'go') this.queue.push({ p, m }); };
    this.mesh.onBin = (p, b) => { if (this.state === 'go') { this.bins.push({ p, b }); if (this.bins.length > 4) this.bins.shift(); } };
    this.mesh.onLost = (pid) => this.onPeerLost(pid);
    ch.on('join', (d) => this.onJoin(d));
    ch.on('bye', (d) => this.onBye(d));
    ch.on('roster', (d) => this.onRoster(d));
    ch.on('start', (d) => this.onStart(d));
    ch.on('move', (d) => { if (this.role === 'guest' && d && d.from === this.hostId) this.join(d.to); });
    ch.on('nope', (d) => { if (d && d.to === this.net.id && this.phase === 'join') { this.bad.add(this.lid); this.find(); } });
    return ch;
  }

  async join(lid) {
    if (this.dead) return;
    this.phase = 'join'; this.role = 'guest'; this.ppl = null; this.joinT = 0; this.joinTries = 0;
    const ch = this.openChan(lid);
    const ok = await Promise.race([ch.ready.then(() => true, () => false), wait(3000).then(() => false)]);
    if (this.dead || this.chan !== ch) return;
    if (!ok) { this.bad.add(lid); return this.find(); }
    ch.send('join', this.me);
    this.joinT = now();
  }

  host() {
    if (this.dead) return;
    this.openChan(this.net.id + '-' + rid().slice(0, 3));
    this.phase = 'in'; this.role = 'host'; this.hostId = this.net.id; this.backup = null;
    this.ppl = [{ ...this.me }]; this.t0 = now(); this.deadline = this.t0 + WAIT; this.state = 'search'; this.wasHost = true;
    this.syncSlots(); this.track(); this.sendRoster();
  }

  offline() {
    if (this.dead || this.phase === 'off') return;
    this.phase = 'off'; this.role = null; this.ppl = null;
    if (this.chan) { try { this.chan.close(); } catch (e) {} this.chan = null; }
    if (this.mesh) { this.mesh.close(); this.mesh = null; }
    this.offT = 0; this.offNext = 0.4; this.names = new Set([this.me.name]);
  }

  track() {
    if (this.role !== 'host' || !this.net.lob) return;
    const H = this.ppl.filter((p) => p.id).length, open = this.state === 'search' && this.deadline - now() > 2.5 && H < MAX;
    const st = { lid: this.lid, h: this.net.id, n: H, open, v: V, r: region(), s: this.me.s, left: Math.max(0, Math.round(this.deadline - now())) };
    const sig = JSON.stringify([st.lid, st.n, st.open]);
    if (sig === this.trackSig) return;
    this.trackSig = sig;
    if (open) this.net.lob.track(st); else this.net.lob.untrack();
  }
  untrack() { if (this.trackSig) { this.trackSig = null; try { this.net.lob.untrack(); } catch (e) {} } }

  roster() {
    const left = this.state === 'countdown' ? this.cd : Math.max(0, this.deadline - now());
    return { lid: this.lid, host: this.net.id, backup: this.backup, map: this.map.id, st: this.state === 'countdown' ? 'cd' : 'wait', left, ppl: this.ppl };
  }
  sendRoster() { if (this.role === 'host' && this.chan) { this.chan.send('roster', this.roster()); this.rosterT = 3; } }

  onJoin(d) {
    if (this.role !== 'host' || !d || !d.id) return;
    const H = this.ppl.filter((p) => p.id);
    if (this.ppl.some((p) => p.id === d.id)) { this.sendRoster(); return; }
    if (H.length >= MAX || this.state !== 'search' || this.deadline - now() < 1.5) { this.chan.send('nope', { to: d.id }); return; }
    const bi = this.ppl.findIndex((p) => !p.id);
    const p = { id: d.id, name: String(d.name || 'Player').slice(0, 16), skin: d.skin | 0, s: +d.s || 0 };
    if (this.ppl.length >= MAX && bi >= 0) this.ppl.splice(bi, 1);
    const at = this.ppl.findIndex((q) => !q.id);
    if (at >= 0) this.ppl.splice(at, 0, p); else this.ppl.push(p);
    this.deadline = Math.min(this.t0 + WAIT_MAX, Math.max(this.deadline, now() + 5));
    this.pickBackup(); this.syncSlots(); this.sendRoster(); this.track();
    this.net.app.netToast && this.net.app.netToast('joined', p.name);
  }
  onBye(d) {
    if (!d || !this.ppl) return;
    if (this.role === 'host') { this.removePeer(d.id); return; }
  }
  removePeer(id) {
    const i = this.ppl ? this.ppl.findIndex((p) => p.id === id) : -1;
    if (i < 0) return;
    const name = this.ppl[i].name;
    this.ppl.splice(i, 1);
    if (this.backup === id) this.backup = null;
    this.pickBackup(); this.syncSlots(); this.sendRoster(); this.track();
    this.net.app.netToast && this.net.app.netToast('left', name);
  }
  pickBackup() {
    let best = null;
    for (const p of this.ppl) if (p.id && p.id !== this.net.id && (!best || p.s > best.s || (this.mesh.isOpen(p.id) && !this.mesh.isOpen(best.id)))) best = p;
    this.backup = best ? best.id : null;
  }

  onRoster(d) {
    if (!d || d.lid !== this.lid || this.state === 'go') return;
    if (d.host === this.net.id && this.role === 'host') return;
    const mine = d.ppl.some((p) => p.id === this.net.id);
    if (!mine) { if (this.phase === 'in' || this.joinTries > 3) { this.bad.add(this.lid); this.find(); } return; }
    this.ppl = d.ppl; this.backup = d.backup; this.hostId = d.host; this.phase = 'in'; this.lastRoster = now();
    const mp = this.mode.maps.find((x) => x.id === d.map);
    if (mp) this.map = mp;
    if (d.host === this.net.id) {
      this.role = 'host'; this.t0 = now() - WAIT; this.deadline = now() + (d.st === 'cd' ? 0 : d.left);
      if (d.st === 'cd') { this.state = 'countdown'; this.cd = d.left; this.cdEnd = now() + d.left; }
      this.net.app.netToast && this.net.app.netToast('host', this.me.name);
      this.pickBackup(); this.sendRoster(); this.track();
    } else {
      this.role = 'guest';
      if (d.st === 'cd') { if (this.state !== 'countdown') this.cdEnd = now() + d.left; this.state = 'countdown'; } else this.state = 'search';
      this.deadlineG = now() + d.left;
    }
    this.syncSlots();
  }

  onStart(d) {
    if (!d || d.lid !== this.lid || this.state === 'go' || this.role === 'host') return;
    if (!d.ppl.some((p) => p.id === this.net.id)) { this.bad.add(this.lid); this.find(); return; }
    this.ppl = d.ppl; this.hostId = d.host; this.backup = d.backup; this.seed = d.seed;
    const mp = this.mode.maps.find((x) => x.id === d.map);
    if (mp) this.map = mp;
    this.syncSlots();
    this.state = 'go';
  }

  onPeerLost(pid) {
    if (this.state === 'go' || !this.ppl) return;
    if (this.role === 'host') { this.removePeer(pid); return; }
    if (pid !== this.hostId) return;
    if (this.backup === this.net.id) {
      this.ppl = this.ppl.filter((p) => p.id !== pid);
      this.role = 'host'; this.hostId = this.net.id; this.t0 = now() - WAIT; this.deadline = Math.max(now() + 3, this.deadlineG || 0);
      if (this.state === 'countdown') { this.state = 'search'; this.deadline = now() + 2; }
      this.pickBackup(); this.syncSlots(); this.sendRoster(); this.track();
      this.net.app.netToast && this.net.app.netToast('host', this.me.name);
    } else this.lostAt = now();
  }

  onLobSync() {}

  syncSlots() {
    if (!this.ppl) return;
    const mesh = this.mesh;
    this.slots = this.ppl.map((p) => ({ name: p.name, skin: p.skin, bot: !p.id, me: p.id === this.net.id, net: !!p.id && p.id !== this.net.id, ping: p.id && mesh ? Math.round(mesh.rtt(p.id)) : 0 }));
    if (mesh) mesh.want(this.role === 'host' || this.backup === this.net.id ? this.ppl.filter((p) => p.id).map((p) => p.id) : [this.hostId, this.backup].filter(Boolean));
  }

  update(dt) {
    this.t += dt;
    if (this.dead) return;
    if (this.phase === 'off') return this.offUpdate(dt);
    if (this.mesh) this.mesh.tick(dt);
    if (this.phase === 'join' && this.joinT && now() - this.joinT > 1.2) {
      this.joinT = now(); this.joinTries++;
      if (this.joinTries > 3) { this.bad.add(this.lid); this.find(); } else this.chan.send('join', this.me);
    }
    if (this.state === 'countdown' && this.role !== 'host') this.cd = Math.max(0.05, this.cdEnd - now());
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = 0.5;
      if (this.ppl) for (const s of this.slots) if (s.net) { const p = this.ppl.find((q) => q.name === s.name && q.id); if (p) s.ping = Math.round(this.mesh.rtt(p.id)); }
      if (this.role === 'guest' && this.phase === 'in' && ((this.lostAt && now() - this.lostAt > 2) || now() - this.lastRoster > 9)) { this.lostAt = 0; this.bad.add(this.lid); this.find(); }
    }
    if (this.role !== 'host') return;
    const T = now();
    this.rosterT -= dt;
    let changed = false;
    if (this.state === 'search') {
      const H = this.ppl.filter((p) => p.id).length, span = this.deadline - this.t0;
      const want = Math.min(MAX, Math.max(H, 1 + Math.floor(((T - this.t0) / Math.max(1, span * 0.85)) * (MAX - 1))));
      while (this.ppl.length < want) { let name; do name = botName(); while (this.ppl.some((p) => p.name === name)); this.ppl.push({ name, skin: Math.floor(Math.random() * 100000), sk: 0.25 + Math.random() * 0.6 }); changed = true; }
      if (T >= this.deadline) {
        while (this.ppl.length < MAX) { let name; do name = botName(); while (this.ppl.some((p) => p.name === name)); this.ppl.push({ name, skin: Math.floor(Math.random() * 100000), sk: 0.25 + Math.random() * 0.6 }); }
        this.state = 'countdown'; this.cdEnd = now() + CD; this.cd = CD; changed = true;
      }
      this.mergeT = (this.mergeT || 0) - dt;
      if (this.mergeT <= 0) { this.mergeT = 1; this.tryMerge(); this.trySwap(); }
    } else if (this.state === 'countdown') {
      this.cd = this.cdEnd - now();
      if (this.cd <= 0) { this.begin(); return; }
    }
    if (changed) { this.syncSlots(); this.sendRoster(); }
    else if (this.rosterT <= 0) this.sendRoster();
    this.track();
  }

  tryMerge() {
    if (this.role !== 'host' || this.deadline - now() < 3 || !this.net.lob) return;
    const H = this.ppl.filter((p) => p.id).length;
    let best = null;
    for (const l of this.net.lob.members()) {
      if (!l || l.v !== V || !l.open || l.lid === this.lid || l.h === this.net.id || this.bad.has(l.lid) || l.n + H > MAX) continue;
      if (!(l.n > H || (l.n === H && l.lid > this.lid))) continue;
      if (!best || l.n > best.n) best = l;
    }
    if (!best) return;
    this.untrack();
    this.chan.send('move', { from: this.net.id, to: best.lid });
    this.join(best.lid);
  }
  trySwap() {
    if (this.role !== 'host' || this.deadline - now() < 2.5) return;
    let best = null;
    for (const p of this.ppl) if (p.id && p.id !== this.net.id && this.mesh.isOpen(p.id) && p.s > this.me.s * 1.5 && (!best || p.s > best.s)) best = p;
    if (!best) return;
    const r = this.roster();
    r.host = best.id; r.backup = this.net.id;
    this.untrack();
    this.role = 'guest'; this.hostId = best.id; this.backup = this.net.id; this.lastRoster = now();
    this.chan.send('roster', r);
    this.syncSlots();
  }

  begin() {
    this.ppl = this.ppl.map((p) => (p.id && p.id !== this.net.id && !this.mesh.isOpen(p.id) ? { name: p.name, skin: p.skin, sk: 0.5 } : p));
    this.pickBackup();
    this.seed = (Math.random() * 1e9) | 0;
    const d = { lid: this.lid, host: this.net.id, backup: this.backup, seed: this.seed, map: this.map.id, ppl: this.ppl };
    this.chan.send('start', d);
    this.mesh.sendAll({ t: 'start', ...d });
    this.untrack();
    this.syncSlots();
    this.state = 'go';
  }

  offUpdate(dt) {
    if (this.state === 'search') {
      this.offT += dt;
      while (this.offT >= this.offNext && this.slots.length < MAX) {
        let name; do name = botName(); while (this.names.has(name));
        this.names.add(name);
        this.slots.push({ name, bot: true, skin: Math.floor(Math.random() * 100000), skill: 0.25 + Math.random() * 0.6 });
        this.offNext += 0.3 + Math.random() * 0.7;
      }
      if (this.slots.length >= MAX) { this.state = 'countdown'; this.cd = CD; }
    } else if (this.state === 'countdown') { this.cd -= dt; if (this.cd <= 0) this.state = 'go'; }
  }

  matchSlots() {
    if (!this.ppl) return this.slots.map((s) => ({ name: s.name, bot: !!s.bot, skin: s.skin, skill: s.skill }));
    return this.ppl.map((p) => ({ name: p.name, bot: !p.id, skin: p.skin, skill: p.sk ?? 0.55, id: p.id || null }));
  }
  game(app, m) {
    this.net.cool();
    if (!this.ppl || this.phase === 'off') { this.done(); return null; }
    const meIdx = this.ppl.findIndex((p) => p.id === this.net.id);
    const g = new NetGame(app, m, { net: this.net, mesh: this.mesh, chan: this.chan, ppl: this.ppl, meIdx, host: this.hostId === this.net.id || this.role === 'host' ? this.net.id : this.hostId, backup: this.backup, queue: this.queue, bins: this.bins });
    this.net.game = g;
    this.mesh = null; this.chan = null; this.done();
    return g;
  }
  done() { this.dead = true; this.untrack(); if (this.net.lobbyRef === this) this.net.lobbyRef = null; }
  leave(now) {
    if (this.dead) return;
    if (this.mesh) this.mesh.sendAll({ t: 'bye' });
    if (this.chan) {
      if (this.role === 'host' && this.backup && this.ppl) {
        const r = this.roster(); r.host = this.backup; r.ppl = this.ppl.filter((p) => p.id !== this.net.id); r.backup = null;
        this.chan.send('roster', r);
      } else this.chan.send('bye', { id: this.net.id });
    }
    const ch = this.chan, mesh = this.mesh;
    this.done();
    const end = () => { if (mesh) mesh.close(); if (ch) { try { ch.close(); } catch (e) {} } };
    if (now) end(); else setTimeout(end, 80);
  }
}
