// Optimizes the original assets in /source-assets into "Backrooms FPS/assets" for a small, fast bundle.
//  - textures -> WebP (max 1024 px; the map keeps 2048 for its baked lighting)
//  - NPC: the 15 Mixamo clips each target a duplicate armature; they are retargeted onto the real
//    skinned armature, made "in place" (root motion removed), renamed, and the duplicates deleted.
//  - geometry welded/pruned; no Draco/meshopt so the stock GLTFLoader needs no decoders.
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, textureCompress, resample } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../source-assets');
const out = path.resolve(here, '../Backrooms FPS/assets');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// Clip index (1-based, as authored) -> gameplay name. Classified from hip root motion
// (forward = +Y in armature space, left = +X) and verified visually in the browser.
const CLIP_NAMES = {
  1: 'aim_idle', 2: 'run_back', 3: 'run', 4: 'idle', 5: 'sprint', 6: 'run_back_fast', 7: 'walk_crouch',
  8: 'walk_back', 9: 'walk_slow', 10: 'strafe_right', 11: 'strafe_left', 12: 'walk_back_slow',
  13: 'walk', 14: 'walk_back_alt', 15: 'death',
};

const jobs = [
  { from: 'Maps/backroom-2nd.glb', to: 'Maps/backroom.glb', size: 2048 },
  { from: 'NPCs/2nd-character-skin.glb', to: 'NPCs/operator.glb', size: 512, npc: true },
  { from: 'Guns/Pistol.glb', to: 'Guns/pistol.glb', size: 512 },
  { from: 'Guns/triple_barrel_shotgun_pistol.glb', to: 'Guns/shotgun.glb', size: 512 },
  { from: 'Guns/AK47.glb', to: 'Guns/ak47.glb', size: 1024 },
  { from: 'Guns/colt ma rifle.glb', to: 'Guns/m4.glb', size: 512 },
  { from: 'Guns/sniper.glb', to: 'Guns/sniper.glb', size: 1024 },
];

function retargetNpc(doc) {
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  const armatures = scene.listChildren();
  const main = armatures.find((n) => n.getName() === 'Armature');
  const byName = new Map();
  main.traverse((n) => byName.set(n.getName(), n));

  root.listAnimations().forEach((anim, i) => {
    const idx = i + 1;
    anim.setName(CLIP_NAMES[idx] || `clip_${idx}`);
    for (const ch of anim.listChannels()) {
      const target = byName.get(ch.getTargetNode().getName());
      if (!target) { ch.dispose(); continue; }
      ch.setTargetNode(target);
      // Remove root motion: hips keep their bob/height but lose horizontal travel.
      if (target.getName() === 'mixamorig:Hips' && ch.getTargetPath() === 'translation') {
        const s = ch.getSampler();
        const t = s.getInput().getArray();
        const v = s.getOutput().getArray().slice();
        const dur = t[t.length - 1] || 1;
        const n = t.length;
        const x0 = v[0], y0 = v[1], x1 = v[(n - 1) * 3], y1 = v[(n - 1) * 3 + 1];
        for (let k = 0; k < n; k++) {
          const f = t[k] / dur;
          v[k * 3] -= (x1 - x0) * f + x0;
          v[k * 3 + 1] -= (y1 - y0) * f + y0;
        }
        const acc = doc.createAccessor().setType('VEC3').setArray(v).setBuffer(root.listBuffers()[0]);
        s.setOutput(acc);
      }
    }
  });
  const doomed = [];
  for (const a of armatures) if (a !== main) a.traverse((n) => doomed.push(n));
  for (const n of doomed) n.dispose();
}

let total = 0;
for (const job of jobs) {
  const doc = await io.read(path.join(src, job.from));
  if (job.npc) retargetNpc(doc);
  await doc.transform(
    // keep materials distinct: the NPC's 4 parts share identical params but must be tinted separately
    dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE] }),
    ...(job.npc ? [resample()] : [weld()]),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [job.size, job.size], quality: 82 }),
    prune(),
  );
  const dst = path.join(out, job.to);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  await io.write(dst, doc);
  const before = fs.statSync(path.join(src, job.from)).size, after = fs.statSync(dst).size;
  total += after;
  console.log(`${job.to.padEnd(22)} ${(before / 1024).toFixed(0).padStart(6)} KiB -> ${(after / 1024).toFixed(0).padStart(6)} KiB`);
}
console.log('assets total', (total / 1048576).toFixed(2), 'MiB');
