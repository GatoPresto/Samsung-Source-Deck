// Theme list and detection. Each theme also needs css/themes/<file>.css (main[data-theme=KEY] + .tile[data-theme=KEY]).
import { prefs } from "./prefs.js";

export const THEMES = [
  {key: "default", label: "Generic", glyph: "▭"},
  {key: "ps", label: "PlayStation", glyph: "△ ○ ✕ □"},
  {key: "switch", label: "Nintendo Switch", glyph: "◖ ◗"},
  {key: "xbox", label: "Xbox", glyph: "Ⓧ"},
  {key: "stream", label: "Network media", glyph: "≈≈≈"},
  {key: "tv", label: "Live TV", glyph: "▦"},
  {key: "youtube", label: "YouTube", glyph: "▶"},
  {key: "netflix", label: "Netflix", glyph: "N"},
  {key: "gta6", label: "GTA 6", glyph: "VI"},
  {key: "gta6classic", label: "GTA 6 Retro", glyph: "VI"}, // key kept from the old name "GTA 6 Classic"
];
export const GLYPH = Object.fromEntries(THEMES.map(t => [t.key, t.glyph]));

/** Theme chosen automatically from what the source is and what it is called. */
export function detectTheme(card) {
  if (card.app) return card.appTheme;
  const name = card.name;
  return card.url || card.dlna ? "stream" : card.source?.type === "TV" ? "tv" :
    /playstation|\bps\s?\d/i.test(name) ? "ps" : /switch|nintendo/i.test(name) ? "switch" :
    /xbox/i.test(name) ? "xbox" : /gta|grand theft/i.test(name) ? "gta6" : "default";
}

/** Theme in effect for a source: the user's saved choice, else the detected one. */
export function themeOf(card) {
  if (!card) return "default";
  const chosen = prefs.theme[card.id];
  return THEMES.some(t => t.key === chosen) ? chosen : detectTheme(card);
}

export function kindOf(card) {
  return card.app ? "App" : card.dlna ? "Media server" : card.url ? "Stream" :
    card.source?.type === "TV" ? "Live TV" : "HDMI " + card.source.number;
}
