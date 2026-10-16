import { BLOCKS } from '../engine/blocks.js';
import { ITEMS } from '../game/items.js';
import { paintSkin } from '../game/models.js';

let src = null, A = null;
const cache = new Map();

export function initIcons(atlas) {
  A = atlas;
  src = document.createElement('canvas'); src.width = atlas.width; src.height = atlas.height;
  src.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(atlas.data), atlas.width, atlas.height), 0, 0);
}
const at = (name) => { const [u, v] = A.uv(name); return [Math.round(u * A.width), Math.round(v * A.height)]; };

export function icon(id) {
  if (cache.has(id)) return cache.get(id);
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const it = ITEMS[id];
  if (it && it.kind === 'block' && !BLOCKS[it.block].cross) {
    const b = BLOCKS[it.block];
    const face = (name, m, dark) => { const [x, y] = at(name); g.setTransform(...m); g.drawImage(src, x, y, 16, 16, -0.02, -0.02, 16.04, 16.04); if (dark) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(0,0,0,${dark})`; g.fillRect(0, 0, 16, 16); g.globalCompositeOperation = 'source-over'; } };
    face(b.tex.side, [22 / 16, 11 / 16, 0, 24 / 16, 2, 12], 0);
    face(b.tex.side, [22 / 16, -11 / 16, 0, 24 / 16, 24, 23], 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const shadeL = document.createElement('canvas'); shadeL.width = shadeL.height = 48;
    const s = shadeL.getContext('2d');
    s.fillStyle = 'rgba(0,0,0,0.22)'; s.beginPath(); s.moveTo(2, 12); s.lineTo(24, 23); s.lineTo(24, 47); s.lineTo(2, 36); s.fill();
    s.fillStyle = 'rgba(0,0,0,0.4)'; s.beginPath(); s.moveTo(24, 23); s.lineTo(46, 12); s.lineTo(46, 36); s.lineTo(24, 47); s.fill();
    g.globalCompositeOperation = 'source-atop'; g.drawImage(shadeL, 0, 0); g.globalCompositeOperation = 'source-over';
    face(b.tex.top, [22 / 16, -11 / 16, 22 / 16, 11 / 16, 2, 12], 0);
  } else {
    const [x, y] = at(it ? (it.kind === 'block' ? BLOCKS[it.block].tex.side : it.icon) : 'snowball');
    g.drawImage(src, x, y, 16, 16, 0, 0, 48, 48);
  }
  const url = c.toDataURL();
  cache.set(id, url);
  return url;
}

const skinCache = new Map();
export function skinFront(seed, team = -1) {
  const k = seed + ':' + team;
  if (skinCache.has(k)) return skinCache.get(k);
  const s = paintSkin(seed, team).image;
  const c = document.createElement('canvas'); c.width = 16; c.height = 32;
  const g = c.getContext('2d');
  g.drawImage(s, 8, 8, 8, 8, 4, 0, 8, 8);
  g.drawImage(s, 20, 20, 8, 12, 4, 8, 8, 12);
  g.drawImage(s, 44, 20, 4, 12, 0, 8, 4, 12);
  g.drawImage(s, 44, 20, 4, 12, 12, 8, 4, 12);
  g.drawImage(s, 4, 20, 4, 12, 4, 20, 4, 12);
  g.drawImage(s, 4, 20, 4, 12, 8, 20, 4, 12);
  const url = c.toDataURL();
  skinCache.set(k, url);
  return url;
}

const PIX = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  armor: ['##.##', '#####', '.###.', '.###.', '.###.'],
};
export function pixIcon(kind, fill, empty, half = false) {
  const key = kind + fill + empty + half;
  if (cache.has(key)) return cache.get(key);
  const p = PIX[kind], W = p[0].length, H = p.length, S = 3;
  const c = document.createElement('canvas'); c.width = (W + 2) * S; c.height = (H + 2) * S;
  const g = c.getContext('2d');
  const on = (x, y) => y >= 0 && y < H && x >= 0 && x < W && p[y][x] === '#';
  for (let y = -1; y <= H; y++) for (let x = -1; x <= W; x++) {
    if (on(x, y)) { g.fillStyle = half && x >= W / 2 ? empty : fill; g.fillRect((x + 1) * S, (y + 1) * S, S, S); }
    else if (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1)) { g.fillStyle = '#111'; g.fillRect((x + 1) * S, (y + 1) * S, S, S); }
  }
  if (fill !== empty) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(2 * S, 2 * S, S, S); }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function eggIcon(color) {
  const key = 'egg' + color;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = 24; c.height = 28;
  const g = c.getContext('2d');
  g.fillStyle = '#111'; g.beginPath(); g.ellipse(12, 15, 10, 12.5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = color; g.beginPath(); g.ellipse(12, 15, 8, 10.5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(9, 10, 2.2, 3.4, -0.4, 0, Math.PI * 2); g.fill();
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function flagIcon(color) {
  const key = 'flag' + color;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = 24; c.height = 28;
  const g = c.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(3, 1, 5, 27); g.fillRect(6, 2, 17, 14);
  g.fillStyle = '#d8d8d8'; g.fillRect(4, 2, 3, 25);
  g.fillStyle = color; g.fillRect(7, 3, 15, 12);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(7, 3, 15, 3);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
