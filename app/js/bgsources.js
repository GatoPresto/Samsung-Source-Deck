// Where background pictures come from. Every source returns grid items:
//   {kind: "image", title, thumb, credit?, creditUrl?, key, fetchBlob()}   or   {kind: "folder", title, open()}
// fetchBlob() resolves the full picture as a Blob (the picker shrinks it to 1920x1080 and stores it).
import { httpJson, httpBlob } from "./http.js";
import { dlnaFound } from "./state.js";
import { soapBrowse } from "./dlna.js";

const auth = () => window.backgroundsAuth || {};

// ---- Unsplash (free API key, see app/backgrounds-config.js) ----
export const unsplashReady = () => !!auth().unsplashKey;
export async function unsplash(query) {
  const headers = {Authorization: "Client-ID " + auth().unsplashKey};
  const url = query
    ? "https://api.unsplash.com/search/photos?per_page=24&orientation=landscape&query=" + encodeURIComponent(query)
    : "https://api.unsplash.com/photos?per_page=24&order_by=popular";
  const {status, json} = await httpJson("GET", url, {headers});
  if (status !== 200) throw new Error(json?.errors?.[0] || "Unsplash " + status);
  const photos = json.results || json;
  return photos.map(p => ({
    kind: "image", title: p.description || p.alt_description || p.user.name, thumb: p.urls.small, key: "unsplash:" + p.id,
    credit: "Photo by " + p.user.name + " on Unsplash", creditUrl: p.links.html,
    // Unsplash asks apps to report a download when a photo is used
    fetchBlob: async () => { httpJson("GET", p.links.download_location, {headers}).catch(() => {}); return httpBlob(p.urls.raw + (p.urls.raw.includes("?") ? "&" : "?") + "w=1920&h=1080&fit=crop&crop=entropy&q=80&fm=jpg"); },
  }));
}

// ---- Wallhaven (wallpapers, no key needed for safe-for-work pictures; ~45 requests/minute) ----
export async function wallhaven(query) {
  const url = "https://wallhaven.cc/api/v1/search?categories=100&purity=100&atleast=1920x1080&ratios=16x9&sorting=" + (query ? "relevance&q=" + encodeURIComponent(query) : "toplist");
  const {status, json} = await httpJson("GET", url);
  if (status !== 200) throw new Error(status === 429 ? "too many requests, wait a minute" : "Wallhaven " + status);
  return (json.data || []).map(p => ({
    kind: "image", title: "Wallpaper " + p.resolution, thumb: p.thumbs.large, key: "wallhaven:" + p.id,
    credit: "Wallpaper from Wallhaven", creditUrl: p.url,
    fetchBlob: () => httpBlob(p.path, {timeout: 120000}),   // can be a 4K file of several MB; the picker shrinks it
  }));
}

// ---- Media servers (router, NAS): pictures over UPnP/DLNA ----
export const servers = () => dlnaFound.slice();
/** Folder/picture items of one server folder; folders open recursively. */
export async function serverFolder(server, objectId, title) {
  const entries = await soapBrowse(server.dlna, objectId, "images");
  return entries.map(e => e.folder
    ? {kind: "folder", title: e.title, open: () => serverFolder(server, e.id, e.title)}
    : {kind: "image", title: e.title, thumb: e.thumb, key: "router:" + e.url, credit: "", fetchBlob: () => httpBlob(e.url)});
}

// ---- USB drive (Tizen filesystem API; best effort, the TV decides what it exposes) ----
const IMAGE = /\.(jpe?g|png|webp|bmp)$/i;
const fsApi = () => window.tizen && window.tizen.filesystem;

export const usbSupported = () => !!fsApi();
const call = (fn, ...args) => new Promise((resolve, reject) => fn(...args, resolve, reject));

/** Names of external storages (USB drives / SD cards). */
export async function usbStorages() {
  const fs = fsApi();
  const all = await new Promise((resolve, reject) => fs.listStorages(resolve, reject));
  return all.filter(s => s.type === "EXTERNAL");
}

async function readFileBlob(file) {
  try { return await httpBlob(file.toURI()); }       // file:// URL of the picture
  catch (error) {                                      // fallback: read the bytes through the file API
    return new Promise((resolve, reject) => file.openStream("r", stream => {
      try { const data = stream.readBase64(file.fileSize); stream.close(); const bin = atob(data), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); resolve(new Blob([bytes], {type: "image/jpeg"})); }
      catch (readError) { reject(readError); }
    }, reject, "r"));
  }
}

/** Items of one directory (a File object); for the drive itself pass the storage label. */
export async function usbFolder(dirOrLabel) {
  const fs = fsApi();
  const dir = typeof dirOrLabel === "string" ? await new Promise((resolve, reject) => fs.resolve(dirOrLabel, resolve, reject, "r")) : dirOrLabel;
  const files = await new Promise((resolve, reject) => dir.listFiles(resolve, reject));
  const items = [];
  for (const f of files.sort((a, b) => a.name.localeCompare(b.name))) {
    if (f.isDirectory) items.push({kind: "folder", title: f.name, open: () => usbFolder(f)});
    else if (IMAGE.test(f.name)) items.push({kind: "image", title: f.name, thumb: f.toURI(), key: "usb:" + f.fullPath, credit: "", fetchBlob: () => readFileBlob(f)});
  }
  return items;
}
