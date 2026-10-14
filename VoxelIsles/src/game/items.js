import { BLOCKS } from '../engine/blocks.js';

export const TIERS = ['wood', 'stone', 'iron', 'diamond'];
const TIER_COL = { wood: ['#a9824a', '#7a5a2e'], stone: ['#9a9a9a', '#6a6a6a'], iron: ['#e8e8e8', '#a8a8a8'], diamond: ['#6ff0e8', '#2aa8a0'], leather: ['#9a5a30', '#6a3a1a'], chain: ['#b8b8c0', '#70707a'], gold: ['#ffd84a', '#c89a1a'] };
export const ARMOR_TIERS = ['leather', 'chain', 'iron', 'diamond'];
export const ARMOR_SLOTS = ['helmet', 'chest', 'legs', 'boots'];
const ARMOR_PTS = { leather: [1, 3, 2, 1], chain: [2, 5, 4, 1], iron: [2, 6, 5, 2], diamond: [3, 8, 6, 3] };

export const ITEMS = {};
const item = (id, o) => { ITEMS[id] = { id, stack: 64, ...o }; };

for (const b of BLOCKS) if (b) item(b.id, { name: b.name, kind: 'block', block: b.id, icon: null });
TIERS.forEach((t, i) => item(100 + i, { name: `${t[0].toUpperCase() + t.slice(1)} Sword`, kind: 'sword', tier: i, damage: [4, 5, 6, 7][i], stack: 1, icon: `sword_${t}` }));
TIERS.forEach((t, i) => item(110 + i, { name: `${t[0].toUpperCase() + t.slice(1)} Pickaxe`, kind: 'pick', tier: i, damage: 2 + i * 0.5, speed: [2, 3.5, 5, 7][i], stack: 1, icon: `pick_${t}` }));
TIERS.forEach((t, i) => item(120 + i, { name: `${t[0].toUpperCase() + t.slice(1)} Axe`, kind: 'axe', tier: i, damage: [3, 4, 5, 6][i], speed: [2, 3.5, 5, 7][i], stack: 1, icon: `axe_${t}` }));
item(130, { name: 'Golden Apple', kind: 'food', heal: 8, stack: 16, icon: 'gapple' });
item(131, { name: 'Snowball', kind: 'throw', stack: 16, icon: 'snowball' });
item(132, { name: 'Warp Orb', kind: 'warp', stack: 8, icon: 'orb' });
item(133, { name: 'Apple', kind: 'food', heal: 4, stack: 16, icon: 'apple' });
ARMOR_TIERS.forEach((t, ti) => ARMOR_SLOTS.forEach((s, si) => item(150 + ti * 4 + si, { name: `${t[0].toUpperCase() + t.slice(1)} ${s[0].toUpperCase() + s.slice(1)}`, kind: 'armor', tier: ti, slot: si, points: ARMOR_PTS[t][si], stack: 1, icon: `armor_${t}_${s}` })));
item(170, { name: 'Iron', kind: 'currency', stack: 64, icon: 'ingot_iron' });
item(171, { name: 'Gold', kind: 'currency', stack: 64, icon: 'ingot_gold' });
item(172, { name: 'Diamond', kind: 'currency', stack: 64, icon: 'gem' });
item(180, { name: 'Shears', kind: 'shears', speed: 6, stack: 1, damage: 1, icon: 'shears' });

export const isBlockItem = (id) => id > 0 && id < 100;
export const itemName = (id) => (ITEMS[id] ? ITEMS[id].name : '');

const draw = (pts, c) => (t, h) => { for (const [x, y, k] of pts) t.set(x, y, h.shade(h.hex(c[k || 0] || c[0]), 1)); };
function line(x0, y0, x1, y1) { const out = []; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) out.push([Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n)]); return out; }

export function itemTiles() {
  const T = {};
  const stick = (t, h) => { for (const [x, y] of line(2, 13, 6, 9)) { t.set(x, y, h.hex('#6a4a2a')); t.set(x + 1, y, h.hex('#8a6a3a')); } };
  for (const tier of TIERS) {
    const [a, b] = TIER_COL[tier];
    T[`sword_${tier}`] = (t, h) => { t.clear(); for (const [x, y] of line(5, 10, 13, 2)) { t.set(x, y, h.hex(a)); t.set(x + 1, y + 1, h.hex(b)); t.set(x, y + 1, h.hex(b)); } for (const [x, y] of line(3, 8, 7, 12)) t.set(x, y, h.hex('#4a3a2a')); for (const [x, y] of line(1, 14, 4, 11)) { t.set(x, y, h.hex('#6a4a2a')); t.set(x + 1, y, h.hex('#8a6a3a')); } t.set(14, 1, h.hex(a)); };
    T[`pick_${tier}`] = (t, h) => { t.clear(); stick(t, h); for (const [x, y] of line(6, 9, 11, 4)) { t.set(x, y, h.hex('#6a4a2a')); t.set(x + 1, y, h.hex('#8a6a3a')); } for (const [x, y] of [[4, 4], [5, 3], [6, 2], [7, 2], [8, 2], [9, 2], [10, 3], [11, 4], [12, 5], [13, 6], [13, 7], [12, 8], [5, 4], [9, 3], [12, 6]]) t.set(x, y, h.hex(x > 8 && y > 4 ? b : a)); };
    T[`axe_${tier}`] = (t, h) => { t.clear(); stick(t, h); for (const [x, y] of line(6, 9, 11, 4)) { t.set(x, y, h.hex('#6a4a2a')); t.set(x + 1, y, h.hex('#8a6a3a')); } for (let y = 2; y < 8; y++) for (let x = 8; x < 14; x++) if (x - 8 + (7 - y) < 7 && !(x === 13 && y > 5)) t.set(x, y, h.hex(x > 11 ? b : a)); };
  }
  T.gapple = (t, h) => apple(t, h, '#ffd84a', '#c89a1a');
  T.apple = (t, h) => apple(t, h, '#e23c3c', '#a01e1e');
  function apple(t, h, a, b) { t.clear(); for (let y = 4; y < 14; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot(x - 7.5, (y - 8.8) * 1.05); if (d < 5) t.set(x, y, h.hex(d > 3.6 || (x > 8 && y > 9) ? b : a)); } t.set(6, 6, h.hex('#ffffff')); t.set(7, 2, h.hex('#5a3a1a')); t.set(7, 3, h.hex('#5a3a1a')); t.set(8, 2, h.hex('#3f8f2a')); t.set(9, 1, h.hex('#3f8f2a')); }
  T.snowball = (t, h) => { t.clear(); for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 4.8) t.set(x, y, h.hex(d > 3.8 || (x > 8 && y > 8) ? '#b8c8d8' : '#f4faff')); } };
  T.orb = (t, h) => { t.clear(); for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 4.8) t.set(x, y, h.hex(d > 3.8 ? '#1a5a5a' : d > 2 ? '#2aa8a0' : '#9ff0e8')); } t.set(6, 6, h.hex('#ffffff')); };
  for (const tier of ARMOR_TIERS) {
    const [a, b] = TIER_COL[tier];
    const shapes = {
      helmet: [[3, 4, 10, 2], [3, 6, 2, 4], [11, 6, 2, 4]],
      chest: [[2, 3, 4, 3], [10, 3, 4, 3], [4, 5, 8, 8]],
      legs: [[4, 3, 8, 3], [4, 6, 3, 8], [9, 6, 3, 8]],
      boots: [[3, 8, 3, 5], [10, 8, 3, 5], [2, 12, 4, 2], [10, 12, 4, 2]],
    };
    for (const s of ARMOR_SLOTS) T[`armor_${tier}_${s}`] = (t, h) => { t.clear(); for (const [x, y, w, hh] of shapes[s]) for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + w; xx++) t.set(xx, yy, h.hex((xx + yy) % 5 === 0 ? b : a)); for (const [x, y, w, hh] of shapes[s]) { for (let xx = x; xx < x + w; xx++) t.set(xx, y + hh - 1, h.hex(b)); } };
  }
  const ingot = (a, b) => (t, h) => { t.clear(); for (let y = 6; y < 12; y++) for (let x = 2 + (11 - y); x < 14 - (y - 6) * 0.3; x++) t.set(x, y, h.hex(y === 6 || x < 4 + (11 - y) ? '#ffffff' : y > 9 ? b : a)); };
  T.ingot_iron = ingot('#d8d8d8', '#9a9a9a');
  T.ingot_gold = ingot('#ffd84a', '#c89a1a');
  T.gem = (t, h) => { t.clear(); const pts = [[7, 2], [8, 2], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [6, 10], [7, 10], [8, 10], [9, 10], [7, 12], [8, 12]]; for (const [x, y] of pts) { t.set(x, y, h.hex(x < 7 ? '#c8fffb' : '#5fe0d8')); t.set(x, y + 1, h.hex(x < 7 ? '#5fe0d8' : '#2aa8a0')); } };
  T.shears = (t, h) => { t.clear(); for (const [x, y] of line(3, 12, 11, 4)) t.set(x, y, h.hex('#d8d8d8')); for (const [x, y] of line(5, 12, 13, 4)) t.set(x, y, h.hex('#a8a8a8')); for (const [x, y] of [[2, 12], [3, 13], [2, 13], [5, 13], [6, 13]]) t.set(x, y, h.hex('#c8302a')); };
  for (const k of Object.keys(T)) { const f = T[k]; T[k] = (t, h) => { f(t, h); return t; }; }
  return T;
}

export const ARMOR_ID = (tier, slot) => 150 + tier * 4 + slot;
