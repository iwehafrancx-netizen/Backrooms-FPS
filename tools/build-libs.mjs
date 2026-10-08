import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const game = path.resolve(here, '../Backrooms FPS');
const lib = path.join(game, 'lib');
const nm = path.join(here, 'node_modules');
const jsm = path.join(nm, 'three/examples/jsm');

for (const d of ['three', 'navigation', 'ai']) fs.mkdirSync(path.join(lib, d), { recursive: true });

const threeGlobal = {
  name: 'three-global',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: 'three', namespace: 'three-global' }));
    b.onLoad({ filter: /.*/, namespace: 'three-global' }, () => ({ contents: 'module.exports = window.THREE;', loader: 'js' }));
  },
};

const banner = (name) => `/* ${name} — bundled from three.js r${JSON.parse(fs.readFileSync(path.join(nm, 'three/package.json'))).version.split('.')[1]} (MIT, (c) 2010-2025 three.js authors) */`;

async function bundle(entryContents, outfile, { plugins = [threeGlobal], name } = {}) {
  await esbuild.build({
    stdin: { contents: entryContents, resolveDir: here, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    outfile,
    plugins,
    legalComments: 'none',
    banner: { js: banner(name) },
    logLevel: 'warning',
  });
  console.log('built', path.relative(game, outfile), (fs.statSync(outfile).size / 1024).toFixed(0) + ' KiB');
}

await bundle(`import * as T from 'three'; window.THREE = Object.assign({}, T);`, path.join(lib, 'three/three.min.js'), { plugins: [], name: 'three.min.js' });

const addon = (file, names) =>
  `import { ${names.join(', ')} } from '${path.join(jsm, file).replace(/\\/g, '/')}'; Object.assign(window.THREE, { ${names.join(', ')} });`;

await bundle(addon('loaders/GLTFLoader.js', ['GLTFLoader']), path.join(lib, 'three/GLTFLoader.js'), { name: 'GLTFLoader.js' });
await bundle(addon('controls/PointerLockControls.js', ['PointerLockControls']), path.join(lib, 'three/PointerLockControls.js'), { name: 'PointerLockControls.js' });
await bundle(`import * as S from '${path.join(jsm, 'utils/SkeletonUtils.js')}'; window.THREE.SkeletonUtils = S;`, path.join(lib, 'three/SkeletonUtils.js'), { name: 'SkeletonUtils.js' });
await bundle(
  [
    `import { EffectComposer } from '${path.join(jsm, 'postprocessing/EffectComposer.js')}';`,
    `import { RenderPass } from '${path.join(jsm, 'postprocessing/RenderPass.js')}';`,
    `import { UnrealBloomPass } from '${path.join(jsm, 'postprocessing/UnrealBloomPass.js')}';`,
    `import { OutputPass } from '${path.join(jsm, 'postprocessing/OutputPass.js')}';`,
    `Object.assign(window.THREE, { EffectComposer, RenderPass, UnrealBloomPass, OutputPass });`,
  ].join('\n'),
  path.join(lib, 'three/postprocessing.js'),
  { name: 'postprocessing.js' },
);

await esbuild.build({
  stdin: {
    contents: `import * as core from '@recast-navigation/core'; import * as gen from '@recast-navigation/generators'; window.Recast = Object.assign({}, core, gen);`,
    resolveDir: here,
    loader: 'js',
  },
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  outfile: path.join(lib, 'navigation/recast-navigation.js'),
  legalComments: 'none',
  banner: { js: `/* recast-navigation-js v${JSON.parse(fs.readFileSync(path.join(nm, '@recast-navigation/core/package.json'))).version} — https://github.com/isaac-mason/recast-navigation-js (MIT). Recast & Detour (c) 2009-2010 Mikko Mononen (zlib). WASM inlined. */` },
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
});
console.log('built lib/navigation/recast-navigation.js', (fs.statSync(path.join(lib, 'navigation/recast-navigation.js')).size / 1024).toFixed(0) + ' KiB');

const yukaSrc = [path.join(game, 'js/yuka.min.js'), path.join(lib, 'ai/yuka.min.js')].find((p) => fs.existsSync(p));
if (yukaSrc && yukaSrc !== path.join(lib, 'ai/yuka.min.js')) fs.copyFileSync(yukaSrc, path.join(lib, 'ai/yuka.min.js'));
console.log('yuka at lib/ai/yuka.min.js');
