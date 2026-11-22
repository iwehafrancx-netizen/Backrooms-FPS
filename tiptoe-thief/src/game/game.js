// One heist: loads a level, owns every actor and runs the rules.
//
// Win:  take every target loot, then reach the getaway van.
// Lose: a guard catches you.
// Stars: 1 for escaping, +1 for taking all the loot, +1 for never being seen.
import * as THREE from 'three';
import { Level } from './level.js';
import { Player } from './player.js';
import { Guard } from './guard.js';
import { SecurityCamera, Laser, Loot } from './security.js';

export class Game {
  constructor(app) {
    this.app = app;
    this.lib = app.lib;
    this.R = app.R;
    this.audio = app.audio;
    this.save = app.save;
    this.hud = app.hud;
    this.t = app.t;
    this.state = 'idle';
  }

  // `quiet` = load as the menu backdrop (no HUD messages)
  load(def, { quiet = false } = {}) {
    this.unload();
    this.def = def;
    this.level = new Level(def, this.lib, this.R).build();
    this.scene = new THREE.Group();
    this.scene.add(this.level.root);
    this.R.scene.add(this.scene);

    this.player = new Player(this);
    this.player.spawn(def.start[0], def.start[1]);
    this.player.coins = 3 + (this.save.has('pouch') ? 3 : 0);
    this.scene.add(this.player.char.root);

    this.guards = [...(def.guards || []).map((g) => new Guard(this, g, 'guard')), ...(def.residents || []).map((g) => new Guard(this, g, 'resident'))];
    for (const g of this.guards) this.scene.add(g.char.root, g.cone);
    this.cameras = (def.cameras || []).map((c) => new SecurityCamera(this, c));
    for (const c of this.cameras) this.scene.add(c.obj, c.cone);
    this.lasers = (def.lasers || []).map((l) => new Laser(this, l));
    for (const l of this.lasers) this.scene.add(l.group);
    this.loot = (def.loot || []).map((l) => new Loot(this, l));
    for (const l of this.loot) this.scene.add(l.obj, l.glow);
    // the getaway van parked outside
    this.van = this.lib.instance('van');
    this.van.position.set(def.exit[0], 0, def.exit[1]);
    this.van.rotation.y = (def.exit[2] || 0) * Math.PI / 2;
    this.scene.add(this.van);
    this.exitPos = new THREE.Vector3(def.exitDoor ? def.exitDoor[0] : def.exit[0], 0, def.exitDoor ? def.exitDoor[1] : def.exit[1]);
    this.exitRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 32), new THREE.MeshBasicMaterial({ color: 0x5cff8a, transparent: true, opacity: 0.6, depthWrite: false }));
    this.exitRing.rotation.x = -Math.PI / 2; this.exitRing.position.set(this.exitPos.x, 0.04, this.exitPos.z);
    this.scene.add(this.exitRing);
    // fuse box and safes are props with an `interact` flag in the manifest
    this.fuses = this.level.props.filter((p) => p.info.interact === 'fuse');
    this.safes = this.level.props.filter((p) => p.info.interact === 'crack').map((p) => ({ prop: p, open: false }));

    this.R.setLamps(this.level.lampPoints.concat(def.lamps || []));
    this.R.follow(this.player.pos, 0, true);
    this.time = 0;
    this.seenThisLevel = false;
    this.alarmT = 0;
    this.marks = [];
    this.state = 'play';
    if (!quiet) this.hud.startLevel(def, this.targetsLeft(), this.player.coins);
  }

  unload() {
    if (this.scene) this.R.scene.remove(this.scene);
    this.scene = null;
    this.hud && this.hud.clearMarks();
  }

  targetsLeft() { return this.loot.filter((l) => l.target && !l.taken).length; }

  update(dt, input) {
    if (this.state !== 'play') return;
    this.time += dt;
    this.audio.listener = this.player.pos;
    if (input.zoom) this.R.zoom(input.zoom);

    // tap/click: walk there (double tap = run)
    if (input.tapAt) {
      const hit = this.R.pickFloor(input.tapAt.x, input.tapAt.y);
      if (hit) { this.player.walkTo(hit, input.run); this.hud.tapMarker(input.tapAt); }
    }
    if (input.action) this.interact();
    if (input.throw) this.throwCoin();

    this.player.update(dt, input);
    this.level.updateDoors(dt);
    for (const g of this.guards) g.update(dt);
    for (const c of this.cameras) c.update(dt);
    for (const l of this.lasers) l.update(dt);
    for (const l of this.loot) l.update(dt);
    this.updateCoins(dt);
    if (this.alarmT > 0) this.alarmT -= dt;

    // context button: what can be used right here?
    this.hud.setAction(this.nearestInteraction());
    this.exitRing.visible = this.targetsLeft() === 0;
    this.exitRing.material.opacity = 0.4 + Math.sin(this.time * 4) * 0.25;
    if (this.state === 'play' && this.targetsLeft() === 0 && this.player.pos.distanceTo(this.exitPos) < 1.1) this.escape();

    this.R.follow(this.player.pos.clone().setY(0.9), dt);
    this.hud.update(this);
  }

  // ------------------------------------------------------------- interaction
  nearestInteraction() {
    const p = this.player;
    if (p.hidden) return { kind: 'unhide' };
    const near = (x, z, r) => Math.hypot(p.pos.x - x, p.pos.z - z) < r;
    for (const s of this.safes) if (!s.open && near(s.prop.x, s.prop.z, 1.3)) return { kind: 'safe', s };
    for (const f of this.fuses) if (!f.off && near(f.x, f.z, 1.3)) return { kind: 'fuse', f };
    for (const d of this.level.doors) if (d.locked && near(d.x + 0.5, d.z + 0.5, 1.3)) return { kind: 'pick', d };
    let best = null, bd = 1.5;
    for (const h of this.level.hideSpots) {
      const c = h.collider || { x0: h.x - 0.3, x1: h.x + 0.3, z0: h.z - 0.3, z1: h.z + 0.3 };
      const nx = Math.max(c.x0, Math.min(p.pos.x, c.x1)), nz = Math.max(c.z0, Math.min(p.pos.z, c.z1));
      const d = Math.hypot(p.pos.x - nx, p.pos.z - nz);
      if (d < bd) { bd = d; best = h; }
    }
    return best ? { kind: 'hide', h: best } : null;
  }

  interact() {
    const it = this.nearestInteraction();
    if (!it) return;
    const p = this.player;
    if (it.kind === 'unhide') p.unhide();
    else if (it.kind === 'hide') p.hide(it.h);
    else if (it.kind === 'fuse') {
      it.f.off = true;
      for (const c of this.cameras) c.power(false);
      for (const l of this.lasers) l.power(false);
      this.audio.play('fuse');
      this.hud.toast(this.t('fuseOff'));
    } else if (it.kind === 'pick' || it.kind === 'safe') {
      // lock pick mini-game; the world keeps running, so pick when it's safe
      const hard = it.kind === 'safe' ? 3 : 2;
      this.hud.lockpick(hard, this.save.has('pick') ? 1.35 : 1, (ok) => {
        if (!ok) { this.noise(p.pos, 3, 'pick'); return; }
        this.audio.play('pick_done');
        if (it.kind === 'pick') { it.d.locked = false; this.level.computeNav(); this.level.openDoor(it.d, p.pos); }
        else { it.s.open = true; for (const l of this.loot) if (l.def.inSafe && Math.hypot(l.def.x - it.s.prop.x, l.def.z - it.s.prop.z) < 1.2) l.reveal(); }
      });
    }
  }

  // ------------------------------------------------------------- noise & alarms
  noise(at, radius, kind) {
    for (const g of this.guards) g.hear(at, radius, kind);
    this.hud.noiseRing(at, radius);
  }

  throwCoin() {
    const p = this.player;
    if (p.coins <= 0 || p.hidden) return;
    p.coins--;
    // throw ~5 m ahead (or toward the last tap), the landing makes the noise
    const dir = p.char.forward();
    const to = p.pos.clone().addScaledVector(dir, 5);
    // stop short of walls
    const step = dir.clone().multiplyScalar(0.25);
    const land = p.pos.clone();
    for (let i = 0; i < 20; i++) { const n = land.clone().add(step); if (!this.level.lineOfSight(land, n)) break; land.copy(n); if (land.distanceTo(p.pos) >= 5) break; }
    void to;
    const coin = this.lib.instance('coin');
    coin.position.copy(p.pos).setY(1.1);
    this.scene.add(coin);
    (this.coinsInAir ||= []).push({ obj: coin, from: coin.position.clone(), to: land.setY(0.02), t: 0 });
    this.audio.play('coin_throw');
    this.hud.setCoins(p.coins);
  }

  updateCoins(dt) {
    if (!this.coinsInAir) return;
    for (const c of this.coinsInAir) {
      c.t += dt / 0.6;
      const k = Math.min(1, c.t);
      c.obj.position.lerpVectors(c.from, c.to, k);
      c.obj.position.y = THREE.MathUtils.lerp(c.from.y, c.to.y, k) + Math.sin(k * Math.PI) * 1.4;
      c.obj.rotation.x += dt * 20;
      if (k >= 1 && !c.landed) { c.landed = true; this.audio.play('coin_land', { at: c.to }); this.noise(c.to, 6.5, 'coin'); setTimeout(() => this.scene && this.scene.remove(c.obj), 4000); }
    }
    this.coinsInAir = this.coinsInAir.filter((c) => !c.landed || c.t < 1.5);
  }

  alarm(at, source) {
    this.seenThisLevel = true;
    if (this.alarmT > 0) return;
    this.alarmT = 6;
    this.audio.play('alarm');
    this.hud.toast(this.t('alarm'), 'bad');
    for (const g of this.guards) { if (g.state === 'sleep') g.wake(); g.investigate(at, 2); }
    void source;
  }

  alertOthers(spotter) {
    // guards in earshot of the shout come running
    for (const g of this.guards) if (g !== spotter && g.state !== 'chase') g.hear(spotter.pos, 8, 'shout');
  }

  mark(guard, sym) { this.hud.mark(guard, sym); }

  // ------------------------------------------------------------- loot & ending
  takeLoot(l) {
    l.taken = true;
    this.scene.remove(l.obj, l.glow);
    this.player.loot += l.value;
    const total = this.loot.reduce((a, x) => a + x.value, 0);
    this.player.char.setSack(this.player.loot / total);
    this.audio.play('loot');
    this.hud.lootPopup(l, this.targetsLeft());
  }

  caught(guard) {
    if (this.state !== 'play') return;
    this.state = 'over';
    this.audio.play('caught');
    this.player.path = null;
    guard.char.faceTowards(this.player.pos.x - guard.pos.x, this.player.pos.z - guard.pos.z, 1, 100);
    setTimeout(() => this.app.levelEnded({ won: false, def: this.def }), 1300);
  }

  escape() {
    this.state = 'over';
    this.audio.play('win');
    const allLoot = this.loot.every((l) => l.taken);
    const stars = 1 + (allLoot ? 1 : 0) + (this.seenThisLevel ? 0 : 1);
    this.player.char.root.visible = false; // hops into the van
    setTimeout(() => this.app.levelEnded({ won: true, def: this.def, stars, cash: this.player.loot, time: this.time, allLoot, unseen: !this.seenThisLevel }), 900);
  }
}
