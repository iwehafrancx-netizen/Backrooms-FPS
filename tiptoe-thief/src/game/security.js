// Security gear and things you can steal.
//
//   SecurityCamera - sweeps left and right; seeing the thief sounds the alarm
//   Laser          - beam between two posts; walking through it sounds the alarm
//   FuseBox        - switch it off and every camera and laser goes dark
//   Loot           - pick it up by walking onto it (some loot is the level target)
// The lock-pick mini-game for locked doors and safes lives in src/ui/lockpick.js.
import * as THREE from 'three';

export class SecurityCamera {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    this.obj = game.lib.instance('security_camera');
    // mounted on a wall at 2.3 m, facing `face` (quarter turns, 0 = north)
    this.base = (def.face || 0) * Math.PI / 2;
    this.sweep = THREE.MathUtils.degToRad(def.sweep ?? 70);
    this.obj.position.set(def.x, 2.3, def.z);
    this.obj.rotation.y = this.base;
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    this.range = def.range || 6.5;
    this.fov = THREE.MathUtils.degToRad(40);
    this.t = Math.random() * 6;
    this.on = true;
    this.cone = new THREE.Mesh(new THREE.CircleGeometry(this.range, 20, -this.fov / 2 - Math.PI / 2, this.fov),
      new THREE.MeshBasicMaterial({ color: 0x7fc8ff, transparent: true, opacity: 0.16, depthWrite: false }));
    this.cone.rotation.x = -Math.PI / 2; this.cone.position.set(def.x, 0.035, def.z); this.cone.renderOrder = 2;
  }

  get yaw() { return this.base + Math.sin(this.t * 0.45) * this.sweep / 2; }

  update(dt) {
    if (!this.on) { this.cone.visible = false; return; }
    this.t += dt;
    this.obj.rotation.y = this.yaw;
    this.cone.rotation.z = this.yaw;
    const p = this.game.player;
    if (p.hidden) return;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d > this.range) return;
    let a = Math.atan2(-dx, -dz) - this.yaw;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(a) < this.fov / 2 && this.game.level.lineOfSight(this.pos, p.pos)) {
      this.cone.material.color.set(0xff3b30);
      this.game.alarm(p.pos, this);
    } else this.cone.material.color.set(0x7fc8ff);
  }

  power(on) { this.on = on; this.cone.visible = on; }
}

export class Laser {
  constructor(game, def) {
    this.game = game;
    this.a = new THREE.Vector3(def.a[0], 0, def.a[1]);
    this.b = new THREE.Vector3(def.b[0], 0, def.b[1]);
    this.on = true;
    this.group = new THREE.Group();
    for (const p of [this.a, this.b]) {
      const post = game.lib.instance('laser_post');
      post.position.copy(p);
      post.lookAt(p === this.a ? this.b : this.a); // the emitters face each other
      post.rotateY(Math.PI);
      this.group.add(post);
    }
    // two red beams at knee and chest height
    const len = this.a.distanceTo(this.b);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.85 });
    this.beams = [0.3, 0.75].map((y) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, len, 6), mat);
      m.position.copy(this.a).lerp(this.b, 0.5).setY(y);
      m.lookAt(this.b.x, y, this.b.z); m.rotateX(Math.PI / 2);
      this.group.add(m);
      return m;
    });
  }

  update(dt) {
    if (!this.on) return;
    this.beams.forEach((b, i) => { b.material.opacity = 0.65 + Math.sin(performance.now() / 90 + i) * 0.2; });
    const p = this.game.player.pos;
    // distance from the thief to the beam segment
    const ab = this.b.clone().sub(this.a), t = THREE.MathUtils.clamp(p.clone().sub(this.a).dot(ab) / ab.lengthSq(), 0, 1);
    const q = this.a.clone().addScaledVector(ab, t);
    if (q.distanceTo(p) < 0.3 && t > 0.03 && t < 0.97) this.game.alarm(p, this);
  }

  power(on) { this.on = on; this.beams.forEach((b) => { b.visible = on; }); }
}

export class Loot {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    this.value = def.value || 50;
    this.target = !!def.target;
    this.obj = game.lib.instance(def.t);
    const y = def.y ?? game.level.surfaceY(def.x, def.z);
    this.pos = new THREE.Vector3(def.x, y, def.z);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = (def.r || 0) * Math.PI / 2;
    // a soft sparkle ring so loot is easy to spot in the dark
    this.glow = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 24), new THREE.MeshBasicMaterial({ color: this.target ? 0xffd34d : 0x9fe6ff, transparent: true, opacity: 0.7, depthWrite: false }));
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.set(def.x, y + 0.02, def.z);
    this.taken = false;
    this.hiddenInSafe = !!def.inSafe;
    if (this.hiddenInSafe) { this.obj.visible = false; this.glow.visible = false; }
  }

  update(dt) {
    if (this.taken || this.hiddenInSafe) return;
    this.glow.material.opacity = 0.45 + Math.sin(performance.now() / 300) * 0.25;
    this.obj.rotation.y += dt * 0.6;
    const p = this.game.player;
    // loot on a bed or table can't be stood on, so it can be reached from a little further
    const reach = this.pos.y > 0.3 ? 1.1 : 0.75;
    if (!p.hidden && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < reach) this.game.takeLoot(this);
  }

  reveal() { this.hiddenInSafe = false; this.obj.visible = true; this.glow.visible = true; }
}
