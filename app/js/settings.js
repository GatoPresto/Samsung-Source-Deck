// Settings (gear button): language and About the developer. A drawer like "Change background"; three views: menu, language list, about.
import { byId } from "./dom.js";
import { state, tv, demo } from "./state.js";
import { prefs } from "./prefs.js";
import { makeRow } from "./templates.js";
import { focusSel } from "./cursor.js";
import { syncRing } from "./glass.js";
import { populate, render } from "./render.js";
import { t, T, LANGUAGES, languageName, systemLanguage, setLanguage } from "./i18n.js";
import { qrSvg } from "./qr.js";

export const settings = {open: false};
const ui = {view: "menu", cur: 0, rows: [], status: ""};

const LINKEDIN = "https://www.linkedin.com/in/gatopresto";
const NAME = "Sergey Naumenko";
const BIO = [T("🇺🇦 Ukrainian here"), T("💻 Software Engineering"), T("🌍🔭 Love the world through science"), T("🏕🏂🧘‍♂️🥳 Chill out with friends")];

const langValue = () => !prefs.lang || prefs.lang === "system" ? t("System") + " (" + languageName(systemLanguage()) + ")" : languageName(prefs.lang);

function rowsFor(view) {
  if (view === "lang") {
    const choice = prefs.lang || "system";
    return [{id: "system", label: (choice === "system" ? "●  " : "○  ") + t("System language ({name})", {name: languageName(systemLanguage())})}]
      .concat(LANGUAGES.map(l => ({id: l.code, label: (choice === l.code ? "●  " : "○  ") + l.name})));
  }
  if (view === "about") return [{id: "linkedin", label: t("Open LinkedIn profile")}];
  return [{id: "language", label: t("Language:") + "  " + langValue()}, {id: "about", label: t("About the developer")}];
}

function draw() {
  const view = ui.view;
  byId("settingsView").dataset.view = "menu";
  byId("setTitle").textContent = view === "lang" ? t("Language") : view === "about" ? t("About the developer") : t("Settings");
  byId("setHint").textContent = view === "menu" ? t("↑↓ choose · OK select · Back close") : t("↑↓ choose · OK select · Back return");
  byId("setStatus").textContent = ui.status;
  const about = byId("setAbout");
  about.hidden = view !== "about";
  byId("setLink").hidden = view !== "about";
  if (view === "about") {
    byId("setName").textContent = NAME;
    byId("setBio").textContent = "";
    for (const line of BIO) { const p = document.createElement("p"); p.textContent = t(line); byId("setBio").appendChild(p); }
    byId("setUrl").textContent = LINKEDIN;
    const svg = qrSvg(LINKEDIN);
    byId("setQr").innerHTML = svg ? svg + "<p>" + t("Scan with your phone") + "</p>" : "";
    byId("setQr").hidden = !svg;
  }
  ui.rows = rowsFor(view);
  ui.cur = Math.max(0, Math.min(ui.cur, ui.rows.length - 1));
  const list = byId("setList");
  list.textContent = "";
  ui.rows.forEach((row, i) => {
    const el = makeRow(row.label, i === ui.cur ? "cur" : "");
    el.onclick = () => { ui.cur = i; activate(); };
    list.appendChild(el);
  });
  list.children[ui.cur]?.scrollIntoView({block: "nearest"});
  syncRing();
}

export function openSettings() {
  Object.assign(ui, {view: "menu", cur: 0, status: ""});
  settings.open = true;
  byId("settingsView").hidden = false;
  draw();
}

function close() {
  settings.open = false;
  byId("settingsView").hidden = true;
  syncRing();
  focusSel();
}

function show(view, cur = 0) { Object.assign(ui, {view, cur, status: ""}); draw(); }

/** Open a web address with the TV's browser (or any app that handles it). Tries the system's choice first, then the Samsung browser. */
function openUrl(url, attempt = 0) {
  const appIds = [null, "org.tizen.browser"];
  if (demo) { window.open(url, "_blank"); return; }
  if (!tv?.application || attempt >= appIds.length) { ui.status = t("Could not open the browser. Scan the QR code instead."); draw(); return; }
  try {
    const control = new tv.ApplicationControl("http://tizen.org/appcontrol/operation/view", url, null, null, null);
    tv.application.launchAppControl(control, appIds[attempt], () => { ui.status = t("Opening…"); draw(); }, () => openUrl(url, attempt + 1));
  } catch (error) { openUrl(url, attempt + 1); }
}

async function activate() {
  const row = ui.rows[ui.cur];
  if (!row) return;
  if (ui.view === "menu") show(row.id === "language" ? "lang" : "about", row.id === "language" ? Math.max(0, LANGUAGES.findIndex(l => l.code === prefs.lang) + 1) : 0);
  else if (ui.view === "lang") {
    await setLanguage(row.id);
    populate(state.lastSources);   // card names and the main screen texts in the new language
    render();
    draw();
  } else if (row.id === "linkedin") openUrl(LINKEDIN);
}

export function settingsKey(event) {
  const key = event.key;
  if (event.keyCode === 10009 || key === "Escape" || (key === "ArrowLeft" && ui.view !== "menu")) {
    event.preventDefault();
    if (ui.view === "menu") close(); else show("menu", ui.view === "lang" ? 0 : 1);
  } else if (key === "ArrowDown" || key === "ArrowUp") {
    event.preventDefault();
    ui.cur = (ui.cur + (key === "ArrowDown" ? 1 : -1) + ui.rows.length) % ui.rows.length;
    draw();
  } else if (key === "Enter") { event.preventDefault(); activate(); }
}
