import sharp from 'sharp';

const TAU = Math.PI * 2;
const mod = (a, n) => ((a % n) + n) % n;
const lerp = (a, b, t) => a + (b - a) * t;
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const sat = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => { const t = sat((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

export const hash = (x, y, s = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function grad(ix, iy, p, q, s) {
  const a = hash(mod(ix, p), mod(iy, q), s) * TAU;
  return [Math.cos(a), Math.sin(a)];
}

export function noise(x, y, p, s = 0, q = p) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const g00 = grad(xi, yi, p, q, s), g10 = grad(xi + 1, yi, p, q, s), g01 = grad(xi, yi + 1, p, q, s), g11 = grad(xi + 1, yi + 1, p, q, s);
  const n00 = g00[0] * xf + g00[1] * yf, n10 = g10[0] * (xf - 1) + g10[1] * yf;
  const n01 = g01[0] * xf + g01[1] * (yf - 1), n11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);
  const u = fade(xf), v = fade(yf);
  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v) * 1.42;
}

export function fbm(u, v, base, oct = 5, s = 0, gain = 0.5) {
  let sum = 0, amp = 1, norm = 0, f = base;
  for (let o = 0; o < oct; o++) { sum += amp * noise(u * f, v * f, f, s + o * 17); norm += amp; amp *= gain; f *= 2; }
  return sum / norm;
}

export function fbmA(u, v, fu, fv, oct = 4, s = 0) {
  let sum = 0, amp = 1, norm = 0;
  for (let o = 0; o < oct; o++) { sum += amp * noise(u * fu, v * fv, fu, s + o * 17, fv); norm += amp; amp *= 0.5; fu *= 2; fv *= 2; }
  return sum / norm;
}

export function woodP(u, v, R, s) {
  const ww = v * R + 0.9 * fbmA(u, v, 1, 1, 3, s) + 0.22 * fbmA(u, v, 4, 3, 2, s + 7);
  const sn = 0.5 + 0.5 * Math.sin(TAU * ww), late = smooth(0.55, 1, sn);
  const fib = fbmA(u, v, 6, 96, 2, s + 11), tone = fbmA(u, v, 1, 2, 3, s + 13);
  return (1 - 0.38 * late) * (1 + 0.14 * fib) * (1 + 0.12 * tone);
}

const ridge = (u, v, base, oct, s) => { let sum = 0, amp = 1, norm = 0, f = base; for (let o = 0; o < oct; o++) { sum += amp * (1 - Math.abs(noise(u * f, v * f, f, s + o * 31))); norm += amp; amp *= 0.5; f *= 2; } return sum / norm; };
const vn = (t, s) => { const i = Math.floor(t), f = fade(t - i); return lerp(hash(i, 0, s), hash(i + 1, 0, s), f) * 2 - 1; };

async function make(w, h, fn, quality = 80, opts = {}) {
  const px = Buffer.alloc(w * h * 3), gr = opts.grain ?? 0.05;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const g = 1 + (hash(x, y, 999) - 0.5) * gr, c = fn(x / w, y / h, x, y).map((ch) => ch * g), i = (y * w + x) * 3;
    px[i] = Math.round(sat(c[0]) ** (1 / 2.2) * 255); px[i + 1] = Math.round(sat(c[1]) ** (1 / 2.2) * 255); px[i + 2] = Math.round(sat(c[2]) ** (1 / 2.2) * 255);
  }
  let img = sharp(px, { raw: { width: w, height: h, channels: 3 } });
  if (opts.blur) img = sharp(await img.blur(opts.blur).png().toBuffer());
  return img.jpeg({ quality, chromaSubsampling: '4:2:0', mozjpeg: true }).toBuffer();
}

const lin = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255].map((c) => c ** 2.2);

function marble(u, v, base, vein, veinStrength, s, tiles = 0) {
  let su = u, sv = v, tone = 1;
  if (tiles) {
    const ti = Math.floor(u * tiles), tj = Math.floor(v * tiles);
    su = u + hash(ti, tj, s) * 3.7; sv = v + hash(tj, ti, s + 1) * 2.9;
    tone = 0.95 + hash(ti, tj, s + 2) * 0.1;
  }
  const w1 = fbm(su, sv, 2, 5, s + 3), w2 = fbm(su + 5.2, sv + 1.3, 2, 5, s + 9);
  const t = Math.sin(TAU * (u * 2 + v + 1.3 * w1 + 0.6 * w2));
  const veins = Math.pow(1 - Math.abs(t), 5) * 0.35 + Math.pow(1 - Math.abs(t), 30) * 0.6 + Math.pow(1 - Math.abs(Math.sin(TAU * (u - v * 2 + 2.1 * w2))), 70) * 0.45;
  const cloud = fbm(u, v, 4, 6, s + 21) * 0.08 + fbm(u, v, 32, 3, s + 41) * 0.025;
  let c = mix(base, vein, sat(veins * veinStrength));
  c = mul(c, tone * (1 + cloud));
  if (tiles) {
    const fu = mod(u * tiles, 1), fv = mod(v * tiles, 1), e = Math.min(fu, 1 - fu, fv, 1 - fv) * (512 / tiles);
    if (e < 1.2) c = mul(c, 0.55); else if (e < 2.5) c = mul(c, 0.86);
  }
  return c;
}

function grain(c, t, across, seed, rings = 7) {
  return mul(c, woodP(t * 0.25 + (seed % 97) * 0.37, across * 0.5 + (seed % 89) * 0.21, rings * 2, seed % 7));
}

function herringbone(u, v, opts) {
  const P = 32, n = 4, cell = u * P, cellv = v * P, a = Math.floor(cell), b = Math.floor(cellv), d = a - b;
  let m = Math.floor(d / (2 * n)), r = mod(d, 2 * n), along, across, sa, sb;
  if (r < n) { const k = b + m * n; sa = k + m * n; sb = k - m * n; along = cell - sa; across = cellv - b; }
  else { m += 1; const k = a - m * n; sa = k + m * n; sb = k + 1 - m * n; along = cellv - sb; across = cell - a; }
  const id = hash(mod(sa, P), mod(sb, P), opts.seed);
  let c = mul(opts.base, 0.78 + id * 0.36);
  c = [c[0] * (0.97 + hash(mod(sa, P), mod(sb, P), 3) * 0.06), c[1], c[2] * (0.94 + hash(mod(sa, P), mod(sb, P), 4) * 0.08)];
  c = grain(c, along, across, (id * 1e6) | 0, 6);
  const edge = Math.min(across, 1 - across) * 16, end = Math.min(along, n - along) * 16;
  if (edge < 0.9 || end < 0.9) c = mul(c, 0.35); else if (edge < 1.8 || end < 1.8) c = mul(c, 0.8);
  const wear = fbm(u, v, 3, 4, 77);
  c = mul(c, 1 + wear * 0.12 + fbm(u, v, 48, 2, 79) * 0.04);
  return c;
}

function frame(u, v, W, H, inner) {
  const ex = Math.min(u, 1 - u) * W, ey = Math.min(v, 1 - v) * H, e = Math.min(ex, ey);
  if (e >= inner) return null;
  const t = e / inner, gold = lin(0x8a6a2e);
  const profile = 0.55 + 0.45 * Math.sin(t * Math.PI * 3.2) + (t > 0.82 ? -0.45 : 0);
  const dir = ex < ey ? (u < 0.5 ? 1.15 : 0.8) : (v < 0.5 ? 1.2 : 0.75);
  const orn = 0.85 + 0.25 * Math.abs(Math.sin(TAU * ((ex < ey ? v * H : u * W) / 7))) * (t > 0.3 && t < 0.65 ? 1 : 0);
  const dirt = 0.85 + fbm(u, v, 8, 4, 501) * 0.3;
  return mul(gold, profile * dir * orn * dirt);
}

function craquelure(u, v, s) { const r = ridge(u, v, 12, 3, s); return r > 0.93 ? 0.72 : 1; }

function varnish(c, u, v) {
  const vig = 1 - 0.55 * Math.pow(Math.hypot(u - 0.5, v - 0.5) * 1.5, 2.2);
  return [c[0] * vig, c[1] * vig * 0.93, c[2] * vig * 0.72];
}

export const P = {
  carrara: () => make(512, 512, (u, v) => marble(u, v, lin(0xd9d6cf), lin(0x8d8a86), 0.85, 11, 4)),
  statuary: () => make(256, 256, (u, v) => marble(u, v, lin(0xe2ded6), lin(0x9a958c), 0.55, 19)),
  nero: () => make(256, 256, (u, v) => marble(u, v, lin(0x141416), lin(0xb9b2a2), 0.9, 23)),
  oak: () => make(512, 512, (u, v) => herringbone(u, v, { base: lin(0x8a5f38), seed: 5 })),
  plaster: () => make(256, 256, (u, v) => {
    const st = fbm(u, v, 3, 5, 31), fine = fbm(u, v, 40, 3, 33), trow = fbmA(u, v, 6, 2, 3, 35);
    return mul(lin(0xbfb6a4), 1 + st * 0.12 + fine * 0.07 + trow * 0.05);
  }, 80, { grain: 0.09 }),
  panelwall: () => make(256, 640, (u, v) => {
    const hm = (1 - v) * 6, walnut = lin(0x4a2e1a), x = u * 2.4;
    const wood = (sd) => grain(mul(walnut, 0.9 + fbm(u, v, 4, 3, 61) * 0.15), x * 4, hm * 2.2, sd, 6);
    if (hm < 0.16) return mul(wood(3), hm > 0.13 ? 1.25 : hm < 0.02 ? 0.4 : 0.85);
    if (hm < 1.02) {
      const px = mod(x, 1.2), ex = Math.min(px - 0.08, 1.12 - px), ey = Math.min(hm - 0.26, 0.92 - hm);
      let c = wood(7);
      if (ex < 0 || ey < 0) c = mul(c, 0.82);
      else { const e = Math.min(ex, ey); if (e < 0.03) { const top = ey < ex ? hm > 0.6 : px < 0.6; c = mul(c, top ? 1.3 : 0.55); } else if (e < 0.06) c = mul(c, 0.9); else c = mul(c, 1.05); }
      if (Math.abs(ex) < 0.006 || Math.abs(ey) < 0.006) c = mul(c, 0.5);
      return c;
    }
    if (hm < 1.14) { const t = (hm - 1.02) / 0.12; return mul(wood(9), 0.6 + 0.7 * Math.sin(t * Math.PI) - (t < 0.12 ? 0.3 : 0)); }
    if (hm < 5.35) {
      const silk = lin(0x34413b), weave = 0.93 + 0.07 * Math.sin(TAU * x * 220) * Math.sin(TAU * hm * 220);
      const seam = mod(x, 0.8) < 0.006 ? 0.82 : 1;
      const stain = 1 + fbm(u, v * 2.5, 2, 5, 71) * 0.14 + fbm(u, v, 16, 3, 73) * 0.05;
      const grime = 0.82 + 0.18 * smooth(1.14, 2.2, hm);
      const damask = 1 + 0.06 * Math.pow(Math.abs(Math.sin(TAU * x * 2.5) * Math.cos(TAU * hm * 1.6 + Math.sin(TAU * x * 2.5) * 1.3)), 3);
      return mul(silk, weave * seam * stain * grime * damask);
    }
    const t = (hm - 5.35) / 0.65, cream = lin(0xbdb39c);
    const bands = [[0, 0.08, 0.55], [0.08, 0.22, 1.12], [0.22, 0.3, 0.7], [0.3, 0.55, 1.0], [0.55, 0.62, 0.62], [0.62, 0.86, 1.18], [0.86, 1.01, 0.82]];
    const b = bands.find(([a, c]) => t >= a && t < c) || bands[6];
    const dentil = t > 0.3 && t < 0.55 && mod(x, 0.12) < 0.05 ? 0.72 : 1;
    return mul(cream, b[2] * dentil * (0.9 + fbm(u, v, 6, 3, 81) * 0.2));
  }, 78),
  walnut: () => make(256, 256, (u, v) => {
    const c = mul(lin(0x4e321e), (0.92 + fbm(u, v, 3, 4, 91) * 0.16) * woodP(u, v, 22, 3));
    return mul(c, mod(v * 4, 1) < 0.01 ? 0.45 : 1);
  }),
  leather: () => make(256, 256, (u, v) => {
    const cr = ridge(u, v, 6, 4, 111), pores = fbm(u, v, 64, 2, 113);
    const base = mix(lin(0x3a1c12), lin(0x5a3220), 0.5 + fbm(u, v, 2, 4, 115) * 0.7);
    return mul(base, (cr > 0.9 ? 0.62 : 1) * (0.95 + pores * 0.1) * (1 + fbm(u, v, 5, 3, 117) * 0.12));
  }),
  velvet: () => make(128, 256, (u, v) => {
    const fold = Math.sin(TAU * (u * 5 + 0.25 * fbm(u, v, 1, 3, 121)));
    const sheen = Math.pow(sat(fold), 3) * 0.55 + 0.45 + 0.25 * fold;
    const dust = 1 - 0.18 * smooth(0.7, 1, v);
    return mul(lin(0x4a1218), sat(sheen) * 0.9 * dust * (0.96 + fbm(u, v, 32, 2, 123) * 0.08) + 0.06);
  }),
  limestone: () => make(256, 256, (u, v) => {
    const c = mul(lin(0xb5ab98), 1 + fbm(u, v, 3, 6, 131) * 0.1 + fbm(u, v, 24, 3, 133) * 0.05);
    const pit = hash(Math.floor(u * 256), Math.floor(v * 256), 135) > 0.985 ? 0.7 : 1;
    const band = 1 - 0.06 * Math.pow(1 - Math.abs(Math.sin(TAU * (v * 3 + fbm(u, v, 2, 3, 137) * 0.8))), 10);
    return mul(c, pit * band);
  }),
  brass: () => make(64, 64, (u, v) => mul(lin(0x8c6c34), 0.8 + 0.3 * fbmA(u, v, 1, 16, 3, 141) + fbm(u, v, 4, 3, 143) * 0.15)),
  oil1: () => make(320, 224, (u, v) => {
    const f = frame(u, v, 320, 224, 22); if (f) return f;
    const cl = fbm(u * 1.4, v * 2.2, 2, 6, 151), hz = 0.62 + vn(u * 5, 153) * 0.05 + vn(u * 13, 155) * 0.02;
    let c;
    if (v < hz) {
      const glow = Math.exp(-Math.pow((v - hz) * 7, 2)) * Math.exp(-Math.pow((u - 0.68) * 3, 2));
      c = mix(lin(0x2a3138), lin(0x6c6a5c), sat(0.5 + cl * 1.2));
      c = mix(c, lin(0xd0a060), glow * 0.8);
    } else {
      c = mix(lin(0x262414), lin(0x3e3a1e), sat(0.5 + fbm(u, v, 6, 5, 157)));
    }
    const tree = fbm(u, v, 5, 5, 161) + 0.55 - Math.hypot((u - 0.24) * 1.6, (v - 0.48) * 1.1) * 2.2;
    if (tree > 0) c = mix(c, lin(0x161a10), sat(tree * 6));
    if (Math.abs(u - 0.24) < 0.012 && v > 0.5 && v < 0.76) c = lin(0x14100a);
    return varnish(mul(c, craquelure(u, v, 163)), u, v);
  }, 80, { blur: 0.7 }),
  oil2: () => make(224, 288, (u, v) => {
    const f = frame(u, v, 224, 288, 20); if (f) return f;
    const hz = 0.66 + vn(u * 4, 171) * 0.04;
    let c = mix(lin(0x22262a), lin(0x9a8a6a), sat(0.25 + (v / hz) * 0.6 + fbm(u * 1.2, v * 2, 2, 6, 173) * 0.8));
    const light = Math.exp(-Math.pow((u - 0.35) * 3, 2) - Math.pow((v - 0.45) * 4, 2));
    c = mix(c, lin(0xd8b884), light * 0.55);
    if (v > hz) c = mix(lin(0x16140c), lin(0x34301a), sat(0.4 + fbm(u, v, 6, 5, 175)));
    const rx = u - 0.66, ruin = rx > -0.14 && rx < 0.14 && v > 0.36 + Math.abs(vn(u * 22, 177)) * 0.12 && v < hz + 0.02;
    if (ruin) { c = mix(lin(0x2a241a), lin(0x6a5a40), sat(0.3 + fbm(u, v, 12, 3, 179) - rx * 2)); if (mod(u * 28, 1) < 0.45 && v > 0.46 && v < 0.58) c = lin(0x0c0a08); }
    const tree = fbm(u, v, 5, 5, 181) + 0.5 - Math.hypot((u - 0.16) * 1.7, (v - 0.4) * 0.9) * 2.1;
    if (tree > 0) c = mix(c, lin(0x12160e), sat(tree * 6));
    if (Math.abs(u - 0.17) < 0.012 && v > 0.45 && v < hz + 0.04) c = lin(0x120e08);
    return varnish(mul(c, craquelure(u, v, 183)), u, v);
  }, 80, { blur: 0.7 }),
  oil3: () => make(320, 224, (u, v) => {
    const f = frame(u, v, 320, 224, 22); if (f) return f;
    const hz = 0.5;
    let c;
    if (v < hz) {
      c = mix(lin(0x404a50), lin(0xa89c80), sat(v * 1.8 + fbm(u * 1.5, v * 3, 2, 6, 181) * 0.9));
    } else {
      const wave = fbm(u * 0.6, v * 4, 4, 5, 183), crest = Math.pow(sat(0.5 + wave * 1.6), 6);
      c = mix(lin(0x1a2622), lin(0x3c4c44), sat(0.5 + wave));
      c = mix(c, lin(0xb4b09a), crest * 0.5 * (v - hz) * 2);
    }
    const sx = u - 0.62, sy = v - 0.5;
    if (sy < 0.02 && sy > -0.03 && Math.abs(sx) < 0.11 - sy * 0.6) c = lin(0x15100c);
    for (const [mx, top] of [[-0.05, 0.27], [0.02, 0.22], [0.08, 0.3]]) if (Math.abs(sx - mx) < 0.0045 && sy < -0.02 && sy > -top) c = lin(0x15100c);
    for (const [mx, top, w] of [[-0.05, 0.25, 0.05], [0.02, 0.2, 0.06], [0.08, 0.27, 0.04]]) for (const off of [0.07, 0.14]) { const yy = -top + off; if (sy > yy - 0.06 && sy < yy && Math.abs(sx - mx - 0.012) < w * (1 - (yy - sy) / 0.07)) c = mix(c, lin(0xc8b894), 0.75); }
    return varnish(mul(c, craquelure(u, v, 185)), u, v);
  }, 80, { blur: 0.7 }),
  books: () => make(256, 256, (u, v) => {
    const row = Math.floor(v * 4), fv = mod(v * 4, 1);
    if (fv > 0.9) return mul(lin(0x3a2414), fv > 0.97 ? 0.5 : 1.1 + fbm(u, v, 6, 3, 191) * 0.15);
    let x = 0, i = 0;
    while (true) { const w = 0.018 + hash(i, row, 193) * 0.03; if (u < x + w || x > 1) break; x += w; i++; }
    const hgt = 0.62 + hash(i, row, 195) * 0.26;
    if (1 - fv / 0.9 > hgt) return mul(lin(0x0e0907), 1);
    const pal = [0x4a1a16, 0x1f3326, 0x1c2438, 0x5a4428, 0x2e1f17, 0x6b5a3e, 0x3a2a40];
    let c = lin(pal[Math.floor(hash(i, row, 197) * pal.length)]);
    const w = 0.018 + hash(i, row, 193) * 0.03, lu = (u - x) / w;
    c = mul(c, 0.6 + 0.5 * Math.sin(Math.PI * sat(lu)));
    const bh = 1 - fv / 0.9;
    if (Math.abs(bh - hgt * 0.82) < 0.012 || Math.abs(bh - hgt * 0.2) < 0.012) c = mix(c, lin(0x9a7a3a), 0.7);
    return mul(c, 0.85 + fbm(u, v, 24, 3, 199) * 0.25);
  }),
  crate: () => make(256, 256, (u, v) => {
    const pine = lin(0x9a7a4e), border = Math.min(u, 1 - u, v, 1 - v);
    let c = grain(mul(pine, 0.85 + hash(Math.floor(v * 5), 0, 201) * 0.25), u * 6, mod(v * 5, 1), Math.floor(v * 5) + 3, 9);
    if (mod(v * 5, 1) < 0.02) c = mul(c, 0.4);
    if (border < 0.09) { c = grain(mul(pine, 0.72), (u < 0.09 || u > 0.91 ? v : u) * 6, border / 0.09, 211, 6); if (border > 0.083) c = mul(c, 0.5); }
    const sx = Math.abs(u - 0.5), sy = v - 0.5;
    const stencil = (sy > -0.12 && sy < 0.04 && sx < 0.02) || (sy <= -0.12 && sy > -0.22 && sx < (sy + 0.22) * 0.6);
    if (stencil && border > 0.09) c = mix(c, lin(0x1c1814), 0.82 * (0.7 + 0.3 * hash(Math.floor(u * 80), Math.floor(v * 80), 213)));
    if (sy > 0.14 && sy < 0.2 && sx < 0.26 && border > 0.09) { const k = Math.floor((u - 0.24) / 0.052); if (mod((u - 0.24) / 0.052, 1) < 0.72 && k >= 0 && k < 10) c = mix(c, lin(0x7a1c14), 0.75); }
    for (const [nx, ny] of [[0.045, 0.045], [0.955, 0.045], [0.045, 0.955], [0.955, 0.955]]) if (Math.hypot(u - nx, v - ny) < 0.01) c = lin(0x2a2622);
    return mul(c, 0.9 + fbm(u, v, 4, 4, 215) * 0.2);
  }),
  rug: () => make(256, 256, (u, v) => {
    const x = u - 0.5, y = v - 0.5, e = Math.min(u, 1 - u, v, 1 - v);
    const red = lin(0x4a2420), navy = lin(0x1e2228), cream = lin(0x9c8e72), gold = lin(0x6e5a3a);
    let c;
    if (e < 0.03) c = mul(cream, 0.8);
    else if (e < 0.13) { const m = Math.sin(TAU * ((e < 0.13 && (u < 0.13 || u > 0.87) ? v : u) * 14)); c = Math.abs(e - 0.08) < 0.035 && m > 0.2 ? gold : navy; if (Math.abs(e - 0.035) < 0.006 || Math.abs(e - 0.125) < 0.006) c = cream; }
    else {
      const r = Math.hypot(x * 1.15, y), a = Math.atan2(y, x);
      const petal = 0.17 + 0.05 * Math.cos(a * 8);
      c = red;
      if (r < petal) c = navy;
      if (r < petal * 0.55) c = mix(cream, gold, 0.5);
      if (Math.abs(r - petal) < 0.012) c = gold;
      const lat = Math.sin(TAU * (u * 8)) * Math.sin(TAU * (v * 8));
      if (r > petal + 0.03 && lat > 0.75) c = mix(c, navy, 0.6);
      if (Math.max(Math.abs(x), Math.abs(y)) > 0.33 && Math.max(Math.abs(x), Math.abs(y)) < 0.345) c = cream;
    }
    const wear = sat(0.5 + fbm(u, v, 3, 5, 221) * 1.2);
    c = mix(c, lin(0x5a5044), sat((wear - 0.5) * 1.4) * 0.6);
    return mul(c, 0.9 + 0.1 * Math.sin(TAU * u * 256) * Math.sin(TAU * v * 128) + fbm(u, v, 32, 2, 223) * 0.06);
  }),
  window: () => make(128, 192, (u, v) => {
    const fx = Math.min(u, 1 - u) * 128, fy = Math.min(v, 1 - v) * 192, mul1 = Math.abs(u - 0.5) * 128, mt = [0.33, 0.66].map((t) => Math.abs(v - t) * 192);
    if (fx < 6 || fy < 6) return mul(lin(0x2a2018), 0.8 + 0.2 * (fx < fy ? (u < 0.5 ? 1 : 0.6) : (v < 0.5 ? 1 : 0.6)));
    if (mul1 < 2.5 || Math.min(...mt) < 2.5) return lin(0x221a14);
    let c = mix(lin(0x31404e), lin(0x8a6c52), smooth(0.35, 1, v));
    const tree = fbm(u, v, 3, 5, 231) + 0.45 - (1 - v) * 1.1;
    if (tree > 0) c = mix(c, lin(0x0e1210), sat(tree * 5));
    const dirt = 0.8 + fbm(u, v, 6, 4, 233) * 0.25, refl = 1 + 0.25 * Math.pow(sat(1 - Math.abs(u - v * 0.6 - 0.2) * 6), 2);
    return mul(c, dirt * refl);
  }),
  vitrine: () => make(128, 128, (u, v) => {
    const e = Math.min(u, 1 - u, v, 1 - v) * 128;
    if (e < 4) return mul(lin(0x7a5e2c), 0.7 + 0.5 * (e / 4));
    const refl = Math.pow(sat(1 - Math.abs(u * 0.8 + v - 0.7) * 5), 2) * 0.6 + Math.pow(sat(1 - Math.abs(u * 0.8 + v - 1.15) * 12), 2) * 0.4;
    const inside = mix(lin(0x1a1c1e), lin(0x3a3226), sat(v * 1.2 - 0.2 + fbm(u, v, 3, 4, 241) * 0.6));
    return mul(mix(inside, lin(0xc8ccd0), refl * 0.55), 0.95 + fbm(u, v, 16, 2, 243) * 0.1);
  }),
  scaffold: () => make(128, 128, (u, v) => {
    const c = grain(mul(lin(0x8a7550), 0.8 + hash(Math.floor(u * 4), 0, 251) * 0.3), v * 3, mod(u * 4, 1), Math.floor(u * 4) + 7, 9);
    return mul(c, (mod(u * 4, 1) < 0.03 ? 0.4 : 1) * (0.85 + fbm(u, v, 4, 4, 253) * 0.3));
  }),
  steelpipe: () => make(64, 64, (u, v) => mul(lin(0x6c7176), 0.8 + 0.3 * Math.sin(Math.PI * u) + fbm(u, v, 8, 3, 261) * 0.25 - (hash(Math.floor(u * 64), Math.floor(v * 64), 263) > 0.97 ? 0.3 : 0))),
  barrier: () => make(256, 64, (u, v) => {
    const stripe = mod(u * 8 + v * 2, 1) < 0.5;
    let c = stripe ? lin(0xb08a1c) : lin(0x1a1a1a);
    if (v < 0.08 || v > 0.92) c = lin(0x2a2a2a);
    return mul(c, 0.8 + fbm(u, v, 6, 4, 271) * 0.35 - (ridge(u, v, 8, 3, 273) > 0.94 ? 0.25 : 0));
  }),
  slab: () => make(512, 512, (u, v) => {
    const fu = mod(u * 2, 1), fv = mod(v * 2, 1), joint = Math.min(fu, 1 - fu, fv, 1 - fv) * 256;
    const stain = fbm(u, v, 3, 6, 301), oil = smooth(0.2, 0.45, fbm(u + 3.1, v, 4, 5, 303)) * 0.35;
    const cracks = ridge(u, v, 4, 4, 305) > 0.965 ? 0.65 : 1;
    let c = mul(lin(0x8a8c8a), (1 + stain * 0.16 + fbm(u, v, 32, 3, 307) * 0.07) * (1 - oil) * cracks);
    if (joint < 1.5) c = mul(c, 0.42); else if (joint < 3) c = mul(c, 0.8);
    const tyre = Math.pow(sat(1 - Math.abs(mod(u * 3 + fbm(u, v, 1, 3, 309) * 0.6, 1) - 0.5) * 8), 2) * 0.12;
    return mul(c, 1 - tyre);
  }, 78, { grain: 0.1 }),
  flagstone: () => make(512, 512, (u, v) => {
    const row = Math.floor(v * 4), off = row % 2 ? 0.5 : 0, cu = u * 4 + off, ti = Math.floor(cu), fu = cu - ti, fv = v * 4 - row;
    const e = Math.min(fu, 1 - fu, fv, 1 - fv) * 128, id = hash(mod(ti, 4), row, 311);
    let c = mix(lin(0x8e8a80), lin(0x6e6a62), id);
    c = mul(c, 1 + fbm(u, v, 4, 5, 313) * 0.14 + fbm(u, v, 48, 2, 315) * 0.06);
    c = mul(c, 1 - 0.2 * smooth(0.35, 0.8, fbm(u, v, 2, 4, 317)));
    if (e < 2) c = mul(c, 0.4); else if (e < 4) c = mul(c, 0.78);
    return c;
  }, 78, { grain: 0.1 }),
  platform: () => make(512, 512, (u, v) => {
    let c = mul(lin(0x7c7e7e), 1 + fbm(u, v, 4, 6, 321) * 0.15 + fbm(u, v, 40, 2, 323) * 0.06);
    c = mul(c, 1 - 0.25 * smooth(0.3, 0.7, fbm(u, v, 2, 4, 325)));
    if (mod(u * 4, 1) < 0.006 || mod(v * 4, 1) < 0.006) c = mul(c, 0.5);
    if (v < 0.07) { const dot = Math.hypot(mod(u * 48, 1) - 0.5, mod(v * 48, 1) - 0.5) < 0.28; c = mul(lin(0xb08a20), (dot ? 1.15 : 0.9) * (0.8 + fbm(u, v, 8, 3, 327) * 0.3)); }
    if (v >= 0.07 && v < 0.09) c = mul(c, 0.6);
    return c;
  }, 78, { grain: 0.08 }),
  ballast: () => make(256, 256, (u, v) => {
    let c = mul(lin(0x5a544c), 0.7 + 0.6 * sat(0.5 + ridge(u, v, 24, 2, 331) - 0.5) + fbm(u, v, 4, 3, 333) * 0.2);
    const sleeper = mod(v * 2, 1) < 0.22;
    if (sleeper) c = mul(lin(0x3a3028), (0.85 + fbm(u * 4, v, 4, 3, 335) * 0.3) * woodP(u, v, 6, 3));
    const ru = mod(u, 1);
    if (Math.abs(ru - 0.3) < 0.03 || Math.abs(ru - 0.7) < 0.03) c = mul(lin(0x6a625a), Math.abs(ru - 0.3) < 0.012 || Math.abs(ru - 0.7) < 0.012 ? 1.6 : 0.8);
    return c;
  }, 78, { grain: 0.12 }),
  brick: () => make(512, 512, (u, v) => {
    const rows = 24, row = Math.floor(v * rows), off = row % 2 ? 0.5 : 0, cu = u * 8 + off, bi = Math.floor(cu), fu = cu - bi, fv = v * rows - row;
    const ex = Math.min(fu, 1 - fu) * 64, ey = Math.min(fv, 1 - fv) * (512 / rows);
    const id = hash(mod(bi, 8), row, 341), id2 = hash(row, mod(bi, 8), 343);
    let c = mix(lin(0x7a3a28), lin(0x5a2a1e), id);
    if (id2 > 0.85) c = mix(c, lin(0x3a2620), 0.6);
    c = mul(c, 1 + fbm(u, v, 16, 4, 345) * 0.18);
    if (ex < 2.2 || ey < 1.8) c = mul(lin(0x6e665a), 0.8 + fbm(u, v, 32, 2, 347) * 0.3);
    const soot = 1 - 0.45 * smooth(0.0, 0.7, 0.5 - v + fbm(u, v, 2, 4, 349) * 0.4);
    const streak = 1 - 0.18 * Math.pow(sat(fbmA(u, v, 12, 1, 3, 351) + 0.3), 3);
    return mul(c, soot * streak);
  }, 78),
  roofsteel: () => make(256, 256, (u, v) => {
    let c = mul(lin(0x3c4044), 1 + fbm(u, v, 3, 5, 361) * 0.2);
    if (mod(u * 4, 1) < 0.03) c = mul(c, 0.5);
    if (mod(v * 2, 1) < 0.02) c = mul(c, 0.55);
    return mul(c, 1 - 0.3 * smooth(0.4, 0.8, fbm(u, v, 2, 4, 363)));
  }),
  skyglass: () => make(256, 256, (u, v) => {
    const fu = mod(u * 2, 1), fv = mod(v * 2, 1), e = Math.min(fu, 1 - fu, fv, 1 - fv) * 128;
    if (e < 4) return mul(lin(0x2a3a30), 0.8 + fbm(u, v, 8, 2, 371) * 0.2);
    let c = mix(lin(0x8a98a4), lin(0xb4bcc0), sat(0.5 + fbm(u, v, 2, 4, 373)));
    c = mul(c, 1 - 0.35 * smooth(0.3, 0.75, fbm(u, v, 4, 5, 375)) - 0.25 * smooth(0, 0.3, 0.3 - fv));
    return c;
  }),
  steelplate: () => make(128, 128, (u, v) => {
    let c = mul(lin(0x4c5258), 1 + fbm(u, v, 4, 4, 381) * 0.18 + fbmA(u, v, 1, 24, 2, 383) * 0.08);
    c = mix(c, lin(0x5a3a22), smooth(0.25, 0.6, fbm(u, v, 3, 4, 385)) * 0.45);
    if (Math.min(u, 1 - u, v, 1 - v) < 0.02) c = mul(c, 0.5);
    for (const [x, y] of [[0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92], [0.5, 0.08], [0.5, 0.92]]) { const d = Math.hypot(u - x, v - y); if (d < 0.03) c = mul(c, d < 0.018 ? 1.35 : 0.6); }
    return c;
  }),
  deckplate: () => make(128, 128, (u, v) => {
    const ix = Math.floor(u * 8), iy = Math.floor(v * 8), fx = u * 8 - ix - 0.5, fy = v * 8 - iy - 0.5, a = (ix + iy) % 2 ? 0.7 : -0.7;
    const rx = fx * Math.cos(a) - fy * Math.sin(a), ry = fx * Math.sin(a) + fy * Math.cos(a), raised = Math.abs(rx) < 0.32 && Math.abs(ry) < 0.08;
    let c = mul(lin(0x5a5e62), 1 + fbm(u, v, 4, 4, 391) * 0.2);
    if (raised) c = mul(c, ry > 0 ? 0.7 : 1.25);
    return mix(c, lin(0x4a3424), smooth(0.3, 0.7, fbm(u, v, 3, 4, 393)) * 0.35);
  }),
  livery: () => make(512, 256, (u, v) => {
    let c = mul(lin(0x2c3a46), 1 + fbm(u, v, 4, 5, 401) * 0.12);
    if (v > 0.56 && v < 0.62) c = lin(0x8a2a20);
    if (v > 0.62 && v < 0.64) c = lin(0x9c8a5a);
    if (v > 0.82) c = mul(lin(0x1a1c1e), 1 + fbm(u, v, 8, 3, 403) * 0.2);
    for (let i = 0; i < 4; i++) { const wx = u - (0.04 + i * 0.245), inW = wx > 0 && wx < 0.18 && v > 0.16 && v < 0.48; if (inW) { const e = Math.min(wx, 0.18 - wx, v - 0.16, 0.48 - v); c = e < 0.012 ? lin(0x15171a) : mix(lin(0x101418), lin(0x5a6470), Math.pow(sat(1 - Math.abs(wx * 2 - (v - 0.16) * 0.8 - 0.05) * 5), 2) * 0.6); } }
    if (mod(u * 16, 1) < 0.008 && v < 0.82) c = mul(c, 0.6);
    const grime = 1 - 0.35 * smooth(0.5, 1, v + fbm(u, v, 3, 4, 405) * 0.3);
    return mul(c, grime);
  }),
  corrugated: () => make(256, 512, (u, v) => {
    const rib = 0.5 + 0.5 * Math.sin(TAU * u * 16), sh = 0.72 + 0.4 * rib;
    let c = mul(lin(0x54606a), sh * (1 + fbm(u, v, 3, 5, 411) * 0.12));
    c = mix(c, lin(0x6a4428), smooth(0.35, 0.75, fbmA(u, v, 8, 1, 4, 413) + v * 0.3 - 0.2) * 0.5);
    if (v > 0.68 && v < 0.69) c = mul(lin(0xb8b8b0), 0.8 + 0.2 * rib);
    if (v > 0.86) { c = mul(lin(0x2a2c2e), sh * (0.9 + fbm(u, v, 6, 3, 415) * 0.2)); if (v < 0.885) c = mod(u * 10 - v * 20, 1) < 0.5 ? mul(lin(0xa88a20), sh) : mul(lin(0x141414), sh); }
    return mul(c, 1 - 0.3 * smooth(0.75, 1, v));
  }),
  container: () => make(256, 256, (u, v) => {
    const rib = 0.5 + 0.5 * Math.sin(TAU * u * 12), sh = 0.7 + 0.42 * Math.pow(rib, 0.6);
    let c = mul(lin(0xc8c8c4), sh * (1 + fbm(u, v, 3, 5, 421) * 0.12));
    c = mix(c, lin(0x5a3a26), smooth(0.4, 0.8, fbmA(u, v, 6, 1, 4, 423) + v * 0.4 - 0.25) * 0.55);
    c = mix(c, lin(0x6a4a30), smooth(0.6, 0.9, fbm(u, v, 8, 4, 425)) * 0.5);
    if (v < 0.05 || v > 0.95) c = mul(c, 0.45);
    return c;
  }),
};
