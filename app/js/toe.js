// Ternopil: the poweron.toe.com.ua site's own API (Тернопільобленерго), https://api-poweron.toe.com.ua/api. Unofficial and undocumented by the operator; the format below was read from the
// site's code and from community projects (fastiuk/ukraine-energy-monitor, Sn1kls/lyampochka-bot). No key.
//   pw_cities?pagination=false&name=      -> [{id, name, otg: {name}}]            pw_streets?pagination=false&city.id=&name= -> [{id, name}]
//   pw-accounts/building-names?cityId=&streetId= -> {buildingNames: [{buildingName, chergGpv: "3.2"}]}    (the outage group of a house)
//   a_gpv_g?after=&before=&time=<cityId><streetId><house>   + header X-debug-key: base64("<cityId>/<streetId>/<house>")
//        -> {"hydra:member": [{dateGraph, dateCreate, dataJson: {"3.2": {times: {"00:00": "0", "00:30": "1", ... 48 half hours}}}}]}   "0" power on, "1" off, "10" possibly off
// The schedule can only be read for an address (a group alone returns nothing), so the widget keeps the address key (city id / street id / house) in its settings, on the TV only.
import { httpJson } from "./http.js";
import { kyivNow } from "./yasno.js";

const BASE = "https://api-poweron.toe.com.ua/api";
export const TOE_PROVIDER = ["toe", "Тернопіль · ТОЕ"];

async function get(path, params, headers) {
  const url = BASE + path + (params ? "?" + new URLSearchParams(params) : "");
  const {status, json} = await httpJson("GET", url, {timeout: 25000, headers: {Accept: "application/ld+json", ...headers}});
  if (status !== 200 || json == null) throw new Error("HTTP " + status);
  return json;
}
const members = json => Array.isArray(json) ? json : json["hydra:member"] || [];

export async function searchCities(query) {
  return members(await get("/pw_cities", {pagination: "false", name: query})).map(c => ({id: c.id, label: c.name + (c.otg && c.otg.name ? " (" + c.otg.name + ")" : "")}));
}
export async function searchStreets(cityId, query) {
  return members(await get("/pw_streets", {pagination: "false", "city.id": cityId, name: query})).map(s => ({id: s.id, label: s.name}));
}
/** The houses of a street with their outage group ("3.2"); a house outside the schedules has another text as group. */
export async function listBuildings(cityId, streetId) {
  const data = await get("/pw-accounts/building-names", {cityId, streetId});
  return (data.buildingNames || []).map(b => ({name: String(b.buildingName), group: String(b.chergGpv || "")}));
}
export const isGroup = value => /^\d+\.\d+$/.test(value);
export const addressKey = (cityId, streetId, house) => cityId + "/" + streetId + "/" + house;

/** "00:00" -> minutes. */
const minutesOf = key => Number(key.slice(0, 2)) * 60 + Number(key.slice(3, 5));
const TYPES = {"0": "NotPlanned", "1": "Definite", "10": "Maybe"};

/** The half-hour map of one group as merged slots [{start, end, type}] (type NotPlanned = power on, Definite = outage, Maybe = possible outage). */
export function slotsFromTimes(times) {
  const half = new Array(48).fill("0");
  for (const [key, value] of Object.entries(times || {})) { const i = Math.floor(minutesOf(key) / 30); if (i >= 0 && i < 48) half[i] = value; }
  const slots = [];
  for (let i = 0; i < 48; i++) {
    const type = TYPES[half[i]] || "NotPlanned", last = slots[slots.length - 1];
    if (last && last.type === type) last.end = (i + 1) * 30; else slots.push({start: i * 30, end: (i + 1) * 30, type});
  }
  return slots;
}

/** The schedule of an address in the shape of Yasno's group data ({today, tomorrow, updatedOn}) or null when nothing is published for today and tomorrow. */
export async function fetchSchedule(key) {
  const now = kyivNow();
  const day = offset => { const d = new Date(Date.UTC(+now.date.slice(0, 4), +now.date.slice(5, 7) - 1, +now.date.slice(8, 10) + offset)); return d.toISOString().slice(0, 10); };
  const [cityId, streetId, ...rest] = key.split("/");
  const house = rest.join("/");
  const data = await get("/a_gpv_g", {after: day(-1) + "T12:00:00+00:00", before: day(1) + "T00:00:00+00:00", time: cityId + streetId + house},
    {"X-debug-key": btoa(unescape(encodeURIComponent(key)))});
  const out = {today: null, tomorrow: null, updatedOn: ""};
  const byDate = {};
  for (const m of members(data)) {
    if (!m || !m.dateGraph || !m.dataJson) continue;
    const date = kyivNow(Date.parse(m.dateGraph)).date;
    if (!byDate[date] || Date.parse(m.dateCreate || 0) >= Date.parse(byDate[date].dateCreate || 0)) byDate[date] = m;
  }
  for (const [name, offset] of [["today", 0], ["tomorrow", 1]]) {
    const m = byDate[day(offset)];
    if (!m) continue;
    const group = Object.values(m.dataJson)[0];   // an address belongs to one group (rarely two); the first is shown
    if (!group || !group.times) continue;
    out[name] = {date: day(offset) + "T00:00:00", status: "ScheduleApplies", slots: slotsFromTimes(group.times)};
    if (!out.updatedOn || Date.parse(m.dateCreate) > Date.parse(out.updatedOn)) out.updatedOn = m.dateCreate || out.updatedOn;
  }
  return out.today || out.tomorrow ? out : null;
}
