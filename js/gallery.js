(() => {
  'use strict';

  // The photos and their captions come from js/gallery-data.js (made by work/make-gallery.ps1).
  const PHOTOS = window.GALLERY || [];
  const GROUPS = ['cats', 'animals', 'birds', 'views', 'places'];   // order of the filter buttons; empty groups are left out

  const $ = id => document.getElementById(id);
  const T = (key, vars) => I18N.t(key, vars);
  const title = p => (I18N.lang === 'zh' && p.zh) || p.en;
  const note = p => (I18N.lang === 'zh' && p.zhNote) || p.note || '';
  const big = p => 'images/gallery/' + p.id + '.jpg';
  const thumb = p => 'images/gallery/t/' + p.id + '.jpg';

  const grid = $('gallery'), chips = $('chips'), countEl = $('galCount');
  let filter = 'all', shown = PHOTOS.slice();

  const viewer = Viewer.attach({
    items: () => shown, src: big, size: p => [p.w, p.h], title, note, hash: p => p.id,
    shot: p => p.shot ? [p.shot.s, 'f/' + p.shot.f, 'ISO ' + p.shot.iso, p.shot.mm + ' mm'].join('  ·  ') : ''
  });

  // ---------- the grid ----------
  const items = PHOTOS.map(p => {
    const li = document.createElement('li');
    li.className = 'g-item';
    li.style.setProperty('--ar', (p.w / p.h).toFixed(4));
    const btn = document.createElement('button');
    btn.type = 'button';
    const img = new Image();
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';
    img.width = Math.round(480 * p.w / p.h);
    img.height = 480;
    img.src = thumb(p);
    const cap = document.createElement('span');
    cap.className = 'g-cap';
    cap.setAttribute('aria-hidden', 'true');
    btn.append(img, cap);
    btn.addEventListener('click', () => viewer.open(p));
    li.appendChild(btn);
    grid.appendChild(li);
    return { p, li, btn, cap };
  });

  function renderGrid() {
    shown = PHOTOS.filter(p => filter === 'all' || p.cat === filter);
    items.forEach(it => {
      it.li.hidden = !shown.includes(it.p);
      it.cap.textContent = title(it.p);
      it.btn.setAttribute('aria-label', T('gal.open', { title: title(it.p) }));
    });
    countEl.textContent = T(shown.length === 1 ? 'gal.count.one' : 'gal.count.many', { n: shown.length });
  }

  function renderChips() {
    const focused = chips.contains(document.activeElement);
    chips.textContent = '';
    ['all'].concat(GROUPS.filter(g => PHOTOS.some(p => p.cat === g))).forEach(g => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(filter === g));
      b.innerHTML = '<span></span><span class="n"></span>';
      b.firstChild.textContent = T('gal.f.' + g);
      b.lastChild.textContent = g === 'all' ? PHOTOS.length : PHOTOS.filter(p => p.cat === g).length;
      b.addEventListener('click', () => { filter = g; renderChips(); renderGrid(); });
      chips.appendChild(b);
      if (focused && filter === g) setTimeout(() => b.focus(), 0);    // keep keyboard focus on the chosen filter
    });
  }

  renderChips();
  renderGrid();

  // A link to one photo (gallery.html#honeymoon-lions) opens it straight away, also when only the # part changes.
  function openFromLink() {
    const p = PHOTOS.find(q => '#' + q.id === location.hash);
    if (!p) return;
    if (!shown.includes(p)) { filter = 'all'; renderChips(); renderGrid(); }
    if (viewer.isOpen) viewer.show(p); else viewer.open(p);
  }
  openFromLink();
  window.addEventListener('hashchange', openFromLink);

  I18N.onChange(() => { renderChips(); renderGrid(); });
})();
