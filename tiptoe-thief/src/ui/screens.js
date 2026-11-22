// Full-screen menus: title, heist map, gear shop, settings, pause, results,
// and the one-time "how to play" card. Buttons carry data-act="..." and are
// handled by App.act() in src/main.js.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const GEAR = [
  { id: 'sneakers', price: 60 },
  { id: 'pouch', price: 90 },
  { id: 'pick', price: 140 },
  { id: 'outfit', price: 200 },
];

export class Screens {
  constructor(root, app) { this.root = root; this.app = app; this.t = app.t; }

  show(html, cls = '') { this.root.className = 'screen on ' + cls; this.root.innerHTML = html; this.cur = cls; }
  hide() { this.root.className = 'screen'; this.root.innerHTML = ''; this.cur = null; }
  stars(n, max = 3) { let s = ''; for (let i = 0; i < max; i++) s += `<i class="${i < n ? 'on' : ''}">★</i>`; return `<span class="stars">${s}</span>`; }

  title() {
    const t = this.t;
    this.show(`<div class="title">
      <h1><span>TIPTOE</span><span>THIEF</span></h1>
      <p class="sub">${esc(t('tapToStart'))}</p>
      <button class="big" data-act="levels">${esc(t('play'))}</button>
      <div class="row"><button data-act="shop">${esc(t('shop'))}</button><button data-act="settings">${esc(t('settings'))}</button></div>
      <p class="coins">◎ ${this.app.save.data.coins}</p></div>`, 'title-screen');
  }

  levels(levels) {
    const t = this.t, s = this.app.save;
    let unlocked = true, area = '', html = '';
    levels.forEach((L, i) => {
      if (L.area !== area) { if (area) html += '</div>'; area = L.area; html += `<h3>${esc(t('area_' + area))}</h3><div class="lv-grid">`; }
      const st = s.stars(L.id);
      html += `<button class="lv ${unlocked ? '' : 'locked'}" data-act="start" data-i="${i}" ${unlocked ? '' : 'disabled'} title="${unlocked ? '' : esc(t('lockedLevel'))}">
        <b>${i + 1}</b><span>${esc(L.name)}</span>${this.stars(st)}</button>`;
      unlocked = unlocked && st > 0;
    });
    html += '</div>';
    this.show(`<div class="panel wide"><div class="head"><button data-act="title" class="back">‹ ${esc(t('back'))}</button><h2>${esc(t('levels'))}</h2><span class="coins">◎ ${s.data.coins} · ★ ${s.totalStars()}</span></div><div class="scroll">${html}</div></div>`, 'levels');
  }

  shop() {
    const t = this.t, s = this.app.save;
    const items = GEAR.map((g) => {
      const own = s.has(g.id), can = s.data.coins >= g.price;
      return `<div class="gear"><div class="g-ico g-${g.id}"></div><div><b>${esc(t('gear_' + g.id))}</b><p>${esc(t('gear_' + g.id + '_d'))}</p></div>
        ${own ? `<span class="owned">${esc(t('owned'))}</span>` : `<button data-act="buy" data-id="${g.id}" ${can ? '' : 'disabled'}>${esc(t('buy', { n: '◎ ' + g.price }))}</button>`}</div>`;
    }).join('');
    this.show(`<div class="panel"><div class="head"><button data-act="title" class="back">‹ ${esc(t('back'))}</button><h2>${esc(t('shop'))}</h2><span class="coins">◎ ${s.data.coins}</span></div><div class="scroll">${items}</div></div>`, 'shop');
  }

  settings() {
    const t = this.t, st = this.app.save.data.settings;
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, label]) => `<button data-act="set" data-k="${key}" data-v="${v}" class="${String(st[key]) === String(v) ? 'on' : ''}">${esc(label)}</button>`).join('')}</div>`;
    this.show(`<div class="panel"><div class="head"><button data-act="${this.app.game.state === 'paused' ? 'pause' : 'title'}" class="back">‹ ${esc(t('back'))}</button><h2>${esc(t('settings'))}</h2></div>
      <label>${esc(t('volume'))}</label>${seg('volume', [[0, '0%'], [0.4, '40%'], [0.8, '80%'], [1, '100%']])}
      <label>${esc(t('music'))}</label>${seg('music', [[0, '0%'], [0.25, '25%'], [0.45, '45%'], [0.7, '70%']])}
      <label>${esc(t('quality'))}</label>${seg('quality', [['auto', 'Auto'], ['low', t('q_low')], ['med', t('q_med')], ['high', t('q_high')]])}</div>`, 'settings');
  }

  pause() {
    const t = this.t;
    this.show(`<div class="panel small"><h2>${esc(t('paused'))}</h2>
      <button class="big" data-act="resume">${esc(t('resume'))}</button>
      <button data-act="settings">${esc(t('settings'))}</button>
      <button data-act="retry">${esc(t('retry'))}</button>
      <button data-act="levels">${esc(t('quit'))}</button></div>`, 'pause');
  }

  how() {
    const t = this.t;
    this.show(`<div class="panel small how"><h2>${esc(t('howTitle'))}</h2>
      <ol><li>${esc(t('how1'))}</li><li>${esc(t('how2'))}</li><li>${esc(t('how3'))}</li><li>${esc(t('how4'))}</li></ol>
      <button class="big" data-act="howOk">${esc(t('ok'))}</button></div>`, 'how');
  }

  results(r) {
    const t = this.t;
    if (!r.won) {
      this.show(`<div class="panel small result lose"><h2>${esc(t('caught'))}</h2><p>${esc(t('caughtSub'))}</p>
        <button class="big" data-act="retry">${esc(t('retry'))}</button><button data-act="levels">${esc(t('menu'))}</button></div>`, 'result');
      return;
    }
    const line = (ok, key) => `<li class="${ok ? 'ok' : ''}">${ok ? '★' : '☆'} ${esc(t(key))}</li>`;
    // two groups - what you got, and what to do next - so short screens can show them side by side
    this.show(`<div class="panel small result win"><h2>${esc(t('escaped'))}</h2>
      <div class="r-info">${this.stars(r.stars)}
        <ul>${line(true, 'starEscape')}${line(r.allLoot, 'starAll')}${line(r.unseen, 'starUnseen')}</ul>
        <p class="sum">${esc(t('loot'))}: $${r.cash} · ${esc(t('coins'))}: <b class="earned">+◎ ${r.earned}</b></p></div>
      <div class="r-act">${r.canDouble ? `<button data-act="double">${esc(t('doubleCoins'))}</button>` : ''}
        ${r.hasNext ? `<button class="big" data-act="next">${esc(t('next'))}</button>` : ''}
        <div class="row"><button data-act="retry">${esc(t('retry'))}</button><button data-act="levels">${esc(t('menu'))}</button></div></div></div>`, 'result');
  }
}
