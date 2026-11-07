// Arrange: show/hide and reorder sources (including media servers and apps).
import { byId } from "./dom.js";
import { state } from "./state.js";
import { prefs, savePrefs } from "./prefs.js";
import { kindOf } from "./themes.js";
import { makeRow } from "./templates.js";
import { focusSel } from "./cursor.js";
import { applyPrefs, buildStrip, render } from "./render.js";

export const arr = {open: false, cursor: 0};

function drawArrange() {
  const list = byId("alist");
  list.textContent = "";
  state.allCards.forEach((card, i) => {
    const hidden = prefs.hidden[card.id];
    const row = makeRow((hidden ? "☐  " : "☑  ") + card.name + "  ·  " + kindOf(card) + (hidden ? "  ·  hidden" : ""),
      (i === arr.cursor ? "cur " : "") + (hidden ? "off" : ""));
    row.onclick = () => { arr.cursor = i; toggleHidden(); };
    list.appendChild(row);
  });
  if (!state.allCards.length) list.textContent = "No sources yet. Press Refresh first.";
  list.children[arr.cursor]?.scrollIntoView({block: "nearest"});
}

export function openArrange() {
  arr.open = true;
  arr.cursor = Math.max(0, state.allCards.findIndex(card => card.id === state.cards[state.index]?.id));
  byId("arrangeView").hidden = false;
  drawArrange();
}

function closeArrange() {
  arr.open = false;
  byId("arrangeView").hidden = true;
  buildStrip();
  render();
  focusSel();
}

function commitOrder() {
  prefs.order = state.allCards.map(card => card.id);
  savePrefs();
  state.natural = state.allCards.slice();
  applyPrefs();
}

function toggleHidden() {
  const card = state.allCards[arr.cursor];
  if (!card) return;
  if (prefs.hidden[card.id]) delete prefs.hidden[card.id]; else prefs.hidden[card.id] = true;
  savePrefs();
  applyPrefs();
  drawArrange();
}

function moveInArrange(step) {
  const to = arr.cursor + step;
  if (to < 0 || to >= state.allCards.length) return;
  [state.allCards[arr.cursor], state.allCards[to]] = [state.allCards[to], state.allCards[arr.cursor]];
  arr.cursor = to;
  commitOrder();
  drawArrange();
}

export function arrangeKey(event) {
  const key = event.key;
  if (key === "ArrowDown" || key === "ArrowUp") {
    event.preventDefault();
    if (state.allCards.length) arr.cursor = (arr.cursor + (key === "ArrowDown" ? 1 : -1) + state.allCards.length) % state.allCards.length;
    drawArrange();
  } else if (key === "Enter") { event.preventDefault(); toggleHidden(); }
  else if (key === "ArrowLeft") { event.preventDefault(); moveInArrange(-1); }
  else if (key === "ArrowRight") { event.preventDefault(); moveInArrange(1); }
  else if (event.keyCode === 10009 || key === "Escape") { event.preventDefault(); closeArrange(); }
}
