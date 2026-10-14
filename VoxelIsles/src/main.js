import { buildAtlas } from './engine/atlas.js';
import { Renderer } from './engine/renderer.js';
import { buildSkyIslands } from './game/maps.js';

const canvas = document.getElementById('view');
const R = new Renderer(canvas);
R.setAtlas(buildAtlas());
const q = new URLSearchParams(location.search);
const theme = q.get('theme') || 'meadow';
const map = buildSkyIslands(+(q.get('seed') || 7), theme);
R.setTheme(theme);
R.setWorld(map.world);
const resize = () => R.resize(innerWidth, innerHeight, Math.min(devicePixelRatio, 2));
addEventListener('resize', resize); resize();
let t = 0, last = performance.now();
window.__preview = { R, map, cam: (x, y, z, lx, ly, lz) => { R.camera.position.set(x, y, z); R.camera.lookAt(lx, ly, lz); R.render(0); } };
const loop = (now) => {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  if (!window.__hold) { R.camera.position.set(Math.cos(t * 0.1) * 70, 58, Math.sin(t * 0.1) * 70); R.camera.lookAt(0, 26, 0); }
  R.flush(); R.render(dt);
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
