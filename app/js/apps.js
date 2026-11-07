// Streaming apps (YouTube, Netflix). If installed on the TV they get a tile that launches them.
// Their own screens show the user's personal recommendations (neither app offers them to other apps).
import { state, tv, demo } from "./state.js";
import { populate } from "./render.js";

// Add an app: {key, name, theme, ids}. Find ids by logging tizen.application.getAppsInfo (see .agents/tv-platform-notes.md).
export const APPS = [
  {key: "youtube", name: "YouTube", theme: "youtube", ids: ["9Ur5IzDKqV.TizenYouTube", "com.samsung.tv.cobalt-yt"]},
  {key: "netflix", name: "Netflix", theme: "netflix", ids: ["org.tizen.netflix-app", "3201907018807"]},
  {key: "hbomax", name: "HBO Max", theme: "hbomax", ids: ["5b8c3eb16b.BeamCTVDev"]},
  {key: "primevideo", name: "Prime Video", theme: "primevideo", ids: ["org.tizen.primevideo", "org.tizen.primevideo-dummy"]},
  {key: "appletv", name: "Apple TV", theme: "appletv", ids: ["com.samsung.tv.aria-video", "com.samsung.tv.aria-dummy"]},
  {key: "applemusic", name: "Apple Music", theme: "applemusic", ids: ["org.tizen.apple.apple-music", "org.tizen.apple.apple-music-dummy"]},
];

export function detectApps() {
  if (demo) {
    state.installedApps = APPS.map(a => ({id: "app:" + a.key, name: a.name, app: a.ids[0], appTheme: a.theme}));
    return;
  }
  try {
    tv.application.getAppsInfo(list => {
      const present = new Set(list.map(a => a.id));
      state.installedApps = APPS.filter(a => a.ids.some(id => present.has(id)))
        .map(a => ({id: "app:" + a.key, name: a.name, app: a.ids.find(id => present.has(id)), appTheme: a.theme}));
      populate(state.lastSources);
    }, () => {});
  } catch (error) {}
}
