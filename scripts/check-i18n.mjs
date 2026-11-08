// Checks that every user-visible string marked for translation has a translation in every language file.
// Strings are found as the first string literals inside t("…") and T("…") calls in app/js/*.js, app/js/wtypes/*.js and as data-i18n* attributes in app/index.html.
// Usage: node scripts/check-i18n.mjs            (exit code 1 when something is missing, extra or has different {placeholders})
//        node scripts/check-i18n.mjs --list     (print the English strings, e.g. to hand to a translator)
import fs from "node:fs"; import path from "node:path"; import {pathToFileURL, fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "app");
const phrases = [];
const add = s => { if (/[A-Za-z]/.test(s) && !phrases.includes(s)) phrases.push(s); };

const sources = [];   // app/js/*.js and app/js/wtypes/*.js (widget types)
for (const dir of ["js", "js/wtypes"]) for (const f of fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith(".js") && f !== "i18n.js").sort()) sources.push(path.join(dir, f));
for (const file of sources) {
  const src = fs.readFileSync(path.join(root, file), "utf8");
  for (const m of src.matchAll(/(?<![\w.])[tT]\(/g)) {
    let i = m.index + m[0].length, depth = 1, quote = null, arg = "";
    for (; i < src.length && depth; i++) {
      const c = src[i];
      if (quote) { if (c === "\\") { arg += c + src[++i]; continue; } if (c === quote) quote = null; }
      else if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "(") depth++;
      else if (c === ")") { depth--; if (!depth) break; }
      arg += c;
    }
    for (const lit of arg.matchAll(/"((?:[^"\\]|\\.)*)"/g)) add(JSON.parse('"' + lit[1] + '"'));
  }
}
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const m of html.matchAll(/data-i18n(?:-placeholder|-label)?="([^"]*)"/g)) add(m[1]);

if (process.argv.includes("--list")) { console.log(JSON.stringify(phrases, null, 1)); process.exit(0); }

const ph = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(",");
const langDir = path.join(root, "js", "lang");
let problems = 0;
for (const file of fs.readdirSync(langDir).filter(f => f.endsWith(".js")).sort()) {
  const dict = (await import(pathToFileURL(path.join(langDir, file)).href)).default;
  const stale = new Set(Object.keys(dict));
  for (const p of phrases) {
    stale.delete(p);
    if (!(p in dict) || !String(dict[p]).trim()) { console.log(file, "MISSING", JSON.stringify(p)); problems++; }
    else if (ph(p) !== ph(dict[p])) { console.log(file, "PLACEHOLDERS", JSON.stringify(p), "=>", JSON.stringify(dict[p])); problems++; }
  }
  for (const k of stale) { console.log(file, "UNUSED KEY", JSON.stringify(k)); problems++; }
}
console.log(problems ? problems + " problem(s)" : "i18n ok: " + phrases.length + " strings");
process.exit(problems ? 1 : 0);
