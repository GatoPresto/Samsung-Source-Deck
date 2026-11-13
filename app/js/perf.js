// Slide-switch timing for the real TV (Settings > Debug > Slide timing turns the readout on and off; the choice is remembered).
// After each Left/Right move, top right: render = time of render() with its parts (lap marks); first frame = when the new slide was drawn;
// slow frames = every frame over 34 ms in the next 600 ms as length@time (a long one right after the key is the switch itself, later ones are the glides);
// later = content built after the switch (settle). Costs nothing while off.
import { loadJson, saveJson } from "./state.js";

let on = !!loadJson("deck-perf");
let box = null, laps = [], lapAt = 0, late = [], startedAt = 0;

const readout = () => {
  if (!box) {
    box = document.createElement("div");
    box.style.cssText = "position:fixed;top:10px;right:14px;z-index:99;max-width:60vw;padding:6px 12px;border-radius:8px;background:#000c;color:#7dff9a;font:600 20px/1.3 monospace;pointer-events:none;white-space:pre-wrap";
    document.body.appendChild(box);
  }
  return box;
};

export const perfOn = () => on;

/** Settings row: Off <-> On. */
export function toggleTiming() {
  on = !on;
  saveJson("deck-perf", on ? 1 : null);
  if (on) { readout().textContent = "timing on: move between slides"; readout().hidden = false; } else if (box) box.hidden = true;
}

/** Work that ran after the switch itself (the settled content of the slide): shown at the end of the readout. */
export function noteLate(name, ms) { if (on) late.push(name + " " + ms.toFixed(0) + " ms @ " + Math.round(performance.now() - startedAt)); }

/** Mark the end of a part of the work being timed (render() calls this between its steps). */
export function lap(name) {
  if (!on) return;
  const now = performance.now();
  laps.push(name + " " + (now - lapAt).toFixed(0));
  lapAt = now;
}

/** Run fn (a slide switch); when the readout is on, measure it. */
export function probe(fn) {
  if (!on) { fn(); return; }
  laps = []; late = [];
  const t0 = lapAt = startedAt = performance.now();
  fn();
  const js = performance.now() - t0;
  const parts = laps.join(" · ");
  const frames = [];
  let last = t0;
  const step = () => {
    const now = performance.now();
    frames.push({ms: Math.max(0, Math.round(now - last)), at: Math.round(now - t0)});
    last = now;
    if (now - t0 < 600) requestAnimationFrame(step);
    else {
      const slow = frames.filter(f => f.ms > 34);
      readout().textContent = "render " + js.toFixed(0) + " ms: " + parts + "\nfirst frame " + (frames[0] ? frames[0].at : 0) + " ms after the key\nslow frames (length @ time after the key): " + (slow.map(f => f.ms + "@" + f.at).join("  ") || "none") + "\nlater: " + (late.join(" · ") || "-") + "";
    }
  };
  requestAnimationFrame(step);
}
