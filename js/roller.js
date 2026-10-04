(() => {
  'use strict';

  const W = 2000, H = 1333;          // size of the photo in pixels
  const BIRD = [1047, 784];          // the middle of the bird, in photo pixels
  const BIRD_ZOOM = 2.2;             // zoom that fills the picture with the bird
  const TOL_PX = 10;                 // a tap this close to a colour (on screen) still counts

  // The eight colours. n = the colour's number in roller-map.js (which says which colour every pixel of the bird is),
  // sw = the swatch shown in the list, pin = a point well inside the colour's biggest patch (photo pixels),
  // used when the game shows you where a colour is.
  const COLOURS = [
    { id: 'lilac', n: 1, sw: '#9c70a8', pin: [949, 608] },
    { id: 'turquoise', n: 2, sw: '#2fa4b6', pin: [982, 746] },
    { id: 'royal', n: 3, sw: '#2f5fd2', pin: [1067, 731] },
    { id: 'dark', n: 4, sw: '#1f2f7c', pin: [991, 674] },
    { id: 'green', n: 5, sw: '#8dbf9f', pin: [932, 525] },
    { id: 'brown', n: 6, sw: '#8c6f50', pin: [1030, 671] },
    { id: 'white', n: 7, sw: '#efefea', pin: [923, 541] },
    { id: 'black', n: 8, sw: '#161616', pin: [1131, 834] }
  ];
  const byN = {};
  COLOURS.forEach(c => { byN[c.n] = c; });

  // ---------- the colour map ----------
  const MAP = window.ROLLER_MAP;
  const labels = new Uint8Array(MAP.w * MAP.h);
  MAP.rows.forEach((row, y) => {
    let x = 0;
    row.replace(/([a-i])(\d+)/g, (m, ch, n) => {
      const L = ch.charCodeAt(0) - 97, len = Number(n);
      if (L) labels.fill(L, y * MAP.w + x, y * MAP.w + x + len);
      x += len;
      return '';
    });
  });
  function labelAt(px, py) {
    const x = Math.floor(px) - MAP.x, y = Math.floor(py) - MAP.y;
    return x < 0 || y < 0 || x >= MAP.w || y >= MAP.h ? 0 : labels[y * MAP.w + x];
  }
  // The colour at a photo point, or the nearest one within `radius` photo pixels.
  function colourNear(px, py, radius) {
    const L = labelAt(px, py);
    if (L) return { c: byN[L], x: px, y: py };
    const r = Math.ceil(radius);
    let best = null, bestD = radius * radius;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = dx * dx + dy * dy;
        if (d > bestD) continue;
        const l = labelAt(px + dx, py + dy);
        if (l) { bestD = d; best = { c: byN[l], x: px + dx, y: py + dy }; }
      }
    }
    return best;
  }

  const $ = id => document.getElementById(id);
  const T = (key, vars) => I18N.t(key, vars);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = $('stage'), marksEl = $('marks'), statusEl = $('status'), countEl = $('foundCount');
  const paletteEl = $('palette'), restBtn = $('restBtn'), step2 = $('step2'), revealEl = $('reveal');

  const state = {};                  // colour id -> 'hidden' | 'found' | 'shown'
  const pins = [];                   // { el, x, y, c }
  let hunting = false, foundNow = 0;
  let lastMsg = { key: 'start', c: null };

  // ---------- zoom ----------
  let view = null;                   // layout() can run while Zoom.attach is still starting up
  view = Zoom.attach(stage, { width: W, height: H, onChange: layout });
  const hudText = document.createElement('span');
  view.hud.append(hudText);          // shown on the photo in full screen

  function layout() {
    if (!view) return;
    const size = view.size();
    pins.forEach(p => {
      const s = view.toScreen(p.x, p.y);
      p.el.style.left = s.x + 'px';
      p.el.style.top = s.y + 'px';
      p.el.classList.toggle('left', s.x > size.w * 0.62);
    });
  }
  function addPin(c, x, y) {
    const el = document.createElement('div');
    el.className = 'pin new';
    el.style.setProperty('--c', c.sw);
    el.innerHTML = '<i></i><b></b>';
    el.querySelector('b').textContent = T('roller.c.' + c.id);
    marksEl.appendChild(el);
    pins.push({ el, x, y, c });
    layout();
  }

  // ---------- the list of colours ----------
  COLOURS.forEach(c => {
    const li = document.createElement('li');
    li.className = 'chip';
    li.id = 'chip-' + c.id;
    li.style.setProperty('--c', c.sw);
    li.innerHTML = '<span class="sw" aria-hidden="true"></span><h3 class="chip-name"></h3><p class="chip-where"></p>' +
      '<button class="link-btn" type="button"></button>';
    li.querySelector('.link-btn').addEventListener('click', () => reveal(c, 'shown'));
    paletteEl.appendChild(li);
  });
  function renderChip(c) {
    const li = $('chip-' + c.id), st = state[c.id], btn = li.querySelector('.link-btn');
    li.dataset.state = st;
    li.querySelector('.chip-name').textContent = T('roller.c.' + c.id);
    li.querySelector('.chip-where').textContent = st === 'hidden' ? T('roller.notFound') : T('roller.w.' + c.id);
    btn.textContent = T('roller.show');
    btn.hidden = st !== 'hidden';
  }

  // ---------- messages (kept as keys so they can change language) ----------
  function msgText() {
    const c = lastMsg.c;
    let name = c ? T('roller.c.' + c.id) : '';
    if (lastMsg.key === 'already' && I18N.lang === 'en') name = name.toLowerCase();
    return T('roller.msg.' + lastMsg.key, { name });
  }
  function renderStatus() {
    const text = msgText();
    statusEl.textContent = text;
    hudText.textContent = hunting ? T('roller.hud', { found: foundNow, msg: text }) : '';
  }
  function say(key, c) { lastMsg = { key, c: c || null }; renderStatus(); }

  function update() {
    const found = COLOURS.filter(c => state[c.id] === 'found').length;
    const done = COLOURS.filter(c => state[c.id] !== 'hidden').length;
    foundNow = found;
    countEl.textContent = found;
    restBtn.disabled = done === COLOURS.length;
    renderStatus();
    if (done < COLOURS.length) { revealEl.hidden = true; return; }
    $('doneText').textContent = found === COLOURS.length ? T('roller.done.all') : T('roller.done.part', { f: found, r: COLOURS.length - found });
    if (revealEl.hidden) {
      revealEl.hidden = false;
      revealEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  // ---------- finding colours ----------
  function reveal(c, st, x, y) {
    if (state[c.id] !== 'hidden') return;
    state[c.id] = st;
    const at = x === undefined ? c.pin : [x, y];
    if (st === 'shown') {
      const s = view.toScreen(at[0], at[1]), size = view.size();
      if (s.x < 0 || s.y < 0 || s.x > size.w || s.y > size.h) view.focusOn(BIRD[0], BIRD[1], BIRD_ZOOM);   // bring it into view
    }
    addPin(c, at[0], at[1]);
    renderChip(c);
    say(st === 'found' ? 'found' : 'shown', c);
    update();
    if (COLOURS.every(k => state[k.id] !== 'hidden')) say('done');
  }

  stage.addEventListener('click', e => {
    if (!hunting || e.target.closest('.zoom-ctl, .zoom-hud') || view.wasDrag()) return;   // a drag is not a tap
    const p = view.toImage(e.clientX, e.clientY);
    if (!p.inside) return;
    const hit = colourNear(p.x, p.y, TOL_PX / p.scale);
    if (!hit) {
      const el = document.createElement('div');
      el.className = 'miss';
      el.style.left = p.px + 'px';
      el.style.top = p.py + 'px';
      marksEl.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
      say('miss');
    } else if (state[hit.c.id] !== 'hidden') {
      say('already', hit.c);
    } else {
      reveal(hit.c, 'found', hit.x, hit.y);
    }
  });
  restBtn.addEventListener('click', () => COLOURS.forEach(c => reveal(c, 'shown')));

  // ---------- step 1: how many colours? ----------
  function startHunt() {
    hunting = true;
    step2.hidden = false;
    say('start');
    update();
    stage.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    view.focusOn(BIRD[0], BIRD[1], BIRD_ZOOM);
  }
  const quiz = Quiz.choice({
    list: $('opts'), feedback: $('feedback'), prefix: 'roller',
    keys: ['four', 'six', 'eight', 'ten'], right: 'eight', onRight: startHunt
  });

  function reset() {
    hunting = false;
    pins.splice(0).forEach(p => p.el.remove());
    COLOURS.forEach(c => { state[c.id] = 'hidden'; renderChip(c); });
    lastMsg = { key: 'start', c: null };
    step2.hidden = true;
    revealEl.hidden = true;
    update();
  }
  $('againBtn').addEventListener('click', () => {
    reset();
    quiz.reset();
    view.reset();
    $('stage').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  reset();
  I18N.onChange(() => {
    COLOURS.forEach(renderChip);
    pins.forEach(p => { p.el.querySelector('b').textContent = T('roller.c.' + p.c.id); });
    update();
  });
})();
