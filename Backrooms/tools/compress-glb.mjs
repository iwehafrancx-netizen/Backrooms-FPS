import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, reorder, textureCompress } from '@gltf-transform/functions';
import { EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../Backrooms FPS CrazyGames/assets');
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

export async function compress(file, { maxTex = 0, exact = false } = {}) {
  const before = fs.statSync(file).size;
  const doc = await io.read(file);
  if (doc.getRoot().listExtensionsUsed().some((e) => e.extensionName === 'EXT_meshopt_compression')) return { file, before, after: before, skipped: true };
  const steps = [];
  if (maxTex) steps.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [maxTex, maxTex], quality: 82 }));
  if (exact) steps.push(reorder({ encoder: MeshoptEncoder, target: 'size' }));
  else steps.push(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await doc.transform(...steps);
  if (exact) doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  await io.write(file, doc);
  return { file, before, after: fs.statSync(file).size };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const jobs = [
    ...['pistol', 'shotgun', 'ak47', 'm4', 'sniper'].map((g) => [path.join(assets, `Guns/${g}.glb`), {}]),
    [path.join(assets, 'NPCs/operator.glb'), { maxTex: 512 }],
    ...['backroom', 'hangar', 'manor', 'station'].map((m) => [path.join(assets, `Maps/${m}.glb`), { exact: true }]),
  ];
  for (const [f, o] of jobs) {
    const r = await compress(f, o);
    console.log(`${path.basename(f).padEnd(14)} ${(r.before / 1024).toFixed(0).padStart(5)} KiB -> ${(r.after / 1024).toFixed(0).padStart(5)} KiB${r.skipped ? ' (already compressed)' : ''}`);
  }
}
