import { TEAM_COLORS } from '../../engine/blocks.js';

export const PLACED = 1, MAPBLOCK = 2;
export { TEAM_COLORS };

export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

export function makeNoise(seed) {
  const r = rng(seed), perm = new Uint8Array(512), vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const v = (x, y) => vals[perm[(x & 255) + perm[y & 255]]];
  const sm = (t) => t * t * (3 - 2 * t);
  const n2 = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi); const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1); return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
  return (x, y, oct = 3) => { let s = 0, a = 1, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += n2(x * f, y * f) * a; n += a; a *= 0.5; f *= 2; } return s / n; };
}

export const PALETTES = {
  meadow: { top: 1, under: 2, core: 3, accent: 28, trunk: 6, leaves: 7, plants: [40, 40, 40, 41, 42], tree: 'oak', rock: 4 },
  desert: { top: 8, under: 9, core: 9, accent: 22, trunk: 44, leaves: 0, plants: [43, 43, 40], tree: 'cactus', rock: 9 },
  snow: { top: 10, under: 2, core: 3, accent: 11, trunk: 6, leaves: 7, plants: [40], tree: 'spruce', rock: 3 },
  volcano: { top: 18, under: 18, core: 13, accent: 19, trunk: 18, leaves: 0, plants: [], tree: 'spire', rock: 18 },
};

export const STYLES = {
  castle: { wall: 47, wall2: 48, wall3: 49, floor: 52, pillar: 47, roof: 53, trim: 50, window: 54, path: 4, light: 27 },
  temple: { wall: 9, wall2: 65, wall3: 9, floor: 9, pillar: 51, roof: 65, trim: 51, window: 12, path: 9, light: 27 },
  fort: { wall: 47, wall2: 49, wall3: 52, floor: 52, pillar: 51, roof: 10, trim: 50, window: 11, path: 52, light: 27 },
  ruins: { wall: 18, wall2: 49, wall3: 21, floor: 52, pillar: 18, roof: 18, trim: 21, window: 54, path: 18, light: 66 },
  village: { wall: 5, wall2: 6, wall3: 50, floor: 50, pillar: 6, roof: 53, trim: 50, window: 12, path: 4, light: 27 },
  sea: { wall: 64, wall2: 51, wall3: 64, floor: 51, pillar: 51, roof: 64, trim: 51, window: 12, path: 51, light: 27 },
};

export function island(w, n, cx, cz, top, r, pal, opt = {}) {
  const R = Math.ceil(r * 1.35), depth = opt.depth ?? r * 1.1, cells = [];
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const d = Math.hypot(dx, dz) / r + (n((cx + dx) * 0.13, (cz + dz) * 0.13) - 0.5) * (opt.rough ?? 0.55);
    if (d >= 1) continue;
    const x = cx + dx, z = cz + dz;
    const bump = opt.hills ? Math.max(0, Math.round((n(x * 0.06 + 30, z * 0.06 - 20, 2) - 0.42) * opt.hills * 2.4 * Math.pow(Math.max(0, 1 - d), 0.6))) : opt.flat ? 0 : Math.floor(n(x * 0.21 + 50, z * 0.21) * 2.2 * (1 - d));
    const ty = top + bump;
    const rocky = opt.hills && d > 0.8 && n(x * 0.25 + 7, z * 0.25) > 0.55;
    const bottom = Math.round(top - 1 - Math.pow(1 - d, 0.75) * depth * (0.55 + n(x * 0.3, z * 0.3 + 9) * 0.7));
    for (let y = bottom; y <= ty; y++) {
      let id = pal.core;
      if (y === ty) id = rocky ? pal.rock : pal.top;
      else if (y >= ty - 2) id = rocky ? pal.rock : pal.under;
      else if (n(x * 0.4, y * 0.4 + z * 0.4) > 0.72) id = pal.accent;
      w.set(x, y, z, id, MAPBLOCK, true);
    }
    cells.push([x, ty, z, d]);
  }
  return cells;
}

export function tree(w, r, x, y, z, kind, pal) {
  if (kind === 'oak') {
    const h = 4 + Math.floor(r() * 2);
    for (let i = 1; i <= h; i++) w.set(x, y + i, z, pal.trunk, MAPBLOCK, true);
    for (let dy = h - 2; dy <= h + 1; dy++) {
      const rad = dy >= h ? 1 : 2;
      for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
        if (Math.abs(dx) === rad && Math.abs(dz) === rad && (dy === h + 1 || r() < 0.5)) continue;
        if (!w.get(x + dx, y + dy, z + dz)) w.set(x + dx, y + dy, z + dz, pal.leaves, MAPBLOCK, true);
      }
    }
  } else if (kind === 'spruce') {
    const h = 6 + Math.floor(r() * 2);
    for (let i = 1; i <= h; i++) w.set(x, y + i, z, pal.trunk, MAPBLOCK, true);
    for (let dy = 2; dy <= h + 1; dy++) {
      const rad = dy === h + 1 ? 0 : Math.max(1, Math.round((h - dy) / 2.2));
      for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
        if (Math.abs(dx) + Math.abs(dz) > rad + 1) continue;
        if (!w.get(x + dx, y + dy, z + dz)) w.set(x + dx, y + dy, z + dz, pal.leaves, MAPBLOCK, true);
      }
      if (dy % 2) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.get(x + dx * 2, y + dy, z + dz * 2) === pal.leaves) w.set(x + dx * 2, y + dy, z + dz * 2, 10, MAPBLOCK, true);
    }
  } else if (kind === 'cactus') {
    const h = 2 + Math.floor(r() * 2);
    for (let i = 1; i <= h; i++) w.set(x, y + i, z, 44, MAPBLOCK, true);
  } else if (kind === 'spire') {
    const h = 3 + Math.floor(r() * 4);
    for (let i = 1; i <= h; i++) w.set(x, y + i, z, i === h ? 19 : 18, MAPBLOCK, true);
  }
}

export function decorate(w, r, cells, pal, density = 0.18, trees = 1, ok = () => true) {
  const free = cells.filter(([, , , d]) => d < 0.8);
  let placed = 0;
  for (let i = 0; i < trees * 8 && placed < trees; i++) {
    const c = free[Math.floor(r() * free.length)];
    if (!c || c[3] < 0.25) continue;
    if (w.get(c[0], c[1] + 1, c[2]) || !ok(c[0], c[2])) continue;
    if (w.get(c[0], c[1], c[2]) !== pal.top) continue;
    tree(w, r, c[0], c[1], c[2], pal.tree, pal); placed++;
  }
  if (!pal.plants.length) return;
  for (const [x, y, z, d] of cells) if (d < 0.9 && r() < density && !w.get(x, y + 1, z) && w.get(x, y, z) === pal.top) w.set(x, y + 1, z, pal.plants[Math.floor(r() * pal.plants.length)], MAPBLOCK, true);
}

export function chestAt(w, chests, x, y, z, tier) { w.set(x, y, z, 17, MAPBLOCK, true); for (let yy = y + 1; yy <= y + 2; yy++) if (w.get(x, yy, z) >= 40 && w.get(x, yy, z) <= 43) w.set(x, yy, z, 0, 0, true); chests.push({ x, y, z, tier, items: [] }); }

export function dirTo(fromX, fromZ, toX, toZ) {
  const dx = toX - fromX, dz = toZ - fromZ;
  return Math.abs(dx) > Math.abs(dz) ? [Math.sign(dx), 0] : [0, Math.sign(dz) || 1];
}

export class Frame {
  constructor(w, ox, oy, oz, front = [0, 1]) {
    this.w = w; this.ox = ox; this.oy = oy; this.oz = oz;
    this.fx = front[0]; this.fz = front[1]; this.rx = front[1]; this.rz = -front[0];
  }
  wx(lx, lz) { return this.ox + lx * this.rx + lz * this.fx; }
  wz(lx, lz) { return this.oz + lx * this.rz + lz * this.fz; }
  pos(lx, ly, lz) { return { x: this.wx(lx, lz), y: this.oy + ly, z: this.wz(lx, lz) }; }
  set(lx, ly, lz, id) { this.w.set(this.wx(lx, lz), this.oy + ly, this.wz(lx, lz), id, id ? MAPBLOCK : 0, true); }
  get(lx, ly, lz) { return this.w.get(this.wx(lx, lz), this.oy + ly, this.wz(lx, lz)); }
  box(x0, y0, z0, x1, y1, z1, id) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, z, id); }
  walls(x0, y0, z0, x1, y1, z1, id) { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (x === x0 || x === x1 || z === z0 || z === z1) this.set(x, y, z, id); }
  foundation(x0, z0, x1, z1, id, core, depth = 6, edge = 1) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const outer = x < x0 + edge || x > x1 - edge || z < z0 + edge || z > z1 - edge;
      if (outer) { let g = false; for (let y = 0; y >= -3; y--) if (this.get(x, y, z)) { g = true; break; } if (!g) continue; }
      this.set(x, 0, z, id);
      for (let y = 1; y < 14; y++) if (this.get(x, y, z) && this.get(x, y, z) !== 17) this.set(x, y, z, 0);
      for (let y = -1; y >= -depth; y--) { if (this.get(x, y, z)) break; this.set(x, y, z, core); }
    }
  }
}
