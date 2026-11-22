// Suburbs: four small houses that introduce one idea each.
// Coordinates are in metres; cell (x, z) spans x..x+1, z..z+1 (z grows south).
// Furniture `r` is in quarter turns (0 = front faces north, 1 = west, 2 = south, 3 = east).

import { Grid, room, onWall, diningSet, street, van } from './kit.js';

const row = (...parts) => parts.join('');

// 1 - Sneak in, grab the jewels, sneak out. One guard doing laps.
export const firstNight = {
  id: 'first-night',
  name: 'First Night',
  area: 'suburbs',
  tip: 'tipSneak',
  map: [
    row(' '.repeat(19)),
    row(' ', 'XXXX', 'W', 'XXXXXXX', 'W', 'XXXX', ' '),
    row(' X', ':'.repeat(6), '#', '.'.repeat(8), 'X '),
    row(' X', ':'.repeat(6), '#', '.'.repeat(8), 'X '),
    row(' X', ':'.repeat(6), 'D', '.'.repeat(8), 'X '),
    row(' X', ':'.repeat(6), '#', '.'.repeat(8), 'W '),
    row(' X', '#'.repeat(6), '#', '.'.repeat(8), 'X '),
    row(' X', ','.repeat(6), '#', '.'.repeat(8), 'X '),
    row(' X', ','.repeat(6), 'D', '.'.repeat(8), 'X '),
    row(' X', ','.repeat(6), '#', '.'.repeat(8), 'X '),
    row(' ', 'XXX', 'W', 'XXXXXXXX', 'D', 'XXXX', ' '),
    row(' '.repeat(13), '=', ' '.repeat(5)),
    row('='.repeat(19)),
    row('~'.repeat(19)),
    row('~'.repeat(19)),
  ],
  start: [13.5, 11.5],
  exit: [6, 14, 1], // van position + quarter turns
  exitDoor: [6, 12.5], // where you have to stand to get in
  props: [
    // bedroom
    { t: 'bed_double', x: 4.5, z: 2.7, r: 2 },
    { t: 'wardrobe', x: 7.2, z: 1.92, r: 2 },
    { t: 'side_table_lamp', x: 2.3, z: 2.1 },
    { t: 'rug', x: 4.5, z: 4.6 },
    // bathroom
    { t: 'bathtub', x: 2.45, z: 8.3 },
    { t: 'toilet', x: 4.5, z: 10.05 },
    { t: 'sink', x: 6.6, z: 10.14 },
    // living room + dining
    { t: 'tv_cabinet', x: 13, z: 1.85, r: 2 },
    { t: 'rug', x: 13, z: 3.4 },
    { t: 'sofa', x: 13, z: 5.0 },
    { t: 'armchair', x: 10.0, z: 3.4, r: 3 },
    { t: 'plant_big', x: 16.8, z: 2.2 },
    { t: 'lamp_floor', x: 16.9, z: 5.8 },
    // dining set kept 1.5 m back from the front door so the doorway stays clear
    { t: 'table_dining', x: 12.4, z: 7.5 },
    { t: 'chair', x: 11.8, z: 6.68, r: 2 }, { t: 'chair', x: 13.0, z: 6.68, r: 2 },
    { t: 'chair', x: 11.8, z: 8.32 }, { t: 'chair', x: 13.0, z: 8.32 },
    { t: 'lamp_floor', x: 9.2, z: 9.8 },
  ],
  loot: [
    { t: 'loot_jewels', x: 4.5, z: 3.3, value: 150, target: true },
    { t: 'loot_cash', x: 12.6, z: 7.5, value: 80 },
    { t: 'loot_watch', x: 6.6, z: 9.98, value: 60 },
  ],
  guards: [
    { x: 10.0, z: 6.0, route: [[10.0, 6.0, 2], [16.2, 8.6, 1.5], [16.0, 3.4, 2], [10.2, 5.8, 1]] },
  ],
};

// 2 - Two guards. Learn to duck into wardrobes and behind plants.
export const hideAndSeek = (() => {
  const g = new Grid(23, 17);
  g.fill(2, 2, 9, 5, '.').fill(11, 2, 19, 5, ':').fill(2, 7, 19, 8, '.').fill(2, 10, 9, 12, ';').fill(11, 10, 19, 12, ':');
  g.outline(1, 1, 20, 13, 'X').hline(2, 19, 6).hline(2, 19, 9).vline(10, 2, 5).vline(10, 10, 12);
  g.set(5, 6, 'D').set(14, 6, 'D').set(8, 9, 'D').set(16, 9, 'D').set(6, 13, 'D');
  g.set(4, 1, 'W').set(15, 1, 'W').set(1, 3, 'W').set(20, 11, 'W').set(14, 13, 'W');
  g.set(6, 14, '=');
  street(g, 15);
  const A = room(2, 2, 9, 5), B = room(11, 2, 19, 5), D = room(2, 10, 9, 12), E = room(11, 10, 19, 12);
  return {
    id: 'hide-and-seek', name: 'Hide and Seek', area: 'suburbs', tip: 'tipHide',
    map: g.rows(), start: [6.5, 14.5], ...van(12, 15),
    props: [
      onWall('tv_cabinet', A, 'n', 5.5), { t: 'rug', x: 5.5, z: 3.4 }, { t: 'sofa', x: 5.5, z: 4.4 },
      { t: 'armchair', x: 2.3, z: 3.0, r: 3 }, { t: 'plant_big', x: 9.9, z: 2.1 }, { t: 'lamp_floor', x: 2.0, z: 5.9 },
      onWall('desk', B, 'n', 15.5), { t: 'office_chair', x: 15.5, z: 2.75 }, onWall('bookshelf', B, 'n', 12.2),
      onWall('wardrobe', B, 'e', 4.0), { t: 'plant_big', x: 11.1, z: 5.9 }, { t: 'lamp_floor', x: 20.0, z: 1.9 },
      { t: 'plant_big', x: 19.9, z: 8.1 }, { t: 'lamp_floor', x: 2.0, z: 7.0 },
      onWall('kitchen_counter', D, 'n', 6.2), onWall('fridge', D, 'n', 9.5), ...diningSet(3.9, 11.6),
      onWall('bed_double', E, 'e', 11.5), onWall('wardrobe', E, 's', 13.0), onWall('side_table_lamp', E, 'e', 9.95),
    ],
    loot: [
      { t: 'loot_laptop', x: 15.2, z: 1.95, value: 160, target: true },
      { t: 'loot_cash', x: 18.7, z: 11.5, value: 90 },
      { t: 'loot_console', x: 6.3, z: 1.85, value: 70 },
    ],
    guards: [
      { x: 3.0, z: 7.6, route: [[3.0, 7.6, 1.5], [18.5, 7.6, 1.5]] },
      { x: 16.0, z: 4.6, route: [[16.0, 4.6, 2.5], [6.5, 5.6, 2.5]] },
    ],
  };
})();

// 3 - A guard watches the hallway. Throw a coin to make him look elsewhere.
export const coinToss = (() => {
  const g = new Grid(20, 16);
  g.fill(2, 2, 7, 6, '.').fill(2, 8, 7, 11, ',').fill(9, 2, 10, 11, '.').fill(12, 2, 17, 6, ';').fill(12, 8, 17, 11, ':');
  g.outline(1, 1, 18, 12, 'X').vline(8, 2, 11).vline(11, 2, 11).hline(2, 7, 7).hline(12, 17, 7);
  g.set(8, 3, 'D').set(8, 10, 'D').set(11, 3, 'D').set(11, 9, 'D').set(15, 7, 'D').set(9, 12, 'D');
  g.set(4, 1, 'W').set(15, 1, 'W').set(1, 4, 'W').set(18, 10, 'W').set(4, 12, 'W');
  g.set(9, 13, '=');
  street(g, 14);
  const W = room(2, 2, 7, 6), Bt = room(2, 8, 7, 11), Dn = room(12, 2, 17, 6), Bd = room(12, 8, 17, 11);
  return {
    id: 'coin-toss', name: 'Coin Toss', area: 'suburbs', tip: 'tipCoin',
    map: g.rows(), start: [9.5, 13.5], ...van(4, 14),
    props: [
      onWall('tv_cabinet', W, 'n', 4.5), { t: 'sofa', x: 4.5, z: 4.2 }, onWall('bookshelf', W, 'w', 5.5), { t: 'plant_big', x: 7.0, z: 6.9 }, { t: 'lamp_floor', x: 7.1, z: 1.9 },
      { t: 'bathtub', x: 1.98, z: 9.6 }, onWall('toilet', Bt, 's', 4.5), onWall('sink', Bt, 's', 6.4),
      ...diningSet(14.5, 4.4), onWall('kitchen_counter', Dn, 'n', 16.3), onWall('fridge', Dn, 'n', 12.4),
      onWall('bed_double', Bd, 'e', 9.8), onWall('wardrobe', Bd, 's', 13.3), { t: 'side_table_lamp', x: 17.9, z: 11.9 },
      { t: 'lamp_floor', x: 10.9, z: 6.6 }, { t: 'plant_big', x: 10.9, z: 11.8 },
    ],
    loot: [
      { t: 'loot_vase', x: 16.9, z: 9.8, value: 180, target: true },
      { t: 'loot_cash', x: 5.2, z: 1.85, value: 70 },
      { t: 'loot_watch', x: 6.4, z: 12.1, value: 60 },
    ],
    // stands at the top of the hallway looking down it
    guards: [{ x: 9.6, z: 2.5, face: 2, range: 8, route: [] }],
  };
})();

// 4 - The gold is behind a locked study door. Pick the lock when nobody is around.
export const lockedStudy = (() => {
  const g = new Grid(19, 15);
  g.fill(2, 2, 6, 4, ':').fill(8, 2, 15, 4, '.').fill(2, 6, 8, 10, ';').fill(10, 6, 15, 10, ':');
  g.outline(1, 1, 16, 11, 'X').hline(2, 15, 5).vline(7, 2, 4).vline(9, 6, 10);
  g.set(4, 5, 'L').set(8, 5, 'D').set(14, 5, 'D').set(5, 11, 'D');
  g.set(3, 1, 'W').set(12, 1, 'W').set(16, 3, 'W').set(16, 8, 'W').set(12, 11, 'W');
  g.set(5, 12, '=');
  street(g, 13);
  const S = room(2, 2, 6, 4), Lv = room(8, 2, 15, 4), K = room(2, 6, 8, 10), Bd = room(10, 6, 15, 10);
  return {
    id: 'locked-study', name: 'The Locked Study', area: 'suburbs', tip: 'tipPick',
    map: g.rows(), start: [5.5, 12.5], ...van(12, 13),
    props: [
      onWall('desk', S, 'n', 4.5), { t: 'office_chair', x: 4.5, z: 2.75 }, onWall('bookshelf', S, 'w', 3.6), { t: 'lamp_floor', x: 6.9, z: 1.9 },
      onWall('tv_cabinet', Lv, 'n', 11.5), { t: 'sofa', x: 11.5, z: 3.9 }, { t: 'plant_big', x: 16.0, z: 2.0 }, { t: 'lamp_floor', x: 7.9, z: 1.9 },
      onWall('kitchen_counter', K, 'n', 6.0), onWall('fridge', K, 'w', 7.0), ...diningSet(5.0, 8.8),
      onWall('bed_double', Bd, 'e', 8.3), onWall('wardrobe', Bd, 's', 11.0), { t: 'plant_big', x: 10.0, z: 10.9 },
    ],
    loot: [
      { t: 'loot_gold', x: 4.5, z: 1.95, value: 250, target: true },
      { t: 'loot_jewels', x: 15.0, z: 8.3, value: 120 },
      { t: 'loot_cash', x: 12.3, z: 1.85, value: 60 },
    ],
    guards: [{ x: 14.5, z: 3.0, route: [[14.5, 3.0, 2], [5.0, 7.0, 1.5], [12.5, 9.0, 2]] }],
  };
})();

export default [firstNight, hideAndSeek, coinToss, lockedStudy];
