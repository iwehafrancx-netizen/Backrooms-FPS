export class Input {
  constructor(canvas, ui) {
    this.canvas = canvas; this.ui = ui;
    this.keys = new Set(); this.pressed = new Set(); this.mouse = { l: false, r: false, lp: false, rp: false };
    this.look = { x: 0, y: 0 }; this.wheel = 0; this.locked = false; this.enabled = false; this.wantLock = () => false; this.lockFails = 0; this.noLock = false;
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window && navigator.maxTouchPoints > 0;
    this.t = { moveId: null, mx: 0, my: 0, ox: 0, oy: 0, lookId: null, lx: 0, ly: 0, attack: false, attackP: false, place: false, jump: false, crouch: false, sprint: false };
    this.pad = null;
    this.bind();
  }
  bind() {
    addEventListener('keydown', (e) => {
      if (!this.enabled && !['Escape'].includes(e.code)) { this.pressed.add(e.code); return; }
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    const grab = (e) => { if (this.touch || this.locked || this.noLock || !this.wantLock()) return; if (e.type === 'keydown' && e.code === 'Escape') return; if (e.type !== 'keydown' && e.target && e.target.closest && e.target.closest('[data-act]')) return; this.requestLock(); };
    addEventListener('keydown', grab, true); addEventListener('mousedown', grab, true);
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.l = this.mouse.r = false; });
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.touch) return;
      if (!this.locked && this.enabled) { this.requestLock(); return; }
      if (e.button === 0) { this.mouse.l = true; this.mouse.lp = true; }
      if (e.button === 2) { this.mouse.r = true; this.mouse.rp = true; }
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.l = false; if (e.button === 2) this.mouse.r = false; });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => { if (this.locked || (this.noLock && this.enabled && !this.touch)) { this.look.x += e.movementX; this.look.y += e.movementY; } });
    addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => { const was = this.locked; this.locked = document.pointerLockElement === this.canvas; this.lockPending = false; if (this.locked) { this.lockFails = 0; this.everLocked = true; } if (was && !this.locked && this.onUnlock) this.onUnlock(); });
    document.addEventListener('pointerlockerror', () => { this.lockPending = false; this.lockFailed(); });
    addEventListener('touchstart', () => { if (!this.touch) { this.touch = true; if (this.onTouch) this.onTouch(); } }, { passive: true, capture: true });
  }
  lockFailed() {
    this.lockPending = false;
    if (this.locked || this.everLocked) return;
    this.lockFails++;
    if (this.lockFails >= 3 && !this.noLock) { this.noLock = true; this.canvas.style.cursor = 'none'; if (this.onNoLock) this.onNoLock(); }
  }
  requestLock() {
    if (this.touch || this.locked || this.noLock || (this.lockPending && performance.now() - this.lockAt < 600)) return;
    this.lockPending = true; this.lockAt = performance.now();
    if (!this.canvas.requestPointerLock) { this.lockFails = 2; this.lockFailed(); return; }
    const fail = (e) => { if (e && e.name === 'NotSupportedError') { try { const q = this.canvas.requestPointerLock(); if (q && q.catch) q.catch(() => this.lockFailed()); } catch (er) { this.lockFailed(); } } else this.lockFailed(); };
    try { const p = this.canvas.requestPointerLock({ unadjustedMovement: true }); if (p && p.catch) p.catch(fail); } catch (e) { try { this.canvas.requestPointerLock(); } catch (er) { this.lockFailed(); } }
  }
  exitLock() { if (document.pointerLockElement) document.exitPointerLock(); }
  enable(on) { this.enabled = on; if (!on) { this.keys.clear(); this.mouse.l = this.mouse.r = false; this.t.attack = this.t.place = this.t.jump = false; } }

  wireTouch(root) {
    const t = this.t;
    const joy = root.querySelector('.joy'), knob = root.querySelector('.joy .knob'), look = root.querySelector('.look-zone');
    const joyStart = (tc) => { t.moveId = tc.identifier; const r = joy.getBoundingClientRect(); t.ox = r.left + r.width / 2; t.oy = r.top + r.height / 2; joyMove(tc); };
    const joyMove = (tc) => { const r = joy.getBoundingClientRect(), R = r.width / 2; let dx = tc.clientX - t.ox, dy = tc.clientY - t.oy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } t.mx = dx / R; t.my = -dy / R; knob.style.transform = `translate(${dx}px, ${dy}px)`; t.sprint = d > R * 0.95; };
    root.querySelector('.joy-zone').addEventListener('touchstart', (e) => { e.preventDefault(); if (t.moveId == null) joyStart(e.changedTouches[0]); }, { passive: false });
    look.addEventListener('touchstart', (e) => { e.preventDefault(); if (t.lookId == null) { const tc = e.changedTouches[0]; t.lookId = tc.identifier; t.lx = tc.clientX; t.ly = tc.clientY; t.tapT = performance.now(); t.tapX = tc.clientX; t.tapY = tc.clientY; } }, { passive: false });
    addEventListener('touchmove', (e) => {
      for (const tc of e.changedTouches) {
        if (tc.identifier === t.moveId) joyMove(tc);
        if (tc.identifier === t.lookId) { this.look.x += (tc.clientX - t.lx) * 2.2; this.look.y += (tc.clientY - t.ly) * 2.2; t.lx = tc.clientX; t.ly = tc.clientY; }
      }
    }, { passive: true });
    const end = (e) => {
      for (const tc of e.changedTouches) {
        if (tc.identifier === t.moveId) { t.moveId = null; t.mx = t.my = 0; t.sprint = false; knob.style.transform = ''; }
        if (tc.identifier === t.lookId) { t.lookId = null; if (performance.now() - t.tapT < 220 && Math.hypot(tc.clientX - t.tapX, tc.clientY - t.tapY) < 12) { t.tapPlace = true; } }
      }
    };
    addEventListener('touchend', end); addEventListener('touchcancel', end);
    const btn = (sel, down, up) => { const b = root.querySelector(sel); if (!b) return; b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); down(); }, { passive: false }); const u = (e) => { b.classList.remove('on'); up && up(); }; b.addEventListener('touchend', u); b.addEventListener('touchcancel', u); };
    btn('.tb-attack', () => { t.attack = true; t.attackP = true; }, () => { t.attack = false; });
    btn('.tb-place', () => { t.place = true; t.placeP = true; }, () => { t.place = false; });
    btn('.tb-jump', () => { t.jump = true; t.jumpP = true; }, () => { t.jump = false; });
    btn('.tb-crouch', () => { t.crouch = !t.crouch; root.querySelector('.tb-crouch').classList.toggle('lit', t.crouch); });
  }

  sample() {
    const k = this.keys, t = this.t;
    let mx = 0, my = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) my += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) my -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1;
    let attack = this.mouse.l, attackP = this.mouse.lp, use = this.mouse.rp, useHeld = this.mouse.r;
    let jump = k.has('Space'), crouch = k.has('ShiftLeft') || k.has('ShiftRight'), sprint = k.has('ControlLeft') || k.has('KeyR') || false;
    let sel = null;
    for (let i = 1; i <= 9; i++) if (this.pressed.has('Digit' + i)) sel = i - 1;
    let wheel = this.wheel; this.wheel = 0;
    if (this.touch) {
      if (t.mx || t.my) { mx = t.mx; my = t.my; }
      attack = attack || t.attack; attackP = attackP || t.attackP;
      use = use || t.placeP || t.tapPlace; useHeld = useHeld || t.place;
      jump = jump || t.jump; crouch = crouch || t.crouch; sprint = sprint || (t.sprint && my > 0.7);
      t.attackP = false; t.placeP = false; t.tapPlace = false;
    }
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const gp = pads[0];
    if (gp) {
      const dz = (v) => (Math.abs(v) < 0.16 ? 0 : v);
      const lx = dz(gp.axes[0]), ly = dz(gp.axes[1]), rx = dz(gp.axes[2]), ry = dz(gp.axes[3]);
      if (lx || ly) { mx = lx; my = -ly; }
      this.look.x += Math.sign(rx) * rx * rx * 14; this.look.y += Math.sign(ry) * ry * ry * 10;
      const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
      const prev = this.padPrev || [];
      const edge = (i) => b(i) && !prev[i];
      attack = attack || b(7); attackP = attackP || edge(7); useHeld = useHeld || b(6); use = use || edge(6);
      jump = jump || b(0); crouch = crouch || b(1); sprint = sprint || b(10);
      if (edge(5)) wheel += 1; if (edge(4)) wheel -= 1;
      if (edge(9)) this.pressed.add('Escape');
      this.padPrev = gp.buttons.map((x) => x.pressed);
      this.gamepad = true;
    }
    const out = { mx, my, lookX: this.look.x, lookY: this.look.y, attack, attackPressed: attackP, use, useHeld, jump, crouch, sprint, sel, wheel, pressed: new Set(this.pressed) };
    this.look.x = 0; this.look.y = 0; this.mouse.lp = false; this.mouse.rp = false; this.pressed.clear();
    return out;
  }
}
