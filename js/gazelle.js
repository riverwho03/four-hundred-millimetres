(() => {
  'use strict';

  // The two photos, about two seconds apart. shot = camera settings shown on the photo.
  const PHOTOS = {
    1: { src: 'images/gazelle-1.jpg', full: 'images/gazelle-1-large.jpg', alt: 'gaz.alt1', shot: { mm: 400, f: '5.6', s: '1/4000', iso: 800 } },
    2: { src: 'images/gazelle-2.jpg', full: 'images/gazelle-2-large.jpg', alt: 'gaz.alt2', shot: { mm: 400, f: '6.3', s: '1/4000', iso: 800 } }
  };
  const FULL_WIDTH = 4752;

  const $ = id => document.getElementById(id);
  const T = (key, vars) => I18N.t(key, vars);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = $('stage'), img = stage.querySelector('img');
  const view = Zoom.attach(stage, { width: 2000, height: 1333, dblclick: true });
  const segBtns = document.querySelectorAll('[data-photo]');
  let current = '1';

  function show(n) {
    if (n === current) return;
    current = n;
    const p = PHOTOS[n];
    img.setAttribute('data-i18n-attr', 'alt:' + p.alt);      // so a language switch keeps the right description
    view.setImage(p.src, p.full, FULL_WIDTH, T(p.alt));
    segBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.photo === n)));
    Frames.setShot(p.shot);
  }
  segBtns.forEach(b => b.addEventListener('click', () => show(b.dataset.photo)));
  new Image().src = PHOTOS[2].src;        // fetch photo 2 early so switching is instant

  const revealEl = $('reveal');
  const quiz = Quiz.choice({
    list: $('opts'), feedback: $('feedback'), prefix: 'gaz',
    keys: ['teeth', 'tongue', 'horns', 'hoof'], right: 'teeth',
    onRight() {
      revealEl.hidden = false;
      revealEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    }
  });

  $('againBtn').addEventListener('click', () => {
    quiz.reset();
    revealEl.hidden = true;
    $('q').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });
})();
