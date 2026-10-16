import { World } from '../../engine/world.js';
import { TEAM_COLORS } from '../../engine/blocks.js';
import { rng, makeNoise, PALETTES, STYLES, island, decorate, Frame, MAPBLOCK } from './common.js';
import { tower, ruins, lampPost, statue, crates, stoneBridge } from './structures.js';

const THEME_STYLE = { meadow: 'castle', desert: 'temple', snow: 'fort', volcano: 'ruins' };

export function buildEggIslands(seed, theme = 'snow', teams = 4, opt = {}) {
  const S = STYLES[opt.style || THEME_STYLE[theme]], pal = PALETTES[theme];
  const w = new World(176, 64, 176), r = rng(seed), n = makeNoise(seed);
  const TOP = 30, ring = 56;
  const out = { world: w, theme, top: TOP, voidY: 4, center: { x: 0, y: TOP + 2, z: 0 }, radius: 84, chests: [], spawns: [], teams: [], gens: [], npcs: [] };
  for (let i = 0; i < teams; i++) {
    const a = (i / teams) * Math.PI * 2;
    const ux = Math.cos(a), uz = Math.sin(a);
    const cx = Math.round(ux * ring), cz = Math.round(uz * ring);
    const cells = island(w, n, cx, cz, TOP, 12.5, pal, { depth: 10, rough: 0.28, flat: true });
    const front = Math.abs(ux) > Math.abs(uz) ? [-Math.sign(ux), 0] : [0, -Math.sign(uz)];
    const f = new Frame(w, cx, TOP, cz, front);
    const tc = TEAM_COLORS[i];
    f.foundation(-9, -9, 9, 9, S.path, S.wall);
    f.box(-8, 0, -8, 8, 0, 8, S.floor);
    for (let z = -8; z <= 8; z++) for (let x = -8; x <= 8; x++) if (Math.abs(x) <= 2 && Math.abs(z) <= 2) f.set(x, 0, z, tc.wool);
    for (let y = 1; y <= 2; y++) for (let z = -8; z <= 8; z++) for (let x = -8; x <= 8; x++) if (Math.abs(x) === 8 || Math.abs(z) === 8) f.set(x, y, z, y === 2 && (x + z) % 2 ? tc.wool : S.wall);
    for (const gx of [-1, 0, 1]) for (let y = 1; y <= 2; y++) { f.set(gx, y, 8, 0); f.set(8, y, gx, 0); f.set(-8, y, gx, 0); }
    for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { f.box(x, 1, z, x, 5, z, S.pillar); f.set(x, 6, z, tc.wool); }
    f.box(-2, 1, -7, 2, 1, -5, 13);
    f.box(-2, 2, -7, -2, 4, -7, S.pillar); f.box(2, 2, -7, 2, 4, -7, S.pillar);
    f.box(-2, 5, -7, 2, 5, -7, tc.wool);
    f.set(0, 2, -6, 13);
    f.set(0, 3, -6, 45);
    const egg = f.pos(0, 3, -6);
    f.walls(5, 1, 3, 7, 3, 6, S.wall2);
    f.box(5, 1, 4, 5, 2, 5, 0);
    f.box(5, 4, 3, 7, 4, 6, S.roof);
    f.set(6, 0, 5, S.floor);
    const npc = f.pos(6, 1, 5);
    const g1 = f.pos(-6, 0, 5), g2 = f.pos(-6, 0, 3);
    f.set(-6, 0, 5, 24); f.set(-6, 0, 3, 25);
    f.box(-7, 1, 2, -7, 2, 6, S.wall2); f.box(-7, 3, 2, -5, 3, 6, S.roof);
    lampPost(f, S, -3, 1, 7); lampPost(f, S, 3, 1, 7);
    decorate(w, r, cells, pal, 0.08, 2, (x, z) => Math.max(Math.abs(x - cx), Math.abs(z - cz)) > 10);
    out.gens.push({ x: g1.x, y: TOP, z: g1.z, item: 170, every: 1.25, cap: 40, team: i }, { x: g2.x, y: TOP, z: g2.z, item: 171, every: 5, cap: 16, team: i });
    out.npcs.push({ npc: true, kind: 'shop', team: i, x: npc.x + 0.5, y: TOP + 1, z: npc.z + 0.5, yaw: Math.atan2(-(cx - npc.x), -(cz - npc.z)), name: 'Shop' });
    const sp = f.pos(0, 1, 1);
    const yaw = Math.atan2(ux, uz);
    out.spawns.push({ x: sp.x + 0.5, y: TOP + 1, z: sp.z + 0.5, yaw, team: i });
    out.teams.push({ i, color: tc, egg: { x: egg.x, y: egg.y, z: egg.z }, spawn: { x: sp.x + 0.5, y: TOP + 1, z: sp.z + 0.5 }, center: { x: cx, z: cz } });
  }
  for (let i = 0; i < teams; i++) {
    const a = ((i + 0.5) / teams) * Math.PI * 2;
    const cx = Math.round(Math.cos(a) * 36), cz = Math.round(Math.sin(a) * 36);
    const cells = island(w, n, cx, cz, TOP + 1, 6.5, pal, { depth: 7, rough: 0.35, flat: true });
    const f = new Frame(w, cx, TOP + 1, cz, [0, 1]);
    f.foundation(-2, -2, 2, 2, S.path, S.wall);
    f.set(0, 0, 0, 25);
    out.gens.push({ x: cx, y: TOP + 1, z: cz, item: 171, every: 7, cap: 10 });
    tower(f, S, 0, 3, -3, 5);
    crates(f, -3, 2);
    decorate(w, r, cells, pal, 0.12, 1, (x, z) => Math.hypot(x - cx, z - cz) > 4);
  }
  const mid = island(w, n, 0, 0, TOP + 2, 11, pal, { depth: 12, rough: 0.35, flat: true });
  const fm = new Frame(w, 0, TOP + 2, 0, [0, 1]);
  fm.foundation(-6, -6, 6, 6, S.path, S.wall);
  fm.box(-5, 0, -5, 5, 0, 5, S.floor);
  for (const [dx, dz] of [[-2, 0], [2, 0]]) { fm.set(dx, 0, dz, 26); out.gens.push({ x: dx, y: TOP + 2, z: dz, item: 172, every: 14, cap: 6 }); }
  for (const [x, z] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { fm.box(x, 1, z, x, 4, z, S.pillar); fm.set(x, 5, z, S.light); }
  fm.box(-5, 5, -5, 5, 5, -5, S.wall); fm.box(-5, 5, 5, 5, 5, 5, S.wall);
  statue(fm, S, 0, -3);
  decorate(w, r, mid, pal, 0.1, 3, (x, z) => Math.max(Math.abs(x), Math.abs(z)) > 7);
  for (let i = 0; i < teams; i++) {
    const a = ((i + 0.5) / teams) * Math.PI * 2;
    stoneBridge(w, S, Math.round(Math.cos(a) * 12), Math.round(Math.sin(a) * 12), Math.round(Math.cos(a) * 30), Math.round(Math.sin(a) * 30), TOP + 1, 0.3, r);
  }
  return out;
}
