const HDR = 24, PER = 31;
const c16 = (v) => Math.max(-32767, Math.min(32767, Math.round(v)));
const u8 = (v) => Math.max(0, Math.min(255, Math.round(v)));
const wrap = (a) => { a %= Math.PI * 2; if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; return a; };

export function packSnap(m, clk, seq) {
  const A = m.actors, buf = new ArrayBuffer(HDR + A.length * PER), v = new DataView(buf), md = m.mode;
  v.setUint8(0, 1); v.setUint16(1, seq & 0xffff); v.setFloat32(3, clk); v.setFloat32(7, m.time);
  v.setUint8(11, m.state === 'countdown' ? 0 : m.state === 'play' ? 1 : 2);
  v.setUint8(12, (md.refilled ? 1 : 0) | (md.rising ? 2 : 0) | (md.respawnsOn ? 4 : 0) | (md.borderWarned ? 8 : 0));
  v.setFloat32(13, md.border ?? 0); v.setFloat32(17, m.map.voidY); v.setUint8(21, A.length);
  v.setUint8(22, m.winner ? A.indexOf(m.winner) & 255 : 255);
  v.setUint8(23, u8(Math.max(0, m.countdown) * 20));
  let o = HDR;
  for (const a of A) {
    v.setInt16(o, c16(a.pos.x * 100)); v.setInt16(o + 2, c16(a.pos.y * 100)); v.setInt16(o + 4, c16(a.pos.z * 100));
    v.setInt16(o + 6, c16(a.vel.x * 100)); v.setInt16(o + 8, c16(a.vel.y * 100)); v.setInt16(o + 10, c16(a.vel.z * 100));
    v.setInt16(o + 12, c16(wrap(a.yaw) * 10000)); v.setInt16(o + 14, c16(a.pitch * 10000));
    v.setUint8(o + 16, u8(a.hp * 10));
    v.setUint8(o + 17, (a.alive ? 1 : 0) | (a.crouch ? 2 : 0) | (a.sprint ? 4 : 0) | (a.onGround ? 8 : 0) | (a.eliminated ? 16 : 0) | (a.hurtT > 0.25 ? 32 : 0) | (a.spawnProtect > 0 ? 64 : 0) | (a.eatT > 0 ? 128 : 0));
    v.setUint8(o + 18, a.swingN & 255);
    const h = a.inv.slots[a.sel];
    v.setUint8(o + 19, h ? h.id : 0);
    for (let k = 0; k < 4; k++) v.setUint8(o + 20 + k, a.inv.armor[k] || 0);
    v.setUint8(o + 24, a.lives ?? 255); v.setUint8(o + 25, u8(a.kills)); v.setUint8(o + 26, u8(a.deaths)); v.setUint8(o + 27, u8(a.rank || 0));
    v.setUint8(o + 28, u8(a.respawnT * 10)); v.setUint8(o + 29, u8(a.absorb * 10)); v.setUint8(o + 30, a.sel & 15);
    o += PER;
  }
  return buf;
}

export function readSnap(buf) {
  const v = new DataView(buf);
  if (v.byteLength < HDR || v.getUint8(0) !== 1) return null;
  const n = v.getUint8(21);
  if (v.byteLength < HDR + n * PER) return null;
  const s = { seq: v.getUint16(1), clk: v.getFloat32(3), time: v.getFloat32(7), st: v.getUint8(11), mf: v.getUint8(12), border: v.getFloat32(13), voidY: v.getFloat32(17), win: v.getUint8(22), cd: v.getUint8(23) / 20, A: [] };
  let o = HDR;
  for (let i = 0; i < n; i++) {
    const f = v.getUint8(o + 17);
    s.A.push({
      x: v.getInt16(o) / 100, y: v.getInt16(o + 2) / 100, z: v.getInt16(o + 4) / 100,
      vx: v.getInt16(o + 6) / 100, vy: v.getInt16(o + 8) / 100, vz: v.getInt16(o + 10) / 100,
      yaw: v.getInt16(o + 12) / 10000, pitch: v.getInt16(o + 14) / 10000, hp: v.getUint8(o + 16) / 10,
      alive: !!(f & 1), crouch: !!(f & 2), sprint: !!(f & 4), og: !!(f & 8), elim: !!(f & 16), hurt: !!(f & 32), prot: !!(f & 64), eat: !!(f & 128),
      sw: v.getUint8(o + 18), held: v.getUint8(o + 19), armor: [v.getUint8(o + 20), v.getUint8(o + 21), v.getUint8(o + 22), v.getUint8(o + 23)],
      lives: v.getUint8(o + 24), kills: v.getUint8(o + 25), deaths: v.getUint8(o + 26), rank: v.getUint8(o + 27), respawnT: v.getUint8(o + 28) / 10, absorb: v.getUint8(o + 29) / 10, sel: v.getUint8(o + 30),
    });
    o += PER;
  }
  return s;
}

export const r3 = (v) => Math.round(v * 1000) / 1000;
export { wrap };
