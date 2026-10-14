export const SKINS = [
  { id: 0, seed: 1, price: 0 }, { id: 1, seed: 77, price: 0 }, { id: 2, seed: 311, price: 150 }, { id: 3, seed: 902, price: 150 },
  { id: 4, seed: 1450, price: 250 }, { id: 5, seed: 2203, price: 250 }, { id: 6, seed: 3517, price: 400 }, { id: 7, seed: 4099, price: 400 },
  { id: 8, seed: 5821, price: 600 }, { id: 9, seed: 7013, price: 600 }, { id: 10, seed: 8888, price: 900 }, { id: 11, seed: 9601, price: 900 },
];

export const DEFAULT_SETTINGS = { sens: 1, fov: 75, quality: 'auto', volume: 0.8, music: 0.5, lang: 'auto', invert: false, viewBob: true };

export const levelXp = (lv) => 100 + (lv - 1) * 60;

export class Save {
  constructor(platform) {
    this.p = platform;
    this.data = { v: 1, coins: 0, xp: 0, level: 1, skin: 0, owned: [0, 1], stats: { games: 0, wins: 0, kills: 0, deaths: 0, eggs: 0 }, best: {}, settings: { ...DEFAULT_SETTINGS }, tutorial: false };
  }
  async load() {
    try {
      const raw = await this.p.loadData();
      if (raw) { const d = JSON.parse(raw); if (d && d.v === 1) this.data = { ...this.data, ...d, stats: { ...this.data.stats, ...(d.stats || {}) }, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } }; }
    } catch (e) {}
    this.data.coins = Math.max(0, this.data.coins | 0);
    if (!Array.isArray(this.data.owned)) this.data.owned = [0, 1];
    if (!this.data.owned.includes(this.data.skin)) this.data.skin = 0;
  }
  persist() { clearTimeout(this.t); this.t = setTimeout(() => this.p.saveData(JSON.stringify(this.data)), 250); }
  get settings() { return this.data.settings; }
  addXp(n) {
    const d = this.data; d.xp += n; let up = 0;
    while (d.xp >= levelXp(d.level)) { d.xp -= levelXp(d.level); d.level++; up++; d.coins += 25; }
    return up;
  }
}
