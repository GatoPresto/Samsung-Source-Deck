// QR codes as inline SVG (drawn from the module matrix). Needs vendor/qrcode.js (qrcode-generator, MIT), loaded as a classic script.
/** Returns an <svg> string for `text`, or "" when the library is missing. */
export function qrSvg(text) {
  if (!text || typeof window.qrcode !== "function") return "";
  const qr = window.qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount(), quiet = 2;
  let path = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += "M" + (c + quiet) + " " + (r + quiet) + "h1v1h-1z";
  const size = n + 2 * quiet;
  return '<svg viewBox="0 0 ' + size + " " + size + '" shape-rendering="crispEdges" role="img" aria-label="QR code"><path d="' + path + '" fill="#000"/></svg>';
}
