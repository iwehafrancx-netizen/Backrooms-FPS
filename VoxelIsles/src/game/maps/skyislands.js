import { World } from '../../engine/world.js';
import { TEAM_COLORS } from '../../engine/blocks.js';
import { rng, makeNoise, PALETTES, STYLES, island, decorate, Frame, dirTo, chestAt } from './common.js';
import { castleKeep, house, temple, fort, tower, bigCastle, ruins, statue, crates, stoneBridge, lampPost } from './structures.js';

const THEME_DEFAULTS = {
  meadow: { style: 'castle', spawn: 'keep', bridges: 'partial' },
  desert: { style: 'temple', spawn: 'temple', bridges: 'none' },
  snow: { style: 'fort', spawn: 'fort', bridges: 'full' },
  volcano: { style: 'ruins', spawn: 'ruinkeep', bridges: 'none' },
};
const FOOT = { keep: 6, house: 5, temple: 6, fort: 8, ruinkeep: 6 };
const SPAWNERS = { keep: castleKeep, house, temple, fort, ruinkeep: (f, s, w, c, r, g) => castleKeep(f, s, w, c, r, g, true) };

export function buildSkyIslands(seed, theme = 'meadow', players = 8, opt = {}) {
  const d = { ...THEME_DEFAULTS[theme], ...opt };
  const S = STYLES[d.style], pal = PALETTES[theme];
  const w = new World(176, 64, 176), r = rng(seed), n = makeNoise(seed);
  const spawns = [], chests = [], TOP = 30, ring = 58;
  const satAngles = [];
  for (let i = 0; i < players; i++) {
    const a = (i / players) * Math.PI * 2 + 0.2;
    const cx = Math.round(Math.cos(a) * ring), cz = Math.round(Math.sin(a) * ring);
    const cells = island(w, n, cx, cz, TOP, 10.5, pal, { depth: 10, rough: 0.32, flat: true });
    const f = new Frame(w, cx, TOP, cz, dirTo(cx, cz, 0, 0));
    const wool = TEAM_COLORS[i % TEAM_COLORS.length].wool;
    const sp = SPAWNERS[d.spawn](f, S, wool, chests, r, i);
    decorate(w, r, cells, pal, 0.14, 2, (x, z) => Math.max(Math.abs(x - cx), Math.abs(z - cz)) > FOOT[d.spawn] + 2.5);
    spawns.push({ x: sp.x + 0.5, y: sp.y, z: sp.z + 0.5, yaw: Math.atan2(cx, cz), group: i });
  }
  const midCells = island(w, n, 0, 0, TOP + 2, 17, pal, { depth: 16, rough: 0.35, flat: true });
  bigCastle(new Frame(w, 0, TOP + 2, 0, [0, 1]), S, 38, chests, r);
  decorate(w, r, midCells, pal, 0.1, 5, (x, z) => Math.max(Math.abs(x), Math.abs(z)) > 13);
  for (let i = 0; i < players / 2; i++) {
    const a = ((i + 0.5) / (players / 2)) * Math.PI * 2 + 0.2;
    satAngles.push(a);
    const cx = Math.round(Math.cos(a) * 33), cz = Math.round(Math.sin(a) * 33);
    const cells = island(w, n, cx, cz, TOP + 1, 7, pal, { depth: 8, rough: 0.4, flat: true });
    const f = new Frame(w, cx, TOP + 1, cz, dirTo(cx, cz, 0, 0));
    if (i % 2) { ruins(f, S, chests, r, 'satellite', 200 + i); } else { tower(f, S, 0, 0, 0, 7, chests, 'satellite', 200 + i); crates(f, 2, 2); statue(f, S, -3, 2); }
    decorate(w, r, cells, pal, 0.15, 1, (x, z) => Math.hypot(x - cx, z - cz) > 4);
  }
  if (d.bridges !== 'none') {
    for (let i = 0; i < satAngles.length; i++) {
      const a = satAngles[i];
      const sx = Math.round(Math.cos(a) * 33), sz = Math.round(Math.sin(a) * 33);
      stoneBridge(w, S, Math.round(Math.cos(a) * 13), Math.round(Math.sin(a) * 13), Math.round(Math.cos(a) * 27), Math.round(Math.sin(a) * 27), TOP + 1, d.bridges === 'partial' ? 0.35 : 0, r);
    }
    if (d.bridges === 'full') for (let i = 1; i < players; i += 2) {
      const a = (i / players) * Math.PI * 2 + 0.2;
      stoneBridge(w, S, Math.round(Math.cos(a) * 50), Math.round(Math.sin(a) * 50), Math.round(Math.cos(a) * 38), Math.round(Math.sin(a) * 38), TOP, 0, r);
    }
  }
  for (let i = 0; i < players; i++) {
    const a = (i / players) * Math.PI * 2 + 0.2;
    const lx = Math.round(Math.cos(a) * 49), lz = Math.round(Math.sin(a) * 49);
    if (w.get(lx, TOP, lz) && !w.get(lx, TOP + 1, lz)) lampPost(new Frame(w, lx, TOP + 1, lz, [0, 1]), S, 0, 0, 0);
  }
  return { world: w, spawns, chests, theme, top: TOP, voidY: 4, center: { x: 0, y: TOP + 3, z: 0 }, radius: 80, style: d.style };
}
