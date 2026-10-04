// A full-screen photo viewer, shared by the Gallery and Our Story. It builds its own markup.
//
//   const viewer = Viewer.attach({
//     items: () => list,              // the photos to step through, in order
//     src: p => url, size: p => [w, h], title: p => text,
//     note: p => text, shot: p => text, hash: p => id    // optional
//   });
//   viewer.open(photo); viewer.show(photo); viewer.isOpen
//
// Zoom with the buttons, pinch or double-click. Left / right (keys, buttons or a swipe) change the photo
// when it is not zoomed in. Escape or the close button closes it.
(() => {
  'use strict';

  const T = (key, vars) => I18N.t(key, vars);
  const ICON_CLOSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>';
  const ICON_PREV = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>';
  const ICON_NEXT = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>';

  function attach(o) {
    const lb = document.createElement('div');
    lb.className = 'lightbox frame';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.hidden = true;
    lb.innerHTML =
      '<div class="lb-bar"><p class="lb-count" aria-live="polite"></p><div class="hud"></div>' +
      '<button class="lb-close" type="button">' + ICON_CLOSE + '</button></div>' +
      '<div class="lb-main"><div class="stage-slot lb-slot"><div class="vf zoomable" tabindex="0" role="group"><img alt=""></div></div>' +
      '<button class="lb-nav prev" type="button">' + ICON_PREV + '</button><button class="lb-nav next" type="button">' + ICON_NEXT + '</button></div>' +
      '<div class="lb-cap"><h2 class="lb-title"></h2><p class="lb-note"></p><p class="lb-shot"></p></div>';
    document.body.appendChild(lb);
    const q = s => lb.querySelector(s);
    const stage = q('.zoomable'), countEl = q('.lb-count'), titleEl = q('.lb-title'), noteEl = q('.lb-note'), shotEl = q('.lb-shot');
    const closeBtn = q('.lb-close'), prevBtn = q('.prev'), nextBtn = q('.next');
    const view = Zoom.attach(stage, { width: 2000, height: 1333, dblclick: true });

    let list = [], current = -1, lastFocus = null, inerted = [];

    function labels() {
      lb.setAttribute('aria-label', T('lb.aria'));
      [[closeBtn, 'lb.close'], [prevBtn, 'lb.prev'], [nextBtn, 'lb.next']].forEach(([b, k]) => { b.setAttribute('aria-label', T(k)); b.title = T(k); });
      stage.setAttribute('aria-label', T('zoom.stage'));
    }
    function render() {
      if (current < 0) return;
      const p = list[current];
      titleEl.textContent = o.title(p);
      titleEl.hidden = !titleEl.textContent;       // a photo can have no caption
      const n = o.note ? o.note(p) : '';
      noteEl.textContent = n;
      noteEl.hidden = !n;
      const s = o.shot ? o.shot(p) : '';
      shotEl.textContent = s;
      shotEl.hidden = !s;
      countEl.textContent = T('lb.count', { i: current + 1, n: list.length });
      stage.querySelector('img').alt = o.title(p);
      prevBtn.hidden = nextBtn.hidden = list.length < 2;
    }
    function show(i) {
      if (!list.length) return;
      current = (i + list.length) % list.length;
      const p = list[current], [w, h] = o.size(p);
      view.setImage(o.src(p), '', 0, o.title(p), w, h);
      render();
      if (o.hash) { try { history.replaceState(null, '', '#' + o.hash(p)); } catch (e) { /* some previews forbid it */ } }
      if (list.length > 1) [current + 1, current - 1].forEach(k => { new Image().src = o.src(list[(k + list.length) % list.length]); });
    }
    function open(p) {
      list = o.items();
      lastFocus = document.activeElement;
      lb.hidden = false;
      document.documentElement.classList.add('zoom-lock');
      inerted = Array.from(document.body.children).filter(n => n !== lb && !n.inert);
      inerted.forEach(n => { n.inert = true; });
      show(Math.max(0, list.indexOf(p)));
      closeBtn.focus();
    }
    function close() {
      if (lb.hidden) return;
      lb.hidden = true;
      current = -1;
      document.documentElement.classList.remove('zoom-lock');
      inerted.forEach(n => { n.inert = false; });
      inerted = [];
      if (o.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } }
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', () => show(current - 1));
    nextBtn.addEventListener('click', () => show(current + 1));
    document.addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && view.scale <= 1.01 && !e.defaultPrevented) {
        e.preventDefault();
        show(current + (e.key === 'ArrowRight' ? 1 : -1));
      }
    });
    let sx = 0, sy = 0, startScale = 1;
    stage.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; startScale = view.scale; });
    stage.addEventListener('pointerup', e => {
      if (startScale > 1.01 || view.scale > 1.01) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
    });

    labels();
    I18N.onChange(() => { labels(); render(); });
    return {
      open, close,
      show(p) { list = o.items(); show(Math.max(0, list.indexOf(p))); },
      get isOpen() { return !lb.hidden; }
    };
  }

  window.Viewer = { attach };
})();
