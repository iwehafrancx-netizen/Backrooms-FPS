import { World } from '../../engine/world.js';
import { TEAM_COLORS } from '../../engine/blocks.js';
import { rng, MAPBLOCK } from './common.js';

const PALS = [[38, 31], [47, 48], [64, 51], [30, 33], [9, 65], [32, 36], [52, 14], [34, 37], [21, 22], [13, 66]];

export function buildParkour(seed, opt = {}) {
  const L = Math.max(1, Math.min(10, opt.level || 1)), r = rng(seed * 101 + L * 7);
  const jumps = opt.jumps || 14 + L * 3;
  const w = new World(jumps > 50 ? 400 : 240, 80, 64);
  const set = (x, y, z, id) => w.set(x, y, z, id, id ? MAPBLOCK : 0, true);
  const [mainId, accent] = PALS[(L - 1) % PALS.length];
  const route = [], checkpoints = [];
  const plat = (cx, y, cz, size, id) => { const h = Math.floor((size - 1) / 2); for (let dz = -h; dz <= size - 1 - h; dz++) for (let dx = -h; dx <= size - 1 - h; dx++) set(cx + dx, y, cz + dz, id); };
  let x = jumps > 50 ? -190 : -110, y = 24, z = 0;
  plat(x, y, z, 5, accent);
  for (let dz = -2; dz <= 2; dz++) set(x - 2, y + 1, dz, 12);
  const start = { x: x + 0.5, y: y + 1, z: z + 0.5, yaw: -Math.PI / 2 };
  checkpoints.push({ x: x + 0.5, y: y + 1, z: z + 0.5, i: 0 });
  route.push({ x: x + 2, y: y + 1, z });
  x += 2;
  let sinceCp = 0, minY = y, prevSize = 5;
  const maxGap = L >= 7 ? 3 : 2;
  for (let j = 0; j < jumps; j++) {
    const roll = r();
    let kind = 'jump';
    if (L >= 4 && roll < 0.12) kind = 'bounce';
    else if (L >= 3 && roll < 0.3) kind = 'up';
    else if (roll < 0.42) kind = 'down';
    const size = L <= 2 ? 3 : L <= 5 ? (r() < 0.5 ? 2 : 3) : L <= 8 ? (r() < 0.5 ? 1 : 2) : 1;
    let gap = 1 + Math.floor(r() * maxGap);
    if (size === 1 || prevSize === 1) gap = Math.min(gap, 2);
    let dy = 0;
    if (kind === 'up') { dy = 1; gap = L >= 8 && r() < 0.4 && size > 1 && prevSize > 1 ? 2 : 1; }
    if (kind === 'down') { dy = -1 - (r() < 0.3 ? 1 : 0); }
    if (kind === 'bounce') { dy = 2; gap = 2; }
    if (y + dy > 60) { dy = -1; kind = 'down'; }
    if (y + dy < 8) { dy = 1; gap = 1; kind = 'up'; }
    let dz = gap >= 3 || (kind === 'up' && gap >= 2) || kind === 'bounce' ? 0 : Math.floor(r() * 3) - 1;
    if ((gap >= 2 && size === 1) || (kind === 'up' && (size === 1 || prevSize === 1))) dz = 0;
    if (kind === 'bounce') {
      x += 1; set(x, y, z, 61); route.push({ x: x - 1, y: y + 1, z });
    }
    const half = Math.floor((size - 1) / 2);
    x += gap + 1 + half;
    z = Math.max(-24, Math.min(24, z + dz));
    y += dy;
    minY = Math.min(minY, y);
    const cp = sinceCp >= 6 && j < jumps - 2;
    if (cp) { plat(x, y, z, 3, accent); set(x, y + 1, z, 58); checkpoints.push({ x: x + 0.5, y: y + 1, z: z + 0.5, i: route.length }); sinceCp = 0; }
    else { plat(x, y, z, size, (j % 4 === 3) ? accent : mainId); sinceCp++; }
    route.push({ x, y: y + 1, z, jump: true, tight: size === 1 && !cp });
    x += size - 1 - half;
    prevSize = cp ? 3 : size;
  }
  x += 3;
  plat(x, y, z, 5, 14);
  for (let dz = -2; dz <= 2; dz++) set(x, y + 1, z + dz, 59);
  for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { for (let k = 1; k <= 3; k++) set(x + a, y + k, z + b, 51); set(x + a, y + 4, z + b, 27); }
  route.push({ x, y: y + 1, z, jump: true });
  route.push({ x: x + 1, y: y + 1, z });
  const finish = { x, y: y + 1, z };
  const par = Math.round(route.length * 0.85 + 4);
  return { world: w, theme: opt.theme || 'meadow', top: y, voidY: minY - 8, center: { x: 0, y: 30, z: 0 }, radius: 120, chests: [], spawns: [start], start, checkpoints, route, finish, par, level: L };
}
