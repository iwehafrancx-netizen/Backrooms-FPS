// Tip, the thief. Moves by tap-to-walk (A* path) or direct steering, sneaks by
// default (quiet), runs on demand (fast but noisy), and can hide in furniture.
import * as THREE from 'three';
import { Character } from './characters.js';
import { findPath } from './nav.js';

export const SNEAK_SPEED = 2.0;
export const RUN_SPEED = 4.3;
export const RADIUS = 0.28;

export class Player {
  constructor(game) {
    this.game = game;
    this.char = new Character(game.lib, 'thief');
    this.pos = new THREE.Vector3();
    this.path = null;
    this.running = false;
    this.hidden = null; // the hide spot we are in, if any
    this.speed = 0;
    this.stepT = 0;
    this.loot = 0;
    this.coins = 3; // throwable coins this level
  }

  spawn(x, z) {
    this.pos.set(x, 0, z);
    this.char.root.position.copy(this.pos);
    this.path = null; this.hidden = null; this.loot = 0;
    this.char.root.visible = true;
    this.char.setSack(0);
  }

  walkTo(target, run) {
    if (this.hidden) this.unhide();
    this.path = findPath(this.game.level, this.pos, target);
    this.running = !!run;
    return !!this.path;
  }

  hide(spot) {
    this.hidden = spot;
    this.path = null;
    this.char.root.visible = spot.info.hide === 'behind'; // behind a plant/sofa you are still drawn, just crouched
    // step into the spot so it reads clearly on screen
    const c = spot.collider || { x0: spot.x, x1: spot.x, z0: spot.z, z1: spot.z };
    if (spot.info.hide !== 'behind') this.pos.set((c.x0 + c.x1) / 2, 0, (c.z0 + c.z1) / 2);
    this.game.audio.play('hide');
  }

  unhide() {
    const spot = this.hidden;
    this.hidden = null;
    this.char.root.visible = true;
    if (spot && spot.info.hide !== 'behind') {
      // step out in front of the furniture (its front faces -Z before rotation)
      const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), (spot.r || 0) * Math.PI / 2);
      const c = spot.collider;
      const half = Math.max(c.x1 - c.x0, c.z1 - c.z0) / 2;
      this.pos.set((c.x0 + c.x1) / 2 + fwd.x * (half * 0.6 + 0.5), 0, (c.z0 + c.z1) / 2 + fwd.z * (half * 0.6 + 0.5));
      this.game.level.collide(this.pos, RADIUS);
    }
  }

  update(dt, input) {
    const L = this.game.level;
    if (this.hidden) {
      this.speed = 0;
      this.char.update(dt, 0, 'sneak');
      if (Math.hypot(input.move.x, input.move.z) > 0.3) this.unhide();
      this.char.root.position.copy(this.pos);
      return;
    }
    let vx = 0, vz = 0;
    const direct = Math.hypot(input.move.x, input.move.z);
    if (direct > 0.15) {
      // direct control: camera looks north, so screen up = -Z
      this.path = null;
      const k = Math.min(1, direct);
      this.running = input.run;
      const sp = (this.running ? RUN_SPEED : SNEAK_SPEED) * k;
      vx = (input.move.x / direct) * sp; vz = (input.move.z / direct) * sp;
    } else if (this.path && this.path.length) {
      const wp = this.path[0];
      const dx = wp.x - this.pos.x, dz = wp.z - this.pos.z, d = Math.hypot(dx, dz);
      const sp = this.running || input.run ? RUN_SPEED : SNEAK_SPEED;
      if (d < 0.12) this.path.shift();
      else { vx = (dx / d) * sp; vz = (dz / d) * sp; }
      if (!this.path.length) this.path = null;
    }
    this.speed = Math.hypot(vx, vz);
    const before = this.pos.clone();
    this.pos.x += vx * dt; this.pos.z += vz * dt;
    this.openDoorsAhead(vx, vz);
    L.collide(this.pos, RADIUS);
    // stuck against something while following a path: drop the path
    if (this.path && this.speed > 0.1 && before.distanceTo(this.pos) < this.speed * dt * 0.15) { this.stuckT = (this.stuckT || 0) + dt; if (this.stuckT > 0.5) { this.path = null; this.stuckT = 0; } } else this.stuckT = 0;

    const run = this.speed > SNEAK_SPEED + 0.2;
    this.char.faceTowards(vx, vz, dt, 12);
    this.char.update(dt, this.speed, run ? 'run' : this.speed > 0.05 ? 'sneak' : 'idle');
    this.char.root.position.copy(this.pos);

    // footsteps: soft and private while sneaking, loud (and heard by guards) when running
    if (this.speed > 0.1) {
      this.stepT -= dt * this.speed;
      if (this.stepT <= 0) {
        this.stepT = run ? 1.3 : 1.0;
        if (run) {
          this.game.audio.play(Math.random() < 0.5 ? 'step_run1' : 'step_run2', { volume: 0.55 });
          this.game.noise(this.pos, this.game.save.has('sneakers') ? 3.2 : 4.8, 'steps');
        } else this.game.audio.play(Math.random() < 0.5 ? 'step_soft1' : 'step_soft2', { volume: 0.25 });
      }
    }
  }

  // Doors open by themselves when you walk into them (unless locked).
  openDoorsAhead(vx, vz) {
    if (Math.hypot(vx, vz) < 0.05) return;
    const L = this.game.level;
    const ax = this.pos.x + Math.sign(vx) * 0.45 * (Math.abs(vx) > 0.2 ? 1 : 0), az = this.pos.z + Math.sign(vz) * 0.45 * (Math.abs(vz) > 0.2 ? 1 : 0);
    for (const [x, z] of [[ax, az], [this.pos.x, this.pos.z]]) {
      const d = L.doorAt(Math.floor(x), Math.floor(z));
      if (!d || d.target === 1) continue;
      if (d.locked) { if (!this.lockedHintT || performance.now() - this.lockedHintT > 2500) { this.lockedHintT = performance.now(); this.game.audio.play('door_locked'); this.game.hud.toast(this.game.t('locked')); } continue; }
      L.openDoor(d, this.pos);
      this.game.audio.play('door_open', { volume: 0.5 });
    }
  }
}
