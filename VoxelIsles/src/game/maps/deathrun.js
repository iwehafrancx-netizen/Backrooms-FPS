import { World } from '../../engine/world.js';
import { rng, STYLES, MAPBLOCK } from './common.js';

const PLAN = ['run', 'dropfloor', 'gaps', 'lava', 'beam', 'door', 'stairs', 'pillars', 'gaps', 'dropfloor', 'bounce', 'lava', 'run', 'beam', 'door', 'stairs', 'pillars', 'gaps', 'dropfloor', 'beam', 'bounce', 'lava', 'run', 'door', 'pillars', 'gaps', 'lava'];

export function buildDeathRun(seed, opt = {}) {
  const S = STYLES[opt.style || 'castle'], r = rng(seed);
  const w = new World(336, 64, 40), TOP = 30, LANE = TOP + 5;
  const set = (x, y, z, id) => w.set(x, y, z, id, id ? MAPBLOCK : 0, true);
  const box = (x0, y0, z0, x1, y1, z1, id) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) set(x, y, z, id); };
  const route = [], traps = [];
  const node = (x, y, z = 0, o = {}) => route.push({ x, y, z, ...o });
  const floorRow = (x, y = TOP, id = S.floor) => { for (let z = -3; z <= 3; z++) set(x, y, z, Math.abs(z) === 3 ? S.trim : id); set(x, y - 1, 0, S.wall); };
  const rails = (x0, x1, y = TOP) => { for (let x = x0; x <= x1; x++) for (const z of [-4, 4]) { set(x, y, z, S.wall); set(x, y + 1, z, x % 3 === 0 ? S.wall2 : S.wall); } };
  const startX = -160;
  box(startX - 6, TOP, -4, startX + 2, TOP, 4, S.floor);
  box(startX - 7, TOP + 1, -5, startX + 3, TOP + 4, -5, S.wall); box(startX - 7, TOP + 1, 5, startX + 3, TOP + 4, 5, S.wall);
  box(startX - 7, TOP + 1, -5, startX - 7, TOP + 4, 5, S.wall); box(startX - 7, TOP + 5, -5, startX + 3, TOP + 5, 5, S.floor);
  box(startX + 3, TOP + 1, -4, startX + 3, TOP + 3, 4, 12);
  const gate = []; for (let z = -4; z <= 4; z++) for (let y = TOP + 1; y <= TOP + 3; y++) gate.push([startX + 3, y, z]);
  const runnerSpawns = [];
  for (let i = 0; i < 8; i++) runnerSpawns.push({ x: startX - 4 + (i % 4) * 1.6 + 0.5, y: TOP + 1, z: -2.5 + Math.floor(i / 4) * 4 + 0.5, yaw: -Math.PI / 2 });
  let x = startX + 3, y = TOP;
  for (let k = startX + 3; k < startX + 6; k++) floorRow(k);
  node(startX + 5, TOP + 1);
  x = startX + 6;
  for (const kind of PLAN) {
    const x0 = x;
    if (kind === 'run') { for (let i = 0; i < 6; i++) floorRow(x + i, y); rails(x, x + 5, y + 1); node(x + 5, y + 1); x += 6; }
    else if (kind === 'gaps') {
      for (let t = 0; t < 4; t++) { floorRow(x, y); floorRow(x + 1, y); node(x + 1, y + 1, 0, { jump: t > 0 }); x += t < 3 ? 4 : 2; }
      floorRow(x, y); floorRow(x + 1, y); node(x + 1, y + 1, 0, { jump: true }); x += 2;
    } else if (kind === 'beam') {
      floorRow(x, y); x += 1;
      const L = 10, gap = 3 + Math.floor(r() * 4);
      for (let i = 0; i < L; i++) { if (i !== gap) { set(x + i, y, 0, S.trim); set(x + i, y - 1, 0, S.wall); } }
      for (let i = 0; i < L; i += 1) if (i !== gap) node(x + i, y + 1, 0, { tight: true, jump: i === gap + 1 });
      x += L; floorRow(x, y); node(x, y + 1); x += 1;
    } else if (kind === 'stairs') {
      for (let i = 0; i < 3; i++) { floorRow(x, y); node(x, y + 1); x++; y++; }
      for (let i = 0; i < 3; i++) { floorRow(x, y); x++; }
      node(x - 1, y + 1);
      for (let i = 0; i < 3; i++) { y--; floorRow(x, y); x++; }
      node(x - 1, y + 1);
    } else if (kind === 'bounce') {
      floorRow(x, y); floorRow(x + 1, y); for (let z = -1; z <= 1; z++) set(x + 1, y, z, 61); node(x - 1, y + 1);
      x += 5; y += 1;
      for (let i = 0; i < 4; i++) floorRow(x + i, y);
      node(x + 2, y + 1, 0, { jump: true }); x += 4;
      for (let i = 0; i < 2; i++) floorRow(x + i, y); x += 2;
      y -= 1; floorRow(x, y); node(x, y + 1); x += 1;
    } else {
      const trap = { i: traps.length, kind, x0, cells: [], active: 0, cd: 0 };
      if (kind === 'dropfloor') {
        const odd = r() < 0.5 ? 1 : 0; for (let i = 0; i < 8; i++) for (let z = -3; z <= 3; z++) { set(x + i, y, z, 63); if ((i + odd) % 2 === 0) trap.cells.push([x + i, y, z, 63]); }
        rails(x, x + 7, y + 1);
        node(x + 4, y + 1); x += 8; floorRow(x, y); node(x, y + 1); x += 1;
      } else if (kind === 'lava') {
        for (let i = 0; i < 9; i++) { floorRow(x + i, y); for (let z = -2; z <= 2; z++) if ((i + Math.floor(r() * 2)) % 3 !== 1) trap.cells.push([x + i, y, z, S.floor]); }
        rails(x, x + 8, y + 1);
        node(x + 4, y + 1); node(x + 8, y + 1); x += 9;
      } else if (kind === 'door') {
        for (let i = 0; i < 5; i++) floorRow(x + i, y);
        rails(x, x + 4, y + 1);
        const dz = Math.floor(r() * 3) - 1;
        for (let z = -3; z <= 3; z++) for (let yy = y + 1; yy <= y + 3; yy++) { if (Math.abs(z - dz) <= 1) trap.cells.push([x + 2, yy, z, 0]); else set(x + 2, yy, z, S.wall); }
        for (let z = -3; z <= 3; z++) set(x + 2, y + 4, z, S.wall2);
        node(x + 1, y + 1, dz); node(x + 3, y + 1, dz); node(x + 4, y + 1); x += 5;
      } else if (kind === 'pillars') {
        floorRow(x, y); x += 1;
        for (let p = 0; p < 4; p++) {
          const pz = p % 2 ? 1 : -1;
          x += 1;
          for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { set(x + a, y, pz + b - 1, S.wall2); if (p % 2 === (seed % 2)) trap.cells.push([x + a, y, pz + b - 1, S.wall2]); for (let yy = y - 1; yy > y - 5; yy--) set(x + a, yy, pz + b - 1, S.wall); }
          node(x, y + 1, pz > 0 ? 0 : -1, { jump: true }); x += 2;
        }
        x += 1; floorRow(x, y); floorRow(x + 1, y); node(x + 1, y + 1, 0, { jump: true }); x += 2;
      }
      trap.x1 = x - 1;
      const bx = Math.round((trap.x0 + trap.x1) / 2);
      trap.button = { x: bx, y: LANE + 1, z: -8 };
      traps.push(trap);
    }
    if (x - x0 > 0) { const mx = Math.round((x0 + x - 1) / 2); for (const z of [-5, 5]) if (r() < 0.6 && !w.get(mx, y + 1, z)) { set(mx, y - 2, z, S.wall); set(mx, y + 1, z, S.light); } }
  }
  for (let i = 0; i < 8; i++) floorRow(x + i, y);
  for (let z = -2; z <= 2; z++) set(x + 3, y + 1, z, 59);
  box(x + 7, y + 1, -4, x + 7, y + 4, 4, S.wall);
  for (let z = -4; z <= 4; z++) set(x + 7, y + 5, z, z % 2 ? 14 : S.trim);
  node(x + 5, y + 1);
  const finish = { x: x + 3, y: y + 1, x1: x + 3 };
  const laneX0 = startX - 2, laneX1 = x + 6;
  box(laneX0, LANE, -10, laneX1, LANE, -6, S.floor);
  box(laneX0, LANE - 1, -8, laneX1, LANE - 1, -8, S.wall);
  for (let lx = laneX0; lx <= laneX1; lx++) { set(lx, LANE + 1, -10, S.wall); set(lx, LANE + 2, -10, lx % 4 ? S.wall : S.light); set(lx, LANE + 1, -6, 54); set(lx, LANE + 2, -6, 54); set(lx, LANE + 3, -6, S.wall); set(lx, LANE + 3, -10, S.wall); if (lx % 8 === 0) for (let yy = TOP - 6; yy < LANE - 1; yy++) set(lx, yy, -8, S.pillar); }
  for (const z of [-9, -8, -7]) { set(laneX0, LANE + 1, z, S.wall); set(laneX1, LANE + 1, z, S.wall); }
  for (const tr of traps) { set(tr.button.x, LANE, -8, S.wall2); set(tr.button.x, LANE + 1, tr.button.z, 60); }
  const deathSpawn = { x: laneX0 + 2.5, y: LANE + 1, z: -7.5, yaw: -Math.PI / 2 };
  return { world: w, theme: opt.theme || 'meadow', top: TOP, voidY: TOP - 10, center: { x: 0, y: TOP + 1, z: 0 }, radius: 170, chests: [], spawns: runnerSpawns, runnerSpawns, deathSpawn, traps, route, finish, gate, lane: { y: LANE + 1, z: -8, x0: laneX0 + 1, x1: laneX1 - 1 } };
}
