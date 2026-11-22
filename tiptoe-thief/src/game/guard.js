// Guards and residents.
//
// State machine:
//   patrol   - walk the route, pause at waypoints and look around
//   sleep    - residents only: lying in bed until a noise is close enough
//   suspect  - "?" : something was glimpsed or heard; turn to it and go and check
//   chase    - "!" : the thief is in sight; run after them, catching = level over
//   search   - lost the thief: look around the last known spot, then go back
// Eyesight is a cone (shown on the floor) blocked by walls, closed doors and
// tall furniture. A suspicion meter fills while the thief is visible - faster
// when close or running - so a quick dash past the edge of a cone can work.
import * as THREE from 'three';
import { Character } from './characters.js';
import { findPath } from './nav.js';

const WALK = 1.35, CHASE = 3.6, CATCH_DIST = 0.75;

export class Guard {
  constructor(game, def, kind = 'guard') {
    this.game = game;
    this.def = def;
    this.kind = kind;
    this.char = new Character(game.lib, kind === 'resident' ? 'resident' : 'guard');
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    this.route = (def.route || []).map(([x, z, wait = 1.5]) => ({ p: new THREE.Vector3(x, 0, z), wait }));
    this.ri = 0;
    this.state = kind === 'resident' ? 'sleep' : 'patrol';
    this.sightRange = def.range || (kind === 'resident' ? 5.5 : 7);
    this.fov = THREE.MathUtils.degToRad(def.fov || 72);
    this.suspicion = 0;
    this.path = null; this.repathT = 0; this.waitT = 0; this.searchT = 0;
    this.lastSeen = new THREE.Vector3();
    this.char.root.position.copy(this.pos);
    if (def.face != null) this.char.root.rotation.y = def.face * Math.PI / 2;
    this.cone = this.makeCone();
    if (this.state === 'sleep') { this.cone.visible = false; this.bed = def.bed; }
  }

  // Translucent fan on the floor that shows what this guard can see.
  makeCone() {
    const segs = 28, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((segs + 2) * 3), 3));
    const idx = []; for (let i = 1; i <= segs; i++) idx.push(0, i + 1, i);
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff1a0, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 2; m.frustumCulled = false; m.segs = segs;
    return m;
  }

  // Rebuild the fan, cut short where walls block the view (cheap ray steps).
  updateCone() {
    const L = this.game.level, pos = this.cone.geometry.attributes.position, segs = this.cone.segs;
    const eye = this.pos, yaw = this.char.yaw;
    pos.setXYZ(0, eye.x, 0.03, eye.z);
    for (let i = 0; i <= segs; i++) {
      const a = yaw - this.fov / 2 + (this.fov * i) / segs;
      const dx = -Math.sin(a), dz = -Math.cos(a);
      let r = 0.3;
      const tmp = { x: 0, z: 0 };
      while (r < this.sightRange) {
        tmp.x = eye.x + dx * r; tmp.z = eye.z + dz * r;
        if (blockedForEyes(L, tmp.x, tmp.z)) break;
        r += 0.25;
      }
      pos.setXYZ(i + 1, eye.x + dx * r, 0.03, eye.z + dz * r);
    }
    pos.needsUpdate = true;
    const col = this.state === 'chase' ? 0xff3b30 : this.state === 'suspect' || this.state === 'search' ? 0xffa53a : 0xfff1a0;
    this.cone.material.color.set(col);
    this.cone.material.opacity = this.state === 'chase' ? 0.42 : 0.3;
  }

  // Can this guard see the thief right now?
  canSee(p) {
    if (this.state === 'sleep') return false;
    const pl = p.pos;
    const dx = pl.x - this.pos.x, dz = pl.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d > this.sightRange) return false;
    // a hidden thief is invisible - unless this guard is chasing and watched them hide
    if (p.hidden && !(this.state === 'chase' && this.sawHide)) return false;
    if (d > 0.9) {
      const ang = Math.atan2(-dx, -dz) - this.char.yaw;
      if (Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang))) > this.fov / 2) return false;
    }
    return this.game.level.lineOfSight(this.pos, pl);
  }

  // A noise of `radius` metres happened at `at` (running steps, coins, alarms).
  hear(at, radius, kind) {
    const d = Math.hypot(at.x - this.pos.x, at.z - this.pos.z);
    // walls muffle sounds a lot
    const heard = this.game.level.lineOfSight(this.pos, at) ? radius : radius * 0.55;
    if (d > heard) return;
    if (this.state === 'chase') return;
    if (this.state === 'sleep') { this.wake(); }
    this.investigate(at, kind === 'alarm' ? 2 : 1);
  }

  wake() {
    this.state = 'suspect';
    this.cone.visible = true;
    // get out of bed beside it
    this.pos.set(this.def.wakeX ?? this.pos.x + 1, 0, this.def.wakeZ ?? this.pos.z);
    this.game.level.collide(this.pos, 0.3);
    this.game.mark(this, '?');
    this.game.audio.play('guard_huh', { at: this.pos });
  }

  investigate(at, urgency = 1) {
    this.state = 'suspect';
    this.target = at.clone ? at.clone() : new THREE.Vector3(at.x, 0, at.z);
    this.path = findPath(this.game.level, this.pos, this.target);
    this.waitT = 0;
    this.urgency = urgency;
    this.game.mark(this, '?');
    this.game.audio.play('guard_huh', { at: this.pos, volume: 0.8 });
  }

  update(dt) {
    const g = this.game, p = g.player;
    let speed = 0, mode = 'walk';

    if (this.state === 'sleep') {
      this.char.update(dt, 0, 'sleep');
      this.char.root.position.copy(this.pos);
      return;
    }

    // --- eyes
    const sees = this.canSee(p);
    if (sees) {
      const d = this.pos.distanceTo(p.pos);
      // closer, running or in a lit room = noticed faster
      const rate = (1.6 - d / this.sightRange) * (p.speed > 2.5 ? 2.2 : 1) * (this.state === 'suspect' ? 1.6 : 1);
      this.suspicion = Math.min(1, this.suspicion + dt * rate * 1.1);
      this.lastSeen.copy(p.pos);
      g.seenThisLevel = true;
      if (this.suspicion >= 1 && this.state !== 'chase') this.startChase();
      else if (this.state === 'patrol' && this.suspicion > 0.35) this.investigate(p.pos);
    } else this.suspicion = Math.max(0, this.suspicion - dt * 0.25);
    if (this.state === 'chase' && sees && p.hidden == null) this.sawHide = true;
    if (this.state === 'chase' && !sees) this.sawHide = this.sawHide && p.hidden != null;

    // --- behaviour
    if (this.state === 'patrol') {
      if (!this.route.length) { mode = 'look'; this.lookAround(dt); }
      else if (this.waitT > 0) { this.waitT -= dt; mode = 'look'; this.lookAround(dt); }
      else {
        const wp = this.route[this.ri];
        if (!this.path) this.path = findPath(g.level, this.pos, wp.p) || [];
        speed = this.followPath(dt, WALK);
        if (!this.path.length) { this.waitT = wp.wait; this.ri = (this.ri + 1) % this.route.length; this.path = null; }
      }
    } else if (this.state === 'suspect') {
      if (this.path && this.path.length) speed = this.followPath(dt, WALK * (this.urgency > 1 ? 1.8 : 1.15));
      else {
        mode = 'look';
        this.lookAround(dt);
        this.waitT += dt;
        if (this.waitT > 3.2) this.backToPatrol();
      }
    } else if (this.state === 'chase') {
      this.repathT -= dt;
      const goal = sees ? p.pos : this.lastSeen;
      if (this.repathT <= 0 || !this.path) { this.repathT = 0.35; this.path = findPath(g.level, this.pos, goal) || []; }
      speed = this.followPath(dt, CHASE);
      mode = 'run';
      if (sees && this.pos.distanceTo(p.pos) < CATCH_DIST && (!p.hidden || this.sawHide)) g.caught(this);
      if (!sees) { this.lostT = (this.lostT || 0) + dt; if (this.lostT > 1.2 && !this.path.length) { this.state = 'search'; this.searchT = 6; g.mark(this, '?'); } }
      else this.lostT = 0;
    } else if (this.state === 'search') {
      this.searchT -= dt;
      if (!this.path || !this.path.length) {
        // wander to random spots near where the thief vanished
        const r = this.lastSeen.clone().add(new THREE.Vector3((Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5));
        this.path = findPath(g.level, this.pos, r) || [];
        if (!this.path.length) { mode = 'look'; this.lookAround(dt); }
      }
      speed = this.followPath(dt, WALK * 1.4);
      if (this.searchT <= 0) this.backToPatrol();
    }

    this.char.update(dt, speed, speed > 2.5 ? 'run' : mode === 'look' && speed < 0.05 ? 'look' : 'walk');
    this.char.root.position.copy(this.pos);
    this.updateCone();
  }

  startChase() {
    this.state = 'chase';
    this.path = null;
    this.game.mark(this, '!');
    this.game.audio.play('guard_alert', { at: this.pos });
    this.game.alertOthers(this);
  }

  backToPatrol() {
    this.state = this.kind === 'resident' && this.def.sleepAgain ? 'sleep' : 'patrol';
    this.path = null; this.waitT = 0; this.suspicion = 0;
  }

  lookAround(dt) {
    this.lookPhase = (this.lookPhase || 0) + dt;
    // turn the whole body slowly left and right so the cone sweeps the room
    this.char.root.rotation.y += Math.sin(this.lookPhase * 0.9) * dt * 0.9;
  }

  followPath(dt, speed) {
    if (!this.path || !this.path.length) return 0;
    const wp = this.path[0];
    const dx = wp.x - this.pos.x, dz = wp.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.15) { this.path.shift(); return speed; }
    const step = Math.min(d, speed * dt);
    this.pos.x += (dx / d) * step; this.pos.z += (dz / d) * step;
    // guards open doors in their way too
    const door = this.game.level.doorAt(Math.floor(this.pos.x + (dx / d) * 0.5), Math.floor(this.pos.z + (dz / d) * 0.5));
    if (door && door.target === 0 && !door.locked) { this.game.level.openDoor(door, this.pos); this.game.audio.play('door_open', { at: this.pos, volume: 0.5 }); }
    this.game.level.collide(this.pos, 0.3);
    this.char.faceTowards(dx, dz, dt, 7);
    return speed;
  }
}

// Eyes stop at walls, closed doors and tall furniture.
function blockedForEyes(L, x, z) {
  for (const c of L.colliders) {
    if (!c.tall || c.active === false) continue;
    if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return true;
  }
  return false;
}
