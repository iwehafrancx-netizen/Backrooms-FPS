import { t, LANG_NAMES } from '../i18n/strings.js';
import { icon, skinFront, pixIcon, eggIcon, flagIcon } from './icons.js';
import { ITEMS } from '../game/items.js';
import { TEAM_COLORS } from '../engine/blocks.js';
import { SHOP } from '../game/modes/eggdefense.js';
import { SKINS, levelXp } from '../game/save.js';
import { fmtTime } from '../game/modes/parkour.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const clock = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const teamName = (i) => t('team_' + i);
const MAP_NAMES = { meadow: 'Meadow Castles', dunes: 'Desert Temples', frostfort: 'Frost Fort', emberruins: 'Ember Ruins', dusk: 'Dusk Village', frost: 'Frostbite', ember: 'Ember Rock', greenkeep: 'Green Keep', sandhold: 'Sandhold', twincastles: 'Twin Castles', frostkeep: 'Frost Keep', sunfort: 'Sun Fort', skybridge: 'Sky Bridge', sandbridge: 'Sand Bridge', icebridge: 'Ice Bridge', lavabridge: 'Lava Bridge', castlerun: 'Castle Dash', templerun: 'Sun Temple Dash', frostrun: 'Frost Dash', lavarun: 'Lava Dash', skyrace: 'Sky Steps', sandrace: 'Sand Steps', icerace: 'Ice Steps', lavarace: 'Lava Steps', duskrace: 'Dusk Steps' };
export { MAP_NAMES };
const OFFER_NAME = { wool: 'wool', chain_set: 'chainSet', iron_set: 'ironSet', diamond_set: 'diamondSet' };
const CATS = [['blocks', 'cBlocks'], ['combat', 'cCombat'], ['armor', 'cArmor'], ['tools', 'cTools'], ['utility', 'cUtility']];

export class UI {
  constructor(root, app) {
    this.root = root; this.app = app;
    root.innerHTML = `<div id="screen"></div><div id="hud" class="off"></div><div id="panel" class="off"></div><div id="toasts"></div><div id="fade"></div>`;
    this.screenEl = root.querySelector('#screen'); this.hudEl = root.querySelector('#hud'); this.panelEl = root.querySelector('#panel'); this.toastEl = root.querySelector('#toasts');
    this.sig = {}; this.screen = null; this.shopCat = 'blocks';
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      e.preventDefault();
      this.app.act(b.dataset.act, b.dataset);
    });
    root.addEventListener('pointerover', (e) => { const b = e.target.closest('button'); if (b && b !== this.lastHover) { this.lastHover = b; this.app.audio.hover(); } });
    root.addEventListener('input', (e) => { const el = e.target; if (el.dataset.set) this.app.setSetting(el.dataset.set, el.type === 'range' ? +el.value : el.value); });
    root.addEventListener('change', (e) => { const el = e.target; if (el.dataset.set && el.tagName === 'SELECT') this.app.setSetting(el.dataset.set, el.value); });
  }

  show(name, html) {
    this.screen = name;
    this.screenEl.className = name ? 'on scr-' + name : '';
    this.screenEl.innerHTML = name ? html : '';
  }

  coinsHtml(n) { return `<span class="coins"><i class="coin"></i>${n}</span>`; }
  profileHtml() {
    const d = this.app.save.data;
    const pct = Math.min(100, (d.xp / levelXp(d.level)) * 100);
    return `<div class="topbar"><div class="profile"><img class="pix" src="${skinFront(SKINS[d.skin].seed)}"><div><b>${t('level', { n: d.level })}</b><div class="xpbar"><i style="width:${pct}%"></i></div></div></div>${this.coinsHtml(d.coins)}</div>`;
  }

  menu() {
    this.show('menu', `${this.profileHtml()}
      <div class="logo"><span>VOXEL</span><span>ISLES</span></div>
      <div class="menu-btns">
        <button class="btn big green" data-act="modes">${t('play')}</button>
        <div class="row"><button class="btn" data-act="skins">${t('skins')}</button><button class="btn" data-act="settings">${t('settings')}</button><button class="btn" data-act="howto">${t('howto')}</button></div>
      </div>`);
  }

  modes() {
    const cards = [
      ['sky', () => icon(1), 'solo8'], ['egg', () => eggIcon(TEAM_COLORS[1].hex), 'teams4x2'], ['ctf', () => flagIcon(TEAM_COLORS[0].hex), 'teams4v4'],
      ['bridge', () => icon(57), 'teams2v2'], ['deathrun', () => icon(60), 'death1v7'], ['parkour', () => icon(61), 'soloRace'],
    ].filter(([id]) => this.app.available(id));
    const soon = [['zombie', () => icon(28)], ['oitc', () => icon(101)], ['survival', () => icon(17)]];
    const card = ([id, img, tag]) => `<button class="card c-${id}" data-act="mode" data-mode="${id}"><div class="art"><img class="pix" src="${img()}"></div><h2>${t(id)}</h2><div class="tag">${t(tag)}</div><p>${t(id + 'Desc')}</p></button>`;
    const soonCard = ([id, img]) => `<div class="card soon"><div class="art"><img class="pix" src="${img()}"></div><h2>${t(id)}</h2><div class="tag">${t('soon')}</div><p>${t(id + 'Desc')}</p></div>`;
    this.show('modes', `${this.profileHtml()}<h1>${t('chooseGame')}</h1>
      <div class="cards">${cards.map(card).join('')}${soon.map(soonCard).join('')}</div>
      <button class="btn back" data-act="menu">${t('back')}</button>`);
  }

  parkourPick() {
    this.show('pkpick', `${this.profileHtml()}<h1>${t('parkour')}</h1>
      <div class="cards">
        <button class="card c-parkour" data-act="pkSolo"><div class="art"><img class="pix" src="${icon(58)}"></div><h2>${t('pkSolo')}</h2><div class="tag">${t('levels10')}</div><p>${t('pkSoloDesc')}</p></button>
        <button class="card c-race" data-act="pkRace"><div class="art"><img class="pix" src="${icon(61)}"></div><h2>${t('parkourRace')}</h2><div class="tag">${t('players6')}</div><p>${t('pkRaceDesc')}</p></button>
      </div>
      <button class="btn back" data-act="modes">${t('back')}</button>`);
  }

  parkourLevels(pk) {
    pk = pk || { best: {}, stars: {}, unlocked: 1 };
    const cells = [];
    for (let L = 1; L <= 10; L++) {
      const open = L <= (pk.unlocked || 1), st = (pk.stars && pk.stars[L]) || 0, best = pk.best && pk.best[L];
      cells.push(`<button class="lvl ${open ? '' : 'locked'} ${st ? 'done' : ''}" ${open ? `data-act="level" data-level="${L}"` : 'disabled'}><b>${L}</b><span class="st">${[1, 2, 3].map((k) => `<i class="${k <= st ? 'on' : ''}"></i>`).join('')}</span><em>${open ? (best ? fmtTime(best) : t('newLevel')) : '—'}</em></button>`);
    }
    this.show('pklevels', `${this.profileHtml()}<h1>${t('pkSolo')}</h1><div class="lvls">${cells.join('')}</div>
      <button class="btn back" data-act="pkBack">${t('back')}</button>`);
  }

  lobby(L) {
    const mode = L.mode, teamed = mode.teams > 0;
    this.show('lobby', `<div class="lpanel"><h1>${t(mode.id === 'race' ? 'parkourRace' : mode.id)}</h1><div class="mapname">${MAP_NAMES[L.map.id] || ''}</div>
      <div class="status"></div><div class="slots ${teamed ? 'teams t' + mode.teams : ''}"></div>
      <button class="btn small" data-act="cancelLobby">${t('cancel')}</button></div>`);
    this.sig.lobby = '';
    this.updateLobby(L);
  }
  updateLobby(L) {
    if (this.screen !== 'lobby') return;
    const s = L.state + L.slots.length + (L.state === 'countdown' ? Math.ceil(L.cd) : '');
    if (s === this.sig.lobby) return;
    this.sig.lobby = s;
    const st = this.screenEl.querySelector('.status');
    st.innerHTML = L.state === 'search' ? `<span class="spin"></span>${t('finding')} <b>${L.slots.length}/${L.mode.players}</b>` : `<b class="cd">${t('starting', { n: Math.max(1, Math.ceil(L.cd)) })}</b>`;
    const slots = [];
    const teamed = L.mode.teams > 0, ts = L.mode.teamSize || 2;
    for (let i = 0; i < L.mode.players; i++) {
      const p = L.slots[i];
      const team = teamed ? Math.floor(i / ts) : -1;
      const col = team >= 0 ? TEAM_COLORS[team].hex : '';
      slots.push(p ? `<div class="slot ${p.bot ? '' : 'me'} pop" style="${col ? `--tc:${col}` : ''}"><img class="pix" src="${skinFront(p.skinSeed ?? p.skin, team)}"><span>${esc(p.name)}</span></div>` : `<div class="slot empty" style="${col ? `--tc:${col}` : ''}"><i></i><span>…</span></div>`);
    }
    const box = this.screenEl.querySelector('.slots');
    box.innerHTML = teamed ? Array.from({ length: L.mode.teams }, (_, tm) => `<div class="tcol" style="--tc:${TEAM_COLORS[tm].hex}"><div class="tname">${teamName(tm)}</div>${slots.slice(tm * ts, tm * ts + ts).join('')}</div>`).join('') : slots.join('');
  }

  results(r) {
    const canDouble = r.canDouble && !r.doubled;
    this.show('results', `<div class="rpanel ${r.win ? 'won' : ''}">
      <h1>${r.win ? t('victory') : t('gameOver')}</h1>
      <div class="sub">${esc(r.sub)}</div>
      ${r.stars ? `<div class="bigstars">${[1, 2, 3].map((k) => `<i class="${k <= r.stars ? 'on' : ''}"></i>`).join('')}</div>` : ''}
      <div class="rows">${r.time ? `<div><span>${t('time')}</span><b>${fmtTime(r.time)}</b></div>` : `<div><span>${t('kills')}</span><b>${r.kills}</b></div>`}<div><span>${t('reward')}</span><b>${this.coinsHtml('+' + r.coins)}</b></div><div><span>${t('xp')}</span><b>+${r.xp}</b></div></div>
      ${this.profileHtml()}
      <div class="btns">
        ${r.next ? `<button class="btn green" data-act="nextLevel">${t('nextLevel')}</button><button class="btn" data-act="again">${t('retry')}</button>` : `<button class="btn green" data-act="again">${r.solo ? t('retry') : t('playAgain')}</button>`}
        <button class="btn" data-act="${r.solo ? 'pkLevels' : 'modes'}">${r.solo ? t('levels') : t('changeGame')}</button>
        ${canDouble ? `<button class="btn gold" data-act="double"><i class="ad"></i>${t('doubleCoins')}</button>` : ''}
        ${r.canSpectate ? `<button class="btn" data-act="spectate">${t('spectate')}</button>` : ''}
      </div></div>`);
  }

  pause() {
    this.show('pause', `<div class="ppanel"><h1>${t('paused')}</h1>
      <button class="btn green" data-act="resume">${t('resume')}</button>
      <button class="btn" data-act="settings">${t('settings')}</button>
      <button class="btn" data-act="howto">${t('howto')}</button>
      <button class="btn red" data-act="leave">${t('leaveMatch')}</button></div>`);
  }

  settings() {
    const s = this.app.save.settings;
    const range = (k, label, min, max, step, fmtv) => `<label><span>${t(label)}</span><input type="range" data-set="${k}" min="${min}" max="${max}" step="${step}" value="${s[k]}"><em>${fmtv(s[k])}</em></label>`;
    const opt = (k, label, opts) => `<label><span>${t(label)}</span><div class="seg">${opts.map(([v, l]) => `<button class="${String(s[k]) === String(v) ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div></label>`;
    this.show('settings', `<div class="spanel"><h1>${t('settings')}</h1>
      ${range('sens', 'sens', 0.2, 3, 0.05, (v) => v.toFixed(2))}
      ${range('fov', 'fov', 60, 100, 1, (v) => v)}
      ${range('volume', 'volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%')}
      ${range('music', 'music', 0, 1, 0.05, (v) => Math.round(v * 100) + '%')}
      ${opt('quality', 'quality', [['auto', t('qAuto')], ['low', t('qLow')], ['high', t('qHigh')]])}
      ${opt('invert', 'invert', [[false, t('off')], [true, t('on')]])}
      <label><span>${t('language')}</span><select data-set="lang"><option value="auto" ${s.lang === 'auto' ? 'selected' : ''}>${t('auto')}</option>${Object.entries(LANG_NAMES).map(([k, n]) => `<option value="${k}" ${s.lang === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <button class="btn" data-act="back">${t('back')}</button></div>`);
    this.screenEl.querySelectorAll('input[type=range]').forEach((el) => el.addEventListener('input', () => { const em = el.nextElementSibling; const k = el.dataset.set, v = +el.value; em.textContent = k === 'sens' ? v.toFixed(2) : k === 'fov' ? v : Math.round(v * 100) + '%'; }));
  }

  skins() {
    const d = this.app.save.data;
    this.show('skins', `${this.profileHtml()}<h1>${t('skins')}</h1><div class="skingrid">${SKINS.map((s) => {
      const owned = d.owned.includes(s.id), eq = d.skin === s.id;
      const btn = eq ? `<button class="btn small on" disabled>${t('equipped')}</button>` : owned ? `<button class="btn small" data-act="equip" data-id="${s.id}">${t('equip')}</button>` : `<button class="btn small gold" data-act="buySkin" data-id="${s.id}" ${d.coins < s.price ? 'disabled' : ''}>${this.coinsHtml(s.price)}</button>`;
      return `<div class="skin ${eq ? 'eq' : ''}"><img class="pix" src="${skinFront(s.seed)}">${btn}</div>`;
    }).join('')}</div><button class="btn back" data-act="back">${t('back')}</button>`);
  }

  howto() {
    this.show('howto', `<div class="spanel how"><h1>${t('howto')}</h1>${['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9', 'h10'].map((k) => `<p>${t(k)}</p>`).join('')}<button class="btn" data-act="back">${t('back')}</button></div>`);
  }

  buildHud(touch) {
    const slots = Array.from({ length: 9 }, (_, i) => `<div class="hs" data-act="sel" data-i="${i}"><img><b></b><em>${i + 1}</em></div>`).join('');
    this.hudEl.innerHTML = `
      <div class="hurt"></div><div class="xhair"></div>
      <div class="info"></div><div class="eggs"></div><div class="feed"></div>
      <div class="title"><div class="big"></div><div class="sub"></div></div>
      <div class="itemname"></div>
      <div class="bottom"><div class="stats"><div class="armor"></div><div class="hearts"></div></div><div class="hotbar">${slots}</div></div>
      <button class="pausebtn" data-act="pause"><i></i><i></i></button>
      <div class="lockhint">${t('clickToPlay')}</div>
      <div class="spec"><span></span><button class="btn small green" data-act="again">${t('playAgain')}</button><button class="btn small" data-act="leave">${t('leave')}</button></div>
      <div class="touch">
        <div class="look-zone"></div>
        <div class="joy-zone"><div class="joy"><div class="knob"></div></div></div>
        <div class="tb tb-attack"><img class="pix" src="${icon(101)}"></div>
        <div class="tb tb-place"><img class="pix" src="${icon(5)}"></div>
        <div class="tb tb-jump"><i class="arrow up"></i></div>
        <div class="tb tb-crouch"><i class="arrow down"></i></div>
      </div>`;
    this.hudEl.classList.toggle('is-touch', !!touch);
    this.h = {
      hurt: this.hudEl.querySelector('.hurt'), info: this.hudEl.querySelector('.info'), eggs: this.hudEl.querySelector('.eggs'), feed: this.hudEl.querySelector('.feed'),
      big: this.hudEl.querySelector('.title .big'), sub: this.hudEl.querySelector('.title .sub'), title: this.hudEl.querySelector('.title'),
      itemname: this.hudEl.querySelector('.itemname'), armor: this.hudEl.querySelector('.armor'), hearts: this.hudEl.querySelector('.hearts'),
      slots: [...this.hudEl.querySelectorAll('.hs')], lock: this.hudEl.querySelector('.lockhint'), spec: this.hudEl.querySelector('.spec'), xhair: this.hudEl.querySelector('.xhair'),
      place: this.hudEl.querySelector('.tb-place img'),
    };
    this.sig = {};
    return this.hudEl;
  }
  setTouch(on) { this.hudEl.classList.toggle('is-touch', on); }
  hud(on) { this.hudEl.classList.toggle('off', !on); }

  updateHud(m, me, view) {
    const H = this.h, sig = this.sig;
    if (sig.nobar !== !!m.mode.hideBar) { sig.nobar = !!m.mode.hideBar; this.hudEl.classList.toggle('nobar', sig.nobar); }
    const inv = me.inv;
    const hs = inv.slots.map((s) => (s ? s.id + 'x' + s.count : '-')).join(',') + '|' + me.sel;
    if (hs !== sig.hot) {
      const prevSel = sig.sel;
      sig.hot = hs; sig.sel = me.sel;
      inv.slots.forEach((s, i) => {
        const el = H.slots[i];
        el.classList.toggle('on', i === me.sel);
        const img = el.firstElementChild, b = img.nextElementSibling;
        const src = s ? icon(s.id) : '';
        if (img.dataset.src !== src) { img.dataset.src = src; if (src) img.src = src; img.style.visibility = src ? '' : 'hidden'; }
        b.textContent = s && s.count > 1 ? s.count : '';
      });
      const held = inv.slots[me.sel];
      if (prevSel !== me.sel || (held ? held.id : 0) !== sig.heldId) {
        sig.heldId = held ? held.id : 0;
        H.itemname.textContent = held ? ITEMS[held.id].name : '';
        H.itemname.classList.remove('show'); void H.itemname.offsetWidth; if (held) H.itemname.classList.add('show');
      }
      const bs = inv.blockSlot();
      const pid = bs >= 0 ? inv.slots[bs].id : 5;
      if (H.place.dataset.id !== String(pid)) { H.place.dataset.id = pid; H.place.src = icon(pid); }
    }
    const hp = Math.max(0, Math.ceil(me.hp)), ab = Math.ceil(me.absorb || 0);
    if (sig.hp !== hp + ':' + ab) {
      sig.hp = hp + ':' + ab;
      let out = '';
      for (let i = 0; i < 10; i++) { const v = hp - i * 2; out += `<img src="${v >= 2 ? pixIcon('heart', '#e8322a', '#3a1414') : v === 1 ? pixIcon('heart', '#e8322a', '#3a1414', true) : pixIcon('heart', '#3a1414', '#3a1414')}">`; }
      for (let i = 0; i < Math.ceil(ab / 2); i++) out += `<img src="${pixIcon('heart', '#f5cf3d', '#f5cf3d')}">`;
      H.hearts.innerHTML = out;
      H.hearts.classList.toggle('low', hp <= 6 && hp > 0);
    }
    const ap = inv.armorPoints();
    if (sig.ap !== ap) {
      sig.ap = ap;
      let out = '';
      if (ap > 0) for (let i = 0; i < 10; i++) { const v = ap - i * 2; out += `<img src="${v >= 2 ? pixIcon('armor', '#dfe6ee', '#3a3a44') : v === 1 ? pixIcon('armor', '#dfe6ee', '#3a3a44', true) : pixIcon('armor', '#3a3a44', '#3a3a44')}">`; }
      H.armor.innerHTML = out;
    }
    let info = '';
    const hd = m.state === 'countdown' && !m.mode.hudInCountdown ? null : m.mode.hud ? m.mode.hud(me) : null;
    if (hd) {
      for (const l of hd.lines || []) info += `<div class="${l.cls || ''}">${l.b ? `<b>${esc(l.text)}</b>` : esc(l.text)}</div>`;
      if (hd.cur) info += `<div class="cur"><span><img src="${icon(170)}">${inv.count(170)}</span><span><img src="${icon(171)}">${inv.count(171)}</span><span><img src="${icon(172)}">${inv.count(172)}</span></div>`;
      const chipIcon = (c) => (c.icon === 'egg' || c.icon === 'eggGone' ? `<img src="${eggIcon(c.color)}" class="${c.icon === 'eggGone' ? 'gone' : ''}">` : c.icon === 'flag' || c.icon === 'flagGone' ? `<img src="${flagIcon(c.color)}" class="${c.icon === 'flagGone' ? 'gone' : ''}">` : '');
      const eg = (hd.chips || []).map((c) => `<div class="eg ${c.dim ? 'out' : ''} ${c.mine ? 'mine' : ''} ${c.big ? 'big' : ''}" style="--tc:${c.color}">${chipIcon(c)}<b>${esc(c.label)}</b></div>`).join('');
      if (eg !== sig.eggs) { sig.eggs = eg; H.eggs.innerHTML = eg; }
    } else if (sig.eggs) { sig.eggs = ''; H.eggs.innerHTML = ''; }
    if (info !== sig.info) { sig.info = info; H.info.innerHTML = info; }
  }

  title(big, sub = '', dur = 2.2, cls = '') {
    const H = this.h;
    H.big.textContent = big; H.sub.textContent = sub;
    H.title.className = 'title show ' + cls;
    clearTimeout(this.titleT);
    if (dur > 0) this.titleT = setTimeout(() => { H.title.className = 'title'; }, dur * 1000);
  }
  clearTitle() { clearTimeout(this.titleT); if (this.h) this.h.title.className = 'title'; }

  feed(html) {
    const el = document.createElement('div');
    el.className = 'fe'; el.innerHTML = html;
    this.h.feed.appendChild(el);
    while (this.h.feed.children.length > 5) this.h.feed.firstChild.remove();
    setTimeout(() => { el.classList.add('fade'); setTimeout(() => el.remove(), 500); }, 5000);
  }
  name(a, me) { const col = a.team >= 0 ? TEAM_COLORS[a.team].hex : a === me ? '#7dff6a' : '#fff'; return `<b style="color:${col}">${esc(a === me ? a.name : a.name)}</b>`; }

  toast(msg, cls = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + cls; el.textContent = msg;
    this.toastEl.appendChild(el);
    while (this.toastEl.children.length > 3) this.toastEl.firstChild.remove();
    setTimeout(() => { el.classList.add('fade'); setTimeout(() => el.remove(), 400); }, 2600);
  }
  hurtFlash() { const e = this.h.hurt; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); }
  lockHint(on) { if (this.h) this.h.lock.classList.toggle('on', on); }
  spectate(name) { if (!this.h) return; this.h.spec.classList.toggle('on', !!name); if (name) this.h.spec.firstElementChild.textContent = t('spectating', { name }); this.hudEl.classList.toggle('specmode', !!name); }

  openPanel(html, cls) { this.panelEl.className = 'on ' + cls; this.panelEl.innerHTML = html; this.panelOpen = cls; }
  closePanel() { this.panelEl.className = 'off'; this.panelEl.innerHTML = ''; this.panelOpen = null; }
  invRow(me) {
    const s = me.inv.slots.map((x, i) => `<div class="is ${i === me.sel ? 'on' : ''}">${x ? `<img class="pix" src="${icon(x.id)}"><b>${x.count > 1 ? x.count : ''}</b>` : ''}</div>`).join('');
    const ar = me.inv.armor.map((id) => `<div class="is ar">${id ? `<img class="pix" src="${icon(id)}">` : ''}</div>`).join('');
    return `<div class="invrow"><div class="lbl">${t('inventory')}</div><div class="isrow">${s}</div><div class="isrow armor">${ar}</div></div>`;
  }
  chest(chest, me) {
    const cells = Array.from({ length: 12 }, (_, i) => { const it = chest.items[i]; return `<div class="is ${it ? 'has' : ''}" ${it ? `data-act="take" data-i="${i}"` : ''} title="${it ? esc(ITEMS[it.id].name) : ''}">${it ? `<img class="pix" src="${icon(it.id)}"><b>${it.count > 1 ? it.count : ''}</b>` : ''}</div>`; }).join('');
    this.openPanel(`<div class="box"><div class="head"><h2>${t('chest')}</h2><button class="x" data-act="closePanel">✕</button></div>
      <div class="grid c12">${cells}</div>
      <button class="btn green small" data-act="takeAll" ${chest.items.length ? '' : 'disabled'}>${t('takeAll')}</button>
      ${this.invRow(me)}</div>`, 'chest');
  }
  shop(me, mode) {
    const cur = (id, n) => `<span class="cost ${me.inv.count(id) >= n ? '' : 'no'}"><img src="${icon(id)}">${n}</span>`;
    const offers = SHOP.filter((o) => o.cat === this.shopCat).map((o) => {
      const gid = o.give[0][0] === 'wool' ? TEAM_COLORS[me.team].wool : o.give[0][0];
      const name = OFFER_NAME[o.id] ? t(OFFER_NAME[o.id]) : ITEMS[gid].name;
      const n = o.give[0][1];
      const can = me.inv.count(o.cost[0]) >= o.cost[1];
      return `<button class="offer ${can ? '' : 'cant'}" data-act="buy" data-id="${o.id}"><img class="pix" src="${icon(gid)}"><span class="nm">${esc(name)}${n > 1 && o.cat !== 'armor' ? ` ×${n}` : ''}</span>${cur(o.cost[0], o.cost[1])}</button>`;
    }).join('');
    this.openPanel(`<div class="box wide"><div class="head"><h2>${t('shop')}</h2><div class="wallet">${cur(170, 0)}${cur(171, 0)}${cur(172, 0)}</div><button class="x" data-act="closePanel">✕</button></div>
      <div class="tabs">${CATS.map(([c, k]) => `<button class="${c === this.shopCat ? 'on' : ''}" data-act="shopCat" data-c="${c}">${t(k)}</button>`).join('')}</div>
      <div class="offers">${offers}</div>${this.invRow(me)}</div>`, 'shop');
    this.panelEl.querySelectorAll('.wallet .cost').forEach((el, i) => { el.lastChild.textContent = me.inv.count(170 + i); el.classList.remove('no'); });
  }
}
