// CrazyGames HTML5 SDK v3. The Basic Launch build is the same file compiled
// with __ADS__ = false, which turns every ad call into a no-op.
const KEY = 'tiptoe-thief.save';
const ADS = __ADS__;
const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let SDK = null, ready = false, playing = false, adBusy = false;
const call = (fn) => { if (ready) safe(fn); };

export default {
  name: ADS ? 'crazygames' : 'crazygames-basic',
  async init() {
    SDK = window.CrazyGames && window.CrazyGames.SDK;
    if (!SDK) return;
    try {
      await Promise.race([SDK.init(), wait(5000).then(() => { throw new Error('sdk timeout'); })]);
      ready = SDK.environment === 'crazygames' || SDK.environment === 'local';
    } catch (e) { ready = false; }
  },
  loadingStart() { call(() => SDK.game.loadingStart()); },
  gameReady() { call(() => SDK.game.loadingStop()); },
  gameplayStart() { if (playing) return; playing = true; call(() => SDK.game.gameplayStart()); },
  gameplayStop() { if (!playing) return; playing = false; call(() => SDK.game.gameplayStop()); },
  happytime() { call(() => SDK.game.happytime()); },
  isAudioEnabled() { return !(ready && safe(() => SDK.game.settings.muteAudio, false)); },
  onAudioEnabledChange(cb) { call(() => SDK.game.addSettingsChangeListener((st) => cb(!(st && st.muteAudio)))); },
  onPause(cb) { document.addEventListener('visibilitychange', () => document.hidden && cb()); },
  onResume(cb) { document.addEventListener('visibilitychange', () => !document.hidden && cb()); },
  async loadData() { if (ready) { const v = safe(() => SDK.data.getItem(KEY), null); if (v != null) return String(v); } return safe(() => localStorage.getItem(KEY) || '', ''); },
  async saveData(s) { if (ready) safe(() => SDK.data.setItem(KEY, s)); else safe(() => localStorage.setItem(KEY, s)); },
  ads: !ADS ? { canReward() { return false; }, async midgame() {}, async rewarded() { return false; } } : {
    canReward() { return ready && !adBusy; },
    request(type) {
      if (!ready || adBusy) return Promise.resolve(false);
      adBusy = true;
      return new Promise((resolve) => {
        let started = false, done = false;
        const finish = (ok) => { if (done) return; done = true; adBusy = false; resolve(ok); };
        const ok = safe(() => { SDK.ad.requestAd(type, { adStarted: () => { started = true; }, adFinished: () => finish(true), adError: () => finish(false) }); return true; }, false);
        if (!ok) finish(false);
        setTimeout(() => { if (!started) finish(false); }, 30000); // never hang the game on a missing ad
      });
    },
    midgame() { return this.request('midgame').then(() => undefined); },
    rewarded() { return this.request('rewarded'); },
  },
};
