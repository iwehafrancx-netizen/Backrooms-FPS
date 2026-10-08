import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cg = process.argv[2] === 'crazygames';
const game = path.resolve(here, cg ? '../Backrooms FPS CrazyGames' : '../Backrooms FPS Standalone');
const out = path.resolve(here, cg ? '../dist/web-demo-crazygames' : '../dist/web-demo');
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
${cg ? '<script src="crazygames-test-sdk.js"></script>' : ''}
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
let js = fs.readFileSync(path.join(game, 'game.js'), 'utf8');
if (cg) {
  const from = `  async binary(url, kb) {
    const r = await fetch(url);`;
  if (!js.includes(from)) throw new Error('loader marker not found');
  js = js.replace(from, `  async binary(url, kb) {
    if (window.BACKROOMS_WEB_DEMO && window.BACKROOMS_WEB_DEMO.b64) {
      const r = await fetch(url + '.b64.txt');
      if (!r.ok) throw new Error('Failed to load ' + url);
      const bin = atob((await r.text()).trim()); const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      this.bump(kb); return out.buffer;
    }
    const r = await fetch(url);`);
  fs.copyFileSync(path.join(here, 'crazygames-test-sdk.js'), path.join(out, 'crazygames-test-sdk.js')); files.push('crazygames-test-sdk.js');
}
fs.writeFileSync(path.join(out, 'game.js'), js); files.push('game.js');
walk('lib'); walk('assets');
let total = 0; for (const f of files) total += fs.statSync(path.join(out, f)).size;
console.log(`${path.relative(path.resolve(here, '..'), out)}: ${files.length} files, ${(total / 1048576).toFixed(2)} MiB`);
console.log(JSON.stringify(files.filter((f) => f !== 'index.html')));
