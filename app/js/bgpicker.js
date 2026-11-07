// "Change background" screen: a menu (search Unsplash / Wallhaven, router pictures, USB drive, scope, dimming, remove) and a picture grid.
import { byId } from "./dom.js";
import { state } from "./state.js";
import { prefs, savePrefs } from "./prefs.js";
import { makeRow, makeBgTile } from "./templates.js";
import { focusSel } from "./cursor.js";
import { render } from "./render.js";
import { syncRing } from "./glass.js";
import { openPrompt } from "./textprompt.js";
import { toBackgroundJpeg } from "./imageutil.js";
import { bgPut } from "./bgstore.js";
import { bgPrefs, DIM_LEVELS, assignBackground, removeBackground, currentKey, resetBackground } from "./background.js";
import * as src from "./bgsources.js";

export const bg = {open: false};
const ui = {view: "menu", cur: 0, gcur: 0, card: null, rows: [], items: [], title: "", stack: [], busy: 0};
const COLS = 4;

const setStatus = text => { byId("bgStatus").textContent = text || ""; };

function menuRows() {
  const b = bgPrefs(), card = ui.card;
  const rows = [
    {id: "unsplash", label: "Search Unsplash" + (src.unsplashReady() ? "" : "  ·  add a free key first")},
    {id: "wallhaven", label: "Search Wallhaven wallpapers"},
    {id: "router", label: "Pictures from the router" + (src.servers().length ? "" : "  ·  none found yet")},
    {id: "usb", label: "Pictures from a USB drive" + (src.usbSupported() ? "" : "  ·  not available")},
    {id: "scope", label: "Apply to:  " + (b.scope === "all" ? "All sources" : "This source only (" + card.name + ")")},
    {id: "dim", label: "Dimming:  " + DIM_LEVELS[b.dim].label},
  ];
  if (currentKey(card)) rows.push({id: "remove", label: "Remove the background" + (b.scope === "all" ? " of all sources" : " of this source")});
  return rows;
}

function draw() {
  const menu = ui.view === "menu";
  byId("bgView").dataset.view = menu ? "menu" : "grid";
  byId("bgList").hidden = !menu;
  byId("bgGrid").hidden = menu;
  byId("bgTitle").textContent = menu ? "Change background · " + ui.card.name : ui.title;
  byId("bgHint").textContent = menu ? "↑↓ choose · OK select · Back close" : "↑↓←→ choose · OK use this picture / open folder · Back return";
  if (menu) {
    byId("bgGrid").textContent = "";
    const list = byId("bgList");
    list.textContent = "";
    ui.rows = menuRows();
    ui.cur = Math.min(ui.cur, ui.rows.length - 1);
    ui.rows.forEach((row, i) => {
      const el = makeRow(row.label, i === ui.cur ? "cur" : "");
      el.onclick = () => { ui.cur = i; activate(); };
      list.appendChild(el);
    });
    list.children[ui.cur]?.scrollIntoView({block: "nearest"});
  } else {
    byId("bgList").textContent = "";   // a hidden list must not keep a .cur (the glass ring would find it first)
    const grid = byId("bgGrid");
    grid.textContent = "";
    ui.items.forEach((item, i) => {
      const tile = makeBgTile(item);
      tile.classList.toggle("cur", i === ui.gcur);
      tile.onclick = () => { ui.gcur = i; activate(); };
      grid.appendChild(tile);
    });
    grid.children[ui.gcur]?.scrollIntoView({block: "nearest"});
  }
  syncRing();
}

export function openBgPicker() {
  const card = state.cards[state.index];
  if (!card) return;
  Object.assign(ui, {view: "menu", cur: 0, gcur: 0, card, items: [], stack: [], busy: 0});
  const b = bgPrefs(), key = currentKey(card);
  if (key) b.scope = b.map[card.id] ? "source" : "all";   // show where the current picture really applies
  bg.open = true;
  setStatus("");
  byId("bgView").hidden = false;
  draw();
}

function close() {
  ui.busy++;
  bg.open = false;
  byId("bgView").hidden = true;
  syncRing();
  focusSel();
}

function showMenu() { ui.view = "menu"; ui.stack = []; setStatus(""); draw(); }

/** Show a grid of items (a promise of items is awaited with a "Loading…" status). */
async function showGrid(title, itemsOrPromise, keepStack = false) {
  const mine = ++ui.busy;
  if (!keepStack) ui.stack = [];
  ui.view = "grid"; ui.title = title; ui.items = []; ui.gcur = 0;
  setStatus("Loading…");
  draw();
  try {
    const items = await itemsOrPromise;
    if (mine !== ui.busy) return;
    ui.items = items;
    setStatus(items.length ? "" : "Nothing found here.");
  } catch (error) {
    if (mine !== ui.busy) return;
    setStatus("Could not load: " + error.message);
  }
  draw();
}

function ask(title, placeholder, source, label) {
  openPrompt({
    title, placeholder, okLabel: "Search", allowEmpty: true, onSubmit: text => showGrid(label + (text ? ": " + text : " · popular"), source(text)),
    onCancel: () => { draw(); },
  });
}

async function activateMenu() {
  const row = ui.rows[ui.cur], b = bgPrefs();
  if (!row) return;
  if (row.id === "unsplash" || row.id === "wallhaven") {
    const unsplash = row.id === "unsplash", name = unsplash ? "Unsplash" : "Wallhaven";
    if (unsplash && !src.unsplashReady()) { setStatus("Add your free API key to app/backgrounds-config.js (see .agents/backgrounds-setup.md), then reinstall."); return; }
    ask("Search " + name, "e.g. sunset, mountains, city (empty = popular)", unsplash ? src.unsplash : src.wallhaven, name);
  } else if (row.id === "router") {
    const servers = src.servers();
    if (!servers.length) { setStatus("No media server found yet. Press Refresh on the main screen and try again."); return; }
    const entries = servers.map(s => ({kind: "folder", title: s.name, open: () => src.serverFolder(s, "0", s.name)}));
    if (entries.length === 1) { ui.stack = []; showGrid(entries[0].title, entries[0].open()); } else showGrid("Media servers", entries);
  } else if (row.id === "usb") {
    if (!src.usbSupported()) { setStatus("This TV does not expose its file system to apps."); return; }
    showGrid("USB drive", src.usbStorages().then(list => {
      if (!list.length) throw new Error("no USB drive found (plug one in and try again)");
      return list.map(s => ({kind: "folder", title: s.label || "USB drive", open: () => src.usbFolder(s.label)}));
    }));
  } else if (row.id === "scope") {
    // Applies at once: the picture now in effect moves to "all sources" or becomes this source's own picture.
    b.scope = b.scope === "all" ? "source" : "all";
    const key = currentKey(ui.card);
    if (key) {
      if (b.scope === "source") b.all = null;   // other sources lose it; this one keeps it
      await assignBackground(b.scope, ui.card.id, key);
      render();
    } else savePrefs();
    setStatus(key ? (b.scope === "all" ? "This picture now shows on all sources." : "This picture now shows on this source only.") : "");
    draw();
  } else if (row.id === "dim") { b.dim = (b.dim + 1) % DIM_LEVELS.length; savePrefs(); resetBackground(); render(); draw(); }
  else if (row.id === "remove") { await removeBackground(b.scope, ui.card.id); render(); close(); }
}

async function choose(item) {
  const mine = ++ui.busy;
  setStatus("Downloading…");
  try {
    const blob = await item.fetchBlob();
    if (mine !== ui.busy) return;
    setStatus("Preparing…");
    const jpeg = await toBackgroundJpeg(blob);
    if (mine !== ui.busy) return;
    await bgPut({key: item.key, blob: jpeg, source: item.key.split(":")[0], title: item.title, credit: item.credit || "", creditUrl: item.creditUrl || ""});
    const b = bgPrefs();
    await assignBackground(b.scope, ui.card.id, item.key);
    render();
    close();
  } catch (error) {
    if (mine === ui.busy) setStatus("Could not use this picture: " + error.message);
  }
}

async function activateGrid() {
  const item = ui.items[ui.gcur];
  if (!item) return;
  if (item.kind === "image") { choose(item); return; }
  ui.stack.push({title: ui.title, items: ui.items, gcur: ui.gcur});
  showGrid(item.title, item.open(), true);
}

function activate() { if (ui.view === "menu") activateMenu(); else activateGrid(); }

export function bgKey(event) {
  const key = event.key;
  if (event.keyCode === 10009 || key === "Escape") {
    event.preventDefault();
    if (ui.view === "grid") {
      ui.busy++;
      const up = ui.stack.pop();
      if (up) { ui.title = up.title; ui.items = up.items; ui.gcur = up.gcur; setStatus(""); draw(); } else showMenu();
    } else close();
    return;
  }
  if (ui.view === "menu") {
    if (key === "ArrowDown" || key === "ArrowUp") { event.preventDefault(); ui.cur = (ui.cur + (key === "ArrowDown" ? 1 : -1) + ui.rows.length) % ui.rows.length; draw(); }
    else if (key === "Enter") { event.preventDefault(); activate(); }
    return;
  }
  const n = ui.items.length;
  if (!n) return;
  if (key === "ArrowLeft") ui.gcur = Math.max(0, ui.gcur - 1);
  else if (key === "ArrowRight") ui.gcur = Math.min(n - 1, ui.gcur + 1);
  else if (key === "ArrowUp") ui.gcur = Math.max(0, ui.gcur - COLS);
  else if (key === "ArrowDown") ui.gcur = Math.min(n - 1, ui.gcur + COLS);
  else if (key === "Enter") { event.preventDefault(); activate(); return; }
  else return;
  event.preventDefault();
  draw();
}
