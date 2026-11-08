// Interface languages. The English text itself is the key: t("Rescan sources") returns the English text unless the chosen language has a translation.
// Translations live in js/lang/<code>.js (one default-exported {english: translated} object, loaded only when that language is in use).
// {name} placeholders are filled from the second argument: t("Theme for {name}", {name}).
// Static HTML uses data-i18n="English text" (textContent), data-i18n-placeholder and data-i18n-label (aria-label).
import { prefs, savePrefs } from "./prefs.js";

// Native names. Order = order in the Settings list. Right-to-left languages are not supported (the layout is left-to-right).
export const LANGUAGES = [
  {code: "en", name: "English"}, {code: "uk", name: "Українська"}, {code: "es", name: "Español"}, {code: "fr", name: "Français"},
  {code: "de", name: "Deutsch"}, {code: "it", name: "Italiano"}, {code: "pt", name: "Português"}, {code: "pl", name: "Polski"},
  {code: "nl", name: "Nederlands"}, {code: "cs", name: "Čeština"}, {code: "sv", name: "Svenska"}, {code: "tr", name: "Türkçe"},
  {code: "ja", name: "日本語"}, {code: "ko", name: "한국어"}, {code: "zh", name: "简体中文"},
];

let dict = {};
let active = "en";

/** Marks a string for translation without translating it now (labels kept in constants; call t(label) when drawing). */
export const T = text => text;

export function t(text, vars) {
  let out = Object.prototype.hasOwnProperty.call(dict, text) ? dict[text] : text;
  if (vars) out = out.replace(/\{(\w+)\}/g, (match, key) => key in vars ? vars[key] : match);
  return out;
}

/** Language code of the TV's menu language when we have a translation for it, else English. */
export function systemLanguage() {
  const tag = String((typeof navigator !== "undefined" && navigator.language) || "en").toLowerCase().replace("_", "-");
  const base = tag.split("-")[0];
  if (base === "zh") return /^zh(-(cn|sg|hans.*))?$/.test(tag) ? "zh" : "en";   // only Simplified Chinese is translated
  return LANGUAGES.some(l => l.code === base) ? base : "en";
}

/** The code in use for a saved choice ("system" or a code). */
export const resolveLanguage = choice => !choice || choice === "system" ? systemLanguage() : LANGUAGES.some(l => l.code === choice) ? choice : "en";
export const languageName = code => LANGUAGES.find(l => l.code === code)?.name || "English";
export const currentLanguage = () => active;

/** Load the dictionary for the saved choice and update the static HTML texts. Callers then redraw the dynamic texts. */
export async function applyLanguage() {
  const code = resolveLanguage(prefs.lang);
  let loaded = {};
  if (code !== "en") {
    try { loaded = (await import("./lang/" + code + ".js")).default || {}; } catch (error) { loaded = {}; }
  }
  dict = loaded;
  active = code;
  document.documentElement.lang = code;
  applyStatic();
}

export function applyStatic() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const text = t(el.dataset.i18n);
    if (el.textContent !== text) el.textContent = text;
  }
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll("[data-i18n-label]")) el.setAttribute("aria-label", t(el.dataset.i18nLabel));
}

export function setLanguage(choice) {
  prefs.lang = choice;
  savePrefs();
  return applyLanguage();
}
