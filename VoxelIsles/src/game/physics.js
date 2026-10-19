import { BLOCKS } from '../engine/blocks.js';

export const GRAVITY = 30;
export const JUMP_V = 8.6;
export const HW = 0.3;

const EPS = 1e-4;

export function height(a) { return a.disguise ? 0.98 : a.crouch ? 1.5 : 1.8; }
export function eyeHeight(a) { return a.disguise ? 0.8 : a.crouch ? 1.28 : 1.62; }

function hits(w, x, y, z, h) { return w.boxHits(x - HW, y, z - HW, x + HW, y + h, z + HW); }

function supported(w, x, y, z) {
  const yy = Math.floor(y - 0.05);
  for (const dx of [-HW + 0.02, HW - 0.02]) for (const dz of [-HW + 0.02, HW - 0.02]) if (w.solidAt(Math.floor(x + dx), yy, Math.floor(z + dz))) return true;
  return false;
}

function moveAxis(w, a, axis, d) {
  if (!d) return false;
  const h = height(a);
  const p = a.pos;
  const steps = Math.ceil(Math.abs(d) / 0.45);
  const sd = d / steps;
  for (let s = 0; s < steps; s++) {
    const nx = axis === 0 ? p.x + sd : p.x, ny = axis === 1 ? p.y + sd : p.y, nz = axis === 2 ? p.z + sd : p.z;
    if (!hits(w, nx, ny, nz, h)) {
      if (a.crouch && a.onGround && axis !== 1 && !supported(w, nx, p.y, nz)) return true;
      p.x = nx; p.y = ny; p.z = nz;
      continue;
    }
    if (axis === 0) p.x = sd > 0 ? Math.floor(p.x + HW + sd) - HW - EPS : Math.floor(p.x - HW + sd) + 1 + HW + EPS;
    else if (axis === 2) p.z = sd > 0 ? Math.floor(p.z + HW + sd) - HW - EPS : Math.floor(p.z - HW + sd) + 1 + HW + EPS;
    else p.y = sd > 0 ? Math.floor(p.y + h + sd) - h - EPS : Math.floor(p.y + sd) + 1;
    if (hits(w, p.x, p.y, p.z, h)) { if (axis === 0) p.x -= sd; else if (axis === 2) p.z -= sd; else p.y -= sd; }
    return true;
  }
  return false;
}

export function stepActor(w, a, dt, ctl) {
  const speed = (ctl.crouch ? 1.4 : ctl.sprint ? 5.7 : 4.3) * (a.speedMul || 1);
  const wish = Math.hypot(ctl.mx, ctl.mz);
  const tx = wish > 0 ? (ctl.mx / Math.max(1, wish)) * speed : 0, tz = wish > 0 ? (ctl.mz / Math.max(1, wish)) * speed : 0;
  const acc = a.onGround ? 40 : 10;
  const k = Math.min(1, acc * dt);
  a.vel.x += (tx - a.vel.x) * k; a.vel.z += (tz - a.vel.z) * k;
  a.kb.x *= Math.pow(a.onGround ? 0.02 : 0.25, dt); a.kb.z *= Math.pow(a.onGround ? 0.02 : 0.25, dt);
  if (Math.abs(a.kb.x) < 0.05) a.kb.x = 0; if (Math.abs(a.kb.z) < 0.05) a.kb.z = 0;
  const wasCrouch = a.crouch;
  a.crouch = !!ctl.crouch;
  if (wasCrouch && !a.crouch && hits(w, a.pos.x, a.pos.y, a.pos.z, 1.8)) a.crouch = true;
  if (ctl.jump && a.onGround && !a.crouch) { a.vel.y = JUMP_V; a.onGround = false; a.jumped = true; }
  a.vel.y = Math.max(-55, a.vel.y - GRAVITY * dt);
  const startY = a.pos.y;
  const bx = moveAxis(w, a, 0, (a.vel.x + a.kb.x) * dt);
  const bz = moveAxis(w, a, 2, (a.vel.z + a.kb.z) * dt);
  if (bx) { a.vel.x = 0; a.kb.x = 0; }
  if (bz) { a.vel.z = 0; a.kb.z = 0; }
  a.blocked = bx || bz;
  const vy = a.vel.y;
  const hitY = moveAxis(w, a, 1, vy * dt);
  const was = a.onGround;
  if (hitY) a.vel.y = 0;
  a.onGround = hitY && vy <= 0;
  let landed = 0;
  if (a.onGround) {
    const bid = w.get(Math.floor(a.pos.x), Math.floor(a.pos.y - 0.05), Math.floor(a.pos.z));
    const bb = bid && BLOCKS[bid];
    if (bb && bb.bounce) { a.vel.y = bb.bounce; a.onGround = false; a.airTop = a.pos.y; a.bounced = true; return { landed: 0 }; }
  }
  if (!a.onGround) a.airTop = Math.max(a.airTop ?? startY, a.pos.y);
  else if (!was) { landed = (a.airTop ?? a.pos.y) - a.pos.y; a.airTop = null; }
  else a.airTop = null;
  return { landed };
}

export function canPlaceAt(w, actors, x, y, z) {
  if (!w.inside(x, y, z)) return false;
  const id = w.get(x, y, z);
  if (id && !(id >= 40 && id <= 43)) return false;
  for (const o of actors) {
    if (!o.alive) continue;
    const h = height(o);
    if (x + 1 > o.pos.x - HW && x < o.pos.x + HW && z + 1 > o.pos.z - HW && z < o.pos.z + HW && y + 1 > o.pos.y && y < o.pos.y + h) return false;
  }
  return true;
}
