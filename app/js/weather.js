// Weather data for the Weather widget: Open-Meteo (free, no key). City search = geocoding API; the forecast API gives the current conditions and today's range.
// Only the city name (search) and the chosen city's coordinates (forecast) leave the TV. The last answer per city is cached in localStorage for 20 minutes.
import { httpJson } from "./http.js";
import { loadJson, saveJson } from "./state.js";
import { T } from "./i18n.js";

const TTL = 20 * 60 * 1000;
const memory = new Map();            // cache key -> {at, data}
const inflight = new Set();
const cacheKey = city => city.lat.toFixed(2) + "," + city.lon.toFixed(2);

/** Search cities by name. Resolves [{name, label, lat, lon}] (label = "Kyiv, Kyiv City, Ukraine"). */
export async function searchCities(name, lang) {
  const url = "https://geocoding-api.open-meteo.com/v1/search?count=8&format=json&name=" + encodeURIComponent(name) + "&language=" + encodeURIComponent(lang || "en");
  const {status, json} = await httpJson("GET", url);
  if (status !== 200) throw new Error("HTTP " + status);
  return (json?.results || []).map(r => ({
    name: r.name, lat: r.latitude, lon: r.longitude,
    label: [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : "", r.country || ""].filter(Boolean).join(", "),
  }));
}

/** The newest weather we have for a city (memory, then localStorage), or null. */
export function cachedWeather(city) {
  const key = cacheKey(city);
  if (!memory.has(key)) { const stored = (loadJson("weather-cache") || {})[key]; if (stored) memory.set(key, stored); }
  return memory.get(key) || null;
}
export const isStale = entry => !entry || Date.now() - entry.at > TTL;

/** Fetch current weather for a city (resolves the entry {at, data}); concurrent calls for one city are merged. */
export async function fetchWeather(city) {
  const key = cacheKey(city);
  if (inflight.has(key)) return cachedWeather(city);
  inflight.add(key);
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + city.lat + "&longitude=" + city.lon +
      "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1";
    const {status, json} = await httpJson("GET", url);
    if (status !== 200 || !json?.current) throw new Error("HTTP " + status);
    const entry = {at: Date.now(), data: {
      temp: json.current.temperature_2m, feels: json.current.apparent_temperature, code: json.current.weather_code, day: json.current.is_day === 1,
      wind: json.current.wind_speed_10m, hi: json.daily?.temperature_2m_max?.[0], lo: json.daily?.temperature_2m_min?.[0],
    }};
    memory.set(key, entry);
    const all = loadJson("weather-cache") || {};
    all[key] = entry;
    saveJson("weather-cache", all);
    return entry;
  } finally { inflight.delete(key); }
}

/** WMO weather code -> {kind (icon), label (translated with t())}. */
export function conditionOf(code) {
  if (code === 0 || code === 1) return {kind: "clear", label: T("Clear")};
  if (code === 2) return {kind: "partly", label: T("Partly cloudy")};
  if (code === 3) return {kind: "cloud", label: T("Cloudy")};
  if (code === 45 || code === 48) return {kind: "fog", label: T("Fog")};
  if (code >= 51 && code <= 57) return {kind: "rain", label: T("Drizzle")};
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return {kind: "rain", label: T("Rain")};
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return {kind: "snow", label: T("Snow")};
  if (code >= 95) return {kind: "storm", label: T("Thunderstorm")};
  return {kind: "cloud", label: T("Cloudy")};
}

const CLOUD = '<path d="M20 48h27a10 10 0 0 0 1.5-19.9A14 14 0 0 0 21 30a9 9 0 0 0-1 18z" fill="#e8eef8"/>';
const SUN = '<g stroke="#ffc94d" stroke-width="3" stroke-linecap="round"><path d="M32 6v6M32 52v6M6 32h6M52 32h6M13.6 13.6l4.2 4.2M46.2 46.2l4.2 4.2M13.6 50.4l4.2-4.2M46.2 17.8l4.2-4.2"/></g><circle cx="32" cy="32" r="11" fill="#ffc94d"/>';
const MOON = '<path d="M42 10a22 22 0 1 0 12 32A18 18 0 0 1 42 10z" fill="#dfe6ff"/>';
/** An inline SVG icon (64x64) for a condition kind. */
export function iconSvg(kind, day = true) {
  const sunOrMoon = day ? SUN : MOON;
  let body;
  if (kind === "clear") body = sunOrMoon;
  else if (kind === "partly") body = '<g transform="translate(-9 -8) scale(.8)">' + sunOrMoon + '</g><g transform="translate(6 6) scale(.9)">' + CLOUD + '</g>';
  else if (kind === "cloud") body = CLOUD;
  else if (kind === "fog") body = '<g stroke="#cfd8e6" stroke-width="4" stroke-linecap="round"><path d="M12 24h40M8 34h44M16 44h40M12 54h30"/></g>';
  else if (kind === "rain") body = '<g transform="translate(0 -6)">' + CLOUD + '</g><g stroke="#6bb7ff" stroke-width="4" stroke-linecap="round"><path d="M24 48l-3 8M34 48l-3 8M44 48l-3 8"/></g>';
  else if (kind === "snow") body = '<g transform="translate(0 -6)">' + CLOUD + '</g><g fill="#ffffff"><circle cx="23" cy="52" r="3"/><circle cx="33" cy="56" r="3"/><circle cx="43" cy="52" r="3"/></g>';
  else body = '<g transform="translate(0 -6)">' + CLOUD + '</g><path d="M34 40l-8 11h7l-3 9 11-13h-7l3-7z" fill="#ffd23f"/>';
  return '<svg viewBox="0 0 64 64" aria-hidden="true">' + body + "</svg>";
}
