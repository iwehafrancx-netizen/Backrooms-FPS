import * as THREE from 'three';
import { meshChunk } from './mesher.js';
import { CHUNK } from './world.js';

export const THEMES = {
  meadow: { skyTop: 0x5f9fe8, skyHorizon: 0xcfe6ff, fog: 0xbfdcff, sun: 0xfff2d8, hemiSky: 0xdff0ff, hemiGround: 0x6a7a5a, void: 0x2a3d63, clouds: 0xffffff },
  desert: { skyTop: 0x4f8fe0, skyHorizon: 0xffe6b8, fog: 0xf6dcae, sun: 0xffe6b0, hemiSky: 0xfff0d0, hemiGround: 0x8a7050, void: 0x5a3a2a, clouds: 0xfff6e8 },
  snow: { skyTop: 0x6a8fc0, skyHorizon: 0xe6f0fa, fog: 0xdbe8f4, sun: 0xf0f6ff, hemiSky: 0xf0f6ff, hemiGround: 0x7a8a9a, void: 0x3a4a6a, clouds: 0xffffff },
  volcano: { skyTop: 0x3a1a2a, skyHorizon: 0xd8603a, fog: 0x8a3a2a, sun: 0xffb080, hemiSky: 0xffc0a0, hemiGround: 0x4a2a2a, void: 0x1a0a0e, clouds: 0x6a4a4a },
  dusk: { skyTop: 0x2a3a7a, skyHorizon: 0xf0a070, fog: 0xc89a8a, sun: 0xffd0a0, hemiSky: 0xffd8c0, hemiGround: 0x5a4a6a, void: 0x1a1a3a, clouds: 0xffe0d0 },
};

export class Renderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.08, 260);
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
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
    this.atlasTex = tex;
    const base = { map: tex, vertexColors: true, fog: true };
    this.mats = {
      solid: new THREE.MeshBasicMaterial({ ...base }),
      cutout: new THREE.MeshBasicMaterial({ ...base, alphaTest: 0.5 }),
      plant: new THREE.MeshBasicMaterial({ ...base, alphaTest: 0.5, side: THREE.DoubleSide }),
      trans: new THREE.MeshBasicMaterial({ ...base, transparent: true, opacity: 0.85, depthWrite: false }),
    };
    this.buildOverlays();
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
    this.scene.fog = new THREE.Fog(t.fog, 60, 190);
    this.hemi.color.set(t.hemiSky); this.hemi.groundColor.set(t.hemiGround);
    this.sun.color.set(t.sun);
    if (this.sky) { this.scene.remove(this.sky); this.sky.geometry.dispose(); }
    const sg = new THREE.SphereGeometry(200, 24, 16);
    const top = new THREE.Color(t.skyTop), hor = new THREE.Color(t.skyHorizon), bot = new THREE.Color(t.void);
    const cols = [];
    const p = sg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const h = p.getY(i) / 200;
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
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const n = 46;
    const inst = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, fog: false }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
    let seed = 7;
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < n; i++) {
      v.set((r() - 0.5) * 320, 70 + r() * 10, (r() - 0.5) * 320);
      s.set(8 + r() * 22, 2.5, 6 + r() * 16);
      m.compose(v, q, s); inst.setMatrixAt(i, m);
    }
    this.clouds = inst; this.scene.add(inst);
  }
  setWorld(world) {
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
    this.world = world;
    for (let cx = 0; cx < world.cx; cx++) for (let cy = 0; cy < world.cy; cy++) for (let cz = 0; cz < world.cz; cz++) world.dirty.add(world.key(cx, cy, cz));
    this.flush(Infinity);
  }
  disposeChunk(c) { for (const m of c) { this.scene.remove(m); m.geometry.dispose(); } }
  flush(budget = 6) {
    const w = this.world;
    if (!w || !w.dirty.size) return 0;
    let n = 0;
    for (const k of [...w.dirty]) {
      if (n >= budget) break;
      w.dirty.delete(k);
      const [cx, cy, cz] = w.unkey(k);
      const old = this.chunks.get(k);
      if (old) this.disposeChunk(old);
      const out = meshChunk(w, this.atlas, cx, cy, cz);
      const meshes = [];
      for (const [kind, d] of Object.entries(out)) {
        if (!d) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
        g.setAttribute('uv', new THREE.BufferAttribute(d.uv, 2));
        g.setAttribute('color', new THREE.BufferAttribute(d.col, 3, true));
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
    if (this.clouds) this.clouds.position.x = (this.clouds.position.x + dt * 0.6) % 160;
    if (this.sky) this.sky.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }
}

export { THREE, CHUNK };
