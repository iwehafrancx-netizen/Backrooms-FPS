import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { navmesh } from './kit.mjs';
import { compress } from '../compress-glb.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../Backrooms FPS CrazyGames/assets/Maps');
const only = process.argv.slice(2);

for (const id of ['hangar', 'manor', 'station']) {
  if (only.length && !only.includes(id)) continue;
  const { build } = await import(`./${id}.mjs`);
  const { kit, tex, seed } = await build();
  const glb = path.join(out, `${id}.glb`);
  const g = await kit.write(glb, tex);
  const n = await navmesh(glb, path.join(out, `${id}.navmesh`), seed);
  const c = await compress(glb, { exact: true });
  console.log(`${id.padEnd(7)} glb ${g.kb.toFixed(0).padStart(4)} KiB -> ${(c.after / 1024).toFixed(0)} KiB compressed (${g.verts} verts, ${g.tris} tris) · navmesh ${n.kb.toFixed(0)} KiB · walkable floors at y ${n.floors.join(', ')}`);
}
