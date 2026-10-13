import { Kit, clamp01 } from './kit.mjs';
import { T } from './textures.mjs';
import { furniture, W } from './furn.mjs';

const X = 26, Z = 18, FH = 6, LV = [0, FH, FH * 2], TOP = FH * 3;
const ATRIUM = [-6, -9, 6, 9];
const FLIGHTS = [{ x: [-8.5, -5.5], z0: 17, dir: -1, base: 0 }, { x: [5.5, 8.5], z0: -17, dir: 1, base: FH }];
const STEPS = 24;

export async function build() {
  const k = new Kit();
  const f = furniture(k);
  k.mat('FloorParquet', 'parquet', 'world', 4);
  k.mat('Marble', 'marble', 'world', 3);
  k.mat('Stone', 'stone', 'world', 4);
  k.mat('Parquet', 'parquet', 'world', 4);
  k.mat('Ceiling', 'plaster', 'world', 3);
  k.mat('RoofBaked', 'plaster', 'world', 3);
  k.mat('Walls', 'wallpaper', 'wall', 2.4);
  k.mat('Wood', 'crate', 'world', 2);
  k.mat('Furniture', 'fabric', 'world', 1);
  k.mat('Books', 'books', 'face');
  k.mat('Glass', 'window', 'face');
  k.mat('Cases', 'window', 'face');
  k.mat('Crates', 'crate', 'face');
  k.mat('Rug', 'rug', 'face');
  k.mat('PaintA', 'paintA', 'face'); k.mat('PaintB', 'paintB', 'face'); k.mat('PaintC', 'paintC', 'face');
  k.mat('Curtain', 'curtain', 'face');
  k.mat('light', null);
  for (const y of LV) for (const x of [-17.5, 0, 17.5]) for (const z of [-10, 10]) k.lamps.push({ x, y: y + 4.6, z, k: 0.32, r: 40 });
  k.lamps.push({ x: 0, y: 14, z: 0, k: 0.34, r: 120 });

  const wopts = (y) => ({ base: y, span: FH });
  for (const y of LV) {
    k.wallZ('Walls', -Z, -X, X, y, y + FH, 0.4, [], wopts(y));
    k.wallZ('Walls', Z, -X, X, y, y + FH, 0.4, [], wopts(y));
    k.wallX('Walls', -X, -Z, Z, y, y + FH, 0.4, [], wopts(y));
    k.wallX('Walls', X, -Z, Z, y, y + FH, 0.4, [], wopts(y));
    for (const s of [-1, 1]) {
      k.wallX('Walls', s * 9, -Z, Z, y, y + FH, 0.3, [[-14, -10, y + 4.6], [-2, 2, y + 4.6], [10, 14, y + 4.6]], wopts(y));
      k.wallZ('Walls', 0, s < 0 ? -X : 9, s < 0 ? -9 : X, y, y + FH, 0.3, [s < 0 ? [-19, -15, y + 4.6] : [15, 19, y + 4.6]], wopts(y));
    }
    for (const x of [-21, -13, 13, 21]) for (const z of [-Z + 0.22, Z - 0.22]) { const nz = z < 0 ? 1 : -1; f.painting('Glass', x, z, y + 1.2, 2.6, 3.4, 0, nz); k.box('Curtain', x - 1.9, y + 0.2, z - nz * 0.0 - (nz > 0 ? 0 : 0.12), x - 1.4, y + 4.8, z + (nz > 0 ? 0.12 : 0), { flat: false, solid: false, deco: true }); k.box('Curtain', x + 1.4, y + 0.2, z - (nz > 0 ? 0 : 0.12), x + 1.9, y + 4.8, z + (nz > 0 ? 0.12 : 0), { solid: false, deco: true }); }
    for (const z of [-10, 10]) { f.painting('Glass', X - 0.22, z, y + 1.2, 2.6, 3.4, -1, 0); f.painting('Glass', -X + 0.22, z, y + 1.2, 2.6, 3.4, 1, 0); }
    k.box('Wood', -X, y + 4.9, -Z, X, y + 5.05, -Z + 0.12, { tint: W.cream, solid: false, deco: true });
  }
  for (const [i, y] of LV.entries()) {
    if (i === 0) continue;
    const holes = [ATRIUM, ...FLIGHTS.filter((s) => s.base === y - FH).map((s) => [s.x[0], Math.min(s.z0, s.z0 + s.dir * STEPS * 0.4), s.x[1], Math.max(s.z0, s.z0 + s.dir * STEPS * 0.4)])];
    k.slab('Ceiling', y - 0.4, y - 0.03, [-X, -Z, X, Z], holes, { tint: W.white });
    k.slab('Parquet', y - 0.03, y, [-X, -Z, X, Z], holes, { tint: [0.95, 0.95, 0.95], skip: ['bot'] });
    const rail = (x0, z0, x1, z1) => { k.box('Wood', x0, y, z0, x1, y + 1.05, z1, { tint: W.dark, solid: false, deco: true }); k.box('Marble', x0 - 0.03, y + 1.05, z0 - 0.03, x1 + 0.03, y + 1.12, z1 + 0.03, { tint: W.gold, solid: false, deco: true }); };
    rail(ATRIUM[0] - 0.12, ATRIUM[1] - 0.12, ATRIUM[2] + 0.12, ATRIUM[1]); rail(ATRIUM[0] - 0.12, ATRIUM[3], ATRIUM[2] + 0.12, ATRIUM[3] + 0.12);
    rail(ATRIUM[0] - 0.12, ATRIUM[1], ATRIUM[0], ATRIUM[3]); rail(ATRIUM[2], ATRIUM[1], ATRIUM[2] + 0.12, ATRIUM[3]);
    for (const s of FLIGHTS.filter((st) => st.base === y - FH)) {
      const za = Math.min(s.z0, s.z0 + s.dir * STEPS * 0.4), zb = Math.max(s.z0, s.z0 + s.dir * STEPS * 0.4);
      rail(s.x[0] - 0.12, za, s.x[0], zb); rail(s.x[1], za, s.x[1] + 0.12, zb);
      if (s.dir > 0) rail(s.x[0] - 0.12, za - 0.12, s.x[1] + 0.12, za); else rail(s.x[0] - 0.12, zb, s.x[1] + 0.12, zb + 0.12);
    }
  }
  k.box('RoofBaked', -X, TOP, -Z, X, TOP + 0.3, Z, { tint: [0.72, 0.7, 0.66], solid: false, skip: ['top'] });
  for (const s of FLIGHTS) {
    k.stairsZ('Wood', s.z0, s.dir, s.x[0], s.x[1], s.base, FH, STEPS, { tint: W.wood, noBottom: s.base > 0, run: 0.4 });
    for (let i = 1; i <= STEPS; i += 2) for (const [xa, xb] of [[s.x[0] - 0.14, s.x[0]], [s.x[1], s.x[1] + 0.14]]) { const za = s.z0 + s.dir * 0.4 * (i - 1), zb = s.z0 + s.dir * 0.4 * (i + 1); k.box('Wood', xa, s.base + (FH / STEPS) * i, Math.min(za, zb), xb, s.base + (FH / STEPS) * i + 1.0, Math.max(za, zb), { tint: W.dark, solid: false, deco: true }); }
  }

  k.floor('FloorParquet', -X, -Z, X, Z, 0, 2, (x, z) => { const s = k.shade(x, 0, z) * (0.6 + 0.4 * clamp01(k.clearance(x, z, X, Z) / 1.2)); return [s, s, s]; });
  k.box('Stone', -8.9, 0, -Z + 0.2, 8.9, 0.02, Z - 0.2, { tint: [0.95, 0.95, 0.95], solid: false, skip: ['x+', 'x-', 'z+', 'z-'], deco: true });
  f.rug(0, 12.5, 7, 6); f.rug(0, -12.5, 7, 6); f.rug(-17.5, 9, 8, 6); f.rug(17.5, -9, 8, 6);
  k.cylinder('Marble', 0, 0, 2.4, 0, 0.9, W.marble, 18); k.cylinder('Furniture', 0, 0, 2.0, 0.85, 0.95, [0.25, 0.5, 0.85], 18); k.cylinder('Marble', 0, 0, 0.4, 0.9, 3.2, W.marble, 10); k.cylinder('Marble', 0, 0, 1.0, 3.0, 3.35, W.marble, 14);
  for (const z of [-15, -5, 5, 15]) { f.column(-8.4, z, 0, FH * 2); f.column(8.4, z, 0, FH * 2); }
  for (const s of [-1, 1]) for (const z of [-11, -5, 5, 11]) { f.pedestal(s * 4.3, z, 0); }
  f.painting('PaintA', -X + 0.22, 0, 1.6, 3.4, 2.2, 1, 0); f.painting('PaintB', X - 0.22, 0, 1.6, 3.4, 2.2, -1, 0);
  f.painting('PaintC', -9 + 0.18, -6, 1.8, 2.4, 1.7, 1, 0); f.painting('PaintA', 9 - 0.18, 6, 1.8, 2.4, 1.7, -1, 0);
  for (let i = 0; i < 4; i++) k.box('light', -0.9 + i * 0.01, 14 - i * 0.7, -0.9, 0.9, 14.14 - i * 0.7, 0.9, { flat: true, solid: false, skip: ['top'] });
  k.box('Wood', -0.04, 14, -0.04, 0.04, TOP, 0.04, { tint: W.gold, solid: false, deco: true });

  for (let i = 0; i < 6; i++) f.pedestal(-23 + i * 2.8, -12, 0);
  for (let i = 0; i < 4; i++) f.case(-23 + i * 4.6, -17.3, -20 + i * 4.6, -16.6);
  f.painting('PaintB', -17.5, -Z + 0.22, 1.5, 3, 2.1, 0, 1); f.painting('PaintC', -11.5, -Z + 0.22, 1.5, 3, 2.1, 0, 1); f.painting('PaintA', -23.5, -Z + 0.22, 1.5, 3, 2.1, 0, 1);
  f.shelf(-25.8, 3, -25.2, 17, 0, 4.2); f.shelf(-24, 17.2, -11, 17.8, 0, 4.2);
  for (const z of [6, 11, 15]) { f.table(-17, z, 2.6, 1.3); for (const dx of [-0.8, 0.8]) { f.chair(-17 + dx, z - 1.1, 0); f.chair(-17 + dx, z + 1.1, 2); } }
  f.sofa(-12.5, 12.5, 2.6, 1, 0, W.green, 1); f.table(-14.2, 12.5, 1.2, 0.7, 0, 0.42);
  for (const x of [-4.5]) f.sofa(x, -15, 3, 1.1, 0, W.blue);
  f.table(17.5, -9, 11, 1.8, 0, 0.78, W.dark);
  for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) f.chair(13 + i * 1.9, -9 + sz * 1.45, sz > 0 ? 2 : 0, 0, W.dark, W.red);
  f.chair(11.3, -9, 3); f.chair(24.2, -9, 1);
  f.cabinet(24.9, -16, 25.7, -3, 0, 1.2); f.cabinet(10, -17.7, 22, -17.1, 0, 1.2);
  for (const x of [13, 21]) for (let i = 0; i < 3; i++) k.cylinder('Furniture', x + i * 0.0, -9, 0.0, 0, 0, W.cream, 3);
  k.box('Wood', 13, 0, 4, 24, 0.5, 14, { tint: W.dark });
  k.box('Wood', 21, 0.5, 11, 23, 1.2, 13, { tint: W.black });
  for (const [x, z] of [[11, 4.8], [11, 13.4], [24.4, 4.8], [24.4, 13.4]]) f.column(x, z, 0, FH, 0.35);
  f.sofa(17, 16.8, 3.2, 1, 0, W.red, 0); f.sofa(13.2, 17.2, 1, 2.5, 0, W.red, 1);

  const y1 = FH;
  for (const z of [-14.2, -9.8]) { f.bed(-21.5, z, y1, z < -12 ? W.blue : W.green); f.cabinet(-25.6, z - 1, -24.4, z + 1, y1, 2.2); f.table(-17, z, 1.6, 0.8, y1); f.chair(-17, z + 0.9, 2, y1); }
  for (const z of [4, 9.4, 14.6]) { f.bed(-21.5, z, y1, W.red); f.cabinet(-25.6, z - 1, -24.4, z + 1, y1, 2.2); f.table(-15.5, z, 1.4, 0.7, y1); f.chair(-15.5, z - 0.9, 0, y1); }
  f.rug(-15, -8, 7, 6, y1); f.rug(-15, 10, 7, 6, y1);
  for (let i = 0; i < 4; i++) f.pedestal(12 + i * 3.4, -10, y1); for (let i = 0; i < 3; i++) f.case(12 + i * 4.4, 15.8, 15, 16.8 + 0.2, y1);
  for (const x of [13, 17.5, 22]) f.painting(['PaintA', 'PaintB', 'PaintC'][((x | 0) % 3 + 3) % 3], x, -Z + 0.22, y1 + 1.4, 3.2, 2.2, 0, 1);
  for (const x of [14, 19]) { f.sofa(x, 4, 3, 1, y1, W.blue, 0); f.table(x, 2.2, 1.5, 0.7, y1, 0.42); }
  f.rug(18, 0, 8, 5, y1); f.cabinet(14, 16.6, 24, 17.4, y1, 1.2); f.cabinet(-23, 17.1, -12, 17.9, y1, 1.2);
  for (let i = 0; i < 4; i++) f.shelf(-8 - 0.0, 0, -8, 0, y1);
  f.sofa(-6.5, 0, 0.9, 3, y1, W.green, 3);

  const y2 = FH * 2;
  for (const x of [-22, -14]) { f.table(x, -12, 2.4, 1.2, y2); f.chair(x - 0.7, -13.1, 0, y2); f.chair(x + 0.7, -10.9, 2, y2); }
  f.shelf(-25.8, -17, -25.2, -3, y2, 4.2); f.shelf(-25.8, 3, -25.2, 17, y2, 4.2); f.rug(-17, 10, 8, 6, y2);
  f.table(-17, 10, 3.2, 1.6, y2, 0.76, W.green);
  for (const x of [-18.2, -15.8]) for (const z of [8.6, 11.4]) f.chair(x, z, z < 10 ? 0 : 2, y2);
  for (const [x, z] of [[14, -12], [15.1, -12], [14, -10.9], [20, -14], [21.1, -14], [17, 12], [18.1, 12], [21, 7], [22.1, 7]]) f.crate(x, z, y2);
  f.crate(14, -12, y2 + 0.9); f.crate(17, 12, y2 + 0.9);
  f.sofa(18, 0, 4, 1.2, y2, W.red); f.table(18, 2, 2, 0.8, y2, 0.42); f.painting('PaintC', 18, -Z + 0.22, y2 + 1.6, 3.4, 2.4, 0, 1); f.painting('PaintA', 18, Z - 0.22, y2 + 1.6, 3.4, 2.4, 0, -1);
  f.pedestal(0, 14, y2, true); f.pedestal(0, -14, y2, true);

  const tex = { parquet: await T.parquet(), marble: await T.marble(), stone: await T.stone(), plaster: await T.plaster(), wallpaper: await T.wallpaper(), crate: await T.crate(), fabric: await T.fabric(), books: await T.books(), window: await T.window(), rug: await T.rug(), paintA: await T.paintA(), paintB: await T.paintB(), paintC: await T.paintC(), curtain: await T.curtain() };
  return { kit: k, tex, seed: { x: 0, y: 0, z: 12 } };
}
