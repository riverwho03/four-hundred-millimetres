(() => {
  'use strict';

  // The answer. Published figures for zebras range from about 320 to 350 degrees, so that bracket counts
  // as right, and ZEBRA is the single figure shown. Answers just below the bracket count as close.
  const ZEBRA = 340, LOW = 320, HIGH = 350, CLOSE = 30;
  const START = 120;                   // the fan starts part open, so both needles show, clear of the numbers

  const $ = id => document.getElementById(id);
  const T = (key, vars) => I18N.t(key, vars);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Zoom.attach($('stage'), { width: 1334, height: 2000, dblclick: true });

  const dial = $('dial'), readEl = $('dialRead'), lockBtn = $('lockBtn'), hintEl = $('dialHint');
  const legendEl = $('legend'), result1 = $('result1'), verdictEl = $('verdict'), verdictText = $('verdictText');
  const step2 = $('step2'), revealEl = $('reveal');

  let value = START, moved = false, locked = false, dragging = false, hintKey = '';

  // ---------- drawing the dial ----------
  // An SVG 300 x 300, seen from above like the diagram in the answer: the zebra's nose points to 12 o'clock and
  // the shaded fan opens evenly on both sides of it. Each needle stands value / 2 degrees from the nose, so with
  // the needles at 3 and 9 o'clock the fan is 180 degrees, and with both at 6 o'clock it is the full 360.
  const NS = 'http://www.w3.org/2000/svg';
  const C = 150, R_SWEEP = 122, R_NUM = 98;
  const f2 = n => n.toFixed(2);
  const pt = (deg, r) => { const a = deg * Math.PI / 180; return [C + r * Math.sin(a), C - r * Math.cos(a)]; };
  const sides = total => [total / 2, -total / 2];      // where the two needles stand for a given total
  function add(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
    dial.appendChild(e);
    return e;
  }
  function fan(total) {                // the shaded part: total / 2 degrees either side of the nose
    if (total <= 0) return '';
    if (total >= 360) return 'M' + C + ' ' + (C - R_SWEEP) + 'A' + R_SWEEP + ' ' + R_SWEEP + ' 0 1 1 ' + C + ' ' + (C + R_SWEEP) +
      'A' + R_SWEEP + ' ' + R_SWEEP + ' 0 1 1 ' + C + ' ' + (C - R_SWEEP) + 'Z';
    const [x0, y0] = pt(-total / 2, R_SWEEP), [x1, y1] = pt(total / 2, R_SWEEP);
    return 'M' + C + ' ' + C + 'L' + f2(x0) + ' ' + f2(y0) + 'A' + R_SWEEP + ' ' + R_SWEEP + ' 0 ' + (total > 180 ? 1 : 0) + ' 1 ' + f2(x1) + ' ' + f2(y1) + 'Z';
  }
  function arc(from, to, r) {
    const [x0, y0] = pt(from, r), [x1, y1] = pt(to, r);
    return 'M' + f2(x0) + ' ' + f2(y0) + 'A' + r + ' ' + r + ' 0 ' + (to - from > 180 ? 1 : 0) + ' 1 ' + f2(x1) + ' ' + f2(y1);
  }

  add('circle', { cx: C, cy: C, r: 146, class: 'dial-face' });
  const sweep = add('path', { class: 'dial-sweep', d: '' });
  for (let d = 0; d < 360; d += 5) {   // a tick for every 10 degrees of the total, a longer one every 30 and 90
    const major = d % 45 === 0, mid = d % 15 === 0;
    const [x0, y0] = pt(d, major ? 128 : mid ? 133 : 137), [x1, y1] = pt(d, 142);
    add('line', { x1: f2(x0), y1: f2(y0), x2: f2(x1), y2: f2(y1), class: 'dial-tick' + (major ? ' major' : '') });
  }
  for (let d = 0; d < 360; d += 45) {  // each number is the total the fan shows with a needle there
    const [x, y] = pt(d, R_NUM);
    add('text', { x: f2(x), y: f2(y), class: 'dial-num' }).textContent = 2 * Math.min(d, 360 - d) + '°';
  }
  const bracket = add('path', { class: 'dial-bracket', d: arc(LOW / 2, HIGH / 2, 137) + arc(360 - HIGH / 2, 360 - LOW / 2, 137) });
  const trueNeedles = sides(ZEBRA).map(deg => {
    const [x, y] = pt(deg, R_SWEEP);
    return add('line', { x1: C, y1: C, x2: f2(x), y2: f2(y), class: 'dial-true' });
  });
  const needles = [0, 1].map(() => add('line', { x1: C, y1: C, x2: C, y2: C - R_SWEEP, class: 'dial-needle' }));
  const head = add('g', { transform: 'translate(150 150)', 'aria-hidden': 'true' });
  head.innerHTML =                     // a zebra's head seen from above, nose up: the eyes are on the sides
    '<path class="zebra-head" d="M0-38C8-38 12-30 13-20L16 8C17 20 10 30 0 30C-10 30-17 20-16 8L-13-20C-12-30-8-38 0-38Z"/>' +
    '<ellipse class="zebra-head" cx="-11" cy="32" rx="5" ry="9" transform="rotate(-25 -11 32)"/>' +
    '<ellipse class="zebra-head" cx="11" cy="32" rx="5" ry="9" transform="rotate(25 11 32)"/>' +
    '<path class="zebra-stripe" d="M-10-22Q0-26 10-22M-13-9Q0-14 13-9M-15 4Q0-1 15 4M-14 17Q0 12 14 17"/>' +
    '<ellipse class="zebra-eye" cx="-15.5" cy="-2" rx="2.4" ry="3.4"/><ellipse class="zebra-eye" cx="15.5" cy="-2" rx="2.4" ry="3.4"/>' +
    '<ellipse class="zebra-eye" cx="0" cy="-35" rx="6" ry="3.4"/>';
  const knobs = [0, 1].map(() => add('circle', { cx: C, cy: C - R_SWEEP, r: 10, class: 'dial-knob' }));

  function render() {
    sweep.setAttribute('d', fan(value));
    sides(value).forEach((deg, i) => {
      const [x, y] = pt(deg, R_SWEEP);
      needles[i].setAttribute('x2', f2(x)); needles[i].setAttribute('y2', f2(y));
      knobs[i].setAttribute('cx', f2(x)); knobs[i].setAttribute('cy', f2(y));
    });
    [bracket].concat(trueNeedles).forEach(e => { e.style.display = locked ? '' : 'none'; });
    readEl.textContent = value + '°';
    dial.setAttribute('aria-valuenow', value);
    dial.setAttribute('aria-valuetext', value + '°');
  }
  function say(key) { hintKey = key; hintEl.textContent = key ? T(key) : ''; }
  function setValue(v) {
    value = Math.max(0, Math.min(360, Math.round(v)));
    moved = true;
    say('');
    render();
  }

  // ---------- moving the needles ----------
  // Pressing or dragging on either side of the nose moves that needle, and the other one mirrors it.
  function totalAt(e) {
    const r = dial.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.08) return null;       // too close to the middle to read an angle
    return 2 * Math.abs(Math.atan2(dx, -dy) * 180 / Math.PI);   // degrees from the nose, on either side, doubled
  }
  dial.addEventListener('pointerdown', e => {
    if (locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const v = totalAt(e);
    if (v === null) return;
    dragging = true;
    dial.classList.add('is-dragging');
    try { dial.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    setValue(v);                       // pressing anywhere on the dial jumps the needles there
    e.preventDefault();
  });
  dial.addEventListener('pointermove', e => {
    if (!dragging) return;
    const v = totalAt(e);
    if (v !== null) setValue(v);
  });
  const stopDrag = () => { dragging = false; dial.classList.remove('is-dragging'); };
  dial.addEventListener('pointerup', stopDrag);
  dial.addEventListener('pointercancel', stopDrag);
  dial.addEventListener('keydown', e => {
    if (locked) return;
    const step = e.shiftKey ? 10 : 1;
    let v = null;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowUp': v = value + step; break;
      case 'ArrowLeft': case 'ArrowDown': v = value - step; break;
      case 'PageUp': v = value + 10; break;
      case 'PageDown': v = value - 10; break;
      case 'Home': v = 0; break;
      case 'End': v = 360; break;
      default: return;
    }
    e.preventDefault();
    setValue(v);
  });

  // ---------- locking in the answer ----------
  function judge(v) {
    if (v >= LOW && v <= HIGH) return 'spot';
    if (v > HIGH) return 'over';
    return v >= LOW - CLOSE ? 'close' : 'far';
  }
  function renderVerdict() {
    if (!locked) return;
    const k = judge(value);
    verdictEl.textContent = T('zebra.v.' + k);
    verdictEl.dataset.ok = String(k === 'spot');
    verdictText.textContent = T('zebra.r.' + k, { n: value });
  }
  lockBtn.addEventListener('click', () => {
    if (!moved) { say('zebra.moveFirst'); dial.focus(); return; }
    locked = true;
    dial.setAttribute('aria-disabled', 'true');
    lockBtn.hidden = true;
    legendEl.hidden = false;
    result1.hidden = false;
    step2.hidden = false;
    render();
    renderVerdict();
    result1.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  });

  // ---------- the second question, then the facts ----------
  const quiz = Quiz.choice({
    list: $('opts'), feedback: $('feedback'), prefix: 'zebra',
    keys: ['predators', 'stripes', 'sunsets'], right: 'predators',
    onRight() {
      revealEl.hidden = false;
      revealEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  });

  $('againBtn').addEventListener('click', () => {
    value = START; moved = false; locked = false;
    dial.removeAttribute('aria-disabled');
    lockBtn.hidden = false;
    legendEl.hidden = result1.hidden = step2.hidden = revealEl.hidden = true;
    say('');
    quiz.reset();
    render();
    $('q1').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  render();
  I18N.onChange(() => { renderVerdict(); say(hintKey); });
})();
