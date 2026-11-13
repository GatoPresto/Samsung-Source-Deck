// Which HDMI input received a signal most recently (for the Home slide: OK opens it). No imports from render/themes, so both can use it.
// The TV is asked for VIDEOSOURCE every 3 s while the deck is on screen; an input that goes from "no signal" to "connected" gets a timestamp in prefs.signalAt.
// An input already connected when first seen keeps its saved time (or 1 = older than any real change), so after a restart the last one still wins.
import { state, tv } from "./state.js";
import { prefs, savePrefs } from "./prefs.js";
import { deck } from "./dom.js";

const known = new Map();   // input id -> connected, as last seen (this session)
const listeners = [];
export const onSignalChange = fn => listeners.push(fn);

/** Compare the `connected` flags of the HDMI cards in state.natural with the last look; stamp the ones that just got a signal. Returns true when the best input changed. */
export function noteConnections() {
  const before = homeTarget()?.id;
  let saved = false;
  prefs.signalAt ||= {};
  for (const card of state.natural) {
    if (card.source?.type !== "HDMI") continue;
    const was = known.get(card.id), now = !!card.connected;
    if (now && was !== true) {
      prefs.signalAt[card.id] = was === undefined ? (prefs.signalAt[card.id] || 1) : Date.now();
      saved = true;
    }
    known.set(card.id, now);
  }
  if (saved) savePrefs();
  return homeTarget()?.id !== before;
}

/** The input the Home slide opens: the connected HDMI input with the newest signal time (also one hidden from the deck: a device plugged into an unused port is what the user wants); null when none has a signal. */
export function homeTarget() {
  let best = null;
  for (const card of state.natural) {
    if (card.source?.type !== "HDMI" || !card.connected) continue;
    if (!best || (prefs.signalAt?.[card.id] || 0) > (prefs.signalAt?.[best.id] || 0)) best = card;
  }
  return best;
}

// ---- polling: also keeps the Inputs widget current (it draws from the same flags) ----
function poll() {
  if (!tv?.systeminfo || deck.hidden) return;
  try {
    tv.systeminfo.getPropertyValue("VIDEOSOURCE", result => {
      let different = false;
      for (const [group, connected] of [[result?.connected, true], [result?.disconnected, false]]) {
        for (const source of group || []) {
          const card = state.natural.find(c => c.source && c.source.type === source.type && c.source.number === source.number);
          if (card && !!card.connected !== connected) { card.connected = connected; different = true; }
        }
      }
      if (different) { noteConnections(); listeners.forEach(fn => fn()); }
    }, () => {});
  } catch (error) {}
}
setInterval(poll, 3000);
