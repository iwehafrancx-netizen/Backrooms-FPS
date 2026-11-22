// Grid A* over the level's walkable cells (8 directions, no corner cutting),
// followed by string pulling so characters walk in straight lines across open
// rooms instead of zig-zagging from cell to cell.
import * as THREE from 'three';

const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

// Returns an array of Vector3 waypoints (world space, y = 0) or null.
export function findPath(level, from, to, { maxNodes = 6000 } = {}) {
  const W = level.w, H = level.h;
  let sx = Math.floor(from.x), sz = Math.floor(from.z), tx = Math.floor(to.x), tz = Math.floor(to.z);
  if (!level.inside(tx, tz)) return null;
  // standing next to furniture can put us "inside" a blocked cell: start from the nearest free one
  if (!level.walkable(sx, sz)) [sx, sz] = nearestFree(level, sx, sz) || [sx, sz];
  if (!level.walkable(tx, tz)) { const f = nearestFree(level, tx, tz); if (!f) return null; [tx, tz] = f; }
  const start = sz * W + sx, goal = tz * W + tx;
  const g = new Float32Array(W * H).fill(Infinity), came = new Int32Array(W * H).fill(-1), closed = new Uint8Array(W * H);
  const open = [start];
  g[start] = 0;
  const h = (i) => { const x = i % W, z = (i / W) | 0, dx = Math.abs(x - tx), dz = Math.abs(z - tz); return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz); };
  const f = new Float32Array(W * H).fill(Infinity);
  f[start] = h(start);
  let n = 0;
  while (open.length && n++ < maxNodes) {
    // small maps: a linear scan for the best node is fast enough and simple
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1]; open.pop();
    if (cur === goal) break;
    closed[cur] = 1;
    const cx = cur % W, cz = (cur / W) | 0;
    for (const [dx, dz, cost] of DIRS) {
      const nx = cx + dx, nz = cz + dz;
      if (!level.walkable(nx, nz)) continue;
      if (dx && dz && (!level.walkable(cx + dx, cz) || !level.walkable(cx, cz + dz))) continue; // no corner cutting
      const ni = nz * W + nx;
      if (closed[ni]) continue;
      const ng = g[cur] + cost;
      if (ng < g[ni]) {
        if (g[ni] === Infinity) open.push(ni);
        g[ni] = ng; f[ni] = ng + h(ni); came[ni] = cur;
      }
    }
  }
  if (came[goal] === -1 && goal !== start) return null;
  const cells = [];
  for (let i = goal; i !== -1; i = came[i]) cells.push(i);
  cells.reverse();
  const pts = cells.map((i) => new THREE.Vector3((i % W) + 0.5, 0, ((i / W) | 0) + 0.5));
  // finish exactly on the tapped spot when it is free
  if (level.walkable(Math.floor(to.x), Math.floor(to.z))) pts[pts.length - 1] = new THREE.Vector3(to.x, 0, to.z);
  return smooth(level, from, pts);
}

function nearestFree(level, x, z) {
  for (let r = 1; r < 4; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    if (level.walkable(x + dx, z + dz)) return [x + dx, z + dz];
  }
  return null;
}

// String pulling: drop every waypoint that can be skipped in a straight line.
// Doorway cells are kept so characters pass through doors head-on.
function smooth(level, from, pts) {
  const out = [];
  let anchor = new THREE.Vector3(from.x, 0, from.z), i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !level.clearPath(anchor, pts[j])) j--;
    // never skip over a door cell (doors open as you reach them)
    for (let k = i; k < j; k++) if (level.doorAt(Math.floor(pts[k].x), Math.floor(pts[k].z))) { j = k; break; }
    out.push(pts[j]);
    anchor = pts[j];
    i = j + 1;
  }
  return out;
}
