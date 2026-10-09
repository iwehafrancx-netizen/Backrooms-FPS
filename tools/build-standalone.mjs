import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../Backrooms FPS');
const out = path.resolve(here, '../Backrooms FPS Standalone');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const item of ['css', 'lib', 'assets', 'LICENSES.txt']) fs.cpSync(path.join(src, item), path.join(out, item), { recursive: true });

let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
html = html.replace(/\s*<script src="https:\/\/www\.youtube\.com\/game_api\/v1"><\/script>/, '');
fs.writeFileSync(path.join(out, 'index.html'), html);

let js = fs.readFileSync(path.join(src, 'game.js'), 'utf8');
const sub = (from, to) => { if (!js.includes(from)) throw new Error('text not found: ' + from); js = js.split(from).join(to); };

{
  const a = js.indexOf('const Platform = (() => {'), endMark = '\n  return api;\n})();\n', b = js.indexOf(endMark, a);
  if (a < 0 || b < 0) throw new Error('Platform block not found');
  js = js.slice(0, a) + `const Platform = (() => {
  const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };
  const noop = () => {};
  const api = {
    sdkReady: false,
    async init() {}, loadingStart: noop, gameReady: noop, gameplayStart: noop, gameplayStop: noop, happytime: noop,
    sendScore: noop, logError: noop, logWarning: noop, onAudioEnabledChange: noop,
    async getLanguage() { return String(navigator.language || 'en').toLowerCase().slice(0, 2); },
    isAudioEnabled() { return true; },
    onPause(cb) { document.addEventListener('visibilitychange', () => { if (document.hidden) cb(); }); },
    onResume(cb) { document.addEventListener('visibilitychange', () => { if (!document.hidden) cb(); }); },
    async loadData() { return safe(() => localStorage.getItem('backrooms.save') || '', ''); },
    async saveData(str) { safe(() => localStorage.setItem('backrooms.save', str)); },
    ads: { canReward: () => false, async midgame() {}, async rewarded() { return false; } },
  };
  window.addEventListener('error', (e) => console.error('[backrooms]', e.message));
  window.addEventListener('unhandledrejection', (e) => console.error('[backrooms]', e.reason));
  return api;
})();
` + js.slice(b + endMark.length);
}

sub(`  async binary(url, kb) {
    const r = await fetch(url);`, `  async binary(url, kb) {
    if (window.BACKROOMS_WEB_DEMO && window.BACKROOMS_WEB_DEMO.b64) {
      const r = await fetch(url + '.b64.txt');
      if (!r.ok) throw new Error('Failed to load ' + url);
      const bin = atob((await r.text()).trim()); const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      this.bump(kb); return out.buffer;
    }
    const r = await fetch(url);`);
fs.writeFileSync(path.join(out, 'game.js'), js);

const left = (html + js).match(/ytgame|youtube\.com|game_api/gi);
if (left) throw new Error('YouTube references left in standalone build: ' + [...new Set(left)].join(', '));
console.log('wrote', path.relative(path.resolve(here, '..'), out));
