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
else { await esbuild.build(opts); copyWeb(); console.log('built', path.relative(root, out), (fs.statSync(path.join(out, 'game.js')).size / 1024).toFixed(0) + ' KiB'); }
