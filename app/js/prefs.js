// Remembered user choices: theme per source, hidden sources, display order. All keyed by stable source id.
import { message } from "./dom.js";

export const prefs = {theme: {}, hidden: {}, order: []};
try { Object.assign(prefs, JSON.parse(localStorage.getItem("deck-prefs")) || {}); } catch {}

// v1: the first "gta6" look was renamed "gta6classic"; keep users who picked it on that look. Bump prefs.v for future key renames.
if (!prefs.v) {
  for (const id of Object.keys(prefs.theme)) if (prefs.theme[id] === "gta6") prefs.theme[id] = "gta6classic";
  prefs.v = 1;
  try { localStorage.setItem("deck-prefs", JSON.stringify(prefs)); } catch {}
}

export function savePrefs() {
  try { localStorage.setItem("deck-prefs", JSON.stringify(prefs)); }
  catch (error) { message("Could not save settings: " + error.message); }
}
