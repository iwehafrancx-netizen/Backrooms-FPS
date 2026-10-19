import { isSolid, SOLID } from '../engine/blocks.js';

const at = (w, x, y, z) => (y >= 0 && y < w.sy && x + w.ox >= 0 && x + w.ox < w.sx && z + w.oz >= 0 && z + w.oz < w.sz ? w.data[((y * w.sz) + (z + w.oz)) * w.sx + (x + w.ox)] : 0);
export const standable = (w, x, y, z) => { const b = at(w, x, y - 1, z); return SOLID[b] === 1 && b !== 45 && !SOLID[at(w, x, y, z)] && !SOLID[at(w, x, y + 1, z)]; };

export function groundBelow(w, x, y, z, depth = 6) {
  for (let yy = y; yy > y - depth; yy--) if (standable(w, x, yy, z)) return yy;
  return null;
}

const CAP = 40000;
const NX = new Int32Array(CAP), NY = new Int32Array(CAP), NZ = new Int32Array(CAP), NG = new Float32Array(CAP), NF = new Float32Array(CAP), NP = new Int32Array(CAP), HEAP = new Int32Array(CAP * 8);
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function findPath(w, sx, sy, sz, gx, gy, gz, opts = {}) {
  const limit = Math.min(CAP - 16, opts.limit || 2400), near = opts.near ?? 0;
  const SX = w.sx + 8, SZ = w.sz + 8, OX = w.ox + 4, OZ = w.oz + 4;
  const key = (x, y, z) => ((y + 4) * SZ + (z + OZ)) * SX + (x + OX);
  const h = (x, y, z) => { const dx = Math.abs(x - gx), dz = Math.abs(z - gz); return (dx > dz ? dx + dz * 0.414 : dz + dx * 0.414) + Math.abs(y - gy) * 0.6; };
  const seen = new Map();
  let nn = 0, hn = 0;
  const push = (i) => { let k = hn++; HEAP[k] = i; while (k > 0) { const p = (k - 1) >> 1; if (NF[HEAP[p]] <= NF[HEAP[k]]) break; const t = HEAP[p]; HEAP[p] = HEAP[k]; HEAP[k] = t; k = p; } };
  const pop = () => { const top = HEAP[0]; hn--; if (hn > 0) { HEAP[0] = HEAP[hn]; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < hn && NF[HEAP[l]] < NF[HEAP[m]]) m = l; if (r < hn && NF[HEAP[r]] < NF[HEAP[m]]) m = r; if (m === k) break; const t = HEAP[m]; HEAP[m] = HEAP[k]; HEAP[k] = t; k = m; } } return top; };
  const node = (x, y, z, g, p) => { const i = nn++; NX[i] = x; NY[i] = y; NZ[i] = z; NG[i] = g; NF[i] = g + h(x, y, z); NP[i] = p; return i; };
  push(node(sx, sy, sz, 0, -1)); seen.set(key(sx, sy, sz), 0);
  let best = 0, bh = h(sx, sy, sz), n = 0, found = false;
  while (hn && n++ < limit && nn < CAP - 16) {
    const c = pop(), cx = NX[c], cy = NY[c], cz = NZ[c], cg = NG[c];
    if (Math.abs(cx - gx) <= near && Math.abs(cz - gz) <= near && Math.abs(cy - gy) <= Math.max(1, near)) { best = c; found = true; break; }
    const ch = NF[c] - cg;
    if (ch < bh) { bh = ch; best = c; }
    for (let d = 0; d < 8; d++) {
      const dx = DIRS[d][0], dz = DIRS[d][1], nx = cx + dx, nz = cz + dz;
      if (dx && dz && !(standable(w, cx + dx, cy, cz) && standable(w, cx, cy, cz + dz))) continue;
      let ny = -999, cost = dx && dz ? 1.414 : 1;
      if (standable(w, nx, cy, nz)) ny = cy;
      else if (!dx || !dz) {
        if (standable(w, nx, cy + 1, nz) && !SOLID[at(w, cx, cy + 2, cz)]) { ny = cy + 1; cost += 0.8; }
        else if (!SOLID[at(w, nx, cy, nz)] && !SOLID[at(w, nx, cy + 1, nz)]) { for (let k = 1; k <= 3; k++) if (standable(w, nx, cy - k, nz)) { ny = cy - k; cost += k * 0.3; break; } }
      }
      if (ny === -999) continue;
      const k = key(nx, ny, nz), g = cg + cost, old = seen.get(k);
      if (old !== undefined && old <= g) continue;
      seen.set(k, g);
      push(node(nx, ny, nz, g, c));
    }
  }
  const reached = found || (Math.abs(NX[best] - gx) <= Math.max(near, 0) && Math.abs(NZ[best] - gz) <= Math.max(near, 0) && Math.abs(NY[best] - gy) <= Math.max(1, near));
  const path = [];
  for (let c = best; c >= 0; c = NP[c]) path.push({ x: NX[c], y: NY[c], z: NZ[c] });
  path.reverse();
  return { path, reached, end: path[path.length - 1], nodes: n };
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
