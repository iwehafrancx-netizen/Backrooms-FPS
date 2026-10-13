export const W = {
  wood: [0.62, 0.42, 0.24], dark: [0.34, 0.22, 0.13], white: [0.92, 0.9, 0.86], red: [0.62, 0.12, 0.14], green: [0.18, 0.42, 0.3], gold: [0.95, 0.76, 0.32],
  blue: [0.2, 0.3, 0.62], grey: [0.58, 0.58, 0.6], marble: [0.95, 0.94, 0.92], black: [0.12, 0.12, 0.14], cream: [0.9, 0.84, 0.7],
};

export function furniture(k) {
  const f = {};
  f.chair = (x, z, dir = 0, y = 0, tint = W.dark, seat = W.red) => {
    const s = 0.22, dx = dir === 1 ? -1 : dir === 3 ? 1 : 0, dz = dir === 0 ? 1 : dir === 2 ? -1 : 0;
    k.box('Wood', x - s, y + 0.42, z - s, x + s, y + 0.47, z + s, { tint, deco: true, solid: false });
    k.box('Furniture', x - s + 0.02, y + 0.47, z - s + 0.02, x + s - 0.02, y + 0.53, z + s - 0.02, { tint: seat, deco: true, solid: false });
    for (const [a, b] of [[-s, -s], [s - 0.05, -s], [-s, s - 0.05], [s - 0.05, s - 0.05]]) k.box('Wood', x + a, y, z + b, x + a + 0.05, y + 0.42, z + b + 0.05, { tint, deco: true, solid: false });
    if (dz) k.box('Wood', x - s, y + 0.5, z - dz * s - (dz < 0 ? 0.05 : 0), x + s, y + 1.0, z - dz * s + (dz < 0 ? 0 : 0.05), { tint, deco: true, solid: false });
    else k.box('Wood', x - dx * s - (dx < 0 ? 0.05 : 0), y + 0.5, z - s, x - dx * s + (dx < 0 ? 0 : 0.05), y + 1.0, z + s, { tint, deco: true, solid: false });
  };
  f.table = (cx, cz, w, d, y = 0, h = 0.76, tint = W.wood) => {
    k.box('Wood', cx - w / 2, y + h - 0.07, cz - d / 2, cx + w / 2, y + h, cz + d / 2, { tint, solid: false, deco: true });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box('Wood', cx + sx * (w / 2 - 0.12) - 0.05, y, cz + sz * (d / 2 - 0.12) - 0.05, cx + sx * (w / 2 - 0.12) + 0.05, y + h - 0.07, cz + sz * (d / 2 - 0.12) + 0.05, { tint: W.dark, solid: false, deco: true });
  };
  f.sofa = (cx, cz, w, d, y = 0, tint = W.red, dir = 0) => {
    k.box('Furniture', cx - w / 2, y, cz - d / 2, cx + w / 2, y + 0.45, cz + d / 2, { tint, noBottom: true });
    const back = 0.22, ex = dir % 2 === 0;
    if (ex) k.box('Furniture', cx - w / 2, y + 0.45, dir === 0 ? cz + d / 2 - back : cz - d / 2, cx + w / 2, y + 0.95, dir === 0 ? cz + d / 2 : cz - d / 2 + back, { tint, noBottom: true, solid: false });
    else k.box('Furniture', dir === 1 ? cx - w / 2 : cx + w / 2 - back, y + 0.45, cz - d / 2, dir === 1 ? cx - w / 2 + back : cx + w / 2, y + 0.95, cz + d / 2, { tint, noBottom: true, solid: false });
  };
  f.shelf = (x0, z0, x1, z1, y = 0, h = 2.6) => k.box('Books', x0, y, z0, x1, y + h, z1, { noBottom: y > 0 });
  f.cabinet = (x0, z0, x1, z1, y = 0, h = 1.2, tint = W.dark) => k.box('Wood', x0, y, z0, x1, y + h, z1, { tint, noBottom: y > 0 });
  f.pedestal = (x, z, y = 0, statue = true, r = 0.42) => {
    k.box('Marble', x - 0.5, y, z - 0.5, x + 0.5, y + 1.1, z + 0.5, { tint: W.marble, noBottom: y > 0 });
    if (statue) { k.cylinder('Marble', x, z, r * 0.8, y + 1.1, y + 2.3, W.marble, 8); k.cylinder('Marble', x, z, r * 0.45, y + 2.3, y + 2.9, W.marble, 8); }
  };
  f.case = (x0, z0, x1, z1, y = 0) => { k.box('Cases', x0, y, z0, x1, y + 1.15, z1, { noBottom: y > 0 }); k.box('Marble', x0 - 0.05, y, z0 - 0.05, x1 + 0.05, y + 0.12, z1 + 0.05, { tint: W.dark, solid: false }); };
  f.rug = (cx, cz, w, d, y = 0, mat = 'Rug') => k.box(mat, cx - w / 2, y, cz - d / 2, cx + w / 2, y + 0.014, cz + d / 2, { tint: [1, 1, 1], solid: false, skip: ['x+', 'x-', 'z+', 'z-', 'bot'], flat: false, deco: true });
  f.painting = (m, x, z, y, w, h, nx, nz) => {
    const c = [0.95, 0.95, 0.95], hw = w / 2;
    const p = nz !== 0 ? (nz > 0 ? [[x - hw, y + h, z], [x - hw, y, z], [x + hw, y, z], [x + hw, y + h, z]] : [[x + hw, y + h, z], [x + hw, y, z], [x - hw, y, z], [x - hw, y + h, z]])
      : (nx > 0 ? [[x, y + h, z + hw], [x, y, z + hw], [x, y, z - hw], [x, y + h, z - hw]] : [[x, y + h, z - hw], [x, y, z - hw], [x, y, z + hw], [x, y + h, z + hw]]);
    k.quad(m, ...p, [[0, 0], [0, 1], [1, 1], [1, 0]], [c, c, c, c]);
  };
  f.column = (x, z, y0, y1, r = 0.55) => { k.cylinder('Marble', x, z, r + 0.15, y0, y0 + 0.4, W.marble, 12); k.cylinder('Marble', x, z, r, y0 + 0.4, y1 - 0.4, W.marble, 12); k.cylinder('Marble', x, z, r + 0.15, y1 - 0.4, y1, W.marble, 12); };
  f.crate = (x, z, y = 0, s = 0.9) => k.box('Crates', x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, { noBottom: y > 0 });
  f.bed = (cx, cz, y, tint) => { k.box('Furniture', cx - 1, y, cz - 1.1, cx + 1, y + 0.5, cz + 1.1, { tint: W.white, noBottom: true }); k.box('Furniture', cx - 1.02, y + 0.5, cz - 0.2, cx + 1.02, y + 0.58, cz + 1.12, { tint, solid: false, deco: true }); k.box('Wood', cx - 1.05, y, cz - 1.2, cx + 1.05, y + 1.3, cz - 1.1, { tint: W.dark, solid: false, deco: true }); };
  return f;
}
