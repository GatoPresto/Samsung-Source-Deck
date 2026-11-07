// Theme picker: a plain list overlay (no native <select>), driven by the virtual cursor.
import { byId } from "./dom.js";
import { state } from "./state.js";
import { prefs, savePrefs } from "./prefs.js";
import { THEMES, detectTheme } from "./themes.js";
import { makeRow } from "./templates.js";
import { focusSel } from "./cursor.js";
import { buildStrip, render } from "./render.js";
import { syncRing } from "./glass.js";

export const picker = {open: false, cursor: 0, options: []};

function drawPicker() {
  const list = byId("tlist");
  list.textContent = "";
  picker.options.forEach((option, i) => {
    const row = makeRow((option.current ? "●  " : "○  ") + option.label, i === picker.cursor ? "cur" : "");
    row.onclick = () => { picker.cursor = i; choosePicker(); };
    list.appendChild(row);
  });
  list.children[picker.cursor]?.scrollIntoView({block: "nearest"});
  syncRing();
}

export function openPicker() {
  const card = state.cards[state.index];
  if (!card) return;
  state.themeTarget = card.id;
  const chosen = THEMES.some(t => t.key === prefs.theme[card.id]) ? prefs.theme[card.id] : "auto";
  picker.options = [{key: "auto", label: "Auto (" + THEMES.find(t => t.key === detectTheme(card)).label + ")"}]
    .concat(THEMES.map(t => ({key: t.key, label: t.label})));
  picker.options.forEach(o => { o.current = o.key === chosen; });
  picker.cursor = Math.max(0, picker.options.findIndex(o => o.current));
  byId("themeFor").textContent = "Theme for " + card.name;
  picker.open = true;
  byId("themeView").hidden = false;
  drawPicker();
}

function closePicker() {
  picker.open = false;
  byId("themeView").hidden = true;
  focusSel();
}

function choosePicker() {
  const option = picker.options[picker.cursor];
  if (option.key === "auto") delete prefs.theme[state.themeTarget]; else prefs.theme[state.themeTarget] = option.key;
  savePrefs();
  buildStrip();
  render();
  closePicker();
}

export function pickerKey(event) {
  const key = event.key;
  if (key === "ArrowDown" || key === "ArrowUp") {
    event.preventDefault();
    picker.cursor = (picker.cursor + (key === "ArrowDown" ? 1 : -1) + picker.options.length) % picker.options.length;
    drawPicker();
  } else if (key === "Enter") { event.preventDefault(); choosePicker(); }
  else if (event.keyCode === 10009 || key === "Escape" || key === "ArrowLeft") { event.preventDefault(); closePicker(); }
}
