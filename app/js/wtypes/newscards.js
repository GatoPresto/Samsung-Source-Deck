// News cards widget: the headlines of a feed as cards with the picture of the item (when the feed has one). Interactive: Up from the thumbnails puts the cursor on it,
// Left/Right choose a card, OK opens the article in the TV's browser, Up/Down move to another interactive widget, Back leaves.
import { t, T } from "../i18n.js";
import { wf } from "../state.js";
import { optionsFor, ago, hintBar } from "../wutil.js";
import { FEED_OPTIONS, feedOf, feedEntry, feedFailed, refreshFeed } from "../wfeeds.js";
import { openUrl } from "../openurl.js";

const picks = new Map();   // widget id -> {i: chosen card, start: first card shown} (not saved)
const visible = w => Math.max(1, Math.floor(w.w / 3));   // 3 grid columns per card
const pickOf = id => { if (!picks.has(id)) picks.set(id, {i: 0, start: 0}); return picks.get(id); };

/** Keep the chosen card inside the shown window. */
function fit(p, count, n) {
  p.i = Math.max(0, Math.min(count - 1, p.i));
  if (p.i < p.start) p.start = p.i;
  if (p.i > p.start + n - 1) p.start = p.i - n + 1;
  p.start = Math.max(0, Math.min(p.start, Math.max(0, count - n)));
}

const note = text => { const p = document.createElement("span"); p.className = "wnote"; p.textContent = text; return p; };

const type = {
  name: T("News cards"), size: {w: 9, h: 3}, min: {w: 3, h: 2}, interactive: true,
  hint: T("←→ cards · OK read in the browser · ↑↓ other widgets · Back leave"),
  options: [...FEED_OPTIONS, {key: "images", label: T("Images"), values: [["on", T("On")], ["off", T("Off")]]}],
  build(el) { el.innerHTML = '<div class="wcards"></div>'; },
  update(el, w, force) {
    const o = optionsFor(type, w), box = el.firstElementChild;
    const {url, preset} = feedOf(o);
    const entry = url ? feedEntry(url) : null;
    if (url) refreshFeed(w.id, url, () => { if (el.isConnected) type.update(el, w); });
    const n = visible(w), p = pickOf(w.id);
    if (entry) fit(p, entry.data.items.length, n);
    const sig = [url, entry && entry.at, w.w, w.h, o.images, o.card, p.i, p.start, url && !entry && feedFailed(w.id)].join("|");
    if (!force && box.dataset.sig === sig) return;
    box.dataset.sig = sig;
    box.textContent = "";
    box.style.setProperty("--n", String(n));
    if (!url) { box.appendChild(note(t("Set a feed address in the widget options"))); return; }
    if (!entry) { box.appendChild(note(feedFailed(w.id) ? t("News unavailable") : "…")); return; }
    const items = entry.data.items, withImages = o.images === "on" && w.h >= 3;
    const head = document.createElement("h4");
    head.textContent = preset ? preset[1] : entry.data.title || url;
    const pos = document.createElement("span");
    pos.className = "npos"; pos.textContent = (p.i + 1) + " / " + items.length;
    head.appendChild(pos);
    const row = document.createElement("div");
    row.className = "ncards";
    items.slice(p.start, p.start + n).forEach((item, k) => {
      const card = document.createElement("div");
      card.className = "ncard" + (p.start + k === p.i ? " sel" : "");
      if (withImages && item.i) {
        const img = new Image();
        img.alt = ""; img.decoding = "async"; img.referrerPolicy = "no-referrer";
        img.onerror = () => { img.remove(); card.classList.add("noimg"); };
        img.src = item.i;
        card.appendChild(img);
      } else card.classList.add("noimg");
      const text = document.createElement("span");
      text.className = "nt"; text.textContent = item.t;
      card.appendChild(text);
      if (item.d) { const when = document.createElement("small"); when.textContent = ago(item.d); card.appendChild(when); }
      row.appendChild(card);
    });
    box.append(head, row);
  },
  key(el, w, event) {
    const o = optionsFor(type, w), {url} = feedOf(o), entry = url ? feedEntry(url) : null;
    if (!entry) return false;
    const items = entry.data.items, p = pickOf(w.id), key = event.key;
    if (key === "ArrowLeft" || key === "ArrowRight") {
      p.i += key === "ArrowRight" ? 1 : -1;
      type.update(el, w);
      return true;
    }
    if (key === "Enter") {
      const item = items[p.i];
      const say = text => { hintBar(text); setTimeout(() => { if (wf.active) hintBar(t(type.hint)); }, 3500); };   // feedback in the hint bar, then the hint again
      if (item && item.l) openUrl(item.l, {opening: () => say(t("Opening the article…")), failed: () => say(t("Could not open the browser."))});
      else say(t("This item has no web address."));
      return true;
    }
    return false;
  },
};
export default type;
