// Theme list and detection. Each theme also needs css/themes/<file>.css (main[data-theme=KEY] + .tile[data-theme=KEY]).
import { prefs } from "./prefs.js";
import { t, T } from "./i18n.js";

/**
 * Accent colours of a theme: {key, label, glow (saturated, tints the background), accent (light, text and focus), ink (text on accent)}.
 * The first entry is the theme's default look (nothing is overridden). A theme supports accents by having `accents` here and using
 * var(--glow), var(--accent), var(--ink) in its css file (see css/themes/home.css). The choice is saved per source in prefs.accent[cardId].
 */
const HOME_ACCENTS = [
  {key: "blue", label: T("Blue"), glow: "#3a5bd9", accent: "#a9c4ff", ink: "#0d1426"},
  {key: "purple", label: T("Purple"), glow: "#7c3aed", accent: "#cdb8ff", ink: "#1a0b3a"},
  {key: "pink", label: T("Pink"), glow: "#db2777", accent: "#ffb3d9", ink: "#3a0620"},
  {key: "red", label: T("Red"), glow: "#dc2626", accent: "#ffb4b4", ink: "#3a0808"},
  {key: "orange", label: T("Orange"), glow: "#ea580c", accent: "#ffcfa3", ink: "#3a1a05"},
  {key: "yellow", label: T("Yellow"), glow: "#ca8a04", accent: "#ffe98a", ink: "#2e2305"},
  {key: "green", label: T("Green"), glow: "#16a34a", accent: "#a7f3c0", ink: "#06280f"},
  {key: "teal", label: T("Teal"), glow: "#0d9488", accent: "#9ef0e4", ink: "#04262a"},
  {key: "graphite", label: T("Graphite"), glow: "#6b7280", accent: "#e5e7eb", ink: "#111318"},
];

export const THEMES = [
  {key: "default", label: T("Generic"), glyph: "▭"},
  {key: "ps", label: "PlayStation", glyph: "△ ○ ✕ □"},
  {key: "switch", label: "Nintendo Switch", glyph: "◖ ◗"},
  {key: "xbox", label: "Xbox", glyph: "Ⓧ"},
  {key: "stream", label: T("Network media"), glyph: "≈≈≈"},
  {key: "home", label: T("Home"), glyph: "⌂", accents: HOME_ACCENTS},
  {key: "tv", label: T("Live TV"), glyph: "▦"},
  {key: "youtube", label: "YouTube", glyph: "▶"},
  {key: "netflix", label: "Netflix", glyph: "N"},
  {key: "hbomax", label: "HBO Max", glyph: "max"},
  {key: "primevideo", label: "Prime Video", glyph: "prime"},
  {key: "appletv", label: "Apple TV", glyph: "tv"},
  {key: "applemusic", label: "Apple Music", glyph: "♪"},
  {key: "applemusicglass", label: "Apple Music Liquid Glass", glyph: "♪"},
  {key: "gta6", label: "GTA 6", glyph: "VI"},
  {key: "gta6classic", label: "GTA 6 Retro", glyph: "VI"}, // key kept from the old name "GTA 6 Classic"
];
export const GLYPH = Object.fromEntries(THEMES.map(t => [t.key, t.glyph]));

/** Theme chosen automatically from what the source is and what it is called. */
export function detectTheme(card) {
  if (card.home) return "home";
  if (card.app) return card.appTheme;
  const name = card.name;
  return card.url || card.dlna ? "stream" : card.source?.type === "TV" ? "tv" :
    /playstation|\bps\s?\d/i.test(name) ? "ps" : /switch|nintendo/i.test(name) ? "switch" :
    /xbox/i.test(name) ? "xbox" : /gta|grand theft/i.test(name) ? "gta6" : "default";
}

/** The accent colour in effect for a source on a theme: the saved choice, else the theme's first accent; null when the theme has no accents. */
export function accentOf(card, themeKey) {
  const accents = THEMES.find(th => th.key === themeKey)?.accents;
  if (!accents || !card) return null;
  return accents.find(a => a.key === prefs.accent?.[card.id]) || accents[0];
}

/** Theme in effect for a source: the user's saved choice, else the detected one. */
export function themeOf(card) {
  if (!card) return "default";
  const chosen = prefs.theme[card.id];
  return THEMES.some(t => t.key === chosen) ? chosen : detectTheme(card);
}

export function kindOf(card) {
  return card.home ? t("Widgets") : card.app ? t("App") : card.dlna ? t("Media server") : card.url ? t("Stream") :
    card.source?.type === "TV" ? t("Live TV") : t("HDMI {n}", {n: card.source.number});
}
