import * as THREE from 'three';
import { BLOCKS, TEAM_COLORS } from '../engine/blocks.js';
import { ITEMS } from './items.js';
import { makeCharacter, poseCharacter, setArmor, itemMesh, itemGrip, makeEgg, nameTag } from './models.js';
import { eyeHeight } from './physics.js';

export const VM = {
  fist: [0.44, -0.33, -0.64], dir: [-0.3, 0.38, -1], roll: 0.35, hand: -0.53,
  tool: { scale: 0.6, blade: [-0.32, 0.82, -0.46], face: [0.3, 0.15, 0.95], off: [0, 0.01, 0] },
  block: { scale: 0.22, rot: [0.18, 0.78, 0.05], off: [-0.02, 0.12, -0.05] },
  item: { scale: 0.42, blade: [0, 1, 0], face: [0.35, 0, 1], off: [-0.02, 0.14, -0.02] },
  swing: { dip: 0.28, sweep: 0.5, roll: 0.2, push: [-0.14, 0.04, -0.08] },
};

const _m = new THREE.Matrix4();
export function basisQuat(blade, face) {
  const B = new THREE.Vector3(...blade).normalize();
  const N = new THREE.Vector3(...face); N.addScaledVector(B, -N.dot(B)).normalize();
  const P = new THREE.Vector3().crossVectors(B, N).normalize();
  const X = B.clone().add(P).multiplyScalar(Math.SQRT1_2), Y = B.clone().sub(P).multiplyScalar(Math.SQRT1_2);
  return new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(X, Y, N));
}

export function holdItem(id, atlas, atlasTex, kind) {
  const it = ITEMS[id], g = new THREE.Group(), mesh = itemMesh(id, atlas, atlasTex);
  g.add(mesh);
  if (it.kind === 'block') {
    mesh.scale.setScalar(1);
    g.userData.block = true;
  } else {
    const [gx, gy] = itemGrip(id, atlas);
    mesh.scale.setScalar(1);
    mesh.position.set(-gx, -gy, 0);
  }
  return g;
}

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
    this.flags = [];
    if (m.mode.flags) for (const f of m.mode.flags) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), new THREE.MeshLambertMaterial({ color: 0xdcdcdc }));
      pole.position.y = 1.1; g.add(pole);
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.04), new THREE.MeshLambertMaterial({ color: TEAM_COLORS[f.team].hex, emissive: TEAM_COLORS[f.team].hex, emissiveIntensity: 0.25 }));
      cloth.position.set(0.47, 1.85, 0); g.add(cloth);
      this.scene.add(g); this.flags.push({ f, g, cloth });
    }
    if (m.mode.id === 'egg' && m.mode.teams) for (const t of m.mode.teams) { const e = makeEgg(t.i); e.position.set(t.egg.x + 0.5, t.egg.y, t.egg.z + 0.5); this.scene.add(e); this.eggs.push({ t, mesh: e }); }
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
    for (const ch of this.chars.values()) { this.scene.remove(ch.root); if (ch.disg) this.scene.remove(ch.disg); }
    for (const m of this.dropMeshes.values()) this.scene.remove(m);
    for (const m of this.projMeshes.values()) this.scene.remove(m);
    for (const e of this.eggs) this.scene.remove(e.mesh);
    for (const fl of this.flags || []) this.scene.remove(fl.g);
    this.flags = [];
    for (const n of this.npcs) this.scene.remove(n.ch.root);
    if (this.voidPlane) { this.scene.remove(this.voidPlane); this.voidPlane = null; }
    this.chars.clear(); this.dropMeshes.clear(); this.projMeshes.clear(); this.eggs = []; this.npcs = []; this.particles = []; this.pMesh.count = 0;
  }
  buildViewmodelArm() {
    if (this.vmPivot) this.vm.remove(this.vmPivot);
    const ch = makeCharacter(this.local ? this.local.skin : 1, this.m && this.m.mode.id === 'egg' && this.local ? this.local.team : -1);
    this.vmPivot = new THREE.Group();
    this.vmArm = new THREE.Mesh(ch.armR.children[0].geometry.clone(), ch.mat.clone());
    this.vmHand = new THREE.Group();
    this.vmArm.add(this.vmHand); this.vmPivot.add(this.vmArm); this.vm.add(this.vmPivot);
    this.placeArm();
    if (this.vmHeld) { this.vmHand.add(this.vmHeld); this.fitHeld(this.vmHeldId); }
  }
  placeArm() {
    const c = this.vmCfg;
    const dir = new THREE.Vector3(...c.dir).normalize();
    this.vmShoulder = new THREE.Vector3(...c.fist).addScaledVector(dir, c.hand);
    this.vmPivot.position.copy(this.vmShoulder);
    this.vmArm.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    this.vmArm.rotateY(c.roll);
    this.vmHand.position.set(0, c.hand, 0);
    this.vmArmInv = this.vmArm.quaternion.clone().invert();
  }
  fitHeld(id) {
    const g = this.vmHeld, it = ITEMS[id], c = this.vmCfg;
    const cfg = it.kind === 'block' ? c.block : it.kind === 'sword' || it.kind === 'pick' || it.kind === 'axe' || it.kind === 'shears' ? c.tool : c.item;
    g.scale.setScalar(cfg.scale);
    const q = it.kind === 'block' ? new THREE.Quaternion().setFromEuler(new THREE.Euler(...cfg.rot, 'YXZ')) : basisQuat(cfg.blade, cfg.face);
    g.quaternion.copy(this.vmArmInv).multiply(q);
    g.position.set(...cfg.off).applyQuaternion(this.vmArmInv);
  }

  heldModel(id) {
    const g = holdItem(id, this.atlas, this.R.atlasTex), it = ITEMS[id];
    if (it.kind === 'block') { g.scale.setScalar(0.24); g.position.set(0, -0.06, -0.05); g.rotation.set(0.3, 0.6, 0); }
    else if (it.kind === 'sword' || it.kind === 'pick' || it.kind === 'axe' || it.kind === 'shears') { g.scale.setScalar(0.6); g.quaternion.copy(basisQuat([0, 0.22, -1], [1, 0, 0])); g.position.set(0, -0.02, 0.02); }
    else { g.scale.setScalar(0.36); g.quaternion.copy(basisQuat([0, 0, -1], [1, 0, 0])); g.position.set(0, -0.05, -0.04); }
    return g;
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
      if (a === this.local && !this.thirdPerson) { ch.root.visible = false; if (ch.disg) ch.disg.visible = false; continue; }
      if (!a.alive) {
        if (ch.disg) ch.disg.visible = false;
        if (ch.root.visible) { ch.deathT = (ch.deathT || 0) + dt; ch.root.rotation.z = Math.min(Math.PI / 2, ch.deathT * 6); if (ch.deathT > 0.6) ch.root.visible = false; }
        continue;
      }
      ch.deathT = 0; ch.root.rotation.z = 0; ch.root.visible = true;
      if (a.disguise || ch.disg) {
        if (ch.disgId !== a.disguise) {
          if (ch.disg) { this.scene.remove(ch.disg); ch.disg = null; }
          if (a.disguise) { ch.disg = itemMesh(a.disguise, this.atlas, this.R.atlasTex); ch.disg.scale.setScalar(0.998); ch.disg.material = ch.disg.material.clone(); this.scene.add(ch.disg); }
          ch.disgId = a.disguise;
        }
        if (a.disguise) {
          ch.body.visible = false; ch.tag.visible = !!(this.local && this.local.team === a.team && a !== this.local);
          ch.disg.visible = !a.solid;
          ch.disg.position.set(a.pos.x, a.pos.y + 0.5, a.pos.z);
          ch.disg.material.color.setScalar(this.R.lightAt(a.pos.x, a.pos.y + 0.5, a.pos.z) * (a.hurtT > 0.25 ? 0.6 : 1));
          continue;
        }
        ch.body.visible = true;
      }
      ch.root.position.set(a.pos.x, a.pos.y, a.pos.z);
      ch.root.rotation.y = a.yaw;
      const held = a.inv.slots[a.sel];
      const hid = held ? held.id : 0;
      a.heldBlock = hid && ITEMS[hid].kind === 'block';
      if (ch.heldId !== hid) { ch.hand.clear(); if (hid) ch.hand.add(this.heldModel(hid)); ch.heldId = hid; }
      poseCharacter(ch, a, t);
      const sig = a.inv.armor.join(',');
      if (ch.armorSig !== sig) { ch.armorSig = sig; setArmor(ch, a.inv); }
      const lt = this.R.lightAt(a.pos.x, a.pos.y + 1.2, a.pos.z);
      if (ch.mat.color) ch.mat.color.setRGB(lt, a.hurtT > 0.25 ? 0.45 * lt : lt, a.hurtT > 0.25 ? 0.45 * lt : lt);
      ch.tag.visible = cam ? Math.hypot(cam.position.x - a.pos.x, cam.position.z - a.pos.z) < 40 : true;
    }
    if (m.mode.rising) {
      if (!this.voidPlane) { this.voidPlane = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0x1a0a2a, transparent: true, opacity: 0.82, fog: false, depthWrite: false })); this.voidPlane.rotation.x = -Math.PI / 2; this.voidPlane.renderOrder = 3; this.scene.add(this.voidPlane); }
      this.voidPlane.position.y = m.map.voidY + Math.sin(t * 2) * 0.05;
    }
    for (const { n, ch } of this.npcs) { ch.head.rotation.y = Math.sin(t * 0.7 + n.team) * 0.4; }
    for (const fl of this.flags || []) {
      const f = fl.f;
      fl.g.visible = !(f.state === 'carried' && f.carrier === this.local && !this.thirdPerson);
      if (f.state === 'carried' && f.carrier) { fl.g.position.set(f.carrier.pos.x - Math.sin(f.carrier.yaw) * 0.2, f.carrier.pos.y + 0.5, f.carrier.pos.z - Math.cos(f.carrier.yaw) * 0.2); fl.g.scale.setScalar(0.7); fl.g.rotation.y = f.carrier.yaw; }
      else { fl.g.position.set(f.x + 0.5, f.y, f.z + 0.5); fl.g.scale.setScalar(1); fl.g.rotation.y = t * 0.5; }
      fl.cloth.rotation.y = Math.sin(t * 4 + f.team) * 0.25;
    }
    for (const e of this.eggs) { e.mesh.visible = e.t.eggAlive; e.mesh.rotation.y = t * 0.6; e.mesh.position.y = e.t.egg.y + 0.03 + Math.sin(t * 2) * 0.03; }
    const live = new Set();
    for (const d of m.drops) {
      live.add(d.key);
      let mesh = this.dropMeshes.get(d.key);
      if (!mesh) { mesh = itemMesh(d.id, this.atlas, this.R.atlasTex); if (ITEMS[d.id].kind !== 'block') mesh.scale.setScalar(0.42); else mesh.scale.setScalar(0.25); this.scene.add(mesh); this.dropMeshes.set(d.key, mesh); }
      if (!mesh.userData.own) { mesh.material = mesh.material.clone(); mesh.userData.own = true; }
      mesh.material.color.setScalar(this.R.lightAt(d.x, d.y + 0.3, d.z));
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
      if (this.vmHeld) this.vmHand.remove(this.vmHeld);
      this.vmHeld = null; this.vmHeldId = id;
      this.vmEquip = 0.25;
      if (id) { this.vmHeld = holdItem(id, this.atlas, this.R.atlasTex); this.vmHeld.traverse((o) => { if (o.material) o.material = o.material.clone(); }); this.vmHand.add(this.vmHeld); this.fitHeld(id); }
    }
    const lt = this.R.lightAt(a.pos.x, a.pos.y + 1.5, a.pos.z);
    if (this.vmArm.material.color) this.vmArm.material.color.setScalar(lt);
    if (this.vmHeld) this.vmHeld.traverse((o) => { if (o.material && o.material.color) o.material.color.setScalar(lt); });
    if (a.swingN !== this.vmSwingN) { this.vmSwingN = a.swingN; this.vmSwing = 0.3; }
    this.vmSwing = Math.max(0, (this.vmSwing || 0) - dt);
    this.vmEquip = Math.max(0, (this.vmEquip || 0) - dt);
    const p = this.vmSwing > 0 ? 1 - this.vmSwing / 0.3 : 0;
    const s = p > 0 ? Math.sin(p * Math.PI) : 0, s2 = p > 0 ? Math.sin(Math.sqrt(p) * Math.PI) : 0;
    const moving = a.onGround ? Math.min(1, a.moveAmt / 4.3) : 0;
    this.vmBob += dt * (a.sprint ? 13 : 9) * moving;
    const bx = Math.sin(this.vmBob) * 0.025 * moving, by = Math.abs(Math.cos(this.vmBob)) * 0.03 * moving;
    const sw = this.vmCfg.swing, sh = this.vmShoulder;
    const eat = a.eatT > 0 ? Math.sin(a.eatT * 30) * 0.03 + 0.12 : 0;
    this.vm.position.set(bx, -by - this.vmEquip * 1.2 + eat, 0);
    this.vmPivot.position.set(sh.x + sw.push[0] * s2, sh.y + sw.push[1] * s, sh.z + sw.push[2] * s2);
    this.vmPivot.rotation.set(-sw.dip * s, sw.sweep * s2, sw.roll * s, 'YXZ');
  }
}
