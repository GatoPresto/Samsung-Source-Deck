// Source list -> screen: ordering/hiding, the tile strip, and the main title area.
import { byId, deck, message } from "./dom.js";
import { state, demo, streams, dlnaFound } from "./state.js";
import { prefs, savePrefs } from "./prefs.js";
import { themeOf, accentOf, THEMES } from "./themes.js";
import { makeTile } from "./templates.js";
import { drawCursor } from "./cursor.js";
import { updateYoutubeUi } from "./youtube.js";
import { updateMusicUi } from "./music.js";
import { updateGlass } from "./glass.js";
import { applyBackground, prefetchBackgrounds } from "./background.js";
import { open } from "./playback.js";
import { renderWidgets, allowsWidgets } from "./widgets.js";
import { revealX } from "./scroll.js";
import { t } from "./i18n.js";
import { probe, lap, noteLate } from "./perf.js";

const defaultAdded = card => !card.generic;   // what the deck showed before the Source list existed: everything except auto-detected generic apps
const GROUP = card => card.source ? 0 : card.url ? 1 : card.dlna ? 2 : card.generic ? 4 : 3;

/**
 * One-time migration to the Arrange list (prefs.added = ids in deck order). Everything the deck showed before stays in it, in the order the user had;
 * generic apps and anything found later start in the Source list. Waits until the TV's app list was read (or `force`), so curated apps are not missed.
 */
export function migrateToArrangeList(force = false) {
  if (prefs.added || !(force || demo || state.appsReady)) return;
  const old = prefs.order || [];
  prefs.added = [...old, ...state.natural.filter(defaultAdded).map(c => c.id).filter(id => !old.includes(id))];
  delete prefs.order;
  prefs.v = 2;
  savePrefs();
}

/** Rebuild state.allCards (Arrange list), state.cards (visible part) and state.pool (Source list) from state.natural and the saved choices. */
export function applyPrefs() {
  const selected = state.cards[state.index]?.id;
  migrateToArrangeList();
  // the Home slide is put at the front of an existing Arrange list once (the user may move or remove it afterwards)
  if (prefs.added && !prefs.homeSeeded) { if (!prefs.added.includes("home")) prefs.added.unshift("home"); prefs.homeSeeded = true; savePrefs(); }
  const byId = new Map(state.natural.map(c => [c.id, c]));
  if (prefs.added) {
    state.allCards = prefs.added.map(id => byId.get(id)).filter(Boolean);
  } else {   // not migrated yet (the app list is still loading): behave like before
    const order = prefs.order || [];
    const rank = id => { const i = order.indexOf(id); return i < 0 ? 1e9 : i; };
    state.allCards = state.natural.filter(defaultAdded).map((card, i) => ({card, i}))
      .sort((a, b) => (rank(a.card.id) - rank(b.card.id)) || a.i - b.i).map(x => x.card);
  }
  const inDeck = new Set(state.allCards.map(c => c.id));
  state.pool = state.natural.filter(c => !inDeck.has(c.id))
    .sort((a, b) => (GROUP(a) - GROUP(b)) || a.name.localeCompare(b.name));
  state.cards = state.allCards.filter(card => !prefs.hidden[card.id]);
  state.index = Math.max(0, state.cards.findIndex(card => card.id === selected));
}

/** Build the source list from a VIDEOSOURCE result (plus streams, apps, media servers) and redraw. */
export function populate(sources) {
  state.lastSources = sources;
  const apps = state.installedApps.filter(c => !c.system || state.showSystem || (prefs.added && prefs.added.includes(c.id)));
  state.natural = sources.filter(entry => entry.source.type === "HDMI" || entry.source.type === "TV")
    .sort((a, b) => (a.source.type === "TV" ? -1 : 0) - (b.source.type === "TV" ? -1 : 0) || a.source.number - b.source.number)
    .map(({source, connected}) => ({
      id: source.type + "-" + source.number, source, connected,
      name: source.type === "TV" ? t("Live TV") : source.editName || t("HDMI {n}", {n: source.number}),
    })).concat(streams, apps, dlnaFound);
  state.natural.unshift({id: "home", home: true, name: t("Home")});   // the Home slide (widgets) comes first
  applyPrefs();
  buildStrip();
  render();
}

let stripFresh = true;   // the strip was just (re)built: its first reveal is instant
export function buildStrip() {
  const strip = byId("strip");
  strip.textContent = "";
  stripFresh = true;
  state.cards.forEach((card, i) => {
    const tile = makeTile(card);
    tile.onclick = () => { state.index = i; open(); };
    strip.appendChild(tile);
  });
}

export function move(offset) {
  if (state.active || state.cards.length < 2) return;
  state.index = (state.index + offset + state.cards.length) % state.cards.length;
  message("");
  probe(render);
}

/** Set the theme's accent colours as CSS variables on the page (only when the choice changed; the theme's first accent means "no override"). */
let accentSig = "";
function applyAccent(card, theme) {
  const accent = accentOf(card, theme);
  const sig = accent && accent !== THEMES.find(th => th.key === theme).accents[0] ? theme + ":" + accent.key : "";
  if (sig === accentSig) return;
  accentSig = sig;
  for (const [prop, field] of [["--glow", "glow"], ["--accent", "accent"], ["--ink", "ink"]]) {
    if (sig) deck.style.setProperty(prop, accent[field]); else deck.style.removeProperty(prop);
  }
}

// Moving to another slide draws the title, theme, strip and cursor at once; what is expensive and not needed while skimming (the widgets, the YouTube / Apple Music
// content) is built SETTLE_MS after the last move, only for the slide that stayed. Leaving a feed slide still hides its feed at once.
const SETTLE_MS = 160;
const FEED_IDS = new Set(["app:youtube", "app:applemusic"]);
let lastId = null, settleTimer = 0;
function settle(card) {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    if (state.cards[state.index] !== card) return;
    const t0 = performance.now();
    renderWidgets(card);
    updateYoutubeUi(card);
    updateMusicUi(card);
    drawCursor();
    noteLate("settle", performance.now() - t0);
  }, SETTLE_MS);
}

export function render() {
  const {cards, allCards, index} = state;
  const card = cards[index];
  const moved = lastId !== card?.id;
  lastId = card?.id;
  const name = card ? card.name : allCards.length ? t("All sources hidden") : t("No sources");
  const theme = themeOf(card);
  if (deck.dataset.theme !== theme || deck.dataset.card !== String(card?.id)) {
    const section = deck.querySelector("section");
    section.style.animation = "none"; void section.offsetWidth; section.style.animation = "";
  }
  deck.dataset.theme = theme;
  applyAccent(card, theme);
  updateGlass(theme);
  deck.dataset.card = card?.id;
  deck.dataset.home = card?.home ? "1" : "";
  byId("title").textContent = name;
  byId("meta").textContent = card?.home ? t("Home") : demo ? t("Browser demo") : card?.app ? t("Apps") : card?.url || card?.dlna ? t("Network media") : t("TV inputs");
  byId("detail").textContent = card?.home ? t("OK opens the widget editor") : card?.id === "app:applemusic" ? t("OK opens Apple Music · Up for charts, search and previews") : card?.app ? t("Opens the app with your own recommendations") : card?.dlna ? t("UPnP / DLNA media server") :
    card?.url ? t("HTTP media stream") : card?.source ?
      (card.source.type === "TV" ? t("Antenna / apps") : t("HDMI {n}", {n: card.source.number})) :
      allCards.length ? t("Open Arrange to show sources again") : t("Rescan or add a network stream");
  lap("theme");
  byId("count").textContent = cards.length ? (index + 1) + " / " + cards.length : t("No sources");
  [...byId("strip").children].forEach((tile, i) => {
    tile.classList.toggle("sel", i === index);
    tile.setAttribute("aria-selected", i === index);
  });
  const sel = byId("strip").children[index];
  if (sel) { revealX(byId("strip"), sel, {instant: stripFresh}); stripFresh = false; }   // scrolls only when the tile reaches the edge
  lap("strip");
  byId("theme").hidden = !card;
  byId("bgbtn").hidden = !card;
  byId("widgetsbtn").hidden = !allowsWidgets(card);
  lap("buttons");
  renderWidgets(card, {defer: moved});
  lap("widgets");
  applyBackground(card);
  lap("bg");
  if (moved && FEED_IDS.has(card?.id)) {
    // the feed content comes with settle(); the other feed's panel must go now
    if (card.id !== "app:youtube") updateYoutubeUi(card);
    if (card.id !== "app:applemusic") updateMusicUi(card);
  } else { updateYoutubeUi(card); updateMusicUi(card); }
  lap("feeds");
  if (moved) settle(card);
  drawCursor();
  lap("cursor");
  prefetchBackgrounds(cards, index);
}
