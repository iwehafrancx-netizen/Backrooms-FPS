import { NodeIO } from '@gltf-transform/core';
import { init, exportNavMesh, NavMeshQuery, floodFillPruneNavMesh } from '@recast-navigation/core';
import { generateSoloNavMesh } from '@recast-navigation/generators';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'out');
const NAV_CONFIG = {
  cs: 0.1, ch: 0.05,
  walkableSlopeAngle: 40, walkableHeight: 18, walkableClimb: 6, walkableRadius: 3,
  maxEdgeLen: 40, maxSimplificationError: 1.1, minRegionArea: 20, mergeRegionArea: 40,
  maxVertsPerPoly: 6, detailSampleDist: 6, detailSampleMaxError: 1,
};

export async function writeNavmesh() {
  const doc = await new NodeIO().read(path.join(OUT, 'arena.glb'));
  const positions = [], indices = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    for (const prim of mesh.listPrimitives()) {
      const name = prim.getMaterial()?.getName() || '';
      if (/^(light|Lightsurround|RoofBaked|MuralA|MuralB)$/.test(name)) continue;
      const pos = prim.getAttribute('POSITION').getArray(), idx = prim.getIndices().getArray();
      const base = positions.length / 3;
      for (let i = 0; i < pos.length; i++) positions.push(pos[i]);
      for (let i = 0; i < idx.length; i++) indices.push(base + idx[i]);
    }
  }
  await init();
  const { success, navMesh, error } = generateSoloNavMesh(new Float32Array(positions), new Uint32Array(indices), NAV_CONFIG);
  if (!success) throw new Error('navmesh generation failed: ' + error);
  const q = new NavMeshQuery(navMesh);
  const seed = q.findNearestPoly({ x: 8, y: 0, z: 0 }, { halfExtents: { x: 2, y: 1, z: 2 } });
  floodFillPruneNavMesh(navMesh, [seed.nearestRef]);
  const data = exportNavMesh(navMesh);
  fs.writeFileSync(path.join(OUT, 'arena.navmesh'), data);
  let ground = 0, deck = 0, other = 0, minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (let i = 0; i < 4000; i++) {
    const r = q.findRandomPoint(); if (!r.success) continue;
    const p = r.randomPoint;
    if (p.y < 0.4) ground++; else if (p.y > 3.4 && p.y < 3.8) deck++; else other++;
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  const up = q.findNearestPoly({ x: 0, y: 3.6, z: -20 }, { halfExtents: { x: 1, y: 0.5, z: 1 } });
  const bridge = q.findNearestPoly({ x: 0, y: 3.6, z: 8 }, { halfExtents: { x: 1, y: 0.5, z: 1 } });
  console.log(`arena.navmesh: ${(data.byteLength / 1024).toFixed(0)} KiB · random points ground ${ground} / deck ${deck} / stairs+dais ${other} · x ${minX.toFixed(1)}..${maxX.toFixed(1)} z ${minZ.toFixed(1)}..${maxZ.toFixed(1)} · mezzanine ${up.success && up.nearestRef ? 'walkable' : 'MISSING'} · bridge ${bridge.success && bridge.nearestRef ? 'walkable' : 'MISSING'}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await writeNavmesh();
