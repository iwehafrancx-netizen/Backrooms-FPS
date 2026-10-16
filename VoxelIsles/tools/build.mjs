import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const args = process.argv.slice(2);
const platform = (args.find((a) => a.startsWith('--platform=')) || '--platform=dev').split('=')[1];
const out = path.resolve(root, (args.find((a) => a.startsWith('--out=')) || '--out=dev').split('=')[1]);
const watch = args.includes('--watch');
fs.mkdirSync(out, { recursive: true });

const platformAlias = {
  name: 'platform',
  setup(b) { b.onResolve({ filter: /^@platform$/ }, () => ({ path: path.join(root, 'src/platform', `${platform === 'dev' || platform === 'web' ? 'local' : platform === 'crazygames-basic' ? 'crazygames' : platform}.js`) })); },
};
const opts = {
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true, minify: platform !== 'dev', sourcemap: platform === 'dev' ? 'inline' : false,
  format: 'iife', target: ['es2020'], outfile: path.join(out, 'game.js'), legalComments: 'none',
  define: { __PLATFORM__: JSON.stringify(platform), __CG_ADS__: String(platform !== 'crazygames-basic') },
  plugins: [platformAlias], logLevel: 'warning', nodePaths: [path.join(here, 'node_modules')],
};
const copyWeb = () => {
  let html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  const sdk = { crazygames: '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>', 'crazygames-basic': '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>', youtube: '<script src="https://www.youtube.com/game_api/v1"></script>', playgama: '<script src="playgama-bridge.js"></script>' }[platform] || '';
  html = html.replace('<!--SDK-->', sdk);
  fs.writeFileSync(path.join(out, 'index.html'), html);
  fs.copyFileSync(path.join(root, 'web/style.css'), path.join(out, 'style.css'));
};
if (watch) { const ctx = await esbuild.context(opts); await ctx.watch(); copyWeb(); console.log('watching', out); }
else if (platform === 'youtube') {
  const r = await esbuild.build({ ...opts, format: 'esm', minify: false, minifyIdentifiers: true, minifySyntax: true, write: false });
  let code = r.outputFiles[0].text.replace(/[\w$.]+\.visibilityState\s*!==\s*"visible-blurred"/g, '!0');
  if (/visibilitychange|visibilityState|document\.hidden|onvisibilitychange/.test(code)) throw new Error('Page Visibility API text in youtube build');
  const lines = code.split('\n'), parts = [];
  let cur = [], size = 0;
  const top = /^(var|let|const|function|async function|class|new|\(|[A-Za-z_$][\w$]*\s*\()/;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (size > 300000 && top.test(ln) && /[;}]\s*$/.test(lines[i - 1] || '')) { parts.push(cur.join('\n')); cur = []; size = 0; }
    cur.push(ln); size += ln.length + 1;
  }
  if (cur.length) parts.push(cur.join('\n'));
  for (const f of fs.readdirSync(out)) if (/^game(\.\d+)?\.js$/.test(f)) fs.rmSync(path.join(out, f));
  const names = [];
  for (let i = 0; i < parts.length; i++) {
    const m = await esbuild.transform('"use strict";\n' + parts[i], { minifyWhitespace: true, loader: 'js', target: 'es2020', legalComments: 'none' });
    const name = `game.${i}.js`; names.push(name);
    fs.writeFileSync(path.join(out, name), m.code);
  }
  copyWeb();
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8').replace('<script src="game.js"></script>', names.map((n) => `<script src="${n}"></script>`).join('\n  '));
  fs.writeFileSync(path.join(out, 'index.html'), html);
  console.log('built', path.relative(root, out), names.map((n) => `${n} ${(fs.statSync(path.join(out, n)).size / 1024).toFixed(0)} KiB`).join(', '));
}
else { await esbuild.build(opts); copyWeb(); console.log('built', path.relative(root, out), (fs.statSync(path.join(out, 'game.js')).size / 1024).toFixed(0) + ' KiB'); }
