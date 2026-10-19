import Platform from '@platform';
import { buildAtlas } from './engine/atlas.js';
import { Renderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { Audio } from './audio/audio.js';
import { BLOCKS, TEAM_COLORS } from './engine/blocks.js';
import { itemTiles, ITEMS } from './game/items.js';
import { buildSkyIslands, buildEggIslands } from './game/maps.js';
import { Match } from './game/match.js';
import { REGISTRY } from './game/modes/index.js';
import { Actor } from './game/actor.js';
import { Bot } from './game/bot.js';
import { View } from './game/view.js';
import { eyeHeight } from './game/physics.js';
import { Lobby, MODES, botName } from './game/session.js';
import { Save, SKINS } from './game/save.js';
import { UI } from './ui/ui.js';
import { initIcons, icon } from './ui/icons.js';
import { setLang, t } from './i18n/strings.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

class App {
  async boot() {
    await Platform.init();
    try { Platform.loadingStart(); } catch (e) {}
    this.save = new Save(Platform);
    await this.save.load();
    if (!this.save.data.name) { this.save.data.name = botName(); this.save.persist(); }
    await this.applyLang();
    this.canvas = document.getElementById('view');
    this.R = new Renderer(this.canvas);
    this.atlas = buildAtlas(itemTiles());
    this.R.setAtlas(this.atlas);
    initIcons(this.atlas);
    this.view = new View(this.R, this.atlas);
    this.audio = new Audio();
    this.input = new Input(this.canvas, document.getElementById('ui'));
    this.ui = new UI(document.getElementById('ui'), this);
    this.input.wireTouch(this.ui.buildHud(this.input.touch));
    this.input.onTouch = () => this.ui.setTouch(true);
    this.input.onUnlock = () => { if (this.state === 'play' && !this.ui.panelOpen && !this.spectating && this.me && this.me.alive) this.pause(); };
    const unlock = () => { this.audio.unlock(); if (!this.audio.musicOn && this.save.settings.music > 0) this.audio.startMusic('calm'); };
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, unlock, { capture: true, passive: true });
    this.audio.setVolume(this.save.settings.volume, this.save.settings.music);
    try { this.audio.setMuted(!Platform.isAudioEnabled()); Platform.onAudioEnabledChange((on) => this.audio.setMuted(!on)); } catch (e) {}
    Platform.onPause(() => { this.hidden = true; if (this.state === 'play' && !this.spectating) this.pause(); this.audio.suspend(true); });
    Platform.onResume(() => { this.hidden = false; this.audio.suspend(false); });
    this.pc = { mx: 0, mz: 0, yaw: 0, pitch: 0, jump: false, crouch: false, sprint: false, attack: false, attackPressed: false, use: false, useHeld: false, sel: null };
    this.menuMap = buildSkyIslands(7, 'meadow');
    this.pixel = 1; this.ft = []; this.camEye = 1.62; this.fov = 75; this.orbit = 0; this.useT = 0; this.lastW = -1;
    addEventListener('resize', () => this.resize());
    this.applyQuality();
    this.toMenu();
    this.last = performance.now();
    requestAnimationFrame((n) => this.frame(n));
    window.__vi = this;
    this.maps = { buildSkyIslands, buildEggIslands, ...Object.fromEntries(Object.entries(REGISTRY).map(([k, v]) => [k, (seed, opt) => v.build({ seed, ...opt })])) };
  }

  available(id) { return !!REGISTRY[id] || (id === 'parkour' && !!REGISTRY.race); }

  async applyLang() {
    const s = this.save.settings.lang;
    let l = s;
    if (s === 'auto') { try { l = await Platform.getLanguage(); } catch (e) { l = 'en'; } }
    this.lang = setLang(String(l || 'en').slice(0, 2).toLowerCase());
    document.documentElement.lang = this.lang;
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.R.resize(w, h, this.pixel);
    this.view.vmCam.aspect = w / h; this.view.vmCam.updateProjectionMatrix();
  }
  applyQuality() {
    const q = this.save.settings.quality, dpr = devicePixelRatio || 1;
    this.maxPixel = q === 'low' ? Math.min(dpr, 0.75) : q === 'high' ? Math.min(dpr, 2) : Math.min(dpr, this.input.touch ? 1.25 : 1.5);
    this.pixel = this.maxPixel;
    this.resize();
  }
  adapt(dt) {
    if (this.save.settings.quality !== 'auto' || this.hidden) return;
    this.ft.push(dt);
    if (this.ft.length < 90) return;
    const avg = this.ft.reduce((a, b) => a + b, 0) / this.ft.length;
    this.ft.length = 0;
    if (avg > 0.024 && this.pixel > 0.6) { this.pixel = Math.max(0.6, this.pixel * 0.85); this.resize(); }
    else if (avg < 0.0135 && this.pixel < this.maxPixel) { this.pixel = Math.min(this.maxPixel, this.pixel * 1.1); this.resize(); }
  }

  setScene(map, theme) { this.R.setTheme(theme); this.R.setWorld(map.world); this.bgMap = map; }

  toMenu(screen = 'menu') {
    this.endMatch();
    this.state = 'menu'; this.lobby = null;
    this.ui.hud(false); this.ui.closePanel();
    if (this.bgMap !== this.menuMap) this.setScene(this.menuMap, 'meadow');
    this.screens = [];
    screen === 'modes' ? this.ui.modes() : this.ui.menu();
  }
  endMatch() {
    if (this.m) { try { Platform.gameplayStop(); } catch (e) {} }
    this.m = null; this.me = null; this.spectating = null; this.ui.spectate(null);
    this.view.clear(); this.R.outline.visible = false; this.R.setCrack(0, 0, 0, -1);
    this.input.enable(false); this.input.exitLock(); this.ui.clearTitle();
  }

  startLobby(mode, opts) {
    this.endMatch();
    this.lastMode = mode;
    const d = this.save.data;
    this.lobby = new Lobby(mode, { name: d.name, bot: false, skin: SKINS[d.skin].seed }, opts);
    this.state = 'lobby';
    this.ui.hud(false);
    this.ui.lobby(this.lobby);
    const L = this.lobby;
    setTimeout(() => {
      if (this.lobby !== L) return;
      const mp = L.map;
      L.built = REGISTRY[L.mode.id].build(mp);
      this.setScene(L.built, mp.sky || mp.theme || L.built.theme);
    }, 40);
  }

  startMatch() {
    const L = this.lobby;
    this.lastSolo = 0;
    const mode = REGISTRY[L.mode.id].make({ save: this.save.data, slots: L.slots });
    this.beginMatch(L.built, mode, L.slots, L.mode, 5);
  }

  startSolo(level) {
    this.endMatch();
    this.lastSolo = level; this.lastMode = 'parkour';
    const themes = ['meadow', 'meadow', 'desert', 'snow', 'meadow', 'volcano', 'desert', 'snow', 'meadow', 'volcano'];
    const skies = [0, 0, 0, 0, 'dusk', 'volcano', 0, 0, 'dusk', 'volcano'];
    const th = themes[level - 1], built = REGISTRY.parkour.build({ level, theme: th });
    this.setScene(built, skies[level - 1] || th);
    const d = this.save.data;
    const mode = REGISTRY.parkour.make({ save: d });
    this.beginMatch(built, mode, [{ name: d.name, bot: false, skin: SKINS[d.skin].seed }], { teams: 0 }, 3);
  }

  beginMatch(built, mode, slots, cfg, countdown) {
    const m = new Match(built, mode, { seed: (Math.random() * 1e9) | 0, countdown });
    const actors = slots.map((s, i) => {
      const a = m.add(new Actor({ name: s.name, bot: s.bot, skin: s.skin, team: cfg.teams ? Math.floor(i / (cfg.teamSize || 2)) : -1, local: !s.bot }));
      if (s.bot) new Bot(a, m, s.skill);
      return a;
    });
    const me = actors[0];
    me.autoSwing = true;
    me.ctl = () => this.pc;
    mode.setup(actors);
    this.m = m; this.me = me; this.lobby = null; this.awarded = false; this.lastCd = -1; this.resultT = 0;
    this.pc.yaw = me.yaw; this.pc.pitch = me.pitch;
    this.view.setMatch(m, me);
    this.state = 'play';
    this.ui.show(null); this.ui.hud(true); this.ui.sig = {};
    this.input.enable(true); this.input.requestLock();
    if (m.mode.startTitle) this.ui.title(m.mode.startTitle(me), m.mode.startSub ? m.mode.startSub(me) : '', 3.5, 'team');
    this.audio.setMusicStyle('calm');
    try { Platform.gameplayStart(); } catch (e) {}
  }

  pause() {
    if (this.state !== 'play') return;
    this.state = 'paused';
    this.input.enable(false); this.input.exitLock();
    this.ui.closePanel(); this.ui.pause();
    try { Platform.gameplayStop(); } catch (e) {}
  }
  resume() {
    if (this.state !== 'paused') return;
    this.state = 'play';
    this.ui.show(null);
    this.input.enable(true); this.input.requestLock();
    try { Platform.gameplayStart(); } catch (e) {}
  }

  async ad(kind) {
    this.input.enable(false); this.audio.suspend(true);
    let r = false;
    try { r = kind === 'reward' ? await Platform.ads.rewarded() : await Platform.ads.midgame(); } catch (e) {}
    if (!this.hidden) this.audio.suspend(false);
    return r;
  }

  async act(a, d) {
    this.audio.unlock(); this.audio.click();
    switch (a) {
      case 'menu': this.ui.menu(); break;
      case 'modes':
        if (this.state === 'results') { this.state = 'busy'; await this.ad('mid'); }
        this.toMenu('modes'); break;
      case 'mode': if (d.mode === 'parkour') this.ui.parkourPick(); else this.startLobby(d.mode); break;
      case 'pkSolo': this.ui.parkourLevels(this.save.data.parkour); break;
      case 'pkBack': this.ui.parkourPick(); break;
      case 'pkLevels':
        if (this.state === 'busy') break;
        if (this.state === 'results') { this.state = 'busy'; await this.ad('mid'); }
        this.toMenu('modes'); this.ui.parkourLevels(this.save.data.parkour); break;
      case 'pkRace': this.startLobby('race'); break;
      case 'level': this.startSolo(+d.level); break;
      case 'nextLevel':
        if (this.state === 'busy') break;
        this.state = 'busy'; await this.ad('mid');
        this.startSolo(this.lastResult.next); break;
      case 'cancelLobby': this.lobby = null; this.toMenu('modes'); break;
      case 'skins': case 'settings': case 'howto':
        this.screens.push(this.ui.screen);
        this.ui[a](); break;
      case 'back': {
        const prev = this.screens.pop();
        if (this.state === 'paused') this.ui.pause();
        else if (prev === 'modes') this.ui.modes(); else this.ui.menu();
        break;
      }
      case 'set': this.setSetting(d.k, d.v === 'true' ? true : d.v === 'false' ? false : d.v); this.ui.settings(); break;
      case 'equip': this.save.data.skin = +d.id; this.save.persist(); this.ui.skins(); break;
      case 'buySkin': {
        const s = SKINS[+d.id], sd = this.save.data;
        if (sd.coins >= s.price && !sd.owned.includes(s.id)) { sd.coins -= s.price; sd.owned.push(s.id); sd.skin = s.id; this.save.persist(); this.audio.levelUp(); }
        this.ui.skins(); break;
      }
      case 'again':
        if (this.state === 'busy') break;
        this.state = 'busy'; await this.ad('mid');
        if (this.lastSolo) this.startSolo(this.lastSolo); else this.startLobby(this.lastMode); break;
      case 'double': {
        const ok = await this.ad('reward');
        if (ok && this.lastResult && !this.lastResult.doubled) { this.lastResult.doubled = true; this.save.data.coins += this.lastResult.coins; this.lastResult.coins *= 2; this.save.persist(); this.audio.levelUp(); }
        if (this.state === 'results') this.ui.results(this.lastResult);
        break;
      }
      case 'spectate': this.startSpectate(); break;
      case 'pause': if (this.state === 'play' && !this.spectating) this.pause(); break;
      case 'resume': this.resume(); break;
      case 'leave': this.toMenu(); break;
      case 'sel': if (this.me) { this.me.sel = +d.i; this.me.mine = null; } break;
      case 'closePanel': this.closePanel(); break;
      case 'take': if (this.chest && this.m.takeFromChest(this.me, this.chest, +d.i)) this.ui.chest(this.chest, this.me); break;
      case 'takeAll': if (this.chest) { this.m.takeAll(this.me, this.chest); this.ui.chest(this.chest, this.me); } break;
      case 'shopCat': this.ui.shopCat = d.c; this.ui.shop(this.me, this.m.mode); break;
      case 'buy':
        if (this.m && this.m.mode.buy(this.me, d.id)) { this.audio.pickup(); this.ui.shop(this.me, this.m.mode); }
        else { this.audio.beep(false); this.ui.toast(t('notEnough'), 'bad'); }
        break;
    }
  }

  setSetting(k, v) {
    const s = this.save.settings;
    s[k] = v;
    if (k === 'volume' || k === 'music') { this.audio.setVolume(s.volume, s.music); if (k === 'music' && v > 0 && this.audio.ctx && !this.audio.musicOn) this.audio.startMusic('calm'); if (k === 'music' && v === 0) this.audio.stopMusic(); }
    if (k === 'quality') this.applyQuality();
    if (k === 'lang') this.applyLang().then(() => { this.ui.settings(); this.relabel(); });
    this.save.persist();
  }
  relabel() {
    const H = this.ui.h;
    H.lock.textContent = t('clickToPlay');
    const b = H.spec.querySelectorAll('button'); b[0].textContent = t('playAgain'); b[1].textContent = t('leave');
  }

  openChest(chest) { this.chest = chest; this.ui.chest(chest, this.me); this.input.enable(false); this.input.exitLock(); }
  openShop() { this.ui.shop(this.me, this.m.mode); this.input.enable(false); this.input.exitLock(); }
  closePanel() {
    if (!this.ui.panelOpen) return;
    this.ui.closePanel(); this.chest = null;
    if (this.state === 'play') { this.input.enable(true); this.input.requestLock(); }
  }

  updatePlayer(dt, inp) {
    const me = this.me, c = this.pc, s = this.save.settings;
    c.mx = c.mz = 0; c.jump = c.crouch = c.sprint = c.attack = c.attackPressed = c.use = c.useHeld = false; c.sel = null;
    if (!me.alive || this.ui.panelOpen) return;
    const k = 0.0022 * s.sens;
    me.yaw -= inp.lookX * k;
    me.pitch = clamp(me.pitch - inp.lookY * k * (s.invert ? -1 : 1), -1.55, 1.55);
    c.yaw = me.yaw; c.pitch = me.pitch;
    if (inp.sel != null) { me.sel = inp.sel; me.mine = null; }
    if (inp.wheel) { me.sel = (((me.sel + inp.wheel) % 9) + 9) % 9; me.mine = null; }
    const now = performance.now() / 1000;
    if (inp.pressed.has('KeyW')) { if (now - this.lastW < 0.3) this.sprintLatch = true; this.lastW = now; }
    if (inp.my <= 0.1) this.sprintLatch = false;
    const sy = Math.sin(me.yaw), cy = Math.cos(me.yaw);
    c.mx = -sy * inp.my + cy * inp.mx;
    c.mz = -cy * inp.my - sy * inp.mx;
    c.jump = inp.jump; c.crouch = inp.crouch; c.sprint = (inp.sprint || this.sprintLatch) && inp.my > 0.1;
    c.attack = inp.attack; c.attackPressed = inp.attackPressed;
    c.use = inp.use; c.useHeld = inp.useHeld;
    const held = me.held();
    if (inp.useHeld && held && held.kind === 'block') { this.useT += dt; if (this.useT > 0.24) { this.useT = 0; c.use = true; } } else this.useT = 0;
    if (inp.use) this.useT = 0;
  }

  startSpectate() {
    if (!this.m) return;
    this.state = 'play';
    this.ui.show(null); this.ui.hud(true);
    this.pickSpecTarget();
    this.input.enable(false); this.input.exitLock();
  }
  pickSpecTarget() {
    const alive = this.m.actors.filter((a) => a.alive && a !== this.me);
    this.spectating = alive.sort((a, b) => b.kills - a.kills)[0] || null;
    this.view.thirdPerson = false;
    this.ui.spectate(this.spectating ? this.spectating.name : null);
  }

  showResults() {
    const m = this.m, me = this.me;
    if (!m) return;
    if (!this.awarded) {
      this.awarded = true;
      const res = m.mode.result(me);
      const win = res.win, rank = res.rank;
      const coins = 10 + me.kills * 5 + (res.coins || 0) + (win ? 50 : rank <= 3 ? 15 : 0);
      const xp = 25 + me.kills * 15 + (res.xp || 0) + (win ? 60 : 0);
      const d = this.save.data;
      d.coins += coins; d.stats.games++; d.stats.kills += me.kills; d.stats.deaths += me.deaths; d.stats.eggs += me.eggs || 0; if (win) d.stats.wins++;
      if (res.save) res.save(d);
      const up = this.save.addXp(xp);
      this.save.persist();
      if (up) { this.audio.levelUp(); this.ui.toast(t('levelUp'), 'gold'); }
      if (win) { try { Platform.happytime(); } catch (e) {} }
      this.lastResult = { win, coins, xp, kills: me.kills, sub: res.sub, title: res.title, stat: res.stat, stars: res.stars, time: res.time, next: res.next, solo: !!this.lastSolo };
    }
    const r = this.lastResult;
    r.canDouble = (() => { try { return Platform.ads.canReward(); } catch (e) { return false; } })();
    r.canSpectate = !m.over && m.actors.some((a) => a.alive && a !== me);
    this.state = 'results';
    this.spectating = null; this.ui.spectate(null);
    this.ui.closePanel(); this.ui.hud(false); this.ui.clearTitle();
    this.input.enable(false); this.input.exitLock();
    this.ui.results(r);
    try { Platform.gameplayStop(); } catch (e) {}
  }

  events() {
    const m = this.m, me = this.me, A = this.audio, V = this.view, ui = this.ui;
    const pos = (a) => a && a.pos;
    for (const e of m.events) {
      switch (e.t) {
        case 'swing': if (e.a !== me) A.swing(pos(e.a)); break;
        case 'dig': A.block(BLOCKS[e.id].sound, 'dig', { x: e.x + 0.5, y: e.y + 0.5, z: e.z + 0.5 }); break;
        case 'break': A.block(BLOCKS[e.id].sound, 'break', { x: e.x + 0.5, y: e.y + 0.5, z: e.z + 0.5 }); V.burst(e.x, e.y, e.z, e.id); break;
        case 'place': A.block(BLOCKS[e.id].sound, 'place', { x: e.x + 0.5, y: e.y + 0.5, z: e.z + 0.5 }); break;
        case 'hurt':
          if (e.a === me) { A.hurt(true); ui.hurtFlash(); this.shake = 0.25; }
          else { A.hit(pos(e.a), e.crit); if (e.crit) V.sparks(e.a.pos.x, e.a.pos.y + 1.4, e.a.pos.z, 0xfff0a0, 10); if (e.by === me) this.hitmark = 0.15; }
          break;
        case 'kill': {
          const a = e.a, by = e.by;
          const how = e.cause === 'void' ? 'fell' : e.cause === 'border' ? 'border' : 'diedMsg';
          ui.feed(by ? `${ui.name(by, me)} <img class="pix" src="${icon(101)}"> ${ui.name(a, me)}${e.cause === 'void' ? ' <span class="void">▼</span>' : ''}` : `${ui.name(a, me)} <span>${t(how)}</span>`);
          if (by === me) { A.kill(); ui.toast(t('kill1'), 'kill'); }
          if (a === me) { A.death(); this.deathT = 0; this.deathYaw = me.yaw; }
          else if (Math.hypot(a.pos.x - me.pos.x, a.pos.z - me.pos.z) < 30) A.hurt(false);
          if (a === this.spectating) setTimeout(() => this.spectating && !this.spectating.alive && this.pickSpecTarget(), 1200);
          break;
        }
        case 'eat': if (e.a === me) A.eat(); break;
        case 'chest': if (e.a === me) this.openChest(e.chest); break;
        case 'npc': if (e.a === me) this.openShop(); break;
        case 'throw': A.throwS(); break;
        case 'warp': A.warp(); break;
        case 'pickup': if (e.a === me) A.pickup(); break;
        case 'refill': ui.toast(t('refilled'), 'gold'); A.beep(true); break;
        case 'border': ui.toast(t('borderMsg'), 'bad'); A.beep(false); A.setMusicStyle('tense'); break;
        case 'egg': {
          A.egg(m.mode.teams[e.team].egg);
          if (e.team === me.team) ui.title(t('yourEgg'), t('noRespawn'), 3.5, 'bad');
          else ui.toast(t('eggGone', { team: t('team_' + e.team) }), 'bad');
          break;
        }
        case 'notice': {
          if (e.big) ui.title(e.text, '', 3, e.team === me.team ? 'go' : 'bad'); else ui.toast(e.text, e.cls || '');
          if (e.sound === 'win') { if (e.team === me.team) A.win(); else A.beep(false); } else if (e.sound === 'egg') A.egg(me.pos); else if (e.sound) A.beep(e.sound === 'hi');
          break;
        }
        case 'trap': A.trap(); V.sparks(e.x + 0.5, e.y + 1.2, e.z + 0.5, 0xff5a30, 30); if (me.role === 'runner' && Math.abs(e.x - me.pos.x) < 12) this.shake = 0.18; break;
        case 'cpback': A.beep(false); break;
        case 'taunt': A.taunt(pos(e.a) || e); V.sparks(e.x, e.y + 0.9, e.z, e.pulse ? 0xff4040 : 0xffd84a, e.pulse ? 14 : 26); if (e.a !== me && !e.pulse && me.role === 'hider') ui.toast(t('hiderTaunted', { name: e.a.name }), ''); break;
        case 'voidrise': ui.toast(t('voidRise'), 'bad'); A.beep(false); break;
        case 'sudden': ui.toast(t('sudden'), 'bad'); A.setMusicStyle('tense'); break;
        case 'teamout': ui.feed(`<b style="color:${TEAM_COLORS[e.team].hex}">${t('teamOut', { team: t('team_' + e.team) })}</b>`); break;
        case 'respawning': if (e.a === me) ui.title(t('died'), t('respawnIn', { n: 5 }), 0, 'bad'); break;
        case 'respawn': if (e.a === me) { ui.clearTitle(); me.pitch = -0.1; } break;
        case 'start': ui.title(t('go'), '', 1.2, 'go'); A.beep(true); break;
        case 'over': {
          const win = m.mode.result(me).win;
          if (win) A.win();
          const big = win ? t('victory') : m.mode.winnerText ? m.mode.winnerText(e.winner) : t('gameOver');
          if (this.state === 'play') ui.title(big, '', 3, win ? 'go' : '');
          this.resultT = 3;
          break;
        }
      }
    }
    m.events.length = 0;
  }

  steps() {
    const m = this.m;
    for (const a of m.actors) {
      if (!a.alive || !a.onGround || a.moveAmt < 1 || a.crouch) continue;
      const st = Math.floor(a.walkPhase / Math.PI);
      if (a._st === st) continue;
      a._st = st;
      const id = m.world.get(Math.floor(a.pos.x), Math.floor(a.pos.y - 0.1), Math.floor(a.pos.z));
      if (id && BLOCKS[id]) this.audio.block(BLOCKS[id].sound, 'step', a.pos);
    }
  }

  camera(dt, inp) {
    if (this.camHold) return;
    const cam = this.R.camera, s = this.save.settings;
    let fov = s.fov;
    if (this.m && this.me && this.state !== 'lobby') {
      const me = this.me, m = this.m;
      const sp = this.spectating;
      if (sp && sp.alive) {
        const yaw = sp.yaw;
        const hx = sp.pos.x, hy = sp.pos.y + 1.6, hz = sp.pos.z;
        let dx = Math.sin(yaw) * 4.2, dy = 1.4, dz = Math.cos(yaw) * 4.2;
        const dl = Math.hypot(dx, dy, dz);
        const hit = m.world.raycast(hx, hy, hz, dx / dl, dy / dl, dz / dl, dl, (id) => id && BLOCKS[id].solid);
        const k0 = hit ? Math.max(0.15, (hit.t - 0.3) / dl) : 1;
        const tx = hx + dx * k0, ty = hy + dy * k0, tz = hz + dz * k0;
        const k = hit ? 1 : Math.min(1, dt * 5);
        cam.position.x += (tx - cam.position.x) * k; cam.position.y += (ty - cam.position.y) * k; cam.position.z += (tz - cam.position.z) * k;
        cam.lookAt(sp.pos.x, sp.pos.y + 1.4, sp.pos.z);
      } else if (me.alive && this.view.thirdPerson) {
        const yaw = me.yaw, p = me.pitch, hx = me.pos.x, hy = me.pos.y + (me.disguise ? 1.1 : 1.6), hz = me.pos.z;
        const fx = -Math.sin(yaw) * Math.cos(p), fy = Math.sin(p), fz = -Math.cos(yaw) * Math.cos(p), dist = me.disguise ? 3.6 : 4.2;
        const hit = m.world.raycast(hx, hy, hz, -fx, -fy, -fz, dist, (id) => id && BLOCKS[id].solid);
        const k = hit ? Math.max(0.6, hit.t - 0.25) : dist;
        cam.position.set(hx - fx * k, hy - fy * k, hz - fz * k);
        cam.rotation.set(p, yaw, 0, 'YXZ');
      } else if (me.alive || this.deathT < 0.01) {
        this.camEye += (eyeHeight(me) - this.camEye) * Math.min(1, dt * 14);
        let bob = 0;
        if (s.viewBob && me.onGround) bob = Math.abs(Math.sin(me.walkPhase)) * 0.045 * Math.min(1, me.moveAmt / 4.3);
        cam.position.set(me.pos.x, me.pos.y + this.camEye + bob, me.pos.z);
        this.shake = Math.max(0, (this.shake || 0) - dt);
        cam.rotation.set(me.pitch, me.yaw, this.shake * Math.sin(m.time * 60) * 0.06, 'YXZ');
        if (me.sprint && me.moveAmt > 4.5) fov += 8;
      } else {
        this.deathT += dt;
        cam.position.y += (me.pos.y + 0.4 - cam.position.y) * Math.min(1, dt * 3);
        cam.rotation.set(Math.min(-0.2, -this.deathT * 0.3), this.deathYaw, Math.min(0.5, this.deathT), 'YXZ');
      }
    } else {
      const map = this.bgMap || this.menuMap;
      this.orbit += dt * 0.05;
      const r = (map.radius || 60) * (map === this.menuMap ? 1.05 : 1.15);
      cam.position.set(Math.cos(this.orbit) * r, map.top + r * 0.42, Math.sin(this.orbit) * r);
      cam.lookAt(0, map.top - 4, 0);
    }
    this.fov += (fov - this.fov) * Math.min(1, dt * 8);
    if (Math.abs(cam.fov - this.fov) > 0.05) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
  }

  overlays() {
    const R = this.R, me = this.me, m = this.m;
    let show = false;
    if (m && me && me.alive && !this.spectating && this.state === 'play' && !this.ui.panelOpen) {
      const bh = m.lookHit(me);
      if (bh && !m.lookActor(me)) {
        show = true;
        R.outline.position.set(bh.x + 0.5, bh.y + 0.5, bh.z + 0.5);
        if (me.mine && me.mine.x === bh.x && me.mine.y === bh.y && me.mine.z === bh.z) R.setCrack(bh.x, bh.y, bh.z, Math.floor((me.mine.p / me.mine.need) * 4));
        else R.setCrack(0, 0, 0, -1);
      }
    }
    R.outline.visible = show;
    if (!show) R.setCrack(0, 0, 0, -1);
  }

  frame(now) {
    requestAnimationFrame((n) => this.frame(n));
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const inp = this.input.sample();
    const m = this.m, me = this.me;
    if (this.lobby && this.state === 'lobby') {
      this.lobby.update(dt);
      this.ui.updateLobby(this.lobby);
      if (this.lobby.state === 'countdown' && this.lobby.built) { const n = Math.ceil(this.lobby.cd); if (n !== this.lobbyBeep) { this.lobbyBeep = n; this.audio.beep(false); } }
      if (this.lobby.state === 'go' && this.lobby.built) this.startMatch();
    }
    if (m && (this.state === 'play' || this.state === 'results' || this.state === 'busy')) {
      if (this.state === 'play' && !this.spectating) {
        this.updatePlayer(dt, inp);
        if (this.ui.panelOpen && (inp.pressed.has('Escape') || inp.pressed.has('KeyE'))) this.closePanel();
        if (this.ui.panelOpen && (!me.alive || (this.chest && Math.hypot(this.chest.x + 0.5 - me.pos.x, this.chest.z + 0.5 - me.pos.z) > 6))) this.closePanel();
      } else this.updatePlayer(dt, { lookX: 0, lookY: 0, mx: 0, my: 0, pressed: new Set() });
      if (this.state === 'play' && inp.pressed.has('Escape') && !this.input.locked && !this.ui.panelOpen && me.alive) this.pause();
      if (this.state === 'play' && inp.pressed.has('KeyV')) this.tp = !this.tp;
      this.view.thirdPerson = !!(me.alive && !this.spectating && (me.disguise || this.tp));
      m.update(dt);
      if (m.state === 'countdown') { const n = Math.ceil(m.countdown); if (n !== this.lastCd && n > 0) { this.lastCd = n; this.audio.beep(false); if (this.state === 'play') this.ui.title(String(n), '', 0.9, 'count'); } }
      this.events();
      this.steps();
      if (!me.alive && me.respawnT > 0 && this.state === 'play') { const n = Math.ceil(me.respawnT); if (n !== this.respN) { this.respN = n; this.ui.title(t('died'), t('respawnIn', { n }), 0, 'bad'); } }
      if (!me.alive && me.eliminated && !this.awarded && this.state === 'play') { this.elimT = (this.elimT || 0) + dt; if (this.elimT > 2) { this.elimT = 0; this.showResults(); } }
      if (m.over && this.resultT > 0) { this.resultT -= dt; if (this.resultT <= 0 && this.state === 'play') this.showResults(); }
    }
    this.camera(dt, inp);
    this.audio.listener = this.R.camera.position;
    if (m && me) {
      this.view.update(dt, this.R.camera);
      this.overlays();
      if (this.state === 'play') {
        this.ui.updateHud(m, me, this.view);
        const lockNeeded = !this.input.touch && !this.input.locked && !this.ui.panelOpen && !this.spectating && me.alive;
        this.ui.lockHint(lockNeeded);
        if (this.hitmark > 0) { this.hitmark -= dt; this.ui.h.xhair.classList.toggle('hit', this.hitmark > 0); }
      }
    }
    this.R.flush(this.state === 'play' ? 4 : 16);
    this.R.render(dt);
    if (m && me && me.alive && !this.spectating && this.state === 'play' && !this.view.thirdPerson) {
      this.view.updateViewmodel(dt, me, inp);
      const r = this.R.renderer;
      r.autoClear = false; r.clearDepth(); r.render(this.view.vmScene, this.view.vmCam); r.autoClear = true;
    }
    this.adapt(dt);
    if (!this.firstFramed) { this.firstFramed = true; try { Platform.firstFrame(); Platform.gameReady(); } catch (e) {} }
  }
}

new App().boot();
