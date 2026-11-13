// Sports scores widget: today's matches of a league from ESPN's public scoreboard JSON (no key; an unofficial but long-standing endpoint). Optionally only one team.
// Live matches first, then the next ones, then the finished ones. Refreshed every 2 minutes while a match is live, else every 10.
import { httpJson } from "../http.js";
import { t, T } from "../i18n.js";
import { formatDate, esc, locale, optionsFor, loadOnce, loadFailed, cache, isOld, pagePlan, rowsFit } from "../wutil.js";

/** [path, name]: league names are proper names and are not translated. */
const LEAGUES = [
  ["soccer/eng.1", "Premier League"], ["soccer/uefa.champions", "Champions League"], ["soccer/esp.1", "La Liga"], ["soccer/ger.1", "Bundesliga"],
  ["soccer/ita.1", "Serie A"], ["soccer/fra.1", "Ligue 1"], ["soccer/uefa.europa", "Europa League"], ["soccer/ned.1", "Eredivisie"],
  ["soccer/por.1", "Primeira Liga"], ["soccer/tur.1", "Süper Lig"], ["soccer/usa.1", "MLS"],
  ["basketball/nba", "NBA"], ["football/nfl", "NFL"], ["hockey/nhl", "NHL"], ["baseball/mlb", "MLB"],
];

const side = c => ({name: c.team?.shortDisplayName || c.team?.displayName || "?", score: c.score ?? "", winner: !!c.winner});
function parse(json) {
  return {league: json.leagues?.[0]?.name || "", events: (json.events || []).map(e => {
    const comp = e.competitions?.[0], cs = comp?.competitors || [];
    const home = cs.find(c => c.homeAway === "home") || cs[0], away = cs.find(c => c.homeAway === "away") || cs[1];
    if (!home || !away) return null;
    return {state: e.status?.type?.state || "pre", detail: e.status?.type?.shortDetail || "", clock: e.status?.displayClock || "", date: Date.parse(e.date) || 0, home: side(home), away: side(away)};
  }).filter(Boolean)};
}

const timeFmt = date => new Intl.DateTimeFormat(locale(), {hour: "numeric", minute: "2-digit"}).format(date);
const dayFmt = date => formatDate(date, {weekday: "short", day: "numeric", month: "short"});

const type = {
  name: T("Sports scores"), size: {w: 4, h: 2}, min: {w: 3, h: 1},
  options: [
    {key: "league", label: T("League"), values: LEAGUES},
    {key: "team", label: T("Team filter"), text: true, placeholder: T("e.g. Arsenal (empty = all matches)")},
  ],
  build(el) { el.innerHTML = '<div class="wsports"></div>'; },
  update(el, w) {
    const o = optionsFor(type, w), box = el.firstElementChild;
    const entry = cache.get("sports", o.league);
    const live = !!entry?.data.events.some(e => e.state === "in");
    loadOnce(w.id, isOld(entry, live ? 2 : 10), async () => {
      const {status, json} = await httpJson("GET", "https://site.api.espn.com/apis/site/v2/sports/" + o.league + "/scoreboard", {slide: true});
      if (status !== 200 || !json) throw new Error("HTTP " + status);
      cache.set("sports", o.league, parse(json));
    }, () => { if (el.isConnected) type.update(el, w); });
    let html;
    if (!entry) html = '<span class="wnote">' + esc(loadFailed(w.id) ? t("Scores unavailable") : "…") + "</span>";
    else {
      const filter = o.team.trim().toLowerCase();
      const rank = e => e.state === "in" ? 0 : e.state === "pre" ? 1 : 2;
      const events = entry.data.events.filter(e => !filter || (e.home.name + " " + e.away.name).toLowerCase().includes(filter))
        .sort((a, b) => rank(a) - rank(b) || (a.state === "post" ? b.date - a.date : a.date - b.date));
      const {start, size} = pagePlan(events.length, rowsFit(w.h, 56), 12), today = new Date().toDateString();
      const rows = events.slice(start, start + size).map(e => {
        const when = new Date(e.date);
        const mid = e.state === "pre" ? "<b>" + esc(timeFmt(when)) + "</b><small>" + (when.toDateString() === today ? "" : esc(dayFmt(when))) + "</small>"
          : "<b>" + esc(e.home.score + " – " + e.away.score) + "</b><small>" + esc(e.state === "in" ? e.clock || e.detail : e.detail) + "</small>";
        return '<div class="srow ' + e.state + '"><span class="th' + (e.home.winner ? " win" : "") + '">' + esc(e.home.name) + '</span><span class="sm">' + mid + '</span><span class="ta' + (e.away.winner ? " win" : "") + '">' + esc(e.away.name) + "</span></div>";
      }).join("");
      html = (w.h >= 2 ? "<h4>" + esc(entry.data.league || LEAGUES.find(l => l[0] === o.league)?.[1] || "") + "</h4>" : "") +
        '<div class="srows" style="--rows:' + Math.max(1, Math.min(size, events.length)) + '">' + (rows || '<span class="wnote">' + esc(t("No matches today")) + "</span>") + "</div>";
    }
    if (box.dataset.sig !== html) { box.dataset.sig = html; box.innerHTML = html; }
  },
};
export default type;
