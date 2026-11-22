// Playgama Bridge (one SDK that talks to many portals). The bridge script and
// its config ship inside the zip next to index.html.
const KEY = 'tiptoe-thief.save';
const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let B = null, ready = false;
const pauseCbs = [], resumeCbs = [];

export default {
  name: 'playgama',
  async init() {
    B = window.bridge;
    if (!B) return;
    try {
      await Promise.race([B.initialize(), wait(6000).then(() => { throw new Error('bridge timeout'); })]);
      ready = true;
      safe(() => B.platform.on(B.EVENT_NAME.PAUSE_STATE_CHANGED, (p) => { for (const cb of p ? pauseCbs : resumeCbs) cb(); }));
    } catch (e) { ready = false; }
  },
  loadingStart() {},
  gameReady() { if (ready) safe(() => B.platform.sendMessage('game_ready')); },
  gameplayStart() { if (ready) safe(() => B.platform.sendMessage('gameplay_started')); },
  gameplayStop() { if (ready) safe(() => B.platform.sendMessage('gameplay_stopped')); },
  happytime() {},
  isAudioEnabled() { return ready ? safe(() => B.platform.isAudioEnabled, true) !== false : true; },
  onAudioEnabledChange(cb) { if (ready) safe(() => B.platform.on(B.EVENT_NAME.AUDIO_STATE_CHANGED, (on) => cb(!!on))); },
  onPause(cb) { pauseCbs.push(cb); document.addEventListener('visibilitychange', () => document.hidden && cb()); },
  onResume(cb) { resumeCbs.push(cb); document.addEventListener('visibilitychange', () => !document.hidden && cb()); },
  async loadData() {
    if (ready) { try { const v = await B.storage.get(KEY); if (v != null) return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { /* fall back */ } }
    return safe(() => localStorage.getItem(KEY) || '', '');
  },
  async saveData(s) { if (ready) { try { await B.storage.set(KEY, s); return; } catch (e) { /* fall back */ } } safe(() => localStorage.setItem(KEY, s)); },
  ads: {
    canReward() { return ready && safe(() => B.advertisement.isRewardedSupported !== false, true); },
    request(kind) {
      if (!ready) return Promise.resolve(false);
      return new Promise((resolve) => {
        const ev = kind === 'rewarded' ? B.EVENT_NAME.REWARDED_STATE_CHANGED : B.EVENT_NAME.INTERSTITIAL_STATE_CHANGED;
        let earned = false, done = false;
        const onState = (st) => {
          if (st === 'rewarded') earned = true;
          if (st === 'closed' || st === 'failed') { if (done) return; done = true; safe(() => B.advertisement.off(ev, onState)); resolve(kind === 'rewarded' ? earned : true); }
        };
        safe(() => B.advertisement.on(ev, onState));
        const ok = safe(() => { if (kind === 'rewarded') B.advertisement.showRewarded(); else B.advertisement.showInterstitial(); return true; }, false);
        if (!ok) { done = true; resolve(false); }
        setTimeout(() => { if (!done) { done = true; resolve(false); } }, 60000);
      });
    },
    midgame() { return this.request('interstitial').then(() => undefined); },
    rewarded() { return this.request('rewarded'); },
  },
};
