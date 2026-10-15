const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = 'voxelisles.save';
let B = null, ready = false, playing = false, adBusy = false, cooldown = 0, audioOn = true;
const audioCbs = [], pauseCbs = [], resumeCbs = [];
const send = (m) => { if (ready) safe(() => B.platform.sendMessage(m).catch(() => {})); };
export default {
  async init() {
    B = window.bridge;
    if (!B) return;
    try { await Promise.race([B.initialize(), wait(8000).then(() => { throw new Error('bridge timeout'); })]); ready = true; } catch (e) { ready = false; return; }
    audioOn = safe(() => B.platform.isAudioEnabled !== false, true);
    safe(() => B.platform.on(B.EVENT_NAME.AUDIO_STATE_CHANGED, (on) => { audioOn = !!on; for (const cb of audioCbs) cb(audioOn); }));
    safe(() => B.platform.on(B.EVENT_NAME.PAUSE_STATE_CHANGED, (p) => { for (const cb of p ? pauseCbs : resumeCbs) cb(); }));
  },
  get sdkReady() { return ready; },
  loadingStart() {}, firstFrame() {},
  gameReady() { send('game_ready'); },
  gameplayStart() { if (playing) return; playing = true; send('gameplay_started'); },
  gameplayStop() { if (!playing) return; playing = false; send('gameplay_stopped'); },
  happytime() {},
  async getLanguage() { const loc = (ready && safe(() => B.platform.language, '')) || navigator.language || 'en'; return String(loc).toLowerCase().slice(0, 2); },
  isAudioEnabled() { return audioOn; },
  onAudioEnabledChange(cb) { audioCbs.push(cb); },
  onPause(cb) { pauseCbs.push(cb); document.addEventListener('visibilitychange', () => document.hidden && cb()); },
  onResume(cb) { resumeCbs.push(cb); document.addEventListener('visibilitychange', () => !document.hidden && cb()); },
  async loadData() { if (ready) { const v = await Promise.resolve(safe(() => B.storage.get(KEY, false), null)).catch(() => null); if (v != null && v !== '') return String(v); } return safe(() => localStorage.getItem(KEY) || '', ''); },
  async saveData(s) { safe(() => localStorage.setItem(KEY, s)); if (ready) await Promise.resolve(safe(() => B.storage.set(KEY, s), null)).catch(() => {}); },
  ads: {
    canReward() { return ready && !adBusy && performance.now() > cooldown && safe(() => B.advertisement.isRewardedSupported, false); },
    request(type) {
      const rew = type === 'rewarded';
      if (!ready || adBusy) return Promise.resolve(false);
      if (!safe(() => (rew ? B.advertisement.isRewardedSupported : B.advertisement.isInterstitialSupported), false)) return Promise.resolve(false);
      adBusy = true;
      return new Promise((resolve) => {
        let started = false, done = false, earned = false;
        const ev = rew ? B.EVENT_NAME.REWARDED_STATE_CHANGED : B.EVENT_NAME.INTERSTITIAL_STATE_CHANGED;
        const finish = (ok) => { if (done) return; done = true; adBusy = false; safe(() => B.advertisement.off(ev, onState)); if (!ok && rew) cooldown = performance.now() + 120000; resolve(ok); };
        const onState = (st) => { if (st === 'opened') started = true; else if (st === 'rewarded') earned = true; else if (st === 'closed') finish(rew ? earned : true); else if (st === 'failed') finish(false); };
        const ok = safe(() => { B.advertisement.on(ev, onState); if (rew) B.advertisement.showRewarded(); else B.advertisement.showInterstitial(); return true; }, false);
        if (!ok) finish(false);
        setTimeout(() => { if (!started) finish(false); }, 30000);
      });
    },
    midgame() { return this.request('interstitial').then(() => undefined); },
    rewarded() { return this.request('rewarded'); },
  },
};
