// The list of frames (games) on the site.
// To add a game: create its page, then add one entry to FRAMES below. That one entry updates the home page
// cards, the "Frame 02 / 10" labels, the previous / next links and the "Next" buttons on every page.
// Each entry has English text plus a zh block with the Chinese title and blurb.
(() => {
  'use strict';

  // shot = the camera settings for the frame's photo (read from the original file): focal length in mm,
  // aperture f-number, shutter speed, ISO. They appear as a viewfinder readout on the photo.
  const FRAMES = [
    { id: 'spot-six', page: 'spot-six.html', title: 'Spot the Six',
      blurb: 'Six different animals share one riverbank. Can you find them all?',
      zh: { title: '找出六种动物', blurb: '六种不同的动物共享一片河岸。你能把它们都找出来吗？' },
      thumb: 'images/thumb-riverbank.jpg', thumbPos: '40% 70%',
      shot: { mm: 400, f: '5.6', s: '1/800', iso: 1250 } },
    { id: 'photo-finish', page: 'photo-finish.html', title: 'Photo Finish',
      blurb: 'A jackal caught mid-run. Is it faster than a leopard?',
      zh: { title: '毫厘之差', blurb: '一只奔跑中的胡狼。它比花豹更快吗？' },
      thumb: 'images/thumb-jackal.jpg', thumbPos: '65% 55%',
      shot: { mm: 400, f: '25', s: '1/30', iso: 100 } },
    { id: 'zebra-vision', page: 'zebra-vision.html', title: 'Zebra Vision',
      blurb: 'Open the fan: how far round can a zebra see without turning its head?',
      zh: { title: '斑马的视野', blurb: '展开扇形：斑马不转头，能看到身边多大的范围？' },
      thumb: 'images/thumb-zebra-eye.jpg', thumbPos: '40% 50%',
      shot: { mm: 275, f: '5.6', s: '1/2000', iso: 500 } },
    { id: 'blowing-in-the-wind', page: 'blowing-in-the-wind.html', title: 'Blowing in the Wind',
      blurb: 'Something is blowing in the wind from this young giraffe’s mouth. Can you trace it?',
      zh: { title: '随风飘荡', blurb: '这只小长颈鹿的嘴边，有什么东西正随风飘荡。你能把它描出来吗？' },
      thumb: 'images/thumb-drool.jpg', thumbPos: '35% 50%',
      shot: { mm: 400, f: '5.6', s: '1/1600', iso: 640 } },
    { id: 'the-builder', page: 'the-builder.html', title: 'The Builder',
      blurb: 'A nest of sticks strong enough to hold a person. Which bird built it?',
      zh: { title: '筑巢者', blurb: '一个用树枝搭成、结实到能承受一个人重量的巢。是哪种鸟建的？' },
      thumb: 'images/thumb-hamerkop-nest.jpg', thumbPos: '55% 45%',
      shot: { mm: 170, f: '5.6', s: '1/500', iso: 125 } },
    { id: 'colour-count', page: 'colour-count.html', title: 'Count the Colours',
      blurb: 'One small bird, a whole paint box. How many colours is it wearing?',
      zh: { title: '数一数颜色', blurb: '一只小鸟，就像一整盒颜料。它身上有几种颜色？' },
      thumb: 'images/thumb-roller.jpg', thumbPos: '35% 40%',
      shot: { mm: 220, f: '5', s: '1/400', iso: 200 } },
    { id: 'go-away', page: 'go-away.html', title: 'Go Away!',
      blurb: 'Three bird calls. Which one belongs to the go-away-bird?',
      zh: { title: '走开！', blurb: '三段鸟叫声。哪一段属于“走开鸟”？' },
      thumb: 'images/thumb-goaway.jpg', thumbPos: '50% 35%',
      shot: { mm: 275, f: '5.6', s: '1/1000', iso: 160 } },
    { id: 'stare-down', page: 'stare-down.html', title: 'The Stare-Down',
      blurb: 'A hyena stares up at a bird. Can you guess why?',
      zh: { title: '对视', blurb: '一只鬣狗仰头盯着一只鸟。你能猜到原因吗？' },
      thumb: 'images/thumb-hyena-gull.jpg', thumbPos: '55% 62%',
      shot: { mm: 400, f: '5.6', s: '1/1250', iso: 200 } },
    { id: 'the-crossing', page: 'the-crossing.html', title: 'The Crossing',
      blurb: 'The Mara River in migration season. How many wildebeest can you find?',
      zh: { title: '渡河', blurb: '迁徙季节的马拉河。你能找到几头角马？' },
      thumb: 'images/thumb-wildebeest.jpg', thumbPos: '55% 60%', readoutTop: true,
      shot: { mm: 260, f: '5.6', s: '1/2000', iso: 320 } },
    { id: 'grooming', page: 'grooming.html', title: 'Grooming Time',
      blurb: 'A gazelle twists round to tidy its coat. What is it using?',
      zh: { title: '梳理时间', blurb: '一只瞪羚扭过头来打理皮毛。它用的是什么？' },
      thumb: 'images/thumb-gazelle-2.jpg', thumbPos: '50% 35%',
      shot: { mm: 400, f: '5.6', s: '1/4000', iso: 800 } }
  ];

  // Links in the top bar (their words are in i18n.js). `on` = the kinds of page that belong to that link:
  // 'home', 'frame' (a game page) or the page's <body data-page="..."> value, such as 'gallery'.
  const NAV = [
    { key: 'nav.all', href: 'index.html#frames', on: ['home', 'frame'] },
    { key: 'nav.gallery', href: 'gallery.html', on: ['gallery'] },
    { key: 'nav.story', href: 'our-story.html', on: ['story'] }
  ];

  const T = (key, vars) => I18N.t(key, vars);
  const pad = n => String(n).padStart(2, '0');
  const label = i => T('frame.label', { n: pad(i + 1), total: pad(FRAMES.length) });
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  const here = document.querySelector('[data-frame]');
  const idx = here ? FRAMES.findIndex(f => f.id === here.dataset.frame) : -1;
  const pageKind = here ? 'frame' : ((document.body && document.body.dataset.page) || 'home');
  let shotNow = null;     // a page with two photos can show the settings of the one on screen (Frames.setShot)
  const bar = document.querySelector('[data-topbar]');
  const grid = document.getElementById('frameGrid');
  const pager = document.querySelector('[data-pager]');

  function renderBar() {
    if (!bar) return;
    const focused = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.lang;
    bar.textContent = '';
    const inner = el('div', 'wrap topbar-inner');
    const brand = el('a', 'brand');
    brand.href = 'index.html';
    brand.append(el('span', 'lens'), T('site.name'));
    brand.firstChild.setAttribute('aria-hidden', 'true');

    const nav = el('nav', 'nav');
    nav.setAttribute('aria-label', T('nav.aria'));
    NAV.forEach(n => {
      const a = el('a', '', T(n.key));
      a.href = n.href;
      if (n.on.includes(pageKind)) a.setAttribute('aria-current', pageKind === 'frame' ? 'true' : 'page');
      nav.append(a);
    });

    const langs = el('div', 'lang');
    langs.setAttribute('role', 'group');
    langs.setAttribute('aria-label', T('lang.aria'));
    [['en', 'EN', 'en'], ['zh', '中文', 'zh-CN']].forEach(([code, text, htmlLang]) => {
      const b = el('button', '', text);
      b.type = 'button';
      b.lang = htmlLang;
      b.dataset.lang = code;
      b.setAttribute('aria-pressed', String(I18N.lang === code));
      b.addEventListener('click', () => I18N.setLang(code));
      langs.append(b);
      if (focused === code) setTimeout(() => b.focus(), 0);     // keep keyboard focus on the switch
    });

    const right = el('div', 'topbar-right');
    right.append(nav, langs);
    inner.append(brand, right);
    bar.append(inner);
  }

  function renderGrid() {
    if (!grid) return;
    grid.textContent = '';
    FRAMES.forEach((f, i) => {
      const a = el('a', 'card');
      a.href = f.page;
      const photo = el('div', 'card-photo');
      const img = new Image();
      img.src = f.thumb; img.alt = ''; img.width = 960; img.height = 640;
      img.style.objectPosition = f.thumbPos;
      photo.append(img);
      const body = el('div', 'card-body');
      body.append(el('p', 'eyebrow', label(i)), el('h2', '', I18N.pick(f, 'title')), el('p', '', I18N.pick(f, 'blurb')), el('span', 'card-cta', T('frame.play')));
      a.append(photo, body);
      grid.append(a);
    });
    document.querySelectorAll('[data-frame-count]').forEach(e => {
      e.textContent = T(FRAMES.length === 1 ? 'frame.count.one' : 'frame.count.many', { n: FRAMES.length });
    });
  }

  function renderFramePage() {
    if (idx < 0) return;
    document.querySelectorAll('[data-frame-label]').forEach(e => { e.textContent = label(idx); });

    // Viewfinder readout with the camera settings, drawn over the bottom of the photo
    const shot = shotNow || FRAMES[idx].shot, photo = document.querySelector('.zoomable');
    if (shot && photo) {
      photo.querySelectorAll('.readout').forEach(e => e.remove());
      const ro = el('div', 'readout' + (FRAMES[idx].readoutTop ? ' top' : ''));   // readoutTop: keep the strip off animals at the bottom
      ro.setAttribute('role', 'note');
      ro.setAttribute('aria-label', T('shot.aria', shot));
      [shot.s, 'f/' + shot.f, 'ISO ' + shot.iso, shot.mm + ' mm'].forEach(text => ro.append(el('span', '', text)));
      photo.append(ro);
    }

    const prev = FRAMES[idx - 1], next = FRAMES[idx + 1];
    if (pager) {
      pager.textContent = '';
      pager.setAttribute('aria-label', T('pager.aria'));
      const link = (cls, dir, name, href) => {
        const a = el('a', cls);
        a.href = href;
        a.append(el('span', 'dir', dir), el('span', 'name', name));
        return a;
      };
      if (prev) pager.append(link('prev', T('pager.prev'), I18N.pick(prev, 'title'), prev.page));
      if (next) pager.append(link('next', T('pager.next'), I18N.pick(next, 'title') + ' →', next.page));
      else pager.append(link('next', T('pager.after'), T('nav.story') + ' →', 'our-story.html'));   // after the last game
    }
    document.querySelectorAll('[data-next]').forEach(a => {
      a.href = next ? next.page : 'index.html#frames';
      a.textContent = next ? T('btn.next', { title: I18N.pick(next, 'title') }) : T('btn.backAll');
      a.classList.toggle('btn-primary', !!next);      // after the last game, Our Story is the main button
    });
    if (!next) renderStoryEnd();
  }

  // After the last game: the same Our Story strip as on the home page, shown with the answer.
  const STORY_STRIP = ['river-and-calvin', 'calvin-with-the-lens', 'three-of-us-with-carlos', 'kilimanjaro-day-hike', 'african-braids'];
  function renderStoryEnd() {
    document.querySelectorAll('.reveal').forEach(rv => {
      let box = rv.querySelector('.end-story');
      if (!box) {
        box = el('div', 'teaser end-story');
        const strip = el('a', 'teaser-strip');
        strip.href = 'our-story.html';
        strip.tabIndex = -1;
        strip.setAttribute('aria-hidden', 'true');
        STORY_STRIP.forEach(id => { const img = new Image(); img.src = 'images/story/t/' + id + '.jpg'; img.alt = ''; img.loading = 'lazy'; strip.append(img); });
        const actions = el('div', 'actions');
        const btn = el('a', 'btn btn-primary');
        btn.href = 'our-story.html';
        actions.append(btn);
        box.append(el('h3', 'h3'), strip, el('p'), actions);
        rv.insertBefore(box, Array.from(rv.children).find(c => c.classList.contains('actions')) || null);
      }
      box.querySelector('h3').textContent = T('end.h');
      box.querySelector('p').textContent = T('home.story.p');
      box.querySelector('.btn').textContent = T('home.story.btn');
    });
  }

  function render() { renderBar(); renderGrid(); renderFramePage(); }
  render();
  I18N.onChange(render);
  window.Frames = { setShot(shot) { shotNow = shot; renderFramePage(); } };
})();
