(() => {
  'use strict';

  const RACE_M = 100;                          // length of the race in metres
  const SPEED = { jackal: 60, leopard: 58 };   // top speeds in km/h, as commonly quoted. Edit to change the race.
  // (The "60 km/h" and "58 km/h" labels under the names are in photo-finish.html.)

  const $ = id => document.getElementById(id);
  const T = (key, vars) => I18N.t(key, vars);
  Zoom.attach($('stage'), { width: 2000, height: 1331, dblclick: true });
  const metresPerSecond = who => SPEED[who] / 3.6;
  const finishTime = who => RACE_M / metresPerSecond(who);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pickBtns = document.querySelectorAll('.pick-btn');
  const resultEl = $('result'), verdictEl = $('verdict'), outcomeEl = $('outcome'), replayBtn = $('replayBtn');
  const lanes = {};
  document.querySelectorAll('.lane').forEach(l => {
    lanes[l.dataset.who] = { track: l.querySelector('.track'), time: l.querySelector('.time') };
  });
  const order = Object.keys(SPEED);
  const winner = order.reduce((a, b) => SPEED[a] >= SPEED[b] ? a : b);
  const loser = order.find(w => w !== winner);
  let raf = 0, picked = null, finished = false;

  function show(who, metres, seconds, done) {
    lanes[who].track.style.setProperty('--p', (metres / RACE_M).toFixed(4));
    lanes[who].time.textContent = (done ? finishTime(who) : seconds).toFixed(1) + ' s';
  }

  // Words that depend on the result are drawn from state, so they can change language afterwards.
  function renderWords() {
    if (picked) {
      verdictEl.textContent = T(picked === winner ? 'finish.ok' : 'finish.close', { who: T('finish.who.' + winner) });
    }
    if (finished) {
      const lead = RACE_M - metresPerSecond(loser) * finishTime(winner);
      const metres = Math.max(1, Math.round(lead));
      outcomeEl.textContent = T(metres === 1 ? 'finish.outcome.one' : 'finish.outcome.many', {
        who: T('finish.pick.' + winner), m: metres,
        a: finishTime(winner).toFixed(1), b: finishTime(loser).toFixed(1)
      });
    } else {
      outcomeEl.textContent = '';
    }
  }

  function finish() {
    order.forEach(w => show(w, RACE_M, 0, true));
    finished = true;
    renderWords();
    replayBtn.disabled = false;
  }

  function race() {
    cancelAnimationFrame(raf);
    finished = false;
    renderWords();
    order.forEach(w => show(w, 0, 0, false));
    if (reduceMotion) { finish(); return; }
    replayBtn.disabled = true;
    const t0 = performance.now();
    const step = now => {
      const t = (now - t0) / 1000;
      let running = false;
      order.forEach(w => {
        const d = Math.min(RACE_M, metresPerSecond(w) * t);
        show(w, d, Math.min(t, finishTime(w)), d >= RACE_M);
        if (d < RACE_M) running = true;
      });
      if (running) raf = requestAnimationFrame(step); else finish();
    };
    raf = requestAnimationFrame(step);
  }

  function choose(who) {
    picked = who;
    pickBtns.forEach(b => {
      b.disabled = true;
      if (b.dataset.pick === who) b.dataset.state = 'picked';
    });
    verdictEl.dataset.ok = String(who === winner);
    resultEl.hidden = false;
    renderWords();
    resultEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    race();
  }

  pickBtns.forEach(b => b.addEventListener('click', () => choose(b.dataset.pick)));
  replayBtn.addEventListener('click', race);
  $('againBtn').addEventListener('click', () => {
    cancelAnimationFrame(raf);
    picked = null;
    finished = false;
    resultEl.hidden = true;
    pickBtns.forEach(b => { b.disabled = false; b.removeAttribute('data-state'); });
    $('q').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  I18N.onChange(renderWords);     // switching language mid-race just redraws the words
})();
