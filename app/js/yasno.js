// Yasno electricity outage schedules (Ukraine): the public API behind app.yasno.ua, as used by the ha-yasno-outages Home Assistant integration
// (https://github.com/denysdovhan/ha-yasno-outages). No key. Times are minutes from midnight in Kyiv wall-clock time.
//   planned-outages  -> {"13.1": {today: {slots, date, status}, tomorrow: {...}, updatedOn}, ...}   slot = {start, end, type: "Definite" (outage) | "NotPlanned" (power on)}
//   day status       -> ScheduleApplies | NoOutages | WaitingForSchedule (not published yet) | EmergencyShutdowns (emergency outages, the schedule does not apply)
//   probable-outages -> {regionId: {dsos: {dsoId: {groups: {"13.1": {slots: {"0": [...], ... "6": [...]}}}}}}}   weekday 0 = Monday
//   address search   -> streets, houses, then the group ("group.subgroup") of a house.
import { httpJson } from "./http.js";

const BASE = "https://app.yasno.ua/api/blackout-service/public/shutdowns";

/** [key "regionId/dsoId", name]. The API currently lists Kyiv (DTEK Kyiv networks) and Dnipro (two operators). Names are the operators' own. */
export const PROVIDERS = [["25/902", "Київ · ДТЕК"], ["3/301", "Дніпро · ДнЕМ"], ["3/303", "Дніпро · ЦЕК"]];
const ids = provider => provider.split("/").map(Number);

async function get(path, params, slide = false) {
  const url = BASE + path + (params ? "?" + new URLSearchParams(params) : "");
  const {status, json} = await httpJson("GET", url, {timeout: 20000, slide});
  if (status !== 200 || json == null) throw new Error("HTTP " + status);
  return json;
}

const byGroup = (a, b) => { const [a1, a2] = a.split(".").map(Number), [b1, b2] = b.split(".").map(Number); return a1 - b1 || a2 - b2; };

/** All groups ("13.1") of a provider, in order. */
export async function listGroups(provider) {
  const [region, dso] = ids(provider);
  const data = await get("/regions/" + region + "/dsos/" + dso + "/planned-outages");
  return Object.keys(data).filter(k => /^\d+\.\d+$/.test(k)).sort(byGroup);
}

/** The planned schedule of one group: {today, tomorrow, updatedOn} or null when the group does not exist. */
export async function fetchPlanned(provider, group) {
  const [region, dso] = ids(provider);
  const data = await get("/regions/" + region + "/dsos/" + dso + "/planned-outages", undefined, true);
  return data[group] || null;
}

/** The probable weekly pattern of one group: {"0": [slots], ... "6": [slots]} (weekday 0 = Monday), or null. */
export async function fetchProbable(provider, group) {
  const [region, dso] = ids(provider);
  const data = await get("/probable-outages", {regionId: region, dsoId: dso}, true);
  return data?.[region]?.dsos?.[dso]?.groups?.[group]?.slots || null;
}

export const searchStreets = (provider, query) => { const [regionId, dsoId] = ids(provider); return get("/addresses/v2/streets", {regionId, dsoId, query}); };
export const searchHouses = (provider, streetId, query) => { const [regionId, dsoId] = ids(provider); return get("/addresses/v2/houses", {regionId, dsoId, streetId, query}); };
export async function groupByAddress(provider, streetId, houseId) {
  const [regionId, dsoId] = ids(provider);
  const data = await get("/addresses/v2/group", {regionId, dsoId, streetId, houseId});
  if (data.group == null || data.subgroup == null) throw new Error("no group for this address");
  return data.group + "." + data.subgroup;
}

// ---- time and schedule maths (pure functions) ----
let zone = null;
const kyivZone = () => zone || (zone = (() => { for (const z of ["Europe/Kyiv", "Europe/Kiev"]) { try { new Intl.DateTimeFormat("en", {timeZone: z}); return z; } catch (error) {} } return undefined; })());

let nowFormat = null;
/** The current date ("2026-11-13"), minutes since midnight and weekday (0 = Monday) in Kyiv. */
export function kyivNow(ms = Date.now()) {
  const parts = {};
  if (!nowFormat) nowFormat = new Intl.DateTimeFormat("en-GB", {timeZone: kyivZone(), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short"});
  for (const p of nowFormat.formatToParts(new Date(ms))) parts[p.type] = p.value;
  return {date: parts.year + "-" + parts.month + "-" + parts.day, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday)};
}
const dayNumber = date => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 86400000;

/** The days of a planned schedule relative to the Kyiv date now: [{offset: 0 today | 1 tomorrow, status, slots: [{s, e, off}]}]. Stale data (yesterday) gets offset -1. */
export function planDays(group, now) {
  const days = [];
  for (const key of ["today", "tomorrow"]) {
    const d = group && group[key];
    if (!d || !d.date) continue;
    days.push({offset: dayNumber(d.date.slice(0, 10)) - dayNumber(now.date), status: d.status || "", slots: (d.slots || []).map(s => ({s: s.start, e: s.end, off: s.type === "Definite", maybe: s.type === "Maybe"}))});   // "Maybe" = possible outage (Ternopil)
  }
  return days;
}
export const dayAt = (days, offset) => days.find(d => d.offset === offset) || null;

/** Outage ranges [start, end) in minutes from today 00:00 over today and tomorrow, adjacent ranges merged (also across midnight). */
export function outageRanges(days) {
  const out = [];
  for (const d of days) {
    if (d.status === "EmergencyShutdowns") continue;
    for (const s of d.slots) if (s.off) out.push([d.offset * 1440 + s.s, d.offset * 1440 + s.e]);
  }
  out.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of out) { const last = merged[merged.length - 1]; if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push([...r]); }
  return merged;
}

/** Ranges of possible outages (slots of type "Maybe"), merged like outageRanges. */
export function maybeRanges(days) {
  const out = [];
  for (const d of days) for (const s of d.slots) if (s.maybe) out.push([d.offset * 1440 + s.s, d.offset * 1440 + s.e]);
  out.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of out) { const last = merged[merged.length - 1]; if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push([...r]); }
  return merged;
}

/**
 * Where we are: {state: "none" (no schedule for today) | "emergency" | "off" | "maybe" (possible outage) | "on", until (abs minute of the next change or null),
 * range (the outage now), next (the next outage range or null), nextMaybe (that next range is only a possible outage)}.
 */
export function nowState(days, now) {
  const today = dayAt(days, 0);
  const abs = now.minutes;
  if (!today) return {state: "none", until: null, range: null, next: null, nextMaybe: false};
  if (today.status === "EmergencyShutdowns") return {state: "emergency", until: null, range: null, next: null, nextMaybe: false};
  const ranges = outageRanges(days), maybes = maybeRanges(days);
  const current = ranges.find(r => r[0] <= abs && abs < r[1]);
  if (current) return {state: "off", until: current[1] >= 2880 ? null : current[1], range: current, next: null, nextMaybe: false};
  const possible = maybes.find(r => r[0] <= abs && abs < r[1]);
  if (possible) return {state: "maybe", until: possible[1] >= 2880 ? null : possible[1], range: possible, next: null, nextMaybe: false};
  const nextOff = ranges.find(r => r[0] > abs) || null, nextMaybe = maybes.find(r => r[0] > abs) || null;
  const maybeFirst = nextMaybe && (!nextOff || nextMaybe[0] < nextOff[0]);
  return {state: "on", until: null, range: null, next: maybeFirst ? nextMaybe : nextOff, nextMaybe: !!maybeFirst};
}

/** Minutes of power off (off) and on (on) in one day (only for a day with a published schedule). */
export function dayTotals(day) {
  if (!day || day.status !== "ScheduleApplies") return null;
  const off = day.slots.filter(s => s.off).reduce((sum, s) => sum + (s.e - s.s), 0);
  return {off, on: 1440 - off};
}

/** "HH:MM" of a timestamp in Kyiv time. */
export function kyivTime(ms) {
  const n = kyivNow(ms);
  return String(Math.floor(n.minutes / 60)).padStart(2, "0") + ":" + String(n.minutes % 60).padStart(2, "0");
}
