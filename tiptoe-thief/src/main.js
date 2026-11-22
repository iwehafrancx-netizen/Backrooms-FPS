// Tiptoe Thief - entry point.
//
// Boot order: platform SDK -> save data -> renderer + models -> title screen.
// The App object owns the shared services (renderer, models, audio, input,
// save, UI) and switches between menus and the current heist (Game).
import Platform from '@platform';
import { Renderer } from './engine/renderer.js';
import { ModelLibrary } from './engine/objloader.js';
import { Input } from './engine/input.js';
import { Audio } from './engine/audio.js';
import { Game } from './game/game.js';
import { Level } from './game/level.js';
import { findPath } from './game/nav.js';
import { Save } from './game/save.js';
import { LEVELS } from './game/levels/index.js';
import { Hud } from './ui/hud.js';
import { Screens, GEAR } from './ui/screens.js';
import { t } from './ui/strings.js';

const AD_GAP_MS = 150000; // at most one between-heist ad every 2.5 minutes

class App {
  constructor() {
    this.t = t;
    this.platform = Platform;
    this.lastAd = performance.now();
  }

  async boot() {
    const bar = document.querySelector('#loading .bar i');
    const setBar = (k) => { if (bar) bar.style.transform = `scaleX(${k})`; };
    await Platform.init();
    Platform.loadingStart();
    this.save = new Save(Platform);
    await this.save.load();

    this.R = new Renderer(document.getElementById('view'));
    this.R.setQuality(this.pickQuality());
    this.lib = new ModelLibrary(this.R.renderer);
    await this.lib.load((k) => setBar(0.1 + k * 0.85));
    this.audio = new Audio();
    this.applySettings();

    this.hud = new Hud(document.getElementById('hud'), this);
    this.input = new Input(this.R.renderer.domElement, document.getElementById('hud'));
    this.screens = new Screens(document.getElementById('screen'), this);
    this.game = new Game(this);
    document.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) this.act(b.dataset.act, b.dataset); });
    // the first click anywhere unlocks audio (browser rule)
    const unlock = () => { this.audio.unlock().then(() => { this.applySettings(); this.audio.music(true); }); };
    addEventListener('pointerdown', unlock, { once: true });
    addEventListener('keydown', unlock, { once: true });
    Platform.onPause(() => { if (this.game.state === 'play') this.pause(); this.audio.setSuspended(true); });
    Platform.onResume(() => this.audio.setSuspended(false));
    Platform.onAudioEnabledChange((on) => { this.audio.muted = !on; this.audio.applyVolumes(); });
    this.audio.muted = !Platform.isAudioEnabled();

    // a level in the background of the menus, so the title screen isn't empty
    this.game.load(LEVELS[0], { quiet: true });
    this.game.state = 'menu';
    this.hud.show(false);
    setBar(1);
    document.getElementById('loading').classList.add('done');
    setTimeout(() => document.getElementById('loading').remove(), 600);
    this.screens.title();
    Platform.gameReady();

    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      this.tick(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // Phones and small laptops start on medium quality, others on high.
  pickQuality() {
    const q = this.save.data.settings.quality;
    if (q !== 'auto') return q;
    const touch = matchMedia('(pointer: coarse)').matches, mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
    return touch || mem <= 4 || cores <= 2 ? 'med' : 'high';
  }

  applySettings() {
    const s = this.save.data.settings;
    if (this.audio) { this.audio.volume = s.volume; this.audio.musicVolume = s.music; this.audio.applyVolumes(); }
  }

  tick(dt) {
    const g = this.game;
    if (g.state === 'play') {
      const inp = this.input.sample();
      if (inp.pause) { this.pause(); }
      else g.update(dt, inp);
    } else if (g.state === 'menu') {
      // slow orbit over the house behind the menus
      this.menuT = (this.menuT || 0) + dt;
      const L = g.level;
      this.R.camDist = 20;
      this.R.cutUniforms.uCutOn.value = 0;
      this.R.follow({ x: L.w / 2 + Math.sin(this.menuT * 0.15) * 3, y: 0, z: L.h / 2, clone() { return this; } }, dt);
      g.level.updateDoors(dt);
      for (const gd of g.guards) gd.update(dt);
    }
    this.R.render();
  }

  // ------------------------------------------------------------- flow
  startLevel(i) {
    this.levelIndex = i;
    const L = LEVELS[i];
    this.screens.hide();
    this.R.cutUniforms.uCutOn.value = 1;
    this.R.camDist = 15;
    this.game.load(L);
    this.hud.show(true);
    this.input.enabled = true;
    Platform.gameplayStart();
    if (!this.save.data.howSeen) { this.game.state = 'paused'; this.screens.how(); }
  }

  pause() {
    if (this.game.state !== 'play') return;
    this.game.state = 'paused';
    Platform.gameplayStop();
    this.screens.pause();
  }

  resume() {
    this.screens.hide();
    this.game.state = 'play';
    Platform.gameplayStart();
  }

  // called by the Game when a heist ends (won or caught)
  levelEnded(r) {
    Platform.gameplayStop();
    this.hud.show(false);
    if (r.won) {
      r.earned = this.save.finish(r.def.id, r.stars, r.cash);
      r.hasNext = this.levelIndex < LEVELS.length - 1;
      r.canDouble = Platform.ads.canReward();
      this.lastResult = r;
      if (r.stars === 3) Platform.happytime();
    }
    this.game.state = 'menu';
    this.screens.results(r);
  }

  // Interstitial between heists (never during one), spaced out.
  async betweenHeists() {
    if (performance.now() - this.lastAd < AD_GAP_MS) return;
    this.lastAd = performance.now();
    this.audio.setSuspended(true);
    try { await Platform.ads.midgame(); } finally { this.audio.setSuspended(false); }
  }

  async act(a, d) {
    this.audio && this.audio.play('ui_click', { volume: 0.5 });
    switch (a) {
      case 'title': this.screens.title(); break;
      case 'levels': if (this.game.state === 'paused') { this.game.state = 'menu'; this.hud.show(false); } this.screens.levels(LEVELS); break;
      case 'shop': this.screens.shop(); break;
      case 'settings': this.screens.settings(); break;
      case 'start': await this.betweenHeists(); this.startLevel(+d.i); break;
      case 'next': await this.betweenHeists(); this.startLevel(this.levelIndex + 1); break;
      case 'retry': this.startLevel(this.levelIndex); break;
      case 'resume': this.resume(); break;
      case 'pause': this.screens.pause(); break;
      case 'howOk': this.save.data.howSeen = true; this.save.persist(); this.resume(); break;
      case 'buy': {
        const g = GEAR.find((x) => x.id === d.id);
        if (g && !this.save.has(g.id) && this.save.data.coins >= g.price) { this.save.data.coins -= g.price; this.save.data.gear.push(g.id); this.save.persist(); }
        this.screens.shop();
        break;
      }
      case 'set': {
        const v = d.v === 'auto' || isNaN(+d.v) ? d.v : +d.v;
        this.save.data.settings[d.k] = v;
        this.save.persist();
        if (d.k === 'quality') this.R.setQuality(this.pickQuality());
        this.applySettings();
        this.screens.settings();
        break;
      }
      case 'double': {
        const r = this.lastResult;
        if (!r || r.doubled) break;
        this.audio.setSuspended(true);
        const ok = await Platform.ads.rewarded();
        this.audio.setSuspended(false);
        if (ok) { r.doubled = true; this.save.data.coins += r.earned; this.save.persist(); r.earned *= 2; }
        r.canDouble = false;
        this.screens.results(r);
        break;
      }
      default: break;
    }
  }
}

// Development check used by tools/test/levels.mjs: is every level solvable?
App.prototype.levels = () => LEVELS;
App.prototype.findPathDbg = findPath;
App.prototype.checkLevels = function () {
  return LEVELS.map((def, i) => {
    const problems = [];
    const L = new Level(def, this.lib, this.R).build();
    for (const d of L.doors) { d.locked = false; } // the lock pick opens everything eventually
    L.computeNav();
    const start = { x: def.start[0], z: def.start[1] };
    if (!L.walkable(Math.floor(start.x), Math.floor(start.z))) problems.push('start is blocked');
    const reach = (pt, r) => {
      // any walkable cell centre within r of the point that has a path from the start
      for (let z = Math.floor(pt.z - r - 1); z <= pt.z + r + 1; z++) for (let x = Math.floor(pt.x - r - 1); x <= pt.x + r + 1; x++) {
        if (!L.walkable(x, z) || Math.hypot(x + 0.5 - pt.x, z + 0.5 - pt.z) > r + 0.35) continue;
        if (findPath(L, start, { x: x + 0.5, z: z + 0.5 })) return true;
      }
      return false;
    };
    for (const l of def.loot || []) {
      const y = L.surfaceY(l.x, l.z);
      if (!reach(l, y > 0.3 ? 1.1 : 0.75)) problems.push(`${l.t} at ${l.x},${l.z} unreachable`);
    }
    const exit = { x: def.exitDoor ? def.exitDoor[0] : def.exit[0], z: def.exitDoor ? def.exitDoor[1] : def.exit[1] };
    if (!reach(exit, 1.0)) problems.push('van unreachable');
    for (const gd of [...(def.guards || []), ...(def.residents || [])]) for (const [x, z] of gd.route || []) if (!L.walkable(Math.floor(x), Math.floor(z))) problems.push(`guard waypoint ${x},${z} blocked`);
    for (const d of L.doors) for (const p of L.props) {
      const c = p.collider; if (!c) continue;
      if (c.x1 > d.x - 0.05 && c.x0 < d.x + 1.05 && c.z1 > d.z - 0.05 && c.z0 < d.z + 1.05) problems.push(`${p.t} blocks door ${d.x},${d.z}`);
    }
    return { i, name: def.name, problems };
  });
};

const app = new App();
window.__tt = app; // handy for tests and debugging in the console
app.boot().catch((e) => {
  console.error(e);
  const l = document.querySelector('#loading p');
  if (l) l.textContent = 'Could not start the game. Please reload.';
});
