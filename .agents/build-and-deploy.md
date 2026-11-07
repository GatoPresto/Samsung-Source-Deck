# Build, install, debug

## One-time setup (already done on the dev machine)
- Tizen Studio CLI installed in `~/tizen-studio` (web CLI installer, plus `TV-SAMSUNG-Public-WebAppDevelopment`, `cert-add-on`, `Certificate-Manager`).
- Samsung certificate profile `GatoPresto` created in Certificate Manager (Samsung account sign-in, author + public distributor
  cert, TV DUID). Files in `~/SamsungCertificate/GatoPresto/`. Never commit them.
- TV: Apps screen -> press 12345 (number pad via remote or SmartThings) -> Developer mode On -> Host PC IP = this Mac's LAN IP -> restart TV.

## Build and install
```sh
cd "<project root>"
T=~/tizen-studio/tools/ide/bin/tizen
~/tizen-studio/tools/sdb connect 192.168.50.204          # TV IP may change, check router
rm -rf build
$T package -t wgt -s GatoPresto -o "$PWD/build" -- app
rm -f app/*signature*.xml                                 # packaging writes these into app/
cp "build/Source Deck.wgt" build/SourceDeck.wgt           # names with spaces fail to install
$T install -n SourceDeck.wgt -t QE77S95CAUXUA -- "$PWD/build"
$T run -p SrcDeck001.SourceDeck -t QE77S95CAUXUA
```
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
