// Minimal mesh builder that writes Wavefront .obj + .mtl files.
//
// Every model in assets/models is generated from code in tools/make-models.mjs
// using the primitives below, so the art is fully original and reproducible.
// Faces are triangles, every vertex carries a UV and a normal, and faces are
// grouped by material ("usemtl") so the game can swap textures/colours per part.

const r6 = (n) => Math.round(n * 1e6) / 1e6;

export class Mesh {
  constructor() {
    this.v = []; // [x, y, z]
    this.vt = []; // [u, v]
    this.vn = []; // [x, y, z]
    this.groups = new Map(); // material -> [[v, vt, vn] x3, ...]
    this.mat = 'default';
  }

  use(mat) { this.mat = mat; return this; }

  // Add one triangle; each corner is { p: [x,y,z], uv: [u,v], n: [x,y,z] }.
  tri(a, b, c) {
    const face = [a, b, c].map((k) => {
      this.v.push(k.p); this.vt.push(k.uv); this.vn.push(k.n);
      const i = this.v.length; // .obj indices are 1-based
      return [i, i, i];
    });
    if (!this.groups.has(this.mat)) this.groups.set(this.mat, []);
    this.groups.get(this.mat).push(face);
    return this;
  }

  // Quad given in counter-clockwise order (seen from the front).
  quad(a, b, c, d) { return this.tri(a, b, c).tri(a, c, d); }

  // Axis-aligned box from min to max. UVs are in world units divided by `tile`
  // so textures keep the same scale on every face (wood grain, fabric…).
  box(min, max, { tile = 1, skip = [] } = {}) {
    const [x0, y0, z0] = min, [x1, y1, z1] = max;
    const P = (x, y, z) => [x, y, z];
    const faces = {
      px: { n: [1, 0, 0], c: [P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1)], s: [z1 - z0, y1 - y0] },
      nx: { n: [-1, 0, 0], c: [P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)], s: [z1 - z0, y1 - y0] },
      py: { n: [0, 1, 0], c: [P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)], s: [x1 - x0, z1 - z0] },
      ny: { n: [0, -1, 0], c: [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)], s: [x1 - x0, z1 - z0] },
      pz: { n: [0, 0, 1], c: [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], s: [x1 - x0, y1 - y0] },
      nz: { n: [0, 0, -1], c: [P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0)], s: [x1 - x0, y1 - y0] },
    };
    for (const [k, f] of Object.entries(faces)) {
      if (skip.includes(k)) continue;
      const [w, h] = f.s.map((s) => s / tile);
      const uv = [[0, 0], [w, 0], [w, h], [0, h]];
      this.quad(...f.c.map((p, i) => ({ p, uv: uv[i], n: f.n })));
    }
    return this;
  }

  // Box with a small chamfer on the vertical edges, which catches light like
  // real furniture instead of looking like a perfect cube.
  bevelBox(min, max, bevel = 0.02, opts = {}) {
    const [x0, y0, z0] = min, [x1, y1, z1] = max, b = Math.min(bevel, (x1 - x0) / 3, (z1 - z0) / 3);
    // outline of the chamfered footprint, counter-clockwise from above
    const ring = [[x0 + b, z0], [x1 - b, z0], [x1, z0 + b], [x1, z1 - b], [x1 - b, z1], [x0 + b, z1], [x0, z1 - b], [x0, z0 + b]];
    return this.prism(ring, y0, y1, opts);
  }

  // Vertical prism from a convex-or-simple 2D outline (x, z) between y0 and y1.
  prism(ring, y0, y1, { tile = 1, top = true, bottom = true } = {}) {
    const n = ring.length;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % n];
      const len = Math.hypot(bx - ax, bz - az), nx = (bz - az) / len, nz = -(bx - ax) / len;
      const u0 = acc / tile, u1 = (acc + len) / tile, h = (y1 - y0) / tile; acc += len;
      const N = [nx, 0, nz];
      this.quad(
        { p: [ax, y0, az], uv: [u0, 0], n: N }, { p: [bx, y0, bz], uv: [u1, 0], n: N },
        { p: [bx, y1, bz], uv: [u1, h], n: N }, { p: [ax, y1, az], uv: [u0, h], n: N });
    }
    // caps as a triangle fan (outlines used here are convex)
    const cap = (y, up) => {
      const N = [0, up ? 1 : -1, 0];
      for (let i = 1; i < n - 1; i++) {
        const t = [ring[0], ring[i], ring[i + 1]].map(([x, z]) => ({ p: [x, y, z], uv: [x / tile, z / tile], n: N }));
        if (up) this.tri(t[0], t[2], t[1]); else this.tri(t[0], t[1], t[2]);
      }
    };
    if (top) cap(y1, true);
    if (bottom) cap(y0, false);
    return this;
  }

  // Surface of revolution around the Y axis. `profile` is a list of [radius, y]
  // from bottom to top; used for heads, vases, lamps, plant pots, bottles…
  lathe(profile, segs = 16, { cx = 0, cz = 0, tile = 1 } = {}) {
    for (let j = 0; j < profile.length - 1; j++) {
      const [r0, y0] = profile[j], [r1, y1] = profile[j + 1];
      // normal of this band in the profile plane
      const dr = r1 - r0, dy = y1 - y0, len = Math.hypot(dr, dy) || 1, pr = dy / len, py = -dr / len;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
        const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        const u0 = i / segs, u1 = (i + 1) / segs, v0 = j / (profile.length - 1), v1 = (j + 1) / (profile.length - 1);
        const k = (r, y, c, s, u, v) => ({ p: [cx + r * c, y, cz + r * s], uv: [u * tile, v * tile], n: [pr * c, py, pr * s] });
        this.quad(k(r0, y0, c1, s1, u1, v0), k(r0, y0, c0, s0, u0, v0), k(r1, y1, c0, s0, u0, v1), k(r1, y1, c1, s1, u1, v1));
      }
    }
    return this;
  }

  // Smooth ellipsoid (centre c, radii r) - heads, hands, cushions.
  ellipsoid(c, r, segs = 14, rings = 10) {
    for (let j = 0; j < rings; j++) {
      const t0 = (j / rings) * Math.PI, t1 = ((j + 1) / rings) * Math.PI;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
        const k = (t, a) => {
          const n = [Math.sin(t) * Math.cos(a), -Math.cos(t), Math.sin(t) * Math.sin(a)];
          const len = Math.hypot(n[0] / r[0], n[1] / r[1], n[2] / r[2]);
          return { p: [c[0] + n[0] * r[0], c[1] + n[1] * r[1], c[2] + n[2] * r[2]], uv: [a / (Math.PI * 2), t / Math.PI], n: [n[0] / r[0] / len, n[1] / r[1] / len, n[2] / r[2] / len] };
        };
        this.quad(k(t0, a1), k(t0, a0), k(t1, a0), k(t1, a1));
      }
    }
    return this;
  }

  // Capsule along -Y from the origin (joint) down to `len`: limbs that bend
  // naturally around their pivot when the game rotates them.
  limb(radiusTop, radiusBottom, len, segs = 12) {
    const prof = [];
    for (let k = 0; k <= 4; k++) { const a = (k / 4) * Math.PI / 2; prof.push([radiusBottom * Math.sin(a), -len - radiusBottom * Math.cos(a) + radiusBottom]); }
    for (let k = 4; k >= 0; k--) { const a = (k / 4) * Math.PI / 2; prof.push([radiusTop * Math.sin(a), radiusTop * Math.cos(a) - radiusTop]); }
    // lathe needs increasing y
    prof.sort((p, q) => p[1] - q[1]);
    return this.lathe(prof, segs);
  }

  // Cylinder (optionally a cone when rTop != rBottom), with caps.
  cylinder(c, rBottom, rTop, h, segs = 16, caps = true) {
    this.lathe([[rBottom, c[1]], [rTop, c[1] + h]], segs, { cx: c[0], cz: c[2] });
    if (caps) for (const [r, y, up] of [[rBottom, c[1], false], [rTop, c[1] + h, true]]) {
      const N = [0, up ? 1 : -1, 0];
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
        const k = (rr, a) => ({ p: [c[0] + rr * Math.cos(a), y, c[2] + rr * Math.sin(a)], uv: [0.5 + 0.5 * Math.cos(a) * (rr ? 1 : 0), 0.5 + 0.5 * Math.sin(a) * (rr ? 1 : 0)], n: N });
        if (up) this.tri(k(0, 0), k(r, a1), k(r, a0)); else this.tri(k(0, 0), k(r, a0), k(r, a1));
      }
    }
    return this;
  }

  // Apply a transform to every vertex added since `from` (used to rotate or
  // move a finished part, e.g. tilt a lamp head or lay a book flat).
  transform(from, fn, nfn = fn) {
    for (let i = from; i < this.v.length; i++) { this.v[i] = fn(this.v[i]); const n = nfn(this.vn[i], true); const l = Math.hypot(...n) || 1; this.vn[i] = n.map((x) => x / l); }
    return this;
  }
  mark() { return this.v.length; }
  rotY(from, ang, about = [0, 0, 0]) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const f = ([x, y, z], dir) => { const dx = dir ? x : x - about[0], dz = dir ? z : z - about[2]; const rx = dx * c + dz * s, rz = -dx * s + dz * c; return dir ? [rx, y, rz] : [rx + about[0], y, rz + about[2]]; };
    return this.transform(from, (p) => f(p, false), (n) => f(n, true));
  }
  rotX(from, ang, about = [0, 0, 0]) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const f = ([x, y, z], dir) => { const dy = dir ? y : y - about[1], dz = dir ? z : z - about[2]; const ry = dy * c - dz * s, rz = dy * s + dz * c; return dir ? [x, ry, rz] : [x, ry + about[1], rz + about[2]]; };
    return this.transform(from, (p) => f(p, false), (n) => f(n, true));
  }
  rotZ(from, ang, about = [0, 0, 0]) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const f = ([x, y, z], dir) => { const dx = dir ? x : x - about[0], dy = dir ? y : y - about[1]; const rx = dx * c - dy * s, ry = dx * s + dy * c; return dir ? [rx, ry, z] : [rx + about[0], ry + about[1], z]; };
    return this.transform(from, (p) => f(p, false), (n) => f(n, true));
  }
  move(from, [dx, dy, dz]) { return this.transform(from, ([x, y, z]) => [x + dx, y + dy, z + dz], (n) => n); }

  // Serialise. `mtlName` is referenced with mtllib; materials are written by writeMtl.
  toObj(name, mtlName) {
    const out = [`# ${name}.obj - generated by tools/make-models.mjs (Tiptoe Thief)`, `# units: metres, +Y up, front faces -Z`, `mtllib ${mtlName}`, `o ${name}`];
    for (const p of this.v) out.push(`v ${r6(p[0])} ${r6(p[1])} ${r6(p[2])}`);
    for (const t of this.vt) out.push(`vt ${r6(t[0])} ${r6(t[1])}`);
    for (const n of this.vn) out.push(`vn ${r6(n[0])} ${r6(n[1])} ${r6(n[2])}`);
    for (const [mat, faces] of this.groups) {
      out.push(`usemtl ${mat}`);
      for (const f of faces) out.push('f ' + f.map(([a, b, c]) => `${a}/${b}/${c}`).join(' '));
    }
    return out.join('\n') + '\n';
  }

  // Bounding box, handy for the asset manifest (collision footprints).
  bounds() {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (const p of this.v) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); }
    return { min: mn.map(r6), max: mx.map(r6) };
  }
}

// One shared material library for every model: diffuse colour, optional
// texture (relative to the .mtl file) and a "roughness-ish" shininess value.
export function writeMtl(materials) {
  const out = ['# materials.mtl - generated by tools/make-models.mjs (Tiptoe Thief)'];
  for (const [name, m] of Object.entries(materials)) {
    out.push('', `newmtl ${name}`, `Kd ${m.color.map((c) => r6(c)).join(' ')}`, `Ks 0.04 0.04 0.04`, `Ns ${m.shine ?? 20}`, `d ${m.opacity ?? 1}`, 'illum 2');
    if (m.map) out.push(`map_Kd ../textures/${m.map}`);
    if (m.emissive) out.push(`Ke ${m.emissive.map(r6).join(' ')}`);
  }
  return out.join('\n') + '\n';
}
