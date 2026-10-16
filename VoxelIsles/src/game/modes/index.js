import { SkyIslands } from './skyislands.js';
import { EggDefense } from './eggdefense.js';
import { buildSkyIslands } from '../maps/skyislands.js';
import { buildEggIslands } from '../maps/eggdefense.js';

export const REGISTRY = {
  sky: { make: () => new SkyIslands(), build: (mp) => buildSkyIslands(mp.seed, mp.theme, 8, mp) },
  egg: { make: () => new EggDefense(), build: (mp) => buildEggIslands(mp.seed, mp.theme, 4, mp) },
};
