// News widget: headlines of an RSS or Atom feed (a preset, or any address typed in). Refreshed every 15 minutes; pages through the headlines when they do not all fit.
import { httpText } from "../http.js";
import { t, T, currentLanguage } from "../i18n.js";
import { esc, optionsFor, loadOnce, loadFailed, cache, isOld, pagePlan, ago, rowsFit, plain } from "../wutil.js";

/** [key, name, address]. Names are the publishers' own and are not translated. */
const FEEDS = [
  ["bbc", "BBC News", "https://feeds.bbci.co.uk/news/rss.xml"],
  ["dw", "DW", "https://rss.dw.com/rdf/rss-en-all"],
  ["aljazeera", "Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"],
  ["npr", "NPR", "https://feeds.npr.org/1001/rss.xml"],
  ["verge", "The Verge", "https://www.theverge.com/rss/index.xml"],
  ["ars", "Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"],
  ["hn", "Hacker News", "https://hnrss.org/frontpage"],
  ["nasa", "NASA", "https://www.nasa.gov/feed/"],
  // gaming
  ["playstation", "PlayStation Blog", "https://blog.playstation.com/feed/"],
  ["xbox", "Xbox Wire", "https://news.xbox.com/en-us/feed/"],
  ["nintendolife", "Nintendo Life", "https://www.nintendolife.com/feeds/latest"],
  ["pushsquare", "Push Square", "https://www.pushsquare.com/feeds/latest"],
  ["purexbox", "Pure Xbox", "https://www.purexbox.com/feeds/latest"],
  ["ign", "IGN", "https://feeds.ign.com/ign/all"],
  ["gamespot", "GameSpot", "https://www.gamespot.com/feeds/news/"],
  ["eurogamer", "Eurogamer", "https://www.eurogamer.net/feed"],
  ["pcgamer", "PC Gamer", "https://www.pcgamer.com/rss/"],
  ["kotaku", "Kotaku", "https://kotaku.com/rss"],
  ["vgc", "Video Games Chronicle", "https://www.videogameschronicle.com/feed/"],
  ["pravda", "Українська правда", "https://www.pravda.com.ua/rss/"],
  ["suspilne", "Суспільне", "https://suspilne.media/rss/all.rss"],
  ["eurointegration", "Європейська правда", "https://www.eurointegration.com.ua/rss/"],
];
const TTL_MINUTES = 15;
const first = (node, names) => { for (const n of names) { const el = node.getElementsByTagName(n)[0]; if (el) return el.textContent; } return ""; };

function parse(xml) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("not a feed");
  const items = [...doc.querySelectorAll("item, entry")].slice(0, 30).map(n => ({
    t: plain(first(n, ["title"])), d: Date.parse(first(n, ["pubDate", "published", "updated", "dc:date"])) || 0,
  })).filter(x => x.t);
  if (!items.length) throw new Error("no headlines");
  const head = doc.querySelector("channel > title, feed > title, RDF > channel > title");
  return {title: plain(head ? head.textContent : ""), items};
}

const type = {
  name: T("News"), size: {w: 6, h: 2}, min: {w: 3, h: 1},
  options: [
    {key: "feed", label: T("Source"), def: () => currentLanguage() === "uk" ? "pravda" : "bbc", values: FEEDS.map(f => [f[0], f[1]]).concat([["custom", T("Custom address")]])},
    {key: "url", label: T("Feed address"), text: true, placeholder: "https://example.com/feed.xml"},
  ],
  build(el) { el.innerHTML = '<div class="wnews"></div>'; },
  update(el, w) {
    const o = optionsFor(type, w), box = el.firstElementChild;
    const preset = FEEDS.find(f => f[0] === o.feed);
    const url = o.feed === "custom" ? o.url.trim() : preset?.[2];
    let html;
    if (!/^https?:\/\//i.test(url || "")) html = '<span class="wnote">' + esc(t("Set a feed address in the widget options")) + "</span>";
    else {
      const entry = cache.get("news", url);
      loadOnce(w.id, isOld(entry, TTL_MINUTES), async () => {
        const {status, text} = await httpText(url);
        if (status !== 200) throw new Error("HTTP " + status);
        cache.set("news", url, parse(text));
      }, () => { if (el.isConnected) type.update(el, w); });
      if (!entry) html = '<span class="wnote">' + esc(loadFailed(w.id) ? t("News unavailable") : "…") + "</span>";
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
