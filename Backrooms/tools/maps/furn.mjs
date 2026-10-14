export const W = {
  wood: [1, 1, 1], dark: [0.72, 0.7, 0.68], white: [0.95, 0.94, 0.92], red: [0.62, 0.12, 0.14], green: [0.18, 0.42, 0.3], gold: [0.95, 0.76, 0.32],
  blue: [0.2, 0.3, 0.62], grey: [0.58, 0.58, 0.6], marble: [1, 1, 1], black: [0.12, 0.12, 0.14], cream: [0.9, 0.84, 0.7], n: [1, 1, 1],
};

const D = { deco: true, solid: false };
const TARP = [0.46, 0.44, 0.41];

export function furniture(k) {
  const f = {};
  f.chair = (x, z, dir = 0, y = 0) => {
    const s = 0.23, dx = dir === 1 ? -1 : dir === 3 ? 1 : 0, dz = dir === 0 ? 1 : dir === 2 ? -1 : 0;
    k.box('Wood', x - s, y + 0.4, z - s, x + s, y + 0.45, z + s, D);
    k.box('Leather', x - s + 0.02, y + 0.45, z - s + 0.02, x + s - 0.02, y + 0.52, z + s - 0.02, D);
    for (const [a, b] of [[-s, -s], [s - 0.045, -s], [-s, s - 0.045], [s - 0.045, s - 0.045]]) k.box('Wood', x + a, y, z + b, x + a + 0.045, y + 0.4, z + b + 0.045, D);
    if (dz) { const zb = z - dz * s; k.box('Wood', x - s, y + 0.45, Math.min(zb, zb - dz * 0.05), x + s, y + 1.02, Math.max(zb, zb - dz * 0.05), D); k.box('Leather', x - s + 0.04, y + 0.55, Math.min(zb, zb + dz * 0.03), x + s - 0.04, y + 0.95, Math.max(zb, zb + dz * 0.03), D); }
    else { const xb = x - dx * s; k.box('Wood', Math.min(xb, xb - dx * 0.05), y + 0.45, z - s, Math.max(xb, xb - dx * 0.05), y + 1.02, z + s, D); k.box('Leather', Math.min(xb, xb + dx * 0.03), y + 0.55, z - s + 0.04, Math.max(xb, xb + dx * 0.03), y + 0.95, z + s - 0.04, D); }
  };
  f.table = (cx, cz, w, d, y = 0, h = 0.76) => {
    k.box('Wood', cx - w / 2, y + h - 0.06, cz - d / 2, cx + w / 2, y + h, cz + d / 2, D);
    k.box('Wood', cx - w / 2 + 0.06, y + h - 0.16, cz - d / 2 + 0.06, cx + w / 2 - 0.06, y + h - 0.06, cz + d / 2 - 0.06, { ...D, tint: W.dark });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.lathe('Wood', cx + sx * (w / 2 - 0.13), cz + sz * (d / 2 - 0.13), [[0.04, y], [0.05, y + 0.1], [0.035, y + 0.3], [0.055, y + 0.45], [0.04, y + h - 0.16]], W.dark, 6, { solid: false });
  };
  f.sofa = (cx, cz, w, d, y = 0, dir = 0) => {
    k.box('Wood', cx - w / 2, y, cz - d / 2, cx + w / 2, y + 0.12, cz + d / 2, { tint: W.dark, noBottom: true });
    k.box('Leather', cx - w / 2 + 0.05, y + 0.12, cz - d / 2 + 0.05, cx + w / 2 - 0.05, y + 0.46, cz + d / 2 - 0.05, { noBottom: true, solid: false });
    const back = 0.24, ex = dir % 2 === 0;
    if (ex) { const z0 = dir === 0 ? cz + d / 2 - back : cz - d / 2, z1 = z0 + back; k.box('Leather', cx - w / 2, y + 0.12, z0, cx + w / 2, y + 0.92, z1, D); for (const sx of [-1, 1]) k.box('Leather', sx < 0 ? cx - w / 2 : cx + w / 2 - 0.2, y + 0.12, cz - d / 2, sx < 0 ? cx - w / 2 + 0.2 : cx + w / 2, y + 0.66, cz + d / 2, D); }
    else { const x0 = dir === 1 ? cx - w / 2 : cx + w / 2 - back; k.box('Leather', x0, y + 0.12, cz - d / 2, x0 + back, y + 0.92, cz + d / 2, D); for (const sz of [-1, 1]) k.box('Leather', cx - w / 2, y + 0.12, sz < 0 ? cz - d / 2 : cz + d / 2 - 0.2, cx + w / 2, y + 0.66, sz < 0 ? cz - d / 2 + 0.2 : cz + d / 2, D); }
  };
  f.bench = (cx, cz, w, d, y = 0) => {
    k.box('Leather', cx - w / 2, y + 0.38, cz - d / 2, cx + w / 2, y + 0.48, cz + d / 2, { ...D, noBottom: true });
    k.box('Wood', cx - w / 2 + 0.05, y + 0.3, cz - d / 2 + 0.05, cx + w / 2 - 0.05, y + 0.38, cz + d / 2 - 0.05, D);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box('Wood', cx + sx * (w / 2 - 0.1) - 0.04, y, cz + sz * (d / 2 - 0.1) - 0.04, cx + sx * (w / 2 - 0.1) + 0.04, y + 0.3, cz + sz * (d / 2 - 0.1) + 0.04, D);
  };
  f.shelf = (x0, z0, x1, z1, y = 0, h = 2.6) => {
    k.box('Books', x0, y, z0, x1, y + h, z1, { noBottom: y > 0 });
    k.box('Wood', x0 - 0.04, y + h, z0 - 0.04, x1 + 0.04, y + h + 0.12, z1 + 0.04, D);
    k.box('Wood', x0 - 0.03, y, z0 - 0.03, x1 + 0.03, y + 0.12, z1 + 0.03, D);
  };
  f.cabinet = (x0, z0, x1, z1, y = 0, h = 1.2) => { k.box('Wood', x0, y, z0, x1, y + h, z1, { noBottom: y > 0 }); k.box('Wood', x0 - 0.03, y + h, z0 - 0.03, x1 + 0.03, y + h + 0.05, z1 + 0.03, { ...D, tint: W.dark }); };
  f.vase = (x, z, y, s = 1) => k.lathe('Statue', x, z, [[0, y], [0.16 * s, y], [0.2 * s, y + 0.05 * s], [0.14 * s, y + 0.12 * s], [0.28 * s, y + 0.38 * s], [0.34 * s, y + 0.6 * s], [0.26 * s, y + 0.86 * s], [0.12 * s, y + 1.0 * s], [0.11 * s, y + 1.1 * s], [0.18 * s, y + 1.16 * s], [0.15 * s, y + 1.2 * s]], W.marble, 14, { solid: false });
  f.bust = (x, z, y) => k.lathe('Statue', x, z, [[0, y], [0.3, y], [0.3, y + 0.06], [0.2, y + 0.12], [0.36, y + 0.32], [0.38, y + 0.46], [0.16, y + 0.56], [0.1, y + 0.64], [0.14, y + 0.7], [0.15, y + 0.82], [0.13, y + 0.92], [0.06, y + 0.98], [0, y + 1.0]], W.marble, 14, { solid: false });
  f.statue = (x, z, y) => {
    k.lathe('Statue', x, z, [[0, y], [0.38, y], [0.38, y + 0.1], [0.26, y + 0.14], [0.2, y + 0.6], [0.24, y + 0.95], [0.3, y + 1.3], [0.28, y + 1.5], [0.12, y + 1.6], [0.09, y + 1.68], [0.12, y + 1.75], [0.12, y + 1.88], [0.06, y + 1.95], [0, y + 1.97]], W.marble, 14, { solid: false });
  };
  f.pedestal = (x, z, y = 0, top = 'statue') => {
    k.box('Stone', x - 0.55, y, z - 0.55, x + 0.55, y + 0.12, z + 0.55, { noBottom: y > 0 });
    k.box('Stone', x - 0.45, y + 0.12, z - 0.45, x + 0.45, y + 1.0, z + 0.45, { noBottom: true, solid: false });
    k.box('Stone', x - 0.52, y + 1.0, z - 0.52, x + 0.52, y + 1.1, z + 0.52, { noBottom: true, solid: false });
    if (top === 'statue') f.statue(x, z, y + 1.1); else if (top === 'bust') f.bust(x, z, y + 1.1); else if (top === 'vase') f.vase(x, z, y + 1.1, 0.8);
  };
  f.case = (x0, z0, x1, z1, y = 0) => {
    k.box('Wood', x0, y, z0, x1, y + 0.85, z1, { noBottom: y > 0 });
    k.box('Cases', x0 + 0.03, y + 0.85, z0 + 0.03, x1 - 0.03, y + 1.35, z1 - 0.03, { noBottom: true, solid: false });
    for (const [a, b, c, d] of [[x0, z0, x1, z0 + 0.04], [x0, z1 - 0.04, x1, z1], [x0, z0, x0 + 0.04, z1], [x1 - 0.04, z0, x1, z1]]) k.box('Brass', a, y + 1.35, b, c, y + 1.39, d, D);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    k.lathe('Brass', cx, cz, [[0, y + 0.85], [0.12, y + 0.85], [0.08, y + 0.95], [0.11, y + 1.08], [0.05, y + 1.16], [0, y + 1.17]], [0.9, 0.85, 0.8], 8, { solid: false });
  };
  f.rug = (cx, cz, w, d, y = 0, mat = 'Rug') => k.box(mat, cx - w / 2, y, cz - d / 2, cx + w / 2, y + 0.03, cz + d / 2, { tint: [0.92, 0.92, 0.92], solid: false, skip: ['x+', 'x-', 'z+', 'z-', 'bot'], deco: true });
  f.painting = (m, x, z, y, w, h, nx, nz) => {
    const c = [0.92, 0.92, 0.92], hw = w / 2, d = 0.06;
    const p = nz !== 0 ? (nz > 0 ? [[x - hw, y + h, z], [x - hw, y, z], [x + hw, y, z], [x + hw, y + h, z]] : [[x + hw, y + h, z], [x + hw, y, z], [x - hw, y, z], [x - hw, y + h, z]])
      : (nx > 0 ? [[x, y + h, z + hw], [x, y, z + hw], [x, y, z - hw], [x, y + h, z - hw]] : [[x, y + h, z - hw], [x, y, z - hw], [x, y, z + hw], [x, y + h, z + hw]]);
    const L = p.map(([px, py, pz]) => k.light(px, py, pz));
    const lifted = p.map(([px, py, pz]) => [px + nx * d, py, pz + nz * d]);
    k.quad(m, ...lifted, [[0, 0], [0, 1], [1, 1], [1, 0]], L.map((l) => c.map((v, i) => v * Math.min(1, l[i] * 1.1))));
    if (m === 'Glass') return;
    const e = d - 0.015;
    if (nz !== 0) k.box('Brass', x - hw, y, Math.min(z, z + nz * e), x + hw, y + h, Math.max(z, z + nz * e), { ...D, tint: [0.55, 0.5, 0.45] });
    else k.box('Brass', Math.min(x, x + nx * e), y, z - hw, Math.max(x, x + nx * e), y + h, z + hw, { ...D, tint: [0.55, 0.5, 0.45] });
  };
  f.column = (x, z, y0, y1, r = 0.5) => {
    k.box('Stone', x - r - 0.18, y0, z - r - 0.18, x + r + 0.18, y0 + 0.3, z + r + 0.18, { noBottom: y0 > 0 });
    const h = y1 - y0, sh = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; sh.push([r * (1 - 0.1 * t * t), y0 + 0.62 + (h - 1.42) * t]); }
    k.lathe('Stone', x, z, [[r + 0.16, y0 + 0.3], [r + 0.16, y0 + 0.4], [r + 0.08, y0 + 0.48], [r + 0.1, y0 + 0.55], [r, y0 + 0.62], ...sh, [r * 0.95, y1 - 0.72], [r * 1.05, y1 - 0.66], [r * 1.25, y1 - 0.4], [r * 1.4, y1 - 0.3]], W.n, 16, { solid: false, vscale: 3 });
    k.box('Stone', x - r * 1.45, y1 - 0.3, z - r * 1.45, x + r * 1.45, y1, z + r * 1.45, { noBottom: true, solid: false });
    k.footprints.push([x - r - 0.18, z - r - 0.18, x + r + 0.18, z + r + 0.18]);
  };
  f.crate = (x, z, y = 0, s = 0.9, h = s) => k.box('Crates', x - s / 2, y, z - s / 2, x + s / 2, y + h, z + s / 2, { noBottom: y > 0 });
  f.artcrate = (x0, z0, x1, z1, y, h) => k.box('Crates', x0, y, z0, x1, y + h, z1, { noBottom: y > 0 });
  f.chandelier = (x, z, ceil, drop = 1.4, r = 0.8) => {
    const y = ceil - drop;
    k.box('Brass', x - 0.025, y + 0.4, z - 0.025, x + 0.025, ceil, z + 0.025, D);
    k.lathe('Brass', x, z, [[0, y - 0.35], [0.07, y - 0.25], [0.11, y - 0.05], [0.07, y + 0.1], [0.1, y + 0.25], [0.04, y + 0.4], [0, y + 0.45]], [0.95, 0.9, 0.85], 10, { solid: false });
    k.lathe('Brass', x, z, [[r - 0.035, y + 0.02], [r + 0.035, y + 0.02], [r + 0.035, y + 0.07], [r - 0.035, y + 0.07], [r - 0.035, y + 0.02]], [0.95, 0.9, 0.85], 16, { solid: false });
    for (const [dx, dz] of [[1, 0], [0, 1]]) k.box('Brass', x - dx * r - 0.015, y + 0.03, z - dz * r - 0.015, x + dx * r + 0.015, y + 0.06, z + dz * r + 0.015, D);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, bx = x + Math.cos(a) * r * 0.92, bz = z + Math.sin(a) * r * 0.92; k.box('light', bx - 0.05, y + 0.08, bz - 0.05, bx + 0.05, y + 0.24, bz + 0.05, { flat: true, solid: false }); }
    k.lamps.push({ x, y: y - 0.2, z, k: 0.78, r: 20, c: [1, 0.78, 0.52] });
  };
  f.sconce = (x, y, z, nx, nz) => {
    k.box('Brass', x - 0.06 + nx * 0.02, y - 0.12, z - 0.06 + nz * 0.02, x + 0.06 + nx * 0.06, y + 0.06, z + 0.06 + nz * 0.06, D);
    k.box('light', x - 0.045 + nx * 0.12, y + 0.06, z - 0.045 + nz * 0.12, x + 0.045 + nx * 0.12, y + 0.18, z + 0.045 + nz * 0.12, { flat: true, solid: false });
    k.lamps.push({ x: x + nx * 0.4, y: y + 0.2, z: z + nz * 0.4, k: 0.34, r: 7, c: [1, 0.76, 0.48] });
  };
  f.stanchions = (pts, y = 0) => {
    for (const [x, z] of pts) k.lathe('Brass', x, z, [[0.15, y], [0.16, y + 0.03], [0.03, y + 0.06], [0.025, y + 0.9], [0.05, y + 0.95], [0, y + 1.0]], [0.95, 0.9, 0.85], 8, { solid: false });
    for (let i = 0; i < pts.length - 1; i++) { const [a, b] = pts[i], [c, d] = pts[i + 1]; k.box('Curtain', Math.min(a, c) - 0.02, y + 0.78, Math.min(b, d) - 0.02, Math.max(a, c) + 0.02, y + 0.84, Math.max(b, d) + 0.02, D); }
  };
  f.scaffold = (x0, z0, x1, z1, y, h) => {
    for (const x of [x0, (x0 + x1) / 2, x1]) for (const z of [z0, z1]) k.box('Steel', x - 0.03, y, z - 0.03, x + 0.03, y + h + 1, z + 0.03, D);
    for (const yy of [y + 1.1, y + h + 0.9]) { k.box('Steel', x0, yy, z0 - 0.03, x1, yy + 0.05, z0 + 0.03, D); k.box('Steel', x0, yy, z1 - 0.03, x1, yy + 0.05, z1 + 0.03, D); }
    k.box('Scaffold', x0 - 0.1, y + h, z0 - 0.1, x1 + 0.1, y + h + 0.06, z1 + 0.1, { solid: false });
    for (let x = x0; x < x1 - 0.1; x += (x1 - x0) / 2) k.box('Steel', x, y + 0.3, z0 - 0.02, x + (x1 - x0) / 2, y + 0.34, z0 + 0.02, D);
  };
  f.barrier = (x0, z0, x1, z1, y = 0) => {
    k.box('Barrier', x0, y + 0.55, z0, x1, y + 0.85, z1, { solid: false });
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    for (const t of [0.1, 0.9]) { const x = along ? x0 + (x1 - x0) * t : (x0 + x1) / 2, z = along ? (z0 + z1) / 2 : z0 + (z1 - z0) * t; k.box('Steel', x - 0.03, y, z - 0.25, x + 0.03, y + 0.55, z + 0.25, D); }
  };
  f.tarp = (x, z, y, w, d, h) => k.lathe('Tarp', x, z, [[w * 0.62, y], [w * 0.66, y + h * 0.3], [w * 0.55, y + h * 0.75], [w * 0.3, y + h * 0.95], [0, y + h]], TARP, 7, { solid: y < 1 });
  return f;
}
