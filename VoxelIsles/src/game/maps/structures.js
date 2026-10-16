import { MAPBLOCK, chestAt } from './common.js';

const mixWall = (f, r, s, lx, ly, lz) => { const v = r(); f.set(lx, ly, lz, v < 0.12 ? s.wall3 : v < 0.32 ? s.wall2 : s.wall); };

function chest(f, chests, lx, ly, lz, tier, group) {
  const p = f.pos(lx, ly, lz);
  chestAt(f.w, chests, p.x, p.y, p.z, tier);
  chests[chests.length - 1].group = group;
}

export function flagPole(f, s, wool, lx, ly, lz, h = 5) {
  f.box(lx, ly, lz, lx, ly + h, lz, s.trim);
  f.box(lx + 1, ly + h - 2, lz, lx + 2, ly + h, lz, wool);
}

export function lampPost(f, s, lx, ly, lz) {
  f.box(lx, ly, lz, lx, ly + 2, lz, s.trim);
  f.set(lx, ly + 3, lz, s.light);
}

export function castleKeep(f, s, wool, chests, r, group, broken = false) {
  f.foundation(-6, -6, 6, 6, s.path, s.wall);
  f.box(-4, 0, -4, 4, 0, 4, s.floor);
  for (let y = 1; y <= 5; y++) for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) if (Math.abs(x) === 4 || Math.abs(z) === 4) mixWall(f, r, s, x, y, z);
  for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) { f.box(x, 1, z, x, 7, z, s.pillar); f.set(x, 8, z, wool); }
  f.box(-4, 6, -4, 4, 6, 4, s.floor);
  for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) if (Math.abs(x) === 4 || Math.abs(z) === 4) { f.set(x, 6, z, wool); if ((x + z) % 2 === 0 && !(Math.abs(x) === 4 && Math.abs(z) === 4)) f.set(x, 7, z, s.wall); }
  for (const [x, z] of [[-4, 0], [4, 0], [-2, -4], [2, -4], [-2, 4], [2, 4]]) f.box(x, 2, z, x, 3, z, s.window);
  f.box(-1, 1, 4, 1, 3, 4, 0);
  f.box(-1, 4, 4, 1, 4, 4, s.trim);
  f.set(0, 5, 0, s.light);
  flagPole(f, s, wool, 0, 7, -3, 5);
  chest(f, chests, -3, 1, -3, 'spawn', group);
  chest(f, chests, 3, 1, -3, 'spawn', group);
  chest(f, chests, -3, 1, 2, 'spawn', group);
  if (broken) for (let y = 2; y <= 7; y++) for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) if ((Math.abs(x) === 4 || Math.abs(z) === 4) && r() < 0.16 + y * 0.03 && f.get(x, y, z) !== wool) f.set(x, y, z, 0);
  return f.pos(0, 1, 0);
}

export function house(f, s, wool, chests, r, group) {
  f.foundation(-5, -5, 5, 5, s.path, s.wall2);
  f.box(-3, 0, -3, 3, 0, 3, s.floor);
  f.walls(-3, 1, -3, 3, 4, 3, s.wall);
  for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) f.box(x, 1, z, x, 4, z, s.wall2);
  for (const [x, z] of [[-3, 0], [3, 0], [-1, -3], [1, -3]]) f.box(x, 2, z, x, 3, z, s.window);
  f.box(0, 1, 3, 0, 2, 3, 0);
  for (let k = 0; k <= 4; k++) for (let z = -4; z <= 4; z++) { f.set(-4 + k, 5 + k, z, s.roof); f.set(4 - k, 5 + k, z, s.roof); if (k < 4) for (let x = -3 + k; x <= 3 - k; x++) if (Math.abs(z) === 3) f.set(x, 5 + k, z, s.wall); }
  for (let z = -4; z <= 4; z++) f.set(0, 9, z, wool);
  f.set(0, 4, 0, s.light);
  f.box(-2, 1, 4, -2, 1, 4, 55); f.box(2, 1, 4, 2, 2, 4, 55);
  lampPost(f, s, 4, 1, 5);
  chest(f, chests, -2, 1, -2, 'spawn', group);
  chest(f, chests, 2, 1, -2, 'spawn', group);
  chest(f, chests, 2, 1, 1, 'spawn', group);
  f.set(-2, 1, 1, 56);
  return f.pos(0, 1, 0);
}

export function temple(f, s, wool, chests, r, group) {
  f.foundation(-6, -6, 6, 6, s.path, s.wall);
  f.box(-5, 0, -5, 5, 0, 5, s.floor);
  f.box(-4, 1, -4, 4, 1, 4, s.wall2);
  f.box(-3, 1, -3, 3, 1, 3, s.floor);
  f.box(-1, 1, 4, 1, 1, 5, s.wall2);
  for (const x of [-4, -2, 2, 4]) for (const z of [-4, 4]) f.box(x, 2, z, x, 5, z, s.pillar);
  for (const z of [-2, 0, 2]) for (const x of [-4, 4]) f.box(x, 2, z, x, 5, z, s.pillar);
  f.walls(-4, 2, -4, 4, 2, -4, s.wall);
  f.box(-4, 6, -4, 4, 6, 4, s.wall);
  for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) if (Math.abs(x) === 4 || Math.abs(z) === 4) f.set(x, 7, z, (x + z) % 2 ? wool : s.trim);
  f.box(-1, 7, -1, 1, 7, 1, s.wall2); f.set(0, 8, 0, wool);
  f.set(0, 5, 0, s.light);
  chest(f, chests, -3, 2, -3, 'spawn', group);
  chest(f, chests, 3, 2, -3, 'spawn', group);
  chest(f, chests, 3, 2, 2, 'spawn', group);
  return f.pos(0, 2, 0);
}

export function fort(f, s, wool, chests, r, group) {
  f.foundation(-7, -7, 7, 7, s.path, s.wall);
  f.box(-6, 0, -6, 6, 0, 6, s.floor);
  for (let y = 1; y <= 3; y++) for (let z = -6; z <= 6; z++) for (let x = -6; x <= 6; x++) if (Math.abs(x) === 6 || Math.abs(z) === 6) mixWall(f, r, s, x, y, z);
  for (let z = -6; z <= 6; z++) for (let x = -6; x <= 6; x++) if ((Math.abs(x) === 6 || Math.abs(z) === 6) && (x + z) % 2 === 0) f.set(x, 4, z, wool);
  f.box(-1, 1, 6, 1, 3, 6, 0);
  f.box(-1, 4, 6, 1, 4, 6, 0);
  for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
    const sx = Math.sign(x), sz = Math.sign(z);
    f.box(x - sx, 1, z - sz, x, 6, z, s.pillar);
    f.box(x - sx, 7, z - sz, x, 7, z, wool);
  }
  f.box(-1, 1, -1, 1, 1, 1, s.wall);
  f.set(0, 1, 0, 0);
  f.box(-1, 0, -1, 1, 0, 1, s.wall);
  lampPost(f, s, -4, 1, 3); lampPost(f, s, 4, 1, 3);
  chest(f, chests, -5, 1, -5, 'spawn', group);
  chest(f, chests, 5, 1, -5, 'spawn', group);
  chest(f, chests, -5, 1, 4, 'spawn', group);
  flagPole(f, s, wool, 0, 1, -5, 6);
  return f.pos(0, 1, 3);
}

export function tower(f, s, wool, lx, lz, h = 7, chests = null, tier = 'satellite', group = -1) {
  f.box(lx - 1, 0, lz - 1, lx + 1, 0, lz + 1, s.floor);
  f.walls(lx - 1, 1, lz - 1, lx + 1, h, lz + 1, s.wall);
  f.box(lx, 1, lz + 1, lx, 2, lz + 1, 0);
  f.set(lx - 1, 3, lz, s.window); f.set(lx + 1, 3, lz, s.window);
  f.box(lx - 1, h + 1, lz - 1, lx + 1, h + 1, lz + 1, s.floor);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.set(lx + x, h + 2, lz + z, wool || s.trim);
  if (chests) chest(f, chests, lx, 1, lz - 0, tier, group);
}

export function bigCastle(f, s, wool, chests, r) {
  f.foundation(-12, -12, 12, 12, s.path, s.wall);
  f.box(-10, 0, -10, 10, 0, 10, s.floor);
  for (let y = 1; y <= 4; y++) for (let z = -9; z <= 9; z++) for (let x = -9; x <= 9; x++) if (Math.abs(x) === 9 || Math.abs(z) === 9) mixWall(f, r, s, x, y, z);
  for (let z = -9; z <= 9; z++) for (let x = -9; x <= 9; x++) if ((Math.abs(x) === 9 || Math.abs(z) === 9) && (x + z) % 2 === 0) f.set(x, 5, z, s.wall);
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (let k = -1; k <= 1; k++) for (let y = 1; y <= 3; y++) f.set(dx ? dx * 9 : k, y, dz ? dz * 9 : k, 0);
  for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) {
    f.box(x - 1, 1, z - 1, x + 1, 8, z + 1, s.pillar);
    f.box(x - 1, 9, z - 1, x + 1, 9, z + 1, s.floor);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.set(x + a, 10, z + b, wool);
    f.set(x, 10, z, s.light);
  }
  f.walls(-3, 1, -3, 3, 7, 3, s.wall);
  for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) f.box(a, 1, b, a, 9, b, s.pillar);
  f.box(-3, 8, -3, 3, 8, 3, s.floor);
  for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) if ((Math.abs(x) === 3 || Math.abs(z) === 3) && (x + z) % 2 === 0) f.set(x, 9, z, wool);
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (let y = 1; y <= 2; y++) f.set(dx * 3, y, dz * 3, 0);
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) f.box(dx * 3, 4, dz * 3, dx * 3, 5, dz * 3, s.window);
  f.set(0, 7, 0, s.light);
  f.box(-1, 1, -1, 1, 1, 1, 14);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) chest(f, chests, x, 1, z, 'mid', 100);
  for (const [x, z] of [[-7, -6], [7, 6], [-6, 7], [6, -7]]) chest(f, chests, x, 1, z, 'mid', 101);
  for (const [x, z] of [[-6, 0], [6, 0], [0, -6], [0, 6]]) lampPost(f, s, x, 1, z);
}

export function ruins(f, s, chests, r, tier = 'satellite', group = -1) {
  f.foundation(-4, -4, 4, 4, s.path, s.wall);
  for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) {
    if (!(Math.abs(x) === 3 || Math.abs(z) === 3)) continue;
    const h = 1 + Math.floor(r() * 4);
    for (let y = 1; y <= h; y++) mixWall(f, r, s, x, y, z);
  }
  f.box(-1, 1, 3, 1, 4, 3, 0);
  f.box(-3, 5, -3, -3, 7, -3, s.pillar); f.set(-3, 8, -3, s.light);
  chest(f, chests, 1, 1, -1, tier, group);
  if (r() < 0.5) chest(f, chests, -1, 1, 1, tier, group);
}

export function statue(f, s, lx, lz) {
  f.box(lx - 1, 0, lz - 1, lx + 1, 1, lz + 1, s.wall);
  f.box(lx, 2, lz, lx, 4, lz, s.pillar);
  f.box(lx - 1, 4, lz, lx + 1, 4, lz, s.pillar);
  f.set(lx, 5, lz, 14);
}

export function crates(f, lx, lz) { f.set(lx, 1, lz, 55); f.set(lx + 1, 1, lz, 5); f.set(lx, 2, lz, 5); }

export function stoneBridge(w, s, x0, z0, x1, z1, y, broken = 0, rng = Math.random) {
  const dx = x1 - x0, dz = z1 - z0, n = Math.max(Math.abs(dx), Math.abs(dz));
  if (!n) return;
  const px = -dz / Math.hypot(dx, dz), pz = dx / Math.hypot(dx, dz);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (broken && t > 0.5 - broken / 2 && t < 0.5 + broken / 2) continue;
    const cx = x0 + dx * t, cz = z0 + dz * t;
    for (let k = -1; k <= 1; k++) {
      const x = Math.round(cx + px * k), z = Math.round(cz + pz * k);
      if (!w.get(x, y, z)) w.set(x, y, z, k ? s.floor : s.path, MAPBLOCK, true);
      if (!w.get(x, y - 1, z) && (i % 6 === 0) && k === 0) for (let yy = y - 1; yy > y - 4; yy--) w.set(x, yy, z, s.wall, MAPBLOCK, true);
    }
    for (const k of [-2, 2]) {
      const x = Math.round(cx + px * k), z = Math.round(cz + pz * k);
      if (!w.get(x, y, z)) w.set(x, y, z, s.floor, MAPBLOCK, true);
      if (i % 2 === 0 && !w.get(x, y + 1, z)) w.set(x, y + 1, z, s.wall, MAPBLOCK, true);
      if (i % 8 === 0 && !w.get(x, y + 2, z)) w.set(x, y + 2, z, s.light, MAPBLOCK, true);
    }
  }
}
