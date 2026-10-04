// Pan and zoom for a photo. Every game page uses this.
//
//   const view = Zoom.attach(stage, { width: 2000, height: 1333, dblclick: true, onChange() {} });
//   view.focusOn(x, y, zoom) glides to a photo point; view.setImage(src, full, fullWidth, alt, w, h) swaps the photo.
//
// `stage` holds one <img> and sits inside a .stage-slot that keeps its place in the page.
// width / height are the size of the photo in pixels: they only set the shape and the coordinate system.
// Ways to zoom: the + / - buttons, pinch, Ctrl + scroll (or a trackpad pinch), double-click, and the
// keyboard. Ways to move: drag, or arrow keys. The full-screen button gives the photo the whole window.
(() => {
  'use strict';

  const STEP = 1.6;            // zoom factor for the + and - buttons
  const MAX_NATIVE = 2.5;      // zoom in to 2.5x the photo's real pixels, and no further
  const DRAG_PX = 6;           // movement that counts as a drag rather than a tap
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ICON_FULL = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>';

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function attach(stage, opts) {
    let W = opts.width, H = opts.height;
    const img = stage.querySelector('img');
    const slot = stage.parentNode;
    const hudHost = stage.closest('.frame') && stage.closest('.frame').querySelector('.hud');

    // View state. s is the zoom (1 = photo fits the stage). fx and fy are how far the zoomed photo is
    // shifted, as fractions of the fitted photo size, so the view survives a window resize.
    let s = 1, fx = 0, fy = 0;
    let boxW = 0, boxH = 0, fitW = 0, fitH = 0, offX = 0, offY = 0;
    let expanded = false, moved = false, raf = 0, tween = 0, tweenTarget = null, startX = 0, startY = 0, pinch = null, inerted = [];
    const pointers = new Map();

    img.draggable = false;

    // ---------- controls ----------
    const ctl = document.createElement('div');
    ctl.className = 'zoom-ctl';
    ctl.setAttribute('role', 'group');
    ctl.setAttribute('aria-label', 'Zoom controls');
    ctl.innerHTML =
      '<button type="button" data-z="in" aria-label="Zoom in" title="Zoom in">+</button>' +
      '<button type="button" data-z="out" aria-label="Zoom out" title="Zoom out">&minus;</button>' +
      '<button type="button" data-z="reset" aria-label="Reset zoom" title="Reset zoom"><span class="zr">1&times;</span></button>' +
      '<button type="button" data-z="full" aria-label="Full screen" title="Full screen">' + ICON_FULL + '</button>';
    (hudHost || stage).appendChild(ctl);
    const readout = ctl.querySelector('.zr');
    const fullBtn = ctl.querySelector('[data-z="full"]');

    // Button names follow the page language (I18N is optional: the English above is the fallback).
    const tr = (key, fallback) => (window.I18N ? I18N.t(key) : fallback);
    function relabel() {
      const set = (btn, key, fallback) => { const s = tr(key, fallback); btn.setAttribute('aria-label', s); btn.title = s; };
      ctl.setAttribute('aria-label', tr('zoom.group', 'Zoom controls'));
      set(ctl.querySelector('[data-z="in"]'), 'zoom.in', 'Zoom in');
      set(ctl.querySelector('[data-z="out"]'), 'zoom.out', 'Zoom out');
      set(ctl.querySelector('[data-z="reset"]'), 'zoom.reset', 'Reset zoom');
      set(fullBtn, expanded ? 'zoom.close' : 'zoom.full', expanded ? 'Close full screen' : 'Full screen');
    }
    relabel();
    if (window.I18N) I18N.onChange(relabel);

    const hud = document.createElement('div');   // game scripts can put text here; it shows in full screen
    hud.className = 'zoom-hud';
    stage.appendChild(hud);

    // ---------- sharper version on demand ----------
    // Give the <img> data-full="images/big.jpg" data-full-width="4000" and that larger file is fetched
    // the first time someone zooms in, so the page itself stays quick to open.
    let fullSrc = img.dataset.full || '';
    let fullWidth = Number(img.dataset.fullWidth) || 0;
    let fullState = fullSrc ? 'idle' : 'none';
    function loadFull() {
      if (fullState !== 'idle') return;
      fullState = 'loading';
      const big = new Image(), want = fullSrc;
      const swap = () => { if (fullState === 'loading' && fullSrc === want) { img.src = want; fullState = 'done'; } };
      // decode() first avoids a flash; it can stall in a background tab, so swap anyway after a moment
      big.onload = () => { if (big.decode) { big.decode().then(swap, swap); setTimeout(swap, 1500); } else swap(); };
      big.onerror = () => { fullState = 'failed'; };
      big.src = fullSrc;
    }

    // ---------- geometry ----------
    const nativeWidth = () => fullWidth || img.naturalWidth || W;
    const maxScale = () => Math.min(12, Math.max(2, MAX_NATIVE * nativeWidth() / (fitW || W)));

    function measure() {
      boxW = stage.clientWidth;
      boxH = stage.clientHeight;
      const k = Math.min(boxW / W, boxH / H);
      fitW = W * k; fitH = H * k;
      offX = (boxW - fitW) / 2; offY = (boxH - fitH) / 2;
    }
    function clampPan() { fx = clamp(fx, 1 - s, 0); fy = clamp(fy, 1 - s, 0); }

    function apply() {
      raf = 0;
      if (!fitW) return;
      img.style.left = offX + 'px';
      img.style.top = offY + 'px';
      img.style.width = fitW + 'px';
      img.style.height = fitH + 'px';
      img.style.transform = 'translate(' + (fx * fitW) + 'px,' + (fy * fitH) + 'px) scale(' + s + ')';
      readout.textContent = (Math.round(s * 10) / 10) + '×';
      stage.classList.toggle('is-zoomed', s > 1.001);
      if (s > 1.15) loadFull();
      if (opts.onChange) opts.onChange();
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };

    // photo pixel -> position inside the stage
    function toScreen(ix, iy) {
      return { x: offX + fx * fitW + ix / W * fitW * s, y: offY + fy * fitH + iy / H * fitH * s };
    }
    // screen position -> photo pixel
    function toImage(clientX, clientY) {
      const r = stage.getBoundingClientRect();
      const px = clientX - r.left, py = clientY - r.top;
      const x = (px - offX - fx * fitW) / (fitW * s) * W;
      const y = (py - offY - fy * fitH) / (fitH * s) * H;
      return { x, y, px, py, scale: fitW * s / W, inside: x >= 0 && x <= W && y >= 0 && y <= H };
    }

    // Zoom to `ns`, keeping the photo point under stage position (cx, cy) where it is.
    function zoomTo(ns, cx, cy) {
      ns = clamp(ns, 1, maxScale());
      const ux = (cx - offX - fx * fitW) / (fitW * s);
      const uy = (cy - offY - fy * fitH) / (fitH * s);
      s = ns;
      fx = (cx - offX) / fitW - ux * s;
      fy = (cy - offY) / fitH - uy * s;
      clampPan();
      apply();
    }
    function zoomAnimated(target, cx, cy) {
      target = clamp(target, 1, maxScale());
      cancelAnimationFrame(tween);
      tweenTarget = null;
      if (reduceMotion || Math.abs(target - s) < 0.01) { zoomTo(target, cx, cy); return; }
      const from = s, t0 = performance.now();
      tweenTarget = target;
      const step = now => {
        const t = Math.min(1, (now - t0) / 180), e = 1 - Math.pow(1 - t, 3);
        zoomTo(from + (target - from) * e, cx, cy);
        if (t < 1) tween = requestAnimationFrame(step); else tweenTarget = null;
      };
      tween = requestAnimationFrame(step);
    }
    const goal = () => tweenTarget === null ? s : tweenTarget;   // where the zoom is heading, so quick clicks add up
    const centre = () => ({ x: boxW / 2, y: boxH / 2 });

    // Glide to zoom `ns` with photo point (ix, iy) in the middle, to lead the eye to a detail.
    function focusOn(ix, iy, ns) {
      cancelAnimationFrame(tween);
      tweenTarget = null;
      ns = clamp(ns, 1, maxScale());
      const tx = clamp((boxW / 2 - offX) / fitW - ix / W * ns, 1 - ns, 0);
      const ty = clamp((boxH / 2 - offY) / fitH - iy / H * ns, 1 - ns, 0);
      if (reduceMotion || !fitW) { s = ns; fx = tx; fy = ty; apply(); return; }
      const s0 = s, x0 = fx, y0 = fy, t0 = performance.now();
      const step = now => {
        const t = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - t, 3);
        s = s0 + (ns - s0) * e; fx = x0 + (tx - x0) * e; fy = y0 + (ty - y0) * e;
        apply();
        if (t < 1) tween = requestAnimationFrame(step);
      };
      tween = requestAnimationFrame(step);
    }

    // Show a different photo in this stage (frames with two photos, the gallery viewer).
    // w / h: the new photo's size, if it is not the same shape as the last one.
    function setImage(src, full, width, alt, w, h) {
      cancelAnimationFrame(tween);
      tweenTarget = null;
      if (w && h) { W = w; H = h; }
      img.src = src;
      if (alt != null) img.alt = alt;
      fullSrc = full || '';
      fullWidth = Number(width) || 0;
      fullState = fullSrc ? 'idle' : 'none';
      s = 1; fx = 0; fy = 0;
      measure();
      apply();
    }

    // ---------- buttons ----------
    ctl.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const c = centre();
      if (b.dataset.z === 'in') zoomAnimated(goal() * STEP, c.x, c.y);
      else if (b.dataset.z === 'out') zoomAnimated(goal() / STEP, c.x, c.y);
      else if (b.dataset.z === 'reset') zoomAnimated(1, c.x, c.y);
      else setExpanded(!expanded);
    });

    // ---------- full screen ----------
    function setExpanded(on) {
      if (on === expanded) return;
      expanded = on;
      cancelAnimationFrame(tween);
      if (on) {
        document.body.appendChild(stage);
        stage.appendChild(ctl);
        stage.classList.add('is-expanded');
        document.documentElement.classList.add('zoom-lock');
        inerted = Array.from(document.body.children).filter(n => n !== stage && !n.inert);
        inerted.forEach(n => { n.inert = true; });
      } else {
        slot.appendChild(stage);
        (hudHost || stage).appendChild(ctl);
        stage.classList.remove('is-expanded');
        document.documentElement.classList.remove('zoom-lock');
        inerted.forEach(n => { n.inert = false; });
        inerted = [];
      }
      fullBtn.innerHTML = on ? ICON_CLOSE : ICON_FULL;
      relabel();
      s = 1; fx = 0; fy = 0;
      measure();
      apply();
      fullBtn.focus();
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && expanded) setExpanded(false); });

    // ---------- pointer: drag to move, two fingers to pinch ----------
    const ignore = t => t.closest && t.closest('.zoom-ctl, .zoom-hud');

    function pinchNow() {
      const [a, b] = Array.from(pointers.values());
      return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
    function startPinch() {
      const p = pinchNow(), r = stage.getBoundingClientRect();
      pinch = {
        d0: p.d, s0: s,
        ux: (p.mx - r.left - offX - fx * fitW) / (fitW * s),
        uy: (p.my - r.top - offY - fy * fitH) / (fitH * s)
      };
    }

    stage.addEventListener('pointerdown', e => {
      if (ignore(e.target) || (e.pointerType === 'mouse' && e.button !== 0)) return;
      cancelAnimationFrame(tween);
      tweenTarget = null;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or finished pointer */ }
      if (pointers.size === 1) { moved = false; startX = e.clientX; startY = e.clientY; }
      else if (pointers.size === 2) { moved = true; startPinch(); }
    });
    stage.addEventListener('pointermove', e => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (pointers.size === 1) {
        if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_PX) moved = true;
        if (moved && s > 1.001) {
          fx += dx / fitW; fy += dy / fitH;
          clampPan();
          stage.classList.add('is-dragging');
          schedule();
        }
      } else if (pointers.size === 2 && pinch) {
        const p2 = pinchNow(), r = stage.getBoundingClientRect();
        s = clamp(pinch.s0 * p2.d / pinch.d0, 1, maxScale());
        fx = (p2.mx - r.left - offX) / fitW - pinch.ux * s;
        fy = (p2.my - r.top - offY) / fitH - pinch.uy * s;
        clampPan();
        schedule();
      }
    });
    function release(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) stage.classList.remove('is-dragging');
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);

    // Two fingers must not scroll the page, and neither should one finger while zoomed in.
    stage.addEventListener('touchmove', e => {
      if (e.touches.length > 1 || s > 1.001 || expanded) e.preventDefault();
    }, { passive: false });

    // ---------- wheel, double-click, keyboard ----------
    stage.addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey || expanded)) return;      // an ordinary scroll still scrolls the page
      e.preventDefault();
      cancelAnimationFrame(tween);
      tweenTarget = null;
      const r = stage.getBoundingClientRect();
      const dy = clamp(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, -25, 25);
      zoomTo(s * Math.exp(-dy * 0.009), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    if (opts.dblclick) {
      stage.addEventListener('dblclick', e => {
        if (ignore(e.target)) return;
        const r = stage.getBoundingClientRect();
        zoomAnimated(s > 1.05 ? 1 : 2.5, e.clientX - r.left, e.clientY - r.top);
      });
    }

    stage.addEventListener('keydown', e => {
      if (e.target !== stage) return;
      const c = centre();
      const nudge = (dx, dy) => { if (s > 1.001) { fx += dx; fy += dy; clampPan(); apply(); return true; } return false; };
      let handled = true;
      switch (e.key) {
        case '+': case '=': zoomAnimated(goal() * STEP, c.x, c.y); break;
        case '-': case '_': zoomAnimated(goal() / STEP, c.x, c.y); break;
        case '0': zoomAnimated(1, c.x, c.y); break;
        case 'ArrowLeft': handled = nudge(0.1, 0); break;
        case 'ArrowRight': handled = nudge(-0.1, 0); break;
        case 'ArrowUp': handled = nudge(0, 0.1); break;
        case 'ArrowDown': handled = nudge(0, -0.1); break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    });

    // ---------- start ----------
    if (window.ResizeObserver) new ResizeObserver(() => { measure(); apply(); }).observe(stage);
    window.addEventListener('resize', () => { measure(); apply(); });
    measure();
    apply();

    return {
      hud, toScreen, toImage,
      get scale() { return s; },
      unit: () => fitW * s / W,
      size: () => ({ w: boxW, h: boxH }),
      wasDrag: () => moved,
      reset: () => zoomTo(1, 0, 0),
      layout: apply,
      focusOn, setImage
    };
  }

  window.Zoom = { attach };
})();
