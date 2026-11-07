// DLNA / UPnP media servers: finding them (subnet probe), browsing their folders (SOAP Browse), playing files.
import { byId, message } from "./dom.js";
import { state, tv, demo, dlnaFound } from "./state.js";
import { makeRow } from "./templates.js";
import { focusSel } from "./cursor.js";
import { populate } from "./render.js";
import { open } from "./playback.js";
import { syncRing } from "./glass.js";

const text = (node, tag) => node.getElementsByTagName(tag)[0]?.textContent || "";

// ---- Discovery. Web apps cannot send SSDP multicast, so probe the local /24 for common UPnP description URLs. ----
const PROBES = [[8200, "/rootDesc.xml"], [50001, "/desc/device.xml"], [32469, "/DeviceDescription.xml"],
  [49152, "/description.xml"], [5001, "/description.xml"], [9000, "/DeviceDescription.xml"]];
let scanRun = 0;

function probe(host, [port, path]) {
  return new Promise(resolve => {
    const base = "http://" + host + ":" + port;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", base + path);
    xhr.timeout = 1000;
    xhr.onload = () => {
      try {
        if (xhr.status !== 200 || !/MediaServer/.test(xhr.responseText)) return resolve(null);
        const doc = new DOMParser().parseFromString(xhr.responseText, "text/xml");
        const service = [...doc.getElementsByTagName("service")].find(n => /ContentDirectory/.test(text(n, "serviceType")));
        if (!service) return resolve(null);
        const urlBase = text(doc, "URLBase").replace(/\/$/, "") || base;
        const control = text(service, "controlURL");
        resolve({name: text(doc, "friendlyName") || host, control: /^https?:/.test(control) ? control : urlBase + (control[0] === "/" ? "" : "/") + control});
      } catch (error) { resolve(null); }
    };
    xhr.onerror = xhr.ontimeout = () => resolve(null);
    xhr.send();
  });
}

export function scanStatus(label, busy) {
  const el = byId("scan");
  el.textContent = label;
  el.classList.toggle("busy", !!busy);
}

export async function scanDlna() {
  if (demo) return;
  const run = ++scanRun; // a newer refresh cancels any scan still running
  let ip;
  try { ip = webapis.network.getIp(); } catch (error) { scanStatus("Network scan unavailable"); return; }
  const prefix = ip.split(".").slice(0, 3).join(".");
  const jobs = [];
  for (let n = 254; n >= 1; n--) for (const p of PROBES) jobs.push([prefix + "." + n, p]);
  const total = jobs.length;
  scanStatus("Looking for media servers… 0%", true);
  async function worker() {
    while (jobs.length && run === scanRun) {
      const [host, p] = jobs.pop();
      const server = await probe(host, p);
      if (run !== scanRun) return;
      if (server && !dlnaFound.some(f => f.dlna === server.control)) {
        dlnaFound.push({id: "dlna:" + server.control, name: server.name, dlna: server.control});
        populate(state.lastSources);
      }
      if (jobs.length % 25 === 0) scanStatus("Looking for media servers… " + Math.round(100 * (1 - jobs.length / total)) + "%", true);
    }
  }
  await Promise.all(Array.from({length: 16}, worker));
  if (run !== scanRun) return;
  scanStatus(dlnaFound.length ? "Media servers found: " + dlnaFound.length : "No media servers found on " + prefix + ".x");
}

// ---- Browsing a server's folders ----
export const browser = {server: null, stack: [], cursor: 0};

function soap(control, objectId) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", control);
    xhr.timeout = 8000;
    xhr.setRequestHeader("Content-Type", 'text/xml; charset="utf-8"');
    xhr.setRequestHeader("SOAPAction", '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"');
    xhr.onload = () => {
      if (xhr.status !== 200) return reject(new Error("HTTP " + xhr.status));
      try {
        const body = new DOMParser().parseFromString(xhr.responseText, "text/xml");
        const didl = new DOMParser().parseFromString(text(body, "Result"), "text/xml");
        const out = [];
        for (const node of didl.documentElement.children) {
          const title = text(node, "dc:title") || node.getElementsByTagName("title")[0]?.textContent || "?";
          if (node.localName === "container") out.push({folder: true, id: node.getAttribute("id"), title});
          else {
            const kind = (text(node, "upnp:class") || "").split(".")[1] || "";
            const res = [...node.getElementsByTagName("res")].find(r => /video|audio/.test(r.getAttribute("protocolInfo") || kind));
            if (res && kind !== "imageItem") out.push({title, url: res.textContent.trim(), mime: (res.getAttribute("protocolInfo") || "").split(":")[2] || null});
          }
        }
        resolve(out);
      } catch (error) { reject(error); }
    };
    xhr.onerror = () => reject(new Error("network error"));
    xhr.ontimeout = () => reject(new Error("timeout"));
    xhr.send('<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1"><ObjectID>' + objectId + '</ObjectID><BrowseFlag>BrowseDirectChildren</BrowseFlag><Filter>*</Filter><StartingIndex>0</StartingIndex><RequestedCount>300</RequestedCount><SortCriteria></SortCriteria></u:Browse></s:Body></s:Envelope>');
  });
}

function drawBrowserCursor() {
  const buttons = [...byId("blist").querySelectorAll("button")];
  browser.cursor = Math.max(0, Math.min(browser.cursor || 0, buttons.length - 1));
  buttons.forEach((b, i) => b.classList.toggle("cur", i === browser.cursor));
  buttons[browser.cursor]?.scrollIntoView({block: "nearest"});
  syncRing();
}

export function showBrowser() {
  byId("browser").hidden = false;
  drawBrowserCursor();
}

async function loadFolder(id, title) {
  byId("bpath").textContent = browser.server.name + " › " + title;
  byId("blist").textContent = "Loading…";
  let items;
  try { items = await soap(browser.server.dlna, id); }
  catch (error) { byId("blist").textContent = "Could not read the media server: " + error.message; return; }
  byId("blist").textContent = "";
  browser.cursor = 0;
  if (!items.length) byId("blist").textContent = "Nothing playable here.";
  items.sort((a, b) => (b.folder ? 1 : 0) - (a.folder ? 1 : 0) || a.title.localeCompare(b.title));
  for (const item of items) {
    const row = makeRow((item.folder ? "📁 " : "▶ ") + item.title);
    row.onclick = () => {
      if (item.folder) { browser.stack.push({id, title}); loadFolder(item.id, item.title); }
      else playNative(item);
    };
    byId("blist").appendChild(row);
  }
  showBrowser();
}

export function openBrowser(server) {
  browser.server = server;
  browser.stack = [];
  loadFolder("0", "Library");
}

function closeBrowser() {
  browser.server = null;
  byId("browser").hidden = true;
  focusSel();
}

export function browserKey(event) {
  const buttons = [...byId("blist").querySelectorAll("button")];
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (buttons.length) {
      browser.cursor = (browser.cursor + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
      drawBrowserCursor();
    }
  } else if (event.key === "Enter") {
    event.preventDefault();
    buttons[browser.cursor]?.click();
  } else if (event.key === "ArrowLeft" || event.keyCode === 10009 || event.key === "Escape") {
    event.preventDefault();
    const parent = browser.stack.pop();
    if (parent) loadFolder(parent.id, parent.title); else closeBrowser();
  }
}

// ---- Playing a file: hand it to the TV's native player, fall back to AVPlay inside the app ----
const PLAYERS = ["org.tizen.video-player-tv", "org.tizen.mycontent-video-player-tv"];
function playNative(item, attempt = 0) {
  const inApp = why => { message(why + " Playing inside Source Deck."); open({name: item.title, url: item.url}); };
  if (!tv?.application || attempt >= PLAYERS.length) { inApp("TV player unavailable."); return; }
  try {
    const control = new tv.ApplicationControl("http://tizen.org/appcontrol/operation/view", item.url, item.mime, null, null);
    tv.application.launchAppControl(control, PLAYERS[attempt], () => {}, () => playNative(item, attempt + 1));
  } catch (error) { playNative(item, attempt + 1); }
}
