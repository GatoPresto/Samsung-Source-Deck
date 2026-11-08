// YouTube: Google device-flow login + subscriptions feed (YouTube Data API v3, read-only).
// Needs a Google OAuth client of type "TVs and Limited Input devices" in app/youtube-config.js (see .agents/youtube-setup.md).
import { byId, deck, message } from "./dom.js";
import { state, tv, demo, yt, saveJson } from "./state.js";
import { makeVideo, makeChannel, makeAllChip } from "./templates.js";
import { drawCursor, fadeEdges, focusSel } from "./cursor.js";
import { render } from "./render.js";
import { httpJson } from "./http.js";
import { t } from "./i18n.js";
import { qrSvg } from "./qr.js";

const YT_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const FEED_TTL = 10 * 60000;
export const loginUi = {open: false, run: 0};
const isYoutube = card => card?.id === "app:youtube";
const ytConfigured = () => !!(window.youtubeAuth && window.youtubeAuth.clientId && window.youtubeAuth.clientSecret);

// ---- Tokens ----
async function ytAccessToken() {
  if (!yt.tokens) throw new Error("not logged in");
  if (Date.now() < yt.tokens.expires - 60000) return yt.tokens.access;
  const {status, json} = await httpJson("POST", "https://oauth2.googleapis.com/token", {body: {
    client_id: window.youtubeAuth.clientId, client_secret: window.youtubeAuth.clientSecret,
    refresh_token: yt.tokens.refresh, grant_type: "refresh_token"}});
  if (status !== 200 || !json?.access_token) { ytLogout(); throw new Error("login expired, please log in again"); }
  yt.tokens = {...yt.tokens, access: json.access_token, expires: Date.now() + json.expires_in * 1000};
  saveJson("yt-tokens", yt.tokens);
  return yt.tokens.access;
}

async function ytApi(resource, params) {
  const query = Object.entries(params).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
  const {status, json} = await httpJson("GET", "https://www.googleapis.com/youtube/v3/" + resource + "?" + query, {token: await ytAccessToken()});
  if (status !== 200) throw new Error(json?.error?.message || "YouTube API " + status);
  return json;
}

// ---- Feed data ----
export const currentVideos = () => yt.view?.videos || yt.feed?.videos || [];
const mapVideo = (item, fallbackChannel) => ({id: item.contentDetails.videoId, title: item.snippet.title,
  channel: item.snippet.videoOwnerChannelTitle || fallbackChannel, at: item.contentDetails.videoPublishedAt || item.snippet.publishedAt,
  thumb: item.snippet.thumbnails?.medium?.url});

async function loadFeed(force) {
  if (!yt.tokens || yt.loading) return;
  if (!force && yt.feed && Date.now() - yt.feed.at < FEED_TTL) return;
  yt.loading = true; yt.error = "";
  renderFeed();
  try {
    const subs = await ytApi("subscriptions", {part: "snippet", mine: "true", maxResults: 50, order: "relevance"});
    const channels = subs.items.map(i => ({id: i.snippet.resourceId.channelId, title: i.snippet.title, thumb: i.snippet.thumbnails?.default?.url}));
    // YouTube has no "subscription feed" endpoint: read the newest uploads of up to 15 channels.
    // A channel's uploads playlist id is its channel id with the "UC" prefix replaced by "UU".
    const lists = await Promise.all(channels.slice(0, 15).map(c =>
      ytApi("playlistItems", {part: "snippet,contentDetails", playlistId: "UU" + c.id.slice(2), maxResults: 3}).then(r => ({c, r})).catch(() => null)));
    const videos = [];
    for (const entry of lists) for (const item of entry?.r?.items || []) videos.push(mapVideo(item, entry.c.title));
    videos.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    yt.feed = {at: Date.now(), channels, videos: videos.slice(0, 24)};
    saveJson("yt-feed", yt.feed);
  } catch (error) { yt.error = error.message; }
  yt.loading = false;
  renderFeed();
}

/** Show one channel's latest uploads in the video row (null = back to the mixed feed). The cursor stays on the channel row. */
export async function selectChannel(channel) {
  yt.error = "";
  if (!channel) { yt.view = null; yt.idx = 0; renderFeed(); byId("vids").scrollLeft = 0; fadeEdges(); return; }
  yt.loading = true; yt.view = null;
  renderFeed();
  try {
    const r = await ytApi("playlistItems", {part: "snippet,contentDetails", playlistId: "UU" + channel.id.slice(2), maxResults: 24});
    yt.view = {channel, videos: r.items.map(i => mapVideo(i, channel.title))};
    yt.idx = 0;
  } catch (error) { yt.error = error.message; }
  yt.loading = false;
  renderFeed();
  byId("vids").scrollLeft = 0;
  fadeEdges();
}

// ---- Feed UI ----
export function renderFeed() {
  const card = state.cards[state.index];
  const show = isYoutube(card) && !!yt.tokens;
  byId("feed").hidden = !show;
  deck.classList.toggle("feedon", show);
  yt.shown = show;
  if (!show) { yt.inFeed = false; return; }
  const subs = byId("subs"), vids = byId("vids");
  subs.textContent = ""; vids.textContent = "";
  byId("feedStatus").textContent = yt.loading ? t("Loading…") : yt.error ? t("Could not load: {why}", {why: yt.error}) :
    yt.view ? t("Videos from {channel}  ·  choose All to go back", {channel: yt.view.channel.title}) : yt.feed && !yt.feed.videos.length ? t("No recent videos found.") : "";
  if (yt.feed) {
    const all = makeAllChip();
    all.onclick = () => selectChannel(null);
    subs.appendChild(all);
  }
  for (const c of yt.feed?.channels || []) {
    const chip = makeChannel(c);
    chip.onclick = () => selectChannel(c);
    subs.appendChild(chip);
  }
  for (const v of currentVideos()) {
    const el = makeVideo(v);
    el.onclick = () => playYoutube(v);
    vids.appendChild(el);
  }
  yt.sidx = Math.min(yt.sidx, Math.max(0, subs.children.length - 1));
  yt.idx = Math.min(yt.idx, Math.max(0, vids.children.length - 1));
  drawCursor();
}

/** Called by render(): login button, feed visibility and (re)loading for the selected source. */
export function updateYoutubeUi(card) {
  const button = byId("ytlogin");
  button.hidden = !isYoutube(card);
  button.textContent = t(yt.tokens ? "Log out" : "Log in");
  renderFeed();
  if (isYoutube(card) && yt.tokens && !yt.feed) loadFeed(false);
  else if (isYoutube(card) && yt.tokens && Date.now() - yt.feed.at > FEED_TTL) loadFeed(false);
}

function ytLogout() {
  yt.tokens = null; yt.feed = null; yt.view = null; yt.error = ""; yt.inFeed = false; yt.row = "vids";
  saveJson("yt-tokens", null); saveJson("yt-feed", null);
  if (state.cards.length) render();
}

// Hand a video to the TV's YouTube app. The app is Cobalt-based and takes a PAYLOAD like "#watch?v=ID&launch=launcher"
// (format taken from flutter-tizen's app_control example). Falls back to the next app id if the app control throws.
const YT_APP_IDS = ["com.samsung.tv.cobalt-yt", "9Ur5IzDKqV.TizenYouTube"];
export function playYoutube(video) {
  if (!video) return;
  if (demo) { message(t("Would open: {title}", {title: video.title})); return; }
  const launchWith = attempt => {
    const appId = YT_APP_IDS[attempt];
    if (!appId) { message(t("Could not open the video in YouTube.")); return; }
    try {
      const control = new tv.ApplicationControl("http://tizen.org/appcontrol/operation/default", null, null, null,
        [new tv.ApplicationControlData("PAYLOAD", ["#watch?v=" + video.id + "&launch=launcher"])]);
      tv.application.launchAppControl(control, appId, () => message(t("Opening in YouTube…")), () => launchWith(attempt + 1));
    } catch (error) { launchWith(attempt + 1); }
  };
  launchWith(0);
}

// ---- Login (OAuth device flow: the user enters a code on their phone) ----
/** A QR code inside #loginQr. */
function drawQr(text) {
  const box = byId("loginQr"), svg = qrSvg(text);
  if (!svg) { box.hidden = true; box.textContent = ""; return; }
  box.innerHTML = svg + "<p>" + t("Scan with your phone") + "</p>";
  box.hidden = false;
}

function showLogin(title, lines, code, qrText) {
  byId("loginTitle").textContent = title;
  byId("loginCode").textContent = code || "";
  byId("loginText").textContent = lines;
  drawQr(qrText);
  byId("loginView").hidden = false;
  loginUi.open = true;
}
function closeLogin() {
  loginUi.run++;
  loginUi.open = false;
  byId("loginView").hidden = true;
  focusSel();
}

export function loginKey(event) {
  if (event.keyCode === 10009 || event.key === "Escape" || event.key === "Enter") { event.preventDefault(); closeLogin(); }
}

export async function ytLogin() {
  if (yt.tokens) { ytLogout(); message(t("Logged out of YouTube.")); return; }
  if (!ytConfigured()) {
    showLogin("YouTube login needs setup",
      "Create a Google OAuth client of type \"TVs and Limited Input devices\", enable YouTube Data API v3, then put the client id and secret in app/youtube-config.js and reinstall. Details: .agents/youtube-setup.md. Press Back to close.");
    return;
  }
  const run = ++loginUi.run;
  showLogin(t("Log in to YouTube"), t("Starting…"));
  try {
    const {status, json} = await httpJson("POST", "https://oauth2.googleapis.com/device/code", {body: {client_id: window.youtubeAuth.clientId, scope: YT_SCOPE}});
    if (run !== loginUi.run) return;
    if (status !== 200 || !json?.device_code) throw new Error(json?.error_description || json?.error || "HTTP " + status);
    // The QR opens Google's device page; the code is added as a parameter in case the page pre-fills it (it is shown on screen either way).
    const qrText = json.verification_url + (json.verification_url.includes("?") ? "&" : "?") + "user_code=" + encodeURIComponent(json.user_code);
    showLogin(t("Log in to YouTube"), t("Scan the QR code, or open {url} and enter this code. Waiting for you… (Back cancels)", {url: json.verification_url}), json.user_code, qrText);
    let interval = (json.interval || 5) * 1000;
    const deadline = Date.now() + json.expires_in * 1000;
    while (run === loginUi.run && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, interval));
      if (run !== loginUi.run) return;
      const poll = await httpJson("POST", "https://oauth2.googleapis.com/token", {body: {
        client_id: window.youtubeAuth.clientId, client_secret: window.youtubeAuth.clientSecret,
        device_code: json.device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code"}});
      const err = poll.json?.error;
      if (poll.status === 200 && poll.json?.access_token) {
        yt.tokens = {access: poll.json.access_token, refresh: poll.json.refresh_token, expires: Date.now() + poll.json.expires_in * 1000};
        saveJson("yt-tokens", yt.tokens);
        closeLogin();
        message(t("Logged in to YouTube."));
        render();
        loadFeed(true);
        return;
      }
      if (err === "slow_down") interval += 5000;
      else if (err && err !== "authorization_pending") throw new Error(poll.json.error_description || err);
    }
    if (run === loginUi.run) showLogin(t("Log in to YouTube"), t("The code expired. Press Back and try again."));
  } catch (error) {
    if (run === loginUi.run) showLogin(t("Log in failed"), t("{why} (Back closes)", {why: error.message}));
  }
}
