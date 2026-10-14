export default {
  async init() {},
  sdkReady: false,
  loadingStart() {}, gameReady() {}, firstFrame() {}, gameplayStart() {}, gameplayStop() {}, happytime() {},
  async getLanguage() { return (navigator.language || 'en').slice(0, 2).toLowerCase(); },
  isAudioEnabled() { return true; }, onAudioEnabledChange() {},
  onPause(cb) { document.addEventListener('visibilitychange', () => document.hidden && cb()); },
  onResume(cb) { document.addEventListener('visibilitychange', () => !document.hidden && cb()); },
  async loadData() { try { return localStorage.getItem('voxelisles.save') || ''; } catch (e) { return ''; } },
  async saveData(s) { try { localStorage.setItem('voxelisles.save', s); } catch (e) {} },
  ads: { canReward() { return false; }, async midgame() {}, async rewarded() { return false; } },
};
