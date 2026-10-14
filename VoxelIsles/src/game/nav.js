import { isSolid } from '../engine/blocks.js';

export const standable = (w, x, y, z) => isSolid(w.get(x, y - 1, z)) && !isSolid(w.get(x, y, z)) && !isSolid(w.get(x, y + 1, z)) && w.get(x, y - 1, z) !== 45;

export function groundBelow(w, x, y, z, depth = 6) {
  for (let yy = y; yy > y - depth; yy--) if (standable(w, x, yy, z)) return yy;
  return null;
}

class Heap {
  constructor() { this.a = []; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function findPath(w, sx, sy, sz, gx, gy, gz, opts = {}) {
  const limit = opts.limit || 2400, near = opts.near ?? 0;
  const key = (x, y, z) => `${x},${y},${z}`;
  const h = (x, y, z) => Math.hypot(x - gx, z - gz) + Math.abs(y - gy) * 0.6;
  const open = new Heap(), seen = new Map();
  const start = { x: sx, y: sy, z: sz, g: 0, f: h(sx, sy, sz), p: null };
  open.push(start); seen.set(key(sx, sy, sz), 0);
  let best = start, n = 0;
  while (open.size && n++ < limit) {
    const c = open.pop();
    if (Math.abs(c.x - gx) <= near && Math.abs(c.z - gz) <= near && Math.abs(c.y - gy) <= Math.max(1, near)) { best = c; break; }
    if (h(c.x, c.y, c.z) < h(best.x, best.y, best.z)) best = c;
    for (const [dx, dz] of DIRS) {
      const nx = c.x + dx, nz = c.z + dz;
      if (dx && dz && !(standable(w, c.x + dx, c.y, c.z) && standable(w, c.x, c.y, c.z + dz))) continue;
      let ny = null, cost = dx && dz ? 1.414 : 1;
      if (standable(w, nx, c.y, nz)) ny = c.y;
      else if (!dx || !dz) {
        if (standable(w, nx, c.y + 1, nz) && !isSolid(w.get(c.x, c.y + 2, c.z))) { ny = c.y + 1; cost += 0.8; }
        else if (!isSolid(w.get(nx, c.y, nz)) && !isSolid(w.get(nx, c.y + 1, nz))) { for (let d = 1; d <= 3; d++) if (standable(w, nx, c.y - d, nz)) { ny = c.y - d; cost += d * 0.3; break; } }
      }
      if (ny == null) continue;
      const k = key(nx, ny, nz), g = c.g + cost;
      if (seen.has(k) && seen.get(k) <= g) continue;
      seen.set(k, g);
      open.push({ x: nx, y: ny, z: nz, g, f: g + h(nx, ny, nz), p: c });
    }
  }
  const reached = Math.abs(best.x - gx) <= Math.max(near, 0) && Math.abs(best.z - gz) <= Math.max(near, 0) && Math.abs(best.y - gy) <= Math.max(1, near);
  const path = [];
  for (let c = best; c; c = c.p) path.push({ x: c.x, y: c.y, z: c.z });
  path.reverse();
  return { path, reached, end: best };
}

export function lineCells(x0, z0, x1, z1) {
  const out = [];
  let x = x0, z = z0;
  const tx = Math.abs(x1 - x0) || 1, tz = Math.abs(z1 - z0) || 1;
  while (out.length < 200 && (x !== x1 || z !== z1)) {
    const fx = Math.abs(x1 - x) / tx, fz = Math.abs(z1 - z) / tz;
    if (x !== x1 && (fx >= fz || z === z1)) x += Math.sign(x1 - x); else z += Math.sign(z1 - z);
    out.push([x, z]);
  }
  return out;
}
