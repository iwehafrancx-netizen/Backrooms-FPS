// Builds one platform version of the game.
//
//   node tools/build.mjs --platform=dev|web|crazygames|crazygames-basic|playgama|youtube [--out=dir]
//
// Output: index.html, style.css, game.js (bundled with esbuild) and assets/
// (models, textures, audio) copied as-is. Each platform only swaps the SDK
// <script> tag and the src/platform/*.js module behind the "@platform" import.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const platform = args.platform || 'dev';
const out = path.resolve(root, args.out || (platform === 'dev' ? 'dev' : `builds/${platform}`));

const MODULE = { dev: 'local', web: 'local', crazygames: 'crazygames', 'crazygames-basic': 'crazygames', playgama: 'playgama', youtube: 'youtube' }[platform];
if (!MODULE) throw new Error(`unknown platform "${platform}"`);
const SDK = {
  crazygames: '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>',
  'crazygames-basic': '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>',
  playgama: '<script src="playgama-bridge.js"></script>',
  youtube: '<script src="https://www.youtube.com/game_api/v1"></script>',
}[platform] || '';

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  minify: platform !== 'dev',
  sourcemap: platform === 'dev' ? 'inline' : false,
  format: 'iife',
  target: ['es2020'],
  outfile: path.join(out, 'game.js'),
  define: { __ADS__: String(platform !== 'crazygames-basic') },
  plugins: [{ name: 'platform', setup(b) { b.onResolve({ filter: /^@platform$/ }, () => ({ path: path.join(root, 'src/platform', MODULE + '.js') })); } }],
  logLevel: 'warning',
  legalComments: 'none',
});

fs.writeFileSync(path.join(out, 'index.html'), fs.readFileSync(path.join(root, 'web/index.html'), 'utf8').replace('<!--SDK-->', SDK));
fs.copyFileSync(path.join(root, 'web/style.css'), path.join(out, 'style.css'));
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true, filter: (p) => !p.endsWith('.DS_Store') });
fs.copyFileSync(path.join(root, 'LICENSES.txt'), path.join(out, 'LICENSES.txt'));
if (platform === 'playgama') {
  const bridge = path.join(root, 'tools/vendor/playgama-bridge.js');
  if (!fs.existsSync(bridge)) throw new Error('tools/vendor/playgama-bridge.js is missing');
  fs.copyFileSync(bridge, path.join(out, 'playgama-bridge.js'));
  fs.copyFileSync(path.join(root, 'tools/vendor/playgama-bridge.LICENSE'), path.join(out, 'playgama-bridge.LICENSE'));
  fs.writeFileSync(path.join(out, 'playgama-bridge-config.json'), JSON.stringify({ advertisement: { interstitial: { preloadOnStart: true }, rewarded: { preloadOnStart: true } } }, null, 2) + '\n');
}
const size = fs.statSync(path.join(out, 'game.js')).size;
console.log(`built ${path.relative(root, out)} (${platform}) game.js ${(size / 1024).toFixed(0)} KiB`);
