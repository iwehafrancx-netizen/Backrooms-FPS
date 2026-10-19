import { SkyIslands } from './skyislands.js';
import { EggDefense } from './eggdefense.js';
import { buildSkyIslands } from '../maps/skyislands.js';
import { buildEggIslands } from '../maps/eggdefense.js';
import { CaptureFlag } from './ctf.js';
import { buildCtf } from '../maps/ctf.js';
import { BridgeBattle } from './bridge.js';
import { buildBridge } from '../maps/bridge.js';
import { DeathRun } from './deathrun.js';
import { buildDeathRun } from '../maps/deathrun.js';
import { Parkour } from './parkour.js';
import { buildParkour } from '../maps/parkour.js';
import { HideSeek } from './hideseek.js';
import { buildHideSeek } from '../maps/hideseek.js';

export const REGISTRY = {
  sky: { make: () => new SkyIslands(), build: (mp) => buildSkyIslands(mp.seed, mp.theme, 8, mp) },
  egg: { make: () => new EggDefense(), build: (mp) => buildEggIslands(mp.seed, mp.theme, 4, mp) },
  ctf: { make: () => new CaptureFlag(), build: (mp) => buildCtf(mp.seed, mp) },
  bridge: { make: () => new BridgeBattle(), build: (mp) => buildBridge(mp.seed, mp) },
  deathrun: { make: (ctx) => new DeathRun(ctx), build: (mp) => buildDeathRun(mp.seed, mp) },
  race: { make: (ctx) => new Parkour(ctx), build: (mp) => buildParkour(mp.seed, mp) },
  hideseek: { make: (ctx) => new HideSeek(ctx), build: (mp) => buildHideSeek(mp.seed, mp) },
  parkour: { make: (ctx) => new Parkour({ ...ctx, solo: true }), build: (mp) => buildParkour(mp.level, mp) },
};
