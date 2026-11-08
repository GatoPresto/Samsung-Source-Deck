// Currency widget: exchange rates from ExchangeRate-API's open endpoint (no key, updated daily, 160+ currencies). Cached for an hour per base currency.
import { httpJson } from "../http.js";
import { t, T } from "../i18n.js";
import { esc, locale, optionsFor, loadOnce, loadFailed, cache, isOld } from "../wutil.js";

const CODES = ["USD", "EUR", "UAH", "GBP", "PLN", "CAD", "CHF", "JPY", "CNY", "TRY", "CZK", "SEK", "NOK", "AUD", "INR", "BRL", "MXN", "KRW"];
const quote = (key, def) => ({key, label: T("Currency"), def: () => def, values: [["none", T("None")], ...CODES.map(c => [c, c])]});

const money = (value, code) => {
  try { return new Intl.NumberFormat(locale(), {style: "currency", currency: code, maximumFractionDigits: value >= 1000 ? 0 : 2}).format(value); }
  catch (error) { return value.toFixed(2) + " " + code; }
};

const type = {
  name: T("Currency"), size: {w: 3, h: 2}, min: {w: 2, h: 1},
  options: [
    {key: "base", label: T("From"), def: () => "USD", values: CODES.map(c => [c, c])},
    {key: "amount", label: T("Amount"), values: [["1", "1"], ["10", "10"], ["100", "100"], ["1000", "1000"]]},
    quote("q1", "EUR"), quote("q2", "UAH"), quote("q3", "none"),
  ],
  build(el) { el.innerHTML = '<div class="wfx"></div>'; },
  update(el, w) {
    const o = optionsFor(type, w), box = el.firstElementChild;
    const entry = cache.get("fx", o.base);
    loadOnce(w.id, isOld(entry, 60), async () => {
      const {status, json} = await httpJson("GET", "https://open.er-api.com/v6/latest/" + o.base);
      if (status !== 200 || json?.result !== "success") throw new Error("HTTP " + status);
      const rates = {};
      for (const c of CODES) if (json.rates[c]) rates[c] = json.rates[c];
      cache.set("fx", o.base, {rates});
    }, () => { if (el.isConnected) type.update(el, w); });
    let html;
    if (!entry) html = '<span class="wnote">' + esc(loadFailed(w.id) ? t("Rates unavailable") : "…") + "</span>";
    else {
      const amount = Number(o.amount);
      const rows = [o.q1, o.q2, o.q3].filter(q => q !== "none" && q !== o.base && entry.data.rates[q])
        .map(q => '<div class="frow"><small>' + q + "</small><b>" + esc(money(entry.data.rates[q] * amount, q)) + "</b></div>").join("");
      html = '<h4>' + esc(money(amount, o.base)) + '</h4><div class="frows" style="--rows:' + Math.max(1, (rows.match(/frow/g) || []).length) + '">' + (rows || '<span class="wnote">' + esc(t("Choose a currency in the widget options")) + "</span>") + '</div><small class="fsrc">exchangerate-api.com</small>';
    }
    if (box.dataset.sig !== html) { box.dataset.sig = html; box.innerHTML = html; }
  },
};
export default type;
