// One virtual cursor instead of DOM focus (see AGENTS.md rule 2).
// zone 0 = the source tiles, then the footer buttons. YouTube's feed rows are a mode on top (yt.inFeed).
import { byId } from "./dom.js";
import { state, yt } from "./state.js";

/** Modules that draw extra cursor state register a function here (called at the end of drawCursor). */
export const cursorHooks = [];

export const ZONES = [null, "ytlogin", "theme", "arrange", "refresh"];
export const LAST_ZONE = ZONES.length - 1;

export function usable(z) {
  return z === 0 ? state.cards.length > 0 : z === 1 ? !byId("ytlogin").hidden : z === 2 ? state.cards.length > 0 : true;
}

export function drawCursor() {
  if (!usable(state.zone)) state.zone = usable(0) ? 0 : LAST_ZONE;
  if (yt.inFeed && !yt.shown) yt.inFeed = false;
  [...byId("strip").children].forEach((tile, i) => tile.classList.toggle("cur", state.zone === 0 && !yt.inFeed && i === state.index));
  ZONES.forEach((id, z) => { if (id) byId(id).classList.toggle("cur", !yt.inFeed && state.zone === z); });
  [...byId("vids").children].forEach((v, i) => v.classList.toggle("cur", yt.inFeed && yt.row === "vids" && i === yt.idx));
  [...byId("subs").children].forEach((v, i) => v.classList.toggle("cur", yt.inFeed && yt.row === "subs" && i === yt.sidx));
  const cur = yt.row === "subs" ? byId("subs").children[yt.sidx] : byId("vids").children[yt.idx];
  const rowEl = yt.row === "subs" ? byId("subs") : byId("vids");
  if (yt.inFeed && cur) rowEl.scrollLeft = Math.max(0, cur.offsetLeft - 40);
  byId("musicOpen").classList.toggle("cur", yt.inFeed && yt.row === "open");
  cursorHooks.forEach(fn => fn());
  fadeEdges();
}

/** Fade a row's left/right edge only when more items are hidden on that side (css/fades.css reads --fl/--fr). */
export function fadeEdges() {
  for (const id of ["strip", "subs", "vids"]) {
    const el = byId(id);
    // write only when the value changes: a style write repaints the whole row (and re-runs every glass filter inside it)
    const set = (name, value) => { if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value); };
    set("--fl", el.scrollLeft > 2 ? "80px" : "0px");
    set("--fr", el.scrollLeft + el.clientWidth < el.scrollWidth - 2 ? "80px" : "0px");
  }
}
window.addEventListener("resize", () => fadeEdges());

export function focusSel() { state.zone = 0; yt.inFeed = false; drawCursor(); }

export function stepZone(step, wrapFrom) {
  let next = state.zone;
  do { next += step; } while (next >= wrapFrom && next <= LAST_ZONE && !usable(next));
  return next >= wrapFrom && next <= LAST_ZONE ? next : state.zone;
}
