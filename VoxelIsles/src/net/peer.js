const now = () => performance.now();

export class Mesh {
  constructor(id, chan, ice) {
    this.id = id; this.chan = chan; this.ice = ice; this.peers = new Map();
    this.onMsg = () => {}; this.onBin = () => {}; this.onOpen = () => {}; this.onLost = () => {};
    this.pingAt = 0;
    chan.on('sig', (m) => { if (m && m.to === this.id) this.signal(m); });
  }
  setChan(chan) { this.chan = chan; chan.on('sig', (m) => { if (m && m.to === this.id) this.signal(m); }); }
  want(ids) {
    for (const pid of ids) if (pid && pid !== this.id && !this.peers.has(pid)) this.connect(pid, this.id < pid);
    for (const pid of [...this.peers.keys()]) if (!ids.includes(pid)) this.drop(pid, false);
  }
  connect(pid, initiate) {
    const pc = new RTCPeerConnection({ iceServers: this.ice });
    const p = { id: pid, pc, open: false, rtt: 0, last: now(), born: now(), cands: [], ct: 0, rd: false, pend: [] };
    p.sure = pc.createDataChannel('s', { negotiated: true, id: 0 });
    p.fast = pc.createDataChannel('f', { negotiated: true, id: 1, ordered: false, maxRetransmits: 0 });
    for (const dc of [p.sure, p.fast]) { dc.binaryType = 'arraybuffer'; dc.onmessage = (e) => this.recv(p, e.data); }
    p.sure.onopen = () => { p.open = true; p.last = now(); this.onOpen(p); };
    p.sure.onclose = () => this.drop(pid, true);
    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      p.cands.push(e.candidate.toJSON());
      if (!p.ct) p.ct = setTimeout(() => { p.ct = 0; if (p.cands.length) this.chan.send('sig', { from: this.id, to: pid, c: p.cands.splice(0) }); }, 30);
    };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') this.drop(pid, true); };
    this.peers.set(pid, p);
    if (initiate) this.offer(p);
    return p;
  }
  async offer(p) {
    try { await p.pc.setLocalDescription(await p.pc.createOffer()); this.chan.send('sig', { from: this.id, to: p.id, sdp: p.pc.localDescription.toJSON() }); } catch (e) {}
  }
  async signal(m) {
    let p = this.peers.get(m.from);
    if (p && m.sdp && m.sdp.type === 'offer' && p.rd) { this.drop(m.from, false); p = null; }
    if (!p) p = this.connect(m.from, false);
    try {
      if (m.sdp) {
        await p.pc.setRemoteDescription(m.sdp);
        p.rd = true;
        if (m.sdp.type === 'offer') { await p.pc.setLocalDescription(await p.pc.createAnswer()); this.chan.send('sig', { from: this.id, to: m.from, sdp: p.pc.localDescription.toJSON() }); }
        const q = p.pend; p.pend = [];
        for (const c of q) await p.pc.addIceCandidate(c).catch(() => {});
      }
      if (m.c) for (const c of m.c) { if (p.rd) await p.pc.addIceCandidate(c).catch(() => {}); else p.pend.push(c); }
    } catch (e) {}
  }
  recv(p, data) {
    p.last = now();
    if (typeof data !== 'string') { this.onBin(p, data); return; }
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    if (m.t === 'ping') { this.raw(p, p.fast, JSON.stringify({ t: 'pong', ts: m.ts })); return; }
    if (m.t === 'pong') { const r = now() - m.ts; p.rtt = p.rtt ? p.rtt * 0.7 + r * 0.3 : r; return; }
    this.onMsg(p, m);
  }
  raw(p, dc, s) {
    if (!p.open || dc.readyState !== 'open') return;
    const sim = globalThis.__netSim;
    if (sim && dc === p.fast && Math.random() < (sim.loss || 0)) return;
    if (dc === p.fast && dc.bufferedAmount > 65536) return;
    if (sim && sim.ms) setTimeout(() => { if (dc.readyState === 'open') dc.send(s); }, sim.ms * (0.8 + Math.random() * 0.4));
    else dc.send(s);
  }
  send(pid, m, fast = false) { const p = this.peers.get(pid); if (p) this.raw(p, fast ? p.fast : p.sure, typeof m === 'string' || m instanceof ArrayBuffer ? m : JSON.stringify(m)); }
  sendAll(m, fast = false, except = null) {
    const s = typeof m === 'string' || m instanceof ArrayBuffer ? m : JSON.stringify(m);
    for (const p of this.peers.values()) if (p.id !== except) this.raw(p, fast ? p.fast : p.sure, s);
  }
  isOpen(pid) { const p = this.peers.get(pid); return !!(p && p.open); }
  rtt(pid) { const p = this.peers.get(pid); return p ? p.rtt : 0; }
  tick(dt) {
    const t = now();
    if (this.tickAt && t - this.tickAt > 1000) for (const p of this.peers.values()) p.last = Math.max(p.last, t - 500);
    this.tickAt = t;
    if (t - this.pingAt > 500) { this.pingAt = t; for (const p of this.peers.values()) if (p.open) this.raw(p, p.fast, JSON.stringify({ t: 'ping', ts: t })); }
    for (const p of [...this.peers.values()]) {
      if (p.open && t - p.last > 5000) this.drop(p.id, true);
      else if (!p.open && t - p.born > 9000) this.drop(p.id, true);
    }
  }
  drop(pid, lost) {
    const p = this.peers.get(pid);
    if (!p) return;
    this.peers.delete(pid);
    clearTimeout(p.ct);
    try { p.pc.close(); } catch (e) {}
    if (lost) this.onLost(pid);
  }
  close() { for (const pid of [...this.peers.keys()]) this.drop(pid, false); }
}
