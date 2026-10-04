// A multiple-choice question, shared by several frames.
//
//   const q = Quiz.choice({ list, feedback, prefix: 'gaz', keys: ['teeth', 'tongue'], right: 'teeth', onRight(tries) {} });
//
// Each answer's words are I18N keys: prefix + '.opt.' + key, and the note shown once it is picked is
// prefix + '.note.' + key. The answers are shuffled every time; q.reset() asks the question again.
(() => {
  'use strict';

  const T = (key, vars) => I18N.t(key, vars);

  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function choice(o) {
    let items = [], tries = 0, fb = '';

    function renderFeedback() {
      if (!o.feedback) return;
      o.feedback.textContent = fb === 'wrong' ? T('quiz.wrong')
        : fb === 'right' ? (tries === 1 ? T('quiz.first') : T('quiz.tries', { n: tries }))
        : '';
    }
    function relabel() {
      items.forEach(it => {
        it.label.textContent = T(o.prefix + '.opt.' + it.key);
        it.note.textContent = T(o.prefix + '.note.' + it.key);
      });
      renderFeedback();
    }
    function build() {
      tries = 0;
      fb = '';
      o.list.innerHTML = '';
      items = shuffled(o.keys).map((key, i) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opt';
        btn.innerHTML = '<span class="key">' + 'ABCDEF'[i] + '</span><span></span><span class="note" hidden></span>';
        const it = { key, btn, label: btn.children[1], note: btn.children[2] };
        btn.addEventListener('click', () => choose(it));
        li.appendChild(btn);
        o.list.appendChild(li);
        return it;
      });
      relabel();
    }
    function choose(it) {
      tries++;
      it.note.hidden = false;
      if (it.key === o.right) {
        it.btn.dataset.state = 'right';
        items.forEach(x => { x.btn.disabled = true; });
        fb = 'right';
        renderFeedback();
        if (o.onRight) o.onRight(tries);
      } else {
        it.btn.dataset.state = 'wrong';
        it.btn.disabled = true;
        fb = 'wrong';
        renderFeedback();
      }
    }

    build();
    I18N.onChange(relabel);      // switching language keeps the answers given so far
    return { reset: build };
  }

  window.Quiz = { choice, shuffled };
})();
