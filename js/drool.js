(() => {
  'use strict';

  const W = 2100, H = 1400;          // size of the photo in pixels (a crop of the original, at full size)

  // The drool, from the calf's mouth down to where it meets its chest, in photo pixels.
  // Traced from the photo itself with work/Strand.cs.
  const DROOL = [[595, 500], [592, 512], [586, 524], [580, 536], [574, 548], [572, 560], [573, 572], [571, 584],
    [570, 596], [572, 608], [573, 620], [576, 632], [581, 644], [589, 656], [599, 668], [610, 680], [620, 692],
    [631, 704], [643, 716], [657, 728], [669, 740], [677, 752], [683, 764], [688, 776], [695, 788], [703, 800],
    [713, 812], [726, 824], [746, 836], [761, 848], [774, 860], [791, 872], [809, 884], [829, 896], [846, 908],
    [859, 920], [872, 932], [885, 944], [900, 956], [915, 968], [930, 980], [944, 992], [953, 1004], [961, 1016],
    [967, 1028], [973, 1040], [977, 1052], [981, 1064], [983, 1076], [985, 1088], [986, 1100], [989, 1112],
    [986, 1124], [985, 1126]];

  const WIN = 0.8;                   // 80% accuracy wins
  const STEP = 4;                    // lines are compared every 4 photo pixels
  // How far from the drool still counts as on it: 12 screen pixels at the zoom the line was drawn at,
  // kept between 14 and 45 photo pixels (so zooming in makes it fairer, never sloppier).
  const TOL_SCREEN = 12, TOL_MIN = 14, TOL_MAX = 45;
  const SHOW_AFTER = 2;              // misses before "Show me where it is" appears

  const $ = id => document.getElementById(id);
  const T = (key, vars) => I18N.t(key, vars);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = $('stage'), ink = $('ink'), revealEl = $('reveal');
  const verdictEl = $('verdict'), feedbackEl = $('feedback');
  const checkBtn = $('checkBtn'), clearBtn = $('clearBtn'), showBtn = $('showBtn');

  let strokes = [];                  // the player's lines: arrays of { x, y, t } (t = how far off still counts)
  let current = null;                // the line being drawn
  let misses = 0, won = false, hint = false;
  let said = null;                   // the last message, so it can be shown again in the other language
  let raf = 0;                       // a redraw is waiting (Zoom.attach already asks for one while it starts)

  // ---------- the photo, with drawing switched on ----------
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const view = Zoom.attach(stage, {
    width: W, height: H, dblclick: true, onChange: render,
    draw: {
      start(p) { if (won) return; current = []; strokes.push(current); addPoint(p); },
      move(p) { if (current) addPoint(p); },
      end() { current = null; render(); },
      cancel() { if (current) { strokes.splice(strokes.indexOf(current), 1); current = null; render(); } }
    }
  });
  Zoom.attach($('milkStage'), { width: 2000, height: 1500, dblclick: true });

  function addPoint(p) {
    const x = clamp(p.x, 0, W), y = clamp(p.y, 0, H), last = current[current.length - 1];
    if (last && Math.hypot(x - last.x, y - last.y) < 1.5) return;
    current.push({ x, y, t: clamp(TOL_SCREEN / view.unit(), TOL_MIN, TOL_MAX) });
    render();
  }

  // Draw/Move switch, in the photo's top bar and (for full screen) in the zoom box on the photo.
  const toolGroups = [$('tools')];
  const hudTools = $('tools').cloneNode(true);
  hudTools.removeAttribute('id');
  const hudCheck = document.createElement('button');
  hudCheck.type = 'button';
  hudCheck.className = 'btn btn-primary';
  view.hud.append(hudTools, hudCheck);
  toolGroups.push(hudTools);
  function setTool(t) {
    view.setTool(t);
    toolGroups.forEach(g => g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t))));
  }
  toolGroups.forEach(g => g.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setTool(b.dataset.tool); }));

  // ---------- drawing the lines over the photo ----------
  function render() { if (!raf) raf = requestAnimationFrame(paint); }
  function d(points) {
    if (!points.length) return '';
    const s = points.map(p => view.toScreen(p.x, p.y));
    if (s.length === 1) return 'M' + s[0].x.toFixed(1) + ' ' + s[0].y.toFixed(1) + 'l0.01 0';   // a dot
    return s.map((q, i) => (i ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1)).join('');
  }
  const droolPts = DROOL.map(([x, y]) => ({ x, y }));
  function paint() {
    raf = 0;
    const { w, h } = view.size();
    ink.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    let html = '';
    if (won) html += '<path class="drool-glow" d="' + d(droolPts) + '"/><path class="drool" d="' + d(droolPts) + '"/>';
    else if (hint) html += '<path class="drool hint" d="' + d(droolPts) + '"/>';
    strokes.forEach(s => { const pd = d(s); html += '<path class="line-under" d="' + pd + '"/><path class="line" d="' + pd + '"/>'; });
    ink.innerHTML = html;
  }

  // ---------- scoring ----------
  // Points every `step` pixels along a line (t, the tolerance, is carried along).
  function resample(pts, step) {
    const out = [pts[0]];
    let need = step;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
      let at = 0;
      while (seg - at >= need) {
        at += need;
        const k = at / seg;
        out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, t: (a.t || 0) + ((b.t || 0) - (a.t || 0)) * k });
        need = step;
      }
      need -= seg - at;
    }
    return out;
  }
  function distToDrool(p) {
    let best = Infinity;
    for (let i = 1; i < droolPts.length; i++) {
      const a = droolPts[i - 1], b = droolPts[i];
      const vx = b.x - a.x, vy = b.y - a.y, len2 = vx * vx + vy * vy;
      const k = len2 ? clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / len2, 0, 1) : 0;
      best = Math.min(best, Math.hypot(p.x - (a.x + vx * k), p.y - (a.y + vy * k)));
    }
    return best;
  }
  const droolSamples = resample(droolPts, STEP);

  // Accuracy is the lower of two things: how much of the drool your line covers, and how much of your line
  // is on the drool. So 80% means at least 80% of the drool traced, with at least 80% of your line on it:
  // covering it all with a scribble, or drawing a perfect short piece, both fall short.
  function score() {
    const pts = [].concat(...strokes.map(s => resample(s, STEP)));
    if (pts.length < 6) return null;
    const on = pts.filter(p => distToDrool(p) <= p.t).length;
    const covered = droolSamples.filter(q => pts.some(p => Math.hypot(p.x - q.x, p.y - q.y) <= p.t)).length;
    const c = covered / droolSamples.length, p = on / pts.length;
    return { acc: Math.min(c, p), c, p };
  }
  const pct = v => Math.floor(v * 100);   // round down, so 79.6% shows as 79% and does not win

  // ---------- messages ----------
  function say(kind, r) { said = { kind, r }; renderSaid(); }
  function renderSaid() {
    hudCheck.textContent = T('drool.check');
    if (!said) { verdictEl.textContent = ''; feedbackEl.textContent = ''; verdictEl.removeAttribute('data-ok'); return; }
    const { kind, r } = said;
    verdictEl.textContent = r ? T('drool.score', { n: pct(r.acc) }) : '';
    verdictEl.dataset.ok = String(kind === 'win');
    const text = kind === 'win' ? T('drool.win')
      : kind === 'miss' ? T('drool.miss', { c: pct(r.c), p: pct(r.p) })
      : T('drool.' + kind);
    feedbackEl.textContent = (r ? T('drool.score', { n: pct(r.acc) }) + '. ' : '') + text;
  }

  // ---------- buttons ----------
  function check() {
    if (won) return;
    const r = score();
    if (!r) { say('empty'); return; }
    if (r.acc >= WIN) { win(r); return; }
    misses++;
    if (misses >= SHOW_AFTER && !hint) showBtn.hidden = false;
    say('miss', r);
  }
  function win(r) {
    won = true;
    if (view.expanded) document.querySelector('#stage [data-z="full"]').click();   // leave full screen
    setTool('move');
    view.reset();
    checkBtn.disabled = clearBtn.disabled = true;
    showBtn.hidden = true;
    say('win', r);
    render();
    revealEl.hidden = false;
    revealEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
  checkBtn.addEventListener('click', check);
  hudCheck.addEventListener('click', check);
  clearBtn.addEventListener('click', () => { strokes = []; current = null; said = null; renderSaid(); render(); });
  showBtn.addEventListener('click', () => { hint = true; showBtn.hidden = true; say('hint'); render(); });

  $('againBtn').addEventListener('click', () => {
    strokes = []; current = null; misses = 0; won = false; hint = false; said = null;
    checkBtn.disabled = clearBtn.disabled = false;
    showBtn.hidden = true;
    revealEl.hidden = true;
    setTool('draw');
    view.reset();
    renderSaid(); render();
    stage.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  });

  setTool('draw');
  renderSaid();
  render();
  I18N.onChange(renderSaid);
})();
