// Inputs widget: the TV's HDMI ports and whether a device is connected. The flags are kept current by signal.js (the TV is asked every 3 seconds while the deck is on screen), so a console switched on or off shows up without a rescan.
import { state } from "../state.js";
import { t, T } from "../i18n.js";
import { esc, optionsFor } from "../wutil.js";

const type = {
  name: T("Inputs"), size: {w: 3, h: 2}, min: {w: 2, h: 1},
  options: [{key: "show", label: T("Show"), values: [["all", T("All ports")], ["on", T("Connected only")]]}],
  build(el) { el.innerHTML = '<div class="winputs"></div>'; },
  update(el, w) {
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
