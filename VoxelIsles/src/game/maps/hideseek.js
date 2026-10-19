import { World } from '../../engine/world.js';
import { TEAM_COLORS } from '../../engine/blocks.js';
import { rng, makeNoise, PALETTES, STYLES, island, Frame, MAPBLOCK, tree } from './common.js';
import { bigCastle, lampPost, temple } from './structures.js';
import { cottage, farm, well, fountain, market, windmill, watchtower, camp, orchard, chapel, stall, Sub, path } from './places.js';

const KINDS = {
  market: { theme: 'meadow', style: 'village', plots: ['cottage', 'cottage', 'market', 'farm', 'cottage', 'orchard', 'well', 'cottage', 'windmill', 'stalls', 'cottage', 'camp', 'cottage', 'farm', 'stalls', 'cottage'] },
  castle: { theme: 'meadow', style: 'castle', plots: ['cottage', 'chapel', 'cottage', 'stalls', 'farm', 'cottage', 'watchtower', 'cottage', 'cottage', 'well', 'cottage', 'stalls', 'orchard', 'cottage', 'camp', 'cottage'], center: 'castle' },
  bazaar: { theme: 'desert', style: 'temple', plots: ['stalls', 'cottage', 'market', 'stalls', 'cottage', 'well', 'stalls', 'cottage', 'temple', 'camp', 'stalls', 'cottage', 'market', 'cottage', 'stalls', 'well'] },
  lodge: { theme: 'snow', style: 'fort', plots: ['cottage', 'cottage', 'watchtower', 'cottage', 'camp', 'cottage', 'stalls', 'cottage', 'farm', 'cottage', 'chapel', 'cottage', 'well', 'cottage', 'cottage', 'stalls'] },
};
const CANDIDATES = [55, 73, 56, 74, 75, 80, 29, 5, 69, 70, 6, 71, 72, 4, 47, 48, 7, 82, 38, 9, 51, 21, 27, 78, 67, 22, 50, 77];

export function buildHideSeek(seed, opt = {}) {
  const K = KINDS[opt.kind || 'market'], theme = opt.theme || K.theme, pal = PALETTES[theme];
  const S = { ...STYLES[K.style], yard: pal.top, yardUnder: pal.under, cottageWood: theme === 'snow' ? 69 : theme === 'desert' ? 70 : 5, cottageLog: theme === 'snow' ? 71 : theme === 'desert' ? 72 : 6, path: theme === 'desert' ? 9 : 4 };
  const w = new World(144, 48, 144), r = rng(seed), n = makeNoise(seed), TOP = 20;
  const wools = TEAM_COLORS.map((t) => t.wool);
  island(w, n, 0, 0, TOP, 60, pal, { depth: 10, rough: 0.12, flat: true });
  for (let z = -64; z <= 64; z++) for (let x = -64; x <= 64; x++) { const d = Math.hypot(x, z); if (d < 57) for (let y = TOP; y > TOP - 3; y--) if (!w.get(x, y, z)) w.set(x, y, z, y === TOP ? pal.top : pal.under, MAPBLOCK, true); }
  const treeAt = (x, y, z) => tree(w, r, x, y, z, pal.tree === 'cactus' ? 'oak' : pal.tree, { ...pal, leaves: pal.leaves || 7, trunk: pal.trunk === 44 ? 6 : pal.trunk });
  for (const c of [-27, 0, 27]) { path(w, -54, c, 54, c, 2, r); path(w, c, -54, c, 54, 2, r); }
  if (K.center === 'castle') bigCastle(new Frame(w, 0, TOP, 0, [0, 1]), S, 38, [], r);
  else fountain(new Frame(w, 0, TOP, 0, [0, 1]), S);
  const plots = [];
  for (const px of [-40, -14, 14, 40]) for (const pz of [-40, -14, 14, 40]) if (!(K.center === 'castle' && Math.abs(px) < 20 && Math.abs(pz) < 20)) plots.push([px, pz]);
  plots.forEach(([px, pz], i) => {
    const kind = K.plots[i % K.plots.length];
    const front = Math.abs(px) > Math.abs(pz) ? [-Math.sign(px), 0] : [0, -Math.sign(pz)];
    const f = new Frame(w, px, TOP, pz, front);
    if (kind === 'cottage') { cottage(f, S, r() < 0.4 ? wools[Math.floor(r() * 8)] : 0, [], r, 'hs'); const g = new Sub(f, 0, 0, 0); g.set(-5, 1, -4, 55); g.set(5, 1, -4, 73); if (r() < 0.6) g.set(-5, 1, 6, 80); }
    else if (kind === 'market') market(f, S, r, wools);
    else if (kind === 'farm') farm(f, S, [], r, 'hs');
    else if (kind === 'orchard') orchard(f, S, pal, r, treeAt);
    else if (kind === 'well') { well(f, S); for (const [x, z] of [[-4, -3], [4, 3], [-3, 4]]) f.set(x, 1, z, [73, 55, 74][Math.floor(r() * 3)]); }
    else if (kind === 'windmill') windmill(f, S, [], r, 'hs');
    else if (kind === 'watchtower') watchtower(f, S, [], r, 'hs');
    else if (kind === 'chapel') chapel(f, S, [], r, 'hs');
    else if (kind === 'temple') temple(f, S, 0, [], r, 'hs');
    else if (kind === 'camp') camp(f, S, r);
    else if (kind === 'stalls') { for (const [x, z] of [[-4, -3], [4, -3], [-4, 4], [4, 4]]) stall(new Sub(f, x, 0, z), S, wools[Math.floor(r() * 8)], r); }
  });
  for (let k = 0; k < 90; k++) {
    const road = [-27, 0, 27][Math.floor(r() * 3)], along = Math.round((r() - 0.5) * 104), side = (r() < 0.5 ? -1 : 1) * 3;
    const [x, z] = r() < 0.5 ? [along, road + side] : [road + side, along];
    if (Math.hypot(x, z) > 54 || w.get(x, TOP + 1, z) || !w.get(x, TOP, z)) continue;
    const id = [73, 55, 73, 80, 29, 74, 5, 4][Math.floor(r() * 8)];
    w.set(x, TOP + 1, z, id, MAPBLOCK, true);
    if (r() < 0.3 && !w.get(x, TOP + 2, z)) w.set(x, TOP + 2, z, id === 55 ? 55 : 73, MAPBLOCK, true);
  }
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2, x = Math.round(Math.cos(a) * 50), z = Math.round(Math.sin(a) * 50); if (!w.get(x, TOP + 1, z)) lampPost(new Frame(w, x, TOP + 1, z, [0, 1]), S, 0, 0, 0); }
  for (let k = 0; k < 30; k++) { const a = r() * Math.PI * 2, d = 50 + r() * 5, x = Math.round(Math.cos(a) * d), z = Math.round(Math.sin(a) * d); if (!w.get(x, TOP + 1, z) && w.get(x, TOP, z)) treeAt(x, TOP, z); }
  for (let z = -64; z <= 64; z++) for (let x = -64; x <= 64; x++) { const d = Math.hypot(x, z); if (d >= 56.5 && d < 57.6) { if (!w.get(x, TOP + 1, z)) w.set(x, TOP + 1, z, 77, MAPBLOCK, true); for (let y = TOP + 2; y < TOP + 8; y++) if (!w.get(x, y, z)) w.set(x, y, z, 46, MAPBLOCK, true); } }
  const count = new Map();
  for (let y = TOP + 1; y < TOP + 10; y++) for (let z = -56; z <= 56; z++) for (let x = -56; x <= 56; x++) { const id = w.get(x, y, z); if (id && CANDIDATES.includes(id)) count.set(id, (count.get(id) || 0) + 1); }
  const disguises = [...count].filter(([, c]) => c >= 6).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
  const hiderSpawns = [], seekerSpawns = [];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; hiderSpawns.push({ x: Math.round(Math.cos(a) * 7) + 0.5, y: TOP + 1, z: Math.round(Math.sin(a) * 7) + 0.5, yaw: Math.atan2(Math.cos(a), Math.sin(a)) }); }
  const sx = 0, sz = 52;
  for (let i = 0; i < 12; i++) seekerSpawns.push({ x: sx - 3 + (i % 4) * 2 + 0.5, y: TOP + 1, z: sz - Math.floor(i / 4) * 2 + 0.5, yaw: 0 });
  const cells = [];
  for (let z = -54; z <= 54; z += 2) for (let x = -54; x <= 54; x += 2) { const y = TOP + 1; if (Math.hypot(x, z) < 54 && !w.get(x, y, z) && !w.get(x, y + 1, z) && w.get(x, y - 1, z)) cells.push([x, y, z]); }
  return { world: w, theme, top: TOP, voidY: 2, center: { x: 0, y: TOP + 1, z: 0 }, radius: 62, chests: [], spawns: hiderSpawns, hiderSpawns, seekerSpawns, disguises, cells, kind: opt.kind || 'market' };
}
