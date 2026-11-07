// Source list -> screen: ordering/hiding, the tile strip, and the main title area.
import { byId, deck, message } from "./dom.js";
import { state, demo, streams, dlnaFound } from "./state.js";
import { prefs } from "./prefs.js";
import { themeOf } from "./themes.js";
import { makeTile } from "./templates.js";
import { drawCursor } from "./cursor.js";
import { updateYoutubeUi } from "./youtube.js";
import { updateMusicUi } from "./music.js";
import { open } from "./playback.js";

/** Rebuild state.allCards / state.cards from state.natural using the saved order and hidden sources. */
export function applyPrefs() {
  const selected = state.cards[state.index]?.id;
  const rank = id => { const i = prefs.order.indexOf(id); return i < 0 ? 1e9 : i; };
  state.allCards = state.natural.map((card, i) => ({card, i}))
    .sort((a, b) => (rank(a.card.id) - rank(b.card.id)) || a.i - b.i).map(x => x.card);
  state.cards = state.allCards.filter(card => !prefs.hidden[card.id]);
  state.index = Math.max(0, state.cards.findIndex(card => card.id === selected));
}

/** Build the source list from a VIDEOSOURCE result (plus streams, apps, media servers) and redraw. */
export function populate(sources) {
  state.lastSources = sources;
  state.natural = sources.filter(entry => entry.source.type === "HDMI" || entry.source.type === "TV")
    .sort((a, b) => (a.source.type === "TV" ? -1 : 0) - (b.source.type === "TV" ? -1 : 0) || a.source.number - b.source.number)
    .map(({source, connected}) => ({
      id: source.type + "-" + source.number, source, connected,
      name: source.type === "TV" ? "Live TV" : source.editName || "HDMI " + source.number,
    })).concat(streams, state.installedApps, dlnaFound);
  applyPrefs();
  buildStrip();
  render();
}

export function buildStrip() {
  const strip = byId("strip");
  strip.textContent = "";
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
  render();
}

export function render() {
  const {cards, allCards, index} = state;
  const card = cards[index];
  const name = card ? card.name : allCards.length ? "All sources hidden" : "No sources";
  const theme = themeOf(card);
  if (deck.dataset.theme !== theme || deck.dataset.card !== String(card?.id)) {
    const section = deck.querySelector("section");
    section.style.animation = "none"; void section.offsetWidth; section.style.animation = "";
  }
  deck.dataset.theme = theme;
  deck.dataset.card = card?.id;
  byId("title").textContent = name;
  byId("meta").textContent = demo ? "Browser demo" : card?.app ? "Apps" : card?.url || card?.dlna ? "Network media" : "TV inputs";
  byId("detail").textContent = card?.id === "app:applemusic" ? "OK opens Apple Music · Up for charts, search and previews" : card?.app ? "Opens the app with your own recommendations" : card?.dlna ? "UPnP / DLNA media server" :
    card?.url ? "HTTP media stream" : card?.source ?
      (card.source.type === "TV" ? "Antenna / apps" : "HDMI " + card.source.number) :
      allCards.length ? "Open Arrange to show sources again" : "Refresh or add a network stream";
  byId("count").textContent = cards.length ? (index + 1) + " / " + cards.length : "0 sources";
  [...byId("strip").children].forEach((tile, i) => {
    tile.classList.toggle("sel", i === index);
    tile.setAttribute("aria-selected", i === index);
  });
  const sel = byId("strip").children[index];
  if (sel) byId("strip").scrollLeft = Math.max(0, sel.offsetLeft - 60);
  byId("theme").hidden = !card;
  updateYoutubeUi(card);
  updateMusicUi(card);
  drawCursor();
}
