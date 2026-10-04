(() => {
  'use strict';

  // The three sounds (free recordings from Wikimedia Commons; credits are on the page). Shuffled on every visit.
  // start = second to start playing from: the hadada recording is quiet for its first ten seconds.
  const SOUNDS = [
    { id: 'goaway', src: 'audio/goaway-bare-faced.mp3', start: 0 },
    { id: 'hadada', src: 'audio/hadada-ibis.mp3', start: 10 },
    { id: 'roller', src: 'audio/lilac-breasted-roller.mp3', start: 0 }
  ];
  const RIGHT = 'goaway';
  const VIDEO = 'https://www.youtube-nocookie.com/embed/aKEbeE7H7Wk?start=53&autoplay=1&rel=0';

  const $ = id => document.getElementById(id);
  const T = (key, vars) => I18N.t(key, vars);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Zoom.attach($('stage'), { width: 2000, height: 1333, dblclick: true });
  const listEl = $('sounds'), feedback = $('feedback'), revealEl = $('reveal');

  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';

  let cards = [], tries = 0, fb = '', playing = null;

  function stopAll() {
    cards.forEach(c => { if (c.audio && !c.audio.paused) c.audio.pause(); });
  }
  function renderCard(c) {
    const k = c.key;
    const label = T(c.audio && !c.audio.paused ? 'goaway.pause' : 'goaway.play', { k });
    c.play.setAttribute('aria-label', label);
    c.play.title = label;
    c.play.innerHTML = c.audio && !c.audio.paused ? ICON_PAUSE : ICON_PLAY;
    c.pick.textContent = T('goaway.pick');
    c.pick.setAttribute('aria-label', T('goaway.pickAria', { k }));
    c.name.textContent = T('goaway.bird.' + c.id);
    c.note.textContent = T('goaway.note.' + c.id);
  }
  function renderFeedback() {
    feedback.textContent = fb === 'wrong' ? T('quiz.wrong')
      : fb === 'right' ? (tries === 1 ? T('quiz.first') : T('quiz.tries', { n: tries }))
      : fb === 'error' ? T('goaway.loadErr') : '';
  }

  function toggle(c) {
    if (!c.audio) {
      c.audio = new Audio(c.src + (c.start ? '#t=' + c.start : ''));
      c.audio.preload = 'auto';
      c.audio.addEventListener('play', () => { c.li.classList.add('is-playing'); renderCard(c); });
      c.audio.addEventListener('pause', () => { c.li.classList.remove('is-playing'); renderCard(c); });
      c.audio.addEventListener('ended', () => { c.bar.style.width = '0%'; c.audio.currentTime = c.start; });
      c.audio.addEventListener('timeupdate', () => {
        const len = c.audio.duration - c.start;
        if (len > 0) c.bar.style.width = Math.max(0, (c.audio.currentTime - c.start) / len * 100).toFixed(1) + '%';
      });
      c.audio.addEventListener('error', () => { fb = 'error'; renderFeedback(); });
    }
    if (c.audio.paused) {
      stopAll();
      if (c.audio.currentTime < c.start) c.audio.currentTime = c.start;
      const p = c.audio.play();
      // NotAllowedError only means the browser wants a real tap first; anything else is a loading problem
      if (p && p.catch) p.catch(err => { if (!err || err.name !== 'NotAllowedError') { fb = 'error'; renderFeedback(); } });
      if (fb === 'error') { fb = ''; renderFeedback(); }
    } else {
      c.audio.pause();
    }
  }

  function choose(c) {
    tries++;
    c.name.hidden = c.note.hidden = false;
    if (c.id === RIGHT) {
      c.li.dataset.state = 'right';
      cards.forEach(x => { x.pick.disabled = true; x.name.hidden = x.note.hidden = false; });
      fb = 'right';
      revealEl.hidden = false;
      revealEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    } else {
      c.li.dataset.state = 'wrong';
      c.pick.disabled = true;
      fb = 'wrong';
    }
    renderFeedback();
  }

  function build() {
    stopAll();
    tries = 0;
    fb = '';
    listEl.innerHTML = '';
    cards = Quiz.shuffled(SOUNDS).map((s, i) => {
      const li = document.createElement('li');
      li.className = 'sound';
      li.innerHTML =
        '<div class="sound-top"><span class="sound-key" aria-hidden="true"></span><button class="play" type="button"></button>' +
        '<div class="bars" aria-hidden="true">' + '<i></i>'.repeat(12) + '</div></div>' +
        '<div class="progress" aria-hidden="true"><span></span></div>' +
        '<p class="sound-name" hidden></p><p class="sound-note" hidden></p>' +
        '<button class="btn pick" type="button"></button>';
      const c = {
        id: s.id, src: s.src, start: s.start || 0, key: 'ABC'[i], li, audio: null,
        play: li.querySelector('.play'), pick: li.querySelector('.pick'), bar: li.querySelector('.progress span'),
        name: li.querySelector('.sound-name'), note: li.querySelector('.sound-note')
      };
      li.querySelector('.sound-key').textContent = c.key;
      c.play.addEventListener('click', () => toggle(c));
      c.pick.addEventListener('click', () => choose(c));
      listEl.appendChild(li);
      renderCard(c);
      return c;
    });
    renderFeedback();
  }

  // The bonus video only loads from YouTube when someone asks for it.
  $('videoBtn').addEventListener('click', () => {
    stopAll();
    const f = document.createElement('iframe');
    f.className = 'video';
    f.src = VIDEO;
    f.title = 'Grey go-away-bird call (YouTube, Wild Ambience)';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    $('videoSlot').replaceChildren(f);
  });

  $('againBtn').addEventListener('click', () => {
    build();
    revealEl.hidden = true;
    $('q').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  build();
  I18N.onChange(() => { cards.forEach(renderCard); renderFeedback(); });
})();
