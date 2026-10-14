import { Kit, clamp01 } from './kit.mjs';
import { T } from './textures.mjs';
import { P } from './photo.mjs';

const X = 32, Z = 22, H = 13, DECK = 3.6;
const C = {
  orange: [0.66, 0.34, 0.15], teal: [0.24, 0.42, 0.42], crimson: [0.5, 0.18, 0.14], cobalt: [0.22, 0.3, 0.44],
  yellow: [0.64, 0.5, 0.2], green: [0.22, 0.34, 0.25], grey: [0.62, 0.64, 0.66], blue: [0.15, 0.45, 1], red: [1, 0.2, 0.15],
};
const BASES = { A: { x: -27, z: 0 }, B: { x: 27, z: 0 } };

export async function build() {
  const k = new Kit({ dim: (x, y, z) => (Math.abs(z) > 18.5 && y < 3.3 ? 0.78 : 1) });
  k.mat('CarpetBake4', 'concrete', 'world', 4);
  k.mat('RoofBaked', 'roof', 'world', 4);
  k.mat('Walls', 'corrugated', 'wall', 4);
  k.mat('MuralA', 'muralA', 'face');
  k.mat('MuralB', 'muralB', 'face');
  k.mat('Containers', 'container', 'side', 2.6);
  k.mat('Steel', 'steel', 'world', 2);
  k.mat('Deck', 'deck', 'world', 1.5);
  k.mat('Crates', 'crate', 'face');
  k.mat('PlugsBaked', 'paint', 'world', 2);
  k.mat('light', null);
  k.mat('Lightsurround', 'steel', 'world', 2);
  for (const z of [-12, 0, 12]) for (const x of [-20, -10, 0, 10, 20]) k.lamps.push({ x, y: 9, z });
  for (const z of [-20.2, 20.2]) for (const x of [-22, -14, -6, 6, 14, 22]) k.lamps.push({ x, y: 3.1, z });

  const wall = (p, axis) => k.quad('Walls', ...p, p.map(([x, y, z]) => [(axis ? z : x) / 4, 1 - y / H]), p.map(([x, y, z]) => { const s = (0.5 + 0.5 * y / H) * Math.min(1, k.shade(x, Math.min(y, 6), z) + 0.1); return [s, s, s]; }));
  for (let x = -X; x < X; x += 16) { wall([[x, H, -Z], [x, 0, -Z], [x + 16, 0, -Z], [x + 16, H, -Z]], 0); wall([[x + 16, H, Z], [x + 16, 0, Z], [x, 0, Z], [x, H, Z]], 0); }
  for (let z = -Z; z < Z; z += 11) { wall([[-X, H, z + 11], [-X, 0, z + 11], [-X, 0, z], [-X, H, z]], 1); wall([[X, H, z], [X, 0, z], [X, 0, z + 11], [X, H, z + 11]], 1); }
  const mural = (m, x, nx) => {
    const c = [0.6, 0.6, 0.6], p = nx > 0 ? [[x, 11.6, 9], [x, 1.6, 9], [x, 1.6, -9], [x, 11.6, -9]] : [[x, 11.6, -9], [x, 1.6, -9], [x, 1.6, 9], [x, 11.6, 9]];
    k.quad(m, ...p, [[0, 0], [0, 1], [1, 1], [1, 0]], [c, c, c, c]);
  };
  mural('MuralA', -X + 0.06, 1); mural('MuralB', X - 0.06, -1);
  k.quad('RoofBaked', [-X, H, -Z], [X, H, -Z], [X, H, Z], [-X, H, Z], [[-X / 4, -Z / 4], [X / 4, -Z / 4], [X / 4, Z / 4], [-X / 4, Z / 4]], Array(4).fill([0.55, 0.58, 0.62]));
  for (const z of [-8, 8]) for (let x = -24; x < 24; x += 8) k.box('light', x + 1, H - 0.08, z - 1.5, x + 7, H - 0.02, z + 1.5, { flat: true, solid: false, skip: ['top'] });
  for (let x = -24; x <= 24; x += 8) k.box('Lightsurround', x - 0.25, H - 1.4, -Z, x + 0.25, H - 1.0, Z, { tint: C.grey, solid: false, skip: ['top'] });
  for (const l of k.lamps) {
    if (l.y > 5) {
      k.box('Lightsurround', l.x - 1.7, l.y + 0.1, l.z - 0.35, l.x + 1.7, l.y + 0.3, l.z + 0.35, { tint: [0.35, 0.37, 0.4], solid: false, skip: ['top'] });
      k.box('light', l.x - 1.5, l.y - 0.02, l.z - 0.22, l.x + 1.5, l.y + 0.1, l.z + 0.22, { flat: true, solid: false, skip: ['top', 'x+', 'x-', 'z+', 'z-'] });
    } else k.box('light', l.x - 0.9, l.y - 0.06, l.z - 0.12, l.x + 0.9, l.y, l.z + 0.12, { flat: true, solid: false, skip: ['top'] });
  }

  for (const s of [-1, 1]) {
    const zIn = s * 18.5, zOut = s * Z;
    k.box('Deck', -26, DECK - 0.3, Math.min(zIn, zOut), 26, DECK, Math.max(zIn, zOut), { tint: C.grey, solid: false });
    for (const [a, b] of [[-26, -24], [-22, -1.6], [1.6, 22], [24, 26]]) k.box('PlugsBaked', a, DECK, s > 0 ? zIn : zIn - 0.15, b, DECK + 0.95, s > 0 ? zIn + 0.15 : zIn, { tint: C.yellow, solid: false });
    for (const xe of [-26, 25.85]) k.box('PlugsBaked', xe, DECK, Math.min(zIn, zOut), xe + 0.15, DECK + 0.95, Math.max(zIn, zOut), { tint: C.yellow, solid: false });
    for (const x of [-20, -12, -4, 4, 12, 20]) k.box('Steel', x - 0.2, 0, s > 0 ? 18.5 : -18.9, x + 0.2, DECK - 0.3, s > 0 ? 18.9 : -18.5, { tint: C.grey, skip: ['top'] });
  }
  const stairs = (x0, dir, zA, zB) => {
    const xl = k.stairsX('Deck', x0, dir, zA, zB, 0, DECK, 15, { tint: C.grey });
    const zr0 = zA > 0 ? zA - 0.15 : zB, zr1 = zA > 0 ? zA : zB + 0.15;
    for (let i = 1; i <= 15; i += 2) { const xa = x0 + dir * 0.4 * (i - 1), xb = x0 + dir * 0.4 * (i + 1); k.box('PlugsBaked', Math.min(xa, xb), (DECK / 15) * i, zr0, Math.max(xa, xb), (DECK / 15) * i + 0.95, zr1, { tint: C.yellow, solid: false }); }
    const xl2 = xl + dir * 2;
    k.box('Deck', Math.min(xl, xl2), 0, zA, Math.max(xl, xl2), DECK, zB, { tint: C.grey });
    k.box('PlugsBaked', Math.min(xl, xl2), DECK, zr0, Math.max(xl, xl2), DECK + 0.95, zr1, { tint: C.yellow, solid: false });
    const xe = dir > 0 ? xl2 : xl2 - 0.15;
    k.box('PlugsBaked', xe, DECK, Math.min(zA, zB), xe + 0.15, DECK + 0.95, Math.max(zA, zB), { tint: C.yellow, solid: false });
  };
  stairs(-16, -1, -18.5, -16.5); stairs(16, 1, -18.5, -16.5); stairs(-16, -1, 16.5, 18.5); stairs(16, 1, 16.5, 18.5);
  k.box('Deck', -1.6, DECK - 0.3, -18.5, 1.6, DECK, 18.5, { tint: C.grey, solid: false });
  k.box('PlugsBaked', -1.6, DECK, -18.5, -1.45, DECK + 0.95, 18.5, { tint: C.yellow, solid: false });
  k.box('PlugsBaked', 1.45, DECK, -18.5, 1.6, DECK + 0.95, 18.5, { tint: C.yellow, solid: false });
  k.box('light', -0.8, DECK - 0.36, -16, 0.8, DECK - 0.3, 16, { flat: true, solid: false, skip: ['top', 'x+', 'x-', 'z+', 'z-'] });

  for (const [team, sx] of [['A', -1], ['B', 1]]) {
    const tc = team === 'A' ? C.blue : C.red, bx = BASES[team].x;
    k.box('Steel', bx - 2, 0, -2.5, bx + 2, 0.25, 2.5, { tint: [0.45, 0.47, 0.5] });
    for (const [a, b, c, d] of [[bx - 2.05, -2.55, bx + 2.05, -2.4], [bx - 2.05, 2.4, bx + 2.05, 2.55], [bx - 2.05, -2.55, bx - 1.9, 2.55], [bx + 1.9, -2.55, bx + 2.05, 2.55]]) k.box('PlugsBaked', a, 0, b, c, 0.27, d, { tint: tc, flat: true, solid: false });
    for (const px of [bx - 2.6, bx + 2.6]) for (const pz of [-3.1, 2.8]) k.box('Steel', px - 0.15, 0, pz, px + 0.15, 6.2, pz + 0.3, { tint: [0.3, 0.32, 0.36] });
    for (const pz of [-3.1, 2.8]) k.box('Steel', bx - 2.9, 6.2, pz, bx + 2.9, 6.6, pz + 0.3, { tint: [0.3, 0.32, 0.36], solid: false });
    for (const pz of [-2.95, 2.85]) k.box('PlugsBaked', bx - 2.6, 6.05, pz, bx + 2.6, 6.2, pz + 0.1, { tint: tc, flat: true, solid: false });
    const bar = sx * 23.4;
    for (const [z0, z1] of [[3.6, 6.8], [-6.8, -3.6]]) { k.box('Steel', bar - 0.3, 0, z0, bar + 0.3, 1.15, z1, { tint: [0.68, 0.7, 0.72] }); k.box('PlugsBaked', bar - 0.31, 1.0, z0, bar + 0.31, 1.15, z1, { tint: tc, flat: true, solid: false }); }
    k.box('PlugsBaked', sx * 23.6 - 0.12, 0, -22, sx * 23.6 + 0.12, 0.03, 22, { tint: C.yellow, flat: true, solid: false, skip: ['x+', 'x-', 'z+', 'z-'] });
    for (let z = -21; z < 21; z += 3) k.box('PlugsBaked', sx * 30.2 - 0.6, 0, z, sx * 30.2 + 0.6, 0.03, z + 1.2, { tint: tc, flat: true, solid: false, skip: ['x+', 'x-', 'z+', 'z-'] });
  }

  const container = (x0, z0, alongX, tint, levels = 1, color2) => {
    const [x1, z1] = alongX ? [x0 + 6, z0 + 2.4] : [x0 + 2.4, z0 + 6];
    k.box('Containers', x0, 0, z0, x1, 2.6, z1, { tint, skip: levels > 1 ? ['top'] : [] });
    if (levels > 1) k.box('Containers', x0 + 0.05, 2.6, z0 + 0.05, x1 - 0.05, 5.2, z1 - 0.05, { tint: color2 || tint, solid: false, noBottom: true });
  };
  const crate = (x, z, size = 1.2, y = 0) => k.box('Crates', x - size / 2, y, z - size / 2, x + size / 2, y + size, z + size / 2, { solid: y === 0, noBottom: true });
  container(-24, -12.2, true, C.teal); container(18, 9.8, true, C.teal);
  container(-24, 9.8, true, C.orange, 2, C.cobalt); container(18, -12.2, true, C.orange, 2, C.cobalt);
  container(-17, -7.7, true, C.orange); container(11, 5.3, true, C.orange);
  container(-9.5, -7.7, true, C.teal, 2, C.crimson); container(3.5, 5.3, true, C.teal, 2, C.crimson);
  container(4, -7.7, true, C.yellow); container(-10, 5.3, true, C.yellow);
  container(-1.2, -3, false, C.cobalt); container(4.8, -16, false, C.green); container(-7.2, 10, false, C.green);
  for (const s of [-1, 1]) {
    crate(-9 * s, -1.5 * s); crate(-9 * s, -0.3 * s); crate(-7.8 * s, -1.5 * s); crate(-9 * s, -1.5 * s, 1.0, 1.2);
    crate(-12 * s, -13 * s); crate(-12 * s, -11.8 * s); crate(-10.8 * s, -13 * s); crate(-12 * s, -13 * s, 1.0, 1.2);
    crate(-8 * s, -20.6 * s); crate(-6.8 * s, -20.6 * s); crate(-8 * s, -20.6 * s, 1.0, 1.2);
    crate(15 * s, -20.6 * s); crate(-16.5 * s, 0.5 * s);
    k.box('Steel', -14.5 * s - 0.5, 0, Math.min(1.6 * s, 4.6 * s), -14.5 * s + 0.5, 1.1, Math.max(1.6 * s, 4.6 * s), { tint: [0.68, 0.7, 0.72] });
  }
  for (const [x, z, t] of [[-2.6, -13, C.blue], [-1.7, -13.6, C.yellow], [-2.4, -14.3, C.red], [2.6, 13, C.blue], [1.7, 13.6, C.yellow], [2.4, 14.3, C.red], [-19.5, 3.5, C.yellow], [19.5, -3.5, C.yellow], [-19.5, -3.5, C.green], [19.5, 3.5, C.green]]) k.cylinder('Containers', x, z, 0.32, 0, 0.95, t, 8);

  k.floor('CarpetBake4', -X, -Z, X, Z, 0, 2, (x, z) => {
    let s = k.shade(x, 0, z) * 0.9 * (0.55 + 0.45 * clamp01(k.clearance(x, z, X, Z) / 1.4));
    let col = [s, s, s * 1.02];
    for (const [team, tc] of [['A', C.blue], ['B', C.red]]) {
      const b = BASES[team], g = Math.exp(-((x - b.x) ** 2 + (z - b.z) ** 2) / 60) * 0.5 + (Math.abs(x - b.x) < 6 ? 0.12 : 0);
      col = col.map((c, i) => clamp01(c * (1 - g * 0.5) + tc[i] * g * s));
    }
    return col;
  });

  const tex = {
    concrete: await P.slab(), roof: await P.roofsteel(), corrugated: await P.corrugated(), container: await P.container(), steel: await P.steelplate(),
    deck: await P.deckplate(), crate: await P.crate(), paint: await T.paint(),
    muralA: await T.mural('#0d2f6b', '#1a5fd0', '#7fc0ff', 'BLUE TEAM', 'A'), muralB: await T.mural('#6b0d12', '#d0261a', '#ffb07f', 'RED TEAM', 'B'),
  };
  return { kit: k, tex, seed: { x: 8, y: 0, z: 0 } };
}
