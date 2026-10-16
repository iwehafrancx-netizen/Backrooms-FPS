import { BLOCKS } from './blocks.js';
import { CHUNK } from './world.js';

const FACES = [
  { n: [1, 0, 0], a: 0, c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.8, t: 'side', u: 2, v: 1, fu: -1 },
  { n: [-1, 0, 0], a: 0, c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.8, t: 'side', u: 2, v: 1, fu: 1 },
  { n: [0, 1, 0], a: 1, c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0, t: 'top', u: 0, v: 2, fu: 1 },
  { n: [0, -1, 0], a: 1, c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.55, t: 'bottom', u: 0, v: 2, fu: 1 },
  { n: [0, 0, 1], a: 2, c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.68, t: 'side', u: 0, v: 1, fu: 1 },
  { n: [0, 0, -1], a: 2, c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.68, t: 'side', u: 0, v: 1, fu: -1 },
];
const CUV = [[0, 1], [1, 1], [1, 0], [0, 0]];
const AO = [0.5, 0.7, 0.85, 1];

const OPQ = new Uint8Array(256), KIND = new Uint8Array(256);
for (const b of BLOCKS) if (b) {
  OPQ[b.id] = b.solid && !b.transparent && !b.box ? 1 : 0;
  KIND[b.id] = b.invisible ? 0 : b.cross ? 2 : b.box ? 3 : b.id === 11 || b.trans ? 4 : b.transparent ? 5 : 1;
}

class Buf {
  constructor(q = 512) { this.cap = q; this.n = 0; this.ni = 0; this.alloc(q); }
  alloc(q) {
    const pos = new Float32Array(q * 12), uv = new Float32Array(q * 8), col = new Uint8Array(q * 12), lt = new Uint8Array(q * 8), idx = new Uint32Array(q * 6);
    if (this.pos) { pos.set(this.pos); uv.set(this.uv); col.set(this.col); lt.set(this.lt); idx.set(this.idx); }
    this.pos = pos; this.uv = uv; this.col = col; this.lt = lt; this.idx = idx; this.cap = q;
  }
  quad(p, uvs, sh, ls, lb, flip) {
    if ((this.n >> 2) >= this.cap) this.alloc(this.cap * 2);
    const b = this.n;
    for (let i = 0; i < 4; i++) {
      const v = b + i;
      this.pos[v * 3] = p[i * 3]; this.pos[v * 3 + 1] = p[i * 3 + 1]; this.pos[v * 3 + 2] = p[i * 3 + 2];
      this.uv[v * 2] = uvs[i * 2]; this.uv[v * 2 + 1] = uvs[i * 2 + 1];
      const c = Math.max(0, Math.min(255, Math.round(sh[i] * 255)));
      this.col[v * 3] = c; this.col[v * 3 + 1] = c; this.col[v * 3 + 2] = c;
      this.lt[v * 2] = ls[i]; this.lt[v * 2 + 1] = lb[i];
    }
    const k = this.ni;
    if (flip) { this.idx[k] = b + 1; this.idx[k + 1] = b + 2; this.idx[k + 2] = b + 3; this.idx[k + 3] = b + 1; this.idx[k + 4] = b + 3; this.idx[k + 5] = b; }
    else { this.idx[k] = b; this.idx[k + 1] = b + 1; this.idx[k + 2] = b + 2; this.idx[k + 3] = b; this.idx[k + 4] = b + 2; this.idx[k + 5] = b + 3; }
    this.n += 4; this.ni += 6;
  }
  out() {
    if (!this.n) return null;
    const v = this.n;
    return { pos: this.pos.slice(0, v * 3), uv: this.uv.slice(0, v * 2), col: this.col.slice(0, v * 3), lt: this.lt.slice(0, v * 2), idx: v > 65535 ? this.idx.slice(0, this.ni) : Uint16Array.from(this.idx.subarray(0, this.ni)) };
  }
}

const P = new Float32Array(12), UV = new Float32Array(8), SH = [0, 0, 0, 0], LS = [0, 0, 0, 0], LB = [0, 0, 0, 0], AOV = [0, 0, 0, 0];

export function meshChunk(world, atlas, cx, cy, cz, light) {
  const bufs = { solid: new Buf(1024), cutout: new Buf(64), plant: new Buf(64), trans: new Buf(32) };
  const { sx, sy, sz, ox, oz, data } = world, plane = sx * sz;
  const L = light ? light.l : null;
  const x0 = cx * CHUNK - ox, y0 = cy * CHUNK, z0 = cz * CHUNK - oz;
  const pad = 0.02 / atlas.width;
  const uvCache = {};
  const tileUV = (name) => uvCache[name] || (uvCache[name] = atlas.uv(name));
  const gid = (x, y, z) => { if (y < 0 || y >= sy) return 0; const gx = x + ox, gz = z + oz; if (gx < 0 || gz < 0 || gx >= sx || gz >= sz) return 0; return data[y * plane + gz * sx + gx]; };
  const glt = (x, y, z) => { if (!L || y >= sy) return 0xf0; if (y < 0) return 0; const gx = x + ox, gz = z + oz; if (gx < 0 || gz < 0 || gx >= sx || gz >= sz) return 0xf0; return L[y * plane + gz * sx + gx]; };
  const yEnd = Math.min(y0 + CHUNK, sy), xEnd = Math.min(x0 + CHUNK, sx - ox), zEnd = Math.min(z0 + CHUNK, sz - oz);
  for (let y = y0; y < yEnd; y++)
    for (let z = z0; z < zEnd; z++)
      for (let x = x0; x < xEnd; x++) {
        const id = data[y * plane + (z + oz) * sx + (x + ox)];
        if (!id) continue;
        const kind = KIND[id];
        if (!kind) continue;
        const b = BLOCKS[id];
        if (kind === 2) {
          const [u0, v0, du, dv] = tileUV(b.tex.side);
          const r = 0.42, cxp = x + 0.5, czp = z + 0.5, own = glt(x, y, z);
          for (let i = 0; i < 4; i++) { UV[i * 2] = u0 + CUV[i][0] * du; UV[i * 2 + 1] = v0 + CUV[i][1] * dv; SH[i] = i < 2 ? 0.9 : 1; LS[i] = (own >> 4) * 17; LB[i] = (own & 15) * 17; }
          P.set([cxp - r, y, czp - r, cxp + r, y, czp + r, cxp + r, y + 0.9, czp + r, cxp - r, y + 0.9, czp - r]);
          bufs.plant.quad(P, UV, SH, LS, LB, false);
          P.set([cxp - r, y, czp + r, cxp + r, y, czp - r, cxp + r, y + 0.9, czp - r, cxp - r, y + 0.9, czp + r]);
          bufs.plant.quad(P, UV, SH, LS, LB, false);
          continue;
        }
        if (kind === 3) {
          const bx = b.box, own = glt(x, y, z), emit = b.light ? 1.12 : 1;
          for (const f of FACES) {
            if (f.n[1] === -1 && OPQ[gid(x, y - 1, z)] && bx[1] === 0) continue;
            if (f.n[1] === 1 && OPQ[gid(x, y + 1, z)] && bx[4] === 1) continue;
            const [u0, v0, du, dv] = tileUV(b.tex[f.t]);
            const ln = f.n[0] + f.n[1] + f.n[2] > 0 ? glt(x + f.n[0], y + f.n[1], z + f.n[2]) : glt(x + f.n[0], y + f.n[1], z + f.n[2]);
            const lv = Math.max(own >> 4, ln >> 4), lb = Math.max(own & 15, ln & 15);
            for (let i = 0; i < 4; i++) {
              const c = f.c[i];
              const px = c[0] ? bx[3] : bx[0], py = c[1] ? bx[4] : bx[1], pz = c[2] ? bx[5] : bx[2];
              P[i * 3] = x + px; P[i * 3 + 1] = y + py; P[i * 3 + 2] = z + pz;
              const lc = [px, py, pz];
              let uu = lc[f.u], vv = 1 - lc[f.v];
              if (f.fu < 0) uu = 1 - uu;
              UV[i * 2] = u0 + uu * du; UV[i * 2 + 1] = v0 + vv * dv;
              SH[i] = f.s * emit; LS[i] = lv * 17; LB[i] = lb * 17;
            }
            bufs.cutout.quad(P, UV, SH, LS, LB, false);
          }
          continue;
        }
        const bucket = kind === 4 ? bufs.trans : kind === 5 ? bufs.cutout : bufs.solid;
        const transp = kind !== 1;
        for (const f of FACES) {
          const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
          if (ny < 0) continue;
          const nid = gid(nx, ny, nz);
          if (nid && (OPQ[nid] || (nid === id && transp))) continue;
          const [u0, v0, du, dv] = tileUV(b.tex[f.t]);
          const t1 = (f.a + 1) % 3, t2 = (f.a + 2) % 3;
          const ln = glt(nx, ny, nz);
          for (let i = 0; i < 4; i++) {
            const c = f.c[i];
            P[i * 3] = x + c[0]; P[i * 3 + 1] = y + c[1]; P[i * 3 + 2] = z + c[2];
            UV[i * 2] = u0 + pad + CUV[i][0] * (du - 2 * pad); UV[i * 2 + 1] = v0 + pad + CUV[i][1] * (dv - 2 * pad);
            if (b.light) { AOV[i] = 3; LS[i] = 255; LB[i] = 255; continue; }
            const ax = t1 === 0 ? (c[0] ? 1 : -1) : 0, ay = t1 === 1 ? (c[1] ? 1 : -1) : 0, az = t1 === 2 ? (c[2] ? 1 : -1) : 0;
            const bx = t2 === 0 ? (c[0] ? 1 : -1) : 0, by = t2 === 1 ? (c[1] ? 1 : -1) : 0, bz = t2 === 2 ? (c[2] ? 1 : -1) : 0;
            const i1 = gid(nx + ax, ny + ay, nz + az), i2 = gid(nx + bx, ny + by, nz + bz), i3 = gid(nx + ax + bx, ny + ay + by, nz + az + bz);
            const s1 = OPQ[i1], s2 = OPQ[i2], cr = OPQ[i3];
            AOV[i] = s1 && s2 ? 0 : 3 - (s1 + s2 + cr);
            let ss = ln >> 4, sb = ln & 15, k = 1;
            if (!s1) { const v = glt(nx + ax, ny + ay, nz + az); ss += v >> 4; sb += v & 15; k++; }
            if (!s2) { const v = glt(nx + bx, ny + by, nz + bz); ss += v >> 4; sb += v & 15; k++; }
            if (!cr && !(s1 && s2)) { const v = glt(nx + ax + bx, ny + ay + by, nz + az + bz); ss += v >> 4; sb += v & 15; k++; }
            LS[i] = Math.round((ss / k) * 17); LB[i] = Math.round((sb / k) * 17);
          }
          for (let i = 0; i < 4; i++) SH[i] = b.light ? 1.15 : AO[AOV[i]] * f.s;
          bucket.quad(P, UV, SH, LS, LB, AOV[0] + AOV[2] < AOV[1] + AOV[3]);
        }
      }
  return { solid: bufs.solid.out(), cutout: bufs.cutout.out(), plant: bufs.plant.out(), trans: bufs.trans.out() };
}
