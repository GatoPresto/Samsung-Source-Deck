// Helpers shared by widgets.js and the widget type modules in js/wtypes/ (no dependency on the registry, so types can import this freely).
import { loadJson, saveJson } from "./state.js";
import { t, T, currentLanguage } from "./i18n.js";

export const locale = () => ({zh: "zh-CN"})[currentLanguage()] || currentLanguage();
export const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]);
export const cap = s => s ? s.charAt(0).toLocaleUpperCase(locale()) + s.slice(1) : s;
export const setText = (node, text) => { if (node && node.textContent !== text) node.textContent = text; };

/**
 * Options every widget has. An option is {key, label, values: [[stored value, label], ...], def?: () => stored value} (OK or ←→ change it)
 * or {key, label, text: true, placeholder} (OK opens the keyboard). The first value is the default unless `def` is given.
 */
export const COMMON = [{key: "card", label: T("Card"), values: [["panel", T("Panel")], ["none", T("None")], ["accent", T("Accent")]]}];
export const optionListOf = type => [...COMMON, ...type.options];
/** The option values of a widget with defaults filled in. */
export function optionsFor(type, widget) {
  const out = {};
  for (const opt of optionListOf(type)) out[opt.key] = widget.o?.[opt.key] ?? (opt.def ? opt.def() : opt.text ? "" : opt.values[0][0]);
  return out;
}

// ---- data loading: one request at a time per widget, with a pause after a failure ----
const loads = new Map();   // widget id -> {busy} | {failedAt}   (not saved with the layout)
/** True when the last load of this widget failed less than a minute ago. */
export const loadFailed = id => loads.get(id)?.failedAt > Date.now() - 60000;
/** If `needed`, run fetcher() (a promise) unless one is running or failed in the last minute; `done` runs afterwards either way. */
export function loadOnce(id, needed, fetcher, done) {
  const s = loads.get(id);
  if (!needed || s?.busy || s?.failedAt > Date.now() - 60000) return;
  loads.set(id, {busy: true});
  fetcher().then(() => loads.set(id, {}), error => {
    if (error && error.cancelled) { loads.delete(id); return "cancelled"; }   // the user left the slide: not a failure, load again on return
    loads.set(id, {failedAt: Date.now()});
  }).then(result => { if (result !== "cancelled") done(); });
}

/** Show a text in the key-hint bar at the bottom of the screen (#wfHint), or hide the bar with "". */
export function hintBar(text) {
  const bar = document.getElementById("wfHint");
  bar.hidden = !text;
  bar.textContent = text || "";
}

// ---- small localStorage cache: name -> {key: {at, data}} (newest 8 keys kept) ----
// The parsed object of each name is kept in memory: widgets ask for it every second, and parsing a feed cache from localStorage that often costs main-thread time.
const mem = new Map();
const table = name => { let all = mem.get(name); if (!all) mem.set(name, all = loadJson("wcache-" + name) || {}); return all; };
export const cache = {
  get(name, key) { return table(name)[key] || null; },
  set(name, key, data) {
    const all = table(name);
    all[key] = {at: Date.now(), data};
    const keep = Object.fromEntries(Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, 8));
    mem.set(name, keep);
    saveJson("wcache-" + name, keep);
  },
};
export const isOld = (entry, minutes) => !entry || Date.now() - entry.at > minutes * 60000;

/** Paging of `total` rows when at most `perPage` fit: the pages are made equally full and change every `seconds`. Returns {start, size} of the page to show now. */
export function pagePlan(total, perPage, seconds) {
  const pages = Math.max(1, Math.ceil(total / perPage)), size = Math.ceil(total / pages);
  return {start: pages > 1 ? (Math.floor(Date.now() / (seconds * 1000)) % pages) * size : 0, size};
}

/** "5 min", "2 h", "3 d" (short, in the app language). */
export function ago(timestamp) {
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  const rtf = new Intl.RelativeTimeFormat(locale(), {numeric: "always", style: "narrow"});
  return minutes < 60 ? rtf.format(-Math.max(1, minutes), "minute") : minutes < 1440 ? rtf.format(-Math.round(minutes / 60), "hour") : rtf.format(-Math.round(minutes / 1440), "day");
}

/** How many rows of `rowPx` pixels fit in a widget `h` grid cells high (a header line is taken off from 2 cells up). Cells are 105 px + 12 px gaps. */
export const rowsFit = (h, rowPx) => Math.max(1, Math.floor((h * 105 + (h - 1) * 12 - (h >= 2 ? 36 : 0)) / rowPx));
/** Decode HTML entities and strip tags from a feed text. */
export function plain(text) {
  const box = document.createElement("textarea");
  box.innerHTML = String(text || "").replace(/<[^>]*>/g, " ");
  return box.value.replace(/\s+/g, " ").trim();
}
