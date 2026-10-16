import { World } from '../../engine/world.js';
import { TEAM_COLORS } from '../../engine/blocks.js';
import { rng, makeNoise, PALETTES, STYLES, island, decorate, Frame, MAPBLOCK } from './common.js';
import { tower, ruins, lampPost, statue, crates, stoneBridge } from './structures.js';
import { cottage, farm, fountain, market, watchtower, well, camp, path } from './places.js';
import { tree } from './common.js';

const THEME_STYLE = { meadow: 'castle', desert: 'temple', snow: 'fort', volcano: 'ruins' };

export function buildEggIslands(seed, theme = 'snow', teams = 4, opt = {}) {
  const pal = PALETTES[theme], S = { ...STYLES[opt.style || THEME_STYLE[theme]], yard: pal.top, yardUnder: pal.under, cottageWood: theme === 'snow' ? 69 : theme === 'desert' ? 70 : 5, cottageLog: theme === 'snow' ? 71 : theme === 'desert' ? 72 : 6 };
  const w = new World(240, 72, 240), r = rng(seed), n = makeNoise(seed);
  const TOP = 32, ring = 80;
  const wools = TEAM_COLORS.map((t) => t.wool);
  const out = { world: w, theme, top: TOP, voidY: 4, center: { x: 0, y: TOP + 2, z: 0 }, radius: 120, chests: [], spawns: [], teams: [], gens: [], npcs: [] };
  for (let i = 0; i < teams; i++) {
    const a = (i / teams) * Math.PI * 2;
    const ux = Math.cos(a), uz = Math.sin(a);
    const cx = Math.round(ux * ring), cz = Math.round(uz * ring);
    const cells = island(w, n, cx, cz, TOP, 20, pal, { depth: 14, rough: 0.26, hills: 2 });
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
    const fp = f.pos(-7, 0, -15), cp = f.pos(8, 0, -14);
    const toBase = (p) => [Math.sign(cx - p.x) && Math.abs(cx - p.x) > Math.abs(cz - p.z) ? Math.sign(cx - p.x) : 0, Math.abs(cz - p.z) >= Math.abs(cx - p.x) ? Math.sign(cz - p.z) || 1 : 0];
    if (theme !== 'volcano') farm(new Frame(w, fp.x, TOP, fp.z, toBase(fp)), S, out.chests, r, 'egg' + i, 'spawn'); else camp(new Frame(w, fp.x, TOP, fp.z, toBase(fp)), S, r);
    cottage(new Frame(w, cp.x, TOP, cp.z, toBase(cp)), S, tc.wool, out.chests, r, 'egg' + i, 'spawn');
    const g0 = f.pos(0, 0, -9), g9 = f.pos(0, 0, 9), ge = f.pos(0, 0, 18);
    path(w, g0.x, g0.z, fp.x, fp.z, 1, r); path(w, g0.x, g0.z, cp.x, cp.z, 1, r); path(w, g9.x, g9.z, ge.x, ge.z, 2, r);
    decorate(w, r, cells, pal, 0.08, 4, (x, z) => { const lx = (x - cx) * f.rx + (z - cz) * f.rz, lz = (x - cx) * f.fx + (z - cz) * f.fz; return Math.max(Math.abs(lx), Math.abs(lz)) > 11 && !(lz < -8 && lz > -21 && Math.abs(lx) < 15); });
    out.gens.push({ x: g1.x, y: TOP, z: g1.z, item: 170, every: 1.25, cap: 40, team: i }, { x: g2.x, y: TOP, z: g2.z, item: 171, every: 5, cap: 16, team: i });
    out.npcs.push({ npc: true, kind: 'shop', team: i, x: npc.x + 0.5, y: TOP + 1, z: npc.z + 0.5, yaw: Math.atan2(-(cx - npc.x), -(cz - npc.z)), name: 'Shop' });
    const sp = f.pos(0, 1, 1);
    const yaw = Math.atan2(ux, uz);
    out.spawns.push({ x: sp.x + 0.5, y: TOP + 1, z: sp.z + 0.5, yaw, team: i });
    out.teams.push({ i, color: tc, egg: { x: egg.x, y: egg.y, z: egg.z }, spawn: { x: sp.x + 0.5, y: TOP + 1, z: sp.z + 0.5 }, center: { x: cx, z: cz } });
  }
  for (let i = 0; i < teams; i++) {
    const a = ((i + 0.5) / teams) * Math.PI * 2;
    const cx = Math.round(Math.cos(a) * 50), cz = Math.round(Math.sin(a) * 50);
    const cells = island(w, n, cx, cz, TOP + 1, 9.5, pal, { depth: 9, rough: 0.32, hills: 1 });
    const f = new Frame(w, cx, TOP + 1, cz, [0, 1]);
    f.foundation(-2, -2, 2, 2, S.path, S.wall);
    f.set(0, 0, 0, 25);
    out.gens.push({ x: cx, y: TOP + 1, z: cz, item: 171, every: 7, cap: 10 });
    watchtower(new Frame(w, cx + (cx > 0 ? 4 : -4), TOP + 1, cz + (cz > 0 ? 4 : -4), [0, 1]), S, out.chests, r, 'gold' + i, 'satellite');
    crates(f, -3, 2);
    decorate(w, r, cells, pal, 0.12, 2, (x, z) => Math.hypot(x - cx, z - cz) > 9);
  }
  const mid = island(w, n, 0, 0, TOP + 2, 19, pal, { depth: 16, rough: 0.3, hills: 1 });
  const fm = new Frame(w, 0, TOP + 2, 0, [0, 1]);
  fm.foundation(-6, -6, 6, 6, S.path, S.wall);
  fm.box(-5, 0, -5, 5, 0, 5, S.floor);
  for (const [dx, dz] of [[-2, 0], [2, 0]]) { fm.set(dx, 0, dz, 26); out.gens.push({ x: dx, y: TOP + 2, z: dz, item: 172, every: 14, cap: 6 }); }
  for (const [x, z] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { fm.box(x, 1, z, x, 4, z, S.pillar); fm.set(x, 5, z, S.light); }
  fm.box(-5, 5, -5, 5, 5, -5, S.wall); fm.box(-5, 5, 5, 5, 5, 5, S.wall);
  statue(fm, S, 0, -3);
  const mq = [['fountain', 0, 12], ['market', Math.PI / 2, 12], ['well', Math.PI, 11], ['camp', -Math.PI / 2, 11]];
  for (const [kind, ang, rad] of mq) { const x = Math.round(Math.cos(ang + 0.785) * rad), z = Math.round(Math.sin(ang + 0.785) * rad), pf = new Frame(w, x, TOP + 2, z, Math.abs(x) > Math.abs(z) ? [-Math.sign(x), 0] : [0, -Math.sign(z)]); if (kind === 'fountain') fountain(pf, S); else if (kind === 'market') market(pf, S, r, wools); else if (kind === 'well') well(pf, S); else camp(pf, S, r); }
  decorate(w, r, mid, pal, 0.1, 4, (x, z) => Math.hypot(x, z) > 17);
  for (let i = 0; i < teams; i++) {
    const a = ((i + 0.5) / teams) * Math.PI * 2;
    stoneBridge(w, S, Math.round(Math.cos(a) * 18), Math.round(Math.sin(a) * 18), Math.round(Math.cos(a) * 41), Math.round(Math.sin(a) * 41), TOP + 1, 0.3, r);
  }
  for (const c of out.chests) w.set(c.x, c.y, c.z, 73, MAPBLOCK, true);
  out.chests = [];
  return out;
}
