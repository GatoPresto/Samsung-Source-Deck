// The single keydown router. Priority: login -> theme picker -> Arrange -> media browser -> (playing) -> Back -> YouTube feed -> main screen.
import { byId } from "./dom.js";
import { state, tv, yt } from "./state.js";
import { ZONES, LAST_ZONE, usable, drawCursor, stepZone } from "./cursor.js";
import { move } from "./render.js";
import { open, stop, peekBack } from "./playback.js";
import { browser, browserKey } from "./dlna.js";
import { picker, pickerKey } from "./picker.js";
import { arr, arrangeKey } from "./arrange.js";
import { loginUi, loginKey, currentVideos, selectChannel, playYoutube } from "./youtube.js";

export function initKeys() {
  document.addEventListener("keydown", event => {
    if (loginUi.open) { loginKey(event); return; }
    if (picker.open) { pickerKey(event); return; }
    if (arr.open) { arrangeKey(event); return; }
    if (browser.server && !state.active && !byId("browser").hidden) { browserKey(event); return; }
    if (state.active && event.keyCode !== 10009 && event.key !== "Escape") peekBack();
    const isBack = event.key === "Escape" || event.keyCode === 10009;
    if (isBack && yt.inFeed) { event.preventDefault(); yt.inFeed = false; yt.row = "vids"; drawCursor(); return; }
    if (isBack) {
      if (state.active) { event.preventDefault(); stop(); }
      else if (tv) tv.application.getCurrentApplication().exit();
      return;
    }
    if (state.active) return;
    const key = event.key;
    if (yt.inFeed) { feedKey(event, key); return; }
    if (key === "ArrowLeft" || key === "ArrowRight") {
      event.preventDefault();
      const step = key === "ArrowLeft" ? -1 : 1;
      if (state.zone === 0) move(step);
      else {
        let next = state.zone;
        do { next = next + step < 1 ? LAST_ZONE : next + step > LAST_ZONE ? 1 : next + step; } while (!usable(next) && next !== state.zone);
        state.zone = next;
        drawCursor();
      }
    } else if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      if (key === "ArrowUp" && state.zone === 0 && yt.shown && byId("vids").children.length) {
        yt.inFeed = true; yt.row = "vids"; yt.idx = Math.min(yt.idx, byId("vids").children.length - 1);
        drawCursor();
        return;
      }
      state.zone = stepZone(key === "ArrowUp" ? -1 : 1, 0);
      drawCursor();
    } else if (key === "Enter") {
      event.preventDefault();
      if (state.zone === 0) open(); else byId(ZONES[state.zone]).click();
    }
  });
}

/** Keys while the cursor is inside the YouTube feed (channel row above, video row below). */
function feedKey(event, key) {
  const subsRow = yt.row === "subs";
  const n = byId(subsRow ? "subs" : "vids").children.length;
  const pos = subsRow ? yt.sidx : yt.idx;
  if (key === "ArrowLeft" || key === "ArrowRight") {
    event.preventDefault();
    const next = Math.max(0, Math.min(n - 1, pos + (key === "ArrowLeft" ? -1 : 1)));
    if (subsRow) yt.sidx = next; else yt.idx = next;
    drawCursor();
  } else if (key === "ArrowUp") {
    event.preventDefault();
    if (!subsRow && byId("subs").children.length) { yt.row = "subs"; drawCursor(); }
  } else if (key === "ArrowDown") {
    event.preventDefault();
    if (subsRow && byId("vids").children.length) yt.row = "vids"; else yt.inFeed = false;
    drawCursor();
  } else if (key === "Enter") {
    event.preventDefault();
    if (subsRow) selectChannel(yt.sidx === 0 ? null : yt.feed?.channels?.[yt.sidx - 1]);
    else playYoutube(currentVideos()[yt.idx]);
  }
}
