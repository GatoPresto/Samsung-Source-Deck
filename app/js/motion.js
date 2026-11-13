// "Smooth motion" (Settings): on = the strip glides and the focus ring slides (D60), off = both jump at once and the title does not fade in.
// Slower TVs drop frames during the glides (see D67), so the user can turn them off. Stored in prefs.motion ("off"); the default is on.
import { prefs, savePrefs } from "./prefs.js";

export const smoothMotion = () => prefs.motion !== "off";
export function applyMotion() { document.documentElement.dataset.motion = smoothMotion() ? "" : "off"; }
export function toggleMotion() {
  if (smoothMotion()) prefs.motion = "off"; else delete prefs.motion;
  savePrefs();
  applyMotion();
}
