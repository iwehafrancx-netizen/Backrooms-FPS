(function () {
  const cfg = window.__cgConfig || {};
  const log = (window.__cg = { calls: [], next: cfg.next || 'finish', fast: !!cfg.fast, settingsCbs: [], data: {} });
  const rec = (n, a) => log.calls.push([n, a, performance.now()]);
  if (cfg.mirrorYt) window.__yt = { calls: [] };
  const mirror = (n) => { if (window.__yt) window.__yt.calls.push([n]); };
  const store = {
    getItem: (k) => { rec('data.getItem', k); try { return localStorage.getItem('cgtest.' + k); } catch (e) { return log.data[k] ?? null; } },
    setItem: (k, v) => { rec('data.setItem', String(v).length); log.data[k] = String(v); try { localStorage.setItem('cgtest.' + k, String(v)); } catch (e) {} },
    removeItem: (k) => { rec('data.removeItem', k); delete log.data[k]; try { localStorage.removeItem('cgtest.' + k); } catch (e) {} },
    clear: () => { rec('data.clear'); log.data = {}; },
  };
  if (cfg.save != null) store.setItem('backrooms.save', cfg.save);
  if (cfg.save === '') store.removeItem('backrooms.save');
  log.calls.length = 0;
  const overlay = (type, done) => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#111;color:#eee;font:600 16px/1.6 monospace;text-align:center';
    let n = type === 'rewarded' ? 5 : 3;
    const paint = () => { el.innerHTML = `<div><div style="font-size:12px;letter-spacing:.3em;color:#f2c230">TEST AD · ${type.toUpperCase()}</div><div style="font-size:28px;margin:10px 0">CrazyGames ad plays here</div><div>${n > 0 ? 'ends in ' + n + ' s' : ''}</div></div>`; };
    paint(); document.body.appendChild(el);
    const iv = setInterval(() => { n--; paint(); if (n <= 0) { clearInterval(iv); el.remove(); done(); } }, 1000);
  };
  window.CrazyGames = {
    SDK: {
      environment: 'disabled',
      async init() { rec('init'); this.environment = cfg.environment || 'local'; },
      game: {
        settings: { muteAudio: !!cfg.muteAudio, disableChat: false },
        loadingStart: () => rec('loadingStart'),
        loadingStop: () => { rec('loadingStop'); mirror('gameReady'); },
        gameplayStart: () => rec('gameplayStart'),
        gameplayStop: () => rec('gameplayStop'),
        happytime: () => rec('happytime'),
        addSettingsChangeListener: (cb) => { rec('addSettingsChangeListener'); log.settingsCbs.push(cb); },
        removeSettingsChangeListener: () => {},
      },
      ad: {
        requestAd(type, cb = {}) {
          rec('requestAd', type);
          const mode = log.next;
          if (mode === 'error') { setTimeout(() => cb.adError && cb.adError({ code: 'unfilled' }), 10); return; }
          setTimeout(() => {
            cb.adStarted && cb.adStarted();
            if (log.fast) setTimeout(() => cb.adFinished && cb.adFinished(), 30);
            else overlay(type, () => cb.adFinished && cb.adFinished());
          }, 10);
        },
        hasAdblock: async () => false,
      },
      data: store,
      user: { systemInfo: { locale: cfg.locale || navigator.language || 'en-US', countryCode: 'US', device: { type: 'desktop' } } },
    },
  };
})();
