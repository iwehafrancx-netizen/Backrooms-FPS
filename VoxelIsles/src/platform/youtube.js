const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = 'voxelisles.save';
let yt = null, inP = false, ffSent = false, readySent = false, adBusy = false, cooldown = 0;
const api = {
  async init() { yt = window.ytgame || null; inP = !!(yt && yt.IN_PLAYABLES_ENV); },
  get sdkReady() { return inP; },
  loadingStart() {},
  firstFrame() { if (ffSent) return; ffSent = true; safe(() => yt && yt.game.firstFrameReady()); },
  gameReady() { if (readySent) return; readySent = true; safe(() => yt && yt.game.gameReady()); },
  gameplayStart() {}, gameplayStop() {}, happytime() {},
  async getLanguage() { const raw = inP ? await safe(() => yt.system.getLanguage(), Promise.resolve('en')).catch(() => 'en') : navigator.language || 'en'; return String(raw || 'en').toLowerCase().slice(0, 2); },
  isAudioEnabled() { return inP ? safe(() => yt.system.isAudioEnabled(), true) : true; },
  onAudioEnabledChange(cb) { if (inP) safe(() => yt.system.onAudioEnabledChange(cb)); },
  onPause(cb) { if (inP) safe(() => yt.system.onPause(cb)); },
  onResume(cb) { if (inP) safe(() => yt.system.onResume(cb)); },
  async loadData() { if (inP) return safe(() => yt.game.loadData(), Promise.resolve('')).catch(() => { api.logWarning(); return ''; }); return safe(() => localStorage.getItem(KEY) || '', ''); },
  async saveData(s) { if (inP) return safe(() => yt.game.saveData(s), Promise.resolve()).catch(() => api.logWarning()); safe(() => localStorage.setItem(KEY, s)); },
  sendScore(v) { if (inP) safe(() => yt.engagement.sendScore({ value: Math.floor(v) }).catch(() => {})); },
  logError() { if (inP) safe(() => yt.health.logError()); },
  logWarning() { if (inP) safe(() => yt.health.logWarning()); },
  ads: {
    has(fn) { return inP && !!yt && !!yt.ads && typeof yt.ads[fn] === 'function'; },
    canReward() { return this.has('requestRewardedAd') && !adBusy && performance.now() > cooldown; },
    async request(fn, arg) {
      if (!this.has(fn) || adBusy) return false;
      adBusy = true; let ok = false;
      try { const r = await Promise.race([yt.ads[fn](arg), wait(120000).then(() => { throw new Error('ad timeout'); })]); ok = fn === 'requestRewardedAd' ? r === true || !!(r && (r.rewarded || r.earned)) : true; } catch (e) { ok = false; }
      adBusy = false;
      if (!ok && fn === 'requestRewardedAd') cooldown = performance.now() + 120000;
      return ok;
    },
    midgame() { return this.request('requestInterstitialAd').then(() => undefined); },
    rewarded() { return this.request('requestRewardedAd', 'double_coins'); },
  },
};
addEventListener('error', () => api.logError());
addEventListener('unhandledrejection', () => api.logError());
export default api;
