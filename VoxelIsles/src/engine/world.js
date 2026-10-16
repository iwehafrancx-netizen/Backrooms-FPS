import { BLOCKS, isSolid } from './blocks.js';

export const CHUNK = 16;

export class World {
  constructor(sx, sy, sz) {
    this.sx = sx; this.sy = sy; this.sz = sz;
    this.cx = Math.ceil(sx / CHUNK); this.cy = Math.ceil(sy / CHUNK); this.cz = Math.ceil(sz / CHUNK);
    this.ox = Math.floor(sx / 2); this.oz = Math.floor(sz / 2);
    this.data = new Uint8Array(sx * sy * sz);
    this.flags = new Uint8Array(sx * sy * sz);
    this.dirty = new Set();
    this.listeners = [];
  }
  idx(x, y, z) { return ((y * this.sz) + (z + this.oz)) * this.sx + (x + this.ox); }
  inside(x, y, z) { return y >= 0 && y < this.sy && x + this.ox >= 0 && x + this.ox < this.sx && z + this.oz >= 0 && z + this.oz < this.sz; }
  get(x, y, z) { x = Math.floor(x); y = Math.floor(y); z = Math.floor(z); return this.inside(x, y, z) ? this.data[this.idx(x, y, z)] : 0; }
  flag(x, y, z) { return this.inside(x, y, z) ? this.flags[this.idx(x, y, z)] : 0; }
  set(x, y, z, id, flag = 0, silent = false) {
    if (!this.inside(x, y, z)) return false;
    const i = this.idx(x, y, z);
    const old = this.data[i];
    this.data[i] = id; this.flags[i] = id ? flag : 0;
    this.markDirty(x, y, z);
    if (this.light && old !== id) this.light.update(x, y, z, old, id);
    if (!silent) for (const l of this.listeners) l(x, y, z, id, old);
    return true;
  }
  markDirty(x, y, z) {
    const gx = x + this.ox, gz = z + this.oz;
    const cx = Math.floor(gx / CHUNK), cy = Math.floor(y / CHUNK), cz = Math.floor(gz / CHUNK);
    this.dirty.add(this.key(cx, cy, cz));
    const lx = gx % CHUNK, ly = y % CHUNK, lz = gz % CHUNK;
    if (lx === 0 && cx > 0) this.dirty.add(this.key(cx - 1, cy, cz));
    if (lx === CHUNK - 1 && cx < this.cx - 1) this.dirty.add(this.key(cx + 1, cy, cz));
    if (ly === 0 && cy > 0) this.dirty.add(this.key(cx, cy - 1, cz));
    if (ly === CHUNK - 1 && cy < this.cy - 1) this.dirty.add(this.key(cx, cy + 1, cz));
    if (lz === 0 && cz > 0) this.dirty.add(this.key(cx, cy, cz - 1));
    if (lz === CHUNK - 1 && cz < this.cz - 1) this.dirty.add(this.key(cx, cy, cz + 1));
  }
  key(cx, cy, cz) { return (cx * this.cy + cy) * this.cz + cz; }
  unkey(k) { const cz = k % this.cz, r = (k - cz) / this.cz, cy = r % this.cy, cx = (r - cy) / this.cy; return [cx, cy, cz]; }
  solidAt(x, y, z) { return isSolid(this.get(x, y, z)); }
  topY(x, z) { for (let y = this.sy - 1; y >= 0; y--) if (isSolid(this.get(x, y, z))) return y; return -1; }
  fill(x0, y0, z0, x1, y1, z1, id, flag = 0) { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.set(x, y, z, id, flag, true); }

  raycast(ox, oy, oz, dx, dy, dz, maxDist, pred = (id) => id !== 0) {
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
    const tdx = dx ? Math.abs(1 / dx) : Infinity, tdy = dy ? Math.abs(1 / dy) : Infinity, tdz = dz ? Math.abs(1 / dz) : Infinity;
    let tmx = dx ? (sx > 0 ? x + 1 - ox : ox - x) * tdx : Infinity;
    let tmy = dy ? (sy > 0 ? y + 1 - oy : oy - y) * tdy : Infinity;
    let tmz = dz ? (sz > 0 ? z + 1 - oz : oz - z) * tdz : Infinity;
    let t = 0, nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < 256 && t <= maxDist; i++) {
      const id = this.get(x, y, z);
      if (pred(id, x, y, z)) return { x, y, z, id, nx, ny, nz, t };
      if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; nx = -sx; ny = 0; nz = 0; }
      else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tmz; tmz += tdz; nx = 0; ny = 0; nz = -sz; }
    }
    return null;
  }

  boxHits(minX, minY, minZ, maxX, maxY, maxZ) {
    for (let y = Math.floor(minY); y <= Math.floor(maxY - 1e-6); y++)
      for (let z = Math.floor(minZ); z <= Math.floor(maxZ - 1e-6); z++)
        for (let x = Math.floor(minX); x <= Math.floor(maxX - 1e-6); x++)
          if (isSolid(this.get(x, y, z))) return true;
    return false;
  }
}

export const hardness = (id) => (BLOCKS[id] ? BLOCKS[id].hardness : 1);
