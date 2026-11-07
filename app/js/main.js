// Entry point: wires the buttons and starts the app. Each concern lives in its own module (see AGENTS.md / .agents/architecture.md).
import { byId, message } from "./dom.js";
import { refresh } from "./inputs.js";
import { detectApps } from "./apps.js";
import { stop } from "./playback.js";
import { openPicker } from "./picker.js";
import { openArrange } from "./arrange.js";
import { ytLogin } from "./youtube.js";
import { initKeys } from "./keys.js";

byId("refresh").onclick = refresh;
byId("back").onclick = () => stop();
byId("theme").onclick = openPicker;
byId("arrange").onclick = openArrange;
byId("ytlogin").onclick = ytLogin;
// Selection is drawn by the virtual cursor, never by DOM focus.
for (const id of ["ytlogin", "theme", "arrange", "refresh"]) byId(id).onfocus = () => byId(id).blur();

initKeys();
window.addEventListener("error", e => message("Error: " + e.message));
detectApps();
refresh();
