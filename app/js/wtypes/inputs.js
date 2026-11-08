// Inputs widget: the TV's HDMI ports and whether a device is connected. While the widget is on screen the TV is asked again every 3 seconds, so a console switched on or off shows up without a rescan.
import { state, tv } from "../state.js";
import { t, T } from "../i18n.js";
import { esc, optionsFor } from "../wutil.js";

let lastPoll = 0;
/** Re-read VIDEOSOURCE (at most every 3 s) and update the `connected` flag of the HDMI cards in place; `changed()` runs when something differs. */
function poll(changed) {
  if (!tv?.systeminfo || Date.now() - lastPoll < 3000) return;
  lastPoll = Date.now();
  try {
    tv.systeminfo.getPropertyValue("VIDEOSOURCE", result => {
      let different = false;
      for (const [group, connected] of [[result?.connected, true], [result?.disconnected, false]]) {
        for (const source of group || []) {
          const card = state.natural.find(c => c.source && c.source.type === source.type && c.source.number === source.number);
          if (card && card.connected !== connected) { card.connected = connected; different = true; }
        }
      }
      if (different) changed();
    }, () => {});
  } catch (error) {}
}

const type = {
  name: T("Inputs"), size: {w: 3, h: 2}, min: {w: 2, h: 1},
  options: [{key: "show", label: T("Show"), values: [["all", T("All ports")], ["on", T("Connected only")]]}],
  build(el) { el.innerHTML = '<div class="winputs"></div>'; },
  update(el, w) {
    poll(() => { if (el.isConnected) type.update(el, w); });
    const o = optionsFor(type, w);
    let ports = state.natural.filter(c => c.source && c.source.type === "HDMI");
    if (o.show === "on") ports = ports.filter(c => c.connected);
    const rows = ports.map(c => {
      const label = t("HDMI {n}", {n: c.source.number});
      const small = [c.name !== label ? label : "", c.connected ? t("Connected") : t("No signal")].filter(Boolean).join(" · ");
      return '<div class="irow ' + (c.connected ? "on" : "off") + '"><i></i><span>' + esc(c.name) + "</span><small>" + esc(small) + "</small></div>";
    }).join("");
    const html = '<h4>' + esc(t("Inputs")) + '</h4><div class="irows" style="--rows:' + Math.max(1, ports.length) + '">' + (rows || '<span class="wnote">' + esc(t("No inputs found yet.")) + "</span>") + "</div>";
    const box = el.firstElementChild;
    if (box.dataset.sig !== html) { box.dataset.sig = html; box.innerHTML = html; }
  },
};
export default type;
