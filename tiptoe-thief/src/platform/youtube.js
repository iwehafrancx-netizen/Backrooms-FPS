// YouTube Playables (ytgame SDK). Saves through ytgame.game.saveData, pauses
// on the system pause event and reports first frame / game ready as required.
const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
const yt = () => window.ytgame;
const inP = () => !!(yt() && yt().IN_PLAYABLES_ENV);
const KEY = 'tiptoe-thief.save';

export default {
  name: 'youtube',
  async init() { if (inP()) safe(() => yt().game.firstFrameReady()); },
  loadingStart() {},
  gameReady() { if (inP()) safe(() => yt().game.gameReady()); },
  gameplayStart() {},
  gameplayStop() {},
  happytime() {},
  isAudioEnabled() { return inP() ? safe(() => yt().system.isAudioEnabled(), true) : true; },
  onAudioEnabledChange(cb) { if (inP()) safe(() => yt().system.onAudioEnabledChange(cb)); },
  onPause(cb) { if (inP()) safe(() => yt().system.onPause(cb)); else document.addEventListener('visibilitychange', () => document.hidden && cb()); },
  onResume(cb) { if (inP()) safe(() => yt().system.onResume(cb)); else document.addEventListener('visibilitychange', () => !document.hidden && cb()); },
  async loadData() { if (inP()) { try { return (await yt().game.loadData()) || ''; } catch (e) { return ''; } } return safe(() => localStorage.getItem(KEY) || '', ''); },
  async saveData(s) { if (inP()) { try { await yt().game.saveData(s); } catch (e) { /* ignore */ } } else safe(() => localStorage.setItem(KEY, s)); },
  ads: {
    canReward() { return inP() && !!safe(() => yt().ads.requestRewardedAd, null); },
    async midgame() { if (inP()) { try { await yt().ads.requestInterstitialAd(); } catch (e) { /* no ad */ } } },
    async rewarded() { if (!inP()) return false; try { return !!(await yt().ads.requestRewardedAd('double_coins')); } catch (e) { return false; } },
  },
};
