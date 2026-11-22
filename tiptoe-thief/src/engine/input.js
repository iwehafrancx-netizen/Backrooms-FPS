// Keyboard, mouse, touch and gamepad in one place.
//
// The game reads a small snapshot every frame via `sample()`:
//   move    {x, z}  direct movement (-1..1) from WASD / arrows / stick / pad
//   run     bool    Shift, the run button, or the stick pushed all the way
//   tapAt   {x, y}  screen point the player tapped/clicked this frame (walk there)
//   action  bool    E / Space / the hand button / pad A  (hide, pick, fuse…)
//   throw   bool    Q / the coin button / pad X          (throw a coin)
//   pause   bool    P / the pause button / pad Start
//   zoom    number  wheel / pinch delta in metres
export class Input {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.taps = [];
    this.zoom = 0;
    this.stick = { id: null, x: 0, z: 0, ox: 0, oy: 0 };
    this.buttons = { action: false, throw: false, run: false, pause: false };
    this.enabled = true;
    this.touch = matchMedia('(pointer: coarse)').matches;

    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.stick.id = null; this.stick.x = this.stick.z = 0; });

    // Click / tap on the floor = walk there. A drag with two fingers zooms.
    const pts = new Map();
    let pinch = 0, downAt = null;
    canvas.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); downAt = null; }
      else downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.zoom -= (d - pinch) * 0.03; pinch = d; }
    });
    const up = (e) => {
      if (downAt && pts.size === 1 && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 14 && performance.now() - downAt.t < 450) {
        this.taps.push({ x: e.clientX, y: e.clientY, double: performance.now() - (this.lastTapT || 0) < 320 });
        this.lastTapT = performance.now();
      }
      pts.delete(e.pointerId); downAt = null;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); downAt = null; });
    canvas.addEventListener('wheel', (e) => { this.zoom += Math.sign(e.deltaY) * 1.2; e.preventDefault(); }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.bindTouchControls(ui);
  }

  // On-screen joystick (left) and round buttons (right) live in the HUD.
  bindTouchControls(ui) {
    const joy = ui.querySelector('.joy'), knob = ui.querySelector('.joy i');
    if (joy) {
      const R = () => joy.getBoundingClientRect().width / 2;
      const moveTo = (x, y) => {
        let dx = x - this.stick.ox, dy = y - this.stick.oy;
        const d = Math.hypot(dx, dy), r = R();
        if (d > r) { dx *= r / d; dy *= r / d; }
        this.stick.x = dx / r; this.stick.z = dy / r;
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
      };
      joy.addEventListener('pointerdown', (e) => {
        const b = joy.getBoundingClientRect();
        this.stick.id = e.pointerId; this.stick.ox = b.left + b.width / 2; this.stick.oy = b.top + b.height / 2;
        joy.setPointerCapture(e.pointerId); moveTo(e.clientX, e.clientY);
      });
      joy.addEventListener('pointermove', (e) => { if (e.pointerId === this.stick.id) moveTo(e.clientX, e.clientY); });
      const end = (e) => { if (e.pointerId !== this.stick.id) return; this.stick.id = null; this.stick.x = this.stick.z = 0; knob.style.transform = ''; };
      joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
    }
    for (const [cls, key] of [['.btn-action', 'action'], ['.btn-throw', 'throw'], ['.btn-run', 'run'], ['.btn-pause', 'pause']]) {
      const b = ui.querySelector(cls);
      if (!b) continue;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (key === 'run') this.buttons.run = !this.buttons.run; else this.buttons[key] = true; b.classList.toggle('on', key === 'run' ? this.buttons.run : true); });
      b.addEventListener('pointerup', () => { if (key !== 'run') b.classList.remove('on'); });
    }
  }

  sample() {
    const k = this.keys, out = { move: { x: 0, z: 0 }, run: false, tapAt: null, action: false, throw: false, pause: false, zoom: 0 };
    if (!this.enabled) { this.pressed.clear(); this.taps.length = 0; this.zoom = 0; this.buttons.action = this.buttons.throw = this.buttons.pause = false; return out; }
    out.move.x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    out.move.z = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    if (this.stick.id != null) { out.move.x = this.stick.x; out.move.z = this.stick.z; }
    out.run = k.has('ShiftLeft') || k.has('ShiftRight') || this.buttons.run || Math.hypot(this.stick.x, this.stick.z) > 0.97;
    out.action = this.pressed.has('KeyE') || this.pressed.has('Space') || this.pressed.has('Enter') || this.buttons.action;
    out.throw = this.pressed.has('KeyQ') || this.buttons.throw;
    out.pause = this.pressed.has('KeyP') || this.pressed.has('Escape') || this.buttons.pause;
    const tap = this.taps.pop();
    if (tap) { out.tapAt = tap; if (tap.double) out.run = true; }

    // first connected gamepad
    const pad = navigator.getGamepads && [...navigator.getGamepads()].find(Boolean);
    if (pad) {
      const ax = pad.axes[0] || 0, az = pad.axes[1] || 0;
      if (Math.hypot(ax, az) > 0.18) { out.move.x = ax; out.move.z = az; }
      const b = (i) => pad.buttons[i] && pad.buttons[i].pressed;
      const edge = (i) => { const was = this._pad && this._pad[i]; return b(i) && !was; };
      out.action = out.action || edge(0);
      out.throw = out.throw || edge(2);
      out.pause = out.pause || edge(9);
      out.run = out.run || b(5) || b(7);
      this._pad = pad.buttons.map((x) => x.pressed);
    }
    out.zoom = this.zoom;
    this.zoom = 0; this.pressed.clear(); this.taps.length = 0;
    this.buttons.action = this.buttons.throw = this.buttons.pause = false;
    return out;
  }
}
