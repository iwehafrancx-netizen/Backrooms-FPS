// Web Audio wrapper: one-shot sound effects (from assets/audio/*.mp3), simple
// distance attenuation relative to the thief, and a looping music track.
//
// Browsers only allow audio after a user gesture, so nothing plays until
// unlock() is called from the first click/tap.
const BASE = 'assets/audio/';
export const SOUNDS = [
  'step_soft1', 'step_soft2', 'step_run1', 'step_run2', 'door_open', 'door_locked', 'pick_click',
  'pick_done', 'loot', 'coin_throw', 'coin_land', 'guard_huh', 'guard_alert', 'caught', 'win', 'hide', 'alarm', 'fuse', 'ui_click',
];

export class Audio {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.volume = 0.8;
    this.musicVolume = 0.45;
    this.muted = false; // platform mute (e.g. CrazyGames setting)
    this.listener = { x: 0, z: 0 };
  }

  // Create the context and decode every sound (call once, after a gesture).
  async unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
    this.applyVolumes();
    await Promise.all([...SOUNDS, 'music'].map((n) => this.loadOne(n)));
  }

  async loadOne(name) {
    try {
      const data = await fetch(BASE + name + '.mp3').then((r) => r.arrayBuffer());
      this.buffers.set(name, await this.ctx.decodeAudioData(data));
    } catch (e) { /* a missing sound must never break the game */ }
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.sfxBus.gain.value = this.volume;
    this.musicBus.gain.value = this.musicVolume;
  }

  setSuspended(on) { if (this.ctx) on ? this.ctx.suspend() : this.ctx.resume(); }

  // Play a sound. `at` = {x, z} makes it quieter with distance from the thief.
  play(name, { at = null, volume = 1, rate = 1 } = {}) {
    const buf = this.ctx && this.buffers.get(name);
    if (!buf) return;
    let gain = volume;
    if (at) {
      const d = Math.hypot(at.x - this.listener.x, at.z - this.listener.z);
      gain *= Math.max(0, 1 - d / 18);
      if (gain < 0.02) return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (0.96 + Math.random() * 0.08); // tiny variation so repeats don't sound robotic
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(g).connect(this.sfxBus);
    src.start();
  }

  music(on) {
    if (!this.ctx) return;
    if (on && !this.musicSrc && this.buffers.has('music')) {
      this.musicSrc = this.ctx.createBufferSource();
      this.musicSrc.buffer = this.buffers.get('music');
      this.musicSrc.loop = true;
      this.musicSrc.connect(this.musicBus);
      this.musicSrc.start();
    } else if (!on && this.musicSrc) {
      this.musicSrc.stop(); this.musicSrc.disconnect(); this.musicSrc = null;
    }
  }
}
