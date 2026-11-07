// Reading the TV's inputs (VIDEOSOURCE) and the Refresh button.
import { byId, deck, message } from "./dom.js";
import { state, tv, demo, streams } from "./state.js";
import { populate } from "./render.js";
import { detectApps } from "./apps.js";
import { scanDlna } from "./dlna.js";

function setBusy(on) {
  deck.classList.toggle("busy", on);
  byId("refresh").classList.toggle("busy", on);
  byId("refresh").textContent = on ? "Scanning…" : "Refresh";
  if (on) message("Scanning for inputs…");
}

export function refresh() {
  const request = ++state.refreshGeneration;
  if (state.lastSources.length) detectApps();
  const started = Date.now();
  setBusy(true);
  // Keep the busy state visible for at least 0.9 s so the user sees Refresh did something.
  const settle = work => setTimeout(() => {
    if (request !== state.refreshGeneration) return;
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
    if (done || request !== state.refreshGeneration) return;
    done = true;
    settle(() => { populate([]); message("Could not read TV inputs: " + why); scanDlna(); });
  }
  setTimeout(() => fail("timeout"), 4000);
  try {
    tv.systeminfo.getPropertyValue("VIDEOSOURCE", result => {
      if (done || request !== state.refreshGeneration) return;
      done = true;
      // The TV reports ports under `connected` and `disconnected`; unplugged HDMI ports are still listed.
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
