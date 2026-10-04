(() => {
  'use strict';

  const W = 2000, H = 1333;          // size of the photo in pixels
  const MIN_TARGET_PX = 36;          // smallest tap target on screen
  const SLOP_PX = 8;                 // extra forgiveness around every target

  // Every wildebeest in the photo, in photo pixels: rect = [x, y, width, height].
  // parts = several areas that all count as the same animal; ring = the circle drawn round it (defaults to the rect).
  // msg = a special line when it is found. To fix a position or add one, edit this list.
  const WILDEBEEST = [
    { id: 'left', rect: [1075, 1110, 250, 223] },                            // wading, bottom right group, left
    { id: 'behind', rect: [1385, 1150, 125, 100] },                          // head and horns behind the middle one
    { id: 'middle', rect: [1325, 1218, 300, 115] },                          // wading, front middle
    { id: 'right', rect: [1700, 1232, 290, 101] },                           // wading, far right
    { id: 'croc', parts: [[945, 597, 105, 72], [815, 628, 75, 45]],          // the leg above the water, and the crocodile's jaws
      ring: [815, 590, 240, 88], msg: 'croc' },
    { id: 'bank', rect: [1540, 35, 330, 115], msg: 'bank' }                  // hurt, lying on the far bank
  ];
  WILDEBEEST.forEach(w => {
    if (!w.parts) w.parts = [w.rect];
    if (!w.ring) w.ring = w.rect;
  });

  const $ = id => document.getElementById(id);
  const T = (key, vars) => I18N.t(key, vars);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = $('stage'), marksEl = $('marks'), statusEl = $('status'), countEl = $('count');
  const doneBtn = $('doneBtn'), revealEl = $('reveal');

  const order = [];                  // the wildebeest in the order they were circled
  const rings = [];                  // { el, box }
  let finished = false;
  let lastMsg = { key: 'start', n: 0 };

  // ---------- zoom ----------
  let view = null;
  view = Zoom.attach(stage, { width: W, height: H, onChange: layout });
  const hudText = document.createElement('span');
  const hudDone = document.createElement('button');
  hudDone.type = 'button';
  hudDone.className = 'btn';
  view.hud.append(hudText, hudDone);

  function layout() {
    if (!view) return;
    const u = view.unit();
    rings.forEach(r => {
      const [x, y, w, h] = r.box;
      const c = view.toScreen(x + w / 2, y + h / 2);
      r.el.style.left = c.x + 'px';
      r.el.style.top = c.y + 'px';
      r.el.style.width = w * u * 1.12 + 'px';            // a little room round the animal
      r.el.style.height = h * u * 1.12 + 'px';
    });
  }
  function addRing(w, n, st) {
    const el = document.createElement('div');
    el.className = 'ring new';
    el.dataset.state = st;
    el.innerHTML = '<b>' + n + '</b>';
    marksEl.appendChild(el);
    rings.push({ el, box: w.ring });
    layout();
  }

  // ---------- hit test: the smallest matching target wins ----------
  function hitAt(x, y, scale) {
    const minSide = MIN_TARGET_PX / scale, slop = SLOP_PX / scale;
    let best = null;
    WILDEBEEST.forEach(w => w.parts.forEach(([bx, by, bw, bh]) => {
      const ww = Math.max(bw, minSide), hh = Math.max(bh, minSide);
      const dx = Math.max(Math.abs(x - (bx + bw / 2)) - ww / 2, 0);
      const dy = Math.max(Math.abs(y - (by + bh / 2)) - hh / 2, 0);
      if (Math.hypot(dx, dy) <= slop) {
        const area = bw * bh;
        if (!best || area < best.area) best = { w, area };
      }
    }));
    return best && best.w;
  }

  // ---------- messages ----------
  function renderStatus() {
    const text = T('cross.msg.' + lastMsg.key, { n: lastMsg.n });
    statusEl.textContent = text;
    hudText.textContent = order.length + ' · ' + text;
    hudDone.textContent = T('cross.done');
    hudDone.hidden = finished;
    countEl.textContent = order.length;
  }
  function say(key, n) { lastMsg = { key, n: n || 0 }; renderStatus(); }

  stage.addEventListener('click', e => {
    if (finished || e.target.closest('.zoom-ctl, .zoom-hud') || view.wasDrag()) return;   // a drag is not a tap
    const p = view.toImage(e.clientX, e.clientY);
    if (!p.inside) return;
    const w = hitAt(p.x, p.y, p.scale);
    if (!w) {
      const el = document.createElement('div');
      el.className = 'miss';
      el.style.left = p.px + 'px';
      el.style.top = p.py + 'px';
      marksEl.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
      say('miss');
    } else if (order.includes(w)) {
      say('already');
    } else {
      order.push(w);
      addRing(w, order.length, 'found');
      say(w.msg || 'found', order.length);
    }
  });

  // ---------- the answer ----------
  function renderResult() {
    if (!finished) return;
    const total = WILDEBEEST.length, f = order.length;
    $('resultTitle').textContent = f === total ? T('cross.res.all', { total }) : T('cross.res.some', { f, total });
    $('resultText').textContent = T('cross.res.text', { total });
  }
  function finish() {
    if (finished) return;
    if (document.querySelector('.zoomable.is-expanded')) document.querySelector('[data-z="full"]').click();   // leave full screen
    finished = true;
    let n = order.length;
    WILDEBEEST.filter(w => !order.includes(w)).forEach(w => addRing(w, ++n, 'missed'));
    view.reset();
    doneBtn.disabled = true;
    revealEl.hidden = false;
    say('finished');
    renderResult();
    revealEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }
  doneBtn.addEventListener('click', finish);
  hudDone.addEventListener('click', finish);

  function reset() {
    finished = false;
    order.length = 0;
    rings.splice(0).forEach(r => r.el.remove());
    doneBtn.disabled = false;
    revealEl.hidden = true;
    say('start');
  }
  $('resetBtn').addEventListener('click', reset);
  $('againBtn').addEventListener('click', () => { reset(); view.reset(); stage.scrollIntoView({ block: 'start' }); });

  reset();
  I18N.onChange(() => { renderStatus(); renderResult(); });
})();
