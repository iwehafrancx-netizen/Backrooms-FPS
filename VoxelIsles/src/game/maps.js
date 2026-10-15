import { World } from '../engine/world.js';
import { TEAM_COLORS } from '../engine/blocks.js';

export const PLACED = 1, MAPBLOCK = 2;

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

export function island(w, n, cx, cz, top, r, pal, opt = {}) {
  const R = Math.ceil(r * 1.35), depth = opt.depth ?? r * 1.1, cells = [];
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const d = Math.hypot(dx, dz) / r + (n((cx + dx) * 0.13, (cz + dz) * 0.13) - 0.5) * (opt.rough ?? 0.55);
    if (d >= 1) continue;
    const x = cx + dx, z = cz + dz;
    const bump = opt.flat ? 0 : Math.floor(n(x * 0.21 + 50, z * 0.21) * 2.2 * (1 - d));
    const ty = top + bump;
    const bottom = Math.round(top - 1 - Math.pow(1 - d, 0.75) * depth * (0.55 + n(x * 0.3, z * 0.3 + 9) * 0.7));
    for (let y = bottom; y <= ty; y++) {
      let id = pal.core;
      if (y === ty) id = pal.top;
      else if (y >= ty - 2) id = pal.under;
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

function decorate(w, r, cells, pal, density = 0.18, trees = 1, ok = () => true) {
  const free = cells.filter(([, , , d]) => d < 0.8);
  let placed = 0;
  for (let i = 0; i < trees * 6 && placed < trees; i++) {
    const c = free[Math.floor(r() * free.length)];
    if (!c || c[3] < 0.25) continue;
    if (w.get(c[0], c[1] + 1, c[2]) || !ok(c[0], c[2])) continue;
    tree(w, r, c[0], c[1], c[2], pal.tree, pal); placed++;
  }
  if (!pal.plants.length) return;
  for (const [x, y, z, d] of cells) if (d < 0.9 && r() < density && !w.get(x, y + 1, z) && w.get(x, y, z) === pal.top) w.set(x, y + 1, z, pal.plants[Math.floor(r() * pal.plants.length)], MAPBLOCK, true);
}

function chestAt(w, chests, x, y, z, tier) { w.set(x, y, z, 17, MAPBLOCK, true); for (let yy = y + 1; yy <= y + 2; yy++) if (w.get(x, yy, z) >= 40) w.set(x, yy, z, 0, 0, true); chests.push({ x, y, z, tier, items: [] }); }

export function buildSkyIslands(seed, theme = 'meadow', players = 8) {
  const w = new World(120, 64, 120), r = rng(seed), n = makeNoise(seed), pal = PALETTES[theme];
  const spawns = [], chests = [], TOP = 30;
  const ring = 36;
  for (let i = 0; i < players; i++) {
    const a = (i / players) * Math.PI * 2 + 0.2;
    const cx = Math.round(Math.cos(a) * ring), cz = Math.round(Math.sin(a) * ring);
    const cells = island(w, n, cx, cz, TOP, 5.2, pal, { depth: 6, rough: 0.35 });
    const tx = Math.round(Math.cos(a) * -1), tz = Math.round(Math.sin(a) * -1);
    const sy = Math.max(...cells.filter(([x, , z]) => Math.abs(x - cx) <= 1 && Math.abs(z - cz) <= 1).map((c) => c[1]));
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { for (let y = sy + 1; y < sy + 5; y++) w.set(cx + dx, y, cz + dz, 0, 0, true); w.set(cx + dx, sy, cz + dz, pal.top, MAPBLOCK, true); }
    const side = [-Math.sin(a), Math.cos(a)];
    const chestSpots = [[cx + Math.round(side[0] * 3), cz + Math.round(side[1] * 3)], [cx - Math.round(side[0] * 3), cz - Math.round(side[1] * 3)], [cx - Math.round(Math.cos(a) * 3), cz - Math.round(Math.sin(a) * 3)]];
    for (const [x, z] of chestSpots) { const y = w.topY(x, z); if (y > 0) chestAt(w, chests, x, (w.get(x, y, z) >= 40 ? y : y + 1), z, 'spawn'); }
    decorate(w, r, cells, pal, 0.12, 1, (x, z) => (x - cx) * Math.cos(a) + (z - cz) * Math.sin(a) > 1.5 && Math.hypot(x - cx, z - cz) > 2.5 && (x - cx) * Math.cos(a) + (z - cz) * Math.sin(a) > 2.4);
    spawns.push({ x: cx + 0.5, y: sy + 1, z: cz + 0.5, yaw: Math.atan2(cx, cz), look: [tx, tz] });
  }
  const midCells = island(w, n, 0, 0, TOP + 2, 10.5, pal, { depth: 13, rough: 0.5 });
  decorate(w, r, midCells, pal, 0.1, 3);
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) for (let y = TOP + 1; y <= TOP + 4; y++) w.set(dx, y, dz, 0, 0, true);
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) w.set(dx, TOP + 2, dz, pal.rock === 9 ? 9 : 4, MAPBLOCK, true);
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let y = TOP + 3; y <= TOP + 6; y++) w.set(dx, y, dz, pal.rock === 9 ? 9 : 4, MAPBLOCK, true);
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) === 2 || Math.abs(dz) === 2) w.set(dx, TOP + 7, dz, theme === 'desert' ? 9 : 5, MAPBLOCK, true);
  w.set(0, TOP + 3, 0, 27, MAPBLOCK, true);
  for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) chestAt(w, chests, dx, TOP + 3, dz, 'mid');
  for (let i = 0; i < players / 2; i++) {
    const a = ((i + 0.5) / (players / 2)) * Math.PI * 2 + 0.2;
    const cx = Math.round(Math.cos(a) * 20), cz = Math.round(Math.sin(a) * 20);
    const cells = island(w, n, cx, cz, TOP + 1, 3.6, pal, { depth: 5, rough: 0.4 });
    decorate(w, r, cells, pal, 0.15, 0);
    const y = w.topY(cx, cz); chestAt(w, chests, cx, y + 1, cz, 'satellite');
  }
  return { world: w, spawns, chests, theme, top: TOP, voidY: 4, center: { x: 0, y: TOP + 3, z: 0 }, radius: 52 };
}

export { TEAM_COLORS };

export function buildEggIslands(seed, theme = 'snow', teams = 4) {
  const w = new World(128, 64, 128), r = rng(seed), n = makeNoise(seed), pal = PALETTES[theme];
  const TOP = 30, ring = 38, out = { world: w, theme, top: TOP, voidY: 4, center: { x: 0, y: TOP + 2, z: 0 }, radius: 62, chests: [], spawns: [], teams: [], gens: [], npcs: [] };
  const floor = pal.rock === 9 ? 9 : pal === PALETTES.volcano ? 18 : 4;
  for (let i = 0; i < teams; i++) {
    const a = (i / teams) * Math.PI * 2;
    const ux = Math.cos(a), uz = Math.sin(a);
    const cx = Math.round(ux * ring), cz = Math.round(uz * ring);
    const cells = island(w, n, cx, cz, TOP, 7.5, pal, { depth: 8, rough: 0.3, flat: true });
    decorate(w, r, cells.filter(([x, , z]) => Math.hypot(x - cx, z - cz) > 5 && (x - cx) * cx + (z - cz) * cz > 0), pal, 0.08, 1);
    const tc = TEAM_COLORS[i];
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { w.set(cx + dx, TOP, cz + dz, tc.wool, MAPBLOCK, true); for (let y = TOP + 1; y < TOP + 5; y++) w.set(cx + dx, y, cz + dz, 0, 0, true); }
    const ex = Math.round(cx + ux * 5), ez = Math.round(cz + uz * 5);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { w.set(ex + dx, TOP, ez + dz, 13, MAPBLOCK, true); for (let y = TOP + 1; y < TOP + 4; y++) w.set(ex + dx, y, ez + dz, 0, 0, true); }
    w.set(ex, TOP + 1, ez, 13, MAPBLOCK, true);
    w.set(ex, TOP + 2, ez, 45, MAPBLOCK, true);
    const sx = -Math.round(uz * 3), sz = Math.round(ux * 3);
    const gx = cx - sx, gz = cz - sz;
    w.set(gx, TOP, gz, 24, MAPBLOCK, true);
    const g2x = Math.round(cx - sx - ux * 2), g2z = Math.round(cz - sz - uz * 2);
    w.set(g2x, TOP, g2z, 25, MAPBLOCK, true);
    out.gens.push({ x: gx, y: TOP, z: gz, item: 170, every: 1.25, cap: 40, team: i }, { x: g2x, y: TOP, z: g2z, item: 171, every: 5, cap: 16, team: i });
    const npcX = cx + sx + 0.5, npcZ = cz + sz + 0.5;
    out.npcs.push({ npc: true, kind: 'shop', team: i, x: npcX, y: TOP + 1, z: npcZ, yaw: Math.atan2(-(cx - npcX), -(cz - npcZ)), name: 'Shop' });
    const yaw = Math.atan2(ux, uz);
    out.spawns.push({ x: cx + 0.5, y: TOP + 1, z: cz + 0.5, yaw, team: i });
    out.teams.push({ i, color: tc, egg: { x: ex, y: TOP + 2, z: ez }, spawn: { x: cx + 0.5, y: TOP + 1, z: cz + 0.5 }, center: { x: cx, z: cz } });
  }
  for (let i = 0; i < teams; i++) {
    const a = ((i + 0.5) / teams) * Math.PI * 2;
    const cx = Math.round(Math.cos(a) * 26), cz = Math.round(Math.sin(a) * 26);
    const cells = island(w, n, cx, cz, TOP + 1, 4.2, pal, { depth: 5, rough: 0.35 });
    decorate(w, r, cells, pal, 0.12, 0);
    const y = w.topY(cx, cz);
    w.set(cx, y, cz, 25, MAPBLOCK, true);
    out.gens.push({ x: cx, y, z: cz, item: 171, every: 7, cap: 10 });
  }
  const mid = island(w, n, 0, 0, TOP + 2, 7, pal, { depth: 10, rough: 0.4 });
  decorate(w, r, mid.filter(([x, , z]) => Math.hypot(x, z) > 3), pal, 0.1, 2);
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { w.set(dx, TOP + 2, dz, floor, MAPBLOCK, true); for (let y = TOP + 3; y < TOP + 6; y++) w.set(dx, y, dz, 0, 0, true); }
  for (const [dx, dz] of [[-1, 0], [1, 0]]) { w.set(dx, TOP + 2, dz, 26, MAPBLOCK, true); out.gens.push({ x: dx, y: TOP + 2, z: dz, item: 172, every: 14, cap: 6 }); }
  w.set(0, TOP + 3, 2, 27, MAPBLOCK, true); w.set(0, TOP + 3, -2, 27, MAPBLOCK, true);
  return out;
}
