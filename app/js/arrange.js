// Arrange screen: two lists.
//  - Arrange list (left): the sources shown in the deck. Reorder, hide/show (kept in the list), or remove (moves to the Source list).
//  - Source list (right): every known source that is not in the Arrange list (including all apps found on the TV). OK adds one to the Arrange list.
// Newly found apps/servers only ever appear in the Source list.
import { byId } from "./dom.js";
import { state } from "./state.js";
import { prefs, savePrefs } from "./prefs.js";
import { kindOf } from "./themes.js";
import { makeRow } from "./templates.js";
import { focusSel } from "./cursor.js";
import { applyPrefs, buildStrip, render, populate, migrateToArrangeList } from "./render.js";
import { syncRing } from "./glass.js";
import { t, T } from "./i18n.js";

export const arr = {open: false, col: "A", curA: 0, curS: 0, edit: false};

const hasSystemApps = () => state.installedApps.some(c => c.system);
/** Rows of the Source list: an optional "show system apps" switch first, then the pool. */
const sourceRows = () => (hasSystemApps() ? [{toggle: true}] : []).concat(state.pool);

const HINTS = {
  A: T("↑↓ choose · OK edit · → Source list · Back done"),
  edit: T("EDIT: ↑↓ move · OK show / hide · ← remove from list · Back finish"),
  S: T("↑↓ choose · OK add to the Arrange list · ← Arrange list · Back done"),
};

function clamp() {
  arr.curA = Math.max(0, Math.min(arr.curA, state.allCards.length - 1));
  arr.curS = Math.max(0, Math.min(arr.curS, sourceRows().length - 1));
}

function drawArrange() {
  clamp();
  const listA = byId("alist"), listS = byId("slist");
  listA.textContent = ""; listS.textContent = "";
  const shown = state.cards.length;
  byId("hA").textContent = state.allCards.length > shown ? t("Arrange list · {shown} shown, {hidden} hidden", {shown, hidden: state.allCards.length - shown}) : t("Arrange list · {shown} shown", {shown});
  byId("hS").textContent = t("Source list · {n}", {n: state.pool.length});
  byId("colA").classList.toggle("active", arr.col === "A");
  byId("colS").classList.toggle("active", arr.col === "S");
  state.allCards.forEach((card, i) => {
    const hidden = prefs.hidden[card.id];
    const cls = (arr.col === "A" && i === arr.curA ? "cur " + (arr.edit ? "grab " : "") : "") + (hidden ? "off" : "");
    const row = makeRow((hidden ? "☐  " : "☑  ") + card.name + "  ·  " + kindOf(card) + (hidden ? "  ·  " + t("hidden") : ""), cls);
    row.onclick = () => { arr.col = "A"; arr.curA = i; arr.edit = true; drawArrange(); };
    listA.appendChild(row);
  });
  if (!state.allCards.length) listA.textContent = t("Empty. Add sources from the Source list.");
  sourceRows().forEach((item, i) => {
    const cls = arr.col === "S" && i === arr.curS ? "cur" : "";
    const row = item.toggle
      ? makeRow((state.showSystem ? "☑  " : "☐  ") + t("Show system apps ({n})", {n: state.installedApps.filter(c => c.system).length}), cls + " sys")
      : makeRow("＋  " + item.name + "  ·  " + kindOf(item) + (item.system ? "  ·  " + t("system") : ""), cls);
    row.onclick = () => { arr.col = "S"; arr.curS = i; activateSource(); };
    listS.appendChild(row);
  });
  if (!sourceRows().length) listS.textContent = t("Nothing else found. New apps and servers show up here.");
  const hint = HINTS[arr.col === "A" && arr.edit ? "edit" : arr.col];
  byId("ahint").textContent = t(hint);
  (arr.col === "A" ? listA : listS).querySelector(".cur")?.scrollIntoView({block: "nearest"});
  syncRing();
}

export function openArrange() {
  migrateToArrangeList(true);
  applyPrefs();
  arr.open = true; arr.col = "A"; arr.edit = false;
  arr.curA = Math.max(0, state.allCards.findIndex(card => card.id === state.cards[state.index]?.id));
  arr.curS = 0;
  byId("arrangeView").hidden = false;
  drawArrange();
}

function closeArrange() {
  arr.open = false; arr.edit = false;
  byId("arrangeView").hidden = true;
  buildStrip();
  render();
  focusSel();
}

// ---- Arrange list actions ----
function toggleHidden(card) {
  if (prefs.hidden[card.id]) delete prefs.hidden[card.id]; else prefs.hidden[card.id] = true;
  savePrefs();
  applyPrefs();
}

function moveCard(card, step) {
  const list = state.allCards;
  const i = list.indexOf(card), j = i + step;
  if (j < 0 || j >= list.length) return;
  const a = prefs.added;
  const ia = a.indexOf(card.id), ib = a.indexOf(list[j].id);
  [a[ia], a[ib]] = [a[ib], a[ia]];
  savePrefs();
  applyPrefs();
  arr.curA = j;
}

function removeCard(card) {
  prefs.added = prefs.added.filter(id => id !== card.id);
  delete prefs.hidden[card.id];
  savePrefs();
  applyPrefs();
  arr.edit = false;
}

// ---- Source list actions ----
function activateSource() {
  const item = sourceRows()[arr.curS];
  if (!item) return;
  if (item.toggle) {
    state.showSystem = !state.showSystem;
    populate(state.lastSources);
  } else {
    prefs.added.push(item.id);
    savePrefs();
    applyPrefs();
  }
  drawArrange();
}

export function arrangeKey(event) {
  const key = event.key;
  const back = event.keyCode === 10009 || key === "Escape";
  const vertical = key === "ArrowDown" || key === "ArrowUp" ? (key === "ArrowDown" ? 1 : -1) : 0;
  if (back) {
    event.preventDefault();
    if (arr.edit) { arr.edit = false; drawArrange(); } else closeArrange();
    return;
  }
  if (arr.col === "A") {
    const card = state.allCards[arr.curA];
    if (vertical) {
      event.preventDefault();
      if (arr.edit && card) moveCard(card, vertical);
      else if (state.allCards.length) arr.curA = (arr.curA + vertical + state.allCards.length) % state.allCards.length;
    } else if (key === "Enter") {
      event.preventDefault();
      if (!card) return;
      if (arr.edit) toggleHidden(card); else arr.edit = true;
    } else if (key === "ArrowLeft") {
      event.preventDefault();
      if (arr.edit && card) removeCard(card);
    } else if (key === "ArrowRight") {
      event.preventDefault();
      if (arr.edit) arr.edit = false; else arr.col = "S";
    } else return;
  } else {
    const rows = sourceRows();
    if (vertical) {
      event.preventDefault();
      if (rows.length) arr.curS = (arr.curS + vertical + rows.length) % rows.length;
    } else if (key === "Enter") { event.preventDefault(); activateSource(); return; }
    else if (key === "ArrowLeft") { event.preventDefault(); arr.col = "A"; }
    else return;
  }
  drawArrange();
}
