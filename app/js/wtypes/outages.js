// Outages widget: electricity outage schedules in Ukraine from Yasno (see js/yasno.js). Several views of the same data: an overview, the state right now,
// an hourly grid, day bars, the next outages and the probable week. Setup in the widget options: provider, then the group (pick it, or find it by address).
// Providers: Yasno (Kyiv, Dnipro; js/yasno.js) and Ternopil (poweron.toe.com.ua; js/toe.js), which can only be read for an address.
import { t, T } from "../i18n.js";
import { esc, locale, optionsFor, loadOnce, loadFailed, cache, isOld, rowsFit } from "../wutil.js";
import * as toe from "../toe.js";
import { PROVIDERS as YASNO_PROVIDERS, listGroups, fetchPlanned, fetchProbable, searchStreets, searchHouses, groupByAddress, kyivNow, kyivTime, planDays, dayAt, nowState, outageRanges, maybeRanges, dayTotals } from "../yasno.js";

const PROVIDERS = [...YASNO_PROVIDERS, toe.TOE_PROVIDER];
const isToe = provider => provider === toe.TOE_PROVIDER[0];
const pad = n => String(n).padStart(2, "0");
const clock = minutes => pad(Math.floor(minutes / 60) % 24) + ":" + pad(minutes % 60);
const duration = minutes => {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h && m ? t("{h} h {m} min", {h, m}) : h ? t("{h} h", {h}) : t("{m} min", {m});
};
const left = minutes => (minutes / 1440 * 100).toFixed(2) + "%";

/** A bar for the minutes [from, to) of a day: green = power on, red = outage; the day's status decides the base (no schedule yet / emergency are hatched). */
function bar(day, from, to, nowMinutes, {probable = false, slots} = {}) {
  const list = slots || (day ? day.slots : []);
  const base = !day ? "nodata" : day.status === "EmergencyShutdowns" ? "emergency" : day.status === "WaitingForSchedule" ? "nodata" : "on";
  const span = to - from;
  const segs = base === "on" ? list.filter(s => (s.off || s.maybe) && s.e > from && s.s < to).map(s => {
    const a = Math.max(s.s, from), b = Math.min(s.e, to);
    return '<i class="seg' + (probable || s.maybe ? " prob" : "") + '" style="left:' + ((a - from) / span * 100).toFixed(2) + "%;width:" + ((b - a) / span * 100).toFixed(2) + '%"></i>';
  }).join("") : "";
  const now = nowMinutes != null && nowMinutes >= from && nowMinutes < to ? '<b class="now" style="left:' + ((nowMinutes - from) / span * 100).toFixed(2) + '%"></b>' : "";
  return '<div class="obar ' + base + '">' + segs + now + "</div>";
}
const ticks = () => '<div class="oticks"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>';
const note = text => '<span class="wnote">' + esc(text) + "</span>";

/** The big "power is on / off" block. */
function statusBlock(days, now) {
  const s = nowState(days, now), today = dayAt(days, 0);
  const inFrom = abs => t("in {dur}", {dur: duration(Math.max(1, abs - now.minutes))});
  let kind = "on", title = t("Power is on"), sub = "";
  if (s.state === "none") { kind = "none"; title = t("Schedule not published yet"); }
  else if (s.state === "maybe") { kind = "maybe"; title = t("Possible outage"); sub = s.until != null ? t("Until {time}", {time: clock(s.until)}) + " · " + inFrom(s.until) : ""; }
  else if (s.state === "emergency") { kind = "emergency"; title = t("Emergency outages"); sub = t("The schedule does not apply"); }
  else if (s.state === "off") { kind = "off"; title = t("Power is off"); sub = s.until != null ? t("Power returns at {time}", {time: clock(s.until)}) + " · " + inFrom(s.until) : t("The outage continues"); }
  else if (s.next) sub = t(s.nextMaybe ? "Possible outage at {time}" : "Next outage at {time}", {time: clock(s.next[0])}) + " · " + inFrom(s.next[0]);
  else if (today && today.status === "NoOutages") sub = t("No outages planned today");
  else if (!today) sub = "";
  else sub = t("No more outages today");
  return '<div class="ostat ' + kind + '"><i></i><div><b>' + esc(title) + "</b>" + (sub ? "<span>" + esc(sub) + "</span>" : "") + "</div></div>";
}

function waitingNote(day) { return day && day.status === "WaitingForSchedule" ? '<small class="owait">' + esc(t("Schedule not published yet")) + "</small>" : ""; }

const VIEWS = {
  overview(w, days, now) {
    const today = dayAt(days, 0), tomorrow = dayAt(days, 1);
    let html = statusBlock(days, now) + '<div class="orow"><small>' + esc(t("Today")) + "</small>" + bar(today, 0, 1440, now.minutes) + "</div>" + ticks();
    if (w.h >= 3) html += '<div class="orow"><small>' + esc(t("Tomorrow")) + "</small>" + bar(tomorrow, 0, 1440, null) + "</div>" + waitingNote(tomorrow);
    return html;
  },
  now(w, days, now) {
    const today = dayAt(days, 0), totals = dayTotals(today);
    return statusBlock(days, now) + (totals && w.h >= 2 ? '<div class="osum"><span>' + esc(t("Outages today: {dur}", {dur: duration(totals.off)})) + "</span><span>" + esc(t("Power on: {dur}", {dur: duration(totals.on)})) + "</span></div>" : "");
  },
  hours(w, days, now) {
    const grid = (day, label, nowMin) => {
      let cells = "";
      for (let h = 0; h < 24; h++) cells += '<div class="hcell">' + bar(day, h * 60, h * 60 + 60, nowMin) + "<small>" + h + "</small></div>";
      return '<div class="ogrid"><small class="olabel">' + esc(label) + '</small><div class="hgrid" style="--cols:' + (w.w >= 6 ? 24 : 12) + '">' + cells + "</div></div>";
    };
    return grid(dayAt(days, 0), t("Today"), now.minutes) + (w.h >= 3 ? grid(dayAt(days, 1), t("Tomorrow"), null) : "");
  },
  bars(w, days, now) {
    const block = (day, label, nowMin) => {
      const totals = dayTotals(day);
      return '<div class="orow"><small>' + esc(label) + (totals ? " · " + esc(t("Outages: {dur}", {dur: duration(totals.off)})) : "") + "</small>" + bar(day, 0, 1440, nowMin) + "</div>" + waitingNote(day);
    };
    return block(dayAt(days, 0), t("Today"), now.minutes) + ticks() + (w.h >= 3 ? block(dayAt(days, 1), t("Tomorrow"), null) + ticks() : "");
  },
  list(w, days, now) {
    const ranges = [...outageRanges(days).map(r => [...r, false]), ...maybeRanges(days).map(r => [...r, true])].filter(r => r[1] > now.minutes).sort((a, b) => a[0] - b[0]);
    if (!ranges.length) return statusBlock(days, now);
    const rows = ranges.slice(0, rowsFit(w.h, 40)).map(r => {
      const day = r[0] >= 1440 ? t("Tomorrow") : t("Today"), end = r[1] >= 2880 ? "24:00" : clock(r[1]);
      const active = r[0] <= now.minutes;
      return '<li class="' + (active ? "act" : "") + (r[2] ? " maybe" : "") + '"><small>' + esc(day) + "</small><b>" + clock(r[0] % 1440) + " – " + end + "</b><span>" + esc(duration(r[1] - r[0])) + "</span></li>";
    }).join("");
    return '<ul class="olist">' + rows + "</ul>";
  },
};

function weekView(w, slotsByDay, now) {
  const names = new Intl.DateTimeFormat(locale(), {weekday: "short"});
  const anyProbable = Object.values(slotsByDay).some(list => list.some(s => s.type === "Definite"));
  let rows = "";
  for (let d = 0; d < 7; d++) {
    const slots = (slotsByDay[String(d)] || []).map(s => ({s: s.start, e: s.end, off: s.type === "Definite"}));
    const label = names.format(new Date(Date.UTC(2024, 0, 1 + d)));   // 1 Jan 2024 was a Monday
    rows += '<div class="wrow' + (d === now.weekday ? " today" : "") + '"><small>' + esc(label) + "</small>" + bar({status: "ScheduleApplies", slots}, 0, 1440, d === now.weekday ? now.minutes : null, {probable: true}) + "</div>";
  }
  return (anyProbable ? "" : '<small class="owait">' + esc(t("No probable outages")) + "</small>") + rows + ticks();
}

const providerName = key => (PROVIDERS.find(p => p[0] === key) || [key, key])[1];

async function pickGroup(widget, api) {
  const o = optionsFor(type, widget);
  if (isToe(o.provider)) return findToe(widget, api);   // Ternopil: the group comes with the address
  api.say(t("Loading…"));
  const groups = await listGroups(o.provider);
  const chosen = await api.pick(t("Group"), groups.map(g => ({label: g, value: g, current: g === widget.o?.group})));
  if (chosen) { api.set(widget, {group: chosen}); api.say(t("Group {g}", {g: chosen})); }
}

async function findByAddress(widget, api) {
  const o = optionsFor(type, widget);
  if (isToe(o.provider)) return findToe(widget, api);
  const street = await api.ask(t("Street"), t("Type a street name"));
  if (!street) return;
  api.say(t("Loading…"));
  const streets = await searchStreets(o.provider, street);
  if (!streets.length) { api.say(t("No street found.")); return; }
  const streetId = await api.pick(t("Street"), streets.slice(0, 30).map(x => ({label: x.value, value: x})));
  if (!streetId) return;
  const house = await api.ask(t("House"), t("Type a house number"));
  if (!house) return;
  api.say(t("Loading…"));
  const houses = await searchHouses(o.provider, streetId.id, house);
  if (!houses.length) { api.say(t("No house found.")); return; }
  const chosen = await api.pick(t("House"), houses.slice(0, 40).map(x => ({label: x.value, value: x})));
  if (!chosen) return;
  const group = await groupByAddress(o.provider, streetId.id, chosen.id);
  api.set(widget, {group});   // only the group is kept, not the address
  api.say(t("Group {g}", {g: group}));
}

/** Ternopil: city, street, house. The schedule can only be read for an address, so its key (ids, no names) is kept in the widget settings on the TV. */
async function findToe(widget, api) {
  const city = await api.ask(t("City"), t("Type a city name"));
  if (!city) return;
  api.say(t("Loading…"));
  const cities = await toe.searchCities(city);
  if (!cities.length) { api.say(t("No city found.")); return; }
  const chosenCity = await api.pick(t("City"), cities.slice(0, 40).map(x => ({label: x.label, value: x})));
  if (!chosenCity) return;
  const street = await api.ask(t("Street"), t("Type a street name"));
  if (!street) return;
  api.say(t("Loading…"));
  const streets = await toe.searchStreets(chosenCity.id, street);
  if (!streets.length) { api.say(t("No street found.")); return; }
  const chosenStreet = await api.pick(t("Street"), streets.slice(0, 40).map(x => ({label: x.label, value: x})));
  if (!chosenStreet) return;
  const house = await api.ask(t("House"), t("Type a house number"));
  if (!house) return;
  api.say(t("Loading…"));
  const needle = house.toLowerCase();
  const houses = (await toe.listBuildings(chosenCity.id, chosenStreet.id)).filter(b => b.name.toLowerCase().includes(needle));
  if (!houses.length) { api.say(t("No house found.")); return; }
  const chosen = await api.pick(t("House"), houses.slice(0, 40).map(b => ({label: b.name + (toe.isGroup(b.group) ? "  ·  " + b.group : ""), value: b})));
  if (!chosen) return;
  if (!toe.isGroup(chosen.group)) { api.say(t("This address is not in the outage schedules")); return; }
  api.set(widget, {toeKey: toe.addressKey(chosenCity.id, chosenStreet.id, chosen.name), group: chosen.group});
  api.say(t("Group {g}", {g: chosen.group}));
}

const type = {
  name: T("Outages"), size: {w: 4, h: 3}, min: {w: 3, h: 1},
  options: [
    {key: "view", label: T("View"), values: [["overview", T("Overview")], ["now", T("Right now")], ["hours", T("Hourly grid")], ["bars", T("Day bars")], ["list", T("Upcoming")], ["week", T("Week (probable)")]]},
    {key: "provider", label: T("Provider"), values: PROVIDERS},
  ],
  actions: [
    {key: "group", label: T("Group"), value: w => w.o?.group || "", run: pickGroup},
    {key: "address", label: T("Find group by address"), noValue: true, run: findByAddress},
  ],
  build(el) { el.innerHTML = '<div class="wout"></div>'; },
  update(el, w) {
    const o = {...optionsFor(type, w), group: w.o?.group || ""}, box = el.firstElementChild;   // the group (and the Ternopil address key) are set by actions, not options
    const ternopil = isToe(o.provider), week = o.view === "week";
    let html;
    if (ternopil && !w.o?.toeKey) html = note(t("Find your address in the widget options"));
    else if (!ternopil && !o.group) html = note(t("Choose your outage group in the widget options"));
    else if (ternopil && week) html = note(t("The week view is not available for this provider"));
    else {
      const key = ternopil ? "t:" + w.o.toeKey : (week ? "w:" : "p:") + o.provider + "|" + o.group;
      const entry = cache.get("yasno", key);
      loadOnce(w.id, isOld(entry, week ? 720 : 10), async () => {
        const data = ternopil ? await toe.fetchSchedule(w.o.toeKey) || {today: null, tomorrow: null, updatedOn: ""}
          : week ? await fetchProbable(o.provider, o.group) : await fetchPlanned(o.provider, o.group);
        if (!data) throw new Error("group not found");
        cache.set("yasno", key, data);
      }, () => { if (el.isConnected) type.update(el, w); });
      if (!entry) html = note(loadFailed(w.id) ? t("Outages unavailable") : "…");
      else {
        const now = kyivNow();
        const head = '<h4>' + esc(t("Group {g}", {g: o.group})) + " · " + esc(providerName(o.provider)) + (!week && entry.data.updatedOn ? '<span class="oupd">' + esc(t("Updated {time}", {time: kyivTime(Date.parse(entry.data.updatedOn))})) + "</span>" : "") + "</h4>";
        const body = week ? weekView(w, entry.data, now) : (VIEWS[o.view] || VIEWS.overview)(w, planDays(entry.data, now), now);
        html = (w.h >= 2 ? head : "") + body;
      }
    }
    if (box.dataset.sig !== html) { box.dataset.sig = html; box.innerHTML = html; }
  },
};
export default type;
