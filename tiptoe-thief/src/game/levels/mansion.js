// Hilltop Mansion: lasers, a safe, a full staff of guards and the final score.
import { Grid, room, onWall, diningSet, street, van } from './kit.js';

// 9 - Laser beams guard the gallery. Cut the power or step round them.
export const redLines = (() => {
  const g = new Grid(26, 16);
  g.fill(2, 2, 23, 6, '.').fill(2, 8, 9, 12, ':').fill(11, 8, 16, 12, ',').fill(18, 8, 23, 12, ':');
  g.outline(1, 1, 24, 13, 'X').hline(2, 23, 7).vline(10, 8, 12).vline(17, 8, 12);
  g.set(5, 7, 'D').set(13, 7, 'D').set(20, 7, 'D').set(6, 13, 'D');
  for (const x of [4, 9, 14, 19]) g.set(x, 1, 'W');
  g.set(1, 4, 'W').set(24, 4, 'W').set(1, 10, 'W').set(24, 10, 'W').set(20, 13, 'W');
  g.set(6, 14, '=');
  street(g, 15);
  const Gl = room(2, 2, 23, 6), Lb = room(2, 8, 9, 12), Ut = room(11, 8, 16, 12), Bd = room(18, 8, 23, 12);
  return {
    id: 'red-lines', name: 'Red Lines', area: 'mansion', tip: 'tipLaser',
    map: g.rows(), start: [6.5, 14.5], ...van(18, 15),
    props: [
      // gallery: paintings on the north wall (props), sculptures on plinths (loot)
      { t: 'painting_a', x: 6.0, z: 1.6 }, { t: 'painting_b', x: 12.0, z: 1.6 }, { t: 'painting_a', x: 18.0, z: 1.6 },
      { t: 'plant_big', x: 2.1, z: 2.1 }, { t: 'plant_big', x: 23.9, z: 2.1 }, { t: 'lamp_floor', x: 9.0, z: 6.9 }, { t: 'lamp_floor', x: 16.0, z: 6.9 },
      onWall('bookshelf', Lb, 'w', 9.5), onWall('bookshelf', Lb, 'w', 11.0), { t: 'armchair', x: 6.0, z: 10.5, r: 3 }, { t: 'side_table_lamp', x: 7.2, z: 10.5 },
      onWall('fuse_box', Ut, 's', 14.0), onWall('wardrobe', Ut, 'e', 9.5), { t: 'lamp_floor', x: 10.9, z: 12.9 },
      onWall('bed_double', Bd, 'e', 10.0), onWall('wardrobe', Bd, 's', 19.3),
    ],
    lasers: [
      { a: [10.0, 1.7], b: [10.0, 6.3] },
      { a: [16.0, 1.7], b: [16.0, 6.3] },
    ],
    loot: [
      { t: 'loot_vase', x: 21.5, z: 4.0, value: 240, target: true },
      { t: 'loot_watch', x: 13.0, z: 4.0, value: 90 },
      { t: 'loot_jewels', x: 22.6, z: 10.0, value: 120 },
    ],
    guards: [
      { x: 3.0, z: 5.0, route: [[3.0, 5.0, 2], [8.5, 5.5, 2]] },
      { x: 19.5, z: 11.0, route: [[19.5, 11.0, 2.5], [12.0, 10.0, 2], [8.0, 9.5, 2]] },
    ],
  };
})();

// 10 - The study safe holds the gold. Crack it while the guards walk their rounds.
export const theVault = (() => {
  const g = new Grid(26, 18);
  g.fill(2, 2, 10, 7, ':').fill(12, 2, 23, 7, '.').fill(2, 9, 23, 10, '.').fill(2, 12, 10, 14, ';').fill(12, 12, 23, 14, ':');
  g.outline(1, 1, 24, 15, 'X').vline(11, 2, 7).hline(2, 23, 8).hline(2, 23, 11).vline(11, 12, 14);
  g.set(6, 8, 'L').set(17, 8, 'D').set(6, 11, 'D').set(18, 11, 'D').set(16, 15, 'D');
  for (const x of [4, 8, 15, 20]) g.set(x, 1, 'W');
  g.set(1, 4, 'W').set(24, 4, 'W').set(1, 13, 'W').set(24, 13, 'W').set(5, 15, 'W');
  g.set(16, 16, '=');
  street(g, 17);
  const St = room(2, 2, 10, 7), Lv = room(12, 2, 23, 7), Kt = room(2, 12, 10, 14), Bd = room(12, 12, 23, 14);
  return {
    id: 'the-vault', name: 'The Vault', area: 'mansion', tip: 'tipSafe',
    map: g.rows(), start: [16.5, 16.5], ...van(6, 17),
    props: [
      onWall('safe', St, 'n', 3.0), onWall('desk', St, 'n', 7.0), { t: 'office_chair', x: 7.0, z: 2.75 }, onWall('bookshelf', St, 'w', 5.5), onWall('bookshelf', St, 'e', 4.0),
      { t: 'lamp_floor', x: 10.9, z: 7.4 }, { t: 'rug', x: 6.0, z: 5.5 },
      onWall('tv_cabinet', Lv, 'n', 17.5), { t: 'rug', x: 17.5, z: 3.8 }, { t: 'sofa', x: 17.5, z: 5.2 }, { t: 'armchair', x: 13.2, z: 4.0, r: 3 }, { t: 'armchair', x: 21.8, z: 4.0, r: 1 },
      { t: 'plant_big', x: 23.9, z: 1.9 }, { t: 'lamp_floor', x: 12.0, z: 1.9 },
      { t: 'plant_big', x: 2.0, z: 9.5 }, { t: 'plant_big', x: 23.9, z: 9.5 }, { t: 'painting_b', x: 10.0, z: 8.6 + 0.0, r: 2 },
      onWall('kitchen_counter', Kt, 's', 3.5), onWall('kitchen_counter', Kt, 's', 4.8), onWall('fridge', Kt, 'e', 13.0), ...diningSet(8.0, 13.3),
      onWall('bed_double', Bd, 'e', 13.0), onWall('wardrobe', Bd, 's', 14.0), onWall('wardrobe', Bd, 'w', 13.0), { t: 'side_table_lamp', x: 23.9, z: 11.6 },
    ],
    loot: [
      { t: 'loot_gold', x: 3.0, z: 2.9, value: 320, target: true, inSafe: true },
      { t: 'loot_laptop', x: 6.7, z: 1.95, value: 110 },
      { t: 'loot_console', x: 18.3, z: 1.85, value: 90 },
      { t: 'loot_jewels', x: 23.9, z: 11.6, value: 130 },
    ],
    guards: [
      { x: 3.0, z: 9.5, route: [[3.0, 9.5, 2], [22.5, 10.0, 2]] },
      { x: 13.5, z: 6.5, route: [[13.5, 6.5, 2], [22.0, 6.5, 2], [17.5, 2.6, 2]] },
    ],
  };
})();

// 11 - Full house: four guards and a light sleeper.
export const fullHouse = (() => {
  const g = new Grid(28, 18);
  g.fill(2, 2, 8, 7, ':').fill(10, 2, 17, 7, '.').fill(19, 2, 25, 7, ':').fill(2, 9, 25, 10, '.').fill(2, 12, 12, 14, ';').fill(14, 12, 25, 14, '-');
  g.outline(1, 1, 26, 15, 'X').vline(9, 2, 7).vline(18, 2, 7).hline(2, 25, 8).hline(2, 25, 11).vline(13, 12, 14);
  g.set(5, 8, 'D').set(13, 8, 'D').set(22, 8, 'D').set(7, 11, 'D').set(20, 11, 'D').set(11, 15, 'D');
  for (const x of [5, 13, 22]) g.set(x, 1, 'W');
  g.set(1, 4, 'W').set(26, 4, 'W').set(1, 13, 'W').set(26, 13, 'W').set(6, 15, 'W').set(20, 15, 'W');
  g.set(11, 16, '=');
  street(g, 17);
  const B1 = room(2, 2, 8, 7), Lv = room(10, 2, 17, 7), B2 = room(19, 2, 25, 7), Kt = room(2, 12, 12, 14), Of = room(14, 12, 25, 14);
  return {
    id: 'full-house', name: 'Full House', area: 'mansion', tip: 'tipCoin',
    map: g.rows(), start: [11.5, 16.5], ...van(22, 17),
    props: [
      onWall('bed_double', B1, 'n', 5.0), onWall('wardrobe', B1, 'w', 6.0), { t: 'side_table_lamp', x: 3.4, z: 1.9 },
      onWall('tv_cabinet', Lv, 'n', 13.5), { t: 'rug', x: 13.5, z: 3.6 }, { t: 'sofa', x: 13.5, z: 5.0 }, { t: 'plant_big', x: 17.9, z: 1.9 }, { t: 'lamp_floor', x: 9.9, z: 1.9 },
      onWall('bed_double', B2, 'n', 22.0), onWall('wardrobe', B2, 'e', 6.0), onWall('bookshelf', B2, 's', 21.0), { t: 'side_table_lamp', x: 23.6, z: 1.9 },
      { t: 'plant_big', x: 2.0, z: 9.5 }, { t: 'plant_big', x: 25.9, z: 9.5 }, { t: 'lamp_floor', x: 13.0, z: 10.9 },
      onWall('kitchen_counter', Kt, 's', 3.0), onWall('kitchen_counter', Kt, 's', 4.3), onWall('fridge', Kt, 'w', 12.5), ...diningSet(9.0, 13.0),
      onWall('desk', Of, 's', 17.0), onWall('desk', Of, 's', 22.5), { t: 'office_chair', x: 17.0, z: 14.2 }, { t: 'office_chair', x: 22.5, z: 14.2 }, onWall('bookshelf', Of, 'e', 12.8),
    ],
    loot: [
      { t: 'loot_jewels', x: 23.6, z: 1.9, value: 200, target: true },
      { t: 'loot_laptop', x: 22.2, z: 14.05, value: 140, target: true },
      { t: 'loot_cash', x: 9.7, z: 13.0, value: 80 },
      { t: 'loot_console', x: 14.3, z: 1.85, value: 90 },
    ],
    guards: [
      { x: 3.0, z: 9.5, route: [[3.0, 9.5, 1.5], [24.5, 9.8, 1.5]] },
      { x: 11.0, z: 6.5, route: [[11.0, 6.5, 2], [16.5, 6.5, 2]] },
      { x: 15.0, z: 12.6, route: [[15.0, 12.6, 2], [24.5, 12.6, 2]] },
      { x: 20.5, z: 6.5, route: [[20.5, 6.5, 2], [24.5, 4.5, 2]] },
    ],
    residents: [{ x: 5.0, z: 3.0, face: 0, wakeX: 7.5, wakeZ: 5.0, route: [], range: 6 }],
  };
})();

// 12 - The grand finale: everything at once.
export const grandFinale = (() => {
  const g = new Grid(30, 20);
  g.fill(2, 2, 9, 7, '.').fill(11, 2, 18, 7, ':').fill(20, 2, 27, 7, '.').fill(2, 9, 27, 11, '.').fill(2, 13, 8, 16, ',').fill(10, 13, 19, 16, ';').fill(21, 13, 27, 16, ':');
  g.outline(1, 1, 28, 17, 'X').vline(10, 2, 7).vline(19, 2, 7).hline(2, 27, 8).hline(2, 27, 12).vline(9, 13, 16).vline(20, 13, 16);
  g.set(5, 8, 'D').set(14, 8, 'L').set(24, 8, 'D').set(5, 12, 'D').set(14, 12, 'D').set(24, 12, 'D').set(14, 17, 'D');
  for (const x of [5, 14, 24]) g.set(x, 1, 'W');
  g.set(1, 4, 'W').set(28, 4, 'W').set(1, 14, 'W').set(28, 14, 'W').set(5, 17, 'W').set(24, 17, 'W');
  g.set(14, 18, '=');
  street(g, 19);
  const Gl = room(2, 2, 9, 7), Vt = room(11, 2, 18, 7), Lv = room(20, 2, 27, 7), Bt = room(2, 13, 8, 16), Kt = room(10, 13, 19, 16), Bd = room(21, 13, 27, 16);
  void Gl;
  return {
    id: 'grand-finale', name: 'The Grand Finale', area: 'mansion', tip: 'tipFinal',
    map: g.rows(), start: [14.5, 18.5], ...van(5, 19),
    props: [
      { t: 'painting_a', x: 4.0, z: 1.6 }, { t: 'painting_b', x: 7.5, z: 1.6 }, { t: 'plant_big', x: 2.0, z: 7.4 }, { t: 'lamp_floor', x: 9.9, z: 7.4 },
      onWall('safe', Vt, 'n', 14.5), onWall('bookshelf', Vt, 'w', 4.0), onWall('bookshelf', Vt, 'e', 4.0), { t: 'lamp_floor', x: 11.0, z: 7.4 },
      onWall('tv_cabinet', Lv, 'n', 23.5), { t: 'sofa', x: 23.5, z: 5.0 }, { t: 'armchair', x: 26.6, z: 4.0, r: 1 }, { t: 'plant_big', x: 27.9, z: 7.4 },
      onWall('fuse_box', Lv, 's', 27.0),
      { t: 'plant_big', x: 2.0, z: 10.5 }, { t: 'plant_big', x: 27.9, z: 10.5 }, { t: 'lamp_floor', x: 14.0, z: 11.9 },
      { t: 'bathtub', x: 1.98, z: 15.0 }, onWall('sink', Bt, 's', 5.5), onWall('toilet', Bt, 's', 7.4),
      onWall('kitchen_counter', Kt, 's', 11.2), onWall('kitchen_counter', Kt, 's', 12.5), onWall('fridge', Kt, 'e', 15.5), ...diningSet(16.0, 14.4),
      onWall('bed_double', Bd, 'e', 14.8), onWall('wardrobe', Bd, 'w', 15.8), { t: 'side_table_lamp', x: 27.9, z: 12.9 },
    ],
    cameras: [
      { x: 2.0, z: 8.6, face: 3.5, sweep: 80 },
      { x: 27.9, z: 8.6, face: 0.5, sweep: 80 },
    ],
    lasers: [{ a: [6.0, 1.7], b: [6.0, 7.4] }],
    loot: [
      { t: 'loot_gold', x: 14.5, z: 2.9, value: 400, target: true, inSafe: true },
      { t: 'loot_vase', x: 3.0, z: 4.5, value: 160, target: true },
      { t: 'loot_jewels', x: 27.9, z: 12.9, value: 140 },
      { t: 'loot_console', x: 24.3, z: 1.85, value: 90 },
      { t: 'loot_watch', x: 5.5, z: 17.0 - 0.95, value: 70 },
    ],
    guards: [
      { x: 3.0, z: 10.0, route: [[3.0, 10.0, 1.5], [26.5, 10.0, 1.5]] },
      { x: 12.0, z: 6.5, route: [[12.0, 6.5, 2], [17.5, 6.5, 2]] },
      { x: 21.0, z: 6.5, route: [[21.0, 6.5, 2], [26.5, 2.4, 2]] },
      { x: 11.0, z: 15.8, route: [[11.0, 15.8, 2], [18.5, 13.4, 2], [11.0, 13.4, 1]] },
    ],
    residents: [{ x: 26.3, z: 14.8, face: 3, wakeX: 23.0, wakeZ: 15.5, route: [] }],
  };
})();

export default [redLines, theVault, fullHouse, grandFinale];
