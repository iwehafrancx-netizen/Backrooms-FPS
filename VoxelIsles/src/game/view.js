import * as THREE from 'three';
import { BLOCKS, TEAM_COLORS } from '../engine/blocks.js';
import { ITEMS } from './items.js';
import { makeCharacter, poseCharacter, setArmor, itemMesh, makeEgg, nameTag } from './models.js';
import { eyeHeight } from './physics.js';

export const VM = {
  shoulder: [0.5, -0.62, -0.18], dir: [-0.2, 0.5, -1], roll: 0.5, scale: 1,
  block: { scale: 0.24, rot: [0.0, 0.8, 0], off: [-0.05, 0.07, -0.08] },
  tool: { scale: 0.5, rot: [0, -0.8, 0.2], off: [-0.08, 0.12, -0.1] },
};

export class View {
  constructor(R, atlas) {
    this.R = R; this.atlas = atlas; this.scene = R.scene;
    this.chars = new Map(); this.dropMeshes = new Map(); this.projMeshes = new Map(); this.eggs = []; this.npcs = [];
    this.particles = [];
    const pg = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    this.pMesh = new THREE.InstancedMesh(pg, new THREE.MeshBasicMaterial({ vertexColors: false }), 400);
    this.pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pMesh.count = 0; this.pMesh.frustumCulled = false;
    this.pColors = new Float32Array(400 * 3);
    this.pMesh.instanceColor = new THREE.InstancedBufferAttribute(this.pColors, 3);
    this.scene.add(this.pMesh);
    this.vmScene = new THREE.Scene();
    this.vmCam = new THREE.PerspectiveCamera(70, 1, 0.01, 10);
    this.vmScene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2.2));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(0.3, 1, 0.5); this.vmScene.add(dl);
    this.vm = new THREE.Group(); this.vmScene.add(this.vm);
    this.vmHeld = null; this.vmHeldId = -1; this.vmSwing = 0; this.vmBob = 0; this.vmCfg = JSON.parse(JSON.stringify(VM));
  }

  setMatch(m, local) {
    this.clear();
    this.m = m; this.local = local;
    for (const a of m.actors) {
      const ch = makeCharacter(a.skin, m.mode.id === 'egg' ? a.team : -1);
      const col = a.team >= 0 ? TEAM_COLORS[a.team].hex : '#ffffff';
      ch.tag = nameTag(a.name, col); ch.tag.position.y = 2.15; ch.root.add(ch.tag);
      this.scene.add(ch.root);
      this.chars.set(a.id, ch);
      if (a === local) ch.root.visible = false;
    }
    if (m.mode.teams) for (const t of m.mode.teams) { const e = makeEgg(t.i); e.position.set(t.egg.x + 0.5, t.egg.y, t.egg.z + 0.5); this.scene.add(e); this.eggs.push({ t, mesh: e }); }
    for (const n of m.npcs) {
      const ch = makeCharacter(4242 + n.team * 7, -1);
      ch.root.position.set(n.x, n.y, n.z); ch.root.rotation.y = n.yaw;
      const tag = nameTag('SHOP', '#ffe066'); tag.position.y = 2.15; ch.root.add(tag);
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.5, 0.05), new THREE.MeshLambertMaterial({ color: n.team >= 0 ? TEAM_COLORS[n.team].hex : '#3a6ad8' }));
      apron.position.set(0, 0.95, -0.15); ch.root.add(apron);
      this.scene.add(ch.root); this.npcs.push({ n, ch });
    }
    this.buildViewmodelArm();
  }
  clear() {
    for (const ch of this.chars.values()) this.scene.remove(ch.root);
    for (const m of this.dropMeshes.values()) this.scene.remove(m);
    for (const m of this.projMeshes.values()) this.scene.remove(m);
    for (const e of this.eggs) this.scene.remove(e.mesh);
    for (const n of this.npcs) this.scene.remove(n.ch.root);
    this.chars.clear(); this.dropMeshes.clear(); this.projMeshes.clear(); this.eggs = []; this.npcs = []; this.particles = []; this.pMesh.count = 0;
  }
  buildViewmodelArm() {
    if (this.vmArm) this.vm.remove(this.vmArm);
    const ch = makeCharacter(this.local ? this.local.skin : 1, this.m && this.m.mode.id === 'egg' && this.local ? this.local.team : -1);
    this.vmArm = new THREE.Mesh(ch.armR.children[0].geometry.clone(), ch.mat);
    this.vm.add(this.vmArm);
    this.placeArm();
  }
  placeArm() {
    const c = this.vmCfg;
    const dir = new THREE.Vector3(...c.dir).normalize();
    this.vmArm.position.set(...c.shoulder);
    this.vmArm.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    this.vmArm.rotateY(c.roll);
    this.vmArm.scale.setScalar(c.scale);
    this.vmHandPos = new THREE.Vector3(...c.shoulder).addScaledVector(dir, 0.675 * c.scale * 0.92);
  }

  heldModel(id) {
    const m = itemMesh(id, this.atlas, this.R.atlasTex);
    const it = ITEMS[id];
    if (it.kind === 'block') { m.scale.setScalar(0.24); m.position.set(0, -0.05, -0.08); m.rotation.set(0.3, 0.6, 0); }
    else { m.scale.setScalar(0.55); m.rotation.set(0, Math.PI / 2, -0.8); m.position.set(0, -0.04, -0.18); }
    return m;
  }

  burst(x, y, z, id) {
    const b = BLOCKS[id];
    const c = new THREE.Color(b ? b.color : '#888');
    for (let i = 0; i < 10; i++) {
      if (this.particles.length >= 400) this.particles.shift();
      this.particles.push({ x: x + 0.2 + Math.random() * 0.6, y: y + 0.2 + Math.random() * 0.6, z: z + 0.2 + Math.random() * 0.6, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 3 + 1, vz: (Math.random() - 0.5) * 3, life: 0.5 + Math.random() * 0.4, r: c.r * (0.8 + Math.random() * 0.3), g: c.g * (0.8 + Math.random() * 0.3), b: c.b * (0.8 + Math.random() * 0.3), s: 0.6 + Math.random() * 0.6 });
    }
  }
  sparks(x, y, z, color = 0xffffff, n = 8) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) this.particles.push({ x, y, z, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 4, life: 0.4 + Math.random() * 0.3, r: c.r, g: c.g, b: c.b, s: 0.5 });
  }

  update(dt, cam) {
    const m = this.m;
    if (!m) return;
    const t = m.time;
    for (const a of m.actors) {
      const ch = this.chars.get(a.id);
      if (!ch) continue;
      if (a === this.local && !this.thirdPerson) { ch.root.visible = false; continue; }
      if (!a.alive) {
        if (ch.root.visible) { ch.deathT = (ch.deathT || 0) + dt; ch.root.rotation.z = Math.min(Math.PI / 2, ch.deathT * 6); if (ch.deathT > 0.6) ch.root.visible = false; }
        continue;
      }
      ch.deathT = 0; ch.root.rotation.z = 0; ch.root.visible = true;
      ch.root.position.set(a.pos.x, a.pos.y, a.pos.z);
      ch.root.rotation.y = a.yaw;
      const held = a.inv.slots[a.sel];
      const hid = held ? held.id : 0;
      a.heldBlock = hid && ITEMS[hid].kind === 'block';
      if (ch.heldId !== hid) { ch.hand.clear(); if (hid) ch.hand.add(this.heldModel(hid)); ch.heldId = hid; }
      poseCharacter(ch, a, t);
      const sig = a.inv.armor.join(',');
      if (ch.armorSig !== sig) { ch.armorSig = sig; setArmor(ch, a.inv); }
      if (ch.mat.color) ch.mat.color.setRGB(a.hurtT > 0.25 ? 1 : 1, a.hurtT > 0.25 ? 0.45 : 1, a.hurtT > 0.25 ? 0.45 : 1);
      ch.tag.visible = cam ? Math.hypot(cam.position.x - a.pos.x, cam.position.z - a.pos.z) < 40 : true;
    }
    for (const { n, ch } of this.npcs) { ch.head.rotation.y = Math.sin(t * 0.7 + n.team) * 0.4; }
    for (const e of this.eggs) { e.mesh.visible = e.t.eggAlive; e.mesh.rotation.y = t * 0.6; e.mesh.position.y = e.t.egg.y + 0.03 + Math.sin(t * 2) * 0.03; }
    const live = new Set();
    for (const d of m.drops) {
      live.add(d.key);
      let mesh = this.dropMeshes.get(d.key);
      if (!mesh) { mesh = itemMesh(d.id, this.atlas, this.R.atlasTex); if (ITEMS[d.id].kind !== 'block') mesh.scale.setScalar(0.42); else mesh.scale.setScalar(0.25); this.scene.add(mesh); this.dropMeshes.set(d.key, mesh); }
      mesh.position.set(d.x, d.y - 0.05 + Math.sin(t * 3 + d.key * 10) * 0.06, d.z);
      mesh.rotation.y = t * 1.6 + d.key * 6;
    }
    for (const [k, mesh] of this.dropMeshes) if (!live.has(k)) { this.scene.remove(mesh); this.dropMeshes.delete(k); }
    const pl = new Set();
    for (const p of m.projectiles) {
      pl.add(p);
      let mesh = this.projMeshes.get(p);
      if (!mesh) { mesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: p.id === 132 ? 0x2ad8c8 : 0xf4faff })); this.scene.add(mesh); this.projMeshes.set(p, mesh); }
      mesh.position.set(p.x, p.y, p.z);
    }
    for (const [k, mesh] of this.projMeshes) if (!pl.has(k)) { this.scene.remove(mesh); mesh.geometry.dispose(); this.projMeshes.delete(k); }
    const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), v = new THREE.Vector3();
    let n = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt; if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy -= 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (m.world.solidAt(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))) { p.y = Math.floor(p.y) + 1.06; p.vy = 0; p.vx *= 0.5; p.vz *= 0.5; }
      v.set(p.x, p.y, p.z); sc.setScalar(p.s * Math.min(1, p.life * 3));
      mat.compose(v, q, sc); this.pMesh.setMatrixAt(n, mat);
      this.pColors[n * 3] = p.r; this.pColors[n * 3 + 1] = p.g; this.pColors[n * 3 + 2] = p.b;
      n++;
    }
    this.pMesh.count = n; this.pMesh.instanceMatrix.needsUpdate = true; this.pMesh.instanceColor.needsUpdate = true;
  }

  updateViewmodel(dt, a, input) {
    if (!a) return;
    const held = a.inv.slots[a.sel], id = held ? held.id : 0;
    if (id !== this.vmHeldId) {
      if (this.vmHeld) this.vm.remove(this.vmHeld);
      this.vmHeld = null; this.vmHeldId = id;
      this.vmEquip = 0.25;
      if (id) {
        const mesh = itemMesh(id, this.atlas, this.R.atlasTex);
        const c = ITEMS[id].kind === 'block' ? this.vmCfg.block : this.vmCfg.tool;
        mesh.scale.setScalar(c.scale); mesh.rotation.set(...c.rot, 'YXZ');
        mesh.position.copy(this.vmHandPos).add(new THREE.Vector3(...c.off));
        this.vmHeld = mesh; this.vm.add(mesh);
      }
    }
    if (a.swingT > 0.2 && this.vmSwing <= 0) this.vmSwing = 0.28;
    this.vmSwing = Math.max(0, this.vmSwing - dt);
    this.vmEquip = Math.max(0, (this.vmEquip || 0) - dt);
    const s = this.vmSwing > 0 ? Math.sin((1 - this.vmSwing / 0.28) * Math.PI) : 0;
    const moving = a.onGround ? Math.min(1, a.moveAmt / 4.3) : 0;
    this.vmBob += dt * (a.sprint ? 13 : 9) * moving;
    const bx = Math.sin(this.vmBob) * 0.025 * moving, by = Math.abs(Math.cos(this.vmBob)) * 0.03 * moving;
    this.vm.position.set(bx - s * 0.15, -by - s * 0.12 - this.vmEquip * 1.2 + (a.eatT > 0 ? Math.sin(a.eatT * 30) * 0.03 + 0.12 : 0), s * -0.1);
    this.vm.rotation.set(-s * 0.9, s * 0.35, s * 0.2);
  }
}
