const A = ['Pixel', 'Blocky', 'Shadow', 'Turbo', 'Lucky', 'Frosty', 'Sneaky', 'Crafty', 'Mighty', 'Swift', 'Cosmic', 'Rusty', 'Golden', 'Silent', 'Hyper', 'Mini', 'Mega', 'Fuzzy', 'Crispy', 'Wild', 'Stormy', 'Zippy', 'Noble', 'Dizzy', 'Epic', 'Neon', 'Lazy', 'Brave', 'Sly', 'Jolly'];
const N = ['Fox', 'Ninja', 'Creeper', 'Builder', 'Knight', 'Dragon', 'Panda', 'Wolf', 'Miner', 'Pirate', 'Rocket', 'Taco', 'Wizard', 'Bandit', 'Gamer', 'Tiger', 'Beast', 'Hero', 'Golem', 'Raven', 'Cookie', 'Bunny', 'Shark', 'Viking', 'Penguin', 'Hunter', 'Comet', 'Llama', 'Phantom', 'Otter'];
const FIRST = ['Leo', 'Mia', 'Noah', 'Ava', 'Liam', 'Zoe', 'Kai', 'Ivy', 'Max', 'Luna', 'Eli', 'Nia', 'Sam', 'Ana', 'Theo', 'Ella', 'Jay', 'Ruby', 'Finn', 'Lola', 'Omar', 'Sara', 'Yuki', 'Ines', 'Tomas', 'Amara', 'Dani', 'Rafa', 'Chloe', 'Malik'];

export function botName(r = Math.random) {
  const pick = (a) => a[Math.floor(r() * a.length)];
  const n = Math.floor(r() * 100);
  switch (Math.floor(r() * 6)) {
    case 0: return `${pick(A)}${pick(N)}${n > 40 ? n : ''}`;
    case 1: return `${pick(A)}_${pick(N)}`;
    case 2: return `${pick(FIRST)}${2000 + Math.floor(r() * 25)}`;
    case 3: return `x${pick(N)}x${n < 30 ? n : ''}`;
    case 4: return `${pick(FIRST)}_${pick(N).toLowerCase()}`;
    default: return `${pick(N)}${pick(['Pro', 'YT', 'King', 'Queen', 'HD', 'TV', '99', '777'])}`;
  }
}

export const MODES = {
  sky: { id: 'sky', players: 8, teams: 0, maps: [{ id: 'meadow', theme: 'meadow', seed: 7 }, { id: 'dunes', theme: 'desert', seed: 12 }, { id: 'dusk', theme: 'meadow', seed: 21, sky: 'dusk' }] },
  egg: { id: 'egg', players: 8, teams: 4, teamSize: 2, maps: [{ id: 'frost', theme: 'snow', seed: 4 }, { id: 'ember', theme: 'volcano', seed: 6 }] },
};

export class Lobby {
  constructor(mode, me, opts = {}) {
    this.mode = MODES[mode]; this.slots = [me]; this.t = 0; this.state = 'search';
    this.firstWait = opts.firstWait ?? 2.2; this.gap = opts.gap ?? [0.35, 1.3];
    this.next = this.firstWait; this.countdown = opts.countdown ?? 4; this.names = new Set([me.name]);
    this.map = this.mode.maps[Math.floor(Math.random() * this.mode.maps.length)];
  }
  update(dt) {
    this.t += dt;
    if (this.state === 'search') {
      this.next -= dt;
      while (this.next <= 0 && this.slots.length < this.mode.players) {
        let name; do name = botName(); while (this.names.has(name));
        this.names.add(name);
        this.slots.push({ name, bot: true, skin: Math.floor(Math.random() * 100000), skill: 0.25 + Math.random() * 0.6 });
        const left = this.mode.players - this.slots.length;
        this.next += left > 3 ? this.gap[0] + Math.random() * (this.gap[1] - this.gap[0]) : 0.25 + Math.random() * 0.5;
      }
      if (this.slots.length >= this.mode.players) { this.state = 'countdown'; this.cd = this.countdown; }
    } else if (this.state === 'countdown') {
      this.cd -= dt;
      if (this.cd <= 0) this.state = 'go';
    }
  }
}
