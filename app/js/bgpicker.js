// "Change background" screen: a menu (search Unsplash / Wallhaven, router pictures, USB drive, Starred, scope, dimming, star, remove) and a picture grid.
// In a grid, OK on a picture opens a small sheet: use it as the background, or add it to / remove it from Starred (kept pictures).
import { byId, scrollListTo } from "./dom.js";
import { state } from "./state.js";
import { prefs, savePrefs } from "./prefs.js";
import { makeRow, makeBgTile } from "./templates.js";
import { focusSel } from "./cursor.js";
import { render } from "./render.js";
import { syncRing } from "./glass.js";
import { openPrompt } from "./textprompt.js";
import { toBackgroundJpeg, toThumbJpeg } from "./imageutil.js";
import { bgPut, bgGet, bgAll, bgSetStar } from "./bgstore.js";
import { bgPrefs, DIM_LEVELS, assignBackground, removeBackground, currentKey, resetBackground, gc } from "./background.js";
import * as src from "./bgsources.js";
import { t } from "./i18n.js";

export const bg = {open: false};
const ui = {view: "menu", cur: 0, gcur: 0, card: null, rows: [], items: [], title: "", stack: [], busy: 0, starred: new Set(), sheet: null, thumbUrls: [], isStarredView: false};
const COLS = 4;

const setStatus = text => { byId("bgStatus").textContent = text || ""; };

function menuRows() {
  const b = bgPrefs(), card = ui.card;
  const rows = [
    {id: "unsplash", label: t("Search Unsplash") + (src.unsplashReady() ? "" : "  ·  " + t("add a free key first"))},
    {id: "wallhaven", label: t("Search Wallhaven wallpapers")},
    {id: "router", label: t("Pictures from the router") + (src.servers().length ? "" : "  ·  " + t("none found yet"))},
    {id: "usb", label: t("Pictures from a USB drive") + (src.usbSupported() ? "" : "  ·  " + t("not available"))},
    {id: "starred", label: "★  " + t("Starred backgrounds · {n}", {n: ui.starred.size})},
    {id: "scope", label: t("Apply to:") + "  " + (b.scope === "all" ? t("All sources") : t("This source only ({name})", {name: card.name}))},
    {id: "dim", label: t("Dimming:") + "  " + t(DIM_LEVELS[b.dim].label)},
  ];
  const current = currentKey(card);
  if (current) rows.push({id: "starcur", label: ui.starred.has(current) ? "★  " + t("Remove the star from this background") : "☆  " + t("Star this background")});
  if (current) rows.push({id: "remove", label: b.scope === "all" ? t("Remove the background of all sources") : t("Remove the background of this source")});
  return rows;
}

function draw() {
  const menu = ui.view === "menu";
  byId("bgView").dataset.view = menu ? "menu" : "grid";
  byId("bgList").hidden = !menu;
  byId("bgGrid").hidden = menu;
  byId("bgTitle").textContent = menu ? t("Change background") + " · " + ui.card.name : ui.title;
  byId("bgHint").textContent = t(menu || ui.sheet ? "↑↓ choose · OK select · Back close" : "↑↓←→ choose · OK picture options / open folder · Back return");
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
    scrollListTo(list, list.children[ui.cur]);
  } else {
    byId("bgList").textContent = "";   // a hidden list must not keep a .cur (the glass ring would find it first)
    const grid = byId("bgGrid");
    grid.textContent = "";
    ui.items.forEach((item, i) => {
      const tile = makeBgTile(item, item.kind === "image" && ui.starred.has(item.key));
      tile.classList.toggle("cur", i === ui.gcur);
      tile.onclick = () => { ui.gcur = i; activate(); };
      grid.appendChild(tile);
    });
    grid.children[ui.gcur]?.scrollIntoView({block: "nearest"});
  }
  drawSheet();
  syncRing();
}

export function openBgPicker() {
  const card = state.cards[state.index];
  if (!card) return;
  Object.assign(ui, {view: "menu", cur: 0, gcur: 0, card, items: [], stack: [], busy: 0});
  ui.sheet = null; ui.isStarredView = false;
  refreshStars();
  const b = bgPrefs(), key = currentKey(card);
  if (key) b.scope = b.map[card.id] ? "source" : "all";   // show where the current picture really applies
  bg.open = true;
  setStatus("");
  byId("bgView").hidden = false;
  draw();
}

function close() {
  ui.busy++;
  ui.sheet = null;
  revokeThumbs();
  bg.open = false;
  byId("bgView").hidden = true;
  syncRing();
  focusSel();
}

function showMenu() { ui.view = "menu"; ui.stack = []; ui.isStarredView = false; revokeThumbs(); setStatus(""); draw(); }

/** Show a grid of items (a promise of items is awaited with a "Loading…" status). */
async function showGrid(title, itemsOrPromise, keepStack = false) {
  const mine = ++ui.busy;
  if (!keepStack) ui.stack = [];
  revokeThumbs();
  ui.view = "grid"; ui.title = title; ui.items = []; ui.gcur = 0; ui.isStarredView = false;
  setStatus(t("Loading…"));
  draw();
  try {
    const items = await itemsOrPromise;
    if (mine !== ui.busy) return;
    ui.items = items;
    setStatus(items.length ? "" : t("Nothing found here."));
  } catch (error) {
    if (mine !== ui.busy) return;
    setStatus(t("Could not load: {why}", {why: error.message}));
  }
  draw();
}

function ask(title, placeholder, source, label) {
  openPrompt({
    title, placeholder, okLabel: t("Search"), allowEmpty: true, onSubmit: text => showGrid(label + (text ? ": " + text : " · " + t("popular")), source(text)),
    onCancel: () => { draw(); },
  });
}

async function activateMenu() {
  const row = ui.rows[ui.cur], b = bgPrefs();
  if (!row) return;
  if (row.id === "unsplash" || row.id === "wallhaven") {
    const unsplash = row.id === "unsplash", name = unsplash ? "Unsplash" : "Wallhaven";
    if (unsplash && !src.unsplashReady()) { setStatus("Add your free API key to app/backgrounds-config.js (see .agents/backgrounds-setup.md), then reinstall."); return; }
    ask(t("Search {name}", {name}), t("e.g. sunset, mountains, city (empty = popular)"), unsplash ? src.unsplash : src.wallhaven, name);
  } else if (row.id === "router") {
    const servers = src.servers();
    if (!servers.length) { setStatus(t("No media server found yet. Press Rescan sources on the main screen and try again.")); return; }
    const entries = servers.map(s => ({kind: "folder", title: s.name, open: () => src.serverFolder(s, "0", s.name)}));
    if (entries.length === 1) { ui.stack = []; showGrid(entries[0].title, entries[0].open()); } else showGrid(t("Media servers"), entries);
  } else if (row.id === "usb") {
    if (!src.usbSupported()) { setStatus(t("This TV does not expose its file system to apps.")); return; }
    showGrid(t("USB drive"), src.usbStorages().then(list => {
      if (!list.length) throw new Error("no USB drive found (plug one in and try again)");
      return list.map(s => ({kind: "folder", title: s.label || t("USB drive"), open: () => src.usbFolder(s.label)}));
    }));
  } else if (row.id === "starred") { showStarred();
  } else if (row.id === "starcur") { const key = currentKey(ui.card); if (key) await toggleStar({key});
  } else if (row.id === "scope") {
    // Applies at once: the picture now in effect moves to "all sources" or becomes this source's own picture.
    b.scope = b.scope === "all" ? "source" : "all";
    const key = currentKey(ui.card);
    if (key) {
      if (b.scope === "source") b.all = null;   // other sources lose it; this one keeps it
      await assignBackground(b.scope, ui.card.id, key);
      render();
    } else savePrefs();
    setStatus(!key ? "" : b.scope === "all" ? t("This picture now shows on all sources.") : t("This picture now shows on this source only."));
    draw();
  } else if (row.id === "dim") { b.dim = (b.dim + 1) % DIM_LEVELS.length; savePrefs(); resetBackground(); render(); draw(); }
  else if (row.id === "remove") { await removeBackground(b.scope, ui.card.id); render(); close(); }
}

/** Make sure the picture is stored locally (download, shrink to 1920x1080, keep in IndexedDB). A stored picture is not downloaded again. */
async function ensureStored(item, onPrepare) {
  if (await bgGet(item.key)) return;
  const blob = await item.fetchBlob();
  if (onPrepare) onPrepare();
  const jpeg = await toBackgroundJpeg(blob);
  await bgPut({key: item.key, blob: jpeg, source: item.key.split(":")[0], title: item.title, credit: item.credit || "", creditUrl: item.creditUrl || ""});
}

async function choose(item) {
  const mine = ++ui.busy;
  setStatus(t("Downloading…"));
  try {
    await ensureStored(item, () => { if (mine === ui.busy) setStatus(t("Preparing…")); });
    if (mine !== ui.busy) return;
    const b = bgPrefs();
    await assignBackground(b.scope, ui.card.id, item.key);
    render();
    close();
  } catch (error) {
    if (mine === ui.busy) setStatus(t("Could not use this picture: {why}", {why: error.message}));
  }
}

// ---- starred pictures: kept even when no source uses them ----
async function refreshStars() {
  try { ui.starred = new Set((await bgAll()).filter(r => r.starred).map(r => r.key)); } catch (error) { ui.starred = new Set(); }
  if (bg.open) draw();
}

function revokeThumbs() { ui.thumbUrls.forEach(url => URL.revokeObjectURL(url)); ui.thumbUrls = []; }

async function starredItems() {
  const records = (await bgAll()).filter(r => r.starred).sort((a, b) => (b.starredAt || 0) - (a.starredAt || 0));
  return records.map(r => {
    const url = URL.createObjectURL(r.thumb || r.blob);
    ui.thumbUrls.push(url);
    return {kind: "image", key: r.key, title: r.title || r.key, thumb: url, credit: r.credit || "", creditUrl: r.creditUrl || ""};
  });
}

function showStarred() {
  if (!ui.starred.size) { setStatus(t("No starred backgrounds yet. Open a picture and choose “Add to starred”.")); return; }
  showGrid(t("Starred backgrounds"), starredItems());
  ui.isStarredView = true;
}

async function toggleStar(item) {
  try {
    if (ui.starred.has(item.key)) {
      await bgSetStar(item.key, false);
      await gc();   // a picture that nothing uses any more is deleted now
      await refreshStars();
      if (ui.isStarredView) {
        ui.items = ui.items.filter(i => i.key !== item.key);
        ui.gcur = Math.min(ui.gcur, Math.max(0, ui.items.length - 1));
      }
      setStatus(ui.isStarredView && !ui.items.length ? t("No starred backgrounds yet. Open a picture and choose “Add to starred”.") : t("Removed from starred."));
    } else {
      setStatus(t("Saving…"));
      await ensureStored(item);
      const record = await bgGet(item.key);
      await bgSetStar(item.key, true, await toThumbJpeg(record.blob));
      await refreshStars();
      setStatus(t("Added to starred."));
    }
  } catch (error) { setStatus(t("Could not use this picture: {why}", {why: error.message})); }
  draw();
}

// ---- the small sheet that opens on OK over a picture ----
function openSheet(item) {
  const starred = ui.starred.has(item.key);
  ui.sheet = {item, cur: 0, rows: [
    {id: "use", label: t("Use as background")},
    {id: "star", label: (starred ? "★  " : "☆  ") + t(starred ? "Remove from starred" : "Add to starred")},
  ]};
  draw();
}

function drawSheet() {
  const box = byId("bgSheet");
  box.hidden = !ui.sheet;
  if (!ui.sheet) return;
  byId("bgSheetTitle").textContent = ui.sheet.item.credit || ui.sheet.item.title;
  const list = byId("bgSheetList");
  list.textContent = "";
  ui.sheet.rows.forEach((row, i) => {
    const el = makeRow(row.label, i === ui.sheet.cur ? "cur" : "");
    el.onclick = () => { ui.sheet.cur = i; runSheet(); };
    list.appendChild(el);
  });
}

function runSheet() {
  const {item, rows, cur} = ui.sheet;
  ui.sheet = null;
  draw();
  if (rows[cur].id === "use") choose(item); else toggleStar(item);
}

async function activateGrid() {
  const item = ui.items[ui.gcur];
  if (!item) return;
  if (item.kind === "image") { openSheet(item); return; }
  ui.stack.push({title: ui.title, items: ui.items, gcur: ui.gcur});
  showGrid(item.title, item.open(), true);
}

function activate() { if (ui.view === "menu") activateMenu(); else activateGrid(); }

export function bgKey(event) {
  const key = event.key;
  if (ui.sheet) {   // the picture sheet has the keys while it is open
    event.preventDefault();
    if (event.keyCode === 10009 || key === "Escape") { ui.sheet = null; draw(); }
    else if (key === "ArrowDown" || key === "ArrowUp") { ui.sheet.cur = (ui.sheet.cur + (key === "ArrowDown" ? 1 : -1) + ui.sheet.rows.length) % ui.sheet.rows.length; draw(); }
    else if (key === "Enter") runSheet();
    return;
  }
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
