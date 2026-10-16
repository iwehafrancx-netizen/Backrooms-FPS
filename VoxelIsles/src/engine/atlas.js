import { TEAM_COLORS } from './blocks.js';

export const TILE = 16;
export const COLS = 16;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

class Tile {
  constructor(name) { this.px = new Uint8ClampedArray(TILE * TILE * 4); this.r = rng(hash(name)); }
  set(x, y, c, a = 255) { if (x < 0 || y < 0 || x >= TILE || y >= TILE) return; const i = (y * TILE + x) * 4; this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2]; this.px[i + 3] = a; }
  get(x, y) { const i = (y * TILE + x) * 4; return [this.px[i], this.px[i + 1], this.px[i + 2], this.px[i + 3]]; }
  noise(base, spread = 0.12, a = 255) { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) this.set(x, y, shade(base, 1 - spread + this.r() * spread * 2), a); return this; }
  palette(cols, a = 255) { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) this.set(x, y, cols[Math.floor(this.r() * cols.length)], a); return this; }
  specks(c, n) { for (let i = 0; i < n; i++) this.set(Math.floor(this.r() * TILE), Math.floor(this.r() * TILE), shade(c, 0.85 + this.r() * 0.3)); return this; }
  blobs(c, n, size = 2) { for (let i = 0; i < n; i++) { const x = Math.floor(this.r() * TILE), y = Math.floor(this.r() * TILE); for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) if (this.r() > 0.25) this.set((x + dx) % TILE, (y + dy) % TILE, shade(c, 0.9 + this.r() * 0.2)); } return this; }
  rect(x0, y0, w, h, c) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c); return this; }
  border(c) { for (let i = 0; i < TILE; i++) { this.set(i, 0, c); this.set(i, TILE - 1, c); this.set(0, i, c); this.set(TILE - 1, i, c); } return this; }
  clear() { this.px.fill(0); return this; }
}

const P = {
  grass: ['#5fa83a', '#6bb842', '#559c33', '#78c04a', '#4f9030'].map(hex),
  dirt: ['#8a5a36', '#7a4e2e', '#94643c', '#6e4428', '#9c6c44'].map(hex),
  stone: ['#8c8c8c', '#7f7f7f', '#999999', '#858585', '#a3a3a3'].map(hex),
  sand: ['#e3d394', '#dccb88', '#ead9a0', '#d6c47e'].map(hex),
  snow: ['#f2f6fa', '#e8eef5', '#ffffff', '#dfe8f0'].map(hex),
};

const T = {};
T.dirt = (t) => t.palette(P.dirt).specks(hex('#5c3a20'), 10);
T.grass_top = (t) => t.palette(P.grass).specks(hex('#8ad05a'), 14).specks(hex('#447f28'), 10);
T.grass_side = (t) => { T.dirt(t); for (let x = 0; x < TILE; x++) { const d = 3 + Math.floor(t.r() * 3); for (let y = 0; y < d; y++) t.set(x, y, P.grass[Math.floor(t.r() * P.grass.length)]); } return t; };
T.stone = (t) => t.palette(P.stone).blobs(hex('#727272'), 7, 3).specks(hex('#b0b0b0'), 8);
T.cobble = (t) => { t.noise(hex('#7a7a7a'), 0.1); for (let i = 0; i < 9; i++) { const x = Math.floor(t.r() * 13), y = Math.floor(t.r() * 13), w = 3 + Math.floor(t.r() * 3); t.rect(x, y, w, w - 1, shade(hex('#9a9a9a'), 0.9 + t.r() * 0.25)); } for (let i = 0; i < 26; i++) t.set(Math.floor(t.r() * 16), Math.floor(t.r() * 16), hex('#555555')); return t; };
T.planks = (t) => { t.noise(hex('#b4874c'), 0.08); for (let y = 0; y < TILE; y += 4) { for (let x = 0; x < TILE; x++) t.set(x, y, hex('#7d5a2e')); const off = (y / 4) % 2 ? 4 : 12; t.set(off, y + 1, hex('#7d5a2e')); t.set(off, y + 2, hex('#7d5a2e')); t.set(off, y + 3, hex('#7d5a2e')); } return t.specks(hex('#9c7340'), 12); };
T.log_side = (t) => { for (let x = 0; x < TILE; x++) { const c = shade(hex('#6b4a2b'), x % 4 === 0 ? 0.75 : 0.95 + t.r() * 0.15); for (let y = 0; y < TILE; y++) t.set(x, y, shade(c, 0.94 + t.r() * 0.1)); } return t; };
T.log_top = (t) => { t.noise(hex('#b08a54'), 0.06); for (let r = 0; r < 8; r++) { const c = r % 2 ? hex('#9a7444') : hex('#c09a62'); for (let a = 0; a < 64; a++) { const x = Math.round(7.5 + Math.cos(a / 10.2) * r), y = Math.round(7.5 + Math.sin(a / 10.2) * r); t.set(x, y, c); } } return t.border(hex('#6b4a2b')); };
T.leaves = (t) => { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const v = t.r(); if (v < 0.16) t.set(x, y, [0, 0, 0], 0); else t.set(x, y, shade(hex('#3f8f2a'), 0.7 + v * 0.5)); } return t; };
T.sand = (t) => t.palette(P.sand).specks(hex('#c2b070'), 10);
T.sandstone_side = (t) => { t.palette(P.sand); for (const y of [0, 5, 11]) for (let x = 0; x < TILE; x++) t.set(x, y, hex('#c7b46e')); return t.specks(hex('#cbb878'), 8); };
T.sandstone_top = (t) => t.palette(P.sand).border(hex('#cbb878'));
T.snow = (t) => t.palette(P.snow).specks(hex('#d0dce8'), 6);
T.snow_side = (t) => { T.dirt(t); for (let x = 0; x < TILE; x++) { const d = 3 + Math.floor(t.r() * 3); for (let y = 0; y < d; y++) t.set(x, y, P.snow[Math.floor(t.r() * P.snow.length)]); } return t; };
T.ice = (t) => { t.noise(hex('#a9d4f5'), 0.06, 200); for (let i = 0; i < 4; i++) { const x = Math.floor(t.r() * 12); for (let k = 0; k < 5; k++) t.set(x + k, 3 + i * 3 + (k % 2), hex('#e6f4ff'), 220); } return t; };
T.glass = (t) => { t.clear(); t.border(hex('#cfe8f2')); t.set(3, 3, hex('#ffffff')); t.set(4, 4, hex('#ffffff')); t.set(4, 3, hex('#ffffff')); t.set(10, 9, hex('#e8f6ff')); t.set(11, 10, hex('#e8f6ff')); return t; };
T.obsidian = (t) => t.noise(hex('#231a33'), 0.15).blobs(hex('#3a2a55'), 6, 2).specks(hex('#5a3a8a'), 6);
const metal = (base, light, dark) => (t) => { t.noise(hex(base), 0.05); t.rect(1, 1, 14, 1, hex(light)); t.rect(1, 1, 1, 14, hex(light)); t.rect(1, 14, 14, 1, hex(dark)); t.rect(14, 1, 1, 14, hex(dark)); t.border(hex(dark)); return t.specks(hex(light), 6); };
T.gold_block = metal('#f5cf3d', '#fff3a0', '#c89a1a');
T.iron_block = metal('#d8d8d8', '#ffffff', '#a8a8a8');
T.diamond_block = metal('#5fe0d8', '#c8fffb', '#2aa8a0');
T.chest_side = (t) => { t.noise(hex('#9a6a32'), 0.08); for (let y = 0; y < TILE; y += 5) for (let x = 0; x < TILE; x++) t.set(x, y, hex('#5e3e18')); t.border(hex('#4a3010')); t.rect(7, 5, 2, 4, hex('#d8d8d8')); t.set(7, 8, hex('#7a7a7a')); return t; };
T.chest_top = (t) => { t.noise(hex('#a8743a'), 0.08); t.border(hex('#4a3010')); for (let x = 1; x < 15; x++) t.set(x, 7, hex('#6e4a20')); return t; };
T.basalt_side = (t) => { for (let x = 0; x < TILE; x++) { const k = x % 3 === 0 ? 0.7 : 0.95 + t.r() * 0.15; for (let y = 0; y < TILE; y++) t.set(x, y, shade(hex('#3e3c42'), k * (0.92 + t.r() * 0.12))); } return t; };
T.basalt_top = (t) => t.noise(hex('#4a474e'), 0.12).blobs(hex('#2e2c32'), 5, 3);
T.magma = (t) => { t.noise(hex('#7a2a12'), 0.15); for (let i = 0; i < 6; i++) { let x = Math.floor(t.r() * 16), y = Math.floor(t.r() * 16); for (let k = 0; k < 7; k++) { t.set(x, y, k % 2 ? hex('#ffb040') : hex('#ff7a1e')); x += Math.round(t.r() * 2 - 1); y += 1; } } return t; };
T.moonstone = (t) => t.palette(['#efe9b8', '#e6dfa8', '#f5f0c8', '#ddd59a'].map(hex)).blobs(hex('#cfc68a'), 6, 2);
T.bricks = (t) => { t.noise(hex('#a1503a'), 0.1); for (let y = 0; y < TILE; y += 4) { for (let x = 0; x < TILE; x++) t.set(x, y, hex('#c8bba8')); const off = (y / 4) % 2 ? 0 : 8; for (let k = 1; k < 4; k++) { t.set(off, y + k, hex('#c8bba8')); t.set((off + 8) % 16, y + k, hex('#c8bba8')); } } return t; };
T.terracotta = (t) => t.noise(hex('#b06a48'), 0.07).specks(hex('#9a5a3a'), 10);
T.core = (t) => t.noise(hex('#2a2a30'), 0.25).specks(hex('#4a4a55'), 14).specks(hex('#111114'), 10);
const ore = (fleck) => (t) => { T.stone(t); for (let i = 0; i < 6; i++) { const x = 1 + Math.floor(t.r() * 13), y = 1 + Math.floor(t.r() * 13); t.set(x, y, hex(fleck)); t.set(x + 1, y, shade(hex(fleck), 0.8)); t.set(x, y + 1, shade(hex(fleck), 1.15)); } return t; };
T.iron_ore = ore('#e0b090');
T.gold_ore = ore('#f5d53d');
T.diamond_ore = ore('#5fe8e0');
T.lantern = (t) => { t.noise(hex('#3a3a3a'), 0.1); t.rect(3, 3, 10, 10, hex('#ffd27a')); t.rect(5, 5, 6, 6, hex('#fff2c0')); return t.border(hex('#2a2a2a')); };
T.mossy = (t) => { T.cobble(t); return t.blobs(hex('#4f7a3a'), 9, 2); };
T.pumpkin_side = (t) => { for (let x = 0; x < TILE; x++) { const k = x % 4 === 0 ? 0.8 : 1; for (let y = 0; y < TILE; y++) t.set(x, y, shade(hex('#e08a1e'), k * (0.92 + t.r() * 0.12))); } return t; };
T.pumpkin_top = (t) => { t.noise(hex('#d07a18'), 0.1); t.rect(7, 7, 2, 2, hex('#5a7a2a')); return t; };
const wool = (c) => (t) => { t.noise(hex(c), 0.07); for (let i = 0; i < 18; i++) { const x = Math.floor(t.r() * 15), y = Math.floor(t.r() * 16); t.set(x, y, shade(hex(c), 0.85)); t.set(x + 1, y, shade(hex(c), 1.1)); } return t; };
for (const tc of TEAM_COLORS) T[`wool_${tc.id}`] = wool(tc.hex);
T.wool_white = wool('#eeeeee');
const cross = (draw) => (t) => { t.clear(); draw(t); return t; };
T.tallgrass = cross((t) => { for (let i = 0; i < 9; i++) { const x = 1 + Math.floor(t.r() * 14), h = 5 + Math.floor(t.r() * 9); for (let y = 0; y < h; y++) t.set(x + (y > h - 3 ? (i % 2 ? 1 : -1) : 0), 15 - y, shade(hex('#6bbf3a'), 0.7 + t.r() * 0.5)); } });
const flower = (petal) => cross((t) => { for (let y = 6; y < 16; y++) t.set(7, y, hex('#3f8f2a')); t.set(6, 11, hex('#3f8f2a')); t.set(5, 10, hex('#3f8f2a')); t.set(8, 12, hex('#3f8f2a')); t.set(9, 11, hex('#3f8f2a')); for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) t.set(7 + dx, 4 + dy, shade(hex(petal), 0.85 + t.r() * 0.3)); t.set(7, 4, hex('#f5e050')); });
T.flower_red = flower('#e23c3c');
T.flower_yellow = flower('#f2d22e');
T.deadbush = cross((t) => { const c = hex('#8a6a3a'); for (let y = 8; y < 16; y++) t.set(7, y, c); for (let k = 0; k < 4; k++) { t.set(7 - k, 8 - k, c); t.set(8 + k, 9 - k, c); t.set(6 - k, 12 - k, c); t.set(9 + k, 12 - k, c); } });
T.cactus_side = (t) => { t.noise(hex('#4f8a2a'), 0.08); for (let y = 0; y < TILE; y++) { t.set(1, y, hex('#3a6a1e')); t.set(14, y, hex('#3a6a1e')); } for (let i = 0; i < 6; i++) t.set(2 + Math.floor(t.r() * 12), Math.floor(t.r() * 16), hex('#e8e0a0')); return t; };
T.cactus_top = (t) => t.noise(hex('#5a9a32'), 0.08).border(hex('#3a6a1e'));
const brickRows = (t, base, mortar, rowH = 4, w = 8) => { t.noise(hex(base), 0.08); for (let y = 0; y < TILE; y += rowH) { for (let x = 0; x < TILE; x++) t.set(x, y + rowH - 1, hex(mortar)); const off = (y / rowH) % 2 ? 0 : w / 2; for (let k = 0; k < rowH; k++) for (let x = off; x < TILE; x += w) t.set(x, y + k, hex(mortar)); } return t; };
T.stonebrick = (t) => { brickRows(t, '#8a8a8e', '#5e5e62', 8, 16); for (let y = 0; y < 16; y += 8) for (let x = 0; x < 16; x++) t.set(x, y, shade(hex('#a6a6aa'), 0.95 + t.r() * 0.1)); return t.specks(hex('#76767a'), 14); };
T.stonebrick_mossy = (t) => { T.stonebrick(t); return t.blobs(hex('#5a7a42'), 8, 2).specks(hex('#4a6a32'), 10); };
T.stonebrick_cracked = (t) => { T.stonebrick(t); let x = 3, y = 1; for (let k = 0; k < 14; k++) { t.set(x, y, hex('#3e3e42')); x += Math.round(t.r() * 2 - 0.6); y++; } x = 12; y = 9; for (let k = 0; k < 6; k++) { t.set(x, y, hex('#3e3e42')); x--; y += t.r() > 0.5 ? 1 : 0; } return t; };
T.planks_dark = (t) => { t.noise(hex('#5a3c22'), 0.08); for (let y = 0; y < TILE; y += 4) { for (let x = 0; x < TILE; x++) t.set(x, y, hex('#3a2614')); const off = (y / 4) % 2 ? 5 : 11; for (let k = 1; k < 4; k++) t.set(off, y + k, hex('#3a2614')); } return t.specks(hex('#6a4a2c'), 12); };
T.whitestone_side = (t) => { t.noise(hex('#ece6da'), 0.04); for (let y = 0; y < TILE; y++) { t.set(0, y, hex('#d2cabb')); t.set(15, y, hex('#d2cabb')); t.set(3, y, hex('#f8f4ea')); } return t; };
T.whitestone_top = (t) => t.noise(hex('#ece6da'), 0.04).border(hex('#d2cabb')).rect(4, 4, 8, 8, hex('#f4efe4'));
T.polished = (t) => t.noise(hex('#9a9c9e'), 0.05).border(hex('#7a7c7e')).specks(hex('#b0b2b4'), 8);
T.roof = (t) => { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const row = Math.floor(y / 4), off = row % 2 ? 2 : 0, edge = (x + off) % 4 === 0 || y % 4 === 3; t.set(x, y, shade(hex('#8a3a2e'), edge ? 0.7 : 0.92 + t.r() * 0.16)); } return t; };
T.ironbars = (t) => { t.clear(); for (const x of [1, 5, 10, 14]) for (let y = 0; y < TILE; y++) t.set(x, y, shade(hex('#9a9a9a'), 0.85 + t.r() * 0.3)); for (const y of [0, 15]) for (let x = 0; x < TILE; x++) t.set(x, y, hex('#7a7a7a')); return t; };
T.hay_side = (t) => { for (let x = 0; x < TILE; x++) for (let y = 0; y < TILE; y++) t.set(x, y, shade(hex('#d8b43a'), (y % 5 === 0 ? 0.75 : 0.9) + t.r() * 0.2)); for (const y of [3, 12]) for (let x = 0; x < TILE; x++) t.set(x, y, hex('#8a2a1e')); return t; };
T.hay_top = (t) => { t.noise(hex('#c8a42e'), 0.12); for (let r = 1; r < 8; r += 2) for (let a = 0; a < 40; a++) t.set(Math.round(7.5 + Math.cos(a / 6.4) * r), Math.round(7.5 + Math.sin(a / 6.4) * r), hex('#a8841e')); return t; };
T.bookshelf = (t) => { t.noise(hex('#8a5a32'), 0.06); const cols = ['#a83a2a', '#2a5aa8', '#3a8a3a', '#d8b43a', '#6a3a8a', '#2a2a2a']; for (const y0 of [1, 9]) { t.rect(0, y0 - 1, 16, 1, hex('#5a3a1a')); for (let x = 1; x < 15; x++) { const c = hex(cols[Math.floor(t.r() * cols.length)]); const h = 5 + Math.floor(t.r() * 2); for (let y = 0; y < h; y++) t.set(x, y0 + 6 - y, shade(c, 0.85 + t.r() * 0.2)); } } return t.border(hex('#5a3a1a')); };
T.portal = (t) => { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const v = Math.sin(x * 0.9 + y * 0.4) + Math.sin(y * 1.1 - x * 0.3) + t.r() * 0.8; t.set(x, y, mix(hex('#4a1a9a'), hex('#c87aff'), Math.max(0, Math.min(1, (v + 2) / 4.8))), 210); } return t; };
T.checkpoint = (t) => t.noise(hex('#ffd84a'), 0.08).border(hex('#c89a1a')).rect(6, 6, 4, 4, hex('#fff3a0'));
T.finish = (t) => { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) t.set(x, y, (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? hex('#1a1a1a') : hex('#f4f4f4')); return t; };
T.button = (t) => t.noise(hex('#d83a2a'), 0.08).border(hex('#8a1a12'));
T.bounce_top = (t) => { t.noise(hex('#5fd34a'), 0.08); t.rect(3, 3, 10, 10, hex('#8ff07a')); t.rect(6, 6, 4, 4, hex('#c8ffb8')); return t.border(hex('#2a8a1e')); };
T.bounce_side = (t) => { t.noise(hex('#4fbf3a'), 0.08); for (let x = 0; x < TILE; x++) t.set(x, 0, hex('#8ff07a')); for (let y = 4; y < TILE; y += 4) for (let x = 0; x < TILE; x++) t.set(x, y, hex('#3a9a2a')); return t; };
T.flagbase_top = (t) => { t.noise(hex('#ece6da'), 0.04).border(hex('#c8a42e')); t.rect(5, 5, 6, 6, hex('#c8a42e')); return t.rect(7, 7, 2, 2, hex('#fff3a0')); };
T.trapfloor = (t) => { T.planks(t); return t.specks(hex('#8a6a3a'), 4); };
T.seastone = (t) => t.palette(['#5aa8a0', '#4a9890', '#6ab8ae', '#3f8a84'].map(hex)).blobs(hex('#2f6a66'), 5, 2);
T.redsand_side = (t) => { t.palette(['#c86a3a', '#b85e30', '#d47a48'].map(hex)); for (const y of [0, 5, 11]) for (let x = 0; x < TILE; x++) t.set(x, y, hex('#a8542a')); return t; };
T.redsand_top = (t) => t.palette(['#c86a3a', '#b85e30', '#d47a48'].map(hex)).border(hex('#a8542a'));
T.lavarock = (t) => { t.noise(hex('#d8501a'), 0.1); for (let i = 0; i < 8; i++) { let x = Math.floor(t.r() * 16), y = Math.floor(t.r() * 16); for (let k = 0; k < 6; k++) { t.set(x, y, hex('#ffd060')); x = (x + 1) % 16; y = (y + Math.round(t.r())) % 16; } } return t; };
T.crack0 = (t) => crack(t, 3); T.crack1 = (t) => crack(t, 6); T.crack2 = (t) => crack(t, 10); T.crack3 = (t) => crack(t, 15);
function crack(t, n) { t.clear(); for (let i = 0; i < n; i++) { let x = 8, y = 8, a = t.r() * Math.PI * 2; for (let k = 0; k < 8; k++) { t.set(Math.round(x), Math.round(y), [20, 20, 20], 170); x += Math.cos(a); y += Math.sin(a); a += (t.r() - 0.5) * 1.2; } } return t; }

export function buildAtlas(extra = {}) {
  const names = [...Object.keys(T), ...Object.keys(extra)];
  const rows = Math.ceil(names.length / COLS);
  const size = TILE * COLS, h = TILE * Math.max(COLS, rows);
  const data = new Uint8ClampedArray(size * h * 4);
  const index = {};
  names.forEach((n, i) => {
    const t = new Tile(n);
    (T[n] || extra[n])(t, { hex, shade, mix });
    const ox = (i % COLS) * TILE, oy = Math.floor(i / COLS) * TILE;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const s = (y * TILE + x) * 4, d = ((oy + y) * size + ox + x) * 4; data[d] = t.px[s]; data[d + 1] = t.px[s + 1]; data[d + 2] = t.px[s + 2]; data[d + 3] = t.px[s + 3]; }
    index[n] = i;
  });
  return { data, width: size, height: h, index, uv: (name) => { const i = index[name] ?? 0; return [(i % COLS) / COLS, Math.floor(i / COLS) / (h / TILE), 1 / COLS, 1 / (h / TILE)]; } };
}

export { Tile, hex, shade, mix, rng, hash };
