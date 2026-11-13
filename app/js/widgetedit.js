// Widget editor: a drawer (like "Change background") to add, move, resize, customise and remove the widgets of the slide on screen.
// Views: menu (Add widget + the slide's widgets) -> add (widget types) / widget (Move, Resize, options, actions, Remove) -> move / resize (the drawer hides, arrow keys change the grid) / city (Weather: search results)
// / pick (a list chosen by a widget action). A widget type can have `actions: [{key, label, value(w), run(w, api)}]` (e.g. Outages: find the group by address); run() uses api.ask / api.pick / api.say / api.set.
import { byId, scrollListTo } from "./dom.js";
import { state } from "./state.js";
import { makeRow } from "./templates.js";
import { focusSel } from "./cursor.js";
import { syncRing } from "./glass.js";
import { openPrompt } from "./textprompt.js";
import { t, currentLanguage } from "./i18n.js";
import { TYPES, allowsWidgets, listFor, addWidget, removeWidget, moveWidget, resizeWidget, optionList, optionLabel, cycleOption, setOption, setOptions, setSelected } from "./widgets.js";
import { searchCities } from "./weather.js";

export const widgetEdit = {open: false};
const ui = {view: "menu", cur: 0, card: null, sel: null, rows: [], status: "", cities: [], pickItems: [], pickTitle: "", pickResolve: null, form: null};

const selected = () => listFor(ui.card).find(w => w.id === ui.sel);

function rowsFor(view) {
  const list = listFor(ui.card);
  if (view === "add") return Object.keys(TYPES).map(type => ({id: "type", type, label: t(TYPES[type].name)}));
  if (view === "city") return ui.cities.map(city => ({id: "pick", city, label: city.label}));
  if (view === "form") {   // an address form: one row per field, the results of a search under the field they belong to, and "Use this address" when all fields are set
    const f = ui.form, out = [];
    f.steps.forEach((step, i) => {
      const v = f.values[step.key];
      out.push({id: "fstep", i, label: t(step.label) + ":  " + (v ? v.label : t("not set"))});
      if (f.results && f.results.step === i) for (const item of f.results.items) out.push({id: "fres", item, sub: true, label: "○  " + item.label});
    });
    const last = f.values[f.steps[f.steps.length - 1].key];
    if (f.steps.every(s => f.values[s.key])) out.push({id: "fdone", label: "✓  " + t("Use this address") + (last.extra ? "  ·  " + last.extra : "")});
    return out;
  }
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
  byId("wTitle").textContent = view === "menu" ? t("Widgets") + " · " + ui.card.name : view === "add" ? t("Add widget") : view === "city" ? t("City") : view === "pick" ? ui.pickTitle : view === "form" ? ui.form.title : t(TYPES[w.type].name);
  byId("wHint").textContent = view === "menu" ? t("↑↓ choose · OK select · Back close") : view === "widget" ? t("↑↓ choose · OK or ←→ change · Back return") : view === "form" ? t("↑↓ choose · OK search or select · Back return") : t("↑↓ choose · OK select · Back return");
  byId("wStatus").textContent = ui.status;
  ui.rows = rowsFor(view);
  ui.cur = Math.max(0, Math.min(ui.cur, ui.rows.length - 1));
  const list = byId("wList");
  list.textContent = "";
  ui.rows.forEach((row, i) => {
    const el = makeRow(row.label, (i === ui.cur ? "cur" : "") + (row.sub ? " sub" : ""));
    el.onclick = () => { ui.cur = i; activate(); };
    list.appendChild(el);
  });
  scrollListTo(list, list.children[ui.cur]);
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
  ask: (title, placeholder, value = "", allowEmpty = false) => new Promise(resolve => openPrompt({title, placeholder, value, allowEmpty, okLabel: t("Search"), onSubmit: text => resolve(text.trim()), onCancel: () => resolve(null)})),
  pick: (title, items) => new Promise(resolve => {
    Object.assign(ui, {view: "pick", cur: Math.max(0, items.findIndex(i => i.current)), pickItems: items, pickTitle: title, pickResolve: resolve, status: ""});
    draw();
  }),
  /**
   * An address form on one screen: {title, steps: [{key, label, prompt: {title, placeholder}, allowEmpty?, search(query, values) -> [{label, value, extra?}]}], finish(values) -> {message} | {error}}.
   * OK on a field types a search (the TV keyboard), the results appear right under the field, picking one fills it and goes on to the next field. A search that finds nothing
   * (or fails) keeps everything chosen so far and the same field can be searched again; changing a field clears the fields after it. Resolves true when finished, false when cancelled.
   */
  form: config => new Promise(resolve => {
    ui.form = {...config, values: {}, queries: {}, results: null, resolve};
    Object.assign(ui, {view: "form", cur: 0, status: ""});
    draw();
  }),
  say: text => { ui.status = text; draw(); },
  set: (widget, values) => setOptions(widget, values),
};

// ---- the address form (see api.form) ----
const formRowOf = (id, test = () => true) => { const rows = rowsFor("form"); const at = rows.findIndex(r => r.id === id && test(r)); return at < 0 ? 0 : at; };
const formValues = f => Object.fromEntries(f.steps.map(s => [s.key, f.values[s.key] ? f.values[s.key].value : null]));

async function formStep(i) {
  const f = ui.form, step = f.steps[i];
  const missing = f.steps.findIndex((s, k) => k < i && !f.values[s.key]);
  if (missing >= 0) { ui.status = t("Choose the previous field first"); ui.cur = formRowOf("fstep", r => r.i === missing); draw(); return; }
  const text = await api.ask(step.prompt.title, step.prompt.placeholder, f.queries[step.key] || "", !!step.allowEmpty);
  ui.cur = formRowOf("fstep", r => r.i === i);
  if (text === null) { draw(); return; }
  f.queries[step.key] = text; f.results = null; ui.status = t("Loading…"); draw();
  let items = [];
  try { items = await step.search(text, formValues(f)); }
  catch (error) { ui.status = t("Could not load: {why}", {why: error.message}); ui.cur = formRowOf("fstep", r => r.i === i); draw(); return; }
  if (!items.length) { ui.status = t("Nothing found. Please try again."); ui.cur = formRowOf("fstep", r => r.i === i); draw(); return; }   // everything chosen so far stays
  f.results = {step: i, items: items.slice(0, 40)};
  ui.status = "";
  ui.cur = formRowOf("fres");
  draw();
}

function formPick(item) {
  const f = ui.form, i = f.results.step, step = f.steps[i];
  f.values[step.key] = item;
  for (const later of f.steps.slice(i + 1)) { delete f.values[later.key]; delete f.queries[later.key]; }   // a changed field invalidates the fields after it
  f.results = null;
  ui.status = "";
  if (i + 1 < f.steps.length) { ui.cur = formRowOf("fstep", r => r.i === i + 1); draw(); formStep(i + 1); }   // on to the next field: its keyboard opens
  else { ui.cur = formRowOf("fdone"); draw(); }
}

async function formFinish() {
  const f = ui.form;
  ui.status = t("Loading…"); draw();
  try {
    const result = await f.finish(formValues(f));
    if (result.error) { ui.status = result.error; ui.cur = formRowOf("fdone"); draw(); return; }
    ui.status = result.message || "";
    ui.form = null;
    f.resolve(true);
  } catch (error) { ui.status = t("Could not load: {why}", {why: error.message}); draw(); }
}

function formBack() {
  const f = ui.form;
  if (f.results) { const at = f.results.step; f.results = null; ui.cur = formRowOf("fstep", r => r.i === at); draw(); return; }   // close the result list first
  ui.form = null;
  f.resolve(false);
}

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
  else if (row.id === "fstep") formStep(row.i);
  else if (row.id === "fres") formPick(row.item);
  else if (row.id === "fdone") formFinish();
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
    else if (ui.view === "form") formBack();
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
