(() => {
  'use strict';

  // Every photo on the Our Story page opens in the full-screen viewer, in page order.
  // The captions are the figcaptions (their words are in i18n.js, story.cap.*). Some photos have none.
  const T = (key, vars) => I18N.t(key, vars);
  const photos = Array.from(document.querySelectorAll('.story-photo')).map(fig => {
    const btn = fig.querySelector('button');
    return { id: btn.dataset.photo, w: Number(btn.dataset.w), h: Number(btn.dataset.h), btn, cap: fig.querySelector('figcaption') };
  });
  const caption = p => (p.cap ? p.cap.textContent : '');

  const viewer = Viewer.attach({
    items: () => photos,
    src: p => 'images/story/' + p.id + '.jpg',
    size: p => [p.w, p.h],
    title: caption
  });
  photos.forEach(p => p.btn.addEventListener('click', () => viewer.open(p)));

  // A photo without a caption is named by its place on the page instead, e.g. "Open photo: 2 of 14".
  function labels() {
    photos.forEach((p, i) => p.btn.setAttribute('aria-label',
      T('gal.open', { title: caption(p) || T('lb.count', { i: i + 1, n: photos.length }) })));
  }
  labels();
  I18N.onChange(labels);
})();
