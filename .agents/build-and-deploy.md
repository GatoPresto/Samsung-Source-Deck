# Build, install, debug

## One-time setup (already done on the dev machine)
- Tizen Studio CLI installed in `~/tizen-studio` (web CLI installer, plus `TV-SAMSUNG-Public-WebAppDevelopment`, `cert-add-on`, `Certificate-Manager`).
- Samsung certificate profile `GatoPresto` created in Certificate Manager (Samsung account sign-in, author + public distributor
  cert, TV DUID). Files in `~/SamsungCertificate/GatoPresto/`. Never commit them.
- TV: Apps screen -> press 12345 (number pad via remote or SmartThings) -> Developer mode On -> Host PC IP = this Mac's LAN IP -> restart TV.

## Build and install
```sh
scripts/deploy.sh            # package + install + run (use --no-run or --build for less)
```
The script: removes `build/` and stray signature files, runs `tizen package -t wgt -s GatoPresto -o build -- app`, **renames** `build/Source Deck.wgt` to `build/SourceDeck.wgt` (a space in the name makes `tizen install` fail, and `tizen package` has no output-name option, so it is moved, not copied: only one package remains),
deletes the signature XML files `tizen package` leaves in `app/`, then `sdb connect`, `tizen install -n SourceDeck.wgt` and `tizen run -p SrcDeck001.SourceDeck`. Defaults can be overridden with the env vars `PROFILE`, `TV_IP`, `TV_NAME`.
- Target name `QE77S95CAUXUA` is from `sdb devices`.
- If `sdb connect` fails: confirm the TV is on, `nc -zv 192.168.50.204 26101`, Developer Mode still On with the right Host PC IP, then `sdb kill-server && sdb start-server`.
- Install failing with no message: check for a space in the package name, a stale `.wgt` inside `app/`, or certificate/DUID mismatch.
- Long commands can hang when the TV sleeps: use timeouts and retry the connect first.

## App icon
`app/icon.png` (512x423, transparent corners) is rendered from `design/icon.svg` with headless Chrome (no other SVG tool is installed):
```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars \
  --default-background-color=00000000 --window-size=512,423 --screenshot="$PWD/app/icon.png" "file://$PWD/design/icon.svg"
```
`config.xml` has `<icon src="icon.png"/>`. After changing the icon, reinstall; the TV may take a moment to refresh the Apps row.

## Checking changes without a TV
```sh
for f in app/js/*.js; do node --input-type=module --check < "$f"; done
cd app && python3 -m http.server 8123   # open http://localhost:8123/index.html (demo mode)
```
Demo mode simulates keys via `document.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowRight"}))`.
Verify behaviour on the TV afterwards, since focus, remote keys and playback differ.

## Debug logging from the TV
Temporarily add `new Image().src = "http://<mac-ip>:8099/log?" + encodeURIComponent(text)` and run a small Python
`http.server` that prints each request path. Remove it (and stop the server) before committing.

## Git
Repo: https://github.com/GatoPresto/Samsung-Source-Deck (branch `main`). `.gitignore`: `build/`, `.DS_Store`,
`app/.manifest.tmp`, `app/*signature*.xml`. Commit messages end with the Claude co-author line.

## Demo screenshots (DEMO.md, README.md)
`screenshots/` (git-ignored) holds 1920 x 1080 PNGs taken from the browser demo mode (serve `app/` over HTTP, open it in Chrome at a 1920 x 1080 viewport, drive it with synthetic `keydown` events like the TV remote). For stable, correct data the shots used the real APIs where the browser allows it and local copies of RSS feeds / sample wallpapers where CORS blocks it (the TV itself ignores CORS). `DEMO.md` and `README.md` refer to the images as `screenshots/<name>.png`; GitHub cannot be uploaded to by script, so: drag the files into a GitHub comment box (do not submit), paste the generated markdown into `screenshots/github-urls.md`, then run `node scripts/link-screenshots.mjs` to replace the local paths by the `https://github.com/user-attachments/assets/...` links.
