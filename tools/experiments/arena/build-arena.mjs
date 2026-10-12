import { Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'out');
fs.mkdirSync(OUT, { recursive: true });

export const HALL = { x: 32, z: 22, h: 13 };
export const DECK = 3.6;
export const BASES = { A: { x: -27, z: 0 }, B: { x: 27, z: 0 } };

const svgJpeg = (w, h, body) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`)).jpeg({ quality: 84 }).toBuffer();
const noise = (id, f, o, op, seed = 1) => `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="${o}" seed="${seed}"/><feColorMatrix type="saturate" values="0"/></filter>`;
const grain = (w, h, id, op) => `<rect width="${w}" height="${h}" filter="url(#${id})" opacity="${op}" style="mix-blend-mode:multiply"/>`;

async function textures() {
  const T = {};
  T.floor = await svgJpeg(512, 512, `<defs>${noise('n', 0.012, 4, 1, 3)}${noise('m', 0.18, 2, 1, 7)}</defs>
    <rect width="512" height="512" fill="#8f9397"/>${grain(512, 512, 'n', 0.35)}${grain(512, 512, 'm', 0.12)}
    <g stroke="#6d7175" stroke-width="3" opacity="0.85"><line x1="0" y1="1" x2="512" y2="1"/><line x1="0" y1="256" x2="512" y2="256"/><line x1="1" y1="0" x2="1" y2="512"/><line x1="256" y1="0" x2="256" y2="512"/></g>
    <g stroke="#c9ccd0" stroke-width="1" opacity="0.6"><line x1="0" y1="4" x2="512" y2="4"/><line x1="0" y1="259" x2="512" y2="259"/><line x1="4" y1="0" x2="4" y2="512"/><line x1="259" y1="0" x2="259" y2="512"/></g>`);
  let ribs = '';
  for (let x = 0; x < 512; x += 32) ribs += `<rect x="${x}" y="0" width="14" height="1024" fill="#ffffff" opacity="0.10"/><rect x="${x + 14}" y="0" width="4" height="1024" fill="#000" opacity="0.22"/>`;
  T.wall = await svgJpeg(512, 1024, `<defs>${noise('n', 0.02, 3, 1, 5)}<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3e4b58"/><stop offset="0.6" stop-color="#5d6e7e"/><stop offset="1" stop-color="#6f8090"/></linearGradient></defs>
    <rect width="512" height="1024" fill="url(#g)"/>${ribs}${grain(512, 1024, 'n', 0.3)}
    <rect y="700" width="512" height="10" fill="#e9eef2" opacity="0.8"/>
    <rect y="900" width="512" height="124" fill="#24282d"/>
    <g>${Array.from({ length: 12 }, (_, i) => `<polygon points="${i * 48},880 ${i * 48 + 24},880 ${i * 48 + 4},900 ${i * 48 - 20},900" fill="#f2c230"/>`).join('')}</g>
    <rect y="878" width="512" height="3" fill="#111"/><rect y="899" width="512" height="3" fill="#111"/>`);
  let cr = '';
  for (let x = 0; x < 512; x += 42) cr += `<rect x="${x}" y="0" width="20" height="512" fill="#fff" opacity="0.18"/><rect x="${x + 20}" y="0" width="5" height="512" fill="#000" opacity="0.28"/>`;
  T.container = await svgJpeg(512, 512, `<defs>${noise('n', 0.03, 3, 1, 9)}${noise('r', 0.004, 2, 1, 11)}</defs>
    <rect width="512" height="512" fill="#d9d9d9"/>${cr}${grain(512, 512, 'n', 0.22)}${grain(512, 512, 'r', 0.25)}
    <rect width="512" height="26" fill="#000" opacity="0.35"/><rect y="486" width="512" height="26" fill="#000" opacity="0.4"/>`);
  T.steel = await svgJpeg(256, 256, `<defs>${noise('n', 0.05, 3, 1, 2)}</defs><rect width="256" height="256" fill="#525960"/>${grain(256, 256, 'n', 0.35)}
    <g stroke="#2c3035" stroke-width="2"><line x1="0" y1="1" x2="256" y2="1"/><line x1="1" y1="0" x2="1" y2="256"/></g>`);
  let dp = '';
  for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) {
    const o = (y / 32) % 2 ? 16 : 0;
    dp += `<rect x="${x + o + 6}" y="${y + 13}" width="18" height="5" rx="2" fill="#9aa0a6" transform="rotate(${(y / 32) % 2 ? 35 : -35} ${x + o + 15} ${y + 15})"/>`;
  }
  T.deck = await svgJpeg(256, 256, `<defs>${noise('n', 0.06, 3, 1, 4)}</defs><rect width="256" height="256" fill="#6a7076"/>${dp}${grain(256, 256, 'n', 0.3)}`);
  T.crate = await svgJpeg(256, 256, `<defs>${noise('n', 0.02, 4, 1, 6)}</defs><rect width="256" height="256" fill="#a37a48"/>
    ${Array.from({ length: 6 }, (_, i) => `<rect x="0" y="${i * 43}" width="256" height="3" fill="#5a3d1e"/>`).join('')}${grain(256, 256, 'n', 0.35)}
    <rect x="0" y="0" width="256" height="256" fill="none" stroke="#6b4824" stroke-width="22"/>
    <line x1="14" y1="14" x2="242" y2="242" stroke="#7d5730" stroke-width="20"/><line x1="242" y1="14" x2="14" y2="242" stroke="#7d5730" stroke-width="20"/>
    <text x="128" y="150" font-family="DejaVu Sans" font-weight="bold" font-size="34" fill="#2b1a0b" opacity="0.6" text-anchor="middle">CARGO 09</text>`);
  T.roof = await svgJpeg(256, 256, `<defs>${noise('n', 0.03, 3, 1, 8)}</defs><rect width="256" height="256" fill="#3a434c"/>${grain(256, 256, 'n', 0.35)}
    <g stroke="#1d2328" stroke-width="5"><line x1="0" y1="2" x2="256" y2="2"/><line x1="2" y1="0" x2="2" y2="256"/></g>`);
  T.paint = await svgJpeg(128, 128, `<defs>${noise('n', 0.08, 2, 1, 12)}</defs><rect width="128" height="128" fill="#f4f4f4"/>${grain(128, 128, 'n', 0.15)}`);
  const mural = (bg, bg2, accent, team, letter) => svgJpeg(1024, 576, `<defs>${noise('n', 0.01, 4, 1, 13)}
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
    <rect width="1024" height="576" fill="url(#g)"/>
    ${Array.from({ length: 9 }, (_, i) => `<polygon points="${-200 + i * 150},576 ${-120 + i * 150},576 ${200 + i * 150},0 ${120 + i * 150},0" fill="#ffffff" opacity="0.05"/>`).join('')}
    <text x="250" y="470" font-family="DejaVu Sans" font-weight="bold" font-size="520" fill="none" stroke="${accent}" stroke-width="10" text-anchor="middle">9</text>
    <text x="262" y="458" font-family="DejaVu Sans" font-weight="bold" font-size="520" fill="#ffffff" opacity="0.92" text-anchor="middle">9</text>
    <text x="700" y="200" font-family="DejaVu Sans" font-weight="bold" font-size="92" fill="#ffffff" text-anchor="middle" letter-spacing="10">HANGAR</text>
    <rect x="470" y="240" width="460" height="14" fill="${accent}"/>
    <text x="700" y="360" font-family="DejaVu Sans" font-weight="bold" font-size="84" fill="${accent}" text-anchor="middle" letter-spacing="6">${team}</text>
    <text x="700" y="470" font-family="DejaVu Sans Mono" font-weight="bold" font-size="40" fill="#ffffff" opacity="0.8" text-anchor="middle" letter-spacing="8">SECTOR ${letter} · CARGO</text>
    ${grain(1024, 576, 'n', 0.25)}
    <rect x="8" y="8" width="1008" height="560" fill="none" stroke="#000" stroke-width="16" opacity="0.4"/>`);
  T.muralA = await mural('#0d2f6b', '#1a5fd0', '#7fc0ff', 'BLUE TEAM', 'A');
  T.muralB = await mural('#6b0d12', '#d0261a', '#ffb07f', 'RED TEAM', 'B');
  return T;
}

const mats = {};
const mat = (name, tex, mode = 'world', scale = 4) => (mats[name] = { name, tex, mode, scale, pos: [], nrm: [], uv: [], col: [], idx: [] });
const lamps = [];
const footprints = [];
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function shadeAt(x, y, z) {
  let s = 0.62 + 0.3 * clamp01(y / 6);
  for (const l of lamps) { const d2 = (x - l.x) ** 2 + (z - l.z) ** 2 + (y - l.y) ** 2 * 0.3; s += 0.22 * Math.exp(-d2 / 40); }
  if (Math.abs(z) > 18.5 && y < 3.3) s *= 0.78;
  return Math.min(1, s);
}

function quad(m, p0, p1, p2, p3, n, uvs, cols) {
  const M = mats[m], b = M.pos.length / 3;
  for (const [i, p] of [p0, p1, p2, p3].entries()) {
    M.pos.push(...p); M.nrm.push(...n); M.uv.push(...uvs[i]); M.col.push(...cols[i]);
  }
  M.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
}

function box(m, x0, y0, z0, x1, y1, z1, opts = {}) {
  const M = mats[m], tint = opts.tint || [1, 1, 1], s = M.scale;
  const faces = [
    { n: [0, 1, 0], p: [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], k: 'top' },
    { n: [0, -1, 0], p: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], k: 'bot' },
    { n: [1, 0, 0], p: [[x1, y1, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0]], k: 'x' },
    { n: [-1, 0, 0], p: [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], k: 'x' },
    { n: [0, 0, 1], p: [[x0, y1, z1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1]], k: 'z' },
    { n: [0, 0, -1], p: [[x1, y1, z0], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0]], k: 'z' },
  ];
  for (const f of faces) {
    if (opts.skip && opts.skip.includes(f.k + (f.n[0] + f.n[1] + f.n[2] > 0 ? '+' : '-'))) continue;
    if (f.k === 'bot' && y0 <= 0.001) continue;
    const uvs = f.p.map(([x, y, z]) => {
      if (M.mode === 'face') {
        const u = f.k === 'x' ? (z - z0) / (z1 - z0) : (x - x0) / (x1 - x0);
        const v = f.k === 'top' || f.k === 'bot' ? (z - z0) / (z1 - z0) : 1 - (y - y0) / (y1 - y0);
        return [u, v];
      }
      if (M.mode === 'side') {
        if (f.k === 'top' || f.k === 'bot') return [x / s, z / s];
        return [(f.k === 'x' ? z : x) / s, 1 - (y - y0) / (y1 - y0)];
      }
      if (f.k === 'top' || f.k === 'bot') return [x / s, z / s];
      return [(f.k === 'x' ? z : x) / s, -y / s];
    });
    const cols = f.p.map(([x, y, z]) => {
      const local = f.k === 'top' ? 1 : f.k === 'bot' ? 0.45 : 0.55 + 0.45 * clamp01((y - y0) / Math.max(0.01, Math.min(3, y1 - y0)));
      const k = (opts.flat ? 1 : local * shadeAt(x, y, z)) * (opts.gain || 1);
      return tint.map((c) => clamp01(c * k));
    });
    quad(m, ...f.p, f.n, uvs, cols);
  }
  if (opts.solid !== false && y0 < 1 && m !== 'light' && m !== 'Lightsurround') footprints.push([x0, z0, x1, z1]);
}

function cylinder(m, cx, cz, r, y0, y1, tint) {
  const M = mats[m], seg = 14;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const p = (a, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
    const n = [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)];
    const c = (y) => tint.map((t) => clamp01(t * (0.55 + 0.45 * (y - y0) / (y1 - y0)) * shadeAt(cx, y, cz)));
    quad(m, p(a1, y1), p(a1, y0), p(a0, y0), p(a0, y1), n, [[(i + 1) / seg * 2, 0], [(i + 1) / seg * 2, 1], [i / seg * 2, 1], [i / seg * 2, 0]], [c(y1), c(y0), c(y0), c(y1)]);
    const b = M.pos.length / 3;
    M.pos.push(cx, y1, cz, ...p(a0, y1), ...p(a1, y1)); M.nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    M.uv.push(0.5, 0.5, 0.5 + Math.cos(a0) / 2, 0.5 + Math.sin(a0) / 2, 0.5 + Math.cos(a1) / 2, 0.5 + Math.sin(a1) / 2);
    const top = tint.map((t) => clamp01(t * shadeAt(cx, y1, cz)));
    M.col.push(...top, ...top, ...top); M.idx.push(b, b + 2, b + 1);
  }
  footprints.push([cx - r, cz - r, cx + r, cz + r]);
}

const C = {
  orange: [0.95, 0.42, 0.1], teal: [0.08, 0.58, 0.6], crimson: [0.72, 0.1, 0.13], cobalt: [0.14, 0.3, 0.78],
  yellow: [0.98, 0.74, 0.12], green: [0.18, 0.52, 0.26], white: [0.92, 0.93, 0.95], grey: [0.62, 0.64, 0.66],
  blue: [0.15, 0.45, 1], red: [1, 0.2, 0.15],
};

function container(x0, z0, alongX, tint, levels = 1, color2) {
  const L = 6, W = 2.4, H = 2.6;
  const [x1, z1] = alongX ? [x0 + L, z0 + W] : [x0 + W, z0 + L];
  box('Containers', x0, 0, z0, x1, H, z1, { tint });
  if (levels > 1) box('Containers', x0 + 0.05, H, z0 + 0.05, x1 - 0.05, H * 2, z1 - 0.05, { tint: color2 || tint, solid: false });
}

function crate(x, z, size = 1.2, y = 0) { box('Crates', x - size / 2, y, z - size / 2, x + size / 2, y + size, z + size / 2, { solid: y === 0 }); }

function stairs(xBottom, dir, zA, zB) {
  const steps = 15, rise = DECK / steps, run = 0.4;
  for (let i = 1; i <= steps; i++) {
    const xa = xBottom + dir * run * (i - 1), xb = xBottom + dir * run * i;
    box('Deck', Math.min(xa, xb), 0, zA, Math.max(xa, xb), rise * i, zB, { tint: C.grey });
    const zr0 = zB > 0 && zA > 0 ? zA - 0.15 : zB, zr1 = zB > 0 && zA > 0 ? zA : zB + 0.15;
    box('PlugsBaked', Math.min(xa, xb), rise * i, zr0, Math.max(xa, xb), rise * i + 0.95, zr1, { tint: C.yellow, solid: false });
  }
  const xl = xBottom + dir * run * steps, xl2 = xl + dir * 2;
  box('Deck', Math.min(xl, xl2), 0, zA, Math.max(xl, xl2), DECK, zB, { tint: C.grey });
  const zp0 = zB > 0 && zA > 0 ? zA - 0.15 : zB, zp1 = zB > 0 && zA > 0 ? zA : zB + 0.15;
  box('PlugsBaked', Math.min(xl, xl2), DECK, zp0, Math.max(xl, xl2), DECK + 0.95, zp1, { tint: C.yellow, solid: false });
  const xe = dir > 0 ? xl2 : xl2 - 0.15;
  box('PlugsBaked', xe, DECK, Math.min(zA, zB), xe + 0.15, DECK + 0.95, Math.max(zA, zB), { tint: C.yellow, solid: false });
}

function build() {
  mat('CarpetBake4', 'floor', 'world', 4);
  mat('RoofBaked', 'roof', 'world', 4);
  mat('Walls', 'wall', 'wall', 4);
  mat('MuralA', 'muralA', 'face');
  mat('MuralB', 'muralB', 'face');
  mat('Containers', 'container', 'side', 2.6);
  mat('Steel', 'steel', 'world', 2);
  mat('Deck', 'deck', 'world', 1.5);
  mat('Crates', 'crate', 'face');
  mat('PlugsBaked', 'paint', 'world', 2);
  mat('light', 'paint', 'world', 2);
  mat('Lightsurround', 'steel', 'world', 2);

  const X = HALL.x, Z = HALL.z, H = HALL.h;
  for (const z of [-12, 0, 12]) for (const x of [-20, -10, 0, 10, 20]) lamps.push({ x, y: 9, z });
  for (const z of [-20.2, 20.2]) for (const x of [-22, -14, -6, 6, 14, 22]) lamps.push({ x, y: 3.1, z });

  const wallQuad = (p, n) => {
    const uvs = p.map(([x, y, z]) => [(Math.abs(n[0]) ? z : x) / 4, 1 - y / H]);
    const cols = p.map(([x, y, z]) => { const k = (0.5 + 0.5 * y / H) * Math.min(1, shadeAt(x, Math.min(y, 6), z) + 0.1); return [k, k, k]; });
    quad('Walls', ...p, n, uvs, cols);
  };
  for (let x = -X; x < X; x += 8) {
    wallQuad([[x, H, -Z], [x, 0, -Z], [x + 8, 0, -Z], [x + 8, H, -Z]], [0, 0, 1]);
    wallQuad([[x + 8, H, Z], [x + 8, 0, Z], [x, 0, Z], [x, H, Z]], [0, 0, -1]);
  }
  for (let z = -Z; z < Z; z += 4) {
    wallQuad([[-X, H, z + 4], [-X, 0, z + 4], [-X, 0, z], [-X, H, z]], [1, 0, 0]);
    wallQuad([[X, H, z], [X, 0, z], [X, 0, z + 4], [X, H, z + 4]], [-1, 0, 0]);
  }

  const muralQuad = (m, x, nx) => {
    const z0 = -9, z1 = 9, y0 = 1.6, y1 = 11.6, k = [0.6, 0.6, 0.6];
    const p = nx > 0 ? [[x, y1, z1], [x, y0, z1], [x, y0, z0], [x, y1, z0]] : [[x, y1, z0], [x, y0, z0], [x, y0, z1], [x, y1, z1]];
    quad(m, ...p, [nx, 0, 0], [[0, 0], [0, 1], [1, 1], [1, 0]], [k, k, k, k]);
  };
  muralQuad('MuralA', -X + 0.02, 1);
  muralQuad('MuralB', X - 0.02, -1);

  for (let x = -X; x < X; x += 8) for (let z = -Z; z < Z; z += 8) {
    const x1 = Math.min(X, x + 8), z1 = Math.min(Z, z + 8);
    quad('RoofBaked', [x, H, z], [x1, H, z], [x1, H, z1], [x, H, z1], [0, -1, 0], [[x / 4, z / 4], [x1 / 4, z / 4], [x1 / 4, z1 / 4], [x / 4, z1 / 4]], Array(4).fill([0.55, 0.58, 0.62]));
  }
  for (const z of [-8, 8]) for (let x = -24; x < 24; x += 8) box('light', x + 1, H - 0.08, z - 1.5, x + 7, H - 0.02, z + 1.5, { flat: true, solid: false });
  for (let x = -24; x <= 24; x += 8) box('Lightsurround', x - 0.25, H - 1.4, -Z, x + 0.25, H - 1.0, Z, { tint: C.grey, solid: false });
  for (const z of [-15, 0, 15]) box('Lightsurround', -X, H - 1.9, z - 0.2, X, H - 1.5, z + 0.2, { tint: C.grey, solid: false });
  for (const l of lamps) {
    if (l.y > 5) {
      box('Lightsurround', l.x - 1.7, l.y + 0.1, l.z - 0.35, l.x + 1.7, l.y + 0.3, l.z + 0.35, { tint: [0.35, 0.37, 0.4], solid: false });
      box('light', l.x - 1.5, l.y - 0.02, l.z - 0.22, l.x + 1.5, l.y + 0.1, l.z + 0.22, { flat: true, solid: false });
      box('Lightsurround', l.x - 0.02, l.y + 0.3, l.z - 0.02, l.x + 0.02, H - 1.5, l.z + 0.02, { tint: [0.2, 0.2, 0.2], solid: false });
    } else {
      box('light', l.x - 0.9, l.y - 0.06, l.z - 0.12, l.x + 0.9, l.y, l.z + 0.12, { flat: true, solid: false });
    }
  }

  for (const s of [-1, 1]) {
    const zIn = s * 18.5, zOut = s * Z;
    box('Deck', -26, DECK - 0.3, Math.min(zIn, zOut), 26, DECK, Math.max(zIn, zOut), { tint: C.grey, solid: false });
    const segs = [[-26, -24], [-22, -1.6], [1.6, 22], [24, 26]];
    for (const [a, b] of segs) box('PlugsBaked', a, DECK, s > 0 ? zIn : zIn - 0.15, b, DECK + 0.95, s > 0 ? zIn + 0.15 : zIn, { tint: C.yellow, solid: false });
    for (const xe of [-26, 25.85]) box('PlugsBaked', xe, DECK, Math.min(zIn, zOut), xe + 0.15, DECK + 0.95, Math.max(zIn, zOut), { tint: C.yellow, solid: false });
    for (const x of [-20, -12, -4, 4, 12, 20]) box('Steel', x - 0.2, 0, s > 0 ? 18.5 : -18.9, x + 0.2, DECK - 0.3, s > 0 ? 18.9 : -18.5, { tint: C.grey });
    box('PlugsBaked', -26, DECK - 0.42, s > 0 ? zIn : zIn - 0.06, 26, DECK - 0.3, s > 0 ? zIn + 0.06 : zIn, { tint: [0.95, 0.75, 0.1], flat: true, solid: false });
  }
  stairs(-16, -1, -18.5, -16.5);
  stairs(16, 1, -18.5, -16.5);
  stairs(-16, -1, 16.5, 18.5);
  stairs(16, 1, 16.5, 18.5);
  box('Deck', -1.6, DECK - 0.3, -18.5, 1.6, DECK, 18.5, { tint: C.grey, solid: false });
  box('PlugsBaked', -1.6, DECK, -18.5, -1.45, DECK + 0.95, 18.5, { tint: C.yellow, solid: false });
  box('PlugsBaked', 1.45, DECK, -18.5, 1.6, DECK + 0.95, 18.5, { tint: C.yellow, solid: false });
  box('PlugsBaked', -1.65, DECK - 0.42, -18.5, 1.65, DECK - 0.3, 18.5, { tint: [0.95, 0.75, 0.1], flat: true, solid: false });
  box('light', -0.8, DECK - 0.36, -16, 0.8, DECK - 0.3, 16, { flat: true, solid: false });

  for (const [team, sx] of [['A', -1], ['B', 1]]) {
    const tc = team === 'A' ? C.blue : C.red;
    const bx = BASES[team].x;
    box('Steel', bx - 2, 0, -2.5, bx + 2, 0.25, 2.5, { tint: [0.45, 0.47, 0.5] });
    for (const [a, b, c, d] of [[bx - 2.05, -2.55, bx + 2.05, -2.4], [bx - 2.05, 2.4, bx + 2.05, 2.55], [bx - 2.05, -2.55, bx - 1.9, 2.55], [bx + 1.9, -2.55, bx + 2.05, 2.55]]) box('PlugsBaked', a, 0, b, c, 0.27, d, { tint: tc, flat: true, gain: 1, solid: false });
    for (const px of [bx - 2.6, bx + 2.6]) for (const pz of [-3.1, 2.8]) box('Steel', px - 0.15, 0, pz, px + 0.15, 6.2, pz + 0.3, { tint: [0.3, 0.32, 0.36] });
    box('Steel', bx - 2.9, 6.2, -3.1, bx + 2.9, 6.6, -2.8, { tint: [0.3, 0.32, 0.36], solid: false });
    box('Steel', bx - 2.9, 6.2, 2.8, bx + 2.9, 6.6, 3.1, { tint: [0.3, 0.32, 0.36], solid: false });
    box('PlugsBaked', bx - 2.6, 6.05, -2.95, bx + 2.6, 6.2, -2.85, { tint: tc, flat: true, solid: false });
    box('PlugsBaked', bx - 2.6, 6.05, 2.85, bx + 2.6, 6.2, 2.95, { tint: tc, flat: true, solid: false });
    const bar = sx * 23.4;
    box('Steel', bar - 0.3, 0, 3.6, bar + 0.3, 1.15, 6.8, { tint: [0.68, 0.7, 0.72] });
    box('Steel', bar - 0.3, 0, -6.8, bar + 0.3, 1.15, -3.6, { tint: [0.68, 0.7, 0.72] });
    box('PlugsBaked', bar - 0.31, 1.0, 3.6, bar + 0.31, 1.15, 6.8, { tint: tc, flat: true, solid: false });
    box('PlugsBaked', bar - 0.31, 1.0, -6.8, bar + 0.31, 1.15, -3.6, { tint: tc, flat: true, solid: false });
    box('PlugsBaked', sx * 23.6 - 0.12, 0, -22, sx * 23.6 + 0.12, 0.012, 22, { tint: C.yellow, flat: true, solid: false });
    for (let z = -21; z < 21; z += 3) box('PlugsBaked', sx * 30.2 - 0.6, 0, z, sx * 30.2 + 0.6, 0.012, z + 1.2, { tint: tc, flat: true, solid: false });
  }

  container(-24, -12.2, true, C.teal);
  container(18, 9.8, true, C.teal);
  container(-24, 9.8, true, C.orange, 2, C.cobalt);
  container(18, -12.2, true, C.orange, 2, C.cobalt);

  container(-17, -7.7, true, C.orange);
  container(11, 5.3, true, C.orange);
  container(-9.5, -7.7, true, C.teal, 2, C.crimson);
  container(3.5, 5.3, true, C.teal, 2, C.crimson);
  container(4, -7.7, true, C.yellow);
  container(-10, 5.3, true, C.yellow);
  container(-1.2, -3, false, C.cobalt);
  container(4.8, -16, false, C.green);
  container(-7.2, 10, false, C.green);

  crate(-9, -1.5); crate(-9, -0.3); crate(-7.8, -1.5); crate(-9, -1.5, 1.0, 1.2);
  crate(9, 1.5); crate(9, 0.3); crate(7.8, 1.5); crate(9, 1.5, 1.0, 1.2);
  crate(-12, -13); crate(-12, -11.8); crate(-10.8, -13); crate(-12, -13, 1.0, 1.2);
  crate(12, 13); crate(12, 11.8); crate(10.8, 13); crate(12, 13, 1.0, 1.2);
  crate(-8, -20.6); crate(-6.8, -20.6); crate(-8, -20.6, 1.0, 1.2);
  crate(8, 20.6); crate(6.8, 20.6); crate(8, 20.6, 1.0, 1.2);
  crate(15, -20.6); crate(-15, 20.6);
  crate(-16.5, 0.5); crate(16.5, -0.5);
  for (const [x, z, t] of [[-2.6, -13, C.blue], [-1.7, -13.6, C.yellow], [-2.4, -14.3, C.red], [2.6, 13, C.blue], [1.7, 13.6, C.yellow], [2.4, 14.3, C.red], [-19.5, 3.5, C.yellow], [19.5, -3.5, C.yellow], [-19.5, -3.5, C.green], [19.5, 3.5, C.green]]) cylinder('Containers', x, z, 0.32, 0, 0.95, t);
  box('Steel', -14.5, 0, 1.6, -13.5, 1.1, 4.6, { tint: [0.68, 0.7, 0.72] });
  box('Steel', 13.5, 0, -4.6, 14.5, 1.1, -1.6, { tint: [0.68, 0.7, 0.72] });

  const G = 1, nx = (2 * X) / G, nz = (2 * Z) / G, F = mats.CarpetBake4;
  const fdist = (x, z) => {
    let d = Math.min(X - Math.abs(x), Z - Math.abs(z));
    for (const [a, b, c, e] of footprints) {
      const dx = Math.max(a - x, 0, x - c), dz = Math.max(b - z, 0, z - e);
      d = Math.min(d, Math.hypot(dx, dz));
    }
    return d;
  };
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = -X + i * G, z = -Z + j * G;
    let s = shadeAt(x, 0, z) * 0.9;
    s *= 0.55 + 0.45 * clamp01(fdist(x, z) / 1.4);
    let col = [s, s, s * 1.02];
    for (const [team, tc] of [['A', C.blue], ['B', C.red]]) {
      const b = BASES[team], g = Math.exp(-((x - b.x) ** 2 + (z - b.z) ** 2) / 60) * 0.5 + (Math.abs(x - b.x) < 6 ? 0.12 : 0);
      col = col.map((c, k) => clamp01(c * (1 - g * 0.5) + tc[k] * g * s));
    }
    F.pos.push(x, 0, z); F.nrm.push(0, 1, 0); F.uv.push(x / 4, z / 4); F.col.push(...col);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    F.idx.push(a, c, b, b, c, d);
  }
}

export async function writeArena() {
  build();
  const T = await textures();
  const doc = new Document();
  const buf = doc.createBuffer();
  const scene = doc.createScene('Arena');
  const node = doc.createNode('Hangar9');
  scene.addChild(node);
  const mesh = doc.createMesh('Hangar9');
  node.setMesh(mesh);
  const texCache = {};
  let tris = 0;
  for (const M of Object.values(mats)) {
    if (!M.idx.length) continue;
    const acc = (type, arr, ctor) => doc.createAccessor().setType(type).setArray(new ctor(arr)).setBuffer(buf);
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', acc('VEC3', M.pos, Float32Array))
      .setAttribute('NORMAL', acc('VEC3', M.nrm, Float32Array))
      .setAttribute('TEXCOORD_0', acc('VEC2', M.uv, Float32Array))
      .setAttribute('COLOR_0', acc('VEC3', M.col, Float32Array))
      .setIndices(acc('SCALAR', M.idx, Uint32Array));
    const material = doc.createMaterial(M.name).setBaseColorFactor([0, 0, 0, 1]).setEmissiveFactor([1, 1, 1]);
    if (M.name !== 'light') {
      const tex = texCache[M.tex] || (texCache[M.tex] = doc.createTexture(M.tex).setImage(new Uint8Array(T[M.tex])).setMimeType('image/jpeg'));
      material.setEmissiveTexture(tex);
    }
    prim.setMaterial(material);
    mesh.addPrimitive(prim);
    tris += M.idx.length / 3;
  }
  const io = new NodeIO();
  await io.write(path.join(OUT, 'arena.glb'), doc);
  const S = 12, w = HALL.x * 2 * S, h = HALL.z * 2 * S;
  const rect = ([a, b, c, d], fill) => `<rect x="${(a + HALL.x) * S}" y="${(b + HALL.z) * S}" width="${(c - a) * S}" height="${(d - b) * S}" fill="${fill}"/>`;
  const plan = `<rect width="${w}" height="${h}" fill="#9fa4a8"/>
    ${rect([-26, -22, 26, -18.5], '#c9b46a')}${rect([-26, 18.5, 26, 22], '#c9b46a')}${rect([-1.6, -18.5, 1.6, 18.5], '#c9b46a')}
    ${footprints.map((f) => rect(f, '#3b4148')).join('')}
    <circle cx="${(BASES.A.x + HALL.x) * S}" cy="${HALL.z * S}" r="20" fill="#3d8bff"/><circle cx="${(BASES.B.x + HALL.x) * S}" cy="${HALL.z * S}" r="20" fill="#ff4a3d"/>`;
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${plan}</svg>`)).png().toFile(path.join(OUT, 'arena-plan.png'));
  const size = fs.statSync(path.join(OUT, 'arena.glb')).size;
  console.log(`arena.glb: ${(size / 1024).toFixed(0)} KiB, ${tris} triangles, ${Object.keys(mats).length} materials, ${footprints.length} floor obstacles`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await writeArena();
