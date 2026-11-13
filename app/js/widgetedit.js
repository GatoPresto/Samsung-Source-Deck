// Widget editor: a drawer (like "Change background") to add, move, resize, customise and remove the widgets of the slide on screen.
// Views: menu (Add widget + the slide's widgets) -> add (widget types) / widget (Move, Resize, options, actions, Remove) -> move / resize (the drawer hides, arrow keys change the grid) / city (Weather: search results)
// / pick (a list chosen by a widget action). A widget type can have `actions: [{key, label, value(w), run(w, api)}]` (e.g. Outages: find the group by address); run() uses api.ask / api.pick / api.say / api.set.
import { byId } from "./dom.js";
import { state } from "./state.js";
import { makeRow } from "./templates.js";
import { focusSel } from "./cursor.js";
import { syncRing } from "./glass.js";
import { openPrompt } from "./textprompt.js";
import { t, currentLanguage } from "./i18n.js";
import { TYPES, allowsWidgets, listFor, addWidget, removeWidget, moveWidget, resizeWidget, optionList, optionLabel, cycleOption, setOption, setOptions, setSelected } from "./widgets.js";
import { searchCities } from "./weather.js";

export const widgetEdit = {open: false};
const ui = {view: "menu", cur: 0, card: null, sel: null, rows: [], status: "", cities: [], pickItems: [], pickTitle: "", pickResolve: null};

const selected = () => listFor(ui.card).find(w => w.id === ui.sel);

function rowsFor(view) {
  const list = listFor(ui.card);
  if (view === "add") return Object.keys(TYPES).map(type => ({id: "type", type, label: t(TYPES[type].name)}));
  if (view === "city") return ui.cities.map(city => ({id: "pick", city, label: city.label}));
  if (view === "pick") return ui.pickItems.map(item => ({id: "choice", value: item.value, label: (item.current ? "●  " : "○  ") + item.label}));
  if (view === "widget") {
    const w = selected(), type = TYPES[w.type];
    const rows = [{id: "move", label: t("Move")}, {id: "resize", label: t("Resize")}];
    for (const opt of optionList(w.type)) rows.push({id: "opt", key: opt.key, text: !!opt.text, opt, label: t(opt.label) + ":  " + optionLabel(w, opt)});
    for (const action of type.actions || []) rows.push({id: "action", action, label: t(action.label) + (action.noValue ? "" : ":  " + (action.value(w) || t("not set")))});
    if (type.custom === "city") rows.push({id: "city", label: t("City") + ":  " + (w.o?.city ? w.o.city.name : t("not set"))});
    rows.push({id: "remove", label: t("Remove widget")});
    return rows;
  }
  return [{id: "add", label: "＋  " + t("Add widget")}].concat(list.map(w => ({id: "w", wid: w.id, label: t(TYPES[w.type].name) + "  ·  " + w.w + "×" + w.h})));
}

function draw() {
  const view = ui.view, mode = view === "move" || view === "resize";
  const root = byId("widgetsView");
  root.dataset.view = mode ? "grid" : "menu";   // "grid" hides the drawer and keeps the glass bubble away
  byId("wMoveHint").hidden = !mode;
  if (mode) {
    byId("wMoveHint").textContent = view === "move" ? t("←↑↓→ move · OK or Back when done") : t("←→ width · ↑↓ height · OK or Back when done");
    syncRing();
    return;
  }
  const w = view === "widget" ? selected() : null;
  byId("wTitle").textContent = view === "menu" ? t("Widgets") + " · " + ui.card.name : view === "add" ? t("Add widget") : view === "city" ? t("City") : view === "pick" ? ui.pickTitle : t(TYPES[w.type].name);
  byId("wHint").textContent = view === "menu" ? t("↑↓ choose · OK select · Back close") : view === "widget" ? t("↑↓ choose · OK or ←→ change · Back return") : t("↑↓ choose · OK select · Back return");
  byId("wStatus").textContent = ui.status;
  ui.rows = rowsFor(view);
  ui.cur = Math.max(0, Math.min(ui.cur, ui.rows.length - 1));
  const list = byId("wList");
  list.textContent = "";
  ui.rows.forEach((row, i) => {
    const el = makeRow(row.label, i === ui.cur ? "cur" : "");
    el.onclick = () => { ui.cur = i; activate(); };
    list.appendChild(el);
  });
  list.children[ui.cur]?.scrollIntoView({block: "nearest"});
  // the widget under the cursor is outlined on the slide behind the drawer
  const row = ui.rows[ui.cur];
  setSelected(view === "menu" ? (row?.id === "w" ? row.wid : null) : view === "widget" ? ui.sel : ui.sel, "");
  syncRing();
}

export function openWidgetEditor(card) {
  card = card || state.cards[state.index];
  if (!card || !allowsWidgets(card)) return;
  Object.assign(ui, {view: "menu", cur: 0, card, sel: null, status: "", cities: []});
  widgetEdit.open = true;
  byId("widgetsView").hidden = false;
  draw();
}

function close() {
  widgetEdit.open = false;
  setSelected(null);
  byId("widgetsView").hidden = true;
  syncRing();
  focusSel();
}

function show(view, cur = 0) { Object.assign(ui, {view, cur, status: ""}); draw(); }

function searchCity(widget) {
  openPrompt({
    title: t("City"), placeholder: t("Type a city name"), okLabel: t("Search"),
    onSubmit: async text => {
      Object.assign(ui, {view: "city", cur: 0, cities: [], status: t("Loading…")});
      draw();
      try {
        ui.cities = await searchCities(text, currentLanguage());
        ui.status = ui.cities.length ? "" : t("No city found.");
      } catch (error) { ui.status = t("Could not load: {why}", {why: error.message}); }
      draw();
    },
    onCancel: () => draw(),
  });
}

/** A text option (feed address, team filter): the TV keyboard prompt with the current value. */
function typeOption(widget, opt) {
  openPrompt({
    title: t(opt.label), placeholder: t(opt.placeholder || ""), value: widget.o?.[opt.key] || "", okLabel: t("Save"), allowEmpty: true,
    onSubmit: text => { setOption(widget, opt.key, text.trim()); draw(); },
    onCancel: () => draw(),
  });
}

/** What a widget action may use: the TV keyboard, a list to choose from, and a status line. */
const api = {
  ask: (title, placeholder, value = "") => new Promise(resolve => openPrompt({title, placeholder, value, okLabel: t("Search"), onSubmit: text => resolve(text.trim()), onCancel: () => resolve(null)})),
  pick: (title, items) => new Promise(resolve => {
    Object.assign(ui, {view: "pick", cur: Math.max(0, items.findIndex(i => i.current)), pickItems: items, pickTitle: title, pickResolve: resolve, status: ""});
    draw();
  }),
  say: text => { ui.status = text; draw(); },
  set: (widget, values) => setOptions(widget, values),
};

function runAction(widget, action) {
  const back = ui.cur;
  Promise.resolve().then(() => action.run(widget, api))
    .catch(error => { api.say(t("Could not load: {why}", {why: error.message})); })
    .finally(() => { const message = ui.status; show("widget", back); ui.status = message; draw(); });
}

function activate() {
  const row = ui.rows[ui.cur];
  if (!row) return;
  if (row.id === "add") show("add");
  else if (row.id === "w") { ui.sel = row.wid; show("widget"); }
  else if (row.id === "type") {
    const widget = addWidget(ui.card, row.type);
    if (!widget) { ui.status = t("No room for another widget on this slide."); draw(); return; }
    ui.sel = widget.id;
    show("menu", 1 + listFor(ui.card).findIndex(w => w.id === widget.id));
  } else if (row.id === "move" || row.id === "resize") { ui.view = row.id; setSelected(ui.sel, row.id); draw(); }
  else if (row.id === "opt") { if (row.text) typeOption(selected(), row.opt); else { cycleOption(selected(), row.key); draw(); } }
  else if (row.id === "city") searchCity(selected());
  else if (row.id === "action") runAction(selected(), row.action);
  else if (row.id === "choice") { const resolve = ui.pickResolve; ui.pickResolve = null; if (resolve) resolve(row.value); }
  else if (row.id === "pick") { setOption(selected(), "city", {name: row.city.name, lat: row.city.lat, lon: row.city.lon}); show("widget"); }
  else if (row.id === "remove") { removeWidget(ui.card, ui.sel); ui.sel = null; show("menu"); }
}

export function widgetKey(event) {
  const key = event.key, back = event.keyCode === 10009 || key === "Escape";
  if (ui.view === "move" || ui.view === "resize") {
    event.preventDefault();
    const w = selected();
    if (back || key === "Enter") { ui.view = "widget"; setSelected(ui.sel, ""); draw(); return; }
    const d = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[key];
    if (d && w) { if (ui.view === "move") moveWidget(ui.card, w, d[0], d[1]); else resizeWidget(ui.card, w, d[0], d[1]); }
    return;
  }
  const row = ui.rows[ui.cur];
  if ((key === "ArrowLeft" || key === "ArrowRight") && ui.view === "widget" && row?.id === "opt" && !row.text) {   // change the value of a choice option
    event.preventDefault();
    cycleOption(selected(), row.key, key === "ArrowRight" ? 1 : -1);
    draw();
    return;
  }
  if (back || (key === "ArrowLeft" && ui.view !== "menu")) {
    event.preventDefault();
    if (ui.view === "menu") close();
    else if (ui.view === "city") show("widget");
    else if (ui.view === "pick") { const resolve = ui.pickResolve; ui.pickResolve = null; if (resolve) resolve(null); else show("widget"); }
    else if (ui.view === "widget") show("menu", 1 + listFor(ui.card).findIndex(w => w.id === ui.sel));
    else show("menu");
  } else if (key === "ArrowDown" || key === "ArrowUp") {
    event.preventDefault();
    if (!ui.rows.length) return;
    ui.cur = (ui.cur + (key === "ArrowDown" ? 1 : -1) + ui.rows.length) % ui.rows.length;
    draw();
  } else if (key === "Enter") { event.preventDefault(); activate(); }
}
