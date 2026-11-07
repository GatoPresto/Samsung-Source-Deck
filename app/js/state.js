// Shared runtime state and platform handles. No imports: every other module may import this one.
export const tv = window.tizen;                              // Tizen device API (undefined in a desktop browser)
export const player = window.webapis && window.webapis.avplay;
export const config = window.sourceDeck;                     // from sources.js
export const demo = !tv;                                     // desktop browser preview with fake sources

export const state = {
  cards: [],            // visible sources, in display order (what the strip shows)
  allCards: [],         // all sources in display order, including hidden ones
  natural: [],          // all sources in default order (before prefs.order is applied)
  index: 0,             // selected index into cards
  active: null,         // the source currently open (HDMI in-app view / stream), null on the picker
  generation: 0,        // bumped to cancel stale open() callbacks
  refreshGeneration: 0, // bumped to cancel stale refresh() callbacks
  lastSources: [],      // last VIDEOSOURCE list, lets late scan results re-run populate()
  zone: 0,              // virtual cursor zone, see cursor.js
  themeTarget: null,    // card id the theme picker is editing
  installedApps: [],    // apps found on the TV: the curated ones (YouTube, Netflix...) and every other launchable app (see apps.js)
  appsReady: false,     // true once the TV's app list has been read (needed before the one-time migration to the Arrange list)
  showSystem: false,    // Source list: also show system apps (session only)
  pool: [],             // the Source list: known sources that are not in the Arrange list
};

export const streams = (config.streams || [])
  .filter(entry => /^https?:\/\//i.test(entry.url))
  .map(entry => ({ id: "stream:" + entry.url, name: entry.name, url: entry.url }));

export const dlnaFound = (config.dlna || [])
  .map(entry => ({ id: "dlna:" + entry.control, name: entry.name, dlna: entry.control }));

export const loadJson = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
export const saveJson = (key, value) => {
  try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

// YouTube login/feed state (logic in youtube.js). Lives here so cursor.js can read it without importing youtube.js.
export const yt = {
  tokens: loadJson("yt-tokens"), feed: loadJson("yt-feed"),
  loading: false, error: "", shown: false, inFeed: false,
  idx: 0, row: "vids", sidx: 0, view: null,
};
