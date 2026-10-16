import * as THREE from 'three';
import { BLOCKS, TEAM_COLORS } from '../engine/blocks.js';
import { ITEMS } from './items.js';

const PX = 1.8 / 32;
const mk = (s) => { let x = s >>> 0 || 7; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; };
const pick = (r, a) => a[Math.floor(r() * a.length)];

const SKIN_TONES = ['#f2c9a0', '#e8b48a', '#d49a6a', '#b07a4a', '#8a5a36', '#6a4026', '#f5d5b5'];
const HAIR = ['#2a1a10', '#4a2a14', '#7a4a1e', '#c89a4a', '#e8d080', '#1a1a1a', '#a0302a', '#e0e0e0', '#3a5ad8', '#d84a9a'];
const SHIRTS = ['#d83a3a', '#3a7ad8', '#3aa84a', '#e8c83a', '#8a3ad8', '#e8823a', '#2ab8c0', '#e86aa8', '#3a3a3a', '#e8e8e8', '#4a5a7a', '#7a4a2a'];
const PANTS = ['#2a3a6a', '#3a3a3a', '#5a4a3a', '#2a2a2a', '#4a5a3a', '#6a6a7a', '#1a2a4a'];

export function paintSkin(seed, team = -1) {
  const r = mk(seed * 9973 + 17);
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const skin = pick(r, SKIN_TONES), hair = pick(r, HAIR), shirt = team >= 0 ? TEAM_COLORS[team].hex : pick(r, SHIRTS), pants = pick(r, PANTS), shoes = pick(r, ['#2a2a2a', '#4a3020', '#e8e8e8', '#3a3a5a']);
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  const fill = (x, y, w, h, col, noise = 0.06) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { g.fillStyle = shade(col, 1 - noise + r() * noise * 2); g.fillRect(xx, yy, 1, 1); } };
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  fill(0, 0, 32, 16, skin, 0.04);
  fill(8, 0, 8, 8, hair); fill(16, 0, 8, 8, skin);
  const style = Math.floor(r() * 4);
  fill(0, 8, 32, style === 0 ? 2 : style === 1 ? 3 : 4, hair);
  fill(24, 8, 8, 8, hair);
  if (style >= 2) { fill(0, 8, 8, 6, hair); fill(16, 8, 8, 6, hair); }
  if (style === 3) { fill(8, 8, 1, 4, hair); fill(15, 8, 1, 4, hair); }
  const eye = pick(r, ['#3a6ad8', '#3a2a1a', '#2a8a4a', '#5a3a2a', '#6a6a6a']);
  px(9, 12, '#ffffff'); px(10, 12, eye); px(13, 12, eye); px(14, 12, '#ffffff');
  if (r() < 0.6) { px(10, 11, shade(hair, 0.8)); px(13, 11, shade(hair, 0.8)); }
  fill(11, 14, 2, 1, shade(skin, 0.7), 0); px(10, 14, shade(skin, 0.82)); px(13, 14, shade(skin, 0.82));
  if (r() < 0.2) fill(9, 14, 6, 2, hair);
  fill(16, 16, 24, 16, shirt);
  fill(20, 16, 8, 4, shirt); fill(28, 16, 8, 4, shade(shirt, 0.85));
  const pattern = Math.floor(r() * 5);
  if (pattern === 1) fill(20, 22, 8, 2, '#ffffff', 0.02);
  if (pattern === 2) { fill(23, 20, 2, 12, shade(shirt, 0.7)); }
  if (pattern === 3) { for (let i = 0; i < 8; i++) px(20 + i, 20 + (i % 2), shade(shirt, 1.25)); }
  if (pattern === 4) fill(20, 26, 8, 6, shade(shirt, 0.75));
  fill(22, 20, 4, 2, shade(skin, 0.95), 0);
  fill(40, 16, 16, 16, shirt);
  fill(44, 26, 4, 6, skin); fill(40, 26, 16, 6, skin);
  fill(40, 20, 16, 2, shade(shirt, 0.8));
  fill(0, 16, 16, 16, pants);
  fill(0, 28, 16, 4, shoes);
  fill(4, 16, 8, 4, pants);
  if (team >= 0) fill(20, 26, 8, 2, shade(shirt, 0.6));
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function boxUV(geo, u, v, w, h, d) {
  const S = 64;
  const rects = [[u, v + d, d, h], [u + d + w, v + d, d, h], [u + d, v, w, d], [u + d + w, v, w, d], [u + 2 * d + w, v + d, w, h], [u + d, v + d, w, h]];
  const uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++) {
    const [x, y, rw, rh] = rects[f];
    const u0 = x / S, u1 = (x + rw) / S, v0 = 1 - y / S, v1 = 1 - (y + rh) / S;
    const o = f * 4;
    uv.setXY(o, u0, v0); uv.setXY(o + 1, u1, v0); uv.setXY(o + 2, u0, v1); uv.setXY(o + 3, u1, v1);
  }
  uv.needsUpdate = true;
  return geo;
}

function part(mat, w, h, d, u, v, pivot) {
  const geo = boxUV(new THREE.BoxGeometry(w * PX, h * PX, d * PX), u, v, w, h, d);
  geo.translate(0, -h * PX / 2 + pivot, 0);
  const m = new THREE.Mesh(geo, mat);
  const g = new THREE.Group(); g.add(m);
  return g;
}

const ARMOR_COL = [0x8a5a30, 0xa8a8b0, 0xd8d8d8, 0x4fe0d8];

export function makeCharacter(skinSeed, team = -1) {
  const tex = paintSkin(skinSeed, team);
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const head = part(mat, 8, 8, 8, 0, 0, 4 * PX); head.position.y = 24 * PX + 0; head.children[0].geometry.translate(0, 4 * PX, 0);
  const torso = part(mat, 8, 12, 4, 16, 16, 6 * PX); torso.position.y = 18 * PX;
  const armR = part(mat, 4, 12, 4, 40, 16, 2 * PX); armR.position.set(6 * PX, 22 * PX, 0);
  const armL = part(mat, 4, 12, 4, 40, 16, 2 * PX); armL.position.set(-6 * PX, 22 * PX, 0);
  const legR = part(mat, 4, 12, 4, 0, 16, 0); legR.position.set(2 * PX, 12 * PX, 0);
  const legL = part(mat, 4, 12, 4, 0, 16, 0); legL.position.set(-2 * PX, 12 * PX, 0);
  body.add(head, torso, armR, armL, legR, legL);
  const hand = new THREE.Group(); hand.position.set(0, -10 * PX, -2 * PX); armR.add(hand);
  const armorMats = ARMOR_COL.map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const shell = (w, h, d, y, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), armorMats[0]); m.position.y = y; m.visible = false; parent.add(m); return m; };
  const armor = [
    [shell(9, 9, 9, 4 * PX, head)],
    [shell(9, 13, 5, 0, torso), shell(5, 6, 5, -1 * PX, armR), shell(5, 6, 5, -1 * PX, armL)],
    [shell(5, 8, 5, -4 * PX, legR), shell(5, 8, 5, -4 * PX, legL)],
    [shell(5, 4, 5, -10.5 * PX, legR), shell(5, 4, 5, -10.5 * PX, legL)],
  ];
  return { root, body, head, torso, armR, armL, legR, legL, hand, mat, armor, armorMats, heldId: null, tex };
}

export function setArmor(ch, inv) {
  for (let s = 0; s < 4; s++) {
    const id = inv.armor[s];
    for (const m of ch.armor[s]) { m.visible = !!id; if (id) m.material = ch.armorMats[ITEMS[id].tier]; }
  }
}

export function poseCharacter(ch, a, t) {
  const sw = Math.sin(a.walkPhase * 1.6) * Math.min(1, a.moveAmt / 4) * 0.9;
  ch.legR.rotation.x = sw; ch.legL.rotation.x = -sw;
  ch.armL.rotation.x = -sw * 0.8;
  const swing = a.swingT > 0 ? Math.sin((1 - a.swingT / 0.25) * Math.PI) : 0;
  ch.armR.rotation.x = sw * 0.8 - swing * 1.6 - (a.heldBlock ? 0.3 : 0);
  ch.armR.rotation.z = -swing * 0.25;
  ch.head.rotation.x = -a.pitch * 0.9;
  ch.body.position.y = a.crouch ? -0.18 : 0;
  ch.torso.rotation.x = a.crouch ? 0.45 : 0;
  ch.head.position.z = a.crouch ? -0.2 : 0;
  ch.armR.position.z = ch.armL.position.z = a.crouch ? -0.15 : 0;
  const hurt = a.hurtT > 0.2;
  ch.mat.emissive && ch.mat.emissive.setRGB(hurt ? 0.6 : 0, 0, 0);
}

const gripCache = new Map();
export function itemGrip(id, atlas) {
  if (gripCache.has(id)) return gripCache.get(id);
  const it = ITEMS[id];
  let g = [0, 0];
  if (it && it.kind !== 'block') {
    const [u0, v0] = atlas.uv(it.icon);
    const W = atlas.width, x0 = Math.round(u0 * W), y0 = Math.round(v0 * atlas.height);
    let best = 1e9, bx = 8, by = 8;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (atlas.data[((y0 + y) * W + x0 + x) * 4 + 3] > 100) { const d = x + (15 - y); if (d < best) { best = d; bx = x; by = y; } }
    const tool = it.kind === 'sword' || it.kind === 'pick' || it.kind === 'axe' || it.kind === 'shears';
    if (tool) { bx += 1.5; by -= 1.5; } else { bx = 8; by = 8; }
    g = [(bx - 7.5) / 16, (7.5 - by) / 16];
  }
  gripCache.set(id, g);
  return g;
}

const itemMeshCache = new Map();
export function itemMesh(id, atlas, atlasTex) {
  if (itemMeshCache.has(id)) return itemMeshCache.get(id).clone();
  const it = ITEMS[id];
  let mesh;
  if (it && it.kind === 'block') {
    const b = BLOCKS[it.block];
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const uv = geo.attributes.uv;
    const faces = ['side', 'side', 'top', 'bottom', 'side', 'side'];
    for (let f = 0; f < 6; f++) {
      const [u0, v0, du, dv] = atlas.uv(b.tex[faces[f]]);
      for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, u0 + uv.getX(i) * du, v0 + (1 - uv.getY(i)) * dv); }
    }
    const shadeCols = [0.8, 0.8, 1, 0.55, 0.68, 0.68];
    const col = [];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) col.push(shadeCols[f], shadeCols[f], shadeCols[f]);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5, transparent: b.id === 11 }));
    mesh.scale.setScalar(0.32);
    mesh.userData.block = true;
  } else {
    const name = it ? it.icon : 'snowball';
    const [u0, v0, du, dv] = atlas.uv(name);
    const W = atlas.width, x0 = Math.round(u0 * W), y0 = Math.round(v0 * atlas.height);
    const pos = [], cols = [], idx = [];
    const S = 1 / 16;
    const opaque = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && atlas.data[((y0 + y) * W + x0 + x) * 4 + 3] > 100;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!opaque(x, y)) continue;
      const i = ((y0 + y) * W + x0 + x) * 4;
      const c = [atlas.data[i] / 255, atlas.data[i + 1] / 255, atlas.data[i + 2] / 255].map((v) => Math.pow(v, 2.2));
      const bx = (x - 8) * S, by = (7 - y) * S, h = S * 0.5;
      const quads = [[[0, 0, h], [S, 0, h], [S, S, h], [0, S, h], 1], [[S, 0, -h], [0, 0, -h], [0, S, -h], [S, S, -h], 0.75]];
      if (!opaque(x, y - 1)) quads.push([[0, S, h], [S, S, h], [S, S, -h], [0, S, -h], 0.95]);
      if (!opaque(x, y + 1)) quads.push([[0, 0, -h], [S, 0, -h], [S, 0, h], [0, 0, h], 0.6]);
      if (!opaque(x - 1, y)) quads.push([[0, 0, -h], [0, 0, h], [0, S, h], [0, S, -h], 0.7]);
      if (!opaque(x + 1, y)) quads.push([[S, 0, h], [S, 0, -h], [S, S, -h], [S, S, h], 0.8]);
      for (const q of quads) { const b = pos.length / 3; for (let k = 0; k < 4; k++) { pos.push(bx + q[k][0], by + q[k][1], q[k][2]); cols.push(c[0] * q[4], c[1] * q[4], c[2] * q[4]); } idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx);
    mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
    mesh.scale.setScalar(0.62);
  }
  itemMeshCache.set(id, mesh);
  return mesh.clone();
}

export function makeEgg(team) {
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; const y = t * 0.95; const r = Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.36 * (1 - t * 0.15); pts.push(new THREE.Vector2(Math.max(0.001, r), y)); }
  const geo = new THREE.LatheGeometry(pts, 14);
  const c = new THREE.Color(TEAM_COLORS[team].hex);
  const col = [];
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const n = (Math.sin(p.getX(i) * 40) * Math.cos(p.getY(i) * 31 + p.getZ(i) * 27) + 1) / 2; const k = n > 0.8 ? 1.35 : 0.85 + n * 0.25; col.push(c.r * k, c.g * k, c.b * k); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: c, emissiveIntensity: 0.25 }));
  return mesh;
}

export function nameTag(text, color = '#ffffff') {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = 'bold 30px system-ui, sans-serif';
  const w = Math.ceil(g.measureText(text).width) + 20;
  c.width = w; c.height = 42;
  g.font = 'bold 30px system-ui, sans-serif';
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, w, 42);
  g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, 10, 22);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  s.scale.set(w / 190, 0.22, 1);
  s.renderOrder = 5;
  return s;
}
