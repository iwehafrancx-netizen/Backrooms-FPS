import { Kit, clamp01 } from './kit.mjs';
import { T } from './textures.mjs';
import { furniture, W } from './furn.mjs';

const X = 34, Z = 22, H = 15, UP = 5.5;
const STEPS = 22;

export async function build() {
  const k = new Kit({ dim: (x, y, z) => (y < UP && Math.abs(z) > 16 ? 0.85 : 1) });
  const f = furniture(k);
  k.mat('FloorStone', 'stone', 'world', 4);
  k.mat('Platform', 'platform', 'world', 4);
  k.mat('Tracks', 'rail', 'world', 1.2);
  k.mat('Stone', 'stone', 'world', 4);
  k.mat('Walls', 'brick', 'wall', 4);
  k.mat('RoofBaked', 'roof', 'world', 4);
  k.mat('Glass', 'glassroof', 'world', 4);
  k.mat('Steel', 'steel', 'world', 2);
  k.mat('Deck', 'deck', 'world', 1.5);
  k.mat('Train', 'train', 'side', 3);
  k.mat('Fronts', 'storefront', 'face');
  k.mat('Signs', 'signs', 'world', 1);
  k.mat('Wood', 'crate', 'world', 2);
  k.mat('Furniture', 'fabric', 'world', 1);
  k.mat('Marble', 'marble', 'world', 3);
  k.mat('Crates', 'crate', 'face');
  k.mat('PaintA', 'paintA', 'face');
  k.mat('light', null);
  for (const x of [-27, -18, -9, 0, 9, 18, 27]) { k.lamps.push({ x, y: 11, z: 0, k: 0.3, r: 90 }); for (const z of [-14, 14]) k.lamps.push({ x, y: 4.6, z, k: 0.2, r: 40 }); }

  const wall = (p, axis) => k.quad('Walls', ...p, p.map(([x, y, z]) => [(axis ? z : x) / 4, 1 - y / 4]), p.map(([x, y, z]) => { const s = (0.5 + 0.5 * Math.min(1, y / 8)) * Math.min(1, k.shade(x, Math.min(y, 6), z) + 0.1); return [s, s, s]; }));
  for (let x = -X; x < X; x += 17) { wall([[x, H, -Z], [x, 0, -Z], [x + 17, 0, -Z], [x + 17, H, -Z]], 0); wall([[x + 17, H, Z], [x + 17, 0, Z], [x, 0, Z], [x, H, Z]], 0); }
  for (let z = -Z; z < Z; z += 11) { wall([[-X, H, z + 11], [-X, 0, z + 11], [-X, 0, z], [-X, H, z]], 1); wall([[X, H, z], [X, 0, z], [X, 0, z + 11], [X, H, z + 11]], 1); }
  const arch = (x, z, nx, nz) => { const c = [1, 1, 1], hw = 3; const p = nz ? (nz > 0 ? [[x - hw, 9, z], [x - hw, 2.5, z], [x + hw, 2.5, z], [x + hw, 9, z]] : [[x + hw, 9, z], [x + hw, 2.5, z], [x - hw, 2.5, z], [x - hw, 9, z]]) : [[x, 9, z]]; if (nz) k.quad('Glass', ...p, [[0, 0], [0, 1], [1, 1], [1, 0]], [c, c, c, c]); };
  for (const x of [-24, -8, 8, 24]) { arch(x, -Z + 0.05, 0, 1); arch(x, Z - 0.05, 0, -1); }

  k.quad('RoofBaked', [-X, H, -Z], [X, H, -Z], [X, H, Z], [-X, H, Z], [[-X / 4, -Z / 4], [X / 4, -Z / 4], [X / 4, Z / 4], [-X / 4, Z / 4]], Array(4).fill([0.6, 0.62, 0.66]));
  for (let x = -30; x <= 30; x += 10) { k.box('Steel', x - 0.3, H - 3.2, -Z, x + 0.3, H - 2.6, Z, { tint: [0.3, 0.33, 0.38], solid: false, skip: ['top'] }); for (let z = -18; z <= 18; z += 9) k.box('Steel', x - 0.2, H - 3.2, z - 0.2, x + 0.2, H, z + 0.2, { tint: [0.3, 0.33, 0.38], solid: false, skip: ['top'] }); }
  for (const z of [-12, 0, 12]) for (let x = -30; x < 30; x += 10) k.box('Glass', x + 1, H - 0.1, z - 3, x + 9, H - 0.04, z + 3, { flat: true, solid: false, skip: ['top'] });
  for (const x of [-27, -18, -9, 0, 9, 18, 27]) { k.box('Steel', x - 0.02, 8, -0.02, x + 0.02, H - 3, 0.02, { tint: [0.2, 0.2, 0.2], solid: false, skip: ['top'] }); k.box('light', x - 1.6, 7.8, -0.25, x + 1.6, 8.0, 0.25, { flat: true, solid: false, skip: ['top'] }); }

  k.floor('FloorStone', -X, -Z, X, Z, 0, 2, (x, z) => { const s = k.shade(x, 0, z) * (0.62 + 0.38 * clamp01(k.clearance(x, z, X, Z) / 1.4)); return [s, s, s]; });
  k.box('Platform', -X + 6, 0, -4, X - 6, 0.02, 20, { tint: [0.95, 0.95, 0.95], solid: false, skip: ['x+', 'x-', 'z+', 'z-'], deco: true });
  for (const z of [3.5, 14]) { k.box('Tracks', -X + 6, 0, z - 1.2, X - 6, 0.04, z + 1.2, { tint: [0.9, 0.9, 0.9], solid: false, skip: ['x+', 'x-', 'z+', 'z-'], deco: true }); for (const o of [-0.75, 0.75]) k.box('Steel', -X + 6, 0.04, z + o - 0.05, X - 6, 0.2, z + o + 0.05, { tint: [0.7, 0.7, 0.72], solid: false, deco: true }); }
  for (const [x0, z] of [[-27, 3.5], [3, 3.5], [-12, 14], [14, 14]]) {
    k.box('Train', x0, 0.5, z - 1.4, x0 + 22, 4.1, z + 1.4, { tint: [1, 1, 1], gain: 1.05 });
    k.box('Steel', x0 + 0.5, 0.15, z - 1.2, x0 + 21.5, 0.5, z + 1.2, { tint: [0.15, 0.15, 0.17], solid: false, deco: true });
    k.box('Steel', x0 + 2, 4.1, z - 0.8, x0 + 20, 4.4, z + 0.8, { tint: [0.4, 0.42, 0.46], solid: false, deco: true });
    k.box('light', x0 + 22, 2.8, z - 0.8, x0 + 22.05, 3.3, z + 0.8, { flat: true, solid: false, deco: true });
  }
  for (const [a, b] of [[-33, -31], [31, 33]]) k.box('Steel', a, 0, 3.0, b, 1.0, 4.0, { tint: [0.35, 0.37, 0.4] });
  for (let x = -26; x <= 26; x += 13) for (const z of [-3.2, 9, 20]) k.cylinder('Marble', x, z, 0.6, 0, UP + 0.2, W.marble, 12);
  for (const x of [-26, -13, 0, 13, 26]) for (const z of [-3.4, 8.4, 19.6]) { f.pedestal(x + 0.0, z + 0.0, 0, false); }

  const sx0 = -31, sx1 = -31 + 0.45 * STEPS, sw = (z0, z1) => [[sx0, z0, sx1, z1], [-sx1, z0, -sx0, z1]];
  k.slab('Stone', UP - 0.4, UP, [-X, -22, X, -13], sw(-17.65, -14.55), { tint: [0.9, 0.9, 0.9] });
  k.slab('Stone', UP - 0.4, UP, [-X, 13, X, 22], sw(14.55, 17.65), { tint: [0.9, 0.9, 0.9] });
  k.box('Stone', -3, UP - 0.4, -13, 3, UP, 13, { tint: [0.9, 0.9, 0.9], solid: false });
  k.box('Steel', -3.1, UP - 0.4, 3.0, 3.1, UP - 0.38, 13, { tint: [0.3, 0.3, 0.3], solid: false });
  const rail = (x0, z0, x1, z1) => { k.box('Steel', x0, UP, z0, x1, UP + 1.1, z1, { tint: [0.55, 0.57, 0.6], solid: false, deco: true }); k.box('light', x0 - 0.02, UP + 1.1, z0 - 0.02, x1 + 0.02, UP + 1.14, z1 + 0.02, { flat: true, solid: false, deco: true }); };
  rail(-X, -13.1, -3, -13); rail(3, -13.1, X, -13); rail(-X, 13, -3, 13.1); rail(3, 13, X, 13.1);
  rail(-3.1, -13, -3, 13); rail(3, -13, 3.1, 13);
  for (const s of [-1, 1]) {
    const flight = (x0, dir, z0, z1, base, zz) => {
      const xe = k.stairsX('Deck', x0, dir, z0, z1, base, UP, STEPS, { tint: W.grey, run: 0.45 });
      for (let i = 1; i <= STEPS; i += 2) for (const [za, zb] of [[z0 - 0.15, z0], [z1, z1 + 0.15]]) { const xa = x0 + dir * 0.45 * (i - 1), xb = x0 + dir * 0.45 * (i + 1); k.box('Steel', Math.min(xa, xb), (UP / STEPS) * i, za, Math.max(xa, xb), (UP / STEPS) * i + 1.0, zb, { tint: [0.45, 0.47, 0.5], solid: false, deco: true }); }
      return xe;
    };
    flight(-31, 1, -17.5, -14.7, 0, 0); flight(31, -1, -17.5, -14.7, 0, 0);
    flight(-31, 1, 14.7, 17.5, 0, 0); flight(31, -1, 14.7, 17.5, 0, 0);
    void s;
  }

  const shopFront = (x0, x1, z, dir, col, i) => {
    k.box('Fronts', x0, UP + 0.2, z, x1, UP + 3.6, z + dir * 0.25, { flat: true, solid: false, deco: true });
    k.box('Signs', x0 + 1, UP + 3.7, z, x1 - 1, UP + 4.5, z + dir * 0.06, { tint: col, flat: true, gain: 1.3, solid: false, deco: true });
    k.box('Furniture', x0 + 0.4, UP, z + dir * 0.5, x1 - 0.4, UP + 1.05, z + dir * 1.3, { tint: col });
  };
  const cols = [[0.95, 0.35, 0.55], [0.98, 0.55, 0.15], [0.1, 0.6, 0.62], [0.55, 0.35, 0.85], [0.98, 0.82, 0.25], [0.25, 0.5, 0.95]];
  for (let i = 0; i < 5; i++) { shopFront(-31 + i * 5.5 + (i > 2 ? 17 : 0), -26.5 + i * 5.5 + (i > 2 ? 17 : 0), -Z + 0.2, 1, cols[i % 6], i); shopFront(-31 + i * 5.5 + (i > 2 ? 17 : 0), -26.5 + i * 5.5 + (i > 2 ? 17 : 0), Z - 0.2, -1, cols[(i + 2) % 6], i); }

  for (let x = -30; x <= 30; x += 6) for (const z of [-9, -7.6]) if (Math.abs(x) > 4) { f.chair(x, z, 0, 0, W.black, [0.22, 0.28, 0.36]); }
  for (const x of [-22, -11, 11, 22]) { f.table(x, -9, 2.4, 0.8, 0, 0.5, W.dark); f.chair(x - 0.6, -9.9, 0, 0, W.black); f.chair(x + 0.6, -9.9, 0, 0, W.black); f.chair(x - 0.6, -8.1, 2, 0, W.black); f.chair(x + 0.6, -8.1, 2, 0, W.black); }
  for (const x of [-20, -6, 6, 20]) { k.box('Wood', x - 1.4, 0, 11.2, x + 1.4, 0.5, 11.9, { tint: W.dark }); k.box('Wood', x - 1.4, 0.5, 11.75, x + 1.4, 1.0, 11.85, { tint: W.dark, solid: false, deco: true }); }
  k.box('Signs', -12, 7.4, -Z + 0.05, 12, 9.4, -Z + 0.2, { tint: [1, 1, 1], flat: true, solid: false, deco: true });
  f.painting('PaintA', 0, -Z + 0.3, 3, 4.6, 3.0, 0, 1);
  k.cylinder('Marble', 0, -6, 1.1, 0, 0.5, W.marble, 16); k.cylinder('Furniture', 0, -6, 0.9, 0.45, 0.6, [0.2, 0.5, 0.85], 16); k.box('Steel', -0.2, 0.5, -6.2, 0.2, 7, -5.8, { tint: [0.25, 0.25, 0.28], solid: false });
  k.cylinder('Marble', 0, -6, 1.5, 6.4, 7.6, W.gold, 20); k.cylinder('Furniture', 0, -6, 1.35, 6.5, 7.5, [0.95, 0.95, 0.9], 20);
  for (const [x, z] of [[-30, -19], [30, -19], [-30, 19.5], [30, 19.5]]) { f.crate(x, z, 0); f.crate(x + 1.0, z, 0); f.crate(x, z + (z < 0 ? 1 : -1), 0); }
  for (const x of [-16, 16]) { f.crate(x, -19.6, 0, 1.0); f.crate(x + 1.1, -19.6, 0, 1.0); f.crate(x, -19.6, 1.0, 0.9); }

  const tex = { stone: await T.stone(), platform: await T.platform(), rail: await T.rail(), brick: await T.brick(), roof: await T.roof(), glassroof: await T.glassroof(), steel: await T.steel(), deck: await T.deck(), train: await T.train(), storefront: await T.storefront(), signs: await T.signs(), crate: await T.crate(), fabric: await T.fabric(), marble: await T.marble(), paintA: await T.paintA() };
  return { kit: k, tex, seed: { x: 0, y: 0, z: -10 } };
}
