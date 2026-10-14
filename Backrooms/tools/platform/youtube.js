const Platform = (() => {
  const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };
  const KEY = 'backrooms.save';
  let yt = null, inPlayables = false, firstFrameSent = false, readySent = false, adBusy = false, adCooldownUntil = 0;
  const api = {
    async init() {
      yt = window.ytgame || null;
      inPlayables = !!(yt && yt.IN_PLAYABLES_ENV);
    },
    get sdkReady() { return inPlayables; },
    loadingStart() { if (firstFrameSent) return; firstFrameSent = true; safe(() => yt && yt.game.firstFrameReady()); },
    gameReady() { if (readySent) return; readySent = true; safe(() => yt && yt.game.gameReady()); },
    gameplayStart() {},
    gameplayStop() {},
    happytime() {},
    async getLanguage() {
      const raw = inPlayables ? await safe(() => yt.system.getLanguage(), Promise.resolve('en')).catch(() => 'en') : (navigator.language || 'en');
      return String(raw || 'en').toLowerCase().slice(0, 2);
    },
    isAudioEnabled() { return inPlayables ? safe(() => yt.system.isAudioEnabled(), true) : true; },
    onAudioEnabledChange(cb) { if (inPlayables) safe(() => yt.system.onAudioEnabledChange(cb)); },
    onPause(cb) { if (inPlayables) safe(() => yt.system.onPause(cb)); document.addEventListener('visibilitychange', () => { if (document.hidden) cb(); }); },
    onResume(cb) { if (inPlayables) safe(() => yt.system.onResume(cb)); document.addEventListener('visibilitychange', () => { if (!document.hidden) cb(); }); },
    async loadData() {
      if (inPlayables) return safe(() => yt.game.loadData(), Promise.resolve('')).catch(() => { api.logWarning(); return ''; });
      return safe(() => localStorage.getItem(KEY) || '', '');
    },
    async saveData(str) {
      if (inPlayables) return safe(() => yt.game.saveData(str), Promise.resolve()).catch(() => api.logWarning());
      safe(() => localStorage.setItem(KEY, str));
    },
    sendScore(value) { if (inPlayables) safe(() => yt.engagement.sendScore({ value: Math.floor(value) }).catch(() => {})); },
    logError() { if (inPlayables) safe(() => yt.health.logError()); },
    logWarning() { if (inPlayables) safe(() => yt.health.logWarning()); },
    ads: {
      has(fn) { return inPlayables && !!yt && !!yt.ads && typeof yt.ads[fn] === 'function'; },
      canReward() { return this.has('requestRewardedAd') && !adBusy && performance.now() > adCooldownUntil; },
      async request(fn, arg) {
        if (!this.has(fn) || adBusy) return false;
        adBusy = true;
        Ads.begin(); Ads.playing();
        let ok = false;
        try {
          const r = await Promise.race([yt.ads[fn](arg), wait(120000).then(() => { throw new Error('ad timeout'); })]);
          ok = fn === 'requestRewardedAd' ? r === true || !!(r && (r.rewarded || r.earned)) : true;
        } catch (e) { ok = false; }
        adBusy = false;
        Ads.end();
        if (!ok && fn === 'requestRewardedAd') adCooldownUntil = performance.now() + 120000;
        return ok;
      },
      midgame() { return this.request('requestInterstitialAd').then(() => undefined); },
      rewarded(id) { return this.request('requestRewardedAd', String(id || 'reward')); },
    },
  };
  window.addEventListener('error', (e) => { api.logError(); console.error('[backrooms]', e.message); });
  window.addEventListener('unhandledrejection', (e) => { api.logError(); console.error('[backrooms]', e.reason); });
  return api;
})();
