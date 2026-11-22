// Progress: stars per level, coins, owned gear and settings. Stored as JSON
// through the platform layer (SDK cloud data where available, else localStorage).
const DEFAULT = { v: 1, stars: {}, coins: 0, gear: [], settings: { volume: 0.8, music: 0.45, quality: 'auto' }, howSeen: false };

export class Save {
  constructor(platform) { this.platform = platform; this.data = structuredClone(DEFAULT); }

  async load() {
    try {
      const raw = await this.platform.loadData();
      if (raw) {
        const d = JSON.parse(raw);
        // merge field by field so an old or damaged save never breaks the game
        this.data = { ...structuredClone(DEFAULT), ...d, settings: { ...DEFAULT.settings, ...(d.settings || {}) } };
        if (typeof this.data.stars !== 'object' || !this.data.stars) this.data.stars = {};
        if (!Array.isArray(this.data.gear)) this.data.gear = [];
        if (!Number.isFinite(this.data.coins)) this.data.coins = 0;
      }
    } catch (e) { this.data = structuredClone(DEFAULT); }
  }

  persist() { this.platform.saveData(JSON.stringify(this.data)); }
  has(gear) { return this.data.gear.includes(gear); }
  stars(id) { return this.data.stars[id] || 0; }
  totalStars() { return Object.values(this.data.stars).reduce((a, b) => a + b, 0); }

  // record a finished heist; returns coins earned
  finish(id, stars, cash) {
    this.data.stars[id] = Math.max(this.stars(id), stars);
    const earned = Math.round(cash / 10) + stars * 5;
    this.data.coins += earned;
    this.persist();
    return earned;
  }
}
