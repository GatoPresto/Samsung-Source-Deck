// Builders for repeated elements. The markup lives in the <template> tags of index.html.
import { GLYPH, themeOf, kindOf } from "./themes.js";

const clone = id => document.getElementById(id).content.firstElementChild.cloneNode(true);
const noFocus = el => { el.onfocus = () => el.blur(); return el; };   // selection is drawn by the virtual cursor, never by DOM focus

export function makeTile(card) {
  const tile = noFocus(clone("tpl-tile"));
  const theme = themeOf(card);
  tile.dataset.theme = theme;
  tile.querySelector("b").textContent = GLYPH[theme];
  tile.querySelector("[data-name]").textContent = card.name;
  tile.querySelector("small").textContent = kindOf(card);
  return tile;
}

export function makeVideo(video) {
  const el = noFocus(clone("tpl-video"));
  el.querySelector("img").src = video.thumb || "";
  el.querySelector("span").textContent = video.title;
  el.querySelector("small").textContent = video.channel;
  return el;
}

export function makeChannel(channel) {
  const el = noFocus(clone("tpl-channel"));
  el.title = channel.title;
  const img = el.querySelector("img");
  img.src = channel.thumb || "";
  img.alt = channel.title;
  return el;
}

export const makeAllChip = () => noFocus(clone("tpl-channel-all"));

/** A plain list row (theme picker, Arrange, media browser). */
export function makeRow(text, className = "") {
  const row = noFocus(clone("tpl-row"));
  row.className = className;
  row.textContent = text;
  return row;
}
