(() => {
  'use strict';

  // The three answers. Their wording is in i18n.js (stare.opt.* and stare.note.*), so each can be edited
  // in both languages. The order is shuffled every time the page loads.
  const KEYS = ['food', 'lift', 'joke'];
  const RIGHT = 'food';

  const $ = id => document.getElementById(id);
  const T = (key, vars) => I18N.t(key, vars);
  const listEl = $('opts'), feedback = $('feedback'), revealEl = $('reveal');
  Zoom.attach($('stage'), { width: 2000, height: 1331, dblclick: true });
  Zoom.attach($('answerStage'), { width: 2000, height: 1333, dblclick: true });    // the answer photo, shown after the right answer
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let items = [];          // one { key, btn, label, note } per answer button
  let tries = 0;
  let fb = '';             // '', 'wrong' or 'right': what the line under the answers says

  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderFeedback() {
    feedback.textContent = fb === 'wrong' ? T('stare.fb.wrong')
      : fb === 'right' ? (tries === 1 ? T('stare.fb.first') : T('stare.fb.tries', { n: tries }))
      : '';
  }
  function relabel() {
    items.forEach(it => {
      it.label.textContent = T('stare.opt.' + it.key);
      it.note.textContent = T('stare.note.' + it.key);
    });
    renderFeedback();
  }

  function build() {
    tries = 0;
    fb = '';
    listEl.innerHTML = '';
    revealEl.hidden = true;
    items = shuffled(KEYS).map((key, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt';
      btn.innerHTML = '<span class="key">' + 'ABC'[i] + '</span><span></span><span class="note" hidden></span>';
      const it = { key, btn, label: btn.children[1], note: btn.children[2] };
      btn.addEventListener('click', () => choose(it));
      li.appendChild(btn);
      listEl.appendChild(li);
      return it;
    });
    relabel();
  }

  function choose(it) {
    tries++;
    it.note.hidden = false;
    if (it.key === RIGHT) {
      it.btn.dataset.state = 'right';
      items.forEach(x => { x.btn.disabled = true; });
      fb = 'right';
      revealEl.hidden = false;
      revealEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    } else {
      it.btn.dataset.state = 'wrong';
      it.btn.disabled = true;
      fb = 'wrong';
    }
    renderFeedback();
  }

  $('againBtn').addEventListener('click', () => {
    build();
    $('q').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  build();
  I18N.onChange(relabel);     // switching language keeps your answers and redraws the words
})();
