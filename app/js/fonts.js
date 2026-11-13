// Fonts for widgets. The files are bundled in app/fonts (woff2, split by script so only the needed part is loaded) and declared in css/fonts.css as "sd-<key>".
// Licenses: THIRD-PARTY-NOTICES.md. To add a font: put its woff2 files in app/fonts, add the @font-face rules to css/fonts.css, and a row below.
// `note` says which scripts the font covers; a widget option that offers fonts shows it next to the name (the clock only draws digits and AM/PM, so every font works there).
import { T, t } from "./i18n.js";
import { prefs, savePrefs } from "./prefs.js";
import { deck } from "./dom.js";

const NOTES = {
  lc: T("Latin + Cyrillic"),
  l: T("Latin only"),
  ja: T("Latin + Cyrillic + Japanese (basic)"),   // kana and the characters of dates, not the full kanji set
  ko: T("Latin + Korean (basic)"),                // the characters of dates, not all hangul
};

export const FONTS = [
  {key: "montserrat", name: "Montserrat", note: NOTES.lc},
  {key: "oswald", name: "Oswald", note: NOTES.lc},
  {key: "roboto-mono", name: "Roboto Mono", note: NOTES.lc},
  {key: "russo-one", name: "Russo One", note: NOTES.lc},
  {key: "exo-2", name: "Exo 2", note: NOTES.lc},
  {key: "unbounded", name: "Unbounded", note: NOTES.lc},
  {key: "playfair-display", name: "Playfair Display", note: NOTES.lc},
  {key: "press-start-2p", name: "Press Start 2P", note: NOTES.lc},
  {key: "pacifico", name: "Pacifico", note: NOTES.lc},
  {key: "caveat", name: "Caveat", note: NOTES.lc},
  {key: "rubik-mono-one", name: "Rubik Mono One", note: NOTES.lc},
  {key: "orbitron", name: "Orbitron", note: NOTES.l},
  {key: "bebas-neue", name: "Bebas Neue", note: NOTES.l},
  {key: "share-tech-mono", name: "Share Tech Mono", note: NOTES.l},
  {key: "audiowide", name: "Audiowide", note: NOTES.l},
  {key: "vt323", name: "VT323", note: NOTES.l},
  {key: "kosugi-maru", name: "Kosugi Maru", note: NOTES.ja},
  {key: "dotgothic16", name: "DotGothic16", note: NOTES.ja},
  {key: "zen-maru-gothic", name: "Zen Maru Gothic", note: NOTES.ja},
  {key: "black-han-sans", name: "Black Han Sans", note: NOTES.ko},
  {key: "do-hyeon", name: "Do Hyeon", note: NOTES.ko},
  {key: "jua", name: "Jua", note: NOTES.ko},
];

/** The option every widget that supports fonts adds to its options: OK opens a list. "auto" = the font of the slide's theme. */
export const FONT_OPTION = {
  key: "font", label: T("Font"), list: true, family: key => familyOf(key),   // `family`: the list draws each row in its own font
  values: [["auto", T("Theme font")], ...FONTS.map(f => [f.key, f.name, f.note])],
};

/** CSS font-family for a font key ("" = keep the theme's font). */
export const familyOf = key => FONTS.some(f => f.key === key) ? '"sd-' + key + '", system-ui, sans-serif' : "";

// ---- the app-wide font (Settings > Appearance > Font) ----
// prefs.font = a font key, absent = each theme's own font. A widget whose Font option is "Theme font" follows it; a widget with its own font keeps it.
const valid = key => FONTS.some(f => f.key === key);
export const appFontKey = () => valid(prefs.font) ? prefs.font : "";
/** The font a widget really uses: its own choice, else the app-wide one, else "" (the theme's font). */
export const effectiveKey = widgetKey => valid(widgetKey) ? widgetKey : appFontKey();

/** Put the app-wide font on the page: --app-font for the text that inherits, and the theme variables that name the title and button fonts. */
export function applyAppFont() {
  const family = familyOf(appFontKey());
  document.documentElement.style.setProperty("--app-font", family || "");
  for (const prop of ["--title-font", "--btn-font"]) {
    if (family) deck.style.setProperty(prop, family); else deck.style.removeProperty(prop);   // inline on <main>: beats every theme rule
  }
}
export function setAppFont(key) {
  if (valid(key)) prefs.font = key; else delete prefs.font;
  savePrefs();
  applyAppFont();
}

/** Fill a list row with a font preview: the name and a sample text in the font (`sample`: what the widget or the app shows), the covered scripts on a second line in the normal font. */
export function fillFontRow(el, mark, value, sample = "12:34") {
  const font = FONTS.find(f => f.key === value);
  el.textContent = "";
  const line = document.createElement("span");
  line.textContent = mark + (font ? font.name + "  •  " + sample : "");   // the name, then a sample of what the widget shows, both in the font
  if (font) line.style.fontFamily = familyOf(font.key);
  el.append(line);
  el.classList.add("fontrow");
  if (font) { const note = document.createElement("small"); note.textContent = t(font.note); el.append(note); }
}

// ---- text width ----
// The clock sizes its text so the whole time fits the widget; that needs the width of the text in the chosen font (em), which differs a lot between fonts.
let ctx = null;
const widestDigit = new Map();
/** Width of `text` in em in font `key`, digits counted at the font's widest digit; null while the font is still loading (`onReady` runs when it is). */
export function textEm(key, text, onReady) {
  const family = '"sd-' + key + '"';
  if (!document.fonts || !document.fonts.check("100px " + family, "0123456789")) {
    if (document.fonts) document.fonts.load("100px " + family, "0123456789" + text).then(onReady, () => {});
    return null;
  }
  ctx = ctx || document.createElement("canvas").getContext("2d");
  ctx.font = "100px " + family;
  let digit = widestDigit.get(key);
  if (!digit) {
    digit = "0";
    for (const d of "123456789") if (ctx.measureText(d).width > ctx.measureText(digit).width) digit = d;
    widestDigit.set(key, digit);
  }
  return ctx.measureText(text.replace(/\d/g, digit)).width / 100;
}
