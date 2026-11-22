// Small toolkit for writing levels in code instead of counting characters.
//
//   const g = new Grid(24, 17);
//   g.fill(2, 2, 9, 5, '.');            // floor of a room (cells, inclusive)
//   g.outline(1, 1, 20, 13, 'X');       // outside walls
//   g.hline(2, 19, 6); g.vline(10, 2, 5); g.set(5, 6, 'D');
//   map: g.rows()
//
// and for furniture:
//   const A = room(2, 2, 9, 5);          // interior of the room drawn above
//   onWall('wardrobe', A, 'n', 4.5)      // back against the north wall, centred at x = 4.5
// Every model's back is +Z and its front -Z, so "against the north wall" means
// rotated half a turn, and so on. DEPTH is how far each piece sticks out of the wall.

export class Grid {
  constructor(w, h, fill = ' ') { this.w = w; this.h = h; this.c = Array.from({ length: h }, () => Array(w).fill(fill)); }
  set(x, z, ch) { if (z >= 0 && z < this.h && x >= 0 && x < this.w) this.c[z][x] = ch; return this; }
  fill(x0, z0, x1, z1, ch) { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.set(x, z, ch); return this; }
  hline(x0, x1, z, ch = '#') { for (let x = x0; x <= x1; x++) this.set(x, z, ch); return this; }
  vline(x, z0, z1, ch = '#') { for (let z = z0; z <= z1; z++) this.set(x, z, ch); return this; }
  outline(x0, z0, x1, z1, ch = 'X') { this.hline(x0, x1, z0, ch).hline(x0, x1, z1, ch).vline(x0, z0, z1, ch).vline(x1, z0, z1, ch); return this; }
  rows() { return this.c.map((r) => r.join('')); }
}

// Interior of a room whose floor cells are x0..x1, z0..z1 (walls on the cells around it).
// L/R/T/B are the inside faces of the walls in metres.
export function room(x0, z0, x1, z1) {
  return { x0, z0, x1, z1, L: x0 - 0.4, R: x1 + 1.4, T: z0 - 0.4, B: z1 + 1.4, cx: (x0 + x1 + 1) / 2, cz: (z0 + z1 + 1) / 2 };
}

// back-to-wall depth of each model (metres from the wall to its centre * 2)
const DEPTH = {
  wardrobe: 0.6, bookshelf: 0.32, kitchen_counter: 0.64, fridge: 0.66, tv_cabinet: 0.4, desk: 0.7,
  bed_double: 2.16, bed_single: 2.04, sofa: 0.9, armchair: 0.84, toilet: 0.62, sink: 0.52, safe: 0.64, fuse_box: 0.24,
  side_table_lamp: 0.5, painting_a: 0.1, painting_b: 0.1, security_camera: 0.1,
};
const TURN = { n: 2, s: 0, w: 3, e: 1 };

// Furniture with its back against a wall of `rm`, centred `along` that wall.
export function onWall(t, rm, side, along, extra = {}) {
  const d = (DEPTH[t] ?? 0.6) / 2;
  const pos = side === 'n' ? { x: along, z: rm.T + d } : side === 's' ? { x: along, z: rm.B - d } : side === 'w' ? { x: rm.L + d, z: along } : { x: rm.R - d, z: along };
  return { t, ...pos, r: TURN[side], ...extra };
}

// Four chairs around a dining table centred at (x, z).
export function diningSet(x, z) {
  return [
    { t: 'table_dining', x, z },
    { t: 'chair', x: x - 0.6, z: z - 0.82, r: 2 }, { t: 'chair', x: x + 0.6, z: z - 0.82, r: 2 },
    { t: 'chair', x: x - 0.6, z: z + 0.82 }, { t: 'chair', x: x + 0.6, z: z + 0.82 },
  ];
}

// Road along the south edge with a pavement above it; returns the van and the
// spot next to its door where the thief has to stand to escape.
export function street(g, zPave) {
  g.hline(0, g.w - 1, zPave, '=');
  for (let z = zPave + 1; z < g.h; z++) g.hline(0, g.w - 1, z, '~');
}
export function van(x, zPave) { return { exit: [x, zPave + 1.95, 1], exitDoor: [x, zPave + 0.5] }; }
