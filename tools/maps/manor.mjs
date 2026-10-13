import { Kit, clamp01 } from './kit.mjs';
import { P } from './photo.mjs';
import { furniture, W } from './furn.mjs';

const X = 26, Z = 18, FH = 6, LV = [0, FH, FH * 2], TOP = FH * 3;
const ATRIUM = [-4, -9, 4, 9];
const RUN = 0.375, STEPS = 24, LEN = RUN * STEPS;
const FLIGHTS = [{ x: [-8.5, -5.5], z0: 16.5, dir: -1, base: 0 }, { x: [5.5, 8.5], z0: -16.5, dir: 1, base: FH }];
const ARCH = 4.6;
const WARM = [1, 0.8, 0.56], COOL = [0.62, 0.74, 1];

export async function build() {
  const ao = (x, y, z) => {
    const ax = Math.abs(x), az = Math.abs(z), base = y >= 12 ? 12 : y >= 6 ? 6 : 0, top = base === 12 ? TOP : base + FH - 0.4;
    const dw = Math.min(X - ax, Z - az, Math.abs(ax - 9), ax > 9 ? az : 99), dy = Math.min(y - base, top - y);
    return 1 - 0.5 * (1 - clamp01(dw / 1.8)) * (1 - clamp01(dy / 1.8)) - 0.14 * (1 - clamp01(dy / 0.6)) - 0.12 * (1 - clamp01(dw / 0.5));
  };
  const k = new Kit({ ambient: 0.27, rise: 0.04, dim: ao });
  k.splitDeco = true;
  const f = furniture(k);
  k.mat('FloorStone', 'carrara', 'world', 4);
  k.mat('FloorParquet', 'oak', 'world', 4);
  k.mat('Parquet', 'oak', 'world', 4);
  k.mat('Gallery', 'carrara', 'world', 4);
  k.mat('Nero', 'nero', 'world', 2);
  k.mat('Marble', 'statuary', 'world', 1.5);
  k.mat('Stone', 'limestone', 'world', 2);
  k.mat('Trim', 'limestone', 'world', 2);
  k.mat('Statue', 'statuary', 'world', 1.5);
  k.mat('Ceiling', 'plaster', 'world', 3);
  k.mat('RoofBaked', 'plaster', 'world', 3);
  k.mat('Walls', 'panelwall', 'wall', 2.4);
  k.mat('Wood', 'walnut', 'world', 2);
  k.mat('Leather', 'leather', 'world', 1);
  k.mat('Brass', 'brass', 'world', 0.6);
  k.mat('Books', 'books', 'world', 1.4);
  k.mat('Glass', 'window', 'face');
  k.mat('Cases', 'vitrine', 'face');
  k.mat('Crates', 'crate', 'face');
  k.mat('Rug', 'rug', 'face');
  k.mat('PaintA', 'oil1', 'face'); k.mat('PaintB', 'oil2', 'face'); k.mat('PaintC', 'oil3', 'face');
  k.mat('Curtain', 'velvet', 'face');
  k.mat('Scaffold', 'scaffold', 'world', 2);
  k.mat('Steel', 'steelpipe', 'world', 1);
  k.mat('Barrier', 'barrier', 'side', 2);
  k.mat('Tarp', 'plaster', 'world', 1);
  k.mat('light', null);

  for (const y of LV) {
    for (const x of [-21, -13, 13, 21]) for (const z of [-Z + 0.6, Z - 0.6]) k.lamps.push({ x, y: y + 2.2, z, k: 0.26, r: 9, c: COOL });
    for (const z of [-10, 10]) for (const x of [-X + 0.6, X - 0.6]) k.lamps.push({ x, y: y + 2.2, z, k: 0.26, r: 9, c: COOL });
  }
  for (const y of LV) for (const x of [-17.5, 17.5]) for (const z of [-9, 9]) f.chandelier(x, z, y === FH * 2 ? TOP : y + FH - 0.4, 1.3, 0.75);
  k.lamps.push({ x: 0, y: 12.5, z: 0, k: 0.36, r: 120, c: WARM });
  k.lamps.push({ x: 0, y: 4, z: 0, k: 0.22, r: 40, c: WARM });

  const wopts = (y) => ({ base: y, span: FH, sub: 1.5 });
  const doorsX = (y) => [[-14, -10, y + ARCH], [-2, 2, y + ARCH], [10, 14, y + ARCH]];
  const casing = (y, axis, at, a, b) => {
    {
      if (axis === 'x') { k.box('Stone', at - 0.24, y, a - 0.32, at + 0.24, y + ARCH, a, { solid: false }); k.box('Stone', at - 0.24, y, b, at + 0.24, y + ARCH, b + 0.32, { solid: false }); k.box('Stone', at - 0.24, y + ARCH, a - 0.32, at + 0.24, y + ARCH + 0.45, b + 0.32, { solid: false }); k.box('Stone', at - 0.27, y + ARCH + 0.05, (a + b) / 2 - 0.3, at + 0.27, y + ARCH + 0.55, (a + b) / 2 + 0.3, { solid: false }); }
      else { k.box('Stone', a - 0.32, y, at - 0.24, a, y + ARCH, at + 0.24, { solid: false }); k.box('Stone', b, y, at - 0.24, b + 0.32, y + ARCH, at + 0.24, { solid: false }); k.box('Stone', a - 0.32, y + ARCH, at - 0.24, b + 0.32, y + ARCH + 0.45, at + 0.24, { solid: false }); }
    }
  };
  for (const y of LV) {
    k.wallZ('Walls', -Z, -X, X, y, y + FH, 0.4, [], wopts(y));
    k.wallZ('Walls', Z, -X, X, y, y + FH, 0.4, [], wopts(y));
    k.wallX('Walls', -X, -Z, Z, y, y + FH, 0.4, [], wopts(y));
    k.wallX('Walls', X, -Z, Z, y, y + FH, 0.4, [], wopts(y));
    for (const s of [-1, 1]) {
      k.wallX('Walls', s * 9, -Z, Z, y, y + FH, 0.3, doorsX(y), wopts(y));
      for (const [a, b] of [[-14, -10], [-2, 2], [10, 14]]) casing(y, 'x', s * 9, a, b);
      const door = s < 0 ? [-19, -15, y + ARCH] : [15, 19, y + ARCH];
      k.wallZ('Walls', 0, s < 0 ? -X : 9, s < 0 ? -9 : X, y, y + FH, 0.3, [door], wopts(y));
      casing(y, 'z', 0, door[0], door[1]);
    }
    for (const x of [-21, -13, 13, 21]) for (const z of [-Z + 0.2, Z - 0.2]) {
      const nz = z < 0 ? 1 : -1;
      f.painting('Glass', x, z, y + 1.3, 2.4, 3.2, 0, nz);
      k.box('Stone', x - 1.4, y + 1.1, Math.min(z, z + nz * 0.14), x + 1.4, y + 1.3, Math.max(z, z + nz * 0.14), { solid: false, deco: true });
      k.box('Stone', x - 1.35, y + 4.5, Math.min(z, z + nz * 0.1), x + 1.35, y + 4.75, Math.max(z, z + nz * 0.1), { solid: false, deco: true });
      for (const sx of [-1, 1]) k.box('Curtain', x + sx * 1.25 - 0.3, y + 0.15, Math.min(z, z + nz * 0.16), x + sx * 1.25 + 0.3, y + 5.0, Math.max(z, z + nz * 0.16), { solid: false, deco: true });
      k.box('Brass', x - 1.7, y + 5.0, Math.min(z, z + nz * 0.2), x + 1.7, y + 5.05, Math.max(z, z + nz * 0.2), { solid: false, deco: true });
    }
    for (const z of [-10, 10]) for (const s of [-1, 1]) {
      const x = s * (X - 0.2);
      f.painting('Glass', x, z, y + 1.3, 2.4, 3.2, -s, 0);
      for (const sz of [-1, 1]) k.box('Curtain', Math.min(x, x - s * 0.16), y + 0.15, z + sz * 1.25 - 0.3, Math.max(x, x - s * 0.16), y + 5.0, z + sz * 1.25 + 0.3, { solid: false, deco: true });
    }
  }

  const fgrid = (m, x0, z0, x1, z1, y, holes = [], G = Math.abs(x0 + x1) > 1 ? 1 : 0.5) => k.floor(m, x0, z0, x1, z1, y, G, (x, z) => {
    let ao = clamp01(Math.min(X - Math.abs(x), Z - Math.abs(z), Math.abs(Math.abs(x) - 9) + (Math.abs(x) < 9 ? 0 : 0)) / 1.2);
    if (y < 1) ao = Math.min(ao, clamp01(k.clearance(x, z, X, Z) / 0.9));
    const L = k.light(x, y + 0.1, z), s = 0.5 + 0.5 * ao;
    return L.map((c) => c * s);
  }, holes);
  const stairHole = (s) => [s.x[0], Math.min(s.z0, s.z0 + s.dir * LEN), s.x[1], Math.max(s.z0, s.z0 + s.dir * LEN)];

  for (const s of FLIGHTS) {
    k.stairsZ('Marble', s.z0, s.dir, s.x[0], s.x[1], s.base, FH, STEPS, { tint: [0.92, 0.9, 0.86], noBottom: s.base > 0, run: RUN });
    const rise = FH / STEPS, zEnd = s.z0 + s.dir * LEN, top = s.base + FH;
    for (const xs of [s.x[0] - 0.16, s.x[1]]) {
      k.prism('Wood', xs - (xs >= s.x[1] ? 0.02 : 0), xs + 0.16 + (xs < s.x[0] ? 0.02 : 0), [[s.z0, s.base], [s.z0, s.base + rise + 0.1], [zEnd, top + 0.1], [zEnd, s.base > 0 ? top - 0.6 : s.base]], W.n, { scale: 2 });
      const r0 = s.base + rise + 0.95, r1 = top + 0.95;
      k.prism('Wood', xs + 0.01, xs + 0.15, [[s.z0, r0], [s.z0, r0 + 0.08], [zEnd, r1 + 0.08], [zEnd, r1]], W.n, { scale: 2 });
      for (let i = 1; i <= STEPS; i++) {
        const zc = s.z0 + s.dir * RUN * (i - 0.5), yb = s.base + rise * i + 0.08, t = (i - 0.5) / STEPS, yt = r0 + (r1 - r0) * t;
        k.box('Wood', xs + 0.055, yb, zc - 0.025, xs + 0.105, yt, zc + 0.025, { solid: false, deco: true, tint: W.dark });
      }
      k.lathe('Wood', xs + 0.08, s.z0, [[0.11, s.base], [0.11, s.base + 1.15], [0.14, s.base + 1.2], [0.07, s.base + 1.35], [0, s.base + 1.4]], W.n, 8, { solid: false });
    }
  }

  const balustrade = (x0, z0, x1, z1, y) => {
    k.box('Stone', x0, y, z0, x1, y + 0.14, z1, { solid: false });
    k.box('Wood', x0 - 0.02, y + 0.98, z0 - 0.02, x1 + 0.02, y + 1.08, z1 + 0.02, { solid: false, deco: true });
    k.box('Stone', x0, y + 0.86, z0, x1, y + 0.98, z1, { solid: false, deco: true });
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = along ? x1 - x0 : z1 - z0, n = Math.floor(len / 0.3);
    for (let i = 0; i <= n; i++) {
      const t = (i + 0.5) / (n + 1), x = along ? x0 + len * t : (x0 + x1) / 2, z = along ? (z0 + z1) / 2 : z0 + len * t;
      k.lathe('Trim', x, z, [[0.06, y + 0.14], [0.035, y + 0.34], [0.085, y + 0.56], [0.04, y + 0.86]], W.n, 4, { solid: false, sun: 0.4 });
    }
  };
  for (const [i, y] of LV.entries()) {
    if (i === 0) continue;
    const holes = [ATRIUM, ...FLIGHTS.filter((s) => s.base === y - FH).map(stairHole)];
    k.slab('Ceiling', y - 0.4, y - 0.02, [-X, -Z, X, Z], [[ATRIUM[0] - 0.5, ATRIUM[1] - 0.5, ATRIUM[2] + 0.5, ATRIUM[3] + 0.5], ...holes.slice(1)], { tint: [0.74, 0.72, 0.68], sub: 1.5, skip: ['top'] });
    fgrid('Parquet', -X, -Z, -9, Z, y, holes);
    fgrid('Parquet', 9, -Z, X, Z, y, holes);
    fgrid('Gallery', -9, -Z, 9, Z, y, holes);
    const [ax0, az0, ax1, az1] = ATRIUM;
    balustrade(ax0 - 0.2, az0 - 0.2, ax1 + 0.2, az0, y); balustrade(ax0 - 0.2, az1, ax1 + 0.2, az1 + 0.2, y);
    balustrade(ax0 - 0.2, az0, ax0, az1, y); balustrade(ax1, az0, ax1 + 0.2, az1, y);
    k.box('Nero', ax0 - 0.5, y - 0.6, az0 - 0.5, ax1 + 0.5, y - 0.02, az0, { solid: false, skip: ['top'] }); k.box('Nero', ax0 - 0.5, y - 0.6, az1, ax1 + 0.5, y - 0.02, az1 + 0.5, { solid: false, skip: ['top'] });
    k.box('Nero', ax0 - 0.5, y - 0.6, az0, ax0, y - 0.02, az1, { solid: false, skip: ['top'] }); k.box('Nero', ax1, y - 0.6, az0, ax1 + 0.5, y - 0.02, az1, { solid: false, skip: ['top'] });
    for (const s of FLIGHTS.filter((st) => st.base === y - FH)) {
      const [hx0, hz0, hx1, hz1] = stairHole(s);
      if (s.dir > 0) balustrade(hx0 - 0.2, hz0 - 0.2, hx1 + 0.2, hz0, y); else balustrade(hx0 - 0.2, hz1, hx1 + 0.2, hz1 + 0.2, y);
      balustrade(s.x[0] < 0 ? hx1 : hx0 - 0.2, hz0, s.x[0] < 0 ? hx1 + 0.2 : hx0, hz1, y);
    }
  }
  k.slab('RoofBaked', TOP, TOP + 0.3, [-X, -Z, X, Z], [[-4.5, -7.5, 4.5, 7.5]], { tint: [0.74, 0.72, 0.68], skip: ['top'], sub: 1.5 });
  k.box('light', -4.5, TOP + 0.1, -7.5, 4.5, TOP + 0.12, 7.5, { flat: true, solid: false, skip: ['top', 'x+', 'x-', 'z+', 'z-'] });
  for (const xx of [-4.5, -1.5, 1.5, 4.5]) k.box('Wood', xx - 0.12, TOP - 0.4, -7.7, xx + 0.12, TOP, 7.7, { solid: false, deco: true, tint: W.dark });
  for (let zz = -7.5; zz <= 7.5; zz += 2.5) k.box('Wood', -4.7, TOP - 0.34, zz - 0.1, 4.7, TOP - 0.02, zz + 0.1, { solid: false, deco: true, tint: W.dark });

  for (const y of LV) {
    const ceil = y === FH * 2 ? TOP : y + FH - 0.4;
    for (const s of [-1, 1]) {
      for (const xx of [13.25, 17.5, 21.75]) k.box('Ceiling', s * xx - 0.18, ceil - 0.36, -Z, s * xx + 0.18, ceil, Z, { solid: false, deco: true, tint: [0.7, 0.68, 0.64] });
      for (const zz of [-13.5, -4.5, 4.5, 13.5]) k.box('Ceiling', s > 0 ? 9 : -X, ceil - 0.36, zz - 0.18, s > 0 ? X : -9, ceil, zz + 0.18, { solid: false, deco: true, tint: [0.7, 0.68, 0.64] });
    }
    for (const z of [-14.5, -5, 5, 14.5]) for (const x of [-X + 0.2, X - 0.2]) { k.box('Stone', Math.min(x, x - Math.sign(x) * 0.16), y + 0.16, z - 0.3, Math.max(x, x - Math.sign(x) * 0.16), y + 5.35, z + 0.3, { solid: false, deco: true, sub: 1.5 }); f.sconce(x - Math.sign(x) * 0.16, y + 2.7, z, -Math.sign(x), 0); }
    for (const x of [-17, 17, -24.6, 24.6, -10.4, 10.4]) for (const z of [-Z + 0.2, Z - 0.2]) { k.box('Stone', x - 0.3, y + 0.16, Math.min(z, z - Math.sign(z) * 0.16), x + 0.3, y + 5.35, Math.max(z, z - Math.sign(z) * 0.16), { solid: false, deco: true, sub: 1.5 }); if (Math.abs(x) === 17) f.sconce(x, y + 2.7, z - Math.sign(z) * 0.16, 0, -Math.sign(z)); }
  }

  const arts = ['PaintA', 'PaintB', 'PaintC'];
  let ai = 0;
  for (const y of LV) for (const sx of [-1, 1]) {
    for (const x of [12, 22.5]) for (const nz of [-1, 1]) {
      if (y === FH && sx > 0) continue;
      const m = arts[ai++ % 3], tall = m === 'PaintB';
      f.painting(m, sx * x, nz * 0.16, y + (tall ? 1.2 : 1.5), tall ? 1.6 : 2.6, tall ? 2.1 : 1.8, 0, nz);
      for (const dx of [-1, 1]) f.sconce(sx * x + dx * (tall ? 1.2 : 1.7), y + 2.9, nz * 0.16, 0, nz);
    }
    for (const z of [-6, 6, -16, 16]) {
      if (y === 0 && sx < 0 && z > 0) continue;
      const m = arts[ai++ % 3];
      f.painting(m, sx * 9.16, z, y + 1.5, 2.4, 1.7, sx, 0);
    }
  }
  fgrid('FloorStone', -9, -Z, 9, Z, 0);
  fgrid('FloorParquet', -X, -Z, -9, Z, 0);
  fgrid('FloorParquet', 9, -Z, X, Z, 0);
  for (const [x0, z0, x1, z1] of [[-4.6, -9.6, 4.6, -9], [-4.6, 9, 4.6, 9.6], [-4.6, -9, -4, 9], [4, -9, 4.6, 9]]) k.box('Nero', x0, 0, z0, x1, 0.03, z1, { solid: false, skip: ['x+', 'x-', 'z+', 'z-'], deco: true });

  k.lathe('Nero', 0, 0, [[2.6, 0], [2.6, 0.55], [2.75, 0.62], [2.75, 0.72], [2.45, 0.72], [2.4, 0.5]], W.n, 28);
  k.lathe('Nero', 0, 0, [[2.4, 0.5], [0, 0.5]], [0.3, 0.36, 0.38], 28, { solid: false });
  k.lathe('Stone', 0, 0, [[0.55, 0.5], [0.4, 0.8], [0.3, 1.8], [1.1, 2.0], [1.15, 2.12], [0.25, 2.2], [0.2, 2.6]], W.n, 18, { solid: false });
  f.statue(0, 0, 2.6);
  for (const z of [-15, -5, 5]) f.column(-8.4, z, 0, FH * 2 - 0.4); for (const z of [-5, 5, 15]) f.column(8.4, z, 0, FH * 2 - 0.4);
  const tops = ['statue', 'bust', 'vase', 'bust'];
  for (const s of [-1, 1]) for (const [i, z] of [-12.5, -5, 5, 12.5].entries()) f.pedestal(s * (Math.abs(z) > 10 ? 4.2 : 5.2), z, 0, tops[(i + (s > 0 ? 1 : 0)) % 4]);
  f.stanchions([[-3.2, -13.6], [-3.2, -11.4]]); f.stanchions([[3.2, 11.4], [3.2, 13.6]]);
  f.case(-1.2, -15.8, 1.2, -14.6); f.case(-1.2, 14.6, 1.2, 15.8);
  f.crate(-3.4, 16.7, 0, 1.1); f.crate(-2.2, 16.9, 0, 1.0); f.crate(-3.4, 16.7, 1.1, 0.9);
  f.barrier(-2, 9.9, 2, 10.1); f.barrier(-2, -10.1, 2, -9.9);
  f.painting('PaintA', -9 + 0.16, -6.5, 1.6, 2.6, 1.8, 1, 0); f.painting('PaintC', 9 - 0.16, 6.5, 1.6, 2.6, 1.8, -1, 0);
  f.painting('PaintB', -9 + 0.16, 6.5, 1.3, 1.7, 2.2, 1, 0); f.painting('PaintB', 9 - 0.16, -6.5, 1.3, 1.7, 2.2, -1, 0);

  for (let i = 0; i < 5; i++) f.pedestal(-23 + i * 2.6, -12.5, 0, ['bust', 'vase', 'statue', 'vase', 'bust'][i]);
  for (let i = 0; i < 3; i++) f.case(-24 + i * 4.8, -17.2, -21.4 + i * 4.8, -16.4);
  f.case(-22, -5, -19, -4); f.case(-16, -5, -13, -4);
  f.bench(-17.5, -7.4, 2.4, 0.6);
  f.artcrate(-25.4, -9, -24.6, -6.4, 0, 2.2); f.artcrate(-25.4, -5.8, -24.8, -3.6, 0, 1.8);
  f.shelf(-25.8, 2, -25.2, 17, 0, 4.2); f.shelf(-24, 17.2, -11, 17.8, 0, 4.2);
  for (const z of [6, 11, 15]) { f.table(-17, z, 2.6, 1.3); for (const dx of [-0.8, 0.8]) { f.chair(-17 + dx, z - 1.1, 0); f.chair(-17 + dx, z + 1.1, 2); } }
  f.rug(-17, 10.5, 9, 10.5);
  f.sofa(-12.2, 12.5, 1, 2.6, 0, 1); f.table(-13.8, 12.5, 0.7, 1.2, 0, 0.42);
  f.shelf(-24, 0.25, -19.5, 0.85, 0, 2.2); f.shelf(-14.5, 0.25, -10, 0.85, 0, 2.2);

  for (const [x0, x1] of [[11.5, 16.3], [19.7, 24.5]]) { f.table((x0 + x1) / 2, -9, x1 - x0, 1.6, 0, 0.78); for (let x = x0 + 0.5; x < x1 - 0.3; x += 1.1) for (const sz of [-1, 1]) f.chair(x, -9 + sz * 1.2, sz > 0 ? 2 : 0); }
  f.rug(18, -9, 15, 5.4);
  f.cabinet(24.9, -16, 25.7, -3, 0, 1.2); f.cabinet(11, -17.7, 23, -17.1, 0, 1.2);
  for (const x of [13, 17, 21]) f.vase(x, -17.4, 1.25, 0.5);
  k.box('Wood', 12, 0, 4, 24, 0.45, 14, { tint: [0.85, 0.83, 0.8] });
  k.box('Wood', 11.8, 0.45, 3.8, 24.2, 0.5, 4.0, { solid: false, deco: true, tint: W.dark });
  k.box('Wood', 20.5, 0.45, 10.5, 22.8, 1.45, 12.8, { tint: [0.35, 0.33, 0.32] }); k.box('Wood', 20.5, 1.45, 12.5, 22.8, 2.2, 12.8, { tint: [0.35, 0.33, 0.32], solid: false });
  for (const [x, z] of [[11, 4.8], [11, 13.4], [24.6, 4.8], [24.6, 13.4]]) f.column(x, z, 0, FH - 0.4, 0.32);
  f.sofa(17, 16.9, 3.2, 1, 0, 0); f.sofa(10.6, 16.2, 1, 2.4, 0, 1);
  f.artcrate(14, 6.5, 15.2, 7.4, 0.45, 1.3); f.artcrate(15.4, 6.5, 16.2, 7.4, 0.45, 0.9);
  f.barrier(12.6, 1.5, 16.4, 1.7); f.barrier(19.6, 1.5, 23.4, 1.7);

  const y1 = FH;
  for (const z of [-13, -6.5, 6.5, 13]) { f.shelf(-24, z - 0.3, -19.5, z + 0.3, y1, 2.4); f.shelf(-15.8, z - 0.3, -11.2, z + 0.3, y1, 2.4); }
  f.shelf(-25.8, -17, -25.2, -3, y1, 4.2); f.shelf(-25.8, 3, -25.2, 17, y1, 4.2);
  for (const z of [-9.8, 9.8]) { f.table(-17.5, z, 2.8, 1.2, y1); f.chair(-18.3, z - 0.95, 0, y1); f.chair(-16.7, z + 0.95, 2, y1); }
  f.rug(-17.5, -9.8, 6, 3.6, y1); f.rug(-17.5, 9.8, 6, 3.6, y1);
  f.sofa(-12, -2.6, 2.6, 0.9, y1, 0);
  for (const x of [14.2, 20.8]) { k.box('Walls', x - 0.15, y1, -5, x + 0.15, y1 + 3.4, 5, { base: y1, span: FH }); f.painting('PaintA', x + 0.16, -2.5, y1 + 1.3, 2.2, 1.5, 1, 0); f.painting('PaintC', x - 0.16, 2.5, y1 + 1.3, 2.2, 1.5, -1, 0); f.painting('PaintB', x - 0.16, -2.5, y1 + 1.1, 1.4, 1.9, -1, 0); f.painting('PaintB', x + 0.16, 2.5, y1 + 1.1, 1.4, 1.9, 1, 0); }
  for (const [x, m] of [[12.5, 'PaintC'], [17.5, 'PaintA'], [22.5, 'PaintB']]) { f.painting(m, x, -Z + 0.2, y1 + 1.4, 3, 2.2, 0, 1); f.painting(m === 'PaintB' ? 'PaintA' : 'PaintB', x, Z - 0.2, y1 + 1.4, 2.4, 2.6, 0, -1); }
  for (const z of [-9, 9]) f.bench(17.5, z, 3, 0.6, y1);
  f.scaffold(11.5, 15.5, 16.5, 17.5, y1, 2.2); f.artcrate(18, 16.4, 20.6, 17.2, y1, 2); f.crate(21.5, 16.5, y1, 1);
  for (let i = 0; i < 3; i++) f.case(11.5 + i * 4.6, -16.6, 14 + i * 4.6, -15.6, y1);
  for (const z of [-4, 4]) f.pedestal(-7.2, z, y1, 'bust');
  f.bench(7.2, 0, 0.6, 3, y1);

  const y2 = FH * 2;
  for (const [x, z, s] of [[-22, -14, 1.2], [-20.8, -14, 1.2], [-22, -12.8, 1.0], [-14, -12, 1.1], [-12.9, -12, 1.1], [-21, 12, 1.2], [-19.8, 12, 1.2], [-21, 13.2, 1.0], [14, -12, 1.1], [15.2, -12, 1.1], [14, -10.8, 1.0], [20, -14, 1.2], [21.2, -14, 1.2], [17, 12, 1.1], [18.2, 12, 1.1], [21, 7, 1.2], [22.2, 7, 1.0]]) f.crate(x, z, y2, s);
  f.crate(-22, -14, y2 + 1.2, 1.0); f.crate(14, -12, y2 + 1.1, 1.0); f.crate(17, 12, y2 + 1.1, 0.9); f.crate(21, 7, y2 + 1.2, 1.0);
  for (const [x0, z0, x1, z1] of [[-25.5, -4, -24.7, -1], [-25.5, 1, -24.7, 4], [24.7, -4, 25.5, -1], [24.7, 1, 25.5, 4], [-16, 16.4, -13, 17.2], [12, -17.2, 15, -16.4]]) f.artcrate(x0, z0, x1, z1, y2, 2.3);
  for (const [x, z] of [[-17, -6], [-13, 7], [17, -5], [13, 4], [19, 4]]) f.tarp(x, z, y2, 1.1, 1.1, 1.9);
  f.scaffold(-24, -17.5, -18, -15.5, y2, 2.4); f.scaffold(18, 15.5, 24, 17.5, y2, 2.4);
  f.barrier(-14, -1.6, -10.2, -1.4, y2); f.barrier(10.2, 1.4, 14, 1.6, y2);
  for (const z of [-14, 14]) f.pedestal(0, z, y2, 'statue');
  f.painting('PaintC', -X + 0.2, 0, y2 + 1.6, 3.2, 2.2, 1, 0); f.painting('PaintA', X - 0.2, 0, y2 + 1.6, 3.2, 2.2, -1, 0);

  const tex = {};
  for (const id of new Set(Object.values(k.mats).map((m) => m.tex).filter(Boolean))) tex[id] = await P[id]();
  return { kit: k, tex, seed: { x: 0, y: 0, z: 12 } };
}
