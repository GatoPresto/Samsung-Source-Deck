// Opening a source: HDMI/Live TV (full switch through the TV's viewer), streams (AVPlay), apps, media servers.
import { byId, deck, message } from "./dom.js";
import { state, tv, player, demo } from "./state.js";
import { focusSel } from "./cursor.js";
import { browser, openBrowser, showBrowser } from "./dlna.js";
import { t } from "./i18n.js";
import { openWidgetEditor } from "./widgetedit.js";

let hideTimer;

/** In the in-app fallback view, show the Back button for 4 s (any key shows it again). */
export function peekBack() {
  if (!state.active) return;
  byId("back").hidden = false;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { if (state.active) { byId("back").hidden = true; byId("back").blur(); } }, 4000);
}

export function stop(reason = "") {
  clearTimeout(hideTimer);
  if (!state.active) return;
  const previous = state.active;
  state.active = null;
  state.generation++;
  try {
    if (previous.url) player.close();
    else tv.tvwindow.hide(() => {}, error => message(t("Could not hide HDMI: {why}", {why: error.message})), "MAIN");
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

export function open(target) {
  const card = target || state.cards[state.index];
  if (!card || state.active) return;
  if (card.home) { openWidgetEditor(card); return; }
  if (card.dlna) { openBrowser(card); return; }
  if (card.app) {
    if (demo) { message(t("Would launch {name} on the TV.", {name: card.name})); return; }
    try {
      tv.application.launch(card.app, () => {}, error => message(t("Could not open {name}: {why}", {name: card.name, why: error?.message || error})));
    } catch (error) { message(t("Could not open {name}: {why}", {name: card.name, why: error.message})); }
    return;
  }
  if (demo) {
    message(t("Selected {name}. Install on the TV to open the source.", {name: card.name}));
    return;
  }
  if (card.url && !player) { message(t("Samsung AVPlay is unavailable.")); return; }

  state.active = card;
  const request = ++state.generation;
  const failed = error => {
    if (request === state.generation) stop(t("Could not open {name}: {why}", {name: card.name, why: error?.message || error}));
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
        if (request === state.generation) stop(t("Playback finished."));
      }});
      player.setDisplayRect(0, 0, 1920, 1080);
      player.prepareAsync(() => {
        if (request !== state.generation) return;
        try { player.play(); } catch (error) { failed(error); }
      }, failed);
    } else {
      // Fallback only: draw the input inside this app.
      const showInApp = () => {
        try {
          tv.tvwindow.show(() => {
            if (!state.active) {
              try { tv.tvwindow.hide(() => {}, () => {}, "MAIN"); } catch {}
            }
          }, failed, ["0%", "0%", "100%", "100%"], "MAIN", "BEHIND");
        } catch (error) { failed(error); }
      };
      tv.tvwindow.setSource(card.source, () => {
        if (request !== state.generation) return;
        // Hand the screen to the TV's own viewer so the input is fully switched.
        try {
          tv.application.launch("org.tizen.tv-viewer", () => {
            // The viewer is in front; reset our UI for when the user returns.
            if (request !== state.generation) return;
            state.active = null;
            state.generation++;
            document.body.classList.remove("playing");
            byId("back").hidden = true;
            deck.hidden = false;
            focusSel();
          }, () => { if (request === state.generation) showInApp(); });
        } catch (error) { showInApp(); }
      }, failed, "MAIN");
    }
  } catch (error) { failed(error); }
}
