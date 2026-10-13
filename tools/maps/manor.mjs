import { Kit, clamp01 } from './kit.mjs';
import { T } from './textures.mjs';

const X = 20, Z = 16, F = 3.6, LV = [0, F, F * 2], TOP = F * 3;
const ATRIUM = [-4, -5, 4, 5];
const STAIRS = [
  { x: [-6.2, -4.2], z0: 6, dir: 1, base: 0 },
  { x: [4.2, 6.2], z0: -6, dir: -1, base: 0 },
  { x: [4.2, 6.2], z0: 6, dir: 1, base: F },
  { x: [-6.2, -4.2], z0: -6, dir: -1, base: F },
];
const W = { wood: [0.55, 0.36, 0.2], dark: [0.3, 0.2, 0.12], white: [0.9, 0.88, 0.84], red: [0.62, 0.12, 0.14], green: [0.18, 0.4, 0.28], gold: [0.95, 0.75, 0.3], blue: [0.2, 0.3, 0.6], grey: [0.55, 0.55, 0.55] };

export async function build() {
  const k = new Kit();
  k.mat('FloorParquet', 'parquet', 'world', 4);
  k.mat('FloorMarble', 'marble', 'world', 3);
  k.mat('Parquet', 'parquet', 'world', 4);
  k.mat('Ceiling', 'plaster', 'world', 3);
  k.mat('RoofBaked', 'plaster', 'world', 3);
  k.mat('Walls', 'wallpaper', 'wall', 2);
  k.mat('Wood', 'crate', 'world', 2);
  k.mat('Furniture', 'fabric', 'world', 1);
  k.mat('Books', 'books', 'face');
  k.mat('Glass', 'window', 'face');
  k.mat('Crates', 'crate', 'face');
  k.mat('light', null);
  for (const y of LV) for (const x of [-14.5, 0, 14.5]) for (const z of [-8, 8]) k.lamps.push({ x, y: y + 3.2, z, k: 0.26, r: 26 });
  k.lamps.push({ x: 0, y: 8, z: 0, k: 0.3, r: 60 });

  const wallOpts = (y) => ({ base: y, span: F });
  for (const y of LV) {
    k.wallZ('Walls', -Z, -X, X, y, y + F, 0.3, [], wallOpts(y));
    k.wallZ('Walls', Z, -X, X, y, y + F, 0.3, [], wallOpts(y));
    k.wallX('Walls', -X, -Z, Z, y, y + F, 0.3, [], wallOpts(y));
    k.wallX('Walls', X, -Z, Z, y, y + F, 0.3, [], wallOpts(y));
    for (const s of [-1, 1]) {
      k.wallX('Walls', s * 9, -Z, Z, y, y + F, 0.2, [[-13.8, -12.2, y + 2.4], [-4.8, -3.2, y + 2.4], [3.2, 4.8, y + 2.4], [12.2, 13.8, y + 2.4]], wallOpts(y));
      const doors = s < 0 ? [[-13.8, -12.2, y + 2.4]] : [[12.2, 13.8, y + 2.4]];
      k.wallZ('Walls', 0, s < 0 ? -X : 9, s < 0 ? -9 : X, y, y + F, 0.2, doors, wallOpts(y));
    }
    for (const x of [-16, -6, 6, 16]) for (const z of [-Z + 0.16, Z - 0.16]) {
      const zf = z < 0 ? z : z, nz = z < 0 ? 1 : -1, c = [1, 1, 1];
      const p = nz > 0 ? [[x - 1, y + 3, zf], [x - 1, y + 1, zf], [x + 1, y + 1, zf], [x + 1, y + 3, zf]] : [[x + 1, y + 3, zf], [x + 1, y + 1, zf], [x - 1, y + 1, zf], [x - 1, y + 3, zf]];
      k.quad('Glass', ...p, [[0, 0], [0, 1], [1, 1], [1, 0]], [c, c, c, c]);
    }
  }
  for (const [i, y] of LV.entries()) {
    if (i === 0) continue;
    const holes = [ATRIUM, ...STAIRS.filter((s) => s.base === y - F).map((s) => [s.x[0], Math.min(s.z0, s.z0 + s.dir * 6), s.x[1], Math.max(s.z0, s.z0 + s.dir * 6)])];
    k.slab('Ceiling', y - 0.3, y - 0.03, [-X, -Z, X, Z], holes, { tint: W.white });
    k.slab('Parquet', y - 0.03, y, [-X, -Z, X, Z], holes, { tint: [0.9, 0.9, 0.9], skip: ['bot'] });
    const rail = (x0, z0, x1, z1) => k.box('Wood', x0, y, z0, x1, y + 1.0, z1, { tint: W.dark, solid: false });
    rail(ATRIUM[0] - 0.12, ATRIUM[1] - 0.12, ATRIUM[2] + 0.12, ATRIUM[1]); rail(ATRIUM[0] - 0.12, ATRIUM[3], ATRIUM[2] + 0.12, ATRIUM[3] + 0.12);
    rail(ATRIUM[0] - 0.12, ATRIUM[1], ATRIUM[0], ATRIUM[3]); rail(ATRIUM[2], ATRIUM[1], ATRIUM[2] + 0.12, ATRIUM[3]);
    for (const s of STAIRS.filter((st) => st.base === y - F)) {
      const za = Math.min(s.z0, s.z0 + s.dir * 6), zb = Math.max(s.z0, s.z0 + s.dir * 6);
      rail(s.x[0] - 0.12, za, s.x[0], zb); rail(s.x[1], za, s.x[1] + 0.12, zb);
      if (s.dir > 0) rail(s.x[0] - 0.12, za - 0.12, s.x[1] + 0.12, za); else rail(s.x[0] - 0.12, zb, s.x[1] + 0.12, zb + 0.12);
    }
  }
  k.box('RoofBaked', -X, TOP, -Z, X, TOP + 0.2, Z, { tint: [0.7, 0.68, 0.64], solid: false, skip: ['top'] });
  for (const s of STAIRS) k.stairsZ('Wood', s.z0, s.dir, s.x[0], s.x[1], s.base, F, 15, { tint: W.wood, noBottom: s.base > 0 });

  k.floor('FloorParquet', -X, -Z, X, Z, 0, 2, (x, z) => { const s = k.shade(x, 0, z) * (0.6 + 0.4 * clamp01(k.clearance(x, z, X, Z) / 1.2)); return [s, s, s]; });
  k.box('FloorMarble', -8.95, 0, -Z + 0.15, 8.95, 0.015, Z - 0.15, { tint: [0.95, 0.95, 0.95], solid: false, skip: ['x+', 'x-', 'z+', 'z-'] });
  k.box('Furniture', -3, 0.016, -3.6, 3, 0.03, 3.6, { tint: W.red, solid: false, skip: ['x+', 'x-', 'z+', 'z-'] });
  k.box('FloorMarble', -0.7, 0, -0.7, 0.7, 1.1, 0.7, { tint: W.white });
  k.box('Furniture', -0.45, 1.1, -0.45, 0.45, 1.25, 0.45, { tint: W.gold, solid: false });
  for (let i = 0; i < 3; i++) k.box('light', -1.2 + i * 0.05, 8.6 - i * 0.6, -1.2 + i * 0.05, 1.2 - i * 0.05, 8.75 - i * 0.6, 1.2 - i * 0.05, { flat: true, solid: false });
  k.box('Wood', -0.03, 8.75, -0.03, 0.03, TOP, 0.03, { tint: W.gold, solid: false });

  const shelf = (x0, z0, x1, z1, y) => k.box('Books', x0, y, z0, x1, y + 2.4, z1, { noBottom: y > 0 });
  const table = (cx, cz, w, d, y, tint = W.wood, h = 0.78) => k.box('Wood', cx - w / 2, y, cz - d / 2, cx + w / 2, y + h, cz + d / 2, { tint, noBottom: true });
  const sofa = (cx, cz, w, d, y, tint) => { k.box('Furniture', cx - w / 2, y, cz - d / 2, cx + w / 2, y + 0.45, cz + d / 2, { tint, noBottom: true }); };
  const bed = (cx, cz, y, tint) => { k.box('Furniture', cx - 1, y, cz - 1.1, cx + 1, y + 0.55, cz + 1.1, { tint: W.white, noBottom: true }); k.box('Furniture', cx - 1.02, y + 0.55, cz - 0.3, cx + 1.02, y + 0.62, cz + 1.12, { tint, solid: false }); k.box('Wood', cx - 1.05, y, cz - 1.2, cx + 1.05, y + 1.1, cz - 1.1, { tint: W.dark, solid: false }); };
  const crate = (x, z, y, s = 1.1) => k.box('Crates', x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, { noBottom: true });

  shelf(-19.7, -15.6, -19.2, -10, 0); shelf(-19.7, -8, -19.2, -2, 0); shelf(-17, -15.7, -11, -15.2, 0);
  table(-14, -8, 2.4, 1.2, 0); table(-14, -4, 2.4, 1.2, 0); sofa(-11.5, -11.5, 2, 0.9, 0, W.green);
  table(-14.5, 8, 6, 1.6, 0, W.dark); for (const x of [-17, -15.5, -14, -12.5]) for (const z of [6.6, 9.4]) k.box('Wood', x - 0.25, 0, z - 0.25, x + 0.25, 1.0, z + 0.25, { tint: W.wood, noBottom: true });
  shelf(-19.7, 3, -19.2, 7, 0);
  k.box('Furniture', 9.3, 0, -15.6, 19.7, 0.95, -14.9, { tint: W.white }); k.box('Furniture', 19, 0, -14.9, 19.7, 0.95, -6, { tint: W.white });
  table(14.5, -8.5, 4, 1.4, 0, W.white, 0.95);
  sofa(16, 9, 3.2, 1, 0, W.blue); sofa(18.8, 12, 1, 3.2, 0, W.blue); table(16, 12, 1.6, 1, 0, W.dark, 0.45);
  k.box('Furniture', 12, 0, 15.2, 16, 1.4, 15.7, { tint: [0.25, 0.22, 0.2] }); k.box('light', 12.6, 0.2, 15.15, 15.4, 0.8, 15.2, { flat: true, solid: false });
  sofa(-6.5, 0, 0.9, 3, 0, W.red); sofa(6.5, 0, 0.9, 3, 0, W.red);

  bed(-15, -11, F, W.blue); bed(-15, -4.5, F, W.green); k.box('Wood', -19.7, F, -1.5, -18.9, F + 2.2, -0.3, { tint: W.dark });
  bed(15, 11, F, W.red); bed(15, 4.5, F, W.gold); k.box('Wood', 18.9, F, 0.3, 19.7, F + 2.2, 1.5, { tint: W.dark });
  bed(-15, 11, F, W.red); table(-12, 4, 1.6, 0.8, F); bed(15, -11, F, W.blue); table(12, -4, 1.6, 0.8, F);
  sofa(-6.5, 0, 0.9, 3, F, W.green); sofa(6.5, 0, 0.9, 3, F, W.green);

  for (const [x, z] of [[-14, -12], [-12.8, -12], [-14, -10.8], [-16, -5], [-16, -3.9], [-11, -2]]) crate(x, z, F * 2);
  crate(-14, -12, F * 2 + 1.1, 0.9);
  for (const [x, z] of [[13, 3], [14.1, 3], [13, 4.1], [17, 9], [17, 10.1], [11, 13]]) crate(x, z, F * 2);
  crate(13, 3, F * 2 + 1.1, 0.9);
  table(-14.5, 8, 3, 3, F * 2, W.green, 0.85); for (const x of [-16.2, -12.8]) for (const z of [6.3, 9.7]) k.box('Wood', x - 0.25, F * 2, z - 0.25, x + 0.25, F * 2 + 1.0, z + 0.25, { tint: W.wood, noBottom: true });
  shelf(-19.7, 4, -19.2, 12, F * 2); shelf(19.2, -12, 19.7, -4, F * 2);
  table(14.5, -9, 2, 1, F * 2, W.dark); sofa(-6.5, 0, 0.9, 3, F * 2, W.blue); sofa(6.5, 0, 0.9, 3, F * 2, W.blue);

  const tex = { parquet: await T.parquet(), marble: await T.marble(), plaster: await T.plaster(), wallpaper: await T.wallpaper(), crate: await T.crate(), fabric: await T.fabric(), books: await T.books(), window: await T.window() };
  return { kit: k, tex, seed: { x: 0, y: 0, z: 8 } };
}
