(() => {
  'use strict';

  // The three birds to choose from (shuffled on every visit). The image files have plain numbers as names so they
  // don't give the answer away. The hamerkop photo (bird-1) is by Charles J. Sharp, CC BY-SA 4.0 (credited on the
  // page); the Egyptian goose (bird-2) and the secretarybird (bird-3) are the photographer's own.
  const BIRDS = [
    { id: 'hamerkop', img: 'images/card-bird-1.jpg' },
    { id: 'goose', img: 'images/card-bird-2.jpg' },
    { id: 'secretary', img: 'images/card-bird-3.jpg' }
  ];
  const RIGHT = 'hamerkop';

  const $ = id => document.getElementById(id);
  const T = (key, vars) => I18N.t(key, vars);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Zoom.attach($('stage'), { width: 2000, height: 1333, dblclick: true });
  const listEl = $('birds'), feedback = $('feedback'), revealEl = $('reveal'), hintBtn = $('hintBtn'), hintText = $('hintText');

  let cards = [], tries = 0, fb = '';

  function renderCard(c) {
    c.btn.setAttribute('aria-label', T('builder.pickAria', { k: c.key }) + (c.name.hidden ? '' : ': ' + T('builder.bird.' + c.id)));
    c.name.textContent = T('builder.bird.' + c.id);
    c.note.textContent = T('builder.note.' + c.id);
  }
  function renderFeedback() {
    feedback.textContent = fb === 'wrong' ? T('quiz.wrong')
      : fb === 'right' ? (tries === 1 ? T('quiz.first') : T('quiz.tries', { n: tries }))
      : '';
  }

  function choose(c) {
    tries++;
    c.name.hidden = c.note.hidden = false;
    if (c.id === RIGHT) {
      c.btn.dataset.state = 'right';
      cards.forEach(x => { x.btn.disabled = true; x.name.hidden = x.note.hidden = false; renderCard(x); });
      fb = 'right';
      hintBtn.disabled = true;
      revealEl.hidden = false;
      revealEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    } else {
      c.btn.dataset.state = 'wrong';
      c.btn.disabled = true;
      fb = 'wrong';
      renderCard(c);
    }
    renderFeedback();
  }

  function build() {
    tries = 0;
    fb = '';
    listEl.innerHTML = '';
    hintBtn.disabled = false;
    hintText.hidden = true;
    cards = Quiz.shuffled(BIRDS).map((b, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bird';
      btn.innerHTML = '<img alt="" width="800" height="600"><span class="bird-body"><span class="bird-top"><span class="key"></span>' +
        '<span class="bird-name" hidden></span></span><span class="bird-note" hidden></span></span>';
      btn.querySelector('img').src = b.img;
      const c = { id: b.id, key: 'ABC'[i], btn, name: btn.querySelector('.bird-name'), note: btn.querySelector('.bird-note') };
      btn.querySelector('.key').textContent = c.key;
      btn.addEventListener('click', () => choose(c));
      li.appendChild(btn);
      listEl.appendChild(li);
      renderCard(c);
      return c;
    });
    renderFeedback();
  }

  hintBtn.addEventListener('click', () => { hintText.hidden = false; hintBtn.disabled = true; });
  $('againBtn').addEventListener('click', () => {
    build();
    revealEl.hidden = true;
    $('q').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  build();
  I18N.onChange(() => { cards.forEach(renderCard); renderFeedback(); });
})();
