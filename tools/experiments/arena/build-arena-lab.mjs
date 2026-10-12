import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeArena } from './build-arena.mjs';
import { writeNavmesh } from './build-arena-navmesh.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const tools = path.resolve(here, '../..');
const basic = path.resolve(tools, '../Backrooms FPS CrazyGames Basic');
const lab = path.resolve(tools, '../Backrooms FPS Arena Lab');

await writeArena();
await writeNavmesh();
execFileSync('node', [path.join(tools, 'build-crazygames-basic.mjs')], { stdio: 'inherit' });
fs.rmSync(lab, { recursive: true, force: true });
fs.cpSync(basic, lab, { recursive: true });
fs.copyFileSync(path.join(here, 'out/arena.glb'), path.join(lab, 'assets/Maps/backroom.glb'));
fs.copyFileSync(path.join(here, 'out/arena.navmesh'), path.join(lab, 'assets/Maps/backroom.navmesh'));

let js = fs.readFileSync(path.join(lab, 'game.js'), 'utf8');
const sub = (from, to) => { if (!js.includes(from)) throw new Error('text not found: ' + from.slice(0, 80)); js = js.split(from).join(to); };

sub(`    return { pos: r.resultPosition, ref: nref };`, `    const pos = r.resultPosition, h = this.query.getPolyHeight(nref, pos);
    if (h.success) pos.y = h.height;
    return { pos, ref: nref };`);
sub(`const p = Nav.closest({ x: px, y: 0, z: pz }); if (p) b.moveTo(p);`, `const p = Nav.closest({ x: px, y: b.a.pos.y, z: pz }); if (p) b.moveTo(p);`);
sub(`const p = Nav.closest({ x: a.x - (dz / d) * side * r, y: 0, z: a.z + (dx / d) * side * r });`, `const p = Nav.closest({ x: a.x - (dz / d) * side * r, y: a.y, z: a.z + (dx / d) * side * r });`);
sub(`const c = Nav.closest({ x: a.x + Math.sin(ang) * r, y: 0, z: a.z + Math.cos(ang) * r });`, `const c = Nav.closest({ x: a.x + Math.sin(ang) * r, y: a.y, z: a.z + Math.cos(ang) * r });`);
sub(`mat = new T.MeshBasicMaterial({ map: src.emissiveMap, side: T.FrontSide });
        mat.color.setScalar(this.brightness);`, `mat = new T.MeshBasicMaterial({ map: src.emissiveMap, side: T.FrontSide, vertexColors: !!o.geometry.attributes.color });
        mat.color.setScalar(1.45);`);
sub(`this.scene.fog = new T.Fog(0x2e2812, 10, 52);`, `this.scene.fog = new T.Fog(0x1c2229, 34, 120);`);
sub(`this.scene.background = new T.Color(0x0b0a07);`, `this.scene.background = new T.Color(0x14191f);`);
sub(`this.hemi = new T.HemisphereLight(0xfff1c2, 0x5a4a24, 2.3);`, `this.hemi = new T.HemisphereLight(0xe8f0ff, 0x3d444d, 2.3);`);
sub(`const KEY = 'backrooms.save';`, `const KEY = 'backrooms.arena';`);
sub(`data: { v: 1, unlocked: 1,`, `data: { v: 1, unlocked: 2,`);
sub(`d.unlocked = clamp(d.unlocked | 0, 1, MISSIONS.length);`, `d.unlocked = MISSIONS.length;`);
sub(`const MODES = { extermination: Extermination,`, fs.readFileSync(path.join(here, 'ctf.js'), 'utf8') + `const MODES = { ctf: CaptureTheFlag, extermination: Extermination,`);
if (/requestAd/.test(js)) throw new Error('ad code in the arena lab');
fs.writeFileSync(path.join(lab, 'game.js'), js);

let html = fs.readFileSync(path.join(lab, 'index.html'), 'utf8');
html = html.replace('<title>Backrooms - FPS</title>', '<title>Backrooms - FPS · Arena Lab</title>');
fs.writeFileSync(path.join(lab, 'index.html'), html);
console.log('wrote', path.relative(path.resolve(tools, '..'), lab));
