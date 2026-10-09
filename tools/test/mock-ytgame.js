(function () {
  const log = (window.__yt = { calls: [], saved: window.__ytInitialSave || '', scores: [], pauseCbs: [], resumeCbs: [], audioCbs: [], audio: true, nextReward: true });
  const rec = (n, a) => log.calls.push([n, a, performance.now()]);
  window.ytgame = {
    IN_PLAYABLES_ENV: true,
    SDK_VERSION: 'mock',
    game: {
      firstFrameReady: () => rec('firstFrameReady'),
      gameReady: () => rec('gameReady'),
      loadData: () => { rec('loadData'); return Promise.resolve(log.saved); },
      saveData: (d) => { rec('saveData', d.length); log.saved = d; return Promise.resolve(); },
    },
    system: {
      isAudioEnabled: () => { rec('isAudioEnabled'); return log.audio; },
      onAudioEnabledChange: (cb) => { rec('onAudioEnabledChange'); log.audioCbs.push(cb); return () => {}; },
      onPause: (cb) => { rec('onPause'); log.pauseCbs.push(cb); return () => {}; },
      onResume: (cb) => { rec('onResume'); log.resumeCbs.push(cb); return () => {}; },
      getLanguage: () => { rec('getLanguage'); return Promise.resolve(window.__ytLang || 'en-US'); },
    },
    engagement: { sendScore: (s) => { rec('sendScore', s.value); log.scores.push(s.value); return Promise.resolve(); } },
    health: { logError: () => rec('logError'), logWarning: () => rec('logWarning') },
    ads: {
      requestInterstitialAd: () => { rec('requestInterstitialAd'); return new Promise((r) => setTimeout(r, 30)); },
      requestRewardedAd: (id) => { rec('requestRewardedAd', id); const v = log.nextReward; return new Promise((res, rej) => setTimeout(() => (v === 'error' ? rej(new Error('no fill')) : res(v !== false)), 30)); },
    },
  };
  if (window.__ytNoAds) delete window.ytgame.ads;
})();
