// Horizontal rows (the thumbnail strip, the feed rows): scroll only when the chosen item reaches the edge, and scroll smoothly.
// No imports: cursor.js and glass.js use it.

const anims = new WeakMap();   // scroller -> {to, raf}
const frameHooks = [];         // called after every animation frame (the focus ring follows the moving item, the edge fades update)
export const scrolling = {active: false};

export const onScrollFrame = fn => frameHooks.push(fn);

/** Scroll `el` to `to` (px) in `ms` milliseconds with an ease-out curve; a new call during a scroll continues from where it is. */
export function smoothScrollTo(el, to, ms = 170) {
  if (document.documentElement.dataset.motion === "off") { el.scrollLeft = to; frameHooks.forEach(fn => fn()); return; }   // Settings > Smooth motion: off
  const old = anims.get(el);
  if (old) stop(old);
  const from = el.scrollLeft, started = performance.now(), rec = {to, raf: 0, timer: 0};
  anims.set(el, rec);
  scrolling.active = true;
  const finish = () => { el.scrollLeft = to; anims.delete(el); scrolling.active = false; stop(rec); frameHooks.forEach(fn => fn()); };
  const step = now => {
    const p = Math.min(1, (now - started) / ms), eased = 1 - Math.pow(1 - p, 3);
    if (p >= 1) { finish(); return; }
    el.scrollLeft = from + (to - from) * eased;
    frameHooks.forEach(fn => fn());
    rec.raf = requestAnimationFrame(step);
  };
  rec.raf = requestAnimationFrame(step);
  rec.timer = setTimeout(() => { if (anims.get(el) === rec) finish(); }, ms + 80);   // safety net when animation frames are paused (the page is in the background)
}
const stop = rec => { cancelAnimationFrame(rec.raf); clearTimeout(rec.timer); };

/**
 * Bring `child` into view inside the row `scroller`, scrolling as little as possible and only if it is not fully visible
 * (`margin` px are kept free on a side that has more content, where the row fades out). instant = no animation (first draw, rebuilt rows).
 */
export function revealX(scroller, child, {margin = 70, instant = false} = {}) {
  const view = scroller.clientWidth, max = Math.max(0, scroller.scrollWidth - view);
  const pending = anims.get(scroller);
  const current = pending ? pending.to : scroller.scrollLeft;   // keys pressed quickly build on the scroll already under way
  const box = child.getBoundingClientRect(), row = scroller.getBoundingClientRect();
  const left = box.left - row.left + scroller.scrollLeft, right = left + box.width;
  let to = current;
  if (left < current + margin) to = left - margin;
  else if (right > current + view - margin) to = right - view + margin;
  to = Math.max(0, Math.min(max, Math.round(to)));
  if (to === Math.round(current)) return;
  if (instant) {
    if (pending) { stop(pending); anims.delete(scroller); scrolling.active = false; }
    scroller.scrollLeft = to;
  } else smoothScrollTo(scroller, to);
}
