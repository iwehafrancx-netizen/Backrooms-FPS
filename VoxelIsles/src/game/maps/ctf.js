import { World } from '../../engine/world.js';
import { TEAM_COLORS } from '../../engine/blocks.js';
import { rng, makeNoise, PALETTES, STYLES, island, decorate, Frame } from './common.js';
import { lampPost, stoneBridge, statue, ruins, crates, tower } from './structures.js';

export function buildCtf(seed, opt = {}) {
  const theme = opt.theme || 'meadow', S = STYLES[opt.style || 'castle'], pal = PALETTES[theme];
  const w = new World(192, 64, 128), r = rng(seed), n = makeNoise(seed);
  const TOP = 30, BX = 62;
  const out = { world: w, theme, top: TOP, voidY: 4, center: { x: 0, y: TOP + 1, z: 0 }, radius: 100, chests: [], spawns: [], teams: [], npcs: [] };
  for (let i = 0; i < 2; i++) {
    const sx = i ? 1 : -1, cx = sx * BX;
    const cells = island(w, n, cx, 0, TOP, 14, pal, { depth: 12, rough: 0.25, flat: true });
    const f = new Frame(w, cx, TOP, 0, [-sx, 0]);
    const tc = TEAM_COLORS[i];
    f.foundation(-11, -11, 11, 11, S.path, S.wall);
    f.box(-9, 0, -9, 9, 0, 9, S.floor);
    for (let y = 1; y <= 4; y++) for (let z = -9; z <= 9; z++) for (let x = -9; x <= 9; x++) if (Math.abs(x) === 9 || Math.abs(z) === 9) f.set(x, y, z, y === 4 ? ((x + z) % 2 ? tc.wool : 0) : y === 3 ? tc.wool : r() < 0.2 ? S.wall2 : S.wall);
    for (const [gx, gz] of [[0, 9], [9, 0], [-9, 0]]) for (let k = -1; k <= 1; k++) for (let y = 1; y <= 3; y++) f.set(gx ? gx : k, y, gz ? gz : k, 0);
    for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) { f.box(x - Math.sign(x), 1, z - Math.sign(z), x, 7, z, S.pillar); f.box(x - Math.sign(x), 8, z - Math.sign(z), x, 8, z, tc.wool); f.set(x, 9, z, S.light); }
    f.box(-3, 1, -8, 3, 1, -5, S.wall2);
    f.box(-2, 2, -8, 2, 2, -6, S.floor);
    const stand = f.pos(0, 3, -7);
    f.set(0, 2, -7, 62);
    f.box(-3, 2, -8, -3, 5, -8, S.pillar); f.box(3, 2, -8, 3, 5, -8, S.pillar);
    f.box(-3, 6, -8, 3, 6, -8, tc.wool);
    for (const [x, z] of [[-6, 4], [6, 4], [-6, -3], [6, -3]]) { f.box(x, 1, z, x, 2, z, S.wall2); }
    crates(f, -7, 6); crates(f, 6, 6);
    lampPost(f, S, -4, 1, 7); lampPost(f, S, 4, 1, 7);
    decorate(w, r, cells, pal, 0.08, 3, (x, z) => Math.max(Math.abs(x - cx), Math.abs(z)) > 12);
    const spawns = [];
    for (let k = 0; k < 4; k++) { const p = f.pos(-3 + k * 2, 1, 3); spawns.push({ x: p.x + 0.5, y: TOP + 1, z: p.z + 0.5, yaw: Math.atan2(sx, 0), team: i }); }
    out.spawns.push(...spawns);
    out.teams.push({ i, color: tc, stand: { x: stand.x, y: stand.y, z: stand.z }, spawns, center: { x: cx, z: 0 }, front: { x: cx - sx * 11, z: 0 } });
  }
  const mid = island(w, n, 0, 0, TOP, 11, pal, { depth: 12, rough: 0.35, flat: true });
  const fm = new Frame(w, 0, TOP, 0, [1, 0]);
  fm.foundation(-5, -5, 5, 5, S.path, S.wall);
  statue(fm, S, 0, 0);
  for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) { fm.box(x, 1, z, x, 3, z, S.wall2); fm.set(x, 4, z, S.light); }
  decorate(w, r, mid, pal, 0.12, 3, (x, z) => Math.max(Math.abs(x), Math.abs(z)) > 6 && Math.abs(z) > 4 && Math.abs(x) > 3);
  for (const sz of [-1, 1]) {
    const cz = sz * 36;
    const cells = island(w, n, 0, cz, TOP, 8, pal, { depth: 9, rough: 0.35, flat: true });
    const f = new Frame(w, 0, TOP, cz, [0, -sz]);
    if (sz < 0) ruins(f, S, out.chests, r); else tower(f, S, 0, 0, 0, 6);
    decorate(w, r, cells, pal, 0.12, 2, (x, z) => Math.hypot(x, z - cz) > 4);
    for (const sx of [-1, 1]) stoneBridge(w, S, sx * 50, sz * 9, sx * 7, cz - sz * 4, TOP, 0.25, r);
  }
  for (const sx of [-1, 1]) stoneBridge(w, S, sx * 49, 0, sx * 10, 0, TOP, 0, r);
  out.chests.length = 0;
  return out;
}
