import { World } from '../../engine/world.js';
import { TEAM_COLORS } from '../../engine/blocks.js';
import { rng, STYLES, MAPBLOCK } from './common.js';

export function buildBridge(seed, opt = {}) {
  const S = STYLES[opt.style || 'castle'];
  const w = new World(112, 64, 48), r = rng(seed);
  const TOP = 30;
  const set = (x, y, z, id) => w.set(x, y, z, id, id ? MAPBLOCK : 0, true);
  const box = (x0, y0, z0, x1, y1, z1, id) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) set(x, y, z, id); };
  const out = { world: w, theme: opt.theme || 'meadow', top: TOP, voidY: TOP - 14, center: { x: 0, y: TOP + 1, z: 0 }, radius: 50, chests: [], spawns: [], teams: [], npcs: [] };
  for (let i = 0; i < 2; i++) {
    const sx = i ? 1 : -1, tc = TEAM_COLORS[i];
    const x0 = sx * 21, x1 = sx * 40;
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let z = -9; z <= 9; z++) {
      const edge = Math.abs(z) === 9 || x === x0 || x === x1;
      const d = Math.abs(x - sx * 30) + Math.abs(z) * 0.8;
      set(x, TOP, z, edge ? S.wall : (x + z) % 7 === 0 ? tc.wool : S.floor);
      const depth = Math.max(1, 6 - Math.floor(d / 4) + Math.floor(r() * 2));
      for (let y = TOP - 1; y >= TOP - depth; y--) set(x, y, z, y === TOP - 1 ? S.wall : S.wall2);
    }
    for (let z = -9; z <= 9; z++) for (const x of [x0, x1]) if (Math.abs(z) > 2 || x === x1) set(x, TOP + 1, z, (z + x) % 2 ? S.wall : tc.wool);
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (const z of [-9, 9]) set(x, TOP + 1, z, (x % 2) ? S.wall : tc.wool);
    for (const [x, z] of [[x0, -9], [x0, 9], [x1, -9], [x1, 9]]) { box(x, TOP + 1, z, x, TOP + 4, z, S.pillar); set(x, TOP + 5, z, tc.wool); set(x, TOP + 6, z, S.light); }
    const gx = sx * 27;
    box(gx - 2, TOP, -2, gx + 2, TOP, 2, S.trim);
    box(gx - 1, TOP - 3, -1, gx + 1, TOP, 1, 57);
    for (let y = TOP - 4; y > TOP - 8; y--) box(gx - 1, y, -1, gx + 1, y, 1, 0);
    const spx = sx * 36;
    box(spx - 1, TOP + 1, -3, spx + 1, TOP + 1, 3, 0);
    box(spx + sx * 2, TOP + 1, -4, spx + sx * 2, TOP + 3, 4, S.wall);
    box(spx + sx * 2, TOP + 4, -4, spx + sx * 2, TOP + 4, 4, tc.wool);
    for (const z of [-6, 6]) { box(sx * 32, TOP + 1, z, sx * 32, TOP + 2, z, S.wall2); }
    const spawns = [];
    for (let k = 0; k < 2; k++) spawns.push({ x: spx + 0.5, y: TOP + 1, z: (k ? 2 : -2) + 0.5, yaw: Math.atan2(sx, 0), team: i });
    out.spawns.push(...spawns);
    out.teams.push({ i, color: tc, goal: { x: gx, y: TOP, z: 0, x0: gx - 1, x1: gx + 1, z0: -1, z1: 1 }, spawns, center: { x: sx * 30, z: 0 } });
  }
  for (let x = -20; x <= 20; x++) {
    set(x, TOP, 0, Math.abs(x) % 6 === 0 ? S.trim : S.floor);
    if (Math.abs(x) <= 2) for (let z = -2; z <= 2; z++) set(x, TOP, z, S.floor);
  }
  box(-2, TOP - 1, -2, 2, TOP - 4, 2, S.wall);
  for (const z of [-2, 2]) for (const x of [-2, 2]) { set(x, TOP + 1, z, S.wall2); set(x, TOP + 2, z, S.light); }
  return out;
}
