// Theme picker: two lists, drawn with the virtual cursor (no native <select>): themes on the left, the accent colours of the highlighted theme on the right.
// OK on a theme applies it (keeping the saved accent); Right moves to the accents (only when the theme has some); OK there applies theme + accent.
import { byId } from "./dom.js";
import { state } from "./state.js";
import { prefs, savePrefs } from "./prefs.js";
import { THEMES, detectTheme, accentOf } from "./themes.js";
import { makeRow } from "./templates.js";
import { focusSel } from "./cursor.js";
import { buildStrip, render } from "./render.js";
import { syncRing } from "./glass.js";
import { t } from "./i18n.js";

export const picker = {open: false, cursor: 0, options: [], col: "T", acursor: 0};

const card = () => state.cards.find(c => c.id === state.themeTarget);
/** The theme an option stands for ("auto" = the detected one). */
const themeKeyOf = option => option.key === "auto" ? detectTheme(card()) : option.key;
const accentsOf = option => THEMES.find(th => th.key === themeKeyOf(option))?.accents || null;
const currentAccentIndex = option => { const accents = accentsOf(option); return accents ? Math.max(0, accents.findIndex(a => a === accentOf(card(), themeKeyOf(option)))) : 0; };

function drawPicker() {
  const list = byId("tlist"), side = byId("taccents");
  list.textContent = ""; side.textContent = "";
  picker.options.forEach((option, i) => {
    const row = makeRow((option.current ? "●  " : "○  ") + option.label, picker.col === "T" && i === picker.cursor ? "cur" : "");
    row.onclick = () => { picker.col = "T"; picker.cursor = i; choosePicker(false); };
    list.appendChild(row);
  });
  const accents = accentsOf(picker.options[picker.cursor]);
  if (accents) {
    const saved = accentOf(card(), themeKeyOf(picker.options[picker.cursor]));
    accents.forEach((accent, i) => {
      const row = makeRow("", picker.col === "A" && i === picker.acursor ? "cur" : "");
      const swatch = document.createElement("i");
      swatch.className = "sw";
      swatch.style.background = accent.accent;
      row.append((accent === saved ? "●  " : "○  "), swatch, t(accent.label));
      row.onclick = () => { picker.col = "A"; picker.acursor = i; choosePicker(true); };
      side.appendChild(row);
    });
  } else {
    const note = document.createElement("p");
    note.className = "none";
    note.textContent = t("This theme has no accent colors.");
    side.appendChild(note);
  }
  byId("tcolT").classList.toggle("active", picker.col === "T");
  byId("tcolA").classList.toggle("active", picker.col === "A");
  byId("thint").textContent = picker.col === "A" ? t("↑↓ choose · OK select · ← themes · Back cancel") : accents ? t("↑↓ choose · OK select · → accent colors · Back cancel") : t("↑↓ choose · OK select · Back cancel");
  (picker.col === "A" ? side : list).querySelector(".cur")?.scrollIntoView({block: "nearest"});
  syncRing();
}

export function openPicker() {
  const c = state.cards[state.index];
  if (!c) return;
  state.themeTarget = c.id;
  const chosen = THEMES.some(th => th.key === prefs.theme[c.id]) ? prefs.theme[c.id] : "auto";
  picker.options = [{key: "auto", label: t("Auto ({theme})", {theme: t(THEMES.find(th => th.key === detectTheme(c)).label)})}]
    .concat(THEMES.map(th => ({key: th.key, label: t(th.label)})));
  picker.options.forEach(o => { o.current = o.key === chosen; });
  picker.cursor = Math.max(0, picker.options.findIndex(o => o.current));
  picker.col = "T";
  picker.acursor = currentAccentIndex(picker.options[picker.cursor]);
  byId("themeFor").textContent = t("Theme for {name}", {name: c.name});
  picker.open = true;
  byId("themeView").hidden = false;
  drawPicker();
}

function closePicker() {
  picker.open = false;
  byId("themeView").hidden = true;
  focusSel();
}

/** Apply the highlighted theme; with `withAccent` also the highlighted accent (the first accent of a theme means "default": nothing saved). */
function choosePicker(withAccent) {
  const option = picker.options[picker.cursor];
  if (option.key === "auto") delete prefs.theme[state.themeTarget]; else prefs.theme[state.themeTarget] = option.key;
  const accents = accentsOf(option);
  if (withAccent && accents) {
    if (picker.acursor === 0) { if (prefs.accent) delete prefs.accent[state.themeTarget]; }
    else { prefs.accent = prefs.accent || {}; prefs.accent[state.themeTarget] = accents[picker.acursor].key; }
  }
  savePrefs();
  buildStrip();
  render();
  closePicker();
}

export function pickerKey(event) {
  const key = event.key, back = event.keyCode === 10009 || key === "Escape";
  if (back) { event.preventDefault(); closePicker(); return; }
  const accents = accentsOf(picker.options[picker.cursor]);
  if (key === "ArrowDown" || key === "ArrowUp") {
    event.preventDefault();
    const step = key === "ArrowDown" ? 1 : -1;
    if (picker.col === "A") picker.acursor = (picker.acursor + step + accents.length) % accents.length;
    else {
      picker.cursor = (picker.cursor + step + picker.options.length) % picker.options.length;
      picker.acursor = currentAccentIndex(picker.options[picker.cursor]);
    }
    drawPicker();
  } else if (key === "ArrowRight") {
    event.preventDefault();
    if (picker.col === "T" && accents) { picker.col = "A"; picker.acursor = currentAccentIndex(picker.options[picker.cursor]); drawPicker(); }
  } else if (key === "ArrowLeft") {
    event.preventDefault();
    if (picker.col === "A") { picker.col = "T"; drawPicker(); } else closePicker();
  } else if (key === "Enter") { event.preventDefault(); choosePicker(picker.col === "A"); }
}
