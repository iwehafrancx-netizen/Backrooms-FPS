import { GameEntity, Vehicle, Vision, MemorySystem, Think, GoalEvaluator, Vector3, SeekBehavior, SeparationBehavior, ArriveBehavior } from 'yuka';
import { isSolid } from '../../engine/blocks.js';

export const PROFILES = {
  rusher: { fight: 1.35, hunt: 1.45, loot: 0.75, build: 0.6, idle: 0.6, brave: 0.3, tbag: 0.6 },
  looter: { fight: 0.95, hunt: 0.85, loot: 1.45, build: 0.8, idle: 0.9, brave: 0, tbag: 0.2 },
  camper: { fight: 1.0, hunt: 0.6, loot: 1.0, build: 1.25, idle: 1.3, brave: -0.15, tbag: 0.3 },
  builder: { fight: 0.95, hunt: 0.9, loot: 1.0, build: 1.6, idle: 0.9, brave: 0, tbag: 0.2 },
  pro: { fight: 1.15, hunt: 1.2, loot: 1.1, build: 1.0, idle: 0.7, brave: 0.15, tbag: 0.5, skill: 0.15 },
  noob: { fight: 0.9, hunt: 0.8, loot: 1.1, build: 0.7, idle: 1.2, brave: -0.1, tbag: 0.1, skill: -0.1 },
};
const PROFILE_NAMES = Object.keys(PROFILES);

class VoxelSight {
  constructor(world) { this.w = world; }
  lineOfSightTest(ray, out) {
    const o = ray.origin, d = ray.direction;
    const h = this.w.raycast(o.x, o.y, o.z, d.x, d.y, d.z, 120, (id) => isSolid(id) && id !== 7 && id !== 12 && id !== 54 && id !== 82 && id !== 83);
    if (!h) return null;
    out.set(o.x + d.x * h.t, o.y + d.y * h.t, o.z + d.z * h.t);
    return out;
  }
}

export class AIWorld {
  constructor(m) {
    this.m = m; this.sight = new VoxelSight(m.world); this.ents = new Map(); this.time = 0;
    this.pathBudget = 0; this.noises = [];
  }
  entity(a) {
    let e = this.ents.get(a);
    if (!e) { e = new GameEntity(); e.actor = a; e.boundingRadius = 0.4; this.ents.set(a, e); }
    e.position.set(a.pos.x, a.pos.y + 1.5, a.pos.z);
    e.rotation.fromEuler(0, a.yaw + Math.PI, 0);
    return e;
  }
  frame(dt) {
    if (this.lastT === this.m.time) return;
    this.lastT = this.m.time; this.time += dt;
    this.pathBudget = 9000;
    for (const a of this.m.actors) this.entity(a);
    this.noises = this.noises.filter((n) => this.time - n.t < 4);
  }
  noise(x, y, z, by, loud = 1) { this.noises.push({ x, y, z, by, loud, t: this.time }); }
}

export function aiWorld(m) { return m.ai || (m.ai = new AIWorld(m)); }

class Eval extends GoalEvaluator {
  constructor(name, bias, fn) { super(bias); this.name = name; this.fn = fn; }
  calculateDesirability(owner) { return this.fn(owner.brain); }
  setGoal(owner) { owner.brain.setIntent(this.name); }
}

export class Brain {
  constructor(bot) {
    this.bot = bot; const a = bot.a, m = bot.m;
    this.W = aiWorld(m);
    this.profileName = bot.profile || PROFILE_NAMES[Math.floor(Math.random() * PROFILE_NAMES.length)];
    this.p = PROFILES[this.profileName];
    if (this.p.skill) bot.skill = Math.max(0.1, Math.min(1, bot.skill + this.p.skill));
    this.ent = new Vehicle();
    this.ent.brain = this; this.ent.actor = a; this.ent.maxSpeed = 5.7; this.ent.maxForce = 26 + bot.skill * 20; this.ent.mass = 1;
    this.seek = new SeekBehavior(new Vector3()); this.arrive = new ArriveBehavior(new Vector3(), 2.2, 0.3); this.sep = new SeparationBehavior();
    this.sep.weight = 0.9; this.arrive.active = false;
    this.ent.steering.add(this.seek); this.ent.steering.add(this.arrive); this.ent.steering.add(this.sep);
    this.vision = new Vision(this.ent); this.vision.range = 34; this.vision.fieldOfView = Math.PI * (0.62 + bot.skill * 0.2); this.vision.addObstacle(this.W.sight);
    this.memory = new MemorySystem(this.ent); this.memory.memorySpan = 14 + bot.skill * 10;
    this.think = new Think(this.ent);
    this.intent = 'idle'; this.intentT = 0; this.arbT = Math.random() * 0.25;
    this.evals = {};
    this.force = new Vector3(); this.tmp = new Vector3();
  }
  add(name, bias, fn) { const e = new Eval(name, bias * (this.p[name] ?? 1), fn); this.think.addEvaluator(e); this.evals[name] = e; return this; }
  setIntent(name) { if (name !== this.intent) { this.prev = this.intent; this.intent = name; this.intentT = 0; this.bot.onIntent && this.bot.onIntent(name, this.prev); } }
  sync() {
    const a = this.bot.a, e = this.ent;
    e.position.set(a.pos.x, a.pos.y + 1.5, a.pos.z);
    e.rotation.fromEuler(0, a.yaw + Math.PI, 0);
    e.velocity.set(a.vel.x, 0, a.vel.z);
    e.maxSpeed = a.sprint ? 5.7 : 4.3;
  }
  sense(dt) {
    const W = this.W, a = this.bot.a, m = this.bot.m, t = W.time;
    for (const o of m.actors) {
      if (o === a || !o.alive || !m.enemies(a, o)) continue;
      const oe = W.entity(o);
      if (!this.memory.hasRecord(oe)) this.memory.createRecord(oe);
      const rec = this.memory.getRecord(oe);
      const d = Math.hypot(o.pos.x - a.pos.x, o.pos.z - a.pos.z);
      const seen = d < 3.2 || (d < this.vision.range && this.vision.visible(oe.position));
      if (seen) { rec.timeLastSensed = t; rec.lastSensedPosition.set(o.pos.x, o.pos.y, o.pos.z); if (!rec.visible) { rec.visible = true; rec.timeBecameVisible = t; } }
      else rec.visible = false;
    }
    for (const n of W.noises) {
      if (n.by === a || !n.by || !m.enemies(a, n.by)) continue;
      const d = Math.hypot(n.x - a.pos.x, n.z - a.pos.z);
      if (d > 26 * n.loud) continue;
      const oe = W.entity(n.by);
      if (!this.memory.hasRecord(oe)) this.memory.createRecord(oe);
      const rec = this.memory.getRecord(oe);
      if (t - rec.timeLastSensed > 0.5) { rec.timeLastSensed = t; rec.lastSensedPosition.set(n.x, n.y, n.z); }
    }
  }
  records() { const out = []; this.memory.getValidMemoryRecords(this.W.time, out); return out.filter((r) => r.entity.actor.alive); }
  visibleEnemies() { return this.records().filter((r) => r.visible).map((r) => r.entity.actor); }
  remembered() {
    const a = this.bot.a; let best = null, bd = 1e9;
    for (const r of this.records()) { const p = r.lastSensedPosition, d = Math.hypot(p.x - a.pos.x, p.z - a.pos.z) + (this.W.time - r.timeLastSensed) * 2; if (d < bd) { bd = d; best = r; } }
    return best;
  }
  steerDir(tx, tz, dt) {
    const a = this.bot.a;
    this.sync();
    this.seek.target.set(tx, a.pos.y + 1.5, tz);
    const near = [];
    for (const o of this.bot.m.actors) if (o !== a && o.alive && Math.abs(o.pos.y - a.pos.y) < 2 && Math.hypot(o.pos.x - a.pos.x, o.pos.z - a.pos.z) < 1.6) near.push(this.W.entity(o));
    this.ent.neighbors = near;
    this.sep.active = near.length > 0;
    this.force.set(0, 0, 0);
    this.ent.steering.calculate(dt, this.force);
    const vx = a.vel.x + this.force.x * dt, vz = a.vel.z + this.force.z * dt, l = Math.hypot(vx, vz);
    const dx = tx - a.pos.x, dz = tz - a.pos.z, dl = Math.hypot(dx, dz) || 1;
    if (l < 0.6) return [dx / dl, dz / dl];
    const bx = vx / l, bz = vz / l, k = Math.min(1, 0.45 + this.bot.skill * 0.3);
    const ox = bx * (1 - k) + (dx / dl) * k, oz = bz * (1 - k) + (dz / dl) * k, ol = Math.hypot(ox, oz) || 1;
    return [ox / ol, oz / ol];
  }
  update(dt) {
    this.W.frame(dt);
    this.intentT += dt;
    this.senseT = (this.senseT || 0) - dt;
    if (this.senseT <= 0) { this.senseT = 0.12 + Math.random() * 0.06; this.sync(); this.sense(dt); }
    this.arbT -= dt;
    if (this.arbT <= 0) { this.arbT = 0.22 + Math.random() * 0.08; this.think.arbitrate(); }
  }
}
