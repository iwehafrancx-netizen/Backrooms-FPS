import sharp from 'sharp';

const C = {
  khaki: [176, 156, 112], khakiD: [146, 128, 90], coyote: [92, 96, 66], pouch: [72, 76, 52], strap: [56, 56, 42],
  bag: [70, 70, 50], boot: [56, 42, 31], sole: [26, 23, 20], glove: [36, 35, 33], balaclava: [46, 45, 42],
  helmet: [94, 96, 68], helmetD: [70, 72, 52], belt: [58, 54, 41], buckle: [128, 126, 116], knee: [72, 68, 52],
};

const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function legs(p, n) {
  const ax = Math.abs(p[0]);
  if (p[1] < 0.025) return [C.sole, 'leather'];
  if (p[1] < 0.13) return [p[2] > 0.05 && p[1] > 0.05 && Math.floor(p[1] * 140) % 2 ? C.sole : C.boot, 'leather'];
  if (p[1] < 0.16) return [C.khakiD, 'cloth'];
  if (p[1] > 0.36 && p[1] < 0.45 && n[2] > 0.35) return [C.knee, 'pad'];
  if (p[1] > 0.5 && p[1] < 0.62 && Math.abs(n[0]) > 0.55) return [p[1] > 0.6 ? C.strap : C.khakiD, 'cloth'];
  if (p[1] > 0.8) return [ax < 0.03 && n[2] > 0.5 && p[1] < 0.86 ? C.buckle : C.belt, 'webbing'];
  return [C.khaki, 'cloth'];
}

function torso(p, n) {
  const ax = Math.abs(p[0]);
  if (ax > 0.4) return [C.glove, 'leather'];
  if (ax > 0.2) return [ax > 0.37 ? C.khakiD : C.khaki, 'cloth'];
  if (p[1] > 1.18) return [C.balaclava, 'cloth'];
  if (p[1] > 0.84) {
    if (n[2] < -0.4 && p[1] < 1.15) {
      if (ax > 0.07 && ax < 0.1) return [C.strap, 'webbing'];
      return [p[1] > 1.1 ? C.strap : C.bag, 'nylon'];
    }
    if (n[2] > 0.4 && p[1] < 0.97 && ax < 0.15) {
      const gap = (ax % 0.065) < 0.008;
      if (gap) return [C.coyote, 'nylon'];
      return [p[1] > 0.952 ? C.strap : C.pouch, 'nylon'];
    }
    if (Math.abs(n[0]) > 0.6) return [C.pouch, 'nylon'];
    return [C.coyote, 'nylon'];
  }
  return [C.khaki, 'cloth'];
}

function helmet(p, n) {
  const ax = Math.abs(p[0]);
  if (p[1] > 1.285) {
    if (p[1] < 1.297) return [C.helmetD, 'shell'];
    if (n[2] > 0.6 && ax < 0.02 && p[1] > 1.33 && p[1] < 1.37) return [C.strap, 'shell'];
    return [C.helmet, 'shell'];
  }
  if (ax > 0.05 && ax < 0.07 && p[1] > 1.2) return [C.strap, 'webbing'];
  return [C.balaclava, 'cloth'];
}

function texelColor(kind, base, px, py, p) {
  let k = 1;
  if (kind === 'cloth') k = 0.94 + 0.08 * vnoise(px / 9, py / 9) + 0.025 * Math.sin(px * 1.9 + py * 1.9);
  else if (kind === 'nylon') k = 0.93 + 0.08 * vnoise(px / 6, py / 6) + 0.02 * ((px + py) % 3 === 0 ? -1 : 1);
  else if (kind === 'webbing') k = 0.9 + 0.08 * ((py % 4) < 2 ? 1 : 0);
  else if (kind === 'leather') k = 0.85 + 0.2 * vnoise(px / 5, py / 5);
  else if (kind === 'shell') k = 0.9 + 0.12 * vnoise(px / 14, py / 14);
  else if (kind === 'pad') k = 0.88 + 0.12 * vnoise(px / 4, py / 4);
  const wear = p[1] < 0.3 ? 0.92 + 0.08 * (p[1] / 0.3) : 1;
  return base.map((c) => Math.max(0, Math.min(255, Math.round(c * k * wear))));
}

function raster(prim, size, rule) {
  const pos = prim.getAttribute('POSITION').getArray(), nrm = prim.getAttribute('NORMAL').getArray();
  const uv = prim.getAttribute('TEXCOORD_0').getArray(), idx = prim.getIndices().getArray();
  const img = new Uint8Array(size * size * 4);
  for (let t = 0; t < idx.length; t += 3) {
    const ia = idx[t], ib = idx[t + 1], ic = idx[t + 2];
    const ax = uv[ia * 2] * size, ay = uv[ia * 2 + 1] * size, bx = uv[ib * 2] * size, by = uv[ib * 2 + 1] * size, cx = uv[ic * 2] * size, cy = uv[ic * 2 + 1] * size;
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    if (Math.abs(area) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const qx = x + 0.5, qy = y + 0.5;
      let w0 = ((bx - qx) * (cy - qy) - (cx - qx) * (by - qy)) / area;
      let w1 = ((cx - qx) * (ay - qy) - (ax - qx) * (cy - qy)) / area;
      let w2 = 1 - w0 - w1;
      const e = -0.02;
      if (w0 < e || w1 < e || w2 < e) continue;
      const p = [0, 1, 2].map((k) => pos[ia * 3 + k] * w0 + pos[ib * 3 + k] * w1 + pos[ic * 3 + k] * w2);
      const nn = [0, 1, 2].map((k) => nrm[ia * 3 + k] * w0 + nrm[ib * 3 + k] * w1 + nrm[ic * 3 + k] * w2);
      const L = Math.hypot(...nn) || 1; nn[0] /= L; nn[1] /= L; nn[2] /= L;
      const [base, kind] = rule(p, nn);
      const col = texelColor(kind, base, x, y, p);
      const o = (y * size + x) * 4;
      img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2]; img[o + 3] = 255;
    }
  }
  for (let pass = 0; pass < 8; pass++) {
    const src = img.slice();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4; if (src[o + 3]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const q = (ny * size + nx) * 4; if (!src[q + 3]) continue;
        img[o] = src[q]; img[o + 1] = src[q + 1]; img[o + 2] = src[q + 2]; img[o + 3] = 255; break;
      }
    }
  }
  for (let o = 0; o < img.length; o += 4) if (!img[o + 3]) { img[o] = C.khaki[0]; img[o + 1] = C.khaki[1]; img[o + 2] = C.khaki[2]; img[o + 3] = 255; }
  return img;
}

export async function paintNpc(doc) {
  const rules = [[/Torso/, torso, 1024, 0.85], [/Legs/, legs, 1024, 0.88], [/Glass/, null, 0, 0.2], [/Helmet/, helmet, 512, 0.6]];
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial(); const name = mat.getName();
    const r = rules.find(([re]) => re.test(name)); if (!r) continue;
    const [, rule, size, rough] = r;
    mat.setRoughnessFactor(rough).setMetallicFactor(0);
    if (!rule) { mat.setBaseColorFactor([0.04, 0.05, 0.06, 1]); continue; }
    const img = raster(prim, size, rule);
    const png = await sharp(Buffer.from(img), { raw: { width: size, height: size, channels: 4 } }).removeAlpha().png().toBuffer();
    const tex = doc.createTexture(name.replace(/\W+/g, '_')).setImage(new Uint8Array(png)).setMimeType('image/png');
    mat.setBaseColorTexture(tex).setBaseColorFactor([1, 1, 1, 1]);
    mat.getBaseColorTextureInfo().setTexCoord(0);
    console.log(`  painted ${name} ${size}px`);
  }
}
