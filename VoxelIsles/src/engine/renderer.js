import * as THREE from 'three';
import { meshChunk } from './mesher.js';
import { Light } from './light.js';
import { CHUNK } from './world.js';

export const THEMES = {
  meadow: { day: 1, skyTop: 0x5f9fe8, skyHorizon: 0xcfe6ff, fog: 0xbfdcff, sun: 0xfff2d8, hemiSky: 0xdff0ff, hemiGround: 0x6a7a5a, void: 0x2a3d63, clouds: 0xffffff },
  desert: { day: 1, skyTop: 0x4f8fe0, skyHorizon: 0xffe6b8, fog: 0xf6dcae, sun: 0xffe6b0, hemiSky: 0xfff0d0, hemiGround: 0x8a7050, void: 0x5a3a2a, clouds: 0xfff6e8 },
  snow: { day: 0.97, skyTop: 0x6a8fc0, skyHorizon: 0xe6f0fa, fog: 0xdbe8f4, sun: 0xf0f6ff, hemiSky: 0xf0f6ff, hemiGround: 0x7a8a9a, void: 0x3a4a6a, clouds: 0xffffff },
  volcano: { day: 0.72, tint: 0xffb898, skyTop: 0x3a1a2a, skyHorizon: 0xd8603a, fog: 0x8a3a2a, sun: 0xffb080, hemiSky: 0xffc0a0, hemiGround: 0x4a2a2a, void: 0x1a0a0e, clouds: 0x6a4a4a },
  dusk: { day: 0.8, tint: 0xffd4b8, skyTop: 0x2a3a7a, skyHorizon: 0xf0a070, fog: 0xc89a8a, sun: 0xffd0a0, hemiSky: 0xffd8c0, hemiGround: 0x5a4a6a, void: 0x1a1a3a, clouds: 0xffe0d0 },
};

export class Renderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.08, 520);
    this.scene.add(this.camera);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x666666, 1.6);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.4);
    this.sun.position.set(0.5, 1, 0.35);
    this.scene.add(this.hemi, this.sun);
    this.chunks = new Map();
    this.world = null;
    this.pixel = 1;
  }
  setAtlas(atlas) {
    this.atlas = atlas;
    const tex = new THREE.DataTexture(atlas.data, atlas.width, atlas.height, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestMipmapLinearFilter; tex.generateMipmaps = true; tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
    tex.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    this.atlasTex = tex;
    this.lightU = { uDay: { value: 1 }, uSkyTint: { value: new THREE.Color(1, 1, 1) }, uBlockTint: { value: new THREE.Color(1, 0.86, 0.66) } };
    const patch = (m) => {
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, this.lightU);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 lightAttr;\nvarying vec2 vLight;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLight = lightAttr;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uDay;\nuniform vec3 uSkyTint;\nuniform vec3 uBlockTint;\nvarying vec2 vLight;\nfloat lcurve(float l) { return 0.035 + 0.965 * l * l * (1.6 - 0.6 * l) / (1.0 + 0.0 * l); }')
          .replace('#include <color_fragment>', '#include <color_fragment>\nvec3 lit = max(uSkyTint * lcurve(vLight.x * uDay), uBlockTint * lcurve(vLight.y));\ndiffuseColor.rgb *= lit;');
      };
      m.customProgramCacheKey = () => 'vlight';
      return m;
    };
    const base = { map: tex, vertexColors: true, fog: true };
    this.mats = {
      solid: patch(new THREE.MeshBasicMaterial({ ...base })),
      cutout: patch(new THREE.MeshBasicMaterial({ ...base, alphaTest: 0.5 })),
      plant: patch(new THREE.MeshBasicMaterial({ ...base, alphaTest: 0.5, side: THREE.DoubleSide })),
      trans: patch(new THREE.MeshBasicMaterial({ ...base, transparent: true, opacity: 0.85, depthWrite: false })),
    };
    this.buildOverlays();
  }
  lightAt(x, y, z) {
    const w = this.world;
    if (!w || !w.light) return 1;
    const v = w.light.at(Math.floor(x), Math.floor(y), Math.floor(z));
    const c = (l) => 0.035 + 0.965 * l * l * (1.6 - 0.6 * l);
    return Math.max(c(((v >> 4) / 15) * this.lightU.uDay.value), c((v & 15) / 15) * 0.95);
  }
  buildOverlays() {
    const g = new THREE.BoxGeometry(1.004, 1.004, 1.004);
    this.outline = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.55 }));
    this.outline.visible = false; this.scene.add(this.outline);
    const cg = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const uv = cg.attributes.uv;
    this.crackGeo = cg; this.crackUV0 = uv.array.slice();
    this.crack = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: this.atlasTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    this.crack.visible = false; this.scene.add(this.crack);
  }
  setCrack(x, y, z, stage) {
    if (stage < 0) { this.crack.visible = false; return; }
    const [u0, v0, du, dv] = this.atlas.uv(`crack${Math.min(3, stage)}`);
    const uv = this.crackGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) { uv.array[i * 2] = u0 + this.crackUV0[i * 2] * du; uv.array[i * 2 + 1] = v0 + (1 - this.crackUV0[i * 2 + 1]) * dv; }
    uv.needsUpdate = true;
    this.crack.position.set(x + 0.5, y + 0.5, z + 0.5); this.crack.visible = true;
  }
  setTheme(name) {
    const t = THEMES[name] || THEMES.meadow;
    this.theme = t;
    this.scene.fog = new THREE.Fog(t.fog, this.fogNear || 100, this.fogFar || 300);
    if (this.lightU) { this.lightU.uDay.value = t.day ?? 1; this.lightU.uSkyTint.value.set(t.tint || 0xffffff); }
    this.hemi.color.set(t.hemiSky); this.hemi.groundColor.set(t.hemiGround);
    this.sun.color.set(t.sun);
    if (this.sky) { this.scene.remove(this.sky); this.sky.geometry.dispose(); }
    const sg = new THREE.SphereGeometry(440, 24, 16);
    const top = new THREE.Color(t.skyTop), hor = new THREE.Color(t.skyHorizon), bot = new THREE.Color(t.void);
    const cols = [];
    const p = sg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const h = p.getY(i) / 440;
      const c = h > 0 ? hor.clone().lerp(top, Math.pow(h, 0.6)) : hor.clone().lerp(bot, Math.min(1, -h * 2.2));
      cols.push(c.r, c.g, c.b);
    }
    sg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.sky = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
    this.buildClouds(t.clouds);
  }
  buildClouds(color) {
    if (this.clouds) { this.scene.remove(this.clouds); this.clouds.geometry.dispose(); }
    const N = 64, S = 12, grid = new Uint8Array(N * N);
    let seed = 7;
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let k = 0; k < 46; k++) { const cx = Math.floor(r() * N), cz = Math.floor(r() * N), w = 2 + Math.floor(r() * 6), d = 2 + Math.floor(r() * 5); for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) if (r() > 0.12) grid[((cz + z) % N) * N + ((cx + x) % N)] = 1; }
    const pos = [], col = [], idx = [];
    const quad = (p, sh) => { const b = pos.length / 3; for (const q of p) pos.push(...q); for (let i = 0; i < 4; i++) col.push(sh, sh, sh); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); };
    const H = 4, half = (N * S) / 2;
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      if (!grid[z * N + x]) continue;
      const x0 = x * S - half, z0 = z * S - half, x1 = x0 + S, z1 = z0 + S;
      quad([[x0, H, z1], [x1, H, z1], [x1, H, z0], [x0, H, z0]], 1);
      quad([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], 0.78);
      const g = (xx, zz) => grid[(((zz % N) + N) % N) * N + (((xx % N) + N) % N)];
      if (!g(x + 1, z)) quad([[x1, 0, z1], [x1, 0, z0], [x1, H, z0], [x1, H, z1]], 0.9);
      if (!g(x - 1, z)) quad([[x0, 0, z0], [x0, 0, z1], [x0, H, z1], [x0, H, z0]], 0.9);
      if (!g(x, z + 1)) quad([[x0, 0, z1], [x1, 0, z1], [x1, H, z1], [x0, H, z1]], 0.85);
      if (!g(x, z - 1)) quad([[x1, 0, z0], [x0, 0, z0], [x0, H, z0], [x1, H, z0]], 0.85);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    const c = new THREE.Color(color);
    this.clouds = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c, vertexColors: true, transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
    this.clouds.position.y = 118; this.clouds.renderOrder = 1; this.cloudSpan = N * S;
    this.scene.add(this.clouds);
  }
  setWorld(world) {
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
    this.world = world;
    if (!world.light) { world.light = new Light(world); world.light.computeAll(); }
    for (let cx = 0; cx < world.cx; cx++) for (let cy = 0; cy < world.cy; cy++) for (let cz = 0; cz < world.cz; cz++) world.dirty.add(world.key(cx, cy, cz));
    this.flush(this.syncBudget ?? Infinity);
  }
  disposeChunk(c) { for (const m of c) { this.scene.remove(m); m.geometry.dispose(); } }
  flush(budget = 6) {
    const w = this.world;
    if (!w || !w.dirty.size) return 0;
    let n = 0;
    let keys = [...w.dirty];
    if (Number.isFinite(budget) && keys.length > budget) {
      const cp = this.camera.position, C = CHUNK;
      const d = (k) => { const [cx, cy, cz] = w.unkey(k); const dx = cx * C - w.ox + 8 - cp.x, dy = cy * C + 8 - cp.y, dz = cz * C - w.oz + 8 - cp.z; return dx * dx + dy * dy * 2 + dz * dz; };
      keys = keys.map((k) => [d(k), k]).sort((a, b) => a[0] - b[0]).slice(0, budget).map((e) => e[1]);
    }
    for (const k of keys) {
      if (n >= budget) break;
      w.dirty.delete(k);
      const [cx, cy, cz] = w.unkey(k);
      const old = this.chunks.get(k);
      if (old) this.disposeChunk(old);
      const out = meshChunk(w, this.atlas, cx, cy, cz, w.light);
      const meshes = [];
      for (const [kind, d] of Object.entries(out)) {
        if (!d) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
        g.setAttribute('uv', new THREE.BufferAttribute(d.uv, 2));
        g.setAttribute('color', new THREE.BufferAttribute(d.col, 3, true));
        g.setAttribute('lightAttr', new THREE.BufferAttribute(d.lt, 2, true));
        g.setIndex(new THREE.BufferAttribute(d.idx, 1));
        g.computeBoundingSphere();
        const mesh = new THREE.Mesh(g, this.mats[kind]);
        mesh.matrixAutoUpdate = false;
        if (kind === 'trans') mesh.renderOrder = 2;
        this.scene.add(mesh); meshes.push(mesh);
      }
      this.chunks.set(k, meshes);
      n++;
    }
    return n;
  }
  resize(w, h, pixel) {
    this.pixel = pixel;
    this.renderer.setPixelRatio(pixel);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  render(dt) {
    if (this.clouds) { const sp = this.cloudSpan || 768; this.clouds.position.x = ((this.clouds.position.x + dt * 1.2 + sp / 2) % sp) - sp / 2; this.clouds.position.z = 0; }
    if (this.sky) this.sky.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }
}

export { THREE, CHUNK };
