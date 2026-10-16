import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../Backrooms FPS CrazyGames');
const out = path.resolve(here, '../Backrooms FPS Playgama');
const bridgeJs = path.join(here, 'vendor/playgama-bridge.js');
if (!fs.existsSync(bridgeJs)) throw new Error('missing tools/vendor/playgama-bridge.js (npm pack @playgama/bridge)');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const item of ['css', 'lib', 'assets', 'LICENSES.txt']) fs.cpSync(path.join(src, item), path.join(out, item), { recursive: true });
fs.copyFileSync(bridgeJs, path.join(out, 'playgama-bridge.js'));
fs.writeFileSync(path.join(out, 'playgama-bridge-config.json'), JSON.stringify({ game: { adaptToSafeArea: true }, advertisement: { interstitial: { preloadOnStart: 'true' }, rewarded: { preloadOnStart: 'true' } } }, null, 2) + '\n');

let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const sdkTag = '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>';
if (!html.includes(sdkTag)) throw new Error('CrazyGames SDK tag not found in index.html');
html = html.replace(sdkTag, '<script src="playgama-bridge.js"></script>');
fs.writeFileSync(path.join(out, 'index.html'), html);

let js = fs.readFileSync(path.join(src, 'game.js'), 'utf8');
const a = js.indexOf('const Platform = (() => {');
const endMark = '  return api;\n})();\n';
const b = js.indexOf(endMark, a);
if (a < 0 || b < 0) throw new Error('Platform block not found in the CrazyGames game.js');

const platform = `const Platform = (() => {
  const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };
  const KEY = 'backrooms.save';
  let B = null, ready = false, playing = false, adBusy = false, adCooldownUntil = 0, audioOn = true;
  const audioCbs = [], pauseCbs = [], resumeCbs = [];
  const send = (msg) => { if (ready) safe(() => B.platform.sendMessage(msg).catch(() => {})); };
  const api = {
    async init() {
      B = window.bridge;
      if (!B) return;
      try {
        await Promise.race([B.initialize(), wait(8000).then(() => { throw new Error('bridge timeout'); })]);
        ready = true;
      } catch (e) { ready = false; return; }
      audioOn = safe(() => B.platform.isAudioEnabled !== false, true);
      safe(() => B.platform.on(B.EVENT_NAME.AUDIO_STATE_CHANGED, (on) => { audioOn = !!on; for (const cb of audioCbs) cb(audioOn); }));
      safe(() => B.platform.on(B.EVENT_NAME.PAUSE_STATE_CHANGED, (p) => { for (const cb of p ? pauseCbs : resumeCbs) cb(); }));
    },
    get sdkReady() { return ready; },
    loadingStart() {},
    gameReady() { send('game_ready'); },
    gameplayStart() { if (playing) return; playing = true; send('gameplay_started'); },
    gameplayStop() { if (!playing) return; playing = false; send('gameplay_stopped'); },
    happytime() {},
    async getLanguage() {
      const loc = (ready && safe(() => B.platform.language, '')) || navigator.language || 'en';
      return String(loc).toLowerCase().slice(0, 2);
    },
    isAudioEnabled() { return audioOn; },
    onAudioEnabledChange(cb) { audioCbs.push(cb); },
    onPause(cb) { pauseCbs.push(cb); PageVisibility.on((h) => { if (h) cb(); }); },
    onResume(cb) { resumeCbs.push(cb); PageVisibility.on((h) => { if (!h) cb(); }); },
    async loadData() {
      if (ready) { const v = await Promise.resolve(safe(() => B.storage.get(KEY, false), null)).catch(() => null); if (v != null && v !== '') return String(v); }
      return safe(() => localStorage.getItem(KEY) || '', '');
    },
    async saveData(str) {
      safe(() => localStorage.setItem(KEY, str));
      if (ready) await Promise.resolve(safe(() => B.storage.set(KEY, str), null)).catch(() => {});
    },
    sendScore() {},
    logError() {},
    logWarning() {},
    ads: {
      canReward() { return ready && !adBusy && performance.now() > adCooldownUntil && safe(() => B.advertisement.isRewardedSupported, false); },
      request(type) {
        const rewarded = type === 'rewarded';
        if (!ready || adBusy) return Promise.resolve(false);
        if (!safe(() => (rewarded ? B.advertisement.isRewardedSupported : B.advertisement.isInterstitialSupported), false)) return Promise.resolve(false);
        adBusy = true;
        return new Promise((resolve) => {
          let started = false, done = false, earned = false;
          const ev = rewarded ? B.EVENT_NAME.REWARDED_STATE_CHANGED : B.EVENT_NAME.INTERSTITIAL_STATE_CHANGED;
          const finish = (ok) => {
            if (done) return; done = true; adBusy = false;
            safe(() => B.advertisement.off(ev, onState));
            Ads.end();
            if (!ok && rewarded) adCooldownUntil = performance.now() + 120000;
            resolve(ok);
          };
          const onState = (st) => {
            if (st === 'opened') { started = true; Ads.playing(); }
            else if (st === 'rewarded') earned = true;
            else if (st === 'closed') finish(rewarded ? earned : true);
            else if (st === 'failed') finish(false);
          };
          Ads.begin();
          const ok = safe(() => { B.advertisement.on(ev, onState); if (rewarded) B.advertisement.showRewarded(); else B.advertisement.showInterstitial(); return true; }, false);
          if (!ok) finish(false);
          setTimeout(() => { if (!started) finish(false); }, 30000);
        });
      },
      midgame() { return this.request('interstitial').then(() => undefined); },
      rewarded() { return this.request('rewarded'); },
    },
  };
  window.addEventListener('error', (e) => console.error('[backrooms]', e.message));
  window.addEventListener('unhandledrejection', (e) => console.error('[backrooms]', e.reason));
`;
js = js.slice(0, a) + platform + js.slice(b);
if (/CrazyGames|crazygames/.test(js)) throw new Error('CrazyGames reference left in the Playgama build');
fs.writeFileSync(path.join(out, 'game.js'), js);
console.log('wrote', path.relative(path.resolve(here, '..'), out), '(Playgama Bridge)');
