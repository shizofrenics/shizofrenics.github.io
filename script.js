// Void: the star is drawn by hand anew on every visit and on every press;
// the works are rows the visitor pulls sideways.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- the star ---------- */

// Seeded random, so one seed always gives the same star.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Four rays like the reference: the top one leans right, the bottom one is shortest.
const RAYS = [
  { angle: -74, length: 96 },
  { angle: 4, length: 84 },
  { angle: 101, length: 74 },
  { angle: 183, length: 82 },
];

function makeStar(seed) {
  const rand = mulberry32(seed);
  const between = (a, b) => a + (b - a) * rand();
  const point = (angle, radius) => {
    const r = (angle * Math.PI) / 180;
    return [Math.cos(r) * radius, Math.sin(r) * radius];
  };
  const tip = (i) => {
    const ray = RAYS[i % 4];
    return point(ray.angle + between(-7, 7), ray.length * between(0.8, 1.16));
  };
  // the point the line between two rays dips to, close to the centre, so the rays stay thin
  const waist = (i) => {
    const a = RAYS[i % 4].angle;
    let b = RAYS[(i + 1) % 4].angle;
    if (b < a) b += 360;
    return point((a + b) / 2 + between(-16, 16), between(13, 30));
  };
  // a nearly straight side from p to q, bowed a little towards the centre
  const side = (p, q) => {
    const k = between(0.8, 1);
    return [((p[0] + q[0]) / 2) * k, ((p[1] + q[1]) / 2) * k];
  };
  const f = (n) => n.toFixed(1);
  const paths = [];
  const count = Math.round(between(24, 32));

  for (let s = 0; s < count; s++) {
    const kind = rand();
    if (kind < 0.18) {
      // a quick stroke along one ray, from near the centre out past the tip
      const i = Math.floor(rand() * 4);
      const p0 = point(RAYS[i].angle + between(-40, 40), between(0, 14));
      const p2 = tip(i);
      const c = point(RAYS[i].angle + between(-5, 5), RAYS[i].length * between(0.35, 0.6));
      paths.push(`M${f(p0[0])} ${f(p0[1])} Q${f(c[0])} ${f(c[1])} ${f(p2[0])} ${f(p2[1])}`);
      continue;
    }
    if (kind < 0.3) {
      // a long stroke straight through the middle, from one ray to the opposite one
      const i = Math.floor(rand() * 4);
      const p0 = tip(i).map((v) => v * between(0.55, 1));
      const p2 = tip(i + 2).map((v) => v * between(0.55, 1));
      const c = point(between(0, 360), between(0, 12));
      paths.push(`M${f(p0[0])} ${f(p0[1])} Q${f(c[0])} ${f(c[1])} ${f(p2[0])} ${f(p2[1])}`);
      continue;
    }
    // the outline: from one tip in to the waist by the centre and out to the next tip
    let i = Math.floor(rand() * 4);
    const steps = Math.round(between(1, 3.4));
    let p0 = tip(i);
    let d = `M${f(p0[0])} ${f(p0[1])}`;
    for (let k = 0; k < steps; k++) {
      const m = waist(i);
      i += 1;
      const p2 = tip(i);
      const c1 = side(p0, m);
      const c2 = side(m, p2);
      d += ` Q${f(c1[0])} ${f(c1[1])} ${f(m[0])} ${f(m[1])} Q${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
      p0 = p2;
    }
    paths.push(d);
  }
  return paths.map((d) => {
    const width = between(0.45, 1.05).toFixed(2);
    const opacity = between(0.6, 1).toFixed(2);
    return `<path d="${d}" stroke-width="${width}" opacity="${opacity}"/>`;
  }).join('');
}

const starButton = document.querySelector('.star');
const starGroup = document.querySelector('.star-lines');

function drawStar(animate) {
  if (!starGroup) return;
  starGroup.innerHTML = makeStar(Math.floor(Math.random() * 1e9));
  if (!animate || reduceMotion) return;
  const paths = starGroup.querySelectorAll('path');
  paths.forEach((p, n) => {
    const len = Math.ceil(p.getTotalLength());
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: 520 + Math.random() * 380, delay: n * 34, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
    );
  });
}

if (starButton) {
  drawStar(true);
  starButton.addEventListener('click', () => drawStar(true));
}

/* ---------- entrances: once, never leaving content hidden ---------- */

(() => {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  // stagger the rows of the skills list
  document.querySelectorAll('.lineup tbody tr').forEach((row, n) => row.style.setProperty('--i', n));
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  targets.forEach((el) => io.observe(el));
  window.addEventListener('load', () => setTimeout(() => {
    targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); });
  }, 2500));
})();

/* ---------- the works: one lit slide, neighbours dim, pulled sideways ---------- */

document.querySelectorAll('.strip').forEach((strip) => {
  const slides = [...strip.querySelectorAll('.slide')];

  const markCentre = () => {
    const mid = strip.getBoundingClientRect().left + strip.clientWidth / 2;
    let best = null; let bestDist = Infinity;
    slides.forEach((s) => {
      const r = s.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - mid);
      if (dist < bestDist) { bestDist = dist; best = s; }
    });
    slides.forEach((s) => s.classList.toggle('is-center', s === best));
  };

  // start on the second picture, so a neighbour shows on both sides
  const startAt = () => {
    if (slides.length > 2) {
      const s = slides[1];
      strip.scrollLeft = s.offsetLeft - (strip.clientWidth - s.clientWidth) / 2;
    }
    markCentre();
  };
  startAt();
  window.addEventListener('load', startAt);

  let ticking = false;
  strip.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { markCentre(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', markCentre);

  // the browser's own drag of a link or picture would steal the gesture from the row
  strip.addEventListener('dragstart', (e) => e.preventDefault());
  slides.forEach((s) => {
    s.setAttribute('draggable', 'false');
    s.querySelector('img')?.setAttribute('draggable', 'false');
  });

  // drag with a mouse; touch and trackpads scroll natively
  let downX = 0; let startLeft = 0; let moved = false; let pointerId = null;
  strip.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    pointerId = e.pointerId; downX = e.clientX; startLeft = strip.scrollLeft; moved = false;
  });
  strip.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - downX;
    if (!moved && Math.abs(dx) > 6) {
      moved = true;
      strip.classList.add('is-dragging');
      strip.setPointerCapture(pointerId);
    }
    if (moved) strip.scrollLeft = startLeft - dx;
  });
  const release = () => {
    if (pointerId === null) return;
    pointerId = null;
    if (!moved) return;
    strip.classList.remove('is-dragging');
    // let snapping settle on the nearest picture
    const target = slides.find((s) => s.classList.contains('is-center'));
    if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  };
  strip.addEventListener('pointerup', release);
  strip.addEventListener('pointercancel', release);
  // a drag is not a click
  strip.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
});
