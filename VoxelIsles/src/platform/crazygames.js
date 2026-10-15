const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = 'voxelisles.save';
const ADS = __CG_ADS__;
let SDK = null, ready = false, playing = false, adBusy = false, cooldown = 0;
const call = (fn) => { if (ready) safe(fn); };
export default {
  async init() {
    SDK = window.CrazyGames && window.CrazyGames.SDK;
    if (!SDK) return;
    try { await Promise.race([SDK.init(), wait(5000).then(() => { throw new Error('sdk timeout'); })]); ready = SDK.environment === 'crazygames' || SDK.environment === 'local'; } catch (e) { ready = false; }
  },
  get sdkReady() { return ready; },
  loadingStart() { call(() => SDK.game.loadingStart()); },
  firstFrame() {},
  gameReady() { call(() => SDK.game.loadingStop()); },
  gameplayStart() { if (playing) return; playing = true; call(() => SDK.game.gameplayStart()); },
  gameplayStop() { if (!playing) return; playing = false; call(() => SDK.game.gameplayStop()); },
  happytime() { call(() => SDK.game.happytime()); },
  async getLanguage() { const loc = (ready && safe(() => SDK.user.systemInfo.locale, '')) || navigator.language || 'en'; return String(loc).toLowerCase().slice(0, 2); },
  isAudioEnabled() { return !(ready && safe(() => SDK.game.settings.muteAudio, false)); },
  onAudioEnabledChange(cb) { call(() => SDK.game.addSettingsChangeListener((st) => cb(!(st && st.muteAudio)))); },
  onPause(cb) { document.addEventListener('visibilitychange', () => document.hidden && cb()); },
  onResume(cb) { document.addEventListener('visibilitychange', () => !document.hidden && cb()); },
  async loadData() { if (ready) { const v = safe(() => SDK.data.getItem(KEY), null); if (v != null) return String(v); } return safe(() => localStorage.getItem(KEY) || '', ''); },
  async saveData(s) { if (ready) safe(() => SDK.data.setItem(KEY, s)); else safe(() => localStorage.setItem(KEY, s)); },
  ads: {
    canReward() { return ADS && ready && !adBusy && performance.now() > cooldown; },
    request(type) {
      if (!ADS || !ready || adBusy) return Promise.resolve(false);
      adBusy = true;
      return new Promise((resolve) => {
        let started = false, done = false;
        const finish = (ok) => { if (done) return; done = true; adBusy = false; if (!ok && type === 'rewarded') cooldown = performance.now() + 120000; resolve(ok); };
        const ok = safe(() => { SDK.ad.requestAd(type, { adStarted: () => { started = true; }, adFinished: () => finish(true), adError: () => finish(false) }); return true; }, false);
        if (!ok) finish(false);
        setTimeout(() => { if (!started) finish(false); }, 30000);
      });
    },
    midgame() { return this.request('midgame').then(() => undefined); },
    rewarded() { return this.request('rewarded'); },
  },
};
