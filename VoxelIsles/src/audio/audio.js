const MAT = {
  grass: { f: 900, q: 0.8, d: 0.12, g: 0.5 }, gravel: { f: 700, q: 1.2, d: 0.12, g: 0.55 }, stone: { f: 1500, q: 2.5, d: 0.09, g: 0.5 },
  wood: { f: 500, q: 4, d: 0.11, g: 0.6 }, sand: { f: 2200, q: 0.6, d: 0.13, g: 0.35 }, snow: { f: 1800, q: 0.7, d: 0.12, g: 0.35 },
  glass: { f: 3200, q: 8, d: 0.14, g: 0.4 }, metal: { f: 2400, q: 10, d: 0.1, g: 0.35 }, cloth: { f: 650, q: 0.7, d: 0.1, g: 0.45 }, egg: { f: 1100, q: 6, d: 0.18, g: 0.6 },
};

export class Audio {
  constructor() { this.ctx = null; this.master = null; this.volume = 0.8; this.musicVol = 0.4; this.muted = false; this.listener = { x: 0, y: 0, z: 0 }; this.musicOn = false; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !this.suspended) this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
    this.mus = this.ctx.createGain(); this.mus.connect(this.master);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.apply();
  }
  apply() { if (!this.master) return; const t = this.ctx.currentTime; this.master.gain.setTargetAtTime(this.muted || this.suspended ? 0 : this.volume, t, 0.03); this.mus.gain.setTargetAtTime(this.musicVol * 0.5, t, 0.3); }
  setVolume(v, m) { this.volume = v; if (m != null) this.musicVol = m; this.apply(); }
  setMuted(m) { this.muted = m; this.apply(); }
  suspend(on) { this.suspended = on; if (!this.ctx) return; this.apply(); if (on) this.ctx.suspend().catch(() => {}); else this.ctx.resume().catch(() => {}); }
  att(p) { if (!p) return 1; const d = Math.hypot(p.x - this.listener.x, p.y - this.listener.y, p.z - this.listener.z); return Math.max(0, 1 - d / 28) ** 1.4; }
  noise(dur, f, q, gain, at, type = 'bandpass', t0 = 0) {
    if (!this.ctx || gain < 0.01) return;
    const c = this.ctx, t = c.currentTime + t0;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl).connect(g).connect(at || this.sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  tone(f, dur, type = 'square', gain = 0.15, slide = 0, t0 = 0, at) {
    if (!this.ctx || !(gain > 0.002)) return;
    const c = this.ctx, t = c.currentTime + t0;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(at || this.sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  block(sound, kind, p) {
    const m = MAT[sound] || MAT.stone, a = this.att(p);
    if (kind === 'dig') this.noise(m.d, m.f * (0.9 + Math.random() * 0.2), m.q, m.g * 0.55 * a);
    else if (kind === 'break') { this.noise(m.d * 2.2, m.f * 0.8, m.q * 0.6, m.g * 0.9 * a); if (sound === 'glass') for (let i = 0; i < 3; i++) this.tone(2400 + Math.random() * 1800, 0.12, 'triangle', 0.05 * a, 0.6, i * 0.03); }
    else if (kind === 'place') { this.noise(m.d * 1.4, m.f * 0.7, m.q, m.g * 0.8 * a); this.tone(m.f * 0.12, 0.06, 'sine', 0.12 * a); }
    else if (kind === 'step') this.noise(m.d * 0.8, m.f * 0.75, m.q, m.g * 0.22 * a);
  }
  hit(p, crit) { const a = this.att(p); this.noise(0.08, 800, 1.5, 0.6 * a, null, 'lowpass'); this.tone(180, 0.09, 'square', 0.12 * a, 0.5); if (crit) for (let i = 0; i < 4; i++) this.tone(1600 + i * 300, 0.06, 'triangle', 0.05 * a, 1.3, i * 0.02); }
  hurt(self) { this.tone(self ? 300 : 260, 0.14, 'sawtooth', self ? 0.12 : 0.06, 0.55); this.noise(0.1, 600, 1, self ? 0.3 : 0.15, null, 'lowpass'); }
  swing(p) { this.noise(0.12, 1800, 0.7, 0.18 * this.att(p), null, 'highpass'); }
  eat() { for (let i = 0; i < 3; i++) this.noise(0.07, 1200 + i * 200, 2, 0.3, null, 'bandpass', i * 0.12); }
  pickup() { this.tone(880 + Math.random() * 200, 0.07, 'sine', 0.12, 1.6); }
  click() { this.tone(660, 0.05, 'square', 0.06, 1.2); }
  hover() { this.tone(980, 0.03, 'sine', 0.03); }
  beep(hi) { this.tone(hi ? 1320 : 880, hi ? 0.35 : 0.15, 'square', 0.1); }
  kill() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, 'square', 0.08, 1, i * 0.07)); }
  death() { [440, 330, 220, 165].forEach((f, i) => this.tone(f, 0.22, 'sawtooth', 0.08, 0.9, i * 0.12)); }
  win() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'square', 0.09, 1, i * 0.13)); }
  egg(p) { this.noise(0.5, 900, 3, 0.7 * Math.max(0.35, this.att(p))); [300, 200, 120].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.12, 0.6, i * 0.1)); }
  throwS() { this.noise(0.15, 1400, 1, 0.25, null, 'highpass'); }
  trap() { this.noise(0.45, 500, 2, 0.5); this.tone(140, 0.4, 'sawtooth', 0.12, 0.5); this.tone(90, 0.5, 'square', 0.08, 0.6, 0.08); }
  warp() { this.tone(300, 0.4, 'sine', 0.14, 4); this.tone(450, 0.4, 'triangle', 0.08, 3); }
  levelUp() { [523, 784, 1046, 1568].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.1, 1, i * 0.09)); }

  startMusic(style = 'calm') {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true; this.musicStyle = style;
    const c = this.ctx;
    const scales = { calm: [0, 2, 4, 7, 9, 12, 14, 16], tense: [0, 3, 5, 7, 10, 12, 15, 17] };
    let step = 0, next = c.currentTime + 0.1;
    const chords = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
    const sched = () => {
      if (!this.musicOn) return;
      while (next < c.currentTime + 0.6) {
        const sc = scales[this.musicStyle] || scales.calm, bar = Math.floor(step / 16) % 4, beat = step % 16;
        const root = 57;
        const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
        if (beat === 0) for (const n of chords[bar]) this.tone(hz(root + n - 12), 3.2, 'triangle', 0.035, 1, next - c.currentTime, this.mus);
        if (beat % 2 === 0 && Math.random() < 0.72) { const n = sc[Math.floor(Math.random() * sc.length)] + chords[bar][0]; this.tone(hz(root + n + 12), 0.45, 'sine', 0.045, 1, next - c.currentTime, this.mus); }
        if (beat % 4 === 2 && Math.random() < 0.5) this.tone(hz(root + chords[bar][1]), 0.25, 'square', 0.012, 1, next - c.currentTime, this.mus);
        next += 0.21; step++;
      }
      this.musicTimer = setTimeout(sched, 200);
    };
    sched();
  }
  stopMusic() { this.musicOn = false; clearTimeout(this.musicTimer); }
  setMusicStyle(s) { this.musicStyle = s; }
}
