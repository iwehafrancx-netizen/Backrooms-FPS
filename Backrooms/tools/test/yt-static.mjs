// YouTube Playables static check: unzip the bundle and scan the HTML/JS/CSS and
// every other file as text, without a browser — the way store pre-checkers do.
//   node test/yt-static.mjs [path/to/zip]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const zip = path.resolve(process.argv[2] || path.join(here, '../../dist/backrooms-fps.zip'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytstatic-'));
execFileSync('unzip', ['-q', zip, '-d', dir]);
const SDK = 'https://www.youtube.com/game_api/v1';
let fails = 0, warns = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); if (!ok) fails++; };
const warn = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'WARN'}  ${name}${info ? '  — ' + info : ''}`); if (!ok) warns++; };

const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(dir).map((p) => ({ p, rel: path.relative(dir, p).split(path.sep).join('/'), size: fs.statSync(p).size }));
const isCode = (f) => /\.(js|mjs|html|htm|css|json)$/i.test(f.rel);
const text = (f) => fs.readFileSync(f.p, isCode(f) ? 'utf8' : 'latin1');

// bundle layout and size
check('index.html at the root of the zip', fs.existsSync(path.join(dir, 'index.html')));
const total = files.reduce((a, f) => a + f.size, 0);
check('Bundle under 250 MB, under 8000 files', total < 250e6 && files.length < 8000, `${(total / 1e6).toFixed(1)} MB, ${files.length} files`);
const biggest = [...files].sort((a, b) => b.size - a.size)[0];
check('Every file under 30 MB', biggest.size < 30 * 1048576, `largest ${biggest.rel} ${(biggest.size / 1024).toFixed(0)} KiB`);
const stored = execFileSync('unzip', ['-Zl', zip], { encoding: 'utf8' }).split('\n').map((l) => l.trim().split(/\s+/)).filter((r) => r.length >= 10 && r[0][0] === '-').map((r) => ({ name: r.slice(9).join(' '), stored: +r[5] })).sort((a, b) => b.stored - a.stored);
check('Every file under 512 KiB inside the zip (Google recommendation)', stored[0].stored < 512 * 1024, `largest ${stored[0].name} ${(stored[0].stored / 1024).toFixed(0)} KiB`);
check('No hidden or system files', !files.some((f) => /(^|\/)(\.|__MACOSX|Thumbs\.db)/.test(f.rel)), files.filter((f) => /(^|\/)\./.test(f.rel)).map((f) => f.rel).join(' '));

// index.html
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map((m) => m[1]);
check('YouTube SDK is the first <script> and in <head>', scripts[0] === SDK && html.search(/<script\b/) < html.indexOf('</head>'), scripts.join(', '));
check('<meta charset> and viewport present', /<meta charset=/i.test(html) && /name="viewport"/i.test(html));
const refs = [...html.matchAll(/(?:src|href)="([^"#?]+)/g)].map((m) => m[1]).filter((u) => u !== SDK);
check('Every file index.html points to exists, with relative paths', refs.every((u) => !u.startsWith('/') && !/^[a-z]+:/i.test(u) && fs.existsSync(path.join(dir, decodeURI(u)))), refs.join(' '));

// web addresses anywhere (text and binary)
const urlHits = [];
for (const f of files) { const m = text(f).match(/\b(?:https?:)?\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s"'`)<>]*/gi); if (m) for (const u of m) if (!u.startsWith(SDK)) urlHits.push(`${f.rel}: ${u.slice(0, 70)}`); }
check('No web addresses besides the YouTube SDK (all files)', urlHits.length === 0, urlHits.slice(0, 8).join(' | '));

// browser APIs a Playable must not use
const code = files.filter((f) => /\.(js|mjs|html|htm)$/i.test(f.rel)).map((f) => ({ ...f, src: text(f) }));
const RULES = [
  ['Page Visibility API (use ytgame onPause/onResume)', /document\.hidden|visibilityState|visibilitychange/],
  ['localStorage / sessionStorage / indexedDB / cookies (use ytgame saveData)', /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|document\.cookie/],
  ['Pointer lock', /requestPointerLock|exitPointerLock|pointerLockElement|pointerlockchange/i],
  ['Fullscreen API', /requestFullscreen|webkitRequestFullscreen|exitFullscreen/],
  ['alert / confirm / prompt dialogs', /\b(?:window\.)?(?:alert|confirm|prompt)\s*\(\s*['"`]/],
  ['window.open / navigation of the page', /window\.open\s*\(|top\.location|parent\.location|location\.href\s*=|location\.assign\(|location\.replace\(/],
  ['eval / new Function', /\beval\s*\(|new\s+Function\s*\(/],
  ['document.write', /document\.write\s*\(/],
  ['beforeunload / unload handlers', /['"](?:before)?unload['"]/],
  ['Service workers, sockets, beacons, camera/mic', /serviceWorker|new\s+WebSocket|sendBeacon|getUserMedia/],
  ['External fonts or stylesheets', /fonts\.googleapis|@import\s+url\(\s*['"]?https?:/],
  ['Source-map references to missing files', /sourceMappingURL=(?!data:)/],
];
for (const [name, re] of RULES) {
  const hits = code.filter((f) => re.test(f.src)).map((f) => `${f.rel}: ${f.src.match(re)[0]}`);
  check(`No ${name}`, hits.length === 0, hits.join(' | '));
}
const css = files.filter((f) => f.rel.endsWith('.css')).map((f) => text(f)).join('\n');
check('No external url() in CSS', !/url\(\s*['"]?(?:https?:)?\/\//.test(css));

// the ytgame SDK calls the platform expects
const game = fs.readFileSync(path.join(dir, 'game.js'), 'utf8');
for (const call of ['game.firstFrameReady', 'game.gameReady', 'system.onPause', 'system.onResume', 'system.isAudioEnabled', 'system.onAudioEnabledChange', 'game.saveData', 'game.loadData', 'system.getLanguage', 'engagement.sendScore']) {
  check(`ytgame.${call} used`, game.includes(call));
}
warn('game.js has no console.log debug output', !/console\.log\s*\(/.test(game));

fs.rmSync(dir, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED, ${warns} warnings` : `\nALL PASS${warns ? `, ${warns} warnings` : ''}`);
process.exit(fails ? 1 : 0);
