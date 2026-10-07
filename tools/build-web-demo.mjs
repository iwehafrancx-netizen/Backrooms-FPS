// Builds the browser test link from the standalone game ("Backrooms FPS Standalone/") into dist/web-demo/, ready to publish as a
// claude.ai Artifact. The Artifact host adds the doctype/head/body skeleton itself and does not serve .glb files,
// so this build:
//   - writes index.html with only a <title>, the inlined stylesheet, the body markup and game.js;
//   - copies game.js and lib/;
//   - stores every binary asset (.glb, .navmesh) as base64 text (<file>.b64.txt), which game.js decodes when
//     window.BACKROOMS_WEB_DEMO.b64 is set.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const game = path.resolve(here, '../Backrooms FPS Standalone'); // run build-standalone.mjs first
const out = path.resolve(here, '../dist/web-demo');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(game, 'css/style.css'), 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).trim();
const page = `<title>Backrooms</title>
<meta name="theme-color" content="#0b0a07">
<style>
${css}
</style>
<script>window.BACKROOMS_WEB_DEMO = { b64: true };</script>
${body}
`;
if (/youtube\.com|<html|<head|<body|<!doctype/i.test(page)) throw new Error('web demo page must not contain the SDK tag or document skeleton');
fs.writeFileSync(path.join(out, 'index.html'), page);

const files = ['index.html'];
const walk = (dir) => {
  for (const f of fs.readdirSync(path.join(game, dir))) {
    const rel = path.join(dir, f), src = path.join(game, rel);
    if (fs.statSync(src).isDirectory()) { walk(rel); continue; }
    fs.mkdirSync(path.join(out, dir), { recursive: true });
    if (/\.(glb|navmesh)$/.test(f)) { fs.writeFileSync(path.join(out, rel + '.b64.txt'), fs.readFileSync(src).toString('base64')); files.push(rel + '.b64.txt'); }
    else { fs.copyFileSync(src, path.join(out, rel)); files.push(rel); }
  }
};
fs.copyFileSync(path.join(game, 'game.js'), path.join(out, 'game.js')); files.push('game.js');
walk('lib'); walk('assets');
let total = 0; for (const f of files) total += fs.statSync(path.join(out, f)).size;
console.log(`dist/web-demo: ${files.length} files, ${(total / 1048576).toFixed(2)} MiB`);
console.log(JSON.stringify(files.filter((f) => f !== 'index.html')));
