import { BLOCKS } from './blocks.js';

export const OPQ = new Uint8Array(256), EMIT = new Uint8Array(256), DIM = new Uint8Array(256);
for (const b of BLOCKS) if (b) {
  OPQ[b.id] = b.solid && !b.transparent && !b.box ? 1 : 0;
  EMIT[b.id] = typeof b.light === 'number' ? Math.min(15, b.light) : 0;
  DIM[b.id] = b.id === 7 || b.id === 82 || b.id === 83 ? 2 : b.id === 11 ? 1 : 0;
}

const DIRS = [1, -1, 0, 0, 0, 0, 0, 0, 1, -1, 0, 0, 0, 0, 0, 0, 1, -1];

export class Light {
  constructor(world) {
    this.w = world;
    const n = world.sx * world.sy * world.sz;
    this.l = new Uint8Array(n);
    this.q = new Int32Array(1 << 20); this.rq = new Int32Array(1 << 19); this.rv = new Uint8Array(1 << 19);
    this.touched = [];
  }
  sky(i) { return this.l[i] >> 4; }
  blk(i) { return this.l[i] & 15; }
  at(x, y, z) {
    const w = this.w;
    if (y >= w.sy) return 0xf0;
    if (y < 0 || x + w.ox < 0 || x + w.ox >= w.sx || z + w.oz < 0 || z + w.oz >= w.sz) return 0xf0;
    return this.l[((y * w.sz) + (z + w.oz)) * w.sx + (x + w.ox)];
  }
  computeAll() {
    const w = this.w, { sx, sy, sz } = w, d = w.data, l = this.l, plane = sx * sz;
    l.fill(0);
    for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
      let v = 15;
      for (let y = sy - 1; y >= 0; y--) {
        const i = y * plane + z * sx + x, id = d[i];
        if (OPQ[id]) break;
        v = Math.max(0, v - DIM[id]);
        if (!v) break;
        l[i] = v << 4;
      }
    }
    let qn = 0;
    const q = this.q;
    for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
      const i = y * plane + z * sx + x, s = l[i] >> 4, id = d[i];
      if (EMIT[id]) { l[i] = (l[i] & 0xf0) | EMIT[id]; if (qn < q.length) q[qn++] = i; continue; }
      if (s < 2) continue;
      if ((x > 0 && (l[i - 1] >> 4) < s - 1 && !OPQ[d[i - 1]]) || (x < sx - 1 && (l[i + 1] >> 4) < s - 1 && !OPQ[d[i + 1]]) || (z > 0 && (l[i - sx] >> 4) < s - 1 && !OPQ[d[i - sx]]) || (z < sz - 1 && (l[i + sx] >> 4) < s - 1 && !OPQ[d[i + sx]]) || (y > 0 && (l[i - plane] >> 4) < s - 1 && !OPQ[d[i - plane]])) { if (qn < q.length) q[qn++] = i; }
    }
    this.spread(qn, true, false);
  }
  spread(qn, both, track) {
    const w = this.w, { sx, sy, sz } = w, d = w.data, l = this.l, q = this.q, plane = sx * sz, cap = q.length;
    let h = 0;
    while (h !== qn) {
      const i = q[h]; h = (h + 1) % cap;
      const y = Math.floor(i / plane), r = i - y * plane, z = Math.floor(r / sx), x = r - z * sx;
      const s = l[i] >> 4, b = l[i] & 15;
      for (let k = 0; k < 6; k++) {
        const nx = x + DIRS[k], ny = y + DIRS[k + 6], nz = z + DIRS[k + 12];
        if (nx < 0 || ny < 0 || nz < 0 || nx >= sx || ny >= sy || nz >= sz) continue;
        const j = ny * plane + nz * sx + nx, id = d[j];
        if (OPQ[id]) continue;
        const cs = l[j] >> 4, cb = l[j] & 15, dim = DIM[id];
        let ns = s === 15 && k === 3 && !dim ? 15 : s - 1 - dim, nb = b - 1 - dim;
        let ch = false, v = l[j];
        if (ns > cs) { v = (ns << 4) | (v & 15); ch = true; }
        if (nb > cb) { v = (v & 0xf0) | nb; ch = true; }
        if (ch) { l[j] = v; q[qn] = j; qn = (qn + 1) % cap; if (track) this.touched.push(j); }
      }
    }
  }
  remove(start, shift) {
    const w = this.w, { sx, sy, sz } = w, d = w.data, l = this.l, rq = this.rq, rv = this.rv, q = this.q, plane = sx * sz, mask = shift ? 0x0f : 0xf0;
    let rh = 0, rn = 0, qn = 0;
    const get = (i) => (shift ? l[i] >> 4 : l[i] & 15);
    rq[rn] = start; rv[rn] = get(start); rn++;
    l[start] &= mask; this.touched.push(start);
    while (rh < rn) {
      const i = rq[rh], v = rv[rh]; rh++;
      const y = Math.floor(i / plane), r = i - y * plane, z = Math.floor(r / sx), x = r - z * sx;
      for (let k = 0; k < 6; k++) {
        const nx = x + DIRS[k], ny = y + DIRS[k + 6], nz = z + DIRS[k + 12];
        if (nx < 0 || ny < 0 || nz < 0 || nx >= sx || ny >= sy || nz >= sz) continue;
        const j = ny * plane + nz * sx + nx, nv = get(j);
        if (!nv) continue;
        if ((nv < v || (shift && k === 3 && v === 15 && nv === 15)) && !(EMIT[d[j]] && !shift)) {
          if (rn < rq.length) { rq[rn] = j; rv[rn] = nv; rn++; }
          l[j] &= mask; this.touched.push(j);
        } else if (qn < q.length) q[qn++] = j;
      }
    }
    return qn;
  }
  update(x, y, z, oldId, id) {
    const w = this.w;
    if (!w.inside(x, y, z)) return;
    const { sx, sz } = w, plane = sx * sz, l = this.l;
    const i = y * plane + (z + w.oz) * sx + (x + w.ox);
    this.touched.length = 0;
    let qn = 0;
    if (l[i] >> 4) qn += this.remove(i, true);
    const q1 = this.q.slice(0, qn);
    let qb = 0;
    if (l[i] & 15) qb = this.remove(i, false);
    const q2 = this.q.slice(0, qb);
    let n = 0;
    for (const j of q1) this.q[n++] = j;
    for (const j of q2) this.q[n++] = j;
    if (!OPQ[id]) {
      const d = w.data, sy = w.sy;
      const above = y + 1 >= sy ? 0xf0 : l[i + plane];
      let s = (above >> 4) === 15 && !DIM[id] ? 15 : 0;
      if (s === 15) {
        for (let yy = y, j = i; yy >= 0; yy--, j -= plane) { const bid = d[j]; if (OPQ[bid] || DIM[bid]) break; if ((l[j] >> 4) !== 15) { l[j] = 0xf0 | (l[j] & 15); this.touched.push(j); this.q[n++] = j; } }
      }
      for (const off of [1, -1, sx, -sx, plane, -plane]) { const j = i + off; if (j >= 0 && j < l.length && l[j]) this.q[n++] = j; }
    }
    if (EMIT[id]) { l[i] = (l[i] & 0xf0) | EMIT[id]; this.q[n++] = i; this.touched.push(i); }
    this.spread(n, true, true);
    const seen = new Set();
    for (const j of this.touched) {
      const yy = Math.floor(j / plane), r = j - yy * plane, zz = Math.floor(r / sx), xx = r - zz * sx;
      const lx = xx & 15, ly = yy & 15, lz = zz & 15, edge = (lx === 0 ? 1 : lx === 15 ? 2 : 0) | (ly === 0 ? 4 : ly === 15 ? 8 : 0) | (lz === 0 ? 16 : lz === 15 ? 32 : 0);
      const key = (((xx >> 4) * 512 + (yy >> 4)) * 512 + (zz >> 4)) * 64 + edge;
      if (seen.has(key)) continue;
      seen.add(key);
      w.markDirty(xx - w.ox, yy, zz - w.oz);
    }
  }
}
