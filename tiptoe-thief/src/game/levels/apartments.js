// Riverside Apartments: people asleep at home, then cameras and a power cut.
import { Grid, room, onWall, diningSet, street, van } from './kit.js';

// A sleeping resident lies on their bed; when woken they get up at (wakeX, wakeZ).
const sleeper = (bedX, bedZ, face, wakeX, wakeZ, extra = {}) => ({ x: bedX, z: bedZ, face, wakeX, wakeZ, route: [], ...extra });

// 5 - A family asleep. Tiptoe past them; running wakes people up.
export const nightOwls = (() => {
  const g = new Grid(20, 14);
  g.fill(2, 2, 9, 5, '.').fill(11, 2, 16, 5, ':').fill(11, 7, 16, 9, ':').fill(2, 7, 5, 9, ';').fill(7, 7, 9, 9, ',');
  g.outline(1, 1, 17, 10, 'X').vline(10, 2, 9).hline(2, 16, 6).vline(6, 7, 9);
  g.set(10, 3, 'D').set(4, 6, 'D').set(8, 6, 'D').set(13, 6, 'D').set(4, 10, 'D');
  g.set(4, 1, 'W').set(13, 1, 'W').set(17, 3, 'W').set(17, 8, 'W').set(1, 4, 'W');
  g.set(4, 11, '=');
  street(g, 12);
  const Lv = room(2, 2, 9, 5), M = room(11, 2, 16, 5), Kd = room(11, 7, 16, 9), K = room(2, 7, 5, 9), Bt = room(7, 7, 9, 9);
  return {
    id: 'night-owls', name: 'Night Owls', area: 'apartments', tip: 'tipSleep',
    map: g.rows(), start: [4.5, 11.5], ...van(12, 12),
    props: [
      onWall('tv_cabinet', Lv, 'n', 5.5), { t: 'rug', x: 5.5, z: 3.4 }, { t: 'sofa', x: 5.5, z: 4.6 }, onWall('bookshelf', Lv, 'w', 3.2),
      { t: 'plant_big', x: 9.9, z: 2.0 }, { t: 'lamp_floor', x: 1.9, z: 5.9 },
      onWall('bed_double', M, 'n', 13.5), { t: 'side_table_lamp', x: 12.1, z: 1.9 }, onWall('wardrobe', M, 'e', 4.6),
      onWall('bed_single', Kd, 'e', 8.0), onWall('wardrobe', Kd, 'w', 8.4), { t: 'lamp_floor', x: 13.0, z: 9.9 },
      onWall('kitchen_counter', K, 'w', 8.3), onWall('fridge', K, 'n', 5.4),
      { t: 'bathtub', x: 6.98, z: 8.3 }, onWall('sink', Bt, 's', 9.0),
    ],
    loot: [
      { t: 'loot_jewels', x: 12.1, z: 1.9, value: 180, target: true },
      { t: 'loot_phone', x: 7.2, z: 1.85, value: 70 },
      { t: 'loot_console', x: 12.2, z: 9.6, value: 90 },
    ],
    residents: [
      sleeper(13.5, 3.0, 0, 15.6, 4.8),
      sleeper(16.2, 8.0, 3, 14.0, 8.0),
    ],
  };
})();

// 6 - The lobby has two cameras sweeping it. Time your crossing.
export const lobby = (() => {
  const g = new Grid(24, 16);
  g.fill(2, 2, 21, 7, '.').fill(2, 9, 8, 12, '-').fill(10, 9, 15, 12, '-').fill(17, 9, 21, 12, ':');
  g.outline(1, 1, 22, 13, 'X').hline(2, 21, 8).vline(9, 9, 12).vline(16, 9, 12);
  g.set(5, 8, 'D').set(12, 8, 'D').set(19, 8, 'D').set(11, 13, 'D');
  for (const x of [4, 9, 14, 19]) g.set(x, 1, 'W');
  g.set(1, 5, 'W').set(22, 5, 'W').set(5, 13, 'W').set(19, 13, 'W');
  g.set(11, 14, '=');
  street(g, 15);
  const Lb = room(2, 2, 21, 7), O1 = room(2, 9, 8, 12), O2 = room(10, 9, 15, 12), St = room(17, 9, 21, 12);
  return {
    id: 'lobby', name: 'Camera Shy', area: 'apartments', tip: 'tipCamera',
    map: g.rows(), start: [11.5, 14.5], ...van(4, 15),
    props: [
      // lobby: seating and plants in the middle, mail desk to the side
      { t: 'sofa', x: 7.0, z: 4.0, r: 0 }, { t: 'armchair', x: 4.6, z: 4.0, r: 3 }, { t: 'plant_big', x: 2.1, z: 2.1 }, { t: 'plant_big', x: 21.9, z: 2.1 },
      { t: 'plant_big', x: 12.0, z: 4.6 }, onWall('desk', Lb, 'n', 16.5), { t: 'office_chair', x: 16.5, z: 2.8 }, { t: 'lamp_floor', x: 9.5, z: 1.9 }, { t: 'lamp_floor', x: 21.9, z: 7.4 },
      onWall('desk', O1, 'n', 4.0), { t: 'office_chair', x: 4.0, z: 9.4 + 0.75 }, onWall('bookshelf', O1, 's', 6.5), { t: 'lamp_floor', x: 8.9, z: 13.0 },
      onWall('desk', O2, 'e', 11.0), { t: 'office_chair', x: 14.3, z: 11.0 }, onWall('bookshelf', O2, 'w', 11.0), { t: 'plant_big', x: 15.9, z: 12.9 },
      onWall('wardrobe', St, 'e', 10.5), onWall('wardrobe', St, 's', 18.5), { t: 'lamp_floor', x: 16.6, z: 9.0 },
    ],
    cameras: [
      { x: 2.0, z: 2.0, face: 3.5, sweep: 80 }, // north-west corner looking across the lobby (south-east)
      { x: 21.9, z: 7.4, face: 0.5, sweep: 80 }, // south-east corner looking north-west
    ],
    loot: [
      { t: 'loot_laptop', x: 15.0, z: 10.95, value: 200, target: true },
      { t: 'loot_cash', x: 16.5, z: 1.95, value: 80 },
      { t: 'loot_watch', x: 4.0, z: 9.55, value: 70 },
    ],
    guards: [{ x: 20.0, z: 11.0, route: [[20.0, 11.0, 3], [18.5, 6.0, 2], [3.0, 6.0, 2]] }],
  };
})();

// 7 - More cameras than you can dodge. Find the fuse box and cut the power.
export const lightsOut = (() => {
  const g = new Grid(22, 16);
  g.fill(2, 2, 13, 6, '-').fill(15, 2, 19, 6, ',').fill(2, 8, 6, 12, ';').fill(8, 8, 19, 12, '-');
  g.outline(1, 1, 20, 13, 'X').hline(2, 19, 7).vline(14, 2, 6).vline(7, 8, 12);
  g.set(10, 7, 'D').set(17, 7, 'D').set(4, 7, 'D').set(14, 4, 'D').set(4, 13, 'D');
  g.set(5, 1, 'W').set(10, 1, 'W').set(20, 4, 'W').set(20, 10, 'W').set(12, 13, 'W').set(16, 13, 'W');
  g.set(4, 14, '=');
  street(g, 15);
  const Of = room(2, 2, 13, 6), Ut = room(15, 2, 19, 6), Kt = room(2, 8, 6, 12), Op = room(8, 8, 19, 12);
  return {
    id: 'lights-out', name: 'Lights Out', area: 'apartments', tip: 'tipCamera',
    map: g.rows(), start: [4.5, 14.5], ...van(14, 15),
    props: [
      onWall('desk', Of, 'n', 4.0), onWall('desk', Of, 'n', 8.0), { t: 'office_chair', x: 4.0, z: 2.8 }, { t: 'office_chair', x: 8.0, z: 2.8 },
      onWall('bookshelf', Of, 's', 12.0), { t: 'plant_big', x: 13.9, z: 2.0 }, { t: 'lamp_floor', x: 1.9, z: 6.9 },
      onWall('fuse_box', Ut, 'n', 17.5), onWall('wardrobe', Ut, 'e', 5.0),
      onWall('kitchen_counter', Kt, 'w', 9.5), onWall('fridge', Kt, 'w', 11.6), { t: 'plant_big', x: 6.9, z: 12.9 },
      onWall('desk', Op, 's', 10.0), onWall('desk', Op, 's', 13.5), onWall('desk', Op, 's', 17.0),
      { t: 'office_chair', x: 10.0, z: 12.2 }, { t: 'office_chair', x: 13.5, z: 12.2 }, { t: 'office_chair', x: 17.0, z: 12.2 },
      { t: 'sofa', x: 13.0, z: 9.0, r: 2 }, { t: 'lamp_floor', x: 19.9, z: 7.9 },
    ],
    cameras: [
      { x: 2.0, z: 2.0, face: 3.5, sweep: 90 },
      { x: 13.4, z: 2.0, face: 2.5, sweep: 70 },
      { x: 7.9, z: 8.0, face: 3.5, sweep: 90 },
      { x: 19.9, z: 8.0, face: 2.5, sweep: 90 },
    ],
    loot: [
      { t: 'loot_gold', x: 13.5, z: 12.05, value: 220, target: true },
      { t: 'loot_laptop', x: 8.6, z: 1.95, value: 110 },
      { t: 'loot_phone', x: 17.0, z: 12.05, value: 60 },
    ],
    guards: [{ x: 8.0, z: 10.0, route: [[8.5, 10.0, 2], [18.5, 9.5, 2], [10.5, 5.5, 2]] }],
  };
})();

// 8 - The penthouse: a sleeper, a camera, a guard and a locked study.
export const penthouse = (() => {
  const g = new Grid(26, 17);
  g.fill(2, 2, 11, 7, '.').fill(13, 2, 18, 7, ':').fill(20, 2, 23, 7, ',').fill(2, 9, 8, 13, ':').fill(10, 9, 23, 13, '.');
  g.outline(1, 1, 24, 14, 'X').hline(2, 23, 8).vline(12, 2, 7).vline(19, 2, 7).vline(9, 9, 13);
  g.set(12, 5, 'D').set(19, 5, 'D').set(5, 8, 'L').set(15, 8, 'D').set(9, 11, 'D').set(16, 14, 'D');
  for (const x of [4, 9, 15, 21]) g.set(x, 1, 'W');
  g.set(1, 4, 'W').set(1, 11, 'W').set(24, 4, 'W').set(24, 11, 'W').set(5, 14, 'W');
  g.set(16, 15, '=');
  street(g, 16);
  const Lv = room(2, 2, 11, 7), Bd = room(13, 2, 18, 7), Bt = room(20, 2, 23, 7), St = room(2, 9, 8, 13), Dn = room(10, 9, 23, 13);
  return {
    id: 'penthouse', name: 'The Penthouse', area: 'apartments', tip: 'tipPick',
    map: g.rows(), start: [16.5, 15.5], ...van(6, 16),
    props: [
      onWall('tv_cabinet', Lv, 'n', 6.5), { t: 'rug', x: 6.5, z: 3.6 }, { t: 'sofa', x: 6.5, z: 5.0 }, { t: 'armchair', x: 3.0, z: 4.0, r: 3 },
      { t: 'plant_big', x: 11.9, z: 2.0 }, { t: 'lamp_floor', x: 1.9, z: 1.9 }, onWall('bookshelf', Lv, 's', 10.5),
      onWall('bed_double', Bd, 'n', 15.5), onWall('wardrobe', Bd, 's', 17.2), { t: 'side_table_lamp', x: 14.1, z: 1.9 },
      { t: 'bathtub', x: 23.4 + 0.0, z: 4.5 - 0.0 }, onWall('sink', Bt, 's', 21.0), onWall('toilet', Bt, 'n', 21.2),
      onWall('desk', St, 'w', 11.0), { t: 'office_chair', x: 2.8, z: 11.0 }, onWall('bookshelf', St, 'n', 3.0), onWall('safe', St, 's', 7.0),
      onWall('kitchen_counter', Dn, 'n', 21.2), onWall('fridge', Dn, 'e', 10.0), ...diningSet(16.0, 11.2), { t: 'plant_big', x: 10.1, z: 13.9 },
      { t: 'lamp_floor', x: 23.9, z: 13.9 },
    ],
    cameras: [{ x: 10.0, z: 13.9, face: 1.5, sweep: 70 }],
    loot: [
      { t: 'loot_gold', x: 7.0, z: 13.0, value: 260, target: true, inSafe: true },
      { t: 'loot_jewels', x: 14.1, z: 1.9, value: 140 },
      { t: 'loot_laptop', x: 2.0, z: 11.3, value: 100 },
      { t: 'loot_vase', x: 10.5, z: 6.0, value: 80 },
    ],
    guards: [{ x: 22.0, z: 11.0, route: [[22.0, 11.0, 2], [11.0, 10.0, 2], [8.0, 6.5, 2], [11.0, 10.5, 1]] }],
    residents: [sleeper(15.5, 3.0, 0, 17.6, 5.5)],
  };
})();

export default [nightOwls, lobby, lightsOut, penthouse];
