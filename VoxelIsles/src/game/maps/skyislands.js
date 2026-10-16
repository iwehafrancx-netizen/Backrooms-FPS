import { World } from '../../engine/world.js';
import { TEAM_COLORS } from '../../engine/blocks.js';
import { rng, makeNoise, PALETTES, STYLES, island, decorate, Frame, dirTo, tree } from './common.js';
import { castleKeep, house, temple, fort, bigCastle, stoneBridge, lampPost } from './structures.js';
import { cottage, farm, well, fountain, market, windmill, watchtower, mineEntrance, chapel, camp, orchard, path } from './places.js';

const THEME_DEFAULTS = {
  meadow: { style: 'castle', spawn: 'keep', bridges: 'partial' },
  desert: { style: 'temple', spawn: 'temple', bridges: 'none' },
  snow: { style: 'fort', spawn: 'fort', bridges: 'full' },
  volcano: { style: 'ruins', spawn: 'ruinkeep', bridges: 'none' },
};
const FOOT = { keep: 7, house: 6, temple: 7, fort: 8, ruinkeep: 7 };
const SPAWNERS = { keep: castleKeep, house, temple, fort, ruinkeep: (f, s, w, c, r, g) => castleKeep(f, s, w, c, r, g, true) };

export function buildSkyIslands(seed, theme = 'meadow', players = 8, opt = {}) {
  const d = { ...THEME_DEFAULTS[theme], ...opt };
  const S = { ...STYLES[d.style], cottageWood: theme === 'snow' ? 69 : theme === 'desert' ? 70 : 5, cottageLog: theme === 'snow' ? 71 : theme === 'desert' ? 72 : 6, yard: PALETTES[theme].top, yardUnder: PALETTES[theme].under };
  const pal = PALETTES[theme];
  const w = new World(272, 80, 272), r = rng(seed), n = makeNoise(seed);
  const spawns = [], chests = [], TOP = 36, ring = 92, satRing = 58;
  const zones = [];
  const zone = (x, z, h) => zones.push([x - h, z - h, x + h, z + h]);
  const free = (x, z) => !zones.some(([a, b, c, e]) => x >= a - 1 && x <= c + 1 && z >= b - 1 && z <= e + 1);
  const treeAt = (x, y, z) => tree(w, r, x, y, z, pal.tree, pal);
  const wools = TEAM_COLORS.map((t) => t.wool);
  const placeKinds = theme === 'volcano' ? ['mine', 'camp', 'mine', 'camp'] : theme === 'desert' ? ['well', 'cottage', 'camp', 'farm'] : ['farm', 'cottage', 'orchard', 'mine', 'well', 'camp'];
  for (let i = 0; i < players; i++) {
    const a = (i / players) * Math.PI * 2 + 0.2;
    const cx = Math.round(Math.cos(a) * ring), cz = Math.round(Math.sin(a) * ring);
    const cells = island(w, n, cx, cz, TOP, 17, pal, { depth: 14, rough: 0.28, hills: 3 });
    const front = dirTo(cx, cz, 0, 0);
    const f = new Frame(w, cx, TOP, cz, front);
    const sp0 = f.pos(0, 0, 3);
    const sf = new Frame(w, sp0.x, TOP, sp0.z, front);
    const wool = TEAM_COLORS[i % TEAM_COLORS.length].wool;
    const sp = SPAWNERS[d.spawn](sf, S, wool, chests, r, i);
    zone(sp0.x, sp0.z, FOOT[d.spawn]);
    const door = sf.pos(0, 0, FOOT[d.spawn] + 1);
    const picks = [placeKinds[(i * 2) % placeKinds.length], placeKinds[(i * 2 + 1) % placeKinds.length]];
    picks.forEach((kind, k) => {
      const side = k ? 1 : -1, pp = f.pos(side * 9, 0, -6);
      const pf = new Frame(w, pp.x, TOP, pp.z, [Math.sign(cx - pp.x) || 0, 0].some(Boolean) ? dirTo(pp.x, pp.z, door.x, door.z) : front);
      if (kind === 'farm') farm(pf, S, chests, r, i);
      else if (kind === 'cottage') cottage(pf, S, 0, chests, r, i);
      else if (kind === 'orchard') orchard(pf, S, pal, r, treeAt);
      else if (kind === 'mine') mineEntrance(pf, S, chests, r, i, 'spawn');
      else if (kind === 'well') well(pf, S);
      else camp(pf, S, r);
      zone(pp.x, pp.z, 6);
      path(w, door.x, door.z, pp.x, pp.z, 1, r);
    });
    const edge = f.pos(0, 0, 16);
    path(w, door.x, door.z, edge.x, edge.z, 1, r);
    decorate(w, r, cells, pal, 0.12, 4, free);
    spawns.push({ x: sp.x + 0.5, y: sp.y, z: sp.z + 0.5, yaw: Math.atan2(cx, cz), group: i });
  }
  const MT = TOP + 2;
  const midCells = island(w, n, 0, 0, MT, 33, pal, { depth: 22, rough: 0.3, hills: 2 });
  bigCastle(new Frame(w, 0, MT, 0, [0, 1]), S, 38, chests, r);
  zone(0, 0, 13);
  const quarter = [['market', 0], ['cottage', Math.PI / 2], ['fountain', Math.PI], ['cottage', -Math.PI / 2], ['well', Math.PI / 4], ['cottage', (3 * Math.PI) / 4], ['camp', (-3 * Math.PI) / 4], ['cottage', -Math.PI / 4]];
  for (const [kind, ang] of quarter) {
    const rad = kind === 'market' || kind === 'fountain' ? 23 : kind === 'cottage' ? 22 : 24;
    const x = Math.round(Math.cos(ang) * rad), z = Math.round(Math.sin(ang) * rad);
    const pf = new Frame(w, x, MT, z, dirTo(x, z, 0, 0));
    if (kind === 'market') market(pf, S, r, wools);
    else if (kind === 'fountain') fountain(pf, S);
    else if (kind === 'cottage') cottage(pf, S, 0, chests, r, 'mid', 'mid');
    else if (kind === 'well') well(pf, S);
    else camp(pf, S, r);
    zone(x, z, kind === 'market' ? 8 : 6);
    path(w, x, z, Math.round(Math.cos(ang) * 13), Math.round(Math.sin(ang) * 13), 2, r);
  }
  for (let k = 0; k < 16; k++) { const ang = (k / 16) * Math.PI * 2; const x = Math.round(Math.cos(ang) * 30), z = Math.round(Math.sin(ang) * 30); path(w, x, z, Math.round(Math.cos(ang + Math.PI / 8) * 30), Math.round(Math.sin(ang + Math.PI / 8) * 30), 1, r); }
  decorate(w, r, midCells, pal, 0.08, 7, free);
  const satKinds = theme === 'volcano' ? ['mine', 'chapel', 'mine', 'watchtower'] : ['windmill', 'chapel', 'watchtower', 'mine'];
  const satAngles = [];
  for (let i = 0; i < 4; i++) {
    const a = ((i + 0.5) / 4) * Math.PI * 2 + 0.2;
    satAngles.push(a);
    const cx = Math.round(Math.cos(a) * satRing), cz = Math.round(Math.sin(a) * satRing);
    const cells = island(w, n, cx, cz, TOP + 1, 12, pal, { depth: 11, rough: 0.35, hills: 2 });
    const pf = new Frame(w, cx, TOP + 1, cz, dirTo(cx, cz, 0, 0));
    const kind = satKinds[i % satKinds.length];
    if (kind === 'windmill') windmill(pf, S, chests, r, 200 + i);
    else if (kind === 'chapel') chapel(pf, S, chests, r, 200 + i);
    else if (kind === 'watchtower') watchtower(pf, S, chests, r, 200 + i);
    else mineEntrance(pf, S, chests, r, 200 + i);
    zone(cx, cz, 7);
    decorate(w, r, cells, pal, 0.14, 3, free);
  }
  if (d.bridges !== 'none') {
    for (const a of satAngles) stoneBridge(w, S, Math.round(Math.cos(a) * 31), Math.round(Math.sin(a) * 31), Math.round(Math.cos(a) * 47), Math.round(Math.sin(a) * 47), TOP + 1, d.bridges === 'partial' ? 0.3 : 0, r);
    if (d.bridges === 'full') for (let i = 0; i < players; i++) {
      const a = (i / players) * Math.PI * 2 + 0.2, sa = satAngles[Math.floor(i / 2) % 4];
      const px = Math.round(Math.cos(a) * 76), pz = Math.round(Math.sin(a) * 76), sx = Math.round(Math.cos(sa) * satRing), sz = Math.round(Math.sin(sa) * satRing);
      const dl = Math.hypot(px - sx, pz - sz);
      stoneBridge(w, S, px, pz, Math.round(sx + ((px - sx) * 11) / dl), Math.round(sz + ((pz - sz) * 11) / dl), TOP, 0, r);
    }
  }
  for (let i = 0; i < players; i++) {
    const a = (i / players) * Math.PI * 2 + 0.2;
    for (const off of [-0.07, 0.07]) {
      const lx = Math.round(Math.cos(a + off) * 78), lz = Math.round(Math.sin(a + off) * 78);
      const y = w.topY(lx, lz);
      if (y > 0 && !w.get(lx, y + 1, lz) && free(lx, lz)) lampPost(new Frame(w, lx, y + 1, lz, [0, 1]), S, 0, 0, 0);
    }
  }
  return { world: w, spawns, chests, theme, top: TOP, voidY: 6, center: { x: 0, y: MT + 1, z: 0 }, radius: 118, style: d.style };
}
