// Bakes the walkable area of the Backrooms map into a Recast/Detour navmesh binary
// ("Backrooms FPS/assets/Maps/backroom.navmesh") so the game boots instantly (no runtime generation).
// The game uses the SAME parameters to regenerate at runtime if the file is ever missing.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { init, exportNavMesh, NavMeshQuery, floodFillPruneNavMesh } from '@recast-navigation/core';
import { generateSoloNavMesh } from '@recast-navigation/generators';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const NAV_CONFIG = {
  cs: 0.1, ch: 0.05,
  walkableSlopeAngle: 40, walkableHeight: 18, walkableClimb: 6, walkableRadius: 3,
  maxEdgeLen: 40, maxSimplificationError: 1.1, minRegionArea: 20, mergeRegionArea: 40,
  maxVertsPerPoly: 6, detailSampleDist: 6, detailSampleMaxError: 1,
};

const here = path.dirname(fileURLToPath(import.meta.url));
const mapPath = path.resolve(here, '../Backrooms FPS/assets/Maps/backroom.glb');
const outPath = path.resolve(here, '../Backrooms FPS/assets/Maps/backroom.navmesh');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(mapPath);

function mul(m, x, y, z) {
  return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
}

const positions = [];
const indices = [];
const report = [];
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const m = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    const name = prim.getMaterial()?.getName() || '';
    const pos = prim.getAttribute('POSITION').getArray();
    const idx = prim.getIndices()?.getArray();
    let minY = 1e9, maxY = -1e9;
    const world = [];
    for (let i = 0; i < pos.length; i += 3) {
      const w = mul(m, pos[i], pos[i + 1], pos[i + 2]);
      world.push(w);
      minY = Math.min(minY, w[1]); maxY = Math.max(maxY, w[1]);
    }
    report.push(`${name.padEnd(20)} y ${minY.toFixed(2)}..${maxY.toFixed(2)}`);
    // The ceiling, ceiling lights and plugs can't be walked on — keep only geometry that touches the floor.
    if (minY > 1.0) continue;
    if (/^(light|Lightsurround|RoofBaked)$/.test(name) && maxY - minY < 0.3 && minY > 1) continue;
    const base = positions.length / 3;
    for (const w of world) positions.push(...w);
    const list = idx || [...Array(world.length).keys()];
    for (let i = 0; i < list.length; i++) indices.push(base + list[i]);
  }
}
console.log(report.join('\n'));

await init();
const { success, navMesh, error } = generateSoloNavMesh(new Float32Array(positions), new Uint32Array(indices), NAV_CONFIG);
if (!success) throw new Error('navmesh generation failed: ' + error);
// The model's carpet/ceiling planes extend past the building into an unlit void. Keep only the
// polygons connected to the interior (flood fill from a point inside the main hall).
export const INTERIOR_SEED = { x: 5, y: 0, z: 15 };
const q = new NavMeshQuery(navMesh);
const seed = q.findNearestPoly(INTERIOR_SEED, { halfExtents: { x: 2, y: 2, z: 2 } });
floodFillPruneNavMesh(navMesh, [seed.nearestRef]);
const data = exportNavMesh(navMesh);
fs.writeFileSync(outPath, data);
const bounds = { minX: 1e9, maxX: -1e9, minZ: 1e9, maxZ: -1e9 };
for (let i = 0; i < 2000; i++) {
  const r = q.findRandomPoint();
  if (!r.success) continue;
  const p = r.randomPoint;
  bounds.minX = Math.min(bounds.minX, p.x); bounds.maxX = Math.max(bounds.maxX, p.x);
  bounds.minZ = Math.min(bounds.minZ, p.z); bounds.maxZ = Math.max(bounds.maxZ, p.z);
}
console.log('interior random-point bounds', JSON.stringify(bounds));

let ok = 0;
for (let i = 0; i < 200; i++) if (q.findRandomPoint().success) ok++;
console.log(`navmesh written: ${(data.byteLength / 1024).toFixed(0)} KiB, tiles ${navMesh.getMaxTiles()}, random-point probe ${ok}/200`);
