# AGENTS.md — Source Deck

Source Deck is a Tizen web app for a Samsung TV (2023 S95C, model QE77S95CAUXUA, Tizen 9.0). It is a themed
"deck" of thumbnails for every video source: Live TV, each HDMI port, network streams and DLNA/UPnP media
servers. Left/Right choose a source, OK opens it. The whole screen restyles per source (PlayStation, Switch, Xbox...).

**Read the files in `.agents/` before changing anything.** They hold the structure, the decisions already made
(and why) and the TV quirks we hit. Update them in the same change whenever you alter behaviour.

| File | Contents |
|---|---|
| `.agents/architecture.md` | Files, data flow, state, key functions of `app/` |
| `.agents/features.md` | What each feature does and how the user drives it |
| `.agents/themes.md` | Theme system and how to add a theme |
| `.agents/decisions.md` | Decision log: what was chosen, why, what was rejected |
| `.agents/tv-platform-notes.md` | Tizen/Samsung API behaviour and pitfalls found on the real TV |
| `.agents/build-and-deploy.md` | Package, sign, install, run, debug |
| `.agents/youtube-setup.md` | Google Cloud setup for the YouTube login/feed |

## Hard rules

1. **No framework, no build step.** `app/` is plain HTML/CSS/JS shipped as-is: `index.html` (markup + `<template>`s), `css/` (one file per concern, one per theme), `js/` (native ES modules, entry `js/main.js`), plus `sources.js`, `youtube-config.js`, `config.xml`. ES modules were verified to load on the TV. Do not add a bundler.
2. **Never use DOM focus for navigation.** The app has its own virtual cursor (`.cur` class). Native focus and
   the TV's spatial navigation caused double selections and lag. Native `<select>`/`<dialog>` controls are also
   unusable with the remote. Use the list overlays instead. See `decisions.md` D3.
3. **Keep the TV light.** No full-screen animations (background-position, big shadows, scale transforms). They lagged.
4. **Stable ids.** Anything the user customises is keyed by source id (`HDMI-2`, `TV-1`, `dlna:<control url>`, `stream:<url>`).
   Never key by array index.
5. **Port names come from the TV** (`editName` from `VIDEOSOURCE`). The app does not rename ports.
6. **Tiles are visually uniform.** Only background image, icon and outline colour vary per theme. Shape, font and
   text colour must not change between tiles. Theme styles must never leak into `.tile` text.
7. **Layout must not jump.** Tiles and footer are bottom-anchored with a fixed footer height. Do not make their position depend on theme.
8. **Test on the TV.** Browser demo mode (open `app/index.html` over a local HTTP server) covers logic and layout only.
   Remote keys, focus, HDMI and playback only behave correctly on the real TV.
9. Do not commit `build/`, signing files, certificates, `app/youtube-config.js` (OAuth secret) or `.DS_Store`. The Samsung certificate lives in
   `~/SamsungCertificate/` (outside the repo). Never commit it or its password.

## Quick commands

See `.agents/build-and-deploy.md` for the full flow. Short version (profile `GatoPresto`, TV `QE77S95CAUXUA` at `192.168.50.204`):

```sh
tizen=~/tizen-studio/tools/ide/bin/tizen
$tizen package -t wgt -s GatoPresto -o "$PWD/build" -- app
cp "build/Source Deck.wgt" build/SourceDeck.wgt   # the space in the name breaks install
~/tizen-studio/tools/sdb connect 192.168.50.204
$tizen install -n SourceDeck.wgt -t QE77S95CAUXUA -- "$PWD/build"
$tizen run -p SrcDeck001.SourceDeck -t QE77S95CAUXUA
rm -f app/*signature*.xml                          # packaging leaves these in app/
```

## Known gaps

- `README.md` still describes the first version (Assign console, manual stream/server entries). Refresh it.
- Network streams (`streams` in `app/sources.js`) are implemented but were never tested on the TV.
- Playback of DLNA files depends on the TV's native Video Player accepting the URL. Format support is the TV's.
