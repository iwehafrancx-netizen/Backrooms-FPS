// Own-website build: no portal SDK, no ads, progress saved in localStorage.
// Every platform module exports this same interface (see crazygames.js etc.).
const KEY = 'tiptoe-thief.save';
const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };

export default {
  name: 'web',
  async init() {},
  loadingStart() {},
  gameReady() {},
  gameplayStart() {},
  gameplayStop() {},
  happytime() {},
  isAudioEnabled() { return true; },
  onAudioEnabledChange() {},
  onPause(cb) { document.addEventListener('visibilitychange', () => document.hidden && cb()); },
  onResume(cb) { document.addEventListener('visibilitychange', () => !document.hidden && cb()); },
  async loadData() { return safe(() => localStorage.getItem(KEY) || '', ''); },
  async saveData(s) { safe(() => localStorage.setItem(KEY, s)); },
  ads: { canReward() { return false; }, async midgame() {}, async rewarded() { return false; } },
};
