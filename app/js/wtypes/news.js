// News widget: headlines of an RSS or Atom feed (a preset, or any address typed in). Refreshed every 15 minutes; pages through the headlines when they do not all fit.
import { t, T } from "../i18n.js";
import { esc, optionsFor, pagePlan, ago, rowsFit } from "../wutil.js";
import { FEED_OPTIONS, feedOf, feedEntry, feedFailed, refreshFeed } from "../wfeeds.js";

const type = {
  name: T("News"), size: {w: 6, h: 2}, min: {w: 3, h: 1},
  options: FEED_OPTIONS,
  build(el) { el.innerHTML = '<div class="wnews"></div>'; },
  update(el, w) {
    const o = optionsFor(type, w), box = el.firstElementChild;
    const {url, preset} = feedOf(o);
    let html;
    if (!url) html = '<span class="wnote">' + esc(t("Set a feed address in the widget options")) + "</span>";
    else {
      const entry = feedEntry(url);
      refreshFeed(w.id, url, () => { if (el.isConnected) type.update(el, w); });
      if (!entry) html = '<span class="wnote">' + esc(feedFailed(w.id) ? t("News unavailable") : "…") + "</span>";
      else {
        const items = entry.data.items, {start, size} = pagePlan(items.length, rowsFit(w.h, 70), 12);
        const rows = items.slice(start, start + size).map(i => '<li><span class="nt">' + esc(i.t) + "</span>" + (i.d ? "<small>" + esc(ago(i.d)) + "</small>" : "") + "</li>").join("");
        html = (w.h >= 2 ? "<h4>" + esc(preset ? preset[1] : entry.data.title || url) + "</h4>" : "") + '<ul style="--rows:' + Math.min(size, items.length) + '">' + rows + "</ul>";
      }
    }
    if (box.dataset.sig !== html) { box.dataset.sig = html; box.innerHTML = html; }
  },
};
export default type;
