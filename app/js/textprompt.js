// A full-screen text prompt that uses the TV's on-screen keyboard through a plain <input> (the one place a native input takes focus).
// Used by the Apple Music search and the background-image search. Three targets, drawn with the virtual cursor: the text box (OK opens the keyboard), the OK button and Cancel.
// When the keyboard closes (Done/Back) the cursor jumps to the OK button, so OK then submits.
import { byId } from "./dom.js";
import { focusSel } from "./cursor.js";
import { syncRing } from "./glass.js";

export const prompt = {open: false, cur: 0, onSubmit: null, onCancel: null, allowEmpty: false};
const els = () => [byId("searchInput"), byId("searchGo"), byId("searchCancel")];
function draw() { els().forEach((el, i) => el.classList.toggle("cur", prompt.open && i === prompt.cur)); syncRing(); }

/** Show the prompt. onSubmit(text) runs with the typed text; onCancel (optional) runs instead of returning focus to the main screen. */
export function openPrompt({title = "Search", placeholder = "", value = "", okLabel = "Search", allowEmpty = false, onSubmit, onCancel = null}) {
  prompt.open = true; prompt.cur = 0; prompt.onSubmit = onSubmit; prompt.onCancel = onCancel; prompt.allowEmpty = allowEmpty;
  byId("searchTitle").textContent = title;
  byId("searchGo").textContent = okLabel;
  const input = byId("searchInput");
  input.placeholder = placeholder;
  input.value = value;
  byId("searchView").hidden = false;
  draw();
  input.focus();
}

function close() {
  const cancel = prompt.onCancel;
  prompt.open = false; prompt.onSubmit = null; prompt.onCancel = null;
  byId("searchView").hidden = true;
  byId("searchInput").blur();
  draw();
  if (cancel) cancel(); else focusSel();
}

function submit() {
  if (!prompt.open) return;
  const text = byId("searchInput").value.trim();
  const handler = prompt.onSubmit;
  prompt.open = false; prompt.onSubmit = null; prompt.onCancel = null;
  byId("searchView").hidden = true;
  byId("searchInput").blur();
  draw();
  if (handler && (text || prompt.allowEmpty)) handler(text); else focusSel();
}

export function initPrompt() {
  const input = byId("searchInput");
  input.onfocus = () => { prompt.cur = 0; draw(); };
  input.onblur = () => { if (prompt.open) { prompt.cur = 1; draw(); } };   // keyboard closed -> OK button
  // The Samsung keyboard may hide without blurring the box, so also react to its own keys:
  // Done (65376) = submit now, Cancel (65385) = close the keyboard and move to OK. Up/Down only reach the page when the keyboard is hidden.
  input.onkeydown = event => {
    if (event.keyCode === 65376 || event.key === "Enter") { event.preventDefault(); event.stopPropagation(); submit(); }
    else if (event.keyCode === 65385) { event.preventDefault(); event.stopPropagation(); input.blur(); prompt.cur = 1; draw(); }
    else if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); event.stopPropagation(); input.blur(); prompt.cur = event.key === "ArrowDown" ? 1 : 0; draw(); }
  };
  for (const el of [byId("searchGo"), byId("searchCancel")]) el.onfocus = () => el.blur();
  byId("searchGo").onclick = submit;
  byId("searchCancel").onclick = close;
}

export function promptKey(event) {
  if (document.activeElement === byId("searchInput")) return;   // typing: the box's own onkeydown handles Done/Enter/Cancel/Up/Down
  const key = event.key;
  if (event.keyCode === 10009 || key === "Escape") { event.preventDefault(); close(); }
  else if (key === "ArrowUp" || key === "ArrowLeft") { event.preventDefault(); prompt.cur = Math.max(0, prompt.cur - 1); draw(); }
  else if (key === "ArrowDown" || key === "ArrowRight") { event.preventDefault(); prompt.cur = Math.min(2, prompt.cur + 1); draw(); }
  else if (key === "Enter") {
    event.preventDefault();
    if (prompt.cur === 0) byId("searchInput").focus();
    else if (prompt.cur === 1) submit();
    else close();
  }
}
