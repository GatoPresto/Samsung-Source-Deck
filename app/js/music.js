// Apple Music slide, built only from Apple's free public feeds (no developer account, no login):
//  - charts: the classic itunes.apple.com/<cc>/rss/topsongs|topalbums feeds (optionally per genre)
//  - itunes.apple.com/lookup and /search (songs, albums, artists, 30-second previews)
// It reuses the feed panel (#feed, #subs = tab chips, #vids = cards) and the yt.inFeed/row/idx/sidx cursor state that the YouTube feed uses.
// Not personal: "For you" is built from what was played in this app (kept on the TV). Full songs cannot be played (DRM), only previews.
import { byId, deck } from "./dom.js";
import { state, tv, demo, yt, loadJson, saveJson } from "./state.js";
import { makeChip, makeTrack, makeSkeleton } from "./templates.js";
import { drawCursor, focusSel, cursorHooks } from "./cursor.js";
import { httpJson } from "./http.js";

const isMusic = card => card?.id === "app:applemusic";
const country = () => ((window.sourceDeck && window.sourceDeck.musicCountry) || (navigator.language || "en-US").split("-")[1] || "us").toLowerCase();
const bigArt = url => (url || "").replace(/\/\d+x\d+bb/, "/300x300bb");

const GENRES = [["Pop", 14], ["Hip-Hop", 18], ["Rock", 21], ["Electronic", 7], ["R&B", 15], ["Country", 6], ["Latin", 12], ["Dance", 17], ["Alternative", 20], ["Jazz", 2], ["Classical", 5]];
const TABS = [
  {key: "foryou", label: "For you"},
  {key: "songs", label: "Top songs"},
  {key: "albums", label: "Top albums"},
  {key: "search", label: "Search"},
  ...GENRES.map(([name, id]) => ({key: "g" + id, label: name, genre: id})),
];

export const mu = {
  tab: "songs", items: [], album: null, loading: false, error: "", note: "", loadedFor: "",
  playing: null, paused: false, queue: [], audio: null, wasShown: false, searchTerm: "",
  history: loadJson("music-history") || [],
};
const cache = new Map();   // tab key -> items (session only)

// ---- data ----
async function getJson(url) {
  const {status, json} = await httpJson("GET", url, {timeout: 12000});
  if (status !== 200 || !json) throw new Error("Apple feed " + status);
  return json;
}

const songItem = x => ({kind: "song", id: String(x.trackId), name: x.trackName, artist: x.artistName, artistId: x.artistId,
  album: x.collectionName, albumId: x.collectionId, art: bigArt(x.artworkUrl100), preview: x.previewUrl, n: x.trackNumber, sub: x.artistName});

async function songsByIds(ids) {
  if (!ids.length) return [];
  const r = await getJson("https://itunes.apple.com/lookup?id=" + ids.join(",") + "&country=" + country());
  const byIdMap = new Map((r.results || []).filter(x => x.trackId && x.previewUrl).map(x => [String(x.trackId), x]));
  return ids.map(id => byIdMap.get(String(id))).filter(Boolean).map(songItem);
}

/** Classic iTunes RSS chart (kind: topsongs | topalbums, optional genre id). Falls back to the US store if the country has no feed. */
async function chart(kind, genre) {
  const url = cc => "https://itunes.apple.com/" + cc + "/rss/" + kind + "/limit=25" + (genre ? "/genre=" + genre : "") + "/json";
  let feed;
  try { feed = await getJson(url(country())); } catch { feed = await getJson(url("us")); }
  return [].concat(feed.feed.entry || []);
}
const entryId = e => e.id.attributes["im:id"];

async function loadTab(tab) {
  if (tab.key === "songs") return songsByIds((await chart("topsongs")).map(entryId));
  if (tab.key === "albums") {
    return (await chart("topalbums")).map(e => ({kind: "album", id: entryId(e), name: e["im:name"].label, artist: e["im:artist"].label,
      art: bigArt(e["im:image"][e["im:image"].length - 1].label), sub: e["im:artist"].label}));
  }
  if (tab.genre) return songsByIds((await chart("topsongs", tab.genre)).map(entryId));
  if (tab.key === "foryou") return forYou();
  return [];
}

/** Rough "recommendations" from this app's own play history: more top songs by the artists played most recently. */
async function forYou() {
  if (!mu.history.length) { mu.note = "Play a few songs and your picks will show up here."; return []; }
  const artists = [...new Set(mu.history.map(h => h.artistId).filter(Boolean))].slice(0, 4);
  const played = new Set(mu.history.map(h => h.id));
  const lists = await Promise.all(artists.map(id =>
    getJson("https://itunes.apple.com/lookup?id=" + id + "&entity=song&limit=10&country=" + country())
      .then(r => (r.results || []).filter(x => x.trackId && x.previewUrl).map(songItem)).catch(() => [])));
  const out = [];
  for (let i = 0; out.length < 24 && lists.some(l => i < l.length); i++) {
    for (const l of lists) if (l[i] && !played.has(l[i].id) && !out.some(o => o.id === l[i].id)) out.push(l[i]);
  }
  mu.note = out.length ? "Picked from artists you played" : "Nothing new yet. Here is what you played:";
  return out.length ? out : mu.history.slice(0, 24);
}

async function openAlbum(album) {
  mu.loading = true; mu.error = "";
  renderMusic();
  try {
    const r = await getJson("https://itunes.apple.com/lookup?id=" + album.id + "&entity=song&limit=200&country=" + country());
    const tracks = (r.results || []).filter(x => x.trackId && x.previewUrl).map(songItem)
      .map(t => ({...t, sub: (t.n ? t.n + ". " : "") + t.artist, art: t.art || album.art}));
    mu.album = {...album, tracks};
    yt.idx = 0;
  } catch (error) { mu.error = error.message; }
  mu.loading = false;
  renderMusic();
}

export async function selectTab(tab) {
  if (tab.key === "search") { openSearch(); return; }
  mu.tab = tab.key; mu.loadedFor = tab.key; mu.album = null; mu.error = ""; mu.note = ""; yt.idx = 0;
  const hit = cache.get(tab.key);
  if (hit && tab.key !== "foryou") { mu.items = hit; renderMusic(); return; }
  mu.items = []; mu.loading = true;
  renderMusic();
  try {
    mu.items = await loadTab(tab);
    if (tab.key !== "foryou") cache.set(tab.key, mu.items);
  } catch (error) { mu.error = error.message; }
  mu.loading = false;
  renderMusic();
  byId("vids").scrollLeft = 0;
}

// ---- playback (30 s previews) ----
function audio() {
  if (!mu.audio) {
    mu.audio = new Audio();
    mu.audio.onended = () => {
      const i = mu.queue.findIndex(q => q.id === mu.playing?.id);
      const next = mu.queue[i + 1];
      if (next) {
        // Follow the song: if the shown list is the queue, move the cursor (and the "Open in Apple Music" button) to the new track.
        if (currentItems() === mu.queue) { yt.idx = i + 1; mu.follow = true; }
        play(next, mu.queue);
      } else { mu.playing = null; renderMusic(); }
    };
    mu.audio.onerror = () => { mu.error = "Could not play this preview"; mu.playing = null; renderMusic(); };
  }
  return mu.audio;
}

function remember(item) {
  mu.history = [{id: item.id, name: item.name, artist: item.artist, artistId: item.artistId, art: item.art, preview: item.preview, sub: item.artist, kind: "song"},
    ...mu.history.filter(h => h.id !== item.id)].slice(0, 60);
  saveJson("music-history", mu.history);
  cache.delete("foryou");
}

function play(item, list) {
  const a = audio();
  if (mu.playing?.id === item.id) {
    if (a.paused) { a.play(); mu.paused = false; } else { a.pause(); mu.paused = true; }
    renderMusic();
    return;
  }
  mu.playing = item; mu.paused = false; mu.queue = list; mu.error = "";
  a.src = item.preview;
  const p = a.play();
  if (p && p.catch) p.catch(error => { mu.error = "Could not play: " + error.message; mu.playing = null; renderMusic(); });
  remember(item);
  renderMusic();
}

export function stopMusic() {
  if (mu.audio) { mu.audio.pause(); mu.audio.removeAttribute("src"); }
  mu.playing = null; mu.paused = false;
}

// ---- search (uses the TV's on-screen keyboard through a plain text input) ----
// Three targets, drawn with the virtual cursor: the text box (OK opens the keyboard), Search, Cancel.
// When the keyboard closes (Done/Back) the cursor jumps to Search, so OK then runs the search.
export const searchUi = {open: false, cur: 0};
const searchEls = () => [byId("searchInput"), byId("searchGo"), byId("searchCancel")];
function drawSearchCursor() { searchEls().forEach((el, i) => el.classList.toggle("cur", searchUi.open && i === searchUi.cur)); }

function openSearch() {
  searchUi.open = true; searchUi.cur = 0;
  byId("searchView").hidden = false;
  const input = byId("searchInput");
  input.value = mu.searchTerm;
  drawSearchCursor();
  input.focus();
}
function closeSearch() {
  searchUi.open = false;
  byId("searchView").hidden = true;
  byId("searchInput").blur();
  drawSearchCursor();
  focusSel();
}
function submitSearch() {
  if (!searchUi.open) return;
  const term = byId("searchInput").value.trim();
  closeSearch();
  if (term) runSearch(term);
}
export function initSearch() {
  const input = byId("searchInput");
  input.onfocus = () => { searchUi.cur = 0; drawSearchCursor(); };
  input.onblur = () => { if (searchUi.open) { searchUi.cur = 1; drawSearchCursor(); } };   // keyboard closed -> Search button
  // The Samsung keyboard may hide without blurring the box, so also react to its own keys:
  // Done (65376) = search now, Cancel (65385) = close the keyboard and move to Search. Up/Down only reach the page when the keyboard is hidden.
  input.onkeydown = event => {
    if (event.keyCode === 65376 || event.key === "Enter") { event.preventDefault(); event.stopPropagation(); submitSearch(); }
    else if (event.keyCode === 65385) { event.preventDefault(); event.stopPropagation(); input.blur(); searchUi.cur = 1; drawSearchCursor(); }
    else if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); event.stopPropagation(); input.blur(); searchUi.cur = event.key === "ArrowDown" ? 1 : 0; drawSearchCursor(); }
  };
  for (const el of [byId("searchGo"), byId("searchCancel")]) el.onfocus = () => el.blur();
  byId("searchGo").onclick = submitSearch;
  byId("searchCancel").onclick = closeSearch;
}

async function runSearch(term) {
  mu.tab = "search"; mu.loadedFor = "search"; mu.searchTerm = term; mu.album = null; mu.items = []; mu.loading = true; mu.error = ""; mu.note = "Results for “" + term + "”"; yt.idx = 0;
  renderMusic();
  try {
    const r = await getJson("https://itunes.apple.com/search?term=" + encodeURIComponent(term) + "&media=music&entity=song&limit=25&country=" + country());
    mu.items = (r.results || []).filter(x => x.trackId && x.previewUrl).map(songItem);
    if (!mu.items.length) mu.note = "No songs found for “" + term + "”";
  } catch (error) { mu.error = error.message; }
  mu.loading = false;
  renderMusic();
  byId("vids").scrollLeft = 0;
}

export function searchKey(event) {
  const input = byId("searchInput");
  if (document.activeElement === input) return;   // typing: the box's own onkeydown handles Done/Enter/Cancel/Up/Down
  const key = event.key;
  if (event.keyCode === 10009 || key === "Escape") { event.preventDefault(); closeSearch(); }
  else if (key === "ArrowUp" || key === "ArrowLeft") { event.preventDefault(); searchUi.cur = Math.max(0, searchUi.cur - 1); drawSearchCursor(); }
  else if (key === "ArrowDown" || key === "ArrowRight") { event.preventDefault(); searchUi.cur = Math.min(2, searchUi.cur + 1); drawSearchCursor(); }
  else if (key === "Enter") {
    event.preventDefault();
    if (searchUi.cur === 0) input.focus();
    else if (searchUi.cur === 1) submitSearch();
    else closeSearch();
  }
}

// ---- open in the real Apple Music app (for the full song) ----
// Samsung's Apple Music app has no documented deep link. Found by trial on the TV: operation "default" with a PAYLOAD of {"values": "<apple music web link>"}
// opens the song's ALBUM in the app (it does not start the individual song). See .agents/decisions.md D31/D32.
const APPLE_MUSIC_ID = "org.tizen.apple.apple-music";
const albumLink = item => "https://music.apple.com/" + country() + "/album/" + (item.kind === "album" ? item.id : item.albumId + "?i=" + item.id);

export function musicOpenFull() {
  const item = currentItems()[yt.idx];
  if (!item) return;
  const say = text => { byId("feedStatus").textContent = text; };
  if (demo) { say("Would open “" + item.name + "” in Apple Music"); return; }
  const appId = state.installedApps.find(a => a.id === "app:applemusic")?.app || APPLE_MUSIC_ID;
  try {
    const control = new tv.ApplicationControl("http://tizen.org/appcontrol/operation/default", null, null, null,
      [new tv.ApplicationControlData("PAYLOAD", [JSON.stringify({values: albumLink(item)})])]);
    tv.application.launchAppControl(control, appId,
      () => say("Opening the album of “" + item.name + "” in Apple Music…"),
      () => say("Could not open Apple Music"));
  } catch (error) { say("Could not open Apple Music: " + error.message); }
}

// ---- UI ----
export const currentItems = () => mu.album ? mu.album.tracks : mu.items;

/** Keep the "Open in Apple Music" button's label in step with the card under the cursor. */
function refreshOpenButton() {
  const btn = byId("musicOpen");
  const item = currentItems()[yt.idx];
  const name = item ? (item.name.length > 38 ? item.name.slice(0, 37) + "…" : item.name) : "";
  btn.textContent = item ? "Open “" + name + "” in Apple Music" : "Open in Apple Music";
  btn.classList.toggle("hidden", !item);
}
cursorHooks.push(refreshOpenButton);

export function renderMusic() {
  const subs = byId("subs"), vids = byId("vids");
  const keep = [subs.scrollLeft, vids.scrollLeft];
  subs.textContent = ""; vids.textContent = "";
  TABS.forEach(t => subs.appendChild(makeChip(t.label, t.key === mu.tab)));
  const list = currentItems();
  if (mu.loading) {
    for (let i = 0; i < 9; i++) vids.appendChild(makeSkeleton());
  }
  // The empty-state text is drawn by CSS (::before) so it is not a child: the cursor never lands on it.
  vids.dataset.empty = !mu.loading && !list.length ? (mu.error ? "Could not load this list." : mu.note || "Nothing here.") : "";
  for (const item of list) vids.appendChild(makeTrack(item, mu.playing?.id === item.id));
  subs.scrollLeft = keep[0]; vids.scrollLeft = keep[1];
  if (mu.follow) {   // auto-advanced: bring the new track into view
    mu.follow = false;
    const card = vids.children[yt.idx];
    if (card) vids.scrollLeft = Math.max(0, card.offsetLeft - 40);
  }
  yt.sidx = Math.min(yt.sidx, subs.children.length - 1);
  yt.idx = Math.min(yt.idx, Math.max(0, vids.children.length - 1));
  byId("feedStatus").textContent = mu.error ? "Could not load: " + mu.error :
    mu.loading ? "" :
    mu.playing ? (mu.paused ? "❚❚ " : "▶ ") + mu.playing.name + " — " + mu.playing.artist + "  ·  30 s preview  ·  OK pauses" :
    mu.album ? "Album: " + mu.album.name + "  ·  choose a tab above to go back" :
    mu.note;
  drawCursor();
}

/** Called by render(): show the music panel while the Apple Music tile is selected. */
export function updateMusicUi(card) {
  if (!isMusic(card)) {
    deck.classList.remove("feedmusic");
    if (mu.wasShown) { stopMusic(); mu.wasShown = false; }
    return;
  }
  mu.wasShown = true;
  byId("feed").hidden = false;
  deck.classList.add("feedon", "feedmusic");
  yt.shown = true;
  renderMusic();
  const tab = TABS.find(t => t.key === mu.tab);
  if (mu.loadedFor !== mu.tab && !mu.loading && tab && tab.key !== "search") { mu.loadedFor = mu.tab; selectTab(tab); }
}

/** OK pressed in the feed rows while the music panel is shown. */
export function musicEnter(subsRow) {
  if (subsRow) { selectTab(TABS[yt.sidx]); return; }
  const item = currentItems()[yt.idx];
  if (!item) return;
  if (item.kind === "album") openAlbum(item); else play(item, currentItems());
}

export const musicShown = () => isMusic(state.cards[state.index]);
