import { World } from '../../engine/world.js';
import { TEAM_COLORS } from '../../engine/blocks.js';
import { rng, makeNoise, PALETTES, STYLES, island, decorate, Frame } from './common.js';
import { lampPost, stoneBridge, statue, ruins, crates, tower } from './structures.js';
import { cottage, farm, market, well, fountain, watchtower, windmill, path } from './places.js';
import { MAPBLOCK } from './common.js';

export function buildCtf(seed, opt = {}) {
  const theme = opt.theme || 'meadow', pal = PALETTES[theme], S = { ...STYLES[opt.style || 'castle'], yard: pal.top, yardUnder: pal.under, cottageWood: theme === 'snow' ? 69 : theme === 'desert' ? 70 : 5, cottageLog: theme === 'snow' ? 71 : theme === 'desert' ? 72 : 6 };
  const w = new World(224, 72, 160), r = rng(seed), n = makeNoise(seed);
  const TOP = 30, BX = 72, SZ = 42;
  const wools = TEAM_COLORS.map((t) => t.wool);
  const out = { world: w, theme, top: TOP, voidY: 4, center: { x: 0, y: TOP + 1, z: 0 }, radius: 112, sideZ: SZ - 2, chests: [], spawns: [], teams: [], npcs: [] };
  for (let i = 0; i < 2; i++) {
    const sx = i ? 1 : -1, cx = sx * BX;
    const cells = island(w, n, cx, 0, TOP, 19, pal, { depth: 14, rough: 0.24, hills: 2 });
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
    const hp = f.pos(-8, 0, -15), fp = f.pos(8, 0, -15);
    cottage(new Frame(w, hp.x, TOP, hp.z, [sx, 0]), S, tc.wool, out.chests, r, 'ctf', 'spawn');
    if (theme === 'volcano') watchtower(new Frame(w, fp.x, TOP, fp.z, [sx, 0]), S, out.chests, r, 'ctf'); else farm(new Frame(w, fp.x, TOP, fp.z, [sx, 0]), S, out.chests, r, 'ctf');
    const back = f.pos(0, 0, -11); path(w, back.x, 0, hp.x, hp.z, 1, r); path(w, back.x, 0, fp.x, fp.z, 1, r);
    decorate(w, r, cells, pal, 0.08, 4, (x, z) => Math.max(Math.abs(x - cx), Math.abs(z)) > 12 && !(Math.abs(x - hp.x) < 7 && Math.abs(z - hp.z) < 7) && !(Math.abs(x - fp.x) < 7 && Math.abs(z - fp.z) < 7));
    const spawns = [];
    for (let k = 0; k < 4; k++) { const p = f.pos(-3 + k * 2, 1, 3); spawns.push({ x: p.x + 0.5, y: TOP + 1, z: p.z + 0.5, yaw: Math.atan2(sx, 0), team: i }); }
    out.spawns.push(...spawns);
    out.teams.push({ i, color: tc, stand: { x: stand.x, y: stand.y, z: stand.z }, spawns, center: { x: cx, z: 0 }, front: { x: cx - sx * 11, z: 0 } });
  }
  const mid = island(w, n, 0, 0, TOP, 18, pal, { depth: 16, rough: 0.3, hills: 1 });
  const fm = new Frame(w, 0, TOP, 0, [1, 0]);
  fountain(fm, S);
  for (const [x, z, front] of [[-9, -9, [0, 1]], [9, 9, [0, -1]]]) cottage(new Frame(w, x, TOP, z, front), S, 0, out.chests, r, 'mid', 'mid');
  market(new Frame(w, 9, TOP, -9, [0, 1]), S, r, wools);
  well(new Frame(w, -10, TOP, 9, [0, -1]), S);
  for (const sx of [-1, 1]) path(w, sx * 5, 0, sx * 17, 0, 2, r);
  decorate(w, r, mid, pal, 0.1, 3, (x, z) => Math.hypot(x, z) > 15);
  for (const sz of [-1, 1]) {
    const cz = sz * SZ;
    const cells = island(w, n, 0, cz, TOP, 11, pal, { depth: 10, rough: 0.33, hills: 2 });
    const f = new Frame(w, 0, TOP, cz, [0, -sz]);
    if (sz < 0) ruins(f, S, out.chests, r); else if (theme === 'meadow') windmill(f, S, out.chests, r, 'side'); else watchtower(f, S, out.chests, r, 'side');
    decorate(w, r, cells, pal, 0.12, 3, (x, z) => Math.hypot(x, z - cz) > 6);
    for (const sx of [-1, 1]) stoneBridge(w, S, sx * 56, sz * 12, sx * 9, cz - sz * 6, TOP, 0.25, r);
  }
  for (const sx of [-1, 1]) stoneBridge(w, S, sx * 54, 0, sx * 17, 0, TOP, 0, r);
  for (const c of out.chests) w.set(c.x, c.y, c.z, 73, MAPBLOCK, true);
  out.chests.length = 0;
  return out;
}
