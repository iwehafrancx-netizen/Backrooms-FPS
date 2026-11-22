// In-game overlay (plain DOM on top of the canvas).
//   - top bar: level name, targets left, loot value, throwable coins
//   - context action button (hide / pick lock / crack safe / fuse box)
//   - "?" / "!" marks that follow guards' heads, noise rings, loot pop-ups
//   - lock-pick mini-game: stop the needle inside the green notch
import * as THREE from 'three';

export class Hud {
  constructor(root, app) {
    this.app = app;
    this.t = app.t;
    this.root = root;
    root.innerHTML = `
      <div class="hud-top">
        <div class="hud-level"></div>
        <div class="hud-stats"><span class="hud-target"></span><span class="hud-cash"></span><span class="hud-coins"></span></div>
      </div>
      <button class="btn-pause" aria-label="pause">II</button>
      <div class="marks"></div>
      <div class="toasts"></div>
      <div class="tap-dot"></div>
      <div class="touch-ctl">
        <div class="joy"><i></i></div>
        <div class="btns">
          <button class="btn-run" aria-label="run"></button>
          <button class="btn-throw" aria-label="throw coin"></button>
          <button class="btn-action" aria-label="action"><span></span></button>
        </div>
      </div>
      <div class="desk-hint"></div>
      <div class="lockpick hidden"><div class="lp-ring"><div class="lp-zone"></div><div class="lp-needle"></div></div><p></p></div>`;
    const $ = (s) => root.querySelector(s);
    this.el = { level: $('.hud-level'), target: $('.hud-target'), cash: $('.hud-cash'), coins: $('.hud-coins'), marks: $('.marks'), toasts: $('.toasts'), action: $('.btn-action'), actionLabel: $('.btn-action span'), tap: $('.tap-dot'), lock: $('.lockpick'), hint: $('.desk-hint') };
    this.markEls = new Map();
    this.root.classList.toggle('touch', matchMedia('(pointer: coarse)').matches);
  }

  show(on) { this.root.classList.toggle('hidden', !on); }

  startLevel(def, targets, coins) {
    this.el.level.textContent = def.name;
    this.setTargets(targets);
    this.el.cash.textContent = '$0';
    this.setCoins(coins);
    this.clearMarks();
    this.el.hint.textContent = this.t('deskHint');
    this.toast(this.t(def.tip || 'tipSneak'), 'info', 5000);
  }

  setTargets(n) { this.el.target.textContent = n > 0 ? this.t('targetsLeft', { n }) : this.t('getOut'); this.el.target.classList.toggle('done', n === 0); }
  setCoins(n) { this.el.coins.textContent = '◎ ' + n; }

  setAction(it) {
    const label = it ? this.t('act_' + it.kind) : '';
    if (label === this.lastAction) return;
    this.lastAction = label;
    this.el.action.classList.toggle('ready', !!it);
    this.el.actionLabel.textContent = label;
    this.el.hint.textContent = it ? this.t('keyHint', { act: label }) : this.t('deskHint');
  }

  toast(text, cls = '', ms = 2600) {
    const d = document.createElement('div');
    d.className = 'toast ' + cls; d.textContent = text;
    this.el.toasts.appendChild(d);
    while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
    setTimeout(() => { d.classList.add('fade'); setTimeout(() => d.remove(), 500); }, ms);
  }

  lootPopup(l, left) {
    this.el.cash.textContent = '$' + this.app.game.player.loot;
    this.setTargets(left);
    this.toast(`+$${l.value}`, 'loot', 1400);
  }

  tapMarker(p) {
    const d = this.el.tap;
    d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    d.classList.remove('on'); void d.offsetWidth; d.classList.add('on');
  }

  // "?" or "!" over a guard's head, kept on screen for a moment
  mark(guard, sym) {
    let el = this.markEls.get(guard);
    if (!el) { el = document.createElement('div'); el.className = 'mark'; this.el.marks.appendChild(el); this.markEls.set(guard, el); }
    el.textContent = sym;
    el.className = 'mark ' + (sym === '!' ? 'alert' : 'huh');
    el.dataset.until = performance.now() + (sym === '!' ? 99999 : 2500);
  }

  clearMarks() { this.el.marks.innerHTML = ''; this.markEls.clear(); }

  noiseRing(at, radius) {
    const g = this.app.game;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(at.x, 0.05, at.z);
    g.scene.add(ring);
    const t0 = performance.now();
    const grow = () => {
      const k = (performance.now() - t0) / 600;
      if (k >= 1 || !g.scene) { g.scene && g.scene.remove(ring); ring.geometry.dispose(); return; }
      ring.scale.setScalar(0.2 + k * radius); ring.material.opacity = 0.5 * (1 - k);
      requestAnimationFrame(grow);
    };
    grow();
  }

  update(game) {
    const now = performance.now();
    for (const [guard, el] of this.markEls) {
      const keep = guard.state === 'chase' || guard.state === 'suspect' || guard.state === 'search' || now < +el.dataset.until;
      if (!keep) { el.remove(); this.markEls.delete(guard); continue; }
      if (guard.state === 'chase' && el.textContent !== '!') { el.textContent = '!'; el.className = 'mark alert'; }
      const s = this.app.R.toScreen(guard.pos.clone().setY(2.2));
      el.style.transform = `translate(${s.x}px, ${s.y}px)`;
      el.style.display = s.visible ? '' : 'none';
    }
    // red screen edge while someone is chasing you
    this.root.classList.toggle('danger', game.guards.some((g) => g.state === 'chase'));
  }

  // Lock-pick: a needle spins round a dial; tap/press action when it is inside
  // the green notch. `rounds` successes open the lock; a miss makes a little noise.
  lockpick(rounds, skill, done) {
    const box = this.el.lock, needle = box.querySelector('.lp-needle'), zone = box.querySelector('.lp-zone'), txt = box.querySelector('p');
    box.classList.remove('hidden');
    this.app.input.enabled = false;
    let hits = 0, ang = 0, zoneAt = 0, finished = false;
    const width = 46 * skill; // degrees of the green notch
    const speed = 210; // degrees per second
    const newZone = () => { zoneAt = 60 + Math.random() * 240; zone.style.transform = `rotate(${zoneAt}deg)`; zone.style.setProperty('--w', width + 'deg'); };
    newZone();
    txt.textContent = this.t('pickHelp', { n: rounds });
    let last = performance.now();
    const tick = () => {
      if (finished) return;
      const now = performance.now(); ang = (ang + speed * (now - last) / 1000) % 360; last = now;
      needle.style.transform = `rotate(${ang}deg)`;
      requestAnimationFrame(tick);
    };
    const end = (ok) => {
      finished = true; box.classList.add('hidden');
      removeEventListener('keydown', onKey); box.removeEventListener('pointerdown', press);
      this.app.input.enabled = true;
      done(ok);
    };
    const press = (e) => {
      e && e.preventDefault && e.preventDefault();
      const d = ((ang - zoneAt + 540) % 360) - 180;
      if (Math.abs(d) <= width / 2) {
        hits++; this.app.audio.play('pick_click', { volume: 0.9 });
        if (hits >= rounds) return end(true);
        newZone(); txt.textContent = this.t('pickHelp', { n: rounds - hits });
      } else { this.app.audio.play('door_locked', { volume: 0.6 }); end(false); this.toast(this.t('pickFail'), 'bad'); }
    };
    const onKey = (e) => { if (['Space', 'KeyE', 'Enter'].includes(e.code)) press(e); if (e.code === 'Escape') end(false); };
    addEventListener('keydown', onKey);
    box.addEventListener('pointerdown', press);
    requestAnimationFrame(tick);
  }
}
