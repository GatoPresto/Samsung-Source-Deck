// Apps on the TV. The curated ones (YouTube, Netflix...) get their own theme; every other launchable app is detected automatically
// and uses the generic theme. Newly found apps only appear in the Source list (Arrange screen), never in the deck on their own.
import { state, tv, demo } from "./state.js";
import { populate } from "./render.js";

// Curated apps: {key, name, theme, ids}. Find ids by logging tizen.application.getAppsInfo (see .agents/tv-platform-notes.md).
export const APPS = [
  {key: "youtube", name: "YouTube", theme: "youtube", ids: ["9Ur5IzDKqV.TizenYouTube", "com.samsung.tv.cobalt-yt"]},
  {key: "netflix", name: "Netflix", theme: "netflix", ids: ["org.tizen.netflix-app", "3201907018807"]},
  {key: "hbomax", name: "HBO Max", theme: "hbomax", ids: ["5b8c3eb16b.BeamCTVDev"]},
  {key: "primevideo", name: "Prime Video", theme: "primevideo", ids: ["org.tizen.primevideo", "org.tizen.primevideo-dummy"]},
  {key: "appletv", name: "Apple TV", theme: "appletv", ids: ["com.samsung.tv.aria-video", "com.samsung.tv.aria-dummy"]},
  {key: "applemusic", name: "Apple Music", theme: "applemusic", ids: ["org.tizen.apple.apple-music", "org.tizen.apple.apple-music-dummy"]},
];

const OWN_ID = "SrcDeck001.SourceDeck";
// Store apps have ids like "FyObqYlHVG.SWEETTV". A few Samsung built-ins are useful too. Everything else the TV marks as launchable is a "system" app
// (hidden behind "Show system apps" in the Source list).
const isStoreApp = id => /^[A-Za-z0-9]{10}\.[A-Za-z0-9_]+$/.test(id);
const USEFUL_BUILTINS = new Set(["org.tizen.browser", "com.samsung.tv.SmartThingsApp", "com.samsung.tv.store", "com.samsung.tv.food", "com.samsung.tv.gaminghub",
  "com.samsung.tv.gamehome", "com.samsung.tv.music-flex", "org.tizen.art-app", "com.samsung.tv.knox-browser", "com.samsung.tv.mycontents", "com.samsung.tv.quicklaunch"]);

function curatedCards(present) {
  return APPS.filter(a => a.ids.some(id => present.has(id)))
    .map(a => ({id: "app:" + a.key, name: a.name, app: a.ids.find(id => present.has(id)), appTheme: a.theme}));
}

function genericCards(list, curatedIds) {
  const seen = new Set();
  const cards = [];
  for (const info of list) {
    const name = (info.name || "").trim();
    if (info.show !== true || !name || info.id === OWN_ID || curatedIds.has(info.id) || seen.has(info.id)) continue;
    seen.add(info.id);
    cards.push({id: "app:" + info.id, name, app: info.id, appTheme: "default", generic: true, system: !(isStoreApp(info.id) || USEFUL_BUILTINS.has(info.id))});
  }
  return cards;
}

export function detectApps() {
  if (demo) {
    const present = new Set(APPS.flatMap(a => a.ids));
    state.installedApps = curatedCards(present).concat([
      {id: "app:demo.internet", name: "Internet", app: "org.tizen.browser", appTheme: "default", generic: true, system: false},
      {id: "app:demo.sweet", name: "SWEET.TV", app: "FyObqYlHVG.SWEETTV", appTheme: "default", generic: true, system: false},
      {id: "app:demo.swu", name: "Software Update", app: "org.tizen.tv.swu", appTheme: "default", generic: true, system: true},
    ]);
    state.appsReady = true;
    return;
  }
  try {
    tv.application.getAppsInfo(list => {
      const present = new Set(list.map(a => a.id));
      const curated = curatedCards(present);
      const curatedIds = new Set(APPS.flatMap(a => a.ids));
      state.installedApps = curated.concat(genericCards(list, curatedIds));
      state.appsReady = true;
      populate(state.lastSources);
    }, () => { state.appsReady = true; populate(state.lastSources); });
  } catch (error) { state.appsReady = true; }
}
