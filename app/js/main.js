// Entry point: wires the buttons and starts the app. Each concern lives in its own module (see AGENTS.md / .agents/architecture.md).
import { byId, message } from "./dom.js";
import { refresh } from "./inputs.js";
import { detectApps } from "./apps.js";
import { stop } from "./playback.js";
import { openPicker } from "./picker.js";
import { openArrange } from "./arrange.js";
import { openBgPicker } from "./bgpicker.js";
import { ytLogin } from "./youtube.js";
import { initKeys } from "./keys.js";
import { registerMediaKeys } from "./music.js";
import { initPrompt } from "./textprompt.js";
import { openSettings } from "./settings.js";
import { openWidgetEditor } from "./widgetedit.js";
import { applyLanguage } from "./i18n.js";

byId("refresh").onclick = refresh;
byId("back").onclick = () => stop();
byId("theme").onclick = openPicker;
byId("arrange").onclick = openArrange;
byId("bgbtn").onclick = openBgPicker;
byId("settings").onclick = openSettings;
byId("widgetsbtn").onclick = () => openWidgetEditor();
byId("ytlogin").onclick = ytLogin;
// Selection is drawn by the virtual cursor, never by DOM focus.
for (const id of ["ytlogin", "theme", "bgbtn", "widgetsbtn", "arrange", "refresh", "settings"]) byId(id).onfocus = () => byId(id).blur();

initKeys();
initPrompt();
registerMediaKeys();
window.addEventListener("error", e => message("Error: " + e.message));
// the language is loaded first so the first draw is already translated
applyLanguage().catch(() => {}).then(() => { detectApps(); refresh(); });
