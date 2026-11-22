// Renderer, lights and the follow camera.
//
// The camera looks down at the thief from behind and above (about 55 degrees),
// like a security monitor. Walls never hide the thief: every wall/tall-prop
// material gets a tiny shader patch (`cutaway`) that discards fragments near
// the thief on the camera's side, so you look "through" the house.
import * as THREE from 'three';

export const QUALITY = {
  low: { pixel: 0.75, shadows: false, lamps: 4 },
  med: { pixel: 1, shadows: true, shadowSize: 1024, lamps: 8 },
  high: { pixel: 1.5, shadows: true, shadowSize: 2048, lamps: 14 },
};

export class Renderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1020);
    this.scene.fog = new THREE.Fog(0x0b1020, 26, 60);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 120);
    this.camTarget = new THREE.Vector3();
    this.camDist = 15; // metres from the target; changed by zoom
    this.camPitch = THREE.MathUtils.degToRad(56);

    // Night: cool sky light, a moon that casts the shadows, and room lamps
    // (point lights) added per level by setLamps().
    this.hemi = new THREE.HemisphereLight(0x8aa0d8, 0x1a1410, 0.55);
    this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0xb8c8ff, 0.8);
    this.moon.position.set(-12, 24, 10);
    this.moon.shadow.camera.left = -22; this.moon.shadow.camera.right = 22;
    this.moon.shadow.camera.top = 22; this.moon.shadow.camera.bottom = -22;
    this.moon.shadow.bias = -0.0006; this.moon.shadow.normalBias = 0.03;
    this.scene.add(this.moon, this.moon.target);
    this.lamps = [];

    // uniforms shared by every cut-away material
    this.cutUniforms = { uCutCenter: { value: new THREE.Vector3(0, 0, 0) }, uCutOn: { value: 1 } };
    this.setQuality('med');
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  setQuality(level) {
    this.quality = QUALITY[level] ? level : 'med';
    const q = QUALITY[this.quality];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixel));
    this.renderer.shadowMap.enabled = q.shadows;
    this.moon.castShadow = q.shadows;
    if (q.shadows) { this.moon.shadow.mapSize.set(q.shadowSize, q.shadowSize); this.moon.shadow.map?.dispose(); this.moon.shadow.map = null; }
    this.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // portrait screens need a wider view to see the same room
    this.camera.fov = w / h < 1 ? 58 : 40;
    this.camera.updateProjectionMatrix();
  }

  // Patch a material so it is cut away around the thief on the camera side.
  cutaway(mat) {
    if (mat.userData.cutaway) return mat;
    mat.userData.cutaway = true;
    const U = this.cutUniforms;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uCutCenter = U.uCutCenter;
      shader.uniforms.uCutOn = U.uCutOn;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCutWorld;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvCutWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCutWorld;\nuniform vec3 uCutCenter;\nuniform float uCutOn;')
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          // Doll's-house view: everything between the camera (south, +Z) and the
          // thief is cut down to waist height so the rooms ahead are visible.
          if (uCutOn > 0.5 && vCutWorld.y > 1.05 && vCutWorld.z > uCutCenter.z - 0.65) discard;`);
    };
    mat.customProgramCacheKey = () => 'cutaway';
    return mat;
  }

  // The opposite of cutaway(): only drawn where walls ARE cut, as a dark lid
  // on the cut wall so it reads like a clean architectural section.
  cutCap(mat) {
    const U = this.cutUniforms;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uCutCenter = U.uCutCenter;
      shader.uniforms.uCutOn = U.uCutOn;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCutWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvCutWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCutWorld;\nuniform vec3 uCutCenter;\nuniform float uCutOn;')
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if (uCutOn < 0.5 || vCutWorld.z <= uCutCenter.z - 0.65) discard;`);
    };
    mat.customProgramCacheKey = () => 'cutcap';
    return mat;
  }

  // Replace the room lamps for a new level: `points` = [{x, y, z, color?, power?}].
  // Only the nearest N (quality dependent) are real lights; the rest glow only.
  setLamps(points) {
    for (const l of this.lamps) this.scene.remove(l);
    this.lamps = [];
    this.lampPoints = points;
    const n = Math.min(points.length, QUALITY[this.quality].lamps);
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffc98a, 6, 7.5, 1.6);
      this.scene.add(l);
      this.lamps.push(l);
    }
    this.assignLamps(new THREE.Vector3());
  }

  // Give the real lights to the lamp points closest to the camera target.
  assignLamps(around) {
    if (!this.lampPoints) return;
    const sorted = this.lampPoints.map((p) => [p, (p.x - around.x) ** 2 + (p.z - around.z) ** 2]).sort((a, b) => a[1] - b[1]);
    this.lamps.forEach((l, i) => {
      const p = sorted[i] && sorted[i][0];
      if (!p) { l.visible = false; return; }
      l.visible = true; l.position.set(p.x, p.y, p.z);
      l.color.set(p.color ?? 0xffc98a); l.intensity = p.power ?? 6;
    });
  }

  // Smoothly follow `target` (a Vector3). Called every frame.
  follow(target, dt, snap = false) {
    const k = snap ? 1 : 1 - Math.exp(-dt * 5);
    this.camTarget.lerp(target, k);
    const t = this.camTarget;
    const h = Math.sin(this.camPitch) * this.camDist, back = Math.cos(this.camPitch) * this.camDist;
    this.camera.position.set(t.x, t.y + h, t.z + back);
    this.camera.lookAt(t.x, t.y, t.z);
    this.moon.position.set(t.x - 12, 24, t.z + 10);
    this.moon.target.position.set(t.x, 0, t.z);
    this.cutUniforms.uCutCenter.value.copy(target);
    if ((this._lampT = (this._lampT || 0) + dt) > 0.5) { this._lampT = 0; this.assignLamps(t); }
  }

  zoom(delta) { this.camDist = THREE.MathUtils.clamp(this.camDist + delta, 9, 24); }
  // (tests may set camDist directly for an overview shot)

  render() { this.renderer.render(this.scene, this.camera); }

  // Screen point -> world point on the floor (y = 0); null if it misses.
  pickFloor(clientX, clientY) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit) ? hit : null;
  }

  // World position -> CSS pixels (for "?" / "!" marks above heads).
  toScreen(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight, visible: p.z < 1 };
  }
}
