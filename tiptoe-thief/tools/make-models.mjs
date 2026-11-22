// Generates every 3D model of the game as Wavefront .obj files in
// assets/models, plus one shared materials.mtl that points at the textures in
// assets/textures (made by tools/make-textures.mjs).
//
//   node tools/make-models.mjs
//
// Conventions used by the game (src/game/assets.js relies on them):
//   - metres, +Y up, the "front" of a piece of furniture faces -Z
//   - furniture sits on y = 0 and is centred on x/z inside its footprint
//   - character parts are modelled around their joint (shoulder, hip, neck)
//     so the game can rotate them to animate walking without a skeleton
//   - assets/models/manifest.json lists every model with its bounding box
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mesh, writeMtl } from './lib/obj.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'assets/models');
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- materials
// Colours are linear-ish sRGB values; `map` textures come from make-textures.
const MATERIALS = {
  skin: { color: [0.86, 0.66, 0.52], shine: 12 },
  skin_dark: { color: [0.55, 0.38, 0.27], shine: 12 },
  hair_dark: { color: [0.12, 0.09, 0.07], shine: 30 },
  hair_grey: { color: [0.62, 0.6, 0.58], shine: 30 },
  eye: { color: [0.05, 0.05, 0.06], shine: 80 },
  hoodie: { color: [0.2, 0.22, 0.27], map: 'fabric_knit.jpg', shine: 6 },
  beanie: { color: [0.62, 0.16, 0.14], map: 'fabric_knit.jpg', shine: 6 },
  mask: { color: [0.08, 0.08, 0.09], map: 'fabric_knit.jpg', shine: 6 },
  trousers: { color: [0.16, 0.16, 0.18], map: 'fabric_denim.jpg', shine: 6 },
  shoe: { color: [0.09, 0.09, 0.1], shine: 30 },
  sole: { color: [0.75, 0.73, 0.7], shine: 10 },
  sack: { color: [0.62, 0.52, 0.36], map: 'fabric_burlap.jpg', shine: 4 },
  uniform: { color: [0.22, 0.3, 0.44], map: 'fabric_twill.jpg', shine: 8 },
  uniform_trousers: { color: [0.13, 0.15, 0.2], map: 'fabric_twill.jpg', shine: 8 },
  belt: { color: [0.08, 0.07, 0.06], shine: 40 },
  badge: { color: [0.86, 0.72, 0.3], shine: 90 },
  cap: { color: [0.12, 0.15, 0.24], map: 'fabric_twill.jpg', shine: 10 },
  pajama: { color: [0.56, 0.68, 0.82], map: 'fabric_stripes.jpg', shine: 6 },
  slipper: { color: [0.55, 0.32, 0.26], shine: 6 },
  metal: { color: [0.62, 0.63, 0.66], map: 'metal_brushed.jpg', shine: 120 },
  metal_dark: { color: [0.18, 0.19, 0.21], map: 'metal_brushed.jpg', shine: 90 },
  black_plastic: { color: [0.06, 0.06, 0.07], shine: 60 },
  white_plastic: { color: [0.9, 0.9, 0.88], shine: 60 },
  glass: { color: [0.55, 0.7, 0.78], opacity: 0.35, shine: 150 },
  screen: { color: [0.03, 0.04, 0.06], shine: 150, emissive: [0.02, 0.04, 0.08] },
  bulb: { color: [1, 0.92, 0.7], emissive: [1, 0.85, 0.55] },
  red_light: { color: [1, 0.1, 0.08], emissive: [1, 0.05, 0.03] },
  wood_oak: { color: [0.78, 0.6, 0.42], map: 'wood_oak.jpg', shine: 25 },
  wood_dark: { color: [0.42, 0.28, 0.18], map: 'wood_walnut.jpg', shine: 35 },
  wood_white: { color: [0.92, 0.91, 0.88], map: 'wood_painted.jpg', shine: 30 },
  fabric_sofa: { color: [0.36, 0.42, 0.38], map: 'fabric_weave.jpg', shine: 4 },
  fabric_chair: { color: [0.62, 0.5, 0.36], map: 'fabric_weave.jpg', shine: 4 },
  leather: { color: [0.36, 0.2, 0.12], map: 'leather.jpg', shine: 40 },
  sheets: { color: [0.92, 0.92, 0.94], map: 'fabric_cotton.jpg', shine: 4 },
  duvet: { color: [0.46, 0.55, 0.7], map: 'fabric_cotton.jpg', shine: 4 },
  pillow: { color: [0.96, 0.96, 0.96], map: 'fabric_cotton.jpg', shine: 4 },
  ceramic: { color: [0.95, 0.95, 0.94], shine: 110 },
  terracotta: { color: [0.66, 0.36, 0.24], map: 'terracotta.jpg', shine: 10 },
  soil: { color: [0.22, 0.15, 0.1], shine: 2 },
  leaf: { color: [0.28, 0.48, 0.22], map: 'leaf.png', shine: 20 },
  marble: { color: [0.9, 0.9, 0.88], map: 'marble.jpg', shine: 120 },
  paper: { color: [0.95, 0.94, 0.9], shine: 4 },
  book_a: { color: [0.55, 0.18, 0.16], shine: 10 },
  book_b: { color: [0.16, 0.3, 0.46], shine: 10 },
  book_c: { color: [0.24, 0.42, 0.26], shine: 10 },
  book_d: { color: [0.76, 0.62, 0.3], shine: 10 },
  gold: { color: [1, 0.78, 0.3], shine: 160 },
  silver: { color: [0.86, 0.87, 0.9], shine: 160 },
  gem: { color: [0.2, 0.6, 1], shine: 200, emissive: [0.02, 0.08, 0.16] },
  cash: { color: [0.55, 0.72, 0.5], map: 'banknote.jpg', shine: 4 },
  canvas_a: { color: [1, 1, 1], map: 'painting_a.jpg', shine: 8 },
  canvas_b: { color: [1, 1, 1], map: 'painting_b.jpg', shine: 8 },
  frame_gold: { color: [0.82, 0.62, 0.26], shine: 110 },
  rug: { color: [1, 1, 1], map: 'rug.jpg', shine: 2 },
  safe_paint: { color: [0.24, 0.27, 0.25], map: 'metal_painted.jpg', shine: 50 },
  door_wood: { color: [0.86, 0.84, 0.8], map: 'wood_painted.jpg', shine: 30 },
  laser: { color: [1, 0.1, 0.1], emissive: [1, 0.08, 0.06], opacity: 0.8 },
  rubber: { color: [0.1, 0.1, 0.1], shine: 8 },
  van_paint: { color: [0.86, 0.86, 0.84], map: 'metal_painted.jpg', shine: 70 },
};

const manifest = {};
function save(name, mesh, meta = {}) {
  fs.writeFileSync(path.join(OUT, name + '.obj'), mesh.toObj(name, 'materials.mtl'));
  manifest[name] = { ...mesh.bounds(), ...meta };
}

// ---------------------------------------------------------------- characters
// Adult proportions (about 1.75 m). The hips are at y = 0.92 in the game; parts
// below are modelled relative to their own joint.

// Head + neck, pivot at the base of the neck.
function head({ hair = 'hair_dark', skin = 'skin', beard = false, bald = false } = {}) {
  const m = new Mesh();
  m.use(skin).limb(0.055, 0.055, 0.08, 10); // neck
  m.move(0, [0, 0.08, 0]);
  m.ellipsoid([0, 0.2, 0], [0.095, 0.12, 0.105]); // skull + face
  m.ellipsoid([0, 0.17, -0.098], [0.018, 0.024, 0.02], 8, 6); // nose
  m.ellipsoid([-0.093, 0.19, 0], [0.012, 0.03, 0.022], 6, 5); // ears
  m.ellipsoid([0.093, 0.19, 0], [0.012, 0.03, 0.022], 6, 5);
  m.use('eye').ellipsoid([-0.035, 0.215, -0.088], [0.012, 0.009, 0.008], 8, 6).ellipsoid([0.035, 0.215, -0.088], [0.012, 0.009, 0.008], 8, 6);
  if (!bald) m.use(hair).ellipsoid([0, 0.245, 0.012], [0.1, 0.085, 0.105]); // hair cap, a little behind the forehead
  if (beard) m.use(hair).ellipsoid([0, 0.13, -0.045], [0.08, 0.05, 0.07]);
  return m;
}

// Torso, pivot at the hips. `kind` changes clothing details.
function torso(kind) {
  const m = new Mesh();
  const cloth = { thief: 'hoodie', guard: 'uniform', resident: 'pajama' }[kind];
  // tapered chest made from a lathe, slightly flattened front-to-back afterwards
  const k0 = m.mark();
  m.use(cloth).lathe([[0.15, 0], [0.165, 0.12], [0.17, 0.3], [0.19, 0.45], [0.17, 0.55], [0.08, 0.6]], 16);
  m.transform(k0, ([x, y, z]) => [x, y, z * 0.68], ([x, y, z]) => [x, y, z / 0.68]);
  if (kind === 'thief') {
    // hood resting on the shoulders + front pocket
    m.use('hoodie').ellipsoid([0, 0.56, 0.07], [0.12, 0.06, 0.08], 10, 6);
    m.box([-0.1, 0.12, -0.125], [0.1, 0.24, -0.1], { tile: 0.3 });
  } else if (kind === 'guard') {
    m.use('belt').cylinder([0, 0.0, 0], 0.158, 0.16, 0.06, 16);
    m.use('metal').box([-0.03, 0.005, -0.12], [0.03, 0.05, -0.105]);
    m.use('badge').box([0.06, 0.4, -0.125], [0.11, 0.46, -0.112]);
    m.use('uniform').box([-0.13, 0.33, -0.124], [-0.05, 0.4, -0.11], { tile: 0.3 }); // chest pocket
  } else {
    m.use('pajama').box([-0.012, 0.05, -0.122], [0.012, 0.52, -0.11], { tile: 0.3 }); // button placket
  }
  return m;
}

// Whole arm hanging down from the shoulder pivot: upper arm, forearm, hand.
function arm(kind) {
  const cloth = { thief: 'hoodie', guard: 'uniform', resident: 'pajama' }[kind];
  const m = new Mesh();
  m.use(cloth).limb(0.048, 0.042, 0.3, 10);
  const f = m.mark(); m.limb(0.042, 0.036, 0.26, 10); m.move(f, [0, -0.3, 0]);
  m.use(kind === 'thief' ? 'mask' : 'skin').ellipsoid([0, -0.6, -0.005], [0.035, 0.055, 0.025], 8, 6); // hand (thief wears gloves)
  return m;
}

// Whole leg from the hip pivot: thigh, shin, shoe.
function leg(kind) {
  const cloth = { thief: 'trousers', guard: 'uniform_trousers', resident: 'pajama' }[kind];
  const m = new Mesh();
  m.use(cloth).limb(0.075, 0.058, 0.44, 12);
  const s = m.mark(); m.limb(0.058, 0.045, 0.4, 12); m.move(s, [0, -0.44, 0]);
  if (kind === 'resident') {
    m.use('slipper').bevelBox([-0.05, -0.92, -0.17], [0.05, -0.85, 0.06], 0.02);
  } else {
    m.use('shoe').bevelBox([-0.052, -0.9, -0.17], [0.052, -0.83, 0.06], 0.025);
    m.use('sole').box([-0.054, -0.92, -0.175], [0.054, -0.9, 0.065]);
  }
  return m;
}

function characterParts() {
  for (const kind of ['thief', 'guard', 'resident']) {
    save(`char_${kind}_torso`, torso(kind));
    save(`char_${kind}_arm`, arm(kind));
    save(`char_${kind}_leg`, leg(kind));
  }
  save('char_thief_head', head({ hair: 'hair_dark' }));
  save('char_guard_head', head({ hair: 'hair_dark', skin: 'skin_dark' }));
  save('char_resident_head', head({ hair: 'hair_grey', beard: true }));

  // thief accessories: knitted beanie, eye mask band, loot sack
  const beanie = new Mesh().use('beanie').lathe([[0.108, 0], [0.11, 0.04], [0.1, 0.09], [0.07, 0.13], [0.0, 0.15]], 16);
  beanie.use('beanie').cylinder([0, -0.01, 0], 0.112, 0.112, 0.035, 16); // folded rim
  save('acc_beanie', beanie);
  const mask = new Mesh().use('mask').lathe([[0.104, 0], [0.106, 0.045]], 16);
  save('acc_mask', mask);
  const sack = new Mesh().use('sack').ellipsoid([0, 0, 0], [0.17, 0.22, 0.13], 12, 9);
  sack.use('sack').lathe([[0.05, 0.2], [0.035, 0.26], [0.06, 0.3]], 10); // tied neck
  save('acc_sack', sack);
  // guard accessories: peaked cap, torch
  const cap = new Mesh().use('cap').lathe([[0.108, 0], [0.11, 0.05], [0.09, 0.09], [0.0, 0.1]], 16);
  const visor = cap.mark(); cap.use('black_plastic').box([-0.08, 0, -0.17], [0.08, 0.012, -0.08]); cap.rotX(visor, -0.15, [0, 0, -0.08]);
  cap.use('badge').box([-0.02, 0.04, -0.11], [0.02, 0.07, -0.1]);
  save('acc_guard_cap', cap);
  const torch = new Mesh().use('metal_dark').cylinder([0, 0, 0], 0.018, 0.018, 0.2, 10);
  torch.use('metal_dark').cylinder([0, 0.2, 0], 0.018, 0.03, 0.05, 10);
  torch.use('bulb').cylinder([0, 0.25, 0], 0.028, 0.028, 0.004, 10);
  const t0 = 0; torch.rotX(t0, -Math.PI / 2); // point forward (-Z)
  save('acc_torch', torch);
}

// ---------------------------------------------------------------- furniture
function furniture() {
  // Double bed (1.6 x 2.1 m), headboard at +Z; residents sleep in it.
  {
    const m = new Mesh();
    m.use('wood_dark').bevelBox([-0.82, 0, -1.05], [0.82, 0.32, 1.05], 0.02, { tile: 0.6 });
    m.use('wood_dark').bevelBox([-0.84, 0, 0.98], [0.84, 1.05, 1.08], 0.02, { tile: 0.6 }); // headboard
    m.use('sheets').bevelBox([-0.78, 0.32, -1.0], [0.78, 0.52, 0.96], 0.05, { tile: 0.5 }); // mattress
    m.use('duvet').bevelBox([-0.8, 0.5, -1.02], [0.8, 0.6, 0.35], 0.06, { tile: 0.5 });
    m.use('pillow').ellipsoid([-0.38, 0.58, 0.7], [0.3, 0.07, 0.18]).ellipsoid([0.38, 0.58, 0.7], [0.3, 0.07, 0.18]);
    save('bed_double', m, { hide: 'under', solid: true });
  }
  // Single bed (1.0 x 2.0 m)
  {
    const m = new Mesh();
    m.use('wood_oak').bevelBox([-0.5, 0, -1.0], [0.5, 0.3, 1.0], 0.02, { tile: 0.6 });
    m.use('wood_oak').bevelBox([-0.52, 0, 0.94], [0.52, 0.85, 1.02], 0.02, { tile: 0.6 });
    m.use('sheets').bevelBox([-0.46, 0.3, -0.96], [0.46, 0.48, 0.92], 0.05, { tile: 0.5 });
    m.use('duvet').bevelBox([-0.48, 0.46, -0.98], [0.48, 0.55, 0.3], 0.06, { tile: 0.5 });
    m.use('pillow').ellipsoid([0, 0.54, 0.66], [0.3, 0.07, 0.17]);
    save('bed_single', m, { hide: 'under', solid: true });
  }
  // Three-seat sofa (2.1 x 0.9 m), back at +Z
  {
    const m = new Mesh();
    m.use('fabric_sofa').bevelBox([-1.05, 0.08, -0.45], [1.05, 0.42, 0.45], 0.05, { tile: 0.4 });
    m.bevelBox([-1.05, 0.08, 0.22], [1.05, 0.88, 0.45], 0.06, { tile: 0.4 }); // back
    m.bevelBox([-1.05, 0.08, -0.45], [-0.88, 0.62, 0.45], 0.05, { tile: 0.4 }); // arms
    m.bevelBox([0.88, 0.08, -0.45], [1.05, 0.62, 0.45], 0.05, { tile: 0.4 });
    for (const x of [-0.58, 0, 0.58]) m.bevelBox([x - 0.28, 0.42, -0.42], [x + 0.28, 0.54, 0.22], 0.05, { tile: 0.4 }); // cushions
    m.use('wood_dark'); for (const [x, z] of [[-0.98, -0.38], [0.98, -0.38], [-0.98, 0.38], [0.98, 0.38]]) m.cylinder([x, 0, z], 0.025, 0.03, 0.08, 8);
    save('sofa', m, { hide: 'behind', solid: true });
  }
  // Armchair
  {
    const m = new Mesh();
    m.use('leather').bevelBox([-0.42, 0.08, -0.42], [0.42, 0.42, 0.42], 0.05, { tile: 0.4 });
    m.bevelBox([-0.42, 0.08, 0.2], [0.42, 0.95, 0.42], 0.06, { tile: 0.4 });
    m.bevelBox([-0.42, 0.08, -0.42], [-0.3, 0.62, 0.42], 0.04, { tile: 0.4 });
    m.bevelBox([0.3, 0.08, -0.42], [0.42, 0.62, 0.42], 0.04, { tile: 0.4 });
    m.bevelBox([-0.3, 0.42, -0.4], [0.3, 0.52, 0.2], 0.04, { tile: 0.4 });
    m.use('wood_dark'); for (const [x, z] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) m.cylinder([x, 0, z], 0.022, 0.026, 0.08, 8);
    save('armchair', m, { solid: true });
  }
  // Dining table 1.6 x 0.9 and a chair
  {
    const m = new Mesh();
    m.use('wood_oak').bevelBox([-0.8, 0.72, -0.45], [0.8, 0.76, 0.45], 0.01, { tile: 0.8 });
    for (const [x, z] of [[-0.72, -0.37], [0.72, -0.37], [-0.72, 0.37], [0.72, 0.37]]) m.bevelBox([x - 0.035, 0, z - 0.035], [x + 0.035, 0.72, z + 0.035], 0.008, { tile: 0.8 });
    save('table_dining', m, { hide: 'under', solid: true });
    const c = new Mesh();
    c.use('wood_oak').bevelBox([-0.22, 0.44, -0.22], [0.22, 0.48, 0.22], 0.01, { tile: 0.5 });
    for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) c.bevelBox([x - 0.02, 0, z - 0.02], [x + 0.02, 0.44, z + 0.02], 0.005);
    c.bevelBox([-0.21, 0.48, 0.17], [0.21, 0.95, 0.21], 0.01, { tile: 0.5 });
    c.use('fabric_chair').bevelBox([-0.2, 0.48, -0.2], [0.2, 0.52, 0.17], 0.02, { tile: 0.3 });
    save('chair', c, { solid: true });
  }
  // Office desk with drawers + monitor; laptop and swivel chair
  {
    const m = new Mesh();
    m.use('wood_white').bevelBox([-0.7, 0.72, -0.35], [0.7, 0.75, 0.35], 0.01, { tile: 0.8 });
    m.use('wood_white').box([-0.68, 0, -0.33], [-0.3, 0.72, 0.33], { tile: 0.8 }); // drawer unit
    m.use('metal').box([-0.52, 0.55, -0.335], [-0.46, 0.57, -0.33]).box([-0.52, 0.3, -0.335], [-0.46, 0.32, -0.33]);
    m.use('metal_dark').box([0.62, 0, -0.3], [0.66, 0.72, 0.3]);
    m.use('black_plastic').box([0.05, 0.75, 0.1], [0.25, 0.77, 0.24]).box([0.13, 0.77, 0.17], [0.17, 0.95, 0.2]);
    m.use('black_plastic').box([-0.2, 0.9, 0.12], [0.5, 1.2, 0.15]);
    m.use('screen').box([-0.18, 0.92, 0.115], [0.48, 1.18, 0.12]);
    m.use('black_plastic').box([-0.1, 0.75, -0.15], [0.3, 0.765, 0.0]); // keyboard
    save('desk', m, { hide: 'under', solid: true });
  }
  {
    const m = new Mesh();
    m.use('black_plastic').cylinder([0, 0.05, 0], 0.03, 0.03, 0.38, 8);
    for (let i = 0; i < 5; i++) { const k = m.mark(); m.box([-0.02, 0.03, 0], [0.02, 0.06, 0.28]); m.rotY(k, (i / 5) * Math.PI * 2); }
    m.use('fabric_sofa').bevelBox([-0.25, 0.43, -0.25], [0.25, 0.5, 0.25], 0.04, { tile: 0.3 });
    m.bevelBox([-0.23, 0.5, 0.18], [0.23, 1.05, 0.25], 0.04, { tile: 0.3 });
    save('office_chair', m, { solid: true });
  }
  // Wardrobe 1.2 x 0.6 x 2.0 - you can hide inside
  {
    const m = new Mesh();
    m.use('wood_oak').bevelBox([-0.6, 0, -0.3], [0.6, 2.0, 0.3], 0.01, { tile: 0.8 });
    m.use('wood_dark').box([-0.005, 0.05, -0.305], [0.005, 1.95, -0.3]); // door split
    m.use('metal').box([-0.06, 1.0, -0.32], [-0.04, 1.2, -0.305]).box([0.04, 1.0, -0.32], [0.06, 1.2, -0.305]);
    save('wardrobe', m, { hide: 'inside', solid: true });
  }
  // Bookshelf 1.0 x 0.32 x 2.0 with books
  {
    const m = new Mesh();
    m.use('wood_dark').box([-0.5, 0, -0.16], [-0.47, 2.0, 0.16], { tile: 0.8 }).box([0.47, 0, -0.16], [0.5, 2.0, 0.16], { tile: 0.8 });
    m.box([-0.5, 0, 0.13], [0.5, 2.0, 0.16], { tile: 0.8 });
    for (const y of [0, 0.48, 0.96, 1.44, 1.97]) m.box([-0.47, y, -0.16], [0.47, y + 0.03, 0.13], { tile: 0.8 });
    const mats = ['book_a', 'book_b', 'book_c', 'book_d'];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const y of [0.03, 0.51, 0.99, 1.47]) {
      let x = -0.45;
      while (x < 0.42) { const w = 0.025 + rnd() * 0.035, h = 0.28 + rnd() * 0.14; m.use(mats[Math.floor(rnd() * 4)]).box([x, y, -0.12], [x + w, y + h, 0.12]); x += w + 0.004; }
    }
    save('bookshelf', m, { solid: true });
  }
  // Kitchen counter 1.2 x 0.6 with marble top, and a fridge
  {
    const m = new Mesh();
    m.use('wood_white').box([-0.6, 0.1, -0.28], [0.6, 0.88, 0.3], { tile: 0.8 });
    m.use('black_plastic').box([-0.6, 0, -0.24], [0.6, 0.1, 0.3]);
    m.use('marble').box([-0.62, 0.88, -0.32], [0.62, 0.92, 0.32], { tile: 0.6 });
    m.use('metal').box([-0.35, 0.72, -0.295], [-0.2, 0.735, -0.28]).box([0.2, 0.72, -0.295], [0.35, 0.735, -0.28]);
    m.use('wood_dark').box([-0.002, 0.12, -0.285], [0.002, 0.86, -0.28]);
    save('kitchen_counter', m, { solid: true });
    const f = new Mesh();
    f.use('white_plastic').bevelBox([-0.35, 0, -0.33], [0.35, 1.85, 0.33], 0.03, { tile: 0.8 });
    f.use('black_plastic').box([-0.35, 1.2, -0.335], [0.35, 1.21, -0.33]);
    f.use('metal').box([0.25, 1.3, -0.37], [0.28, 1.7, -0.335]).box([0.25, 0.5, -0.37], [0.28, 1.1, -0.335]);
    save('fridge', f, { solid: true });
  }
  // TV on a low cabinet
  {
    const m = new Mesh();
    m.use('wood_dark').bevelBox([-0.8, 0.05, -0.2], [0.8, 0.5, 0.2], 0.01, { tile: 0.8 });
    m.use('black_plastic').box([-0.75, 0, -0.15], [-0.7, 0.05, 0.15]).box([0.7, 0, -0.15], [0.75, 0.05, 0.15]);
    m.box([-0.1, 0.5, -0.05], [0.1, 0.53, 0.1]).box([-0.03, 0.53, 0.02], [0.03, 0.62, 0.06]);
    m.box([-0.62, 0.6, 0.0], [0.62, 1.32, 0.06]);
    m.use('screen').box([-0.6, 0.62, -0.003], [0.6, 1.3, 0.0]);
    save('tv_cabinet', m, { solid: true });
  }
  // Floor lamp, table lamp and side table
  {
    const m = new Mesh();
    m.use('metal_dark').cylinder([0, 0, 0], 0.15, 0.15, 0.03, 16).cylinder([0, 0.03, 0], 0.012, 0.012, 1.45, 8);
    m.use('fabric_cotton_shade').lathe([[0.2, 1.4], [0.14, 1.68]], 16);
    m.use('bulb').ellipsoid([0, 1.48, 0], [0.04, 0.05, 0.04], 8, 6);
    save('lamp_floor', m, { light: [0, 1.5, 0] });
    const s = new Mesh();
    s.use('wood_dark').bevelBox([-0.25, 0.55, -0.25], [0.25, 0.58, 0.25], 0.01).box([-0.23, 0, -0.23], [-0.2, 0.55, -0.2]).box([0.2, 0, -0.23], [0.23, 0.55, -0.2]).box([-0.23, 0, 0.2], [-0.2, 0.55, 0.23]).box([0.2, 0, 0.2], [0.23, 0.55, 0.23]);
    s.use('ceramic').lathe([[0.06, 0.58], [0.08, 0.64], [0.06, 0.74], [0.015, 0.78]], 14);
    s.use('fabric_cotton_shade').lathe([[0.13, 0.76], [0.09, 0.92]], 14);
    s.use('bulb').ellipsoid([0, 0.8, 0], [0.025, 0.03, 0.025], 8, 6);
    save('side_table_lamp', s, { light: [0, 0.82, 0], solid: true });
  }
  // Potted plant - you can hide behind it
  {
    const m = new Mesh();
    m.use('terracotta').lathe([[0.16, 0], [0.2, 0.05], [0.24, 0.45], [0.26, 0.48], [0.22, 0.48]], 16, { tile: 2 });
    m.use('soil').cylinder([0, 0.43, 0], 0.22, 0.22, 0.01, 16, true);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    m.use('leaf');
    for (let i = 0; i < 22; i++) {
      const a = rnd() * Math.PI * 2, tilt = 0.35 + rnd() * 0.75, len = 0.45 + rnd() * 0.5, y = 0.44 + rnd() * 0.25;
      const k = m.mark();
      // a leaf is a narrow double-sided diamond lifted from the soil
      const w = 0.07 + rnd() * 0.05;
      const P = (x, yy, z) => ({ p: [x, yy, z], uv: [(x / w + 1) / 2, z / len], n: [0, 1, 0] });
      m.quad(P(0, 0, 0), P(w, 0.02, len * 0.45), P(0, 0, len), P(-w, 0.02, len * 0.45));
      m.quad(P(0, 0, 0), P(-w, 0.02, len * 0.45), P(0, 0, len), P(w, 0.02, len * 0.45));
      m.rotX(k, -tilt).rotY(k, a).move(k, [0, y, 0]);
    }
    save('plant_big', m, { hide: 'behind' });
  }
  // Bathroom: bathtub, toilet, sink
  {
    const m = new Mesh();
    m.use('ceramic').bevelBox([-0.38, 0, -0.85], [0.38, 0.55, 0.85], 0.06, { tile: 0.6 });
    m.use('metal').cylinder([0, 0.55, 0.78], 0.02, 0.02, 0.2, 8);
    save('bathtub', m, { hide: 'inside', solid: true });
    const t = new Mesh();
    t.use('ceramic').lathe([[0.12, 0], [0.16, 0.12], [0.2, 0.38], [0.18, 0.42]], 14);
    t.transform(0, ([x, y, z]) => [x, y, z * 1.25 - 0.03], ([x, y, z]) => [x, y, z / 1.25]);
    t.use('ceramic').bevelBox([-0.19, 0.38, 0.12], [0.19, 0.78, 0.3], 0.03);
    t.use('white_plastic').cylinder([0, 0.42, -0.03], 0.21, 0.21, 0.02, 16);
    save('toilet', t, { solid: true });
    const s = new Mesh();
    s.use('wood_white').box([-0.32, 0, -0.22], [0.32, 0.78, 0.24], { tile: 0.8 });
    s.use('ceramic').bevelBox([-0.34, 0.78, -0.25], [0.34, 0.86, 0.26], 0.03);
    s.use('metal').cylinder([0, 0.86, 0.17], 0.015, 0.015, 0.16, 8).box([-0.015, 0.98, 0.04], [0.015, 1.0, 0.18]);
    s.use('glass').box([-0.3, 1.1, 0.24], [0.3, 1.7, 0.26]);
    save('sink', s, { solid: true });
  }
  // Rug 2.0 x 1.4
  {
    const m = new Mesh().use('rug');
    const P = (x, z, u, v) => ({ p: [x, 0.006, z], uv: [u, v], n: [0, 1, 0] });
    m.quad(P(-1, 0.7, 0, 1), P(1, 0.7, 1, 1), P(1, -0.7, 1, 0), P(-1, -0.7, 0, 0));
    save('rug', m, { flat: true });
  }
  // Painting on the wall (loot!) - the back touches z = 0
  for (const [name, mat] of [['painting_a', 'canvas_a'], ['painting_b', 'canvas_b']]) {
    const m = new Mesh();
    m.use('frame_gold').box([-0.45, 1.15, -0.05], [0.45, 1.85, 0]);
    m.use(mat);
    const P = (x, y, u, v) => ({ p: [x, y, -0.052], uv: [u, v], n: [0, 0, -1] });
    m.quad(P(0.39, 1.21, 1, 0), P(-0.39, 1.21, 0, 0), P(-0.39, 1.79, 0, 1), P(0.39, 1.79, 1, 1));
    save(name, m, { wall: true });
  }
  // Floor safe with dial (loot inside)
  {
    const m = new Mesh();
    m.use('safe_paint').bevelBox([-0.35, 0, -0.32], [0.35, 0.75, 0.32], 0.03, { tile: 0.6 });
    m.use('metal_dark').box([-0.3, 0.05, -0.33], [0.3, 0.7, -0.32]);
    const d = m.mark(); m.use('metal').cylinder([0, 0, 0], 0.07, 0.07, 0.03, 20); m.rotX(d, -Math.PI / 2); m.move(d, [-0.08, 0.42, -0.33]);
    m.use('metal').box([0.1, 0.38, -0.36], [0.22, 0.46, -0.33]);
    save('safe', m, { solid: true, interact: 'crack' });
  }
}

// ---------------------------------------------------------------- doors & security
function doorsAndSecurity() {
  // Interior door leaf, hinge at x = 0, closes along +X (0.9 m wide, 2.05 m tall)
  {
    const m = new Mesh();
    m.use('door_wood').box([0, 0, -0.022], [0.88, 2.04, 0.022], { tile: 0.8 });
    m.use('wood_white').box([0.12, 0.25, -0.026], [0.76, 0.95, -0.022]).box([0.12, 1.1, -0.026], [0.76, 1.85, -0.022]);
    m.use('wood_white').box([0.12, 0.25, 0.022], [0.76, 0.95, 0.026]).box([0.12, 1.1, 0.026], [0.76, 1.85, 0.026]);
    m.use('metal').box([0.74, 0.98, -0.06], [0.84, 1.0, 0.06]).cylinder([0.79, 0.94, 0], 0.03, 0.03, 0.12, 10);
    save('door_leaf', m);
  }
  // Front door: darker, with a keyhole plate; same hinge convention
  {
    const m = new Mesh();
    m.use('wood_dark').box([0, 0, -0.03], [0.92, 2.1, 0.03], { tile: 0.8 });
    for (const y of [0.2, 0.75, 1.3]) m.box([0.1, y, -0.036], [0.82, y + 0.45, -0.03]).box([0.1, y, 0.03], [0.82, y + 0.45, 0.036]);
    m.use('gold').box([0.76, 0.9, -0.06], [0.86, 1.1, 0.06]);
    save('door_front', m);
  }
  // Window: frame + glass, centred, 1.2 wide, sill at 0.9
  {
    const m = new Mesh();
    m.use('wood_white').box([-0.62, 0.88, -0.08], [0.62, 0.95, 0.08]).box([-0.62, 2.05, -0.06], [0.62, 2.1, 0.06]);
    m.box([-0.62, 0.95, -0.05], [-0.57, 2.05, 0.05]).box([0.57, 0.95, -0.05], [0.62, 2.05, 0.05]).box([-0.025, 0.95, -0.05], [0.025, 2.05, 0.05]);
    m.use('glass').box([-0.57, 0.95, -0.01], [0.57, 2.05, 0.01]);
    save('window', m);
  }
  // Security camera on a wall bracket, looking along -Z; pivot is the bracket
  {
    const m = new Mesh();
    m.use('white_plastic').box([-0.04, -0.06, -0.02], [0.04, 0.06, 0]);
    m.use('metal').cylinder([0, -0.01, -0.02], 0.012, 0.012, 0.03, 8);
    const b = m.mark(); m.use('white_plastic').bevelBox([-0.06, 0, -0.26], [0.06, 0.09, 0], 0.02); m.move(b, [0, 0.0, -0.03]);
    const lens = m.mark(); m.use('black_plastic').cylinder([0, 0, 0], 0.035, 0.04, 0.02, 12); m.rotX(lens, -Math.PI / 2); m.move(lens, [0, 0.045, -0.29]);
    m.use('red_light').ellipsoid([0.035, 0.07, -0.25], [0.008, 0.008, 0.008], 6, 4);
    save('security_camera', m);
  }
  // Laser emitter post (the beam is drawn by the game between two posts)
  {
    const m = new Mesh();
    m.use('metal_dark').bevelBox([-0.05, 0, -0.05], [0.05, 1.1, 0.05], 0.01);
    m.use('red_light').cylinder([0, 0.3, -0.06], 0.012, 0.012, 0.01, 8).cylinder([0, 0.75, -0.06], 0.012, 0.012, 0.01, 8);
    save('laser_post', m, { solid: true });
  }
  // Fuse box on the wall - switching it off kills cameras and lasers
  {
    const m = new Mesh();
    m.use('metal_painted_grey').bevelBox([-0.2, 1.2, -0.12], [0.2, 1.7, 0], 0.01);
    m.use('black_plastic').box([-0.15, 1.45, -0.125], [-0.05, 1.6, -0.12]);
    m.use('red_light').box([0.05, 1.55, -0.125], [0.12, 1.6, -0.12]);
    save('fuse_box', m, { wall: true, interact: 'fuse' });
  }
  // Getaway van (exit) 4.6 x 1.9 x 2.1, front at -Z
  {
    const m = new Mesh();
    m.use('van_paint').bevelBox([-0.95, 0.35, -2.3], [0.95, 2.05, 2.3], 0.12, { tile: 1.5 });
    m.use('glass').box([-0.9, 1.3, -2.32], [0.9, 1.9, -2.28]).box([-0.97, 1.35, -2.1], [-0.93, 1.85, -1.3]).box([0.93, 1.35, -2.1], [0.97, 1.85, -1.3]);
    m.use('black_plastic').box([-0.97, 0.35, -2.32], [0.97, 0.6, -2.26]).box([-0.97, 0.35, 2.26], [0.97, 0.6, 2.32]);
    m.use('bulb').box([-0.85, 0.75, -2.33], [-0.6, 0.9, -2.3]).box([0.6, 0.75, -2.33], [0.85, 0.9, -2.3]);
    m.use('red_light').box([-0.9, 0.8, 2.3], [-0.7, 1.0, 2.33]).box([0.7, 0.8, 2.3], [0.9, 1.0, 2.33]);
    for (const [x, z] of [[-0.88, -1.5], [0.88, -1.5], [-0.88, 1.5], [0.88, 1.5]]) { const k = m.mark(); m.use('rubber').cylinder([0, -0.12, 0], 0.36, 0.36, 0.24, 18); m.rotZ(k, Math.PI / 2); m.move(k, [x, 0.36, z]); }
    save('van', m, { solid: true, exit: true });
  }
}

// ---------------------------------------------------------------- loot
function loot() {
  const L = {};
  // jewellery box with an open lid and a gem
  { const m = new Mesh(); m.use('wood_dark').bevelBox([-0.12, 0, -0.08], [0.12, 0.08, 0.08], 0.01); const k = m.mark(); m.box([-0.12, 0, 0], [0.12, 0.015, 0.16]); m.rotX(k, -1.2); m.move(k, [0, 0.08, 0.08]); m.use('gem').ellipsoid([0, 0.1, 0], [0.03, 0.03, 0.03], 8, 6); m.use('gold').ellipsoid([-0.06, 0.09, 0.01], [0.025, 0.012, 0.025], 8, 4); L.loot_jewels = m; }
  // bundle of banknotes
  { const m = new Mesh(); m.use('cash').box([-0.08, 0, -0.04], [0.08, 0.05, 0.04], { tile: 0.16 }); m.use('paper').box([-0.015, -0.001, -0.041], [0.015, 0.051, 0.041]); L.loot_cash = m; }
  // laptop, half open
  { const m = new Mesh(); m.use('metal').box([-0.17, 0, -0.12], [0.17, 0.018, 0.12]); const k = m.mark(); m.box([-0.17, 0, 0], [0.17, 0.012, 0.23]); m.use('screen').box([-0.15, 0.012, 0.01], [0.15, 0.014, 0.21]); m.rotX(k, -1.75); m.move(k, [0, 0.018, 0.12]); L.loot_laptop = m; }
  // gold bars
  { const m = new Mesh(); m.use('gold'); for (const [x, y, z] of [[-0.06, 0, 0], [0.06, 0, 0], [0, 0.045, 0]]) m.prism([[x - 0.05, z - 0.03], [x + 0.05, z - 0.03], [x + 0.045, z + 0.03], [x - 0.045, z + 0.03]], y, y + 0.045); L.loot_gold = m; }
  // wristwatch
  { const m = new Mesh(); m.use('leather').box([-0.015, 0, -0.1], [0.015, 0.006, 0.1]); m.use('silver').cylinder([0, 0.006, 0], 0.03, 0.03, 0.012, 16); m.use('paper').cylinder([0, 0.018, 0], 0.025, 0.025, 0.001, 16); L.loot_watch = m; }
  // porcelain vase
  { const m = new Mesh(); m.use('ceramic').lathe([[0.06, 0], [0.1, 0.08], [0.11, 0.18], [0.06, 0.3], [0.045, 0.36], [0.06, 0.4]], 16); L.loot_vase = m; }
  // game console + controller
  { const m = new Mesh(); m.use('black_plastic').bevelBox([-0.15, 0, -0.1], [0.15, 0.05, 0.1], 0.02); m.use('bulb').box([-0.1, 0.03, -0.101], [-0.06, 0.035, -0.1]); m.use('black_plastic').ellipsoid([0.05, 0.06, -0.02], [0.07, 0.015, 0.04], 10, 5); L.loot_console = m; }
  // smartphone
  { const m = new Mesh(); m.use('black_plastic').bevelBox([-0.035, 0, -0.075], [0.035, 0.009, 0.075], 0.008); m.use('screen').box([-0.031, 0.009, -0.07], [0.031, 0.01, 0.07]); L.loot_phone = m; }
  for (const [k, m] of Object.entries(L)) save(k, m, { loot: true });
  // gadget the thief throws to make noise
  { const m = new Mesh(); m.use('gold').cylinder([0, 0, 0], 0.012, 0.012, 0.003, 14); save('coin', m); }
}

characterParts();
furniture();
doorsAndSecurity();
loot();

// a few materials referenced above that only exist for specific pieces
MATERIALS.fabric_cotton_shade = { color: [0.96, 0.9, 0.78], map: 'fabric_cotton.jpg', shine: 4, emissive: [0.25, 0.2, 0.12] };
MATERIALS.metal_painted_grey = { color: [0.55, 0.57, 0.6], map: 'metal_painted.jpg', shine: 50 };

fs.writeFileSync(path.join(OUT, 'materials.mtl'), writeMtl(MATERIALS));
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`wrote ${Object.keys(manifest).length} models + materials.mtl to assets/models`);
