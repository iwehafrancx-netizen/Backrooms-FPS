// Loads the game's Wavefront .obj models and the shared materials.mtl.
//
// three.js ships an OBJLoader, but ours is ~100 lines, understands exactly the
// subset tools/make-models.mjs writes (triangles, v/vt/vn, usemtl groups) and
// turns every material into a MeshStandardMaterial so the whole game shares one
// lighting model. Parsed models are cached; `instance()` returns a cheap clone
// that shares geometry and materials.
import * as THREE from 'three';

const BASE = 'assets/';

export class ModelLibrary {
  constructor(renderer) {
    this.renderer = renderer;
    this.textureLoader = new THREE.TextureLoader();
    this.textures = new Map();
    this.materials = {};
    this.models = new Map(); // name -> THREE.Group (template)
    this.manifest = {};
  }

  // Load materials + manifest + every listed model. `onProgress(0..1)`.
  async load(onProgress = () => {}) {
    const [mtl, manifest] = await Promise.all([
      fetch(BASE + 'models/materials.mtl').then((r) => r.text()),
      fetch(BASE + 'models/manifest.json').then((r) => r.json()),
    ]);
    this.manifest = manifest;
    this.materials = this.parseMtl(mtl);
    const names = Object.keys(manifest);
    let done = 0;
    // fetch in parallel; parsing is cheap compared with the network
    await Promise.all(names.map(async (name) => {
      const text = await fetch(`${BASE}models/${name}.obj`).then((r) => r.text());
      this.models.set(name, this.parseObj(name, text));
      onProgress(++done / names.length);
    }));
  }

  texture(file) {
    if (!this.textures.has(file)) {
      const t = this.textureLoader.load(BASE + 'textures/' + file);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      this.textures.set(file, t);
    }
    return this.textures.get(file);
  }

  // .mtl -> { name: MeshStandardMaterial }
  parseMtl(text) {
    const out = {};
    let cur = null;
    const finish = () => {
      if (!cur) return;
      const ns = cur.Ns ?? 20;
      const mat = new THREE.MeshStandardMaterial({
        name: cur.name,
        color: new THREE.Color().setRGB(...(cur.Kd || [1, 1, 1]), THREE.SRGBColorSpace),
        // Phong shininess 0..200 -> PBR roughness (shiny = smooth)
        roughness: THREE.MathUtils.clamp(1 - Math.sqrt(ns / 200), 0.08, 1),
        metalness: /metal|gold|silver|badge/.test(cur.name) ? 0.8 : 0,
        transparent: (cur.d ?? 1) < 1,
        opacity: cur.d ?? 1,
        side: /leaf/.test(cur.name) ? THREE.DoubleSide : THREE.FrontSide,
      });
      if (cur.map) mat.map = this.texture(cur.map.replace('../textures/', ''));
      if (/leaf/.test(cur.name)) mat.alphaTest = 0.5;
      if (cur.Ke) { mat.emissive.setRGB(...cur.Ke, THREE.SRGBColorSpace); mat.emissiveIntensity = 1.4; }
      if (mat.transparent) mat.depthWrite = false;
      out[cur.name] = mat;
    };
    for (const line of text.split('\n')) {
      const [key, ...rest] = line.trim().split(/\s+/);
      if (key === 'newmtl') { finish(); cur = { name: rest[0] }; }
      else if (!cur) continue;
      else if (key === 'Kd' || key === 'Ke') cur[key] = rest.map(Number);
      else if (key === 'Ns' || key === 'd') cur[key] = Number(rest[0]);
      else if (key === 'map_Kd') cur.map = rest[0];
    }
    finish();
    return out;
  }

  // .obj -> THREE.Group with one Mesh per material group.
  parseObj(name, text) {
    const v = [], vt = [], vn = [];
    const groups = new Map();
    let cur = null;
    for (const line of text.split('\n')) {
      if (line.length < 2 || line[0] === '#') continue;
      const parts = line.trim().split(/\s+/);
      switch (parts[0]) {
        case 'v': v.push(+parts[1], +parts[2], +parts[3]); break;
        case 'vt': vt.push(+parts[1], +parts[2]); break;
        case 'vn': vn.push(+parts[1], +parts[2], +parts[3]); break;
        case 'usemtl':
          if (!groups.has(parts[1])) groups.set(parts[1], { pos: [], uv: [], nor: [] });
          cur = groups.get(parts[1]);
          break;
        case 'f':
          for (let i = 1; i <= 3; i++) {
            const [a, b, c] = parts[i].split('/').map((s) => parseInt(s, 10) - 1);
            cur.pos.push(v[a * 3], v[a * 3 + 1], v[a * 3 + 2]);
            cur.uv.push(vt[b * 2], vt[b * 2 + 1]);
            cur.nor.push(vn[c * 3], vn[c * 3 + 1], vn[c * 3 + 2]);
          }
          break;
        default: break;
      }
    }
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, g] of groups) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, this.materials[mat] || this.materials.default || new THREE.MeshStandardMaterial());
      mesh.name = mat;
      mesh.castShadow = !this.materials[mat]?.transparent;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }

  // Shared-geometry copy of a model, ready to place in the scene.
  instance(name) {
    const tpl = this.models.get(name);
    if (!tpl) throw new Error(`unknown model "${name}"`);
    return tpl.clone(true);
  }

  // Same as instance() but with private material copies (for tinting one
  // character's outfit without changing everyone else).
  instanceOwnMaterials(name) {
    const g = this.instance(name);
    g.traverse((o) => { if (o.isMesh) o.material = o.material.clone(); });
    return g;
  }

  info(name) { return this.manifest[name]; }
}
