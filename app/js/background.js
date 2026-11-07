// Background pictures for the slides. A picture can be assigned to one source (prefs.bg.map[sourceId]) or to all sources (prefs.bg.all).
// The image sits in #bgImage above the theme's own art and below the content, with a dark/light scrim (#bgScrim) so text stays readable.
// Pictures are stored in IndexedDB (bgstore.js); only pictures that are assigned somewhere are kept, everything else is deleted (gc()).
import { byId, deck } from "./dom.js";
import { prefs, savePrefs } from "./prefs.js";
import { bgGet, bgAll, bgDelete } from "./bgstore.js";

export const DIM_LEVELS = [{label: "None", value: 0}, {label: "Light", value: 0.25}, {label: "Medium", value: 0.45}, {label: "Strong", value: 0.65}];
const DEFAULT_DIM = 2;   // Medium

export function bgPrefs() {
  if (!prefs.bg) prefs.bg = {map: {}, all: null, dim: DEFAULT_DIM, scope: "source", dv: 2};
  if (prefs.bg.dv !== 2) { prefs.bg.dim = Math.min((prefs.bg.dim || 0) + 1, DIM_LEVELS.length - 1); prefs.bg.dv = 2; }   // "None" was added in front
  return prefs.bg;
}

/** The picture key in effect for a source: its own, else the "all sources" one, else none. */
export const keyFor = card => { const b = prefs.bg; return b ? (card && b.map[card.id]) || b.all || null : null; };

const urls = new Map();            // key -> {url, credit, creditUrl}: object URLs of the pictures in use
let shown, token = 0;           // shown: key on screen (null = none); undefined = unknown, redraw

async function load(key) {
  if (urls.has(key)) return urls.get(key);
  const record = await bgGet(key);
  if (!record) return null;
  const info = {url: URL.createObjectURL(record.blob), credit: record.credit || "", creditUrl: record.creditUrl || ""};
  urls.set(key, info);
  return info;
}

/** Called by render(): show the picture that belongs to the selected source (cheap when nothing changes). */
export async function applyBackground(card) {
  const b = prefs.bg && bgPrefs();
  const dim = DIM_LEVELS[b ? b.dim : DEFAULT_DIM]?.value ?? 0.45;
  if (deck.style.getPropertyValue("--bg-dim") !== String(dim)) deck.style.setProperty("--bg-dim", String(dim));
  const key = keyFor(card);
  if (key === shown) return;
  shown = key;
  const mine = ++token;
  const image = byId("bgImage"), credit = byId("bgCredit");
  if (!key) { image.hidden = true; image.style.backgroundImage = ""; credit.hidden = true; return; }
  const info = await load(key);
  if (mine !== token) return;
  if (!info) { image.hidden = true; credit.hidden = true; return; }   // the file is gone (storage cleared)
  image.style.backgroundImage = 'url("' + info.url + '")';
  image.hidden = false;
  credit.textContent = info.credit;
  credit.hidden = !info.credit;
}

/** Forget what is shown so the next applyBackground() redraws (after assignments change). */
export function resetBackground() { shown = undefined; }

export function assignBackground(scope, cardId, key) {
  const b = bgPrefs();
  if (scope === "all") { b.all = key; b.map = {}; } else b.map[cardId] = key;   // "all sources" replaces the per-source pictures
  savePrefs();
  resetBackground();
  return gc();
}

export function removeBackground(scope, cardId) {
  const b = bgPrefs();
  if (scope === "all") { b.all = null; b.map = {}; } else delete b.map[cardId];
  savePrefs();
  resetBackground();
  return gc();
}

/** Delete every stored picture that no source uses any more. */
export async function gc() {
  const b = bgPrefs();
  const used = new Set([b.all, ...Object.values(b.map)].filter(Boolean));
  try {
    for (const record of await bgAll()) {
      if (used.has(record.key)) continue;
      await bgDelete(record.key);
      const info = urls.get(record.key);
      if (info) { URL.revokeObjectURL(info.url); urls.delete(record.key); }
    }
  } catch (error) {}
}

export const currentKey = card => keyFor(card);
