// Widgets: small panels (Clock, Date, Weather...) placed on a 12 x 6 grid on the Home slide and on any slide that has free space.
// Layout per slide: prefs.widgets[cardId] = [{id, type, x, y, w, h, o: {option: value, ...}}] (stable card ids, like every other preference).
// To add a widget type: add an entry to TYPES below (name, default size, options, build(), update()) and its CSS in css/widgets.css; the editor (widgetedit.js) needs no change.
import { byId, deck } from "./dom.js";
import { state, wf } from "./state.js";
import { drawCursor } from "./cursor.js";
import { syncRing } from "./glass.js";
import { prefs, savePrefs } from "./prefs.js";
import { t, T, currentLanguage } from "./i18n.js";
import { cachedWeather, fetchWeather, isStale, conditionOf, iconSvg } from "./weather.js";
import { cancelSlideRequests } from "./http.js";
import { formatDate, locale, esc, cap, setText, optionListOf, optionsFor, loadOnce, hintBar } from "./wutil.js";
import { FONT_OPTION, familyOf, effectiveKey, textEm } from "./fonts.js";
import inputs from "./wtypes/inputs.js";
import news from "./wtypes/news.js";
import currency from "./wtypes/currency.js";
import sports from "./wtypes/sports.js";
import newscards from "./wtypes/newscards.js";
import outages from "./wtypes/outages.js";

export const COLS = 12, ROWS = 6;
/** Slides that draw their own content (feeds) have no free space. */
const NO_WIDGETS = new Set(["app:youtube", "app:applemusic"]);
export const allowsWidgets = card => !!card && !NO_WIDGETS.has(card.id);

export const TYPES = {
  clock: {
    name: T("Clock"), size: {w: 4, h: 2}, min: {w: 2, h: 1},
    options: [
      {key: "format", label: T("Time format"), values: [["auto", T("Auto")], ["24", T("24-hour")], ["12", T("12-hour")]]},
      {key: "seconds", label: T("Seconds"), values: [["off", T("Off")], ["on", T("On")]]},
    ],
    build(el) { el.innerHTML = '<div class="wclock"><b></b></div>'; },
    update(el, w) {
      const o = optionsOf(w);
      const format = {hour: "numeric", minute: "2-digit"};
      if (o.seconds === "on") format.second = "2-digit";
      if (o.format === "12") format.hour12 = true; else if (o.format === "24") format.hourCycle = "h23";
      const text = new Intl.DateTimeFormat(locale(), format).format(new Date());
      const box = el.firstElementChild, face = box.firstElementChild;
      setText(face, text);
      // --n = how many em wide the text is; the CSS sizes the text to fit the widget. 0.62 em per character suits the theme fonts, the bundled fonts are measured
      const key = effectiveKey(o.font);
      const em = key ? textEm(key, text, () => { if (el.isConnected) TYPES.clock.update(el, w); }) : null;
      box.style.setProperty("--n", String(em || text.length * 0.62));
    },
  },
  date: {
    name: T("Date"), size: {w: 4, h: 1}, min: {w: 2, h: 1},
    options: [{key: "format", label: T("Date format"), values: [["long", T("Long")], ["short", T("Short")], ["numeric", T("Numeric")]]}],
    build(el) { el.innerHTML = '<div class="wdate"><b></b><span></span></div>'; },
    update(el, w) {
      const o = optionsOf(w), now = new Date();
      const fmt = opts => formatDate(now, opts);
      const first = cap(fmt({weekday: o.format === "long" ? "long" : "short"}));
      const second = o.format === "long" ? fmt({day: "numeric", month: "long", year: "numeric"}) : o.format === "short" ? fmt({day: "numeric", month: "short"}) : fmt({day: "2-digit", month: "2-digit", year: "numeric"});
      const box = el.firstElementChild;
      setText(box.children[0], first); setText(box.children[1], second);
      const key = effectiveKey(o.font), again = () => { if (el.isConnected) TYPES.date.update(el, w); };
      box.style.setProperty("--n1", String((key && textEm(key, first, again)) || first.length * 0.6));
      box.style.setProperty("--n2", String((key && textEm(key, second, again)) || second.length * 0.56));
    },
  },
  weather: {
    name: T("Weather"), size: {w: 3, h: 2}, min: {w: 2, h: 2}, custom: "city",
    options: [
      {key: "units", label: T("Units"), values: [["auto", T("Auto")], ["c", T("Celsius")], ["f", T("Fahrenheit")]]},
      {key: "details", label: T("Details"), values: [["on", T("On")], ["off", T("Off")]]},
    ],
    build(el) { el.innerHTML = '<div class="wweather"></div>'; },
    update(el, w) {
      const city = w.o?.city, box = el.firstElementChild;
      let html;
      if (!city) html = '<div class="wicon">' + iconSvg("cloud") + '</div><div class="wmain"><span class="wnote">' + esc(t("Set a city in the widget options")) + "</span></div>";
      else {
        const entry = cachedWeather(city);
        loadOnce(w.id, isStale(entry), () => fetchWeather(city), () => { if (el.isConnected) this.update(el, w); });
        if (!entry) html = '<div class="wicon">' + iconSvg("cloud") + '</div><div class="wmain"><b class="wtemp">…</b><span class="wcity">' + esc(city.name) + "</span></div>";
        else html = weatherHtml(entry.data, city, optionsOf(w));
      }
      if (box.dataset.sig !== html) { box.dataset.sig = html; box.innerHTML = html; }
    },
  },
  inputs, news, currency, sports, newscards, outages,
};
// what the Font list shows next to each font name: a sample of what this widget draws (neutral digits where possible, so most need no translation)
const SAMPLES = {
  clock: () => "12:34",
  date: () => formatDate(new Date(), {weekday: "short", day: "numeric", month: "short"}),
  weather: () => "21° / 14°",
  inputs: () => t("HDMI {n}", {n: 1}),
  news: () => t("Headline of the day"),
  currency: () => "1 USD = 41.50",
  sports: () => "2 : 1",
  newscards: () => t("Top story"),
  outages: () => "14:00 – 18:00",
};
for (const [name, type] of Object.entries(TYPES)) {
  type.options.push(FONT_OPTION);
  type.fontSample = SAMPLES[name] || SAMPLES.clock;
}   // Font: the widget's own font, or "Theme font" = follow the app-wide font (Settings > Appearance)

function weatherHtml(d, city, o) {
  const fahrenheit = o.units === "f" || (o.units === "auto" && /-(US|LR|MM)$/i.test(navigator.language || ""));
  const deg = c => Math.round(fahrenheit ? c * 9 / 5 + 32 : c) + "°";
  const cond = conditionOf(d.code);
  const details = o.details === "on"
    ? '<div class="wdetails"><span>' + esc(t("Feels like {temp}", {temp: deg(d.feels)})) + "</span><span>↑ " + deg(d.hi) + "  ↓ " + deg(d.lo) + "</span><span>" + esc(t("Wind {n} km/h", {n: Math.round(d.wind)})) + "</span></div>" : "";
  return '<div class="wicon">' + iconSvg(cond.kind, d.day) + '</div><div class="wmain"><b class="wtemp">' + deg(d.temp) + '</b><span class="wcond">' + esc(t(cond.label)) +
    '</span><span class="wcity">' + esc(city.name) + "</span></div>" + details;
}

// ---- options ----
export const optionList = type => optionListOf(TYPES[type]);
export const optionsOf = widget => optionsFor(TYPES[widget.type], widget);
/** Switch an option to its next (dir 1) or previous (dir -1) value. */
export function cycleOption(widget, key, dir = 1) {
  const opt = optionList(widget.type).find(o => o.key === key);
  const current = optionsOf(widget)[key];
  const n = opt.values.length, at = Math.max(0, opt.values.findIndex(v => v[0] === current));
  widget.o = {...(widget.o || {}), [key]: opt.values[(at + dir + n) % n][0]};
  save();
  refreshWidgets();
}
/** Set several options at once. */
/** The sample text of the Font list for a widget type. */
export const fontSampleOf = type => TYPES[type].fontSample();
export function setOptions(widget, values) { widget.o = {...(widget.o || {}), ...values}; save(); refreshWidgets(); }
export function setOption(widget, key, value) { widget.o = {...(widget.o || {}), [key]: value}; save(); refreshWidgets(); }
/** The text of an option value: its label, with the note of a third element after it (fonts: which scripts they cover). */
export const valueLabel = v => v[2] ? v[1] + "  ·  " + t(v[2]) : t(v[1]);
export const optionLabel = (widget, opt) => {
  const value = optionsOf(widget)[opt.key];
  if (opt.text) return value ? (value.length > 34 ? value.slice(0, 33) + "…" : value) : t("not set");
  return valueLabel(opt.values.find(v => v[0] === value));
};

// ---- layout data ----
const save = () => savePrefs();
const newId = () => "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/** The widgets of a slide. The Home slide starts with a clock, the date and the weather. */
export function listFor(card) {
  if (!prefs.widgets) prefs.widgets = {};
  if (!prefs.widgets[card.id] && card.home) {
    prefs.widgets[card.id] = [
      {id: newId(), type: "clock", x: 0, y: 0, w: 5, h: 2, o: {}},
      {id: newId(), type: "date", x: 0, y: 2, w: 5, h: 1, o: {}},
      {id: newId(), type: "weather", x: 0, y: 3, w: 4, h: 2, o: {}},
    ];
    save();
  }
  return prefs.widgets[card.id] || [];
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inGrid = r => r.x >= 0 && r.y >= 0 && r.w >= 1 && r.h >= 1 && r.x + r.w <= COLS && r.y + r.h <= ROWS;
const rectFree = (list, rect, ignore) => inGrid(rect) && !list.some(o => o !== ignore && overlaps(o, rect));

/** The sizes a new widget of a type may get: its default first, then smaller ones down to its minimum, the largest area first. */
function sizesFor(type) {
  const {size, min} = TYPES[type], out = [];
  for (let w = size.w; w >= min.w; w--) for (let h = size.h; h >= min.h; h--) out.push({w, h});
  return out.sort((a, b) => (b.w * b.h) - (a.w * a.h) || b.w - a.w);   // the default has the largest area, so it comes first
}

/**
 * Add a widget of a type at the first free spot (right side first), at its default size when that fits somewhere and otherwise at the largest
 * smaller size that does (never below the type's minimum). Returns the widget, or null when there is no room even for the minimum.
 */
export function addWidget(card, type) {
  const list = (listFor(card), prefs.widgets[card.id] ||= []);
  for (const {w, h} of sizesFor(type)) {
    for (let y = 0; y + h <= ROWS; y++) for (let x = COLS - w; x >= 0; x--) {
      if (rectFree(list, {x, y, w, h})) {
        const widget = {id: newId(), type, x, y, w, h, o: {}};
        list.push(widget); save(); refreshWidgets();
        return widget;
      }
    }
  }
  return null;
}
/** True when a widget is smaller than its type's default size (it was added or resized to fit). */
export const isShrunk = widget => widget.w < TYPES[widget.type].size.w || widget.h < TYPES[widget.type].size.h;
export function removeWidget(card, id) {
  prefs.widgets[card.id] = listFor(card).filter(w => w.id !== id);
  save(); refreshWidgets();
}
/** Try to move/resize a widget by a number of cells; false when it would leave the grid or hit another widget. */
function tryRect(card, widget, rect) {
  if (rect.w < TYPES[widget.type].min.w || rect.h < TYPES[widget.type].min.h || !rectFree(listFor(card), rect, widget)) return false;
  Object.assign(widget, rect);
  save();
  placeEl(widget);
  return true;
}
const overlapArea = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** Where two widgets end up when `a` is pushed one cell (dx, dy) into `b`: they exchange places along the direction of travel, each keeping its size. */
function swapPlan(a, b, dx, dy) {
  return {
    a: {x: dx > 0 ? b.x + b.w - a.w : dx < 0 ? b.x : a.x, y: dy > 0 ? b.y + b.h - a.h : dy < 0 ? b.y : a.y, w: a.w, h: a.h},
    b: {x: dx > 0 ? a.x : dx < 0 ? a.x + a.w - b.w : b.x, y: dy > 0 ? a.y : dy < 0 ? a.y + a.h - b.h : b.y, w: b.w, h: b.h},
  };
}

/**
 * Move a widget one cell. Into free space it just moves; into another widget the two swap places when both still fit in the grid without
 * touching a third widget (otherwise nothing happens). False when nothing moved.
 */
export function moveWidget(card, widget, dx, dy) {
  const rect = {x: widget.x + dx, y: widget.y + dy, w: widget.w, h: widget.h};
  if (tryRect(card, widget, rect)) return true;
  if (!inGrid(rect)) return false;   // the edge of the grid
  const list = listFor(card);
  const hit = list.filter(o => o !== widget && overlaps(o, rect)).sort((p, q) => overlapArea(q, rect) - overlapArea(p, rect));
  for (const other of hit) {
    const plan = swapPlan(widget, other, dx, dy);
    if (!inGrid(plan.a) || !inGrid(plan.b) || overlaps(plan.a, plan.b)) continue;
    if (list.some(o => o !== widget && o !== other && (overlaps(o, plan.a) || overlaps(o, plan.b)))) continue;
    Object.assign(widget, plan.a); Object.assign(other, plan.b);
    save(); placeEl(widget); placeEl(other);
    return true;
  }
  return false;
}
export const resizeWidget = (card, widget, dw, dh) => tryRect(card, widget, {x: widget.x, y: widget.y, w: widget.w + dw, h: widget.h + dh});

// ---- drawing ----
let layoutKey = null, live = [], selectedId = null, selectedMode = "";
const area = w => (w.y + 1) + " / " + (w.x + 1) + " / span " + w.h + " / span " + w.w;
function placeEl(widget) { const x = live.find(l => l.w === widget); if (x) x.el.style.gridArea = area(widget); }

/**
 * Draw the widgets of the slide. With {defer: true} (a switch to another slide) a slide that has widgets only gets its layer emptied now and built later by a
 * second call: skimming through slides then builds nothing for the slides passed on the way.
 */
export function renderWidgets(card, {defer = false} = {}) {
  const layer = byId("widgets");
  const on = allowsWidgets(card);
  const key = on && card ? card.id : "";
  if (key === layoutKey) return;
  if (defer && key !== "") {
    layoutKey = null;
    cancelSlideRequests();
    live = [];
    layer.textContent = "";
    layer.hidden = true;
    if (wf.active) { wf.active = false; wf.id = null; showHint(null); drawFocus(); }
    return;
  }
  layoutKey = key;
  cancelSlideRequests();   // data requests of the slide we just left (or of widgets about to be rebuilt) are no longer wanted
  live = [];
  layer.textContent = "";
  const list = on && card ? listFor(card) : [];
  for (const widget of list) {
    const type = TYPES[widget.type];
    if (!type) continue;
    const el = document.createElement("div");
    el.className = "widget";
    el.dataset.type = widget.type;
    const wo = optionsOf(widget);
    el.dataset.card = wo.card;
    if (familyOf(wo.font)) el.style.setProperty("--wfont", familyOf(wo.font));   // a font of its own; without it the widget follows the app-wide font (CSS: --app-font)
    el.style.gridArea = area(widget);
    type.build(el, widget);
    type.update(el, widget);
    layer.appendChild(el);
    live.push({el, w: widget, type});
  }
  if (on && card?.home && !list.length) {
    const hint = document.createElement("p");
    hint.className = "whint";
    hint.textContent = t("No widgets yet. Press OK to add some.");
    layer.appendChild(hint);
  }
  layer.hidden = !layer.children.length;
  markSelected();
  // the cursor stays in an interactive widget across a rebuild of the same slide, but not on another slide or when the widget is gone
  if (wf.active && (wf.card !== (card && card.id) || !live.some(l => l.w.id === wf.id))) { wf.active = false; wf.id = null; showHint(null); }
  drawFocus();
}

// ---- interactive widgets (type.interactive): Up from the thumbnails enters them; type.key(el, w, event) handles ←→ and OK; Up/Down move between them; Back leaves ----
const interactiveLive = () => live.filter(l => l.type.interactive).sort((a, b) => a.w.y - b.w.y || a.w.x - b.w.x);
function drawFocus() {
  for (const l of live) {
    const on = wf.active && l.w.id === wf.id;
    l.el.classList.toggle("wfocus", on);
    if (l.type.focus) l.type.focus(l.el, l.w, on);
  }
  syncRing();   // the focus ring glides to the widget
}
/** Put the cursor on the first interactive widget of the slide. Returns false when there is none. */
export function enterWidgets() {
  const list = interactiveLive(), card = state.cards[state.index];
  if (!list.length || state.active || !card) return false;
  wf.active = true; wf.id = list[0].w.id; wf.card = card.id;
  drawFocus();
  drawCursor();
  showHint(list[0].type);
  return true;
}
/** The key hint of the widget that has the cursor, in a bar at the bottom of the screen. */
function showHint(type) {
  hintBar(wf.active && type && type.hint ? t(type.hint) : "");
}
function leaveWidgets() { wf.active = false; wf.id = null; drawFocus(); showHint(null); drawCursor(); }
/** Keys while an interactive widget has the cursor (the router calls this for every key). */
export function widgetFocusKey(event) {
  const list = interactiveLive(), at = list.findIndex(l => l.w.id === wf.id), key = event.key;
  if (at < 0 || event.keyCode === 10009 || key === "Escape") { leaveWidgets(); return; }
  const cur = list[at];
  if (cur.type.key && cur.type.key(cur.el, cur.w, event)) return;
  if (key === "ArrowUp" && at > 0) { wf.id = list[at - 1].w.id; drawFocus(); showHint(list[at - 1].type); }
  else if (key === "ArrowDown") { if (at < list.length - 1) { wf.id = list[at + 1].w.id; drawFocus(); showHint(list[at + 1].type); } else leaveWidgets(); }
}
/** Rebuild the widgets of the slide on screen (after language, option or list changes). */
export function refreshWidgets() { layoutKey = null; renderWidgets(state.cards[state.index]); }

export function setSelected(id, mode = "") { selectedId = id; selectedMode = mode; markSelected(); }
function markSelected() {
  for (const l of live) {
    l.el.classList.toggle("wsel", l.w.id === selectedId);
    l.el.classList.toggle("wmove", l.w.id === selectedId && selectedMode !== "");
  }
}

// one slow timer keeps clocks and weather current; each update writes only when the text changed
setInterval(() => { if (!deck.hidden) for (const l of live) l.type.update(l.el, l.w); }, 1000);
