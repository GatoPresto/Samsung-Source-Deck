// Theme picker: a plain list overlay (no native <select>), driven by the virtual cursor.
import { byId } from "./dom.js";
import { state } from "./state.js";
import { prefs, savePrefs } from "./prefs.js";
import { THEMES, detectTheme } from "./themes.js";
import { makeRow } from "./templates.js";
import { focusSel } from "./cursor.js";
import { buildStrip, render } from "./render.js";
import { syncRing } from "./glass.js";
import { t } from "./i18n.js";

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
  const chosen = THEMES.some(th => th.key === prefs.theme[card.id]) ? prefs.theme[card.id] : "auto";
  picker.options = [{key: "auto", label: t("Auto ({theme})", {theme: t(THEMES.find(th => th.key === detectTheme(card)).label)})}]
    .concat(THEMES.map(th => ({key: th.key, label: t(th.label)})));
  picker.options.forEach(o => { o.current = o.key === chosen; });
  picker.cursor = Math.max(0, picker.options.findIndex(o => o.current));
  byId("themeFor").textContent = t("Theme for {name}", {name: card.name});
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
