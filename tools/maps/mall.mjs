import { Kit, clamp01 } from './kit.mjs';
import { T } from './textures.mjs';

const X = 32, Z = 20, UP = 4, TOP = 9;
const VOID = [-26, -3, 26, 3];
const BRIDGES = [[-14, -11], [11, 14]];
const SHOPS = [-26, -18, -10, 0, 10, 18, 26];
const ENDSTAIRS = [{ x: [-31, -29], z0: -4, dir: 1 }, { x: [29, 31], z0: 4, dir: -1 }];
const C = { white: [0.92, 0.92, 0.92], grey: [0.6, 0.62, 0.64], dark: [0.25, 0.27, 0.3], green: [0.2, 0.55, 0.25], teal: [0.1, 0.6, 0.62], pink: [0.95, 0.35, 0.55], orange: [0.98, 0.55, 0.15], purple: [0.55, 0.35, 0.85], yellow: [0.98, 0.82, 0.25], blue: [0.25, 0.5, 0.95], red: [0.85, 0.2, 0.2] };
const SHOP_COLORS = [C.pink, C.orange, C.teal, C.purple, C.yellow, C.blue, C.green, C.red, C.orange, C.teal, C.pink, C.purple];

export async function build() {
  const k = new Kit({ dim: (x, y, z) => (Math.abs(z) > 6.2 && y < UP ? 0.82 : 1) });
  k.mat('FloorTile', 'tile', 'world', 4);
  k.mat('Tiles', 'tile', 'world', 4);
  k.mat('Ceiling', 'plaster', 'world', 3);
  k.mat('RoofBaked', 'plaster', 'world', 3);
  k.mat('Walls', 'plaster', 'world', 3);
  k.mat('Fronts', 'storefront', 'face');
  k.mat('Signs', 'signs', 'world', 1);
  k.mat('Steel', 'steel', 'world', 2);
  k.mat('Deck', 'deck', 'world', 1.5);
  k.mat('Furniture', 'fabric', 'world', 1);
  k.mat('light', null);
  for (const x of [-24, -16, -8, 0, 8, 16, 24]) { k.lamps.push({ x, y: 8.5, z: 0, k: 0.3, r: 70 }); for (const z of [-13, 13]) for (const y of [3.6, 7.6]) k.lamps.push({ x: x + 4, y, z, k: 0.2, r: 30 }); }

  k.box('Walls', -X - 0.3, 0, -Z - 0.3, X + 0.3, TOP, -Z, { tint: C.white, skip: ['z-'] });
  k.box('Walls', -X - 0.3, 0, Z, X + 0.3, TOP, Z + 0.3, { tint: C.white, skip: ['z+'] });
  k.box('Walls', -X - 0.3, 0, -Z, -X, TOP, Z, { tint: C.white, skip: ['x-'] });
  k.box('Walls', X, 0, -Z, X + 0.3, TOP, Z, { tint: C.white, skip: ['x+'] });
  k.box('RoofBaked', -X, TOP, -Z, X, TOP + 0.2, Z, { tint: [0.75, 0.76, 0.78], solid: false, skip: ['top'] });
  for (let x = -24; x < 24; x += 6) k.box('light', x + 0.5, TOP - 0.06, -2.2, x + 5.5, TOP - 0.01, 2.2, { flat: true, solid: false, skip: ['top'] });

  const holes = [VOID, ...ENDSTAIRS.map((s) => [s.x[0], Math.min(s.z0, s.z0 + s.dir * 8), s.x[1], Math.max(s.z0, s.z0 + s.dir * 8)])];
  const bridgeless = holes;
  k.slab('Ceiling', UP - 0.35, UP - 0.03, [-X, -Z, X, Z], bridgeless, { tint: C.white });
  k.slab('Tiles', UP - 0.03, UP, [-X, -Z, X, Z], bridgeless, { tint: [0.95, 0.95, 0.95], skip: ['bot'] });
  for (const [a, b] of BRIDGES) { k.box('Ceiling', a, UP - 0.35, VOID[1], b, UP - 0.03, VOID[3], { tint: C.white, solid: false }); k.box('Tiles', a, UP - 0.03, VOID[1], b, UP, VOID[3], { tint: [0.95, 0.95, 0.95], solid: false, skip: ['bot'] }); }
  const rail = (x0, z0, x1, z1) => { k.box('Steel', x0, UP, z0, x1, UP + 1.0, z1, { tint: C.grey, solid: false }); k.box('light', x0, UP + 1.0, z0, x1, UP + 1.04, z1, { flat: true, solid: false, skip: ['bot'] }); };
  const cuts = [VOID[0], ...BRIDGES.flat(), VOID[2]];
  for (let i = 0; i < cuts.length - 1; i += 2) for (const z of [VOID[1], VOID[3]]) rail(cuts[i], z < 0 ? z - 0.1 : z, cuts[i + 1], z < 0 ? z : z + 0.1);
  rail(VOID[0] - 0.1, VOID[1], VOID[0], VOID[3]); rail(VOID[2], VOID[1], VOID[2] + 0.1, VOID[3]);
  rail(-11, VOID[1], -10.9, VOID[3]); rail(10.9, VOID[1], 11, VOID[3]);
  rail(-14.1, 0.6, -14, VOID[3]); rail(-14.1, VOID[1], -14, -2.6);
  rail(14, VOID[1], 14.1, -0.6); rail(14, 2.6, 14.1, VOID[3]);
  for (const s of ENDSTAIRS) {
    const za = Math.min(s.z0, s.z0 + s.dir * 8), zb = Math.max(s.z0, s.z0 + s.dir * 8);
    k.stairsZ('Deck', s.z0, s.dir, s.x[0], s.x[1], 0, UP, 16, { tint: C.grey, run: 0.5 });
    const inner = s.x[0] < 0 ? s.x[1] : s.x[0] - 0.1;
    rail(inner, za, inner + 0.1, zb);
    if (s.dir > 0) rail(s.x[0], za - 0.1, s.x[1], za); else rail(s.x[0], zb, s.x[1], zb + 0.1);
  }
  const escalator = (x0, dir, z0, z1) => {
    k.stairsX('Deck', x0, dir, z0, z1, 0, UP, 16, { tint: [0.5, 0.52, 0.55], run: 0.5 });
    for (const zz of [[z0 - 0.25, z0], [z1, z1 + 0.25]]) for (let i = 0; i < 16; i += 2) { const xa = x0 + dir * 0.5 * i, xb = x0 + dir * 0.5 * (i + 2); k.box('Steel', Math.min(xa, xb), 0, zz[0], Math.max(xa, xb), (UP / 16) * (i + 2) + 0.9, zz[1], { tint: C.dark, solid: true }); }
  };
  escalator(-22, 1, -2.6, -0.6);
  escalator(22, -1, 0.6, 2.6);

  for (const y of [0, UP]) for (const s of [-1, 1]) {
    const zf = s * 6, zb = s * Z;
    for (let i = 0; i < SHOPS.length; i++) {
      const x = SHOPS[i];
      k.box('Walls', x - 0.15, y, Math.min(zf, zb), x + 0.15, y + UP - (y ? 0 : 0.35), Math.max(zf, zb), { tint: C.white });
      if (i < SHOPS.length - 1) {
        const x1 = SHOPS[i + 1], col = SHOP_COLORS[(i + (s > 0 ? 6 : 0) + (y ? 3 : 0)) % SHOP_COLORS.length];
        k.box('Fronts', x + 0.15, y + 3.0, s > 0 ? zf : zf - 0.25, x1 - 0.15, y + UP - (y ? 0.05 : 0.35), s > 0 ? zf + 0.25 : zf, { tint: [1, 1, 1], solid: false, flat: true });
        k.box('Signs', x + 0.6, y + 3.15, s > 0 ? zf - 0.03 : zf - 0.03, x1 - 0.6, y + 3.75, s > 0 ? zf : zf + 0.03, { tint: col, flat: true, gain: 1.2, solid: false });
        const cx = (x + x1) / 2, cz = s * 13;
        if (!(y === 0 && s > 0 && i === 3)) {
          k.box('Furniture', cx - 2.2, y, s * 9.5 - 0.5, cx + 2.2, y + 1.05, s * 9.5 + 0.5, { tint: col, noBottom: y > 0 });
          k.box('Furniture', x + 0.4, y, cz - 2, x + 1.1, y + 2.0, cz + 2, { tint: C.white, noBottom: y > 0 });
          k.box('Furniture', x1 - 1.1, y, cz - 2, x1 - 0.4, y + 2.0, cz + 2, { tint: C.white, noBottom: y > 0 });
        } else {
          k.box('Furniture', 1.0, 0, 18.2, 6, 1.1, 19.6, { tint: col });
          k.box('Furniture', 0.4, 0, 9, 1.1, 2.0, 13, { tint: C.white });
        }
      }
    }
  }
  k.box('Walls', -X, 0, -Z, -26, UP - 0.35, -6, { tint: C.white, skip: ['top'] });
  k.box('Fronts', -X + 0.05, 0.5, -19.95, -26.5, 3.2, -19.9, { flat: true, solid: false });
  k.box('Signs', -31, 3.4, -5.98, -27, 3.9, -5.95, { tint: C.red, flat: true, gain: 1.4, solid: false });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const x = 27.5 + j * 1.6, z = -16 + i * 3.4;
    k.cylinder('Furniture', x, z, 0.55, 0, 0.75, [0.9, 0.9, 0.9], 8);
    k.box('Steel', x - 0.06, 0.75, z - 0.06, x + 0.06, 2.4, z + 0.06, { tint: C.dark, solid: false });
  }
  k.box('Furniture', 26.5, 0, 9, 31.6, 1.1, 10.2, { tint: C.orange });
  k.cylinder('Furniture', 0, 0, 2.1, 0, 0.6, [0.85, 0.88, 0.9], 16);
  k.cylinder('Furniture', 0, 0, 1.75, 0.55, 0.62, [0.2, 0.5, 0.85], 16);
  k.cylinder('Furniture', 0, 0, 0.35, 0.6, 2.0, [0.85, 0.88, 0.9], 8);
  for (const x of [-20, -6, 6, 20]) for (const z of [-4.6, 4.6]) { k.box('Furniture', x - 1.2, 0, z - 0.4, x + 1.2, 0.6, z + 0.4, { tint: [0.55, 0.45, 0.35] }); k.box('Furniture', x - 1.1, 0.6, z - 0.3, x + 1.1, 0.9, z + 0.3, { tint: C.green, solid: false }); }
  for (const x of [-7, 7]) for (const z of [-5, 5]) k.box('Furniture', x - 0.9, UP, z - 0.4, x + 0.9, UP + 0.6, z + 0.4, { tint: C.green, noBottom: true });
  for (const x of [-30, -22, 22, 30]) k.box('Steel', x - 0.3, 0, -0.3, x + 0.3, UP - 0.35, 0.3, { tint: C.white });

  k.floor('FloorTile', -X, -Z, X, Z, 0, 2, (x, z) => { const s = k.shade(x, 0, z) * (0.62 + 0.38 * clamp01(k.clearance(x, z, X, Z) / 1.2)); return [s, s, s]; });

  const tex = { tile: await T.tile(), plaster: await T.plaster(), storefront: await T.storefront(), signs: await T.signs(), steel: await T.steel(), deck: await T.deck(), fabric: await T.fabric() };
  return { kit: k, tex, seed: { x: 8, y: 0, z: -4.5 } };
}
