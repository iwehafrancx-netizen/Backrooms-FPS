import { MAPBLOCK, chestAt } from './common.js';

const PLANTS = new Set([40, 41, 42, 43, 76]);

function chest(f, chests, lx, ly, lz, tier, group) {
  const p = f.pos(lx, ly, lz);
  chestAt(f.w, chests, p.x, p.y, p.z, tier);
  chests[chests.length - 1].group = group;
}

export function flatten(f, x0, z0, x1, z1, top, under, depth = 5) {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    let g = false;
    for (let y = 2; y >= -3; y--) if (f.get(x, y, z) && !PLANTS.has(f.get(x, y, z))) { g = true; break; }
    if (!g) continue;
    f.set(x, 0, z, top);
    for (let y = 1; y < 12; y++) { const id = f.get(x, y, z); if (id && id !== 17) f.set(x, y, z, 0); }
    for (let y = -1; y >= -depth; y--) { if (f.get(x, y, z) && !PLANTS.has(f.get(x, y, z))) break; f.set(x, y, z, under); }
  }
}

export function cottage(f, s, wool, chests, r, group, tier = 'spawn') {
  const wood = s.cottageWood || 5, log = s.cottageLog || 6;
  flatten(f, -5, -4, 5, 5, s.yard || s.path, s.yardUnder || s.wall2);
  f.box(-4, 0, -3, 4, 0, 3, wood === 5 ? 50 : wood);
  f.walls(-4, 1, -3, 4, 3, 3, wood);
  for (const [x, z] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) f.box(x, 0, z, x, 4, z, log);
  for (const x of [-4, 4]) f.box(x, 0, 0, x, 3, 0, log);
  for (const [x, z] of [[-4, -1], [-4, 1], [4, -1], [4, 1], [-2, -3], [2, -3], [-2, 3]]) f.set(x, 2, z, 12);
  f.box(1, 1, 3, 1, 2, 3, 0);
  for (let k = 0; k <= 3; k++) for (let x = -5; x <= 5; x++) { f.set(x, 4 + k, -4 + k, s.roof); f.set(x, 4 + k, 4 - k, s.roof); if (k < 3) for (let z = -3 + k; z <= 3 - k; z++) for (const xx of [-4, 4]) if (Math.abs(x) === 5) f.set(xx, 4 + k, z, wood); }
  for (let x = -5; x <= 5; x++) f.set(x, 7, 0, wool || s.roof);
  f.set(-3, 1, -2, 74); f.set(-3, 1, -1, 75); f.set(-2, 1, -2, 56); f.set(3, 1, -2, wool || 38); f.set(3, 1, -1, wool || 38);
  f.set(0, 3, 0, s.light);
  f.set(3, 1, 4, 81); f.set(-3, 1, 4, 73);
  chest(f, chests, 3, 1, 2, tier, group);
  chest(f, chests, -3, 1, 2, tier, group);
  return f.pos(1, 1, 5);
}

export function farm(f, s, chests, r, group, tier = 'spawn') {
  flatten(f, -5, -4, 5, 4, s.yard || 1, s.yardUnder || 2);
  for (let z = -3; z <= 3; z++) for (let x = -4; x <= 4; x++) {
    if (Math.abs(x) === 4 || Math.abs(z) === 3) { f.set(x, 1, z, 77); continue; }
    if (x === 0) { f.set(x, 0, z, 68); continue; }
    f.set(x, 0, z, 84); if (r() < 0.85) f.set(x, 1, z, 76);
  }
  f.set(0, 1, 3, 0); f.set(0, 1, -3, 0);
  f.set(4, 1, 0, 77); f.set(5, 1, -2, 55); f.set(5, 2, -2, 55); f.set(5, 1, -1, 55); f.set(-5, 1, 2, 29); f.set(-5, 1, 1, 80);
  f.set(-2, 1, 0, 77); f.set(-2, 2, 0, 77); f.set(-2, 3, 0, 29);
  chest(f, chests, 5, 1, 2, tier, group);
}

export function well(f, s) {
  flatten(f, -2, -2, 2, 2, s.path, s.wall);
  f.walls(-1, 0, -1, 1, 1, 1, 4);
  for (let y = -4; y <= 1; y++) if (y <= 0) f.set(0, y, 0, y === -4 ? 11 : 0);
  f.set(0, 1, 0, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.box(x, 2, z, x, 3, z, 77);
  f.box(-1, 4, -1, 1, 4, 1, s.roof);
  f.set(0, 3, 0, 27);
}

export function fountain(f, s) {
  flatten(f, -4, -4, 4, 4, s.path, s.wall);
  for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) { const d = Math.max(Math.abs(x), Math.abs(z)); if (d === 3) f.set(x, 1, z, s.wall); else if (d <= 2) f.set(x, 0, z, 11); }
  f.box(0, 0, 0, 0, 3, 0, s.pillar); f.set(0, 4, 0, 78);
  for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) { f.box(x, 1, z, x, 2, z, s.trim); f.set(x, 3, z, s.light); }
}

export function stall(f, s, wool, r) {
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.box(x, 1, z, x, 2, z, 77);
  for (let z = -1; z <= 1; z++) for (let x = -2; x <= 2; x++) f.set(x, 3, z, (x + 2) % 2 ? wool : 38);
  const goods = [73, 80, 29, 55, 73];
  f.set(0, 1, -1, goods[Math.floor(r() * goods.length)]); f.set(-1, 1, 0, 73); f.set(1, 1, 0, goods[Math.floor(r() * goods.length)]);
}

export function market(f, s, r, wools) {
  flatten(f, -7, -5, 7, 5, s.path, s.wall);
  for (let z = -5; z <= 5; z++) for (let x = -7; x <= 7; x++) if (r() < 0.25) f.set(x, 0, z, 67);
  const spots = [[-4, -2], [0, -2], [4, -2], [-4, 3], [4, 3]];
  spots.forEach(([x, z], i) => stall(new Sub(f, x, 0, z), s, wools[i % wools.length], r));
  f.set(0, 1, 3, 27);
}

export function windmill(f, s, chests, r, group, tier = 'satellite') {
  flatten(f, -4, -4, 4, 4, s.yard || s.path, s.yardUnder || s.wall);
  for (let y = 1; y <= 9; y++) for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) if (Math.abs(x) === 2 || Math.abs(z) === 2) f.set(x, y, z, y < 4 ? 4 : (Math.abs(x) === 2 && Math.abs(z) === 2) ? 6 : 5);
  f.box(0, 1, 2, 0, 2, 2, 0);
  for (let k = 0; k < 3; k++) f.box(-2 + k, 10 + k, -2 + k, 2 - k, 10 + k, 2 - k, s.roof);
  for (let i = 1; i <= 5; i++) { f.set(0, 7 + i, 3, 38); f.set(0, 7 - i, 3, 38); f.set(i, 7, 3, 38); f.set(-i, 7, 3, 38); if (i > 1) { f.set(1, 7 + i, 3, 5); f.set(-1, 7 - i, 3, 5); f.set(i, 6, 3, 5); f.set(-i, 8, 3, 5); } }
  f.set(0, 7, 3, 6);
  f.box(-1, 1, -1, 1, 1, -1, 55);
  f.set(0, 3, 0, s.light);
  chest(f, chests, 1, 1, 1, tier, group);
  f.set(-1, 1, 1, 73);
}

export function watchtower(f, s, chests, r, group, tier = 'satellite') {
  flatten(f, -3, -3, 3, 3, s.yard || s.path, s.yardUnder || s.wall);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) f.box(x, 1, z, x, 8, z, 6);
  for (let y = 1; y <= 7; y++) { const st = (y - 1) % 4, pos = [[-1, -1], [1, -1], [1, 1], [-1, 1]][st]; f.set(pos[0], y, pos[1], 5); }
  f.box(-2, 8, -2, 2, 8, 2, 5);
  f.set(-1, 8, -1, 0);
  for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) if (Math.abs(x) === 2 || Math.abs(z) === 2) f.set(x, 9, z, 77);
  f.box(-2, 11, -2, 2, 11, 2, s.roof);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) f.box(x, 9, z, x, 10, z, 6);
  f.set(0, 9, 0, 0); f.set(1, 9, 1, 27);
  chest(f, chests, 0, 1, 0, tier, group);
  chest(f, chests, 1, 9, -1, tier, group);
}

export function mineEntrance(f, s, chests, r, group, tier = 'satellite') {
  for (let z = -4; z <= 4; z++) for (let x = -5; x <= 5; x++) {
    const h = Math.max(0, Math.round(5 - Math.hypot(x * 0.9, z * 1.1) + r() * 0.8));
    for (let y = 1; y <= h; y++) f.set(x, y, z, y === h ? (h > 3 ? 4 : 1) : r() < 0.07 ? 67 : 3);
  }
  f.box(-1, 1, -1, 1, 3, 5, 0);
  for (const z of [3, 0]) { f.box(-2, 1, z, -2, 3, z, 6); f.box(2, 1, z, 2, 3, z, 6); f.box(-2, 4, z, 2, 4, z, 5); }
  f.box(-1, 0, -1, 1, 0, 5, 67);
  f.set(-1, 2, 1, 81);
  chest(f, chests, 0, 1, -2, tier, group);
  f.set(1, 1, -2, 73); f.set(-1, 1, -2, 75);
}

export function chapel(f, s, chests, r, group, tier = 'satellite') {
  flatten(f, -4, -6, 4, 6, s.path, s.wall);
  f.box(-3, 0, -5, 3, 0, 5, s.floor);
  for (let y = 1; y <= 5; y++) for (let z = -5; z <= 5; z++) for (const x of [-3, 3]) if (r() > 0.1 + y * 0.06) f.set(x, y, z, r() < 0.2 ? 48 : 47);
  for (let y = 1; y <= 7; y++) for (let x = -3; x <= 3; x++) if (r() > 0.05 + y * 0.05 && !(Math.abs(x) <= 1 && y <= 3)) f.set(x, y, -5, r() < 0.2 ? 49 : 47);
  f.box(-1, 4, -5, 1, 5, -5, 12);
  f.box(-1, 1, 5, 1, 3, 5, 0);
  for (let z = -2; z <= 3; z += 2) { f.set(-2, 1, z, 50); f.set(2, 1, z, 50); }
  f.box(-1, 1, -4, 1, 1, -4, 51);
  f.set(0, 2, -4, 27);
  chest(f, chests, 0, 1, -3, tier, group);
}

export function camp(f, s, r) {
  flatten(f, -3, -3, 3, 3, 79, 2);
  f.set(0, 0, 0, 19);
  for (const [x, z] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) f.set(x, 1, z, 6);
  f.box(2, 1, 2, 3, 2, 3, 38); f.set(-2, 1, 2, 73);
}

export function orchard(f, s, pal, r, treeFn) {
  flatten(f, -5, -5, 5, 5, pal.top, pal.under);
  for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3], [0, 0]]) { const p = f.pos(x, 0, z); treeFn(p.x, p.y, p.z); }
  for (let i = -5; i <= 5; i++) { f.set(i, 1, -5, 77); f.set(i, 1, 5, 77); f.set(-5, 1, i, 77); f.set(5, 1, i, 77); }
  f.set(0, 1, 5, 0); f.set(0, 1, -5, 0);
}

export function path(w, x0, z0, x1, z1, wide = 1, r = Math.random) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0)) * 2 || 1;
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n), z = Math.round(z0 + ((z1 - z0) * i) / n);
    for (let dz = -wide + 1; dz < wide; dz++) for (let dx = -wide + 1; dx < wide; dx++) {
      const xx = x + dx, zz = z + dz;
      for (let y = w.sy - 2; y > 0; y--) {
        const id = w.get(xx, y, zz);
        if (!id) continue;
        if (PLANTS.has(id)) { w.set(xx, y, zz, 0, 0, true); continue; }
        if (id === 1 || id === 10 || id === 8 || id === 2 || id === 79) { w.set(xx, y, zz, r() < 0.15 ? 67 : 68, MAPBLOCK, true); if (PLANTS.has(w.get(xx, y + 1, zz))) w.set(xx, y + 1, zz, 0, 0, true); }
        break;
      }
    }
  }
}

export class Sub {
  constructor(f, ox, oy, oz) { this.f = f; this.ox = ox; this.oy = oy; this.oz = oz; this.w = f.w; }
  set(x, y, z, id) { this.f.set(x + this.ox, y + this.oy, z + this.oz, id); }
  get(x, y, z) { return this.f.get(x + this.ox, y + this.oy, z + this.oz); }
  pos(x, y, z) { return this.f.pos(x + this.ox, y + this.oy, z + this.oz); }
  box(x0, y0, z0, x1, y1, z1, id) { this.f.box(x0 + this.ox, y0 + this.oy, z0 + this.oz, x1 + this.ox, y1 + this.oy, z1 + this.oz, id); }
  walls(x0, y0, z0, x1, y1, z1, id) { this.f.walls(x0 + this.ox, y0 + this.oy, z0 + this.oz, x1 + this.ox, y1 + this.oy, z1 + this.oz, id); }
}
