// Builds a playable level from its definition (src/game/levels/*.js).
//
// Map format - one character per 1 m cell, row 0 is the north edge:
//   X  outside brick wall      #  inside wall          W  window in an outside wall
//   D  door                    L  locked door (needs the lock pick)
//   .  parquet   ,  bathroom tiles   :  carpet   ;  kitchen chequer   -  office carpet
//   =  pavement  ~  road             (space) lawn
// Walls are drawn thin (20 cm) through the middle of their cells and joined to
// neighbouring wall cells, so rooms look real while the map stays easy to edit.
import * as THREE from 'three';

export const WALL_H = 2.6;
const WALL_T = 0.2;
const FLOORS = {
  '.': 'floor_parquet.jpg', ',': 'floor_tiles.jpg', ':': 'carpet.jpg', ';': 'floor_checker.jpg', '-': 'carpet_blue.jpg',
  '=': 'pavement.jpg', '~': 'asphalt.jpg', ' ': 'grass.jpg',
};
const FLOOR_SCALE = { 'floor_tiles.jpg': 2, 'floor_checker.jpg': 2, 'floor_parquet.jpg': 3, 'grass.jpg': 4, 'pavement.jpg': 3, 'asphalt.jpg': 4 };
const WALLISH = new Set(['X', '#', 'W', 'D', 'L']);

export class Level {
  constructor(def, lib, renderer) {
    this.def = def;
    this.lib = lib;
    this.R = renderer;
    this.rows = def.map;
    this.h = this.rows.length;
    this.w = Math.max(...this.rows.map((r) => r.length));
    this.root = new THREE.Group();
    this.colliders = []; // {x0, z0, x1, z1, tall, door?}
    this.blocked = new Uint8Array(this.w * this.h); // nav grid: 1 = can't stand here
    this.doors = [];
    this.hideSpots = [];
    this.lampPoints = [];
    this.props = [];
  }

  ch(x, z) { return (this.rows[z] && this.rows[z][x]) || ' '; }
  isWall(x, z) { return WALLISH.has(this.ch(x, z)); }
  inside(x, z) { return x >= 0 && z >= 0 && x < this.w && z < this.h; }
  idx(x, z) { return z * this.w + x; }
  // cell centre in world space: x right, z down (south), cell (0,0) at the origin corner
  center(x, z) { return new THREE.Vector3(x + 0.5, 0, z + 0.5); }

  build() {
    this.buildFloors();
    this.buildWalls();
    for (const p of this.def.props || []) this.addProp(p);
    this.computeNav();
    return this;
  }

  // ------------------------------------------------------------- floors
  buildFloors() {
    // one merged plane per floor material; the floor under a wall/door copies
    // its neighbour so doorways don't show a strip of grass
    const byMat = new Map();
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      let c = this.ch(x, z);
      if (WALLISH.has(c)) c = this.floorBeside(x, z);
      const tex = FLOORS[c] || FLOORS['.'];
      if (!byMat.has(tex)) byMat.set(tex, []);
      byMat.get(tex).push([x, z]);
    }
    for (const [tex, cells] of byMat) {
      const s = FLOOR_SCALE[tex] || 2;
      const pos = [], uv = [], nor = [], idx = [];
      for (const [x, z] of cells) {
        const i = pos.length / 3;
        pos.push(x, 0, z, x + 1, 0, z, x + 1, 0, z + 1, x, 0, z + 1);
        uv.push(x / s, -z / s, (x + 1) / s, -z / s, (x + 1) / s, -(z + 1) / s, x / s, -(z + 1) / s);
        nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
        idx.push(i, i + 2, i + 1, i, i + 3, i + 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geo.setIndex(idx);
      const outdoor = /grass|pavement|asphalt/.test(tex);
      const mat = new THREE.MeshStandardMaterial({ map: this.lib.texture(tex), roughness: outdoor ? 0.95 : tex.includes('tiles') || tex.includes('checker') ? 0.35 : 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      this.root.add(mesh);
    }
  }

  floorBeside(x, z) {
    for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const c = this.ch(x + dx, z + dz);
      if (!WALLISH.has(c) && c !== ' ') return c;
    }
    return ' ';
  }

  // ------------------------------------------------------------- walls
  buildWalls() {
    const inner = [], outer = [], tops = [];
    this.wallFootprints = [];
    const T = WALL_T / 2;
    // add an axis-aligned wall box to a list (+ collider, + dark top cap)
    const piece = (list, x0, z0, x1, z1, y0 = 0, y1 = WALL_H, collide = true) => {
      list.push([x0, y0, z0, x1, y1, z1]);
      if (y1 >= WALL_H - 0.01) tops.push([x0, z0, x1, z1]);
      if (y0 < 1.05 && y1 > 1.05) this.wallFootprints.push([x0, z0, x1, z1]);
      if (collide) this.colliders.push({ x0, z0, x1, z1, tall: true, wall: true });
    };
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      const c = this.ch(x, z);
      if (!WALLISH.has(c)) continue;
      if (c === 'D' || c === 'L') { this.addDoor(x, z, c === 'L'); continue; }
      const list = c === '#' ? inner : outer;
      const cx = x + 0.5, cz = z + 0.5;
      // centre post, then an arm toward every neighbouring wall cell
      piece(list, cx - T, cz - T, cx + T, cz + T);
      const n = this.isWall(x, z - 1), s = this.isWall(x, z + 1), e = this.isWall(x + 1, z), w = this.isWall(x - 1, z);
      if (c === 'W') {
        // window: low wall + header with the window model in between
        const horiz = e || w;
        if (horiz) { piece(list, x, cz - T, x + 1, cz + T, 0, 0.9); piece(list, x, cz - T, x + 1, cz + T, 2.1, WALL_H, false); }
        else { piece(list, cx - T, z, cx + T, z + 1, 0, 0.9); piece(list, cx - T, z, cx + T, z + 1, 2.1, WALL_H, false); }
        this.colliders.push(horiz ? { x0: x, z0: cz - T, x1: x + 1, z1: cz + T, tall: false, wall: true } : { x0: cx - T, z0: z, x1: cx + T, z1: z + 1, tall: false, wall: true });
        const win = this.lib.instance('window');
        win.traverse((o) => { if (o.isMesh) this.R.cutaway(o.material); });
        win.position.set(cx, 0, cz);
        if (!horiz) win.rotation.y = Math.PI / 2;
        this.root.add(win);
        continue;
      }
      if (n) piece(list, cx - T, z, cx + T, cz - T);
      if (s) piece(list, cx - T, cz + T, cx + T, z + 1);
      if (w) piece(list, x, cz - T, cx - T, cz + T);
      if (e) piece(list, cx + T, cz - T, x + 1, cz + T);
    }
    const wallMat = (tex, tint) => this.R.cutaway(new THREE.MeshStandardMaterial({ map: this.lib.texture(tex), color: tint, roughness: 0.85 }));
    this.root.add(this.boxesMesh(inner, wallMat(this.def.wallpaper || 'wall_plaster.jpg', 0xffffff)));
    this.root.add(this.boxesMesh(outer, wallMat('brick.jpg', 0xffffff)));
    // dark caps on top of walls read as "cut" walls from above, like a floor plan
    const capGeo = this.boxesGeometry(tops.map(([x0, z0, x1, z1]) => [x0, WALL_H, z0, x1, WALL_H + 0.01, z1]));
    const caps = new THREE.Mesh(capGeo, this.R.cutaway(new THREE.MeshBasicMaterial({ color: 0x141418 })));
    this.root.add(caps);
    // ...and the same caps at the cut height, shown only where walls are cut down
    const lowGeo = this.boxesGeometry(this.wallFootprints.map(([x0, z0, x1, z1]) => [x0, 1.04, z0, x1, 1.05, z1]));
    this.root.add(new THREE.Mesh(lowGeo, this.R.cutCap(new THREE.MeshBasicMaterial({ color: 0x141418 }))));
  }

  boxesGeometry(boxes) {
    const pos = [], nor = [], uv = [], idx = [];
    for (const [x0, y0, z0, x1, y1, z1] of boxes) {
      const faces = [
        [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], x1 - x0],
        [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], x1 - x0],
        [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], z1 - z0],
        [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], z1 - z0],
        [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], x1 - x0],
      ];
      for (const [a, b, c, d, n, len] of faces) {
        const i = pos.length / 3;
        pos.push(...a, ...b, ...c, ...d);
        nor.push(...n, ...n, ...n, ...n);
        // world-space UVs: 1 texture repeat per 1.5 m, continuous along the wall
        const u0 = (n[0] ? a[2] : a[0]) / 1.5, u1 = u0 + (n[0] ? (b[2] - a[2]) : (b[0] - a[0])) / 1.5;
        uv.push(u0, a[1] / 1.5, u1, b[1] / 1.5, u1, c[1] / 1.5, u0, d[1] / 1.5);
        idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
        void len;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    return geo;
  }

  boxesMesh(boxes, mat) {
    const mesh = new THREE.Mesh(this.boxesGeometry(boxes), mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }

  // ------------------------------------------------------------- doors
  addDoor(x, z, locked) {
    const horiz = this.isWall(x - 1, z) || this.isWall(x + 1, z); // wall runs east-west
    const outer = this.ch(x - 1, z) === 'X' || this.ch(x + 1, z) === 'X' || this.ch(x, z - 1) === 'X' || this.ch(x, z + 1) === 'X';
    const leaf = this.lib.instance(outer ? 'door_front' : 'door_leaf');
    leaf.traverse((o) => { if (o.isMesh) this.R.cutaway(o.material); });
    const pivot = new THREE.Group();
    // hinge on the west (or north) edge of the opening
    if (horiz) { pivot.position.set(x + 0.04, 0, z + 0.5); }
    else { pivot.position.set(x + 0.5, 0, z + 0.04); pivot.rotation.y = -Math.PI / 2; }
    pivot.add(leaf);
    this.root.add(pivot);
    const T = WALL_T / 2;
    const col = horiz ? { x0: x, z0: z + 0.5 - T, x1: x + 1, z1: z + 0.5 + T } : { x0: x + 0.5 - T, z0: z, x1: x + 0.5 + T, z1: z + 1 };
    const door = { x, z, horiz, locked, open: 0, target: 0, pivot, baseRot: pivot.rotation.y, collider: { ...col, tall: true, door: true, active: true }, swing: 1 };
    this.colliders.push(door.collider);
    this.doors.push(door);
  }

  doorAt(x, z) { return this.doors.find((d) => d.x === x && d.z === z); }

  // Open a door away from whoever is at `from` (so it never swings into them).
  openDoor(door, from) {
    if (door.locked) return false;
    if (door.target === 0) {
      // pick the swing that moves the free edge away from whoever opens it:
      // east-west doors (leaf along +X) swing north with +1; north-south doors
      // (leaf along +Z) swing west with -1
      const side = door.horiz ? Math.sign(from.z - (door.z + 0.5)) : Math.sign(from.x - (door.x + 0.5));
      door.swing = door.horiz ? (side >= 0 ? 1 : -1) : (side >= 0 ? -1 : 1);
    }
    door.target = 1;
    door.collider.active = false;
    return true;
  }

  updateDoors(dt) {
    for (const d of this.doors) {
      d.open += Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), dt * 3.2);
      d.pivot.rotation.y = d.baseRot + d.open * d.swing * Math.PI * 0.5;
    }
  }

  // ------------------------------------------------------------- props
  // { t: model, x, z (cell coords, fractions ok), r: quarter turns, ... }
  addProp(p) {
    const info = this.lib.info(p.t) || {};
    const obj = this.lib.instance(p.t);
    const rot = (p.r || 0) * Math.PI / 2;
    obj.position.set(p.x, p.y || 0, p.z);
    obj.rotation.y = rot;
    const tall = info.max && info.max[1] > 1.4;
    if (tall || info.wall) obj.traverse((o) => { if (o.isMesh) this.R.cutaway(o.material); });
    this.root.add(obj);
    const prop = { ...p, obj, info };
    this.props.push(prop);
    // collision footprint = rotated bounding box
    if (info.solid && info.min) {
      const fp = this.footprint(info, p.r || 0, p.x, p.z);
      prop.collider = { ...fp, tall, prop };
      this.colliders.push(prop.collider);
    }
    if (info.light) {
      const l = new THREE.Vector3(...info.light).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(obj.position);
      this.lampPoints.push({ x: l.x, y: l.y, z: l.z });
    }
    if (info.hide) this.hideSpots.push(prop);
    return prop;
  }

  footprint(info, r, x, z) {
    let [x0, , z0] = info.min, [x1, , z1] = info.max;
    for (let i = 0; i < ((r % 4) + 4) % 4; i++) [x0, z0, x1, z1] = [z0, -x1, z1, -x0]; // rotate 90 degrees each step
    return { x0: x + Math.min(x0, x1), z0: z + Math.min(z0, z1), x1: x + Math.max(x0, x1), z1: z + Math.max(z0, z1) };
  }

  // Height of the top of whatever stands at (x, z) - loot sits on it.
  surfaceY(x, z) {
    let y = 0;
    for (const p of this.props) {
      if (!p.collider || !p.info.max) continue;
      const c = p.collider;
      if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) y = Math.max(y, p.t === 'bed_double' || p.t === 'bed_single' ? 0.6 : p.t === 'desk' ? 0.77 : p.t === 'tv_cabinet' ? 0.5 : p.t === 'kitchen_counter' ? 0.92 : p.t === 'side_table_lamp' ? 0.58 : p.t === 'table_dining' ? 0.76 : Math.min(p.info.max[1], 1.0));
    }
    return y;
  }

  // ------------------------------------------------------------- navigation grid
  computeNav() {
    this.blocked.fill(0);
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      const c = this.ch(x, z);
      if (WALLISH.has(c) && c !== 'D' && c !== 'L') { this.blocked[this.idx(x, z)] = 1; continue; }
      if (c === 'L' && this.doorAt(x, z)?.locked) { this.blocked[this.idx(x, z)] = 1; continue; }
      const cx = x + 0.5, cz = z + 0.5;
      for (const col of this.colliders) {
        if (col.door || col.wall || col.active === false) continue;
        // blocked when a body standing at the cell centre would touch the furniture
        // (0.22 m is a little less than a body radius, so 1 m gaps stay walkable)
        if (cx > col.x0 - 0.22 && cx < col.x1 + 0.22 && cz > col.z0 - 0.22 && cz < col.z1 + 0.22) { this.blocked[this.idx(x, z)] = 1; break; }
      }
    }
  }

  walkable(x, z) { return this.inside(x, z) && !this.blocked[this.idx(x, z)]; }

  // ------------------------------------------------------------- physics helpers
  // Push a circle (radius r) out of every active collider. Returns the new position.
  collide(pos, r) {
    for (let pass = 0; pass < 2; pass++) for (const c of this.colliders) {
      if (c.active === false) continue;
      const nx = Math.max(c.x0, Math.min(pos.x, c.x1)), nz = Math.max(c.z0, Math.min(pos.z, c.z1));
      const dx = pos.x - nx, dz = pos.z - nz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), push = r - d; pos.x += (dx / d) * push; pos.z += (dz / d) * push; }
      else {
        // centre inside the box: leave by the nearest side
        const opts = [[pos.x - c.x0 + r, -1, 0], [c.x1 - pos.x + r, 1, 0], [pos.z - c.z0 + r, 0, -1], [c.z1 - pos.z + r, 0, 1]].sort((a, b) => a[0] - b[0]);
        pos.x += opts[0][1] * opts[0][0]; pos.z += opts[0][2] * opts[0][0];
      }
    }
    pos.x = Math.max(0.3, Math.min(this.w - 0.3, pos.x));
    pos.z = Math.max(0.3, Math.min(this.h - 0.3, pos.z));
    return pos;
  }

  // Does a straight line between two points stay clear of tall things
  // (walls, closed doors, wardrobes)? Used for guard eyesight.
  lineOfSight(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), n = Math.ceil(len / 0.15);
    for (let i = 1; i < n; i++) {
      const x = a.x + (dx * i) / n, z = a.z + (dz * i) / n;
      for (const c of this.colliders) {
        if (!c.tall || c.active === false) continue;
        if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return false;
      }
    }
    return true;
  }

  // Can a circle walk straight from a to b? (path smoothing)
  clearPath(a, b, r = 0.28) {
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), n = Math.ceil(len / 0.2);
    for (let i = 1; i <= n; i++) {
      const x = a.x + (dx * i) / n, z = a.z + (dz * i) / n;
      for (const c of this.colliders) {
        if (c.active === false || c.door) continue;
        if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return false;
      }
    }
    return true;
  }
}
