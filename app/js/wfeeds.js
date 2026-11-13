// RSS / Atom feeds shared by the News and News cards widgets: the preset list, parsing (title, date, link, picture) and a cached, throttled refresh.
import { httpText } from "./http.js";
import { T, currentLanguage } from "./i18n.js";
import { loadOnce, loadFailed, cache, isOld, plain } from "./wutil.js";

/** [key, name, address]. Names are the publishers' own and are not translated. */
export const FEEDS = [
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

/** The two options a feed widget has: which source (preset or custom) and the custom feed address. */
export const FEED_OPTIONS = [
  {key: "feed", label: T("Source"), def: () => currentLanguage() === "uk" ? "pravda" : "bbc", values: FEEDS.map(f => [f[0], f[1]]).concat([["custom", T("Custom address")]])},
  {key: "url", label: T("Feed address"), text: true, placeholder: "https://example.com/feed.xml"},
];

const TTL_MINUTES = 15;
const first = (node, names) => { for (const n of names) { const el = node.getElementsByTagName(n)[0]; if (el) return el.textContent; } return ""; };
const IMAGE_FILE = /\.(jpe?g|png|webp|gif)(\?|$)/i;

/** The feed address of a widget's options ("" when a custom address is missing or not http(s)), and the preset it came from. */
export function feedOf(o) {
  const preset = FEEDS.find(f => f[0] === o.feed);
  const url = o.feed === "custom" ? (o.url || "").trim() : preset?.[2] || "";
  return {url: /^https?:\/\//i.test(url) ? url : "", preset};
}

const absolute = (u, base) => { try { const a = new URL(u.trim(), base); return /^https?:$/.test(a.protocol) ? a.href : ""; } catch (error) { return ""; } };

function linkOf(node, base) {
  for (const el of node.getElementsByTagName("link")) {
    const href = el.getAttribute("href");
    if (href && (!el.getAttribute("rel") || el.getAttribute("rel") === "alternate")) return absolute(href, base);
    if (el.textContent.trim()) return absolute(el.textContent, base);
  }
  return "";
}

/** A picture of a feed item: media:content / media:thumbnail / an image enclosure, else the first <img> in its HTML text. */
function imageOf(node, base) {
  for (const el of node.getElementsByTagName("media:content")) {
    const u = el.getAttribute("url"), type = el.getAttribute("type") || el.getAttribute("medium") || "";
    if (u && (/image/i.test(type) || (!type && IMAGE_FILE.test(u)) || IMAGE_FILE.test(u))) return absolute(u, base);
  }
  for (const el of node.getElementsByTagName("media:thumbnail")) { const u = el.getAttribute("url"); if (u) return absolute(u, base); }
  for (const el of node.getElementsByTagName("enclosure")) {
    const u = el.getAttribute("url"), type = el.getAttribute("type") || "";
    if (u && (/image/i.test(type) || IMAGE_FILE.test(u))) return absolute(u, base);
  }
  for (const name of ["content:encoded", "description", "content", "summary"]) {
    const m = /<img[^>]+src=["']([^"']+)["']/i.exec(first(node, [name]));
    if (m) return absolute(m[1], base);
  }
  return "";
}

/** Parse feed text into {title, items: [{t title, d time, l link, i picture}]} (25 newest). Throws when it is not a feed. */
export function parseFeed(xml, base) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("not a feed");
  const items = [...doc.querySelectorAll("item, entry")].slice(0, 25).map(n => ({
    t: plain(first(n, ["title"])), d: Date.parse(first(n, ["pubDate", "published", "updated", "dc:date"])) || 0,
    l: linkOf(n, base), i: imageOf(n, base),
  })).filter(x => x.t);
  if (!items.length) throw new Error("no headlines");
  const head = doc.querySelector("channel > title, feed > title, RDF > channel > title");
  return {title: plain(head ? head.textContent : ""), items};
}

/** The cached feed {at, data} of an address, or null. */
export const feedEntry = url => cache.get("feeds", url);
export const feedFailed = loadFailed;
/** Download the feed of a widget if the cache is older than 15 minutes (one request at a time); `done` runs afterwards. */
export function refreshFeed(widgetId, url, done) {
  loadOnce(widgetId, isOld(feedEntry(url), TTL_MINUTES), async () => {
    const {status, text} = await httpText(url, {slide: true});
    if (status !== 200) throw new Error("HTTP " + status);
    cache.set("feeds", url, parseFeed(text, url));
  }, done);
}
