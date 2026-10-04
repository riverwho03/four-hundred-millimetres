(() => {
  'use strict';

  const W = 2000, H = 1333;          // size of the photo in pixels
  const PHOTO = 'images/riverbank.jpg';
  const MIN_TARGET_PX = 36;          // smallest tap target on screen, so tiny birds stay findable
  const SLOP_PX = 8;                 // extra forgiveness around every shape

  // Where each animal is, in photo pixels (2000 x 1333).
  //   rect = [x, y, width, height]      poly = [[x, y], ...]
  //   crop = [centre x, centre y, width] of the zoomed picture shown once the animal is found.
  //   zh   = the Chinese name, clue and fact (and the Latin line where it differs).
  // To change the animals or move a target, edit this list.
  const ANIMALS = [
    {
      id: 'hippo', name: 'Hippo', latin: 'Hippopotamus amphibius',
      clue: 'Heavier than a small car, and the biggest thing on the riverbank.',
      fact: 'A group of hippos is called a bloat. Their closest living relatives are whales and dolphins.',
      zh: {
        name: '河马',
        clue: '比一辆小汽车还重，是河岸上最大的家伙。',
        fact: '一群河马在英语里叫作 bloat（意为“胀鼓鼓的一群”）。河马现存最近的亲戚是鲸和海豚。'
      },
      crop: [700, 770, 640],
      parts: [{ poly: [
        [425, 808], [440, 770], [482, 708], [516, 697], [580, 685], [640, 660], [700, 645], [800, 638], [900, 645],
        [950, 655], [1050, 656], [1150, 666], [1230, 698], [1270, 722], [1300, 718], [1340, 700], [1400, 688],
        [1500, 684], [1600, 690], [1680, 712], [1740, 745], [1790, 785], [1830, 815], [1848, 845], [1840, 876],
        [1790, 884], [1740, 898], [1650, 894], [1595, 896], [1560, 906], [1535, 935], [1480, 945], [1420, 945],
        [1360, 932], [1300, 926], [1230, 932], [1190, 930], [1180, 908], [1130, 921], [1060, 912], [1016, 906],
        [1008, 880], [960, 872], [900, 872], [800, 866], [700, 863], [655, 860], [600, 860], [520, 852],
        [490, 856], [440, 828]
      ] }]
    },
    {
      id: 'croc', name: 'Nile crocodile', latin: 'Crocodylus niloticus',
      clue: 'Cold-blooded, armoured, and almost the same colour as the sand.',
      fact: 'Crocodiles often rest with their mouths open, which helps them cool down. Some Nile crocodiles grow longer than 5 metres.',
      zh: {
        name: '尼罗鳄',
        clue: '冷血，披着铠甲，颜色几乎和沙子一样。',
        fact: '鳄鱼常常张着嘴休息，这样有助于散热。有些尼罗鳄身长超过 5 米。'
      },
      crop: [848, 997, 460],
      parts: [{ poly: [
        [655, 952], [790, 950], [840, 958], [960, 960], [1030, 985], [1045, 1020], [1030, 1043], [930, 1040],
        [840, 1025], [790, 1008], [655, 1008]
      ] }]
    },
    {
      id: 'stork', name: 'Yellow-billed stork', latin: 'Mycteria ibis',
      clue: 'Long pink legs, a bright orange bill and a red face. Look up as well as down.',
      fact: 'It hunts by wading with its bill open under the water, and snaps it shut the moment it touches a fish.',
      zh: {
        name: '黄嘴鹮鹳',
        clue: '粉红色的长腿、亮橙色的嘴和红色的脸。不仅要往下看，也要往天上看。',
        fact: '它涉水觅食，嘴在水下半张着，一碰到鱼就立刻合上。'
      },
      crop: [1370, 880, 400],
      parts: [{ rect: [1368, 754, 92, 242] }, { rect: [1273, 860, 140, 115] }, { rect: [1485, 287, 322, 108] }]
    },
    {
      id: 'goose', name: 'Egyptian goose', latin: 'Alopochen aegyptiaca',
      clue: 'A brown bird with a dark patch around each eye, standing on its own.',
      fact: 'Despite the name, it is more closely related to shelducks than to true geese. The ancient Egyptians held it sacred.',
      zh: {
        name: '埃及雁',
        clue: '一只棕色的鸟，每只眼睛周围有一圈深色斑块，独自站着。',
        fact: '虽然叫“雁”，它其实和麻鸭的亲缘关系比和真正的雁更近。古埃及人视它为神圣的鸟。'
      },
      crop: [1660, 985, 220],
      parts: [{ rect: [1618, 930, 84, 112] }]
    },
    {
      id: 'oxpecker', name: 'Oxpecker', latin: 'Genus Buphagus',
      clue: 'Tiny birds hitching a ride on the big animals.',
      fact: 'Oxpeckers pick ticks and other bugs off big animals, and hiss loudly when danger comes close, which warns the animal they sit on.',
      zh: {
        name: '牛椋鸟',
        latin: '牛椋鸟属 Buphagus',
        clue: '搭便车的小鸟，趴在大型动物身上。',
        fact: '牛椋鸟啄食大型动物身上的蜱虫和其他小虫，危险靠近时还会大声嘶叫，向它们栖身的动物报警。'
      },
      crop: [568, 738, 170],
      parts: [{ rect: [548, 718, 40, 40] }, { rect: [936, 652, 30, 32] }, { rect: [884, 832, 40, 32] }, { rect: [952, 822, 38, 48] }]
    },
    {
      id: 'wagtail', name: 'Pied wagtail', latin: 'Genus Motacilla',
      clue: 'Look for something small, black and white, near the water.',
      fact: 'Wagtails bob their tails up and down almost constantly, and nobody is completely sure why.',
      zh: {
        name: '鹡鸰',
        latin: '鹡鸰属 Motacilla',
        clue: '找一只黑白相间的小鸟，就在水边。',
        fact: '鹡鸰几乎一刻不停地上下摆动尾巴，至今没有人完全弄清原因。'
      },
      crop: [1534, 674, 150],
      parts: [{ rect: [1512, 656, 48, 38] }, { rect: [752, 600, 34, 28] }]
    }
  ];

  const $ = id => document.getElementById(id);
  const T = (key, vars) => I18N.t(key, vars);
  const txt = (a, field) => I18N.pick(a, field);
  const stage = $('stage'), marksEl = $('marks'), statusEl = $('status'), countEl = $('foundCount');
  const slotsEl = $('slots'), completeEl = $('complete'), hintBtn = $('hintBtn');

  const state = {};                  // animal id -> 'hidden' | 'found' | 'shown'
  const overlays = [];               // things drawn on the photo: { el, box, sized }
  let misses = 0, foundNow = 0;
  let lastMsg = { key: 'start', animal: null };   // the message on screen, kept as a key so it can change language

  // ---------- zoom ----------
  let view = null;                   // set just below; layout() can run while Zoom.attach is still starting up
  view = Zoom.attach(stage, { width: W, height: H, onChange: layout });

  const hudText = document.createElement('span');
  const hudHint = document.createElement('button');
  hudHint.type = 'button';
  hudHint.className = 'btn';
  view.hud.append(hudText, hudHint);     // shown on the photo when it is full screen

  // Put every mark where its animal is, for the current zoom and pan.
  function layout() {
    if (!view) return;
    const u = view.unit();
    overlays.forEach(o => {
      const c = view.toScreen(o.box.x + o.box.w / 2, o.box.y + o.box.h / 2);
      o.el.style.left = c.x + 'px';
      o.el.style.top = c.y + 'px';
      if (o.sized) {
        o.el.style.width = o.box.w * u + 'px';
        o.el.style.height = o.box.h * u + 'px';
      }
    });
  }

  // ---------- geometry ----------
  function boxOf(part) {
    if (part.rect) { const [x, y, w, h] = part.rect; return { x, y, w, h }; }
    const xs = part.poly.map(p => p[0]), ys = part.poly.map(p => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  function insidePoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    const t = len2 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function distToPart(x, y, part, minSide) {
    if (part.rect) {
      const b = boxOf(part);
      const w = Math.max(b.w, minSide), h = Math.max(b.h, minSide);
      const dx = Math.max(Math.abs(x - (b.x + b.w / 2)) - w / 2, 0);
      const dy = Math.max(Math.abs(y - (b.y + b.h / 2)) - h / 2, 0);
      return Math.hypot(dx, dy);
    }
    if (insidePoly(x, y, part.poly)) return 0;
    let best = Infinity;
    for (let i = 0, j = part.poly.length - 1; i < part.poly.length; j = i++) {
      best = Math.min(best, distToSegment(x, y, part.poly[j][0], part.poly[j][1], part.poly[i][0], part.poly[i][1]));
    }
    return best;
  }
  // Smallest matching target wins, so a bird on a hippo counts as the bird.
  // `scale` is screen pixels per photo pixel, so tap targets stay the same size on screen at any zoom.
  function animalAt(x, y, scale) {
    const minSide = MIN_TARGET_PX / scale, slop = SLOP_PX / scale;
    let best = null;
    for (const a of ANIMALS) {
      for (const p of a.parts) {
        if (distToPart(x, y, p, minSide) <= slop) {
          const b = boxOf(p), area = b.w * b.h;
          if (!best || area < best.area) best = { a, area };
        }
      }
    }
    return best && best.a;
  }

  // ---------- drawing ----------
  function addOverlay(el, box, sized) {
    marksEl.appendChild(el);
    const o = { el, box, sized };
    overlays.push(o);
    layout();
    return o;
  }
  function dropOverlay(o) {
    o.el.remove();
    const i = overlays.indexOf(o);
    if (i >= 0) overlays.splice(i, 1);
  }
  function placeMarks(a, st, isNew) {
    overlays.filter(o => o.animal === a).forEach(dropOverlay);
    const n = ANIMALS.indexOf(a) + 1;
    a.parts.forEach(p => {
      const el = document.createElement('div');
      el.className = 'mark' + (isNew ? ' new' : '');
      el.dataset.state = st;
      el.innerHTML = '<i></i><i></i><i></i><i></i><b>' + n + '</b>';
      addOverlay(el, boxOf(p), true).animal = a;
    });
  }
  function cropCss(c) {
    const w = c[2], h = w * 0.75;
    const x = Math.min(W - w, Math.max(0, c[0] - w / 2));
    const y = Math.min(H - h, Math.max(0, c[1] - h / 2));
    return 'background-image:url(' + PHOTO + ');background-size:' + (W / w * 100) + '% auto;' +
           'background-position:' + (x / (W - w) * 100) + '% ' + (y / (H - h) * 100) + '%';
  }
  function renderSlot(a) {
    const li = $('slot-' + a.id), st = state[a.id];
    const thumb = li.querySelector('.slot-thumb'), tag = li.querySelector('.slot-tag');
    const title = li.querySelector('.slot-title'), latin = li.querySelector('.slot-latin');
    const text = li.querySelector('.slot-text'), btn = li.querySelector('.link-btn');
    li.dataset.state = st;
    btn.textContent = T('spot.show');
    if (st === 'hidden') {
      thumb.removeAttribute('style');
      tag.hidden = true; latin.hidden = true; btn.hidden = false;
      title.textContent = T('spot.notFound');
      text.textContent = T('spot.clue', { clue: txt(a, 'clue') });
    } else {
      thumb.style.cssText = cropCss(a.crop);
      tag.hidden = false; latin.hidden = false; btn.hidden = true;
      tag.textContent = T(st === 'found' ? 'spot.tagFound' : 'spot.tagShown');
      title.textContent = txt(a, 'name');
      latin.textContent = txt(a, 'latin');
      text.textContent = txt(a, 'fact');
    }
  }

  // The status line is kept as { key, animal } so it can be shown again in another language.
  function msgText() {
    const a = lastMsg.animal;
    let name = a ? txt(a, 'name') : '';
    if (lastMsg.key === 'already' && I18N.lang === 'en') name = name.toLowerCase();
    return T('spot.msg.' + lastMsg.key, { name });
  }
  function renderStatus() {
    const text = msgText();
    statusEl.textContent = text;
    hudText.textContent = T('spot.hud', { found: foundNow, total: ANIMALS.length, msg: text });
    hudHint.textContent = T('spot.hudHint');
  }
  function say(key, animal) { lastMsg = { key, animal: animal || null }; renderStatus(); }

  function update() {
    const total = ANIMALS.length;
    const found = ANIMALS.filter(a => state[a.id] === 'found').length;
    const done = ANIMALS.filter(a => state[a.id] !== 'hidden').length;
    foundNow = found;
    countEl.textContent = found;
    hintBtn.disabled = hudHint.disabled = done === total;
    renderStatus();
    if (done < total) { completeEl.hidden = true; return; }
    completeEl.hidden = false;
    if (found === total) {
      $('completeTitle').textContent = T('spot.completeAll');
      $('completeText').textContent = misses === 0
        ? T('spot.perfect')
        : T(misses === 1 ? 'spot.sharp.one' : 'spot.sharp.many', { n: misses });
    } else {
      $('completeTitle').textContent = T('spot.completePart');
      $('completeText').textContent = T('spot.partText', { f: found, r: total - found });
    }
  }

  // ---------- actions ----------
  function reveal(a, st) {
    if (state[a.id] !== 'hidden') return;
    state[a.id] = st;
    placeMarks(a, st, true);
    renderSlot(a);
    update();
    say(st === 'found' ? 'found' : 'shown', a);
  }

  stage.addEventListener('click', e => {
    if (e.target.closest('.zoom-ctl, .zoom-hud') || view.wasDrag()) return;   // a drag is not a guess
    const p = view.toImage(e.clientX, e.clientY);
    if (!p.inside) return;
    const a = animalAt(p.x, p.y, p.scale);
    if (!a) {
      misses++;
      const el = document.createElement('div');
      el.className = 'miss';
      el.style.left = p.px + 'px';
      el.style.top = p.py + 'px';
      marksEl.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
      say('miss');
    } else if (state[a.id] !== 'hidden') {
      say('already', a);
    } else {
      reveal(a, 'found');
    }
  });

  function hint() {
    const left = ANIMALS.filter(a => state[a.id] === 'hidden');
    if (!left.length) return;
    const a = left[Math.floor(Math.random() * left.length)];
    const b = boxOf(a.parts[Math.floor(Math.random() * a.parts.length)]);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const at = view.toScreen(cx, cy), size = view.size();
    if (at.x < 0 || at.y < 0 || at.x > size.w || at.y > size.h) view.reset();   // zoomed somewhere else: zoom out first
    const el = document.createElement('div');
    el.className = 'pulse';
    const o = addOverlay(el, { x: cx, y: cy, w: 0, h: 0 }, false);
    el.addEventListener('animationend', () => dropOverlay(o));
    say('hint');
  }
  hintBtn.addEventListener('click', hint);
  hudHint.addEventListener('click', hint);

  function reset() {
    misses = 0;
    overlays.slice().forEach(dropOverlay);
    ANIMALS.forEach(a => { state[a.id] = 'hidden'; renderSlot(a); });
    lastMsg = { key: 'start', animal: null };
    update();
  }
  $('resetBtn').addEventListener('click', reset);
  $('againBtn').addEventListener('click', () => { reset(); view.reset(); stage.scrollIntoView({ block: 'start' }); });

  // ---------- build the six cards ----------
  ANIMALS.forEach((a, i) => {
    const li = document.createElement('li');
    li.className = 'slot';
    li.id = 'slot-' + a.id;
    li.innerHTML =
      '<div class="slot-thumb"><span class="n" aria-hidden="true">' + (i + 1) + '</span><span class="slot-tag" hidden></span></div>' +
      '<div class="slot-body"><h3 class="slot-title"></h3><p class="slot-latin" hidden></p><p class="slot-text"></p>' +
      '<button class="link-btn" type="button"></button></div>';
    li.querySelector('.link-btn').addEventListener('click', () => reveal(a, 'shown'));
    slotsEl.appendChild(li);
  });
  reset();

  // Switching language keeps the game as it is and just redraws the words.
  I18N.onChange(() => { ANIMALS.forEach(renderSlot); update(); });
})();
