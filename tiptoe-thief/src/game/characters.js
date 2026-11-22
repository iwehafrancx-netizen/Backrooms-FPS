// Assembles a character from the part models in assets/models
// (char_<kind>_torso/head/arm/leg + accessories) and animates it in code.
//
// There is no skeleton: each part is modelled around its joint, so a walk
// cycle is just a few rotations driven by a phase that advances with speed.
import * as THREE from 'three';

const HIP_Y = 0.92;

export class Character {
  constructor(lib, kind) {
    this.kind = kind;
    this.root = new THREE.Group(); // positioned on the floor, rotated to face the way it walks
    this.body = new THREE.Group(); // bobs / crouches / lies down
    this.root.add(this.body);
    const part = (name) => lib.instance(name);

    this.hips = new THREE.Group(); this.hips.position.y = HIP_Y; this.body.add(this.hips);
    this.torso = part(`char_${kind}_torso`); this.hips.add(this.torso);
    this.neck = new THREE.Group(); this.neck.position.set(0, 0.58, 0); this.torso.add(this.neck);
    this.head = part(`char_${kind}_head`); this.neck.add(this.head);
    this.armL = this.joint(this.torso, part(`char_${kind}_arm`), -0.2, 0.5, 0);
    this.armR = this.joint(this.torso, part(`char_${kind}_arm`), 0.2, 0.5, 0);
    this.legL = this.joint(this.hips, part(`char_${kind}_leg`), -0.09, 0, 0);
    this.legR = this.joint(this.hips, part(`char_${kind}_leg`), 0.09, 0, 0);

    if (kind === 'thief') {
      this.addTo(this.head, part('acc_beanie'), 0, 0.25, 0.005);
      this.addTo(this.head, part('acc_mask'), 0, 0.19, 0);
      this.sack = this.addTo(this.torso, part('acc_sack'), 0, 0.36, 0.2);
      this.sack.scale.setScalar(0.6); // grows as you steal more
    } else if (kind === 'guard') {
      this.addTo(this.head, part('acc_guard_cap'), 0, 0.25, 0.005);
      this.torch = this.addTo(this.armR.children[0], part('acc_torch'), 0, -0.58, -0.03);
    }
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    this.phase = 0;
    this.crouch = 0;
    this.pose = 'stand';
  }

  joint(parent, mesh, x, y, z) {
    const j = new THREE.Group(); j.position.set(x, y, z); j.add(mesh); parent.add(j); return j;
  }
  addTo(parent, mesh, x, y, z) { mesh.position.set(x, y, z); parent.add(mesh); return mesh; }

  // Grow the loot sack (0..1 = empty..full).
  setSack(fill) { if (this.sack) this.sack.scale.setScalar(0.55 + fill * 0.65); }

  // `speed` in m/s, `mode`: 'walk' | 'sneak' | 'run' | 'sleep' | 'look' | 'idle'
  update(dt, speed, mode = 'walk') {
    const moving = speed > 0.05;
    const targetCrouch = mode === 'sneak' ? 1 : 0;
    this.crouch += (targetCrouch - this.crouch) * Math.min(1, dt * 8);
    if (mode === 'sleep') {
      // lying on the back, arms by the sides, gentle breathing
      this.body.rotation.set(-Math.PI / 2, 0, 0);
      this.body.position.set(0, 0.62, 0.55);
      this.phase += dt * 1.6;
      this.torso.scale.setScalar(1 + Math.sin(this.phase) * 0.015);
      for (const l of [this.armL, this.armR, this.legL, this.legR]) l.rotation.set(0, 0, 0);
      return;
    }
    this.body.rotation.set(0, 0, 0);
    this.torso.scale.setScalar(1);
    // stride length grows with speed; running uses a faster cadence
    this.phase += dt * (moving ? 2.2 + speed * 2.1 : 0);
    const swing = moving ? Math.min(0.9, 0.35 + speed * 0.18) : 0;
    const s = Math.sin(this.phase);
    this.legL.rotation.x = s * swing;
    this.legR.rotation.x = -s * swing;
    this.armL.rotation.x = -s * swing * 0.8;
    this.armR.rotation.x = s * swing * 0.8 + (this.torch ? -0.9 : 0); // guards hold the torch forward
    this.armL.rotation.z = -0.08; this.armR.rotation.z = 0.08;
    // sneaking: bent knees, leaning forward, arms raised a little like tiptoeing
    const c = this.crouch;
    this.body.position.set(0, -0.18 * c + (moving ? Math.abs(Math.cos(this.phase)) * 0.04 : 0), 0);
    this.torso.rotation.x = -0.35 * c - (mode === 'run' ? 0.18 : 0);
    if (c > 0.05 && !this.torch) { this.armL.rotation.x += -0.6 * c; this.armR.rotation.x += -0.6 * c; }
    this.legL.rotation.x += 0.25 * c; this.legR.rotation.x += 0.25 * c;
    // looking around while standing still
    if (mode === 'look') { this.lookT = (this.lookT || 0) + dt; this.neck.rotation.y = Math.sin(this.lookT * 1.4) * 0.8; }
    else this.neck.rotation.y *= 0.9;
  }

  // Face a direction smoothly (yaw in radians, 0 = facing -Z / north).
  faceTowards(dx, dz, dt, rate = 10) {
    if (Math.hypot(dx, dz) < 1e-4) return;
    const want = Math.atan2(-dx, -dz);
    let d = want - this.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.root.rotation.y += d * Math.min(1, dt * rate);
  }

  get yaw() { return this.root.rotation.y; }
  // unit vector the character is facing
  forward(out = new THREE.Vector3()) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
}
