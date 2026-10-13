import { Document, NodeIO } from '@gltf-transform/core';
import { init, exportNavMesh, NavMeshQuery, floodFillPruneNavMesh } from '@recast-navigation/core';
import { generateSoloNavMesh } from '@recast-navigation/generators';
import sharp from 'sharp';
import fs from 'node:fs';

export const NAV_CONFIG = {
  cs: 0.1, ch: 0.05,
  walkableSlopeAngle: 40, walkableHeight: 34, walkableClimb: 10, walkableRadius: 3,
  maxEdgeLen: 40, maxSimplificationError: 1.1, minRegionArea: 20, mergeRegionArea: 40,
  maxVertsPerPoly: 6, detailSampleDist: 6, detailSampleMaxError: 1,
};

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const svg = (w, h, body) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`)).jpeg({ quality: 76, chromaSubsampling: '4:2:0' }).toBuffer();
export const noise = (id, f, o, seed = 1) => `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="${o}" seed="${seed}"/><feColorMatrix type="saturate" values="0"/></filter>`;
export const grain = (w, h, id, op) => `<rect width="${w}" height="${h}" filter="url(#${id})" opacity="${op}" style="mix-blend-mode:multiply"/>`;

export class Kit {
  constructor({ dim } = {}) { this.mats = {}; this.lamps = []; this.footprints = []; this.dim = dim || (() => 1); }
  mat(name, tex, mode = 'world', scale = 4) { this.mats[name] = { name, tex, mode, scale, pos: [], uv: [], col: [], idx: [] }; }
  shade(x, y, z) {
    let s = 0.62 + 0.3 * clamp01(y / 6);
    for (const l of this.lamps) { const d2 = (x - l.x) ** 2 + (z - l.z) ** 2 + (y - l.y) ** 2 * 0.3; s += (l.k || 0.22) * Math.exp(-d2 / (l.r || 40)); }
    return Math.min(1, s * this.dim(x, y, z));
  }
  quad(m, p0, p1, p2, p3, uvs, cols) {
    const M = this.mats[m], b = M.pos.length / 3;
    for (const [i, p] of [p0, p1, p2, p3].entries()) { M.pos.push(...p); M.uv.push(...uvs[i]); M.col.push(...cols[i]); }
    M.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  box(m, x0, y0, z0, x1, y1, z1, opts = {}) {
    const M = this.mats[m], tint = opts.tint || [1, 1, 1], s = M.scale;
    const faces = [
      { k: 'top', p: [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]] },
      { k: 'bot', p: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] },
      { k: 'x+', p: [[x1, y1, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0]] },
      { k: 'x-', p: [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]] },
      { k: 'z+', p: [[x0, y1, z1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1]] },
      { k: 'z-', p: [[x1, y1, z0], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0]] },
    ];
    for (const f of faces) {
      if (opts.skip && opts.skip.includes(f.k)) continue;
      if (f.k === 'bot' && (y0 <= 0.001 || opts.noBottom)) continue;
      const side = f.k[0] === 'x' ? 'x' : f.k[0] === 'z' ? 'z' : f.k;
      const uvs = f.p.map(([x, y, z]) => {
        if (M.mode === 'face') {
          const u = side === 'x' ? (z - z0) / (z1 - z0) : (x - x0) / (x1 - x0);
          const v = side === 'top' || side === 'bot' ? (z - z0) / (z1 - z0) : 1 - (y - y0) / (y1 - y0);
          return [u, v];
        }
        if (side === 'top' || side === 'bot') return [x / s, z / s];
        if (M.mode === 'side') return [(side === 'x' ? z : x) / s, 1 - (y - y0) / (y1 - y0)];
        if (M.mode === 'wall') return [(side === 'x' ? z : x) / s, 1 - (y - (opts.base ?? y0)) / (opts.span ?? (y1 - y0))];
        return [(side === 'x' ? z : x) / s, -y / s];
      });
      const cols = f.p.map(([x, y, z]) => {
        const local = side === 'top' ? 1 : side === 'bot' ? 0.45 : 0.55 + 0.45 * clamp01((y - y0) / Math.max(0.01, Math.min(3, y1 - y0)));
        const k = (opts.flat ? 1 : local * this.shade(x, y, z)) * (opts.gain || 1);
        return tint.map((c) => clamp01(c * k));
      });
      this.quad(m, ...f.p, uvs, cols);
    }
    if (opts.solid !== false && y0 < 1 && !opts.deco) this.footprints.push([x0, z0, x1, z1]);
  }
  cylinder(m, cx, cz, r, y0, y1, tint, seg = 10) {
    const M = this.mats[m];
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const p = (a, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
      const c = (y) => tint.map((t) => clamp01(t * (0.55 + 0.45 * (y - y0) / (y1 - y0)) * this.shade(cx, y, cz)));
      this.quad(m, p(a1, y1), p(a1, y0), p(a0, y0), p(a0, y1), [[(i + 1) / seg * 2, 0], [(i + 1) / seg * 2, 1], [i / seg * 2, 1], [i / seg * 2, 0]], [c(y1), c(y0), c(y0), c(y1)]);
      const b = M.pos.length / 3, top = tint.map((t) => clamp01(t * this.shade(cx, y1, cz)));
      M.pos.push(cx, y1, cz, ...p(a0, y1), ...p(a1, y1));
      M.uv.push(0.5, 0.5, 0.5 + Math.cos(a0) / 2, 0.5 + Math.sin(a0) / 2, 0.5 + Math.cos(a1) / 2, 0.5 + Math.sin(a1) / 2);
      M.col.push(...top, ...top, ...top); M.idx.push(b, b + 2, b + 1);
    }
    if (y0 < 1) this.footprints.push([cx - r, cz - r, cx + r, cz + r]);
  }
  slab(m, y0, y1, [x0, z0, x1, z1], holes = [], opts = {}) {
    const xs = [...new Set([x0, x1, ...holes.flatMap((h) => [h[0], h[2]])])].filter((v) => v >= x0 && v <= x1).sort((a, b) => a - b);
    const zs = [...new Set([z0, z1, ...holes.flatMap((h) => [h[1], h[3]])])].filter((v) => v >= z0 && v <= z1).sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) {
      let start = null;
      for (let j = 0; j <= zs.length - 1; j++) {
        const inside = j < zs.length - 1 && !holes.some((h) => (xs[i] + xs[i + 1]) / 2 > h[0] && (xs[i] + xs[i + 1]) / 2 < h[2] && (zs[j] + zs[j + 1]) / 2 > h[1] && (zs[j] + zs[j + 1]) / 2 < h[3]);
        if (inside && start === null) start = zs[j];
        if (!inside && start !== null) { this.box(m, xs[i], y0, start, xs[i + 1], y1, zs[j], { ...opts, solid: false }); start = null; }
      }
    }
  }
  wallX(m, x, z0, z1, y0, y1, t = 0.2, doors = [], opts = {}) {
    let z = z0;
    for (const [a, b, top] of [...doors].sort((p, q) => p[0] - q[0])) {
      if (a > z) this.box(m, x - t / 2, y0, z, x + t / 2, y1, a, opts);
      if (top !== undefined && top < y1) this.box(m, x - t / 2, top, a, x + t / 2, y1, b, { ...opts, solid: false });
      z = b;
    }
    if (z < z1) this.box(m, x - t / 2, y0, z, x + t / 2, y1, z1, opts);
  }
  wallZ(m, z, x0, x1, y0, y1, t = 0.2, doors = [], opts = {}) {
    let x = x0;
    for (const [a, b, top] of [...doors].sort((p, q) => p[0] - q[0])) {
      if (a > x) this.box(m, x, y0, z - t / 2, a, y1, z + t / 2, opts);
      if (top !== undefined && top < y1) this.box(m, a, top, z - t / 2, b, y1, z + t / 2, { ...opts, solid: false });
      x = b;
    }
    if (x < x1) this.box(m, x, y0, z - t / 2, x1, y1, z + t / 2, opts);
  }
  stairsX(m, x0, dir, z0, z1, yBase, rise, steps, opts = {}) {
    const run = opts.run || 0.4;
    for (let i = 1; i <= steps; i++) {
      const xa = x0 + dir * run * (i - 1), xb = x0 + dir * run * i;
      this.box(m, Math.min(xa, xb), yBase, z0, Math.max(xa, xb), yBase + (rise / steps) * i, z1, { ...opts, solid: yBase < 1 });
    }
    return x0 + dir * run * steps;
  }
  stairsZ(m, z0, dir, x0, x1, yBase, rise, steps, opts = {}) {
    const run = opts.run || 0.4;
    for (let i = 1; i <= steps; i++) {
      const za = z0 + dir * run * (i - 1), zb = z0 + dir * run * i;
      this.box(m, x0, yBase, Math.min(za, zb), x1, yBase + (rise / steps) * i, Math.max(za, zb), { ...opts, solid: yBase < 1 });
    }
    return z0 + dir * run * steps;
  }
  floor(m, x0, z0, x1, z1, y, G, colorFn) {
    const M = this.mats[m], nx = Math.round((x1 - x0) / G), nz = Math.round((z1 - z0) / G), base = M.pos.length / 3;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx, z = z0 + ((z1 - z0) * j) / nz;
      M.pos.push(x, y, z); M.uv.push(x / M.scale, z / M.scale); M.col.push(...colorFn(x, z));
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      M.idx.push(a, c, b, b, c, d);
    }
  }
  clearance(x, z, X, Z) {
    let d = Math.min(X - Math.abs(x), Z - Math.abs(z));
    for (const [a, b, c, e] of this.footprints) d = Math.min(d, Math.hypot(Math.max(a - x, 0, x - c), Math.max(b - z, 0, z - e)));
    return d;
  }
  async write(file, textures) {
    const doc = new Document(), buf = doc.createBuffer(), node = doc.createNode('Map'), mesh = doc.createMesh('Map');
    doc.createScene('Map').addChild(node); node.setMesh(mesh);
    const cache = {};
    let tris = 0, verts = 0;
    for (const M of Object.values(this.mats)) {
      if (!M.idx.length) continue;
      const n = M.pos.length / 3;
      const col = new Uint8Array(M.col.length); for (let i = 0; i < M.col.length; i++) col[i] = Math.round(clamp01(M.col[i]) * 255);
      const prim = doc.createPrimitive()
        .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(M.pos)).setBuffer(buf))
        .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(M.uv)).setBuffer(buf))
        .setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(col).setNormalized(true).setBuffer(buf))
        .setIndices(doc.createAccessor().setType('SCALAR').setArray(n < 65536 ? new Uint16Array(M.idx) : new Uint32Array(M.idx)).setBuffer(buf));
      const mat = doc.createMaterial(M.name).setBaseColorFactor([0, 0, 0, 1]).setEmissiveFactor([1, 1, 1]);
      if (M.tex && textures[M.tex]) mat.setEmissiveTexture(cache[M.tex] || (cache[M.tex] = doc.createTexture(M.tex).setImage(new Uint8Array(textures[M.tex])).setMimeType('image/jpeg')));
      prim.setMaterial(mat); mesh.addPrimitive(prim);
      tris += M.idx.length / 3; verts += n;
    }
    await new NodeIO().write(file, doc);
    return { kb: fs.statSync(file).size / 1024, tris, verts };
  }
}

export async function navmesh(glb, out, seed, skip = /^(light|Lightsurround|RoofBaked|MuralA|MuralB|Glass|Deco)$/) {
  const doc = await new NodeIO().read(glb);
  const positions = [], indices = [];
  for (const prim of doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())) {
    if (skip.test(prim.getMaterial()?.getName() || '')) continue;
    const pos = prim.getAttribute('POSITION').getArray(), idx = prim.getIndices().getArray(), base = positions.length / 3;
    for (let i = 0; i < pos.length; i++) positions.push(pos[i]);
    for (let i = 0; i < idx.length; i++) indices.push(base + idx[i]);
  }
  await init();
  const { success, navMesh, error } = generateSoloNavMesh(new Float32Array(positions), new Uint32Array(indices), NAV_CONFIG);
  if (!success) throw new Error('navmesh generation failed: ' + error);
  const q = new NavMeshQuery(navMesh);
  const s = q.findNearestPoly(seed, { halfExtents: { x: 2, y: 1, z: 2 } });
  floodFillPruneNavMesh(navMesh, [s.nearestRef]);
  const data = exportNavMesh(navMesh);
  fs.writeFileSync(out, data);
  const levels = {};
  for (let i = 0; i < 3000; i++) { const r = q.findRandomPoint(); if (r.success) { const k = Math.round(r.randomPoint.y * 2) / 2; levels[k] = (levels[k] || 0) + 1; } }
  const floors = Object.entries(levels).filter(([, n]) => n > 60).map(([y]) => +y).sort((a, b) => a - b);
  return { kb: data.byteLength / 1024, floors };
}
