import { BLOCKS } from './blocks.js';
import { CHUNK } from './world.js';

const FACES = [
  { n: [1, 0, 0], a: 0, c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.8, t: 'side' },
  { n: [-1, 0, 0], a: 0, c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.8, t: 'side' },
  { n: [0, 1, 0], a: 1, c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0, t: 'top' },
  { n: [0, -1, 0], a: 1, c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.55, t: 'bottom' },
  { n: [0, 0, 1], a: 2, c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.68, t: 'side' },
  { n: [0, 0, -1], a: 2, c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.68, t: 'side' },
];
const CUV = [[0, 1], [1, 1], [1, 0], [0, 0]];
const AO = [0.45, 0.66, 0.83, 1];

class Buf {
  constructor() { this.pos = []; this.uv = []; this.col = []; this.idx = []; this.n = 0; }
  quad(p, uv, col, flip) {
    const b = this.n;
    for (let i = 0; i < 4; i++) { this.pos.push(p[i][0], p[i][1], p[i][2]); this.uv.push(uv[i][0], uv[i][1]); this.col.push(col[i], col[i], col[i]); }
    if (flip) this.idx.push(b + 1, b + 2, b + 3, b + 1, b + 3, b); else this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    this.n += 4;
  }
  out() {
    if (!this.n) return null;
    const col = new Uint8Array(this.col.length);
    for (let i = 0; i < col.length; i++) col[i] = Math.max(0, Math.min(255, Math.round(this.col[i] * 255)));
    return { pos: new Float32Array(this.pos), uv: new Float32Array(this.uv), col, idx: this.n > 65535 ? new Uint32Array(this.idx) : new Uint16Array(this.idx) };
  }
}

export function meshChunk(world, atlas, cx, cy, cz) {
  const bufs = { solid: new Buf(), cutout: new Buf(), plant: new Buf(), trans: new Buf() };
  const x0 = cx * CHUNK - world.ox, y0 = cy * CHUNK, z0 = cz * CHUNK - world.oz;
  const pad = 0.4 / atlas.width;
  const uvCache = {};
  const tileUV = (name) => uvCache[name] || (uvCache[name] = atlas.uv(name));
  const opaque = (x, y, z) => { const id = world.get(x, y, z); if (!id) return false; const b = BLOCKS[id]; return b.solid && !b.transparent; };
  for (let y = y0; y < y0 + CHUNK && y < world.sy; y++)
    for (let z = z0; z < z0 + CHUNK; z++)
      for (let x = x0; x < x0 + CHUNK; x++) {
        const id = world.get(x, y, z);
        if (!id) continue;
        const b = BLOCKS[id];
        if (!b || b.invisible) continue;
        if (b.cross) {
          const [u0, v0, du, dv] = tileUV(b.tex.side);
          const r = 0.42, cxp = x + 0.5, czp = z + 0.5;
          const uv = CUV.map(([a, c]) => [u0 + pad + a * (du - 2 * pad), v0 + pad + c * (dv - 2 * pad)]);
          const sh = [0.95, 0.95, 1, 1];
          bufs.plant.quad([[cxp - r, y, czp - r], [cxp + r, y, czp + r], [cxp + r, y + 0.9, czp + r], [cxp - r, y + 0.9, czp - r]], uv, sh, false);
          bufs.plant.quad([[cxp - r, y, czp + r], [cxp + r, y, czp - r], [cxp + r, y + 0.9, czp - r], [cxp - r, y + 0.9, czp + r]], uv, sh, false);
          continue;
        }
        const bucket = id === 11 ? bufs.trans : b.transparent ? bufs.cutout : bufs.solid;
        for (const f of FACES) {
          const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
          const nid = world.get(nx, ny, nz);
          if (nid) {
            const nb = BLOCKS[nid];
            if (nb && nb.solid && !nb.transparent) continue;
            if (nid === id && b.transparent) continue;
          }
          if (ny < 0) continue;
          const [u0, v0, du, dv] = tileUV(b.tex[f.t]);
          const t1 = (f.a + 1) % 3, t2 = (f.a + 2) % 3;
          const ao = [0, 0, 0, 0];
          const p = new Array(4), uv = new Array(4);
          for (let i = 0; i < 4; i++) {
            const c = f.c[i];
            p[i] = [x + c[0], y + c[1], z + c[2]];
            uv[i] = [u0 + pad + CUV[i][0] * (du - 2 * pad), v0 + pad + CUV[i][1] * (dv - 2 * pad)];
            if (b.light) { ao[i] = 3; continue; }
            const o1 = [0, 0, 0], o2 = [0, 0, 0];
            o1[t1] = c[t1] ? 1 : -1; o2[t2] = c[t2] ? 1 : -1;
            const s1 = opaque(nx + o1[0], ny + o1[1], nz + o1[2]) ? 1 : 0;
            const s2 = opaque(nx + o2[0], ny + o2[1], nz + o2[2]) ? 1 : 0;
            const cr = opaque(nx + o1[0] + o2[0], ny + o1[1] + o2[1], nz + o1[2] + o2[2]) ? 1 : 0;
            ao[i] = s1 && s2 ? 0 : 3 - (s1 + s2 + cr);
          }
          const sh = b.light ? [1.15, 1.15, 1.15, 1.15] : ao.map((a) => AO[a] * f.s);
          bucket.quad(p, uv, sh, ao[0] + ao[2] < ao[1] + ao[3]);
        }
      }
  return { solid: bufs.solid.out(), cutout: bufs.cutout.out(), plant: bufs.plant.out(), trans: bufs.trans.out() };
}
