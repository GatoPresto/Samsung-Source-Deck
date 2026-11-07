"use strict";

const byId = id => document.getElementById(id);
const tv = window.tizen;
const player = window.webapis && window.webapis.avplay;
const config = window.sourceDeck;
const deck = byId("deck");
const demo = !tv;
let cards = [];
let index = 0;
let active = null;
let generation = 0;
let refreshGeneration = 0;
let allCards = [];
let themeTarget = null;
// Remembered choices: theme per source, hidden sources, and display order (all keyed by stable source id).
const prefs = {theme: {}, hidden: {}, order: []};
try { Object.assign(prefs, JSON.parse(localStorage.getItem("deck-prefs")) || {}); } catch {}
// v1: the first "gta6" look was renamed "gta6classic"; keep users who picked it on that look.
if (!prefs.v) {
  for (const id of Object.keys(prefs.theme)) if (prefs.theme[id] === "gta6") prefs.theme[id] = "gta6classic";
  prefs.v = 1;
  try { localStorage.setItem("deck-prefs", JSON.stringify(prefs)); } catch {}
}
function savePrefs() {
  try { localStorage.setItem("deck-prefs", JSON.stringify(prefs)); }
  catch (error) { message("Could not save settings: " + error.message); }
}

const streams = config.streams
  .filter(entry => /^https?:\/\//i.test(entry.url))
  .map(entry => ({ id: "stream:" + entry.url, name: entry.name, url: entry.url }));
const dlnaFound = (config.dlna || []).map(entry => ({ id: "dlna:" + entry.control, name: entry.name, dlna: entry.control }));
let lastSources = [];

function message(text) { byId("status").textContent = text; }

// Add new looks here (and a matching main[data-theme=KEY] / .tile[data-theme=KEY] block in index.html).
const THEMES = [
  {key: "default", label: "Generic", glyph: "▭"},
  {key: "ps", label: "PlayStation", glyph: "△ ○ ✕ □"},
  {key: "switch", label: "Nintendo Switch", glyph: "◖ ◗"},
  {key: "xbox", label: "Xbox", glyph: "Ⓧ"},
  {key: "stream", label: "Network media", glyph: "≈≈≈"},
  {key: "tv", label: "Live TV", glyph: "▦"},
  {key: "gta6", label: "GTA 6", glyph: "VI"},
  {key: "gta6classic", label: "GTA 6 Retro", glyph: "VI"},
];
const GLYPH = Object.fromEntries(THEMES.map(t => [t.key, t.glyph]));

function detectTheme(card) {
  const name = card.name;
  return card.url || card.dlna ? "stream" : card.source?.type === "TV" ? "tv" :
    /playstation|\bps\s?\d/i.test(name) ? "ps" : /switch|nintendo/i.test(name) ? "switch" :
    /xbox/i.test(name) ? "xbox" : /gta|grand theft/i.test(name) ? "gta6" : "default";
}

function themeOf(card) {
  if (!card) return "default";
  const chosen = prefs.theme[card.id];
  return THEMES.some(t => t.key === chosen) ? chosen : detectTheme(card);
}

function kindOf(card) {
  return card.dlna ? "Media server" : card.url ? "Stream" : card.source?.type === "TV" ? "Live TV" : "HDMI " + card.source.number;
}

function buildStrip() {
  const strip = byId("strip");
  strip.textContent = "";
  cards.forEach((card, i) => {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.dataset.theme = themeOf(card);
    tile.setAttribute("role", "option");
    const kind = kindOf(card);
    tile.innerHTML = "<b></b><span></span>";
    tile.firstChild.textContent = GLYPH[themeOf(card)];
    tile.lastChild.textContent = card.name;
    const small = document.createElement("small");
    small.textContent = kind;
    tile.lastChild.appendChild(small);
    // Focus is the source of truth: the focused tile is always the selected one.
    tile.onfocus = () => tile.blur();
    tile.onclick = () => { index = i; open(); };
    strip.appendChild(tile);
  });
}

// One virtual cursor instead of DOM focus: zone 0 = tiles, then the footer buttons.
const ZONES = [null, "theme", "arrange", "refresh"];
let zone = 0;
function usable(z) { return z === 0 ? cards.length > 0 : z === 1 ? cards.length > 0 : true; }
function drawCursor() {
  if (!usable(zone)) zone = usable(0) ? 0 : 2;
  [...byId("strip").children].forEach((tile, i) => tile.classList.toggle("cur", zone === 0 && i === index));
  ZONES.forEach((id, z) => { if (id) byId(id).classList.toggle("cur", zone === z); });
}
function focusSel() { zone = 0; drawCursor(); }
function stepZone(step, wrapFrom) {
  let next = zone;
  do { next += step; } while (next >= wrapFrom && next <= 3 && !usable(next));
  return next >= wrapFrom && next <= 3 ? next : zone;
}

function render() {
  const card = cards[index];
  const name = card ? card.name : allCards.length ? "All sources hidden" : "No sources";
  const theme = themeOf(card);
  if (deck.dataset.theme !== theme || deck.dataset.card !== String(card?.id)) {
    const section = deck.querySelector("section");
    section.style.animation = "none"; void section.offsetWidth; section.style.animation = "";
  }
  deck.dataset.theme = theme;
  deck.dataset.card = card?.id;
  byId("title").textContent = name;
  byId("meta").textContent = demo ? "Browser demo" : card?.url || card?.dlna ? "Network media" : "TV inputs";
  byId("detail").textContent = card?.dlna ? "UPnP / DLNA media server" : card?.url ? "HTTP media stream" : card?.source ?
    (card.source.type === "TV" ? "Antenna / apps" : "HDMI " + card.source.number) :
    allCards.length ? "Open Arrange to show sources again" : "Refresh or add a network stream";
  byId("count").textContent = cards.length ? (index + 1) + " / " + cards.length : "0 sources";
  [...byId("strip").children].forEach((tile, i) => {
    tile.classList.toggle("sel", i === index);
    tile.setAttribute("aria-selected", i === index);
  });
  const sel = byId("strip").children[index];
  if (sel) byId("strip").scrollLeft = Math.max(0, sel.offsetLeft - 60);
  drawCursor();
  byId("theme").hidden = !card;
}

let natural = [];
function applyPrefs() {
  const selected = cards[index]?.id;
  const rank = id => { const i = prefs.order.indexOf(id); return i < 0 ? 1e9 : i; };
  allCards = natural.map((card, i) => ({card, i})).sort((a, b) => (rank(a.card.id) - rank(b.card.id)) || a.i - b.i).map(x => x.card);
  cards = allCards.filter(card => !prefs.hidden[card.id]);
  index = Math.max(0, cards.findIndex(card => card.id === selected));
}

function populate(sources) {
  lastSources = sources;
  natural = sources.filter(entry => entry.source.type === "HDMI" || entry.source.type === "TV")
    .sort((a, b) => (a.source.type === "TV" ? -1 : 0) - (b.source.type === "TV" ? -1 : 0) || a.source.number - b.source.number)
    .map(({source, connected}) => ({
      id: source.type + "-" + source.number, source, connected,
      name: source.type === "TV" ? "Live TV" : source.editName || "HDMI " + source.number
    })).concat(streams, dlnaFound);
  applyPrefs();
  buildStrip();
  render();
}

function setBusy(on) {
  deck.classList.toggle("busy", on);
  byId("refresh").classList.toggle("busy", on);
  byId("refresh").textContent = on ? "Scanning…" : "Refresh";
  if (on) message("Scanning for inputs…");
}

function refresh() {
  const request = ++refreshGeneration;
  const started = Date.now();
  setBusy(true);
  const settle = work => setTimeout(() => {
    if (request !== refreshGeneration) return;
    setBusy(false);
    message("");
    work();
  }, Math.max(0, 900 - (Date.now() - started)));
  if (demo) {
    settle(() => {
      if (!streams.length) streams.push({id: "stream:demo", name: "Router media", url: "http://demo.invalid/live.m3u8"});
      const names = {1: "PS5", 2: "Switch", 3: "Xbox", 4: null};
      populate([{source: {type: "TV", number: 1}}, ...[1, 2, 3, 4].map(number => ({source: {type: "HDMI", number, editName: names[number]}, connected: true}))]);
    });
    return;
  }
  let done = false;
  function fail(why) {
    if (done || request !== refreshGeneration) return;
    done = true;
    settle(() => { populate([]); message("Could not read TV inputs: " + why); scanDlna(); });
  }
  setTimeout(() => fail("timeout"), 4000);
  try {
    tv.systeminfo.getPropertyValue("VIDEOSOURCE", result => {
      if (done || request !== refreshGeneration) return;
      done = true;
      const list = [];
      const seen = new Set();
      for (const [group, connected] of [[result.connected, true], [result.disconnected, false]]) {
        for (const source of group || []) {
          const key = source.type + source.number;
          if (seen.has(key)) continue;
          seen.add(key);
          list.push({source, connected});
        }
      }
      settle(() => {
        populate(list);
        if (!list.length) message("TV reported no inputs: " + JSON.stringify(result));
        scanDlna();
      });
    }, error => fail((error && error.message) || "error"));
  } catch (error) { fail(error.message); }
}

function move(offset) {
  if (active || cards.length < 2) return;
  index = (index + offset + cards.length) % cards.length;
  message("");
  render();
}

let hideTimer;
function peekBack() {
  if (!active) return;
  byId("back").hidden = false;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { if (active) { byId("back").hidden = true; byId("back").blur(); } }, 4000);
}

function stop(reason = "") {
  clearTimeout(hideTimer);
  if (!active) return;
  const previous = active;
  active = null;
  generation++;
  try {
    if (previous.url) player.close();
    else tv.tvwindow.hide(() => {}, error => message("Could not hide HDMI: " + error.message), "MAIN");
  } catch (error) {
    if (!reason) reason = error.message;
  }
  document.body.classList.remove("playing");
  byId("surface").hidden = byId("back").hidden = true;
  deck.hidden = false;
  focusSel();
  message(reason);
  if (browser.server) showBrowser();
}

function open(target) {
  const card = target || cards[index];
  if (!card || active) return;
  if (card.dlna) { openBrowser(card); return; }
  if (demo) {
    message("Selected " + card.name + ". Install on the TV to open the source.");
    return;
  }
  if (card.url && !player) { message("Samsung AVPlay is unavailable."); return; }
  active = card;
  const request = ++generation;
  const failed = error => {
    if (request === generation) stop("Could not open " + card.name + ": " + (error?.message || error));
  };
  deck.hidden = true;
  byId("back").focus();
  byId("browser").hidden = true;
  document.body.classList.add("playing");
  peekBack();
  try {
    if (card.url) {
      byId("surface").hidden = false;
      player.open(card.url);
      player.setListener({onerror: failed, onstreamcompleted: () => {
        if (request === generation) stop("Playback finished.");
      }});
      player.setDisplayRect(0, 0, 1920, 1080);
      player.prepareAsync(() => {
        if (request !== generation) return;
        try { player.play(); } catch (error) { failed(error); }
      }, failed);
    } else {
      const showInApp = () => {
        try {
          tv.tvwindow.show(() => {
            if (!active) {
              try { tv.tvwindow.hide(() => {}, () => {}, "MAIN"); } catch {}
            }
          }, failed, ["0%", "0%", "100%", "100%"], "MAIN", "BEHIND");
        } catch (error) { failed(error); }
      };
      tv.tvwindow.setSource(card.source, () => {
        if (request !== generation) return;
        // Hand the screen to the TV's own viewer so the input is fully switched.
        try {
          tv.application.launch("org.tizen.tv-viewer", () => {
            // The viewer is in front; reset our UI for when the user returns.
            if (request !== generation) return;
            active = null;
            generation++;
            document.body.classList.remove("playing");
            byId("back").hidden = true;
            deck.hidden = false;
            focusSel();
          }, () => { if (request === generation) showInApp(); });
        } catch (error) { showInApp(); }
      }, failed, "MAIN");
    }
  } catch (error) { failed(error); }
}

byId("refresh").onclick = refresh;
byId("back").onclick = () => stop();
// Theme picker: a plain list with the same virtual cursor as everything else (no native <select>).
const picker = {open: false, cursor: 0, options: []};
function drawPicker() {
  const list = byId("tlist");
  list.textContent = "";
  picker.options.forEach((option, i) => {
    const row = document.createElement("button");
    row.className = i === picker.cursor ? "cur" : "";
    row.textContent = (option.current ? "●  " : "○  ") + option.label;
    row.onfocus = () => row.blur();
    row.onclick = () => { picker.cursor = i; choosePicker(); };
    list.appendChild(row);
  });
  list.children[picker.cursor]?.scrollIntoView({block: "nearest"});
}
byId("theme").onclick = () => {
  const card = cards[index];
  if (!card) return;
  themeTarget = card.id;
  const chosen = THEMES.some(t => t.key === prefs.theme[card.id]) ? prefs.theme[card.id] : "auto";
  picker.options = [{key: "auto", label: "Auto (" + THEMES.find(t => t.key === detectTheme(card)).label + ")"}]
    .concat(THEMES.map(t => ({key: t.key, label: t.label})));
  picker.options.forEach(o => { o.current = o.key === chosen; });
  picker.cursor = Math.max(0, picker.options.findIndex(o => o.current));
  byId("themeFor").textContent = "Theme for " + card.name;
  picker.open = true;
  byId("themeView").hidden = false;
  drawPicker();
};
function closePicker() {
  picker.open = false;
  byId("themeView").hidden = true;
  focusSel();
}
function choosePicker() {
  const option = picker.options[picker.cursor];
  if (option.key === "auto") delete prefs.theme[themeTarget]; else prefs.theme[themeTarget] = option.key;
  savePrefs();
  buildStrip();
  render();
  closePicker();
}
function pickerKey(event) {
  const key = event.key;
  if (key === "ArrowDown" || key === "ArrowUp") {
    event.preventDefault();
    picker.cursor = (picker.cursor + (key === "ArrowDown" ? 1 : -1) + picker.options.length) % picker.options.length;
    drawPicker();
  } else if (key === "Enter") { event.preventDefault(); choosePicker(); }
  else if (event.keyCode === 10009 || key === "Escape" || key === "ArrowLeft") { event.preventDefault(); closePicker(); }
}

// Arrange: show/hide and reorder sources.
const arr = {open: false, cursor: 0};
function drawArrange() {
  const list = byId("alist");
  list.textContent = "";
  allCards.forEach((card, i) => {
    const row = document.createElement("button");
    const hidden = prefs.hidden[card.id];
    row.className = (i === arr.cursor ? "cur " : "") + (hidden ? "off" : "");
    row.textContent = (hidden ? "☐  " : "☑  ") + card.name + "  ·  " + kindOf(card) + (hidden ? "  ·  hidden" : "");
    row.onfocus = () => row.blur();
    row.onclick = () => { arr.cursor = i; toggleHidden(); };
    list.appendChild(row);
  });
  if (!allCards.length) list.textContent = "No sources yet. Press Refresh first.";
  list.children[arr.cursor]?.scrollIntoView({block: "nearest"});
}
function openArrange() {
  arr.open = true;
  arr.cursor = Math.max(0, allCards.findIndex(card => card.id === cards[index]?.id));
  byId("arrangeView").hidden = false;
  drawArrange();
}
function closeArrange() {
  arr.open = false;
  byId("arrangeView").hidden = true;
  buildStrip();
  render();
  focusSel();
}
function commitOrder() {
  prefs.order = allCards.map(card => card.id);
  savePrefs();
  natural = allCards.slice();
  applyPrefs();
}
function toggleHidden() {
  const card = allCards[arr.cursor];
  if (!card) return;
  if (prefs.hidden[card.id]) delete prefs.hidden[card.id]; else prefs.hidden[card.id] = true;
  savePrefs();
  applyPrefs();
  drawArrange();
}
function moveInArrange(step) {
  const to = arr.cursor + step;
  if (to < 0 || to >= allCards.length) return;
  [allCards[arr.cursor], allCards[to]] = [allCards[to], allCards[arr.cursor]];
  arr.cursor = to;
  commitOrder();
  drawArrange();
}
function arrangeKey(event) {
  const key = event.key;
  if (key === "ArrowDown" || key === "ArrowUp") {
    event.preventDefault();
    if (allCards.length) arr.cursor = (arr.cursor + (key === "ArrowDown" ? 1 : -1) + allCards.length) % allCards.length;
    drawArrange();
  } else if (key === "Enter") { event.preventDefault(); toggleHidden(); }
  else if (key === "ArrowLeft") { event.preventDefault(); moveInArrange(-1); }
  else if (key === "ArrowRight") { event.preventDefault(); moveInArrange(1); }
  else if (event.keyCode === 10009 || key === "Escape") { event.preventDefault(); closeArrange(); }
}
byId("arrange").onclick = openArrange;

const PLAYERS = ["org.tizen.video-player-tv", "org.tizen.mycontent-video-player-tv"];
function playNative(item, attempt = 0) {
  const inApp = why => { message(why + " Playing inside Source Deck."); open({name: item.title, url: item.url}); };
  if (!tv?.application || attempt >= PLAYERS.length) { inApp("TV player unavailable."); return; }
  try {
    const control = new tv.ApplicationControl("http://tizen.org/appcontrol/operation/view", item.url, item.mime, null, null);
    tv.application.launchAppControl(control, PLAYERS[attempt], () => {},
      () => playNative(item, attempt + 1));
  } catch (error) { playNative(item, attempt + 1); }
}

// Web apps cannot send SSDP multicast, so probe the local /24 for common UPnP description URLs.
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

function scanStatus(text, busy) {
  const el = byId("scan");
  el.textContent = text;
  el.classList.toggle("busy", !!busy);
}

async function scanDlna() {
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
        populate(lastSources);
      }
      if (jobs.length % 25 === 0) scanStatus("Looking for media servers… " + Math.round(100 * (1 - jobs.length / total)) + "%", true);
    }
  }
  await Promise.all(Array.from({length: 16}, worker));
  if (run !== scanRun) return;
  scanStatus(dlnaFound.length ? "Media servers found: " + dlnaFound.length : "No media servers found on " + prefix + ".x");
}

const browser = {server: null, stack: [], items: []};
const text = (node, tag) => node.getElementsByTagName(tag)[0]?.textContent || "";

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
}

function showBrowser() {
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
    const button = document.createElement("button");
    button.textContent = (item.folder ? "📁 " : "▶ ") + item.title;
    button.onfocus = () => button.blur();
    button.onclick = () => {
      if (item.folder) { browser.stack.push({id, title}); loadFolder(item.id, item.title); }
      else playNative(item);
    };
    byId("blist").appendChild(button);
  }
  showBrowser();
}

function openBrowser(server) {
  browser.server = server;
  browser.stack = [];
  loadFolder("0", "Library");
}

function closeBrowser() {
  browser.server = null;
  byId("browser").hidden = true;
  focusSel();
}

function browserKey(event) {
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

document.addEventListener("keydown", event => {
  if (picker.open) { pickerKey(event); return; }
  if (arr.open) { arrangeKey(event); return; }
  if (browser.server && !active && !byId("browser").hidden) { browserKey(event); return; }
  if (active && event.keyCode !== 10009 && event.key !== "Escape") peekBack();
  if (event.key === "Escape" || event.keyCode === 10009) {
    if (active) { event.preventDefault(); stop(); }
    else if (tv) tv.application.getCurrentApplication().exit();
    return;
  }
  if (active) return;
  const key = event.key;
  if (key === "ArrowLeft" || key === "ArrowRight") {
    event.preventDefault();
    const step = key === "ArrowLeft" ? -1 : 1;
    if (zone === 0) move(step);
    else {
      let next = zone;
      do { next = next + step < 1 ? 3 : next + step > 3 ? 1 : next + step; } while (!usable(next) && next !== zone);
      zone = next;
      drawCursor();
    }
  } else if (key === "ArrowUp" || key === "ArrowDown") {
    event.preventDefault();
    zone = stepZone(key === "ArrowUp" ? -1 : 1, 0);
    drawCursor();
  } else if (key === "Enter") {
    event.preventDefault();
    if (zone === 0) open(); else byId(ZONES[zone]).click();
  }
});
for (const id of ["theme", "arrange", "refresh"]) byId(id).onfocus = () => byId(id).blur();
window.addEventListener("error", e => message("Error: " + e.message));
refresh();
