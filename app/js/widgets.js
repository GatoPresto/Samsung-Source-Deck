// Widgets: small panels (Clock, Date, Weather...) placed on a 12 x 6 grid on the Home slide and on any slide that has free space.
// Layout per slide: prefs.widgets[cardId] = [{id, type, x, y, w, h, o: {option: value, ...}}] (stable card ids, like every other preference).
// To add a widget type: add an entry to TYPES below (name, default size, options, build(), update()) and its CSS in css/widgets.css; the editor (widgetedit.js) needs no change.
import { byId, deck } from "./dom.js";
import { state } from "./state.js";
import { prefs, savePrefs } from "./prefs.js";
import { t, T, currentLanguage } from "./i18n.js";
import { cachedWeather, fetchWeather, isStale, conditionOf, iconSvg } from "./weather.js";

export const COLS = 12, ROWS = 6;
/** Slides that draw their own content (feeds) have no free space. */
const NO_WIDGETS = new Set(["app:youtube", "app:applemusic"]);
export const allowsWidgets = card => !!card && !NO_WIDGETS.has(card.id);

const locale = () => ({zh: "zh-CN"})[currentLanguage()] || currentLanguage();
const fetchState = new Map();
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]);
const cap = s => s ? s.charAt(0).toLocaleUpperCase(locale()) + s.slice(1) : s;
const setText = (node, text) => { if (node && node.textContent !== text) node.textContent = text; };

/** Options every widget has. values: [[stored value, label], ...]; the first one is the default. */
const COMMON = [{key: "card", label: T("Card"), values: [["panel", T("Panel")], ["none", T("None")], ["accent", T("Accent")]]}];

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
      const box = el.firstElementChild;
      setText(box.firstElementChild, text);
      box.style.setProperty("--n", String(text.length * 0.62));
    },
  },
  date: {
    name: T("Date"), size: {w: 4, h: 1}, min: {w: 2, h: 1},
    options: [{key: "format", label: T("Date format"), values: [["long", T("Long")], ["short", T("Short")], ["numeric", T("Numeric")]]}],
    build(el) { el.innerHTML = '<div class="wdate"><b></b><span></span></div>'; },
    update(el, w) {
      const o = optionsOf(w), now = new Date(), l = locale();
      const fmt = opts => new Intl.DateTimeFormat(l, opts).format(now);
      const first = cap(fmt({weekday: o.format === "long" ? "long" : "short"}));
      const second = o.format === "long" ? fmt({day: "numeric", month: "long", year: "numeric"}) : o.format === "short" ? fmt({day: "numeric", month: "short"}) : fmt({day: "2-digit", month: "2-digit", year: "numeric"});
      const box = el.firstElementChild;
      setText(box.children[0], first); setText(box.children[1], second);
      box.style.setProperty("--n1", String(first.length * 0.6)); box.style.setProperty("--n2", String(second.length * 0.56));
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
        const wait = fetchState.get(w.id);   // not saved with the layout: {busy, failedAt}
        if (isStale(entry) && !wait?.busy && !(wait?.failedAt > Date.now() - 60000)) {
          fetchState.set(w.id, {busy: true});
          fetchWeather(city).then(() => fetchState.set(w.id, {}), () => fetchState.set(w.id, {failedAt: Date.now()})).then(() => { if (el.isConnected) this.update(el, w); });
        }
        if (!entry) html = '<div class="wicon">' + iconSvg("cloud") + '</div><div class="wmain"><b class="wtemp">…</b><span class="wcity">' + esc(city.name) + "</span></div>";
        else html = weatherHtml(entry.data, city, optionsOf(w));
      }
      if (box.dataset.sig !== html) { box.dataset.sig = html; box.innerHTML = html; }
    },
  },
};

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
export const optionList = type => [...COMMON, ...TYPES[type].options];
export function optionsOf(widget) {
  const out = {};
  for (const opt of optionList(widget.type)) out[opt.key] = widget.o?.[opt.key] ?? opt.values[0][0];
  return out;
}
/** Switch an option to its next value. */
export function cycleOption(widget, key) {
  const opt = optionList(widget.type).find(o => o.key === key);
  const current = optionsOf(widget)[key];
  const next = opt.values[(opt.values.findIndex(v => v[0] === current) + 1) % opt.values.length][0];
  widget.o = {...(widget.o || {}), [key]: next};
  save();
  refreshWidgets();
}
export function setOption(widget, key, value) { widget.o = {...(widget.o || {}), [key]: value}; save(); refreshWidgets(); }
export const optionLabel = (widget, opt) => t(opt.values.find(v => v[0] === optionsOf(widget)[opt.key])[1]);

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

/** Add a widget of a type at the first free spot (right side first). Returns the widget, or null when there is no room. */
export function addWidget(card, type) {
  const list = (listFor(card), prefs.widgets[card.id] ||= []);
  const {w, h} = TYPES[type].size;
  for (let y = 0; y + h <= ROWS; y++) for (let x = COLS - w; x >= 0; x--) {
    if (rectFree(list, {x, y, w, h})) {
      const widget = {id: newId(), type, x, y, w, h, o: {}};
      list.push(widget); save(); refreshWidgets();
      return widget;
    }
  }
  return null;
}
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
export const moveWidget = (card, widget, dx, dy) => tryRect(card, widget, {x: widget.x + dx, y: widget.y + dy, w: widget.w, h: widget.h});
export const resizeWidget = (card, widget, dw, dh) => tryRect(card, widget, {x: widget.x, y: widget.y, w: widget.w + dw, h: widget.h + dh});

// ---- drawing ----
let layoutKey = null, live = [], selectedId = null, selectedMode = "";
const area = w => (w.y + 1) + " / " + (w.x + 1) + " / span " + w.h + " / span " + w.w;
function placeEl(widget) { const x = live.find(l => l.w === widget); if (x) x.el.style.gridArea = area(widget); }

export function renderWidgets(card) {
  const layer = byId("widgets");
  const on = allowsWidgets(card);
  const key = on && card ? card.id : "";
  if (key === layoutKey) return;
  layoutKey = key;
  live = [];
  layer.textContent = "";
  const list = on && card ? listFor(card) : [];
  for (const widget of list) {
    const type = TYPES[widget.type];
    if (!type) continue;
    const el = document.createElement("div");
    el.className = "widget";
    el.dataset.type = widget.type;
    el.dataset.card = optionsOf(widget).card;
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
