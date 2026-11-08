// Liquid Glass lens: a live refractive glass element, using the same optics as the open-source "liquid-glass.js" (liquidglass.dev, MIT), re-implemented compactly.
//  1. A displacement map is painted into a canvas from the lens shape (rounded rectangle). For each pixel inside the rim ("bezel") the surface slope gives a refracted ray
//     (Snell's law), so the red/green channels hold how far the backdrop is bent and the blue channel holds a specular rim highlight; alpha is the lens coverage.
//  2. An SVG filter applies that map with feDisplacementMap three times (red/green/blue bend by slightly different amounts = colour fringing), adds the rim highlight,
//     and is used as `backdrop-filter: url(#id)` so the glass bends whatever is behind it (Chromium, which the TV's browser is).
// Used by the Apple Music Liquid Glass theme (#glassLens). One element only, so the TV stays smooth.
import { cursorHooks } from "./cursor.js";

const NS = "http://www.w3.org/2000/svg";

const DEFAULTS = {
  radius: 84, refraction: 30, bezel: 0.55, curvature: 4, ior: 1.5,
  chroma: 0.12, specular: 0.55, specularWidth: 3, lightAngle: -120,
};

/** Normalised bend profile along the rim: index 0 = at the rim (strongest), 1 = bezel inner edge (none). */
function profile(curvature, ior, n = 256) {
  const table = new Float32Array(n + 1);
  let max = 0;
  for (let i = 0; i <= n; i++) {
    const s = Math.min(i / n, 1 - 1e-6);
    const a = Math.pow(1 - s, curvature);
    const slope = Math.pow(1 - s, curvature - 1) * Math.pow(Math.max(1 - a, 1e-9), 1 / curvature - 1);
    const theta = Math.atan(slope);
    const bend = Math.tan(theta - Math.asin(Math.sin(theta) / ior));
    table[i] = bend;
    if (bend > max) max = bend;
  }
  for (let i = 0; i <= n; i++) table[i] /= max || 1;
  table[n] = 0;
  return table;
}

/** Paint the displacement map for a w x h rounded rectangle; returns a PNG data URL. */
function lensMap(w, h, o) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(w, h);
  const px = image.data;
  const hw = w / 2, hh = h / 2;
  const r = Math.min(o.radius, hw, hh);
  const bezel = Math.max(1, o.bezel * Math.min(hw, hh));
  const table = profile(o.curvature, o.ior);
  const N = table.length - 1;
  const angle = o.lightAngle * Math.PI / 180, lx = Math.cos(angle), ly = Math.sin(angle);
  // signed distance to the rounded rectangle (negative inside)
  const dist = (x, y) => {
    const qx = Math.abs(x - hw) - (hw - r), qy = Math.abs(y - hh) - (hh - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const x = i + 0.5, y = j + 0.5;
      const d = dist(x, y);
      const k = (j * w + i) * 4;
      if (d >= 0.5) continue;                    // outside: stays transparent
      const alpha = Math.min(1, 0.5 - d);        // anti-aliased edge
      const depth = -d;
      let rr = 128, gg = 128, bb = 0;
      // outward surface normal from the distance gradient
      const nx = dist(x + 0.5, y) - dist(x - 0.5, y), ny = dist(x, y + 0.5) - dist(x, y - 0.5);
      const len = Math.hypot(nx, ny) || 1;
      const ux = nx / len, uy = ny / len;
      if (depth < bezel) {
        const bend = table[Math.min(N, Math.floor(depth / bezel * N))];
        rr = 128 - ux * bend * 127;              // sample from further inside: convex lens (magnifies)
        gg = 128 - uy * bend * 127;
      }
      if (depth < o.specularWidth) {
        const t = 1 - depth / o.specularWidth;
        bb = 255 * Math.min(1, o.specular * t * t * (0.35 + 0.65 * Math.max(0, ux * lx + uy * ly)) * 2);
      }
      px[k] = rr; px[k + 1] = gg; px[k + 2] = bb; px[k + 3] = alpha * 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function el(name, attrs, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

/**
 * Create (or replace) the SVG filter `id` for a w x h glass shape inside the hidden <svg id="glassDefs">.
 * `pad` enlarges the filter region (needed when it is used as `filter:` so shadows/outlines are not clipped). chroma 0 = one displacement pass instead of three (cheaper).
 */
export function installLensFilter(id, w, h, options = {}, pad = 0) {
  const o = {...DEFAULTS, ...options};
  const defs = document.getElementById("glassDefs");
  defs.querySelector("#" + id)?.remove();
  const filter = el("filter", {id, x: -pad, y: -pad, width: w + 2 * pad, height: h + 2 * pad, filterUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB"}, defs);
  el("feFlood", {"flood-color": "rgb(128,128,128)", result: "neutral"}, filter);
  const img = el("feImage", {x: 0, y: 0, width: w, height: h, preserveAspectRatio: "none", result: "mapImg"}, filter);
  const url = lensMap(w, h, o);
  img.setAttribute("href", url);
  img.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", url);
  const merge = el("feMerge", {result: "map"}, filter);
  el("feMergeNode", {in: "neutral"}, merge);
  el("feMergeNode", {in: "mapImg"}, merge);
  const scale = o.refraction * 2;
  if (o.chroma > 0) {
    // one displaced copy per colour channel, each bending a little differently (colour fringing)
    [["R", scale * (1 - o.chroma), "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"],
     ["G", scale, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"],
     ["B", scale * (1 + o.chroma), "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"]].forEach(([ch, s, matrix]) => {
      el("feDisplacementMap", {in: "SourceGraphic", in2: "map", scale: s, xChannelSelector: "R", yChannelSelector: "G", result: "d" + ch}, filter);
      el("feColorMatrix", {in: "d" + ch, type: "matrix", values: matrix, result: "c" + ch}, filter);
    });
    el("feBlend", {in: "cR", in2: "cG", mode: "screen", result: "rg"}, filter);
    el("feBlend", {in: "rg", in2: "cB", mode: "screen", result: "rgb"}, filter);
  } else {
    el("feDisplacementMap", {in: "SourceGraphic", in2: "map", scale, xChannelSelector: "R", yChannelSelector: "G", result: "rgb"}, filter);
  }
  // specular rim: white with alpha taken from the map's blue channel
  el("feColorMatrix", {in: "mapImg", type: "matrix", values: "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 1 0 0", result: "spec"}, filter);
  el("feComposite", {in: "spec", in2: "rgb", operator: "over"}, filter);
}

// ---- glass on many elements ----
// Two ways to apply the same optics:
//  - "backdrop": `backdrop-filter: url(#id)` bends what is BEHIND a translucent element (buttons, chips, the lens).
//  - "own":      `filter: url(#id)` bends the element's OWN pixels at the rim (album art on cards, tile art), good for opaque elements.
// To keep the TV smooth only elements that are on screen get the filter, and only the one under the cursor (and the playing card) gets the 3-pass colour-fringed version.
const cache = new Map();
let counter = 0;
const optionsFor = (kind, hot) => ({radius: 0, refraction: kind === "own" ? 22 : kind === "ring" ? 20 : 16, bezel: kind === "own" ? 0.4 : kind === "ring" ? 0.8 : 0.7, curvature: 4, ior: 1.5, chroma: hot ? 0.09 : 0, specular: 0.6, specularWidth: 2.5, lightAngle: -120});

function filterId(w, h, radius, kind, hot) {
  const key = [w, h, Math.round(radius), kind, hot ? 1 : 0].join("x");
  let id = cache.get(key);
  if (!id) {
    id = "lg-" + (++counter);
    installLensFilter(id, w, h, {...optionsFor(kind, hot), radius}, kind === "own" ? 24 : 0);
    cache.set(key, id);
  }
  return id;
}

function setGlass(node, mode, kind, hot) {
  const w = node.offsetWidth, h = node.offsetHeight;
  if (w < 8 || h < 8) return;
  const radius = Math.min(parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0, h / 2, w / 2);
  const id = filterId(w, h, radius, kind === "own" ? "own" : "back", hot);
  if (mode === "backdrop") {
    const css = "url(#" + id + ") saturate(1.7)";
    if (node.style.backdropFilter !== css) { node.style.backdropFilter = css; node.style.webkitBackdropFilter = css; }
  } else {
    const css = "url(#" + id + ")";
    if (node.style.filter !== css) node.style.filter = css;
  }
  if (node.dataset.lg !== "1") node.dataset.lg = "1";   // identical writes still count as DOM mutations
}

function clearGlass(node) {
  if (!node.dataset.lg) return;
  node.style.filter = ""; node.style.backdropFilter = ""; node.style.webkitBackdropFilter = "";
  delete node.dataset.lg;
}

const visibleIn = (node, box) => {
  const r = node.getBoundingClientRect();
  return r.right > box.left + 4 && r.left < box.right - 4;
};

/**
 * Apply (or remove) glass. `glass` in sources.js picks the quality:
 *   "quality" (default) = every visible button and tab chip gets the full effect (3-pass colour fringe). Cards and tiles are NOT glass (removed on request). It is STATIC: the highlight is a separate floating ring (#focusRing),
 *                         so moving focus never touches a glass element; the filters only redraw when the content or scroll position changes.
 *   "focus"             = real refraction only on the highlighted button/chip (lighter)   ·   "lens" = only the big lens
 */
export function refreshGlass() {
  const on = isGlassTheme();
  const level = (window.sourceDeck && window.sourceDeck.glass) || "quality";
  const live = document.querySelectorAll("[data-lg]");
  placeRing(on);
  if (!on || level === "lens") { live.forEach(clearGlass); return; }
  const wanted = new Set();
  const take = (node, mode, kind, hot) => { wanted.add(node); setGlass(node, mode, kind, hot); };
  if (level === "focus") {
    document.querySelectorAll("#subs .cur, footer .cur, #musicOpen.cur").forEach(node => take(node, "backdrop", "back", true));
  } else {
    const rows = {subs: document.getElementById("subs").getBoundingClientRect()};
    document.querySelectorAll("#deck footer button:not([hidden]), #musicOpen").forEach(node => take(node, "backdrop", "back", true));
    document.querySelectorAll("#subs > *").forEach(node => { if (visibleIn(node, rows.subs)) take(node, "backdrop", "back", true); });
  }
  live.forEach(node => { if (!wanted.has(node)) clearGlass(node); });
}

const OVERLAYS = ["widgetsView", "settingsView", "bgView", "themeView", "browser", "arrangeView", "searchView"];
const isGlassTheme = () => document.getElementById("deck").dataset.theme === "applemusicglass";

/** Where the highlight is: inside an open overlay list (theme picker, media browser, Arrange, search) or on the main screen. */
function ringTarget() {
  for (const id of OVERLAYS) {
    const overlay = document.getElementById(id);
    // the picture grid of "Change background" gets no bubble (it would blur the picture you are choosing); the tile has its own outline
    if (overlay && !overlay.hidden) return {node: overlay.dataset.view === "grid" ? null : overlay.querySelector(".cur"), ctx: "overlay"};
  }
  return {node: document.querySelector("#strip .cur, #vids .cur, #subs .cur, footer .cur, #musicOpen.cur"), ctx: "main"};
}

/**
 * The highlight is ONE floating glass bubble above the UI (#focusRing): it glides to the focused element (CSS transition), is slightly larger than it, and refracts what is under it
 * with its own live filter. Moving it repaints only the bubble, never a filtered element. Style writes are skipped when nothing changed.
 */
function placeRing(on) {
  const ring = document.getElementById("focusRing");
  const {node: target, ctx} = on ? ringTarget() : {node: null, ctx: ""};
  const set = (prop, value) => { if (ring.style[prop] !== value) ring.style[prop] = value; };
  if (!target) { set("display", "none"); return; }
  // appearing, or jumping between the main screen and an overlay: place it without gliding across the screen
  const jump = ring.style.display !== "block" || ring.dataset.ctx !== ctx;
  if (jump) ring.style.transition = "none";
  ring.dataset.ctx = ctx;
  const deck = document.getElementById("deck").getBoundingClientRect();
  const r = target.getBoundingClientRect();
  const grow = 7;
  const w = Math.round(r.width + 2 * grow), h = Math.round(r.height + 2 * grow);
  const radius = Math.min((parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0) + grow, h / 2, w / 2);
  set("display", "block");
  set("width", w + "px"); set("height", h + "px"); set("borderRadius", radius + "px");
  set("transform", "translate(" + Math.round(r.left - deck.left - grow) + "px," + Math.round(r.top - deck.top - grow) + "px)");
  // the filter cost grows with the area it bends: big bubbles (wide list rows) use the single-pass version, small ones keep the colour fringe
  const css = "url(#" + filterId(w, h, radius, "ring", w * h < 40000) + ") saturate(1.5)";
  if (ring.style.backdropFilter !== css) { ring.style.backdropFilter = css; ring.style.webkitBackdropFilter = css; }
  if (jump) { void ring.offsetWidth; ring.style.transition = ""; }
}

/** Overlay lists call this after they move their cursor (they do not go through drawCursor). */
export function syncRing() { placeRing(isGlassTheme()); }

let lensReady = false;
/** Called by render(): set up the lens the first time the Liquid Glass theme is shown. */
export function updateGlass(theme) {
  if (theme !== "applemusicglass" || lensReady) return;
  const lens = document.getElementById("glassLens");
  const w = 300, h = 300;
  try {
    installLensFilter("lg-lens", w, h, {radius: 84});
    const css = "url(#lg-lens) saturate(1.15)";
    lens.style.backdropFilter = css;
    lens.style.webkitBackdropFilter = css;
    lensReady = true;
  } catch (error) {}
}

cursorHooks.push(refreshGlass);   // runs after every cursor/selection change (and after lists are rebuilt)
