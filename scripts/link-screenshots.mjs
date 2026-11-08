// Turns the local screenshot paths in DEMO.md and README.md (screenshots/<name>.png) into GitHub image links.
//
// GitHub has no upload API for the images it hosts under https://github.com/user-attachments/assets/..., so the upload is a manual drag and drop:
//   1. Open any GitHub issue or pull request comment box of the repository (do NOT submit it) and drag ALL files of the screenshots/ folder into it.
//      GitHub inserts one markdown line per file, using the file name as the image text, for example  ![01-home-widgets](https://github.com/user-attachments/assets/<uuid>)
//   2. Copy the whole text of the comment box into screenshots/github-urls.md (this folder is git-ignored).
//   3. Run:  node scripts/link-screenshots.mjs           (or pass another file:  node scripts/link-screenshots.mjs path/to/pasted.md)
// Every `screenshots/<name>.png` in DEMO.md and README.md is replaced by the matching GitHub URL. Both ![name](url) and <img alt="name" src="url"> are understood.
// Keep a copy of the unlinked files (git history has them) if you want to re-run the script after uploading again.
import fs from "node:fs"; import path from "node:path"; import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(process.argv[2] || path.join(root, "screenshots", "github-urls.md"));
if (!fs.existsSync(source)) { console.error("Not found: " + source + "\nSee the comment at the top of this script for the steps."); process.exit(1); }

const text = fs.readFileSync(source, "utf8");
const urls = new Map();   // name without extension -> url
const add = (alt, url) => { const name = alt.trim().replace(/\.(png|jpe?g|webp|gif)$/i, ""); if (name && !urls.has(name)) urls.set(name, url); };
for (const m of text.matchAll(/!\[([^\]]*)\]\((https:\/\/github\.com\/user-attachments\/assets\/[^)\s]+)\)/g)) add(m[1], m[2]);
for (const m of text.matchAll(/<img\b[^>]*>/g)) {
  const alt = /\balt="([^"]*)"/.exec(m[0]), src = /\bsrc="(https:\/\/github\.com\/user-attachments\/assets\/[^"]+)"/.exec(m[0]);
  if (alt && src) add(alt[1], src[1]);
}
if (!urls.size) { console.error("No GitHub image links found in " + source); process.exit(1); }

let replaced = 0;
const missing = new Set();
for (const file of ["DEMO.md", "README.md"]) {
  const target = path.join(root, file);
  const before = fs.readFileSync(target, "utf8");
  const after = before.replace(/screenshots\/([\w.-]+?)\.png/g, (whole, name) => {
    if (urls.has(name)) { replaced++; return urls.get(name); }
    missing.add(name);
    return whole;
  });
  if (after !== before) fs.writeFileSync(target, after);
}
console.log("Linked " + replaced + " image reference(s) from " + urls.size + " uploaded image(s).");
if (missing.size) console.log("Not found in the pasted file (still local paths): " + [...missing].join(", "));
