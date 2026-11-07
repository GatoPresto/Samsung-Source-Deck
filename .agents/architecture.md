# Architecture

## Files

```
AGENTS.md                 entry point for agents
README.md                 user-facing setup (outdated, see AGENTS.md "Known gaps")
.gitignore                build/, .DS_Store, packaging temp files, app/youtube-config.js
.agents/                  project memory (this folder)
app/                      the Tizen web app (this folder is what gets packaged)
  config.xml              widget manifest, app id, privileges
  index.html              markup, <link>s to css/, <template>s, <script type="module" src="js/main.js">
  icon.png                app icon (512x423 PNG with alpha), referenced by <icon> in config.xml
  sources.js              optional user config (window.sourceDeck: dlna[], streams[])
  youtube-config.js       YouTube OAuth client id/secret (git-ignored; youtube-config.example.js is committed)
  css/
    base.css              layout, typography, buttons, .cur cursor, header, status, spinners
    tiles.css             source thumbnails (strip + .tile)
    overlays.css          media browser / Arrange / theme picker lists, YouTube login screen
    feed.css              YouTube feed rows (avatars, videos)
    fades.css             edge fade masks for the three scrolling rows
    themes/<key>.css      one file per theme: main[data-theme=KEY] look + .tile[data-theme=KEY] thumbnail
  js/                     native ES modules (see below)
design/icon.svg           source artwork of the app icon (fan of four themed cards + play card)
build/                    generated .wgt packages (git-ignored)
```

- App id `SrcDeck001.SourceDeck`, package `SrcDeck001`, profile `tv-samsung`, `required_version` 7.0.
- Privileges in `config.xml`: `tv.window`, `internet`, `systeminfo`, `application.launch`, `application.info`,
  `developer.samsung.com/privilege/network.public` (for `webapis.network.getIp()`), plus `<access origin="*">` so
  XHR to LAN servers is allowed.
- `index.html` loads `$WEBAPIS/webapis/webapis.js` (resolved on the TV, a 404 in a desktop browser is expected),
  then the classic scripts `sources.js` and `youtube-config.js` (they set `window.sourceDeck` / `window.youtubeAuth`), then the module `js/main.js`.
- Module scripts are deferred, so the DOM is ready when `js/*.js` run. Modules import each other in cycles (e.g. `render` <-> `youtube`); that is fine
  because nothing is called at import time except in `main.js`. Never call another module's function at top level.

## JS modules (`app/js/`)

| Module | Responsibility |
|---|---|
| `main.js` | entry: wires buttons, starts keys, `detectApps()`, `refresh()` |
| `dom.js` | `byId`, `deck`, `message()` |
| `state.js` | platform handles (`tv`, `player`, `config`, `demo`), shared `state` object, `streams`, `dlnaFound`, `yt` state, JSON storage helpers. Imports nothing |
| `prefs.js` | `prefs` (theme/hidden/order), `savePrefs`, `prefs.v` migrations |
| `themes.js` | `THEMES`, `GLYPH`, `detectTheme`, `themeOf`, `kindOf` |
| `templates.js` | builders that clone the `<template>`s: `makeTile/makeVideo/makeChannel/makeAllChip/makeRow` (all blur on focus) |
| `cursor.js` | virtual cursor: `ZONES`, `usable`, `drawCursor`, `fadeEdges`, `focusSel`, `stepZone` |
| `render.js` | `applyPrefs`, `populate`, `buildStrip`, `move`, `render` |
| `inputs.js` | `refresh()` (VIDEOSOURCE, busy spinner) |
| `apps.js` | curated `APPS` catalogue + `detectApps()` (also every other launchable app as a generic card, flagged `system` for Samsung internals) |
| `playback.js` | `open`, `stop`, `peekBack` (HDMI full switch, AVPlay streams, app launch) |
| `dlna.js` | subnet scan, `scanStatus`, media browser (SOAP), `playNative` |
| `picker.js` | theme picker overlay |
| `arrange.js` | Arrange screen: Arrange list (reorder, hide/show, remove) and Source list (add; all TV apps) |
| `music.js` | Apple Music panel: tabs, charts, search, album view, 30 s previews, play history. Reuses the feed DOM and the `yt.inFeed/row/idx/sidx` cursor state |
| `http.js` | `httpJson` XHR wrapper (used by youtube.js and music.js) |
| `youtube.js` | login (device flow), token refresh, feed, channel filter, `playYoutube` |
| `keys.js` | the single keydown router (+ YouTube feed keys) |

Shared mutable values live on `state` (never as exported `let`s). To add a source type: extend `populate()` (render.js), `kindOf/detectTheme` (themes.js), `open()` (playback.js).

## Screen structure (`index.html`)

`<main id="deck" data-theme data-card>` is a flex column:
header (title + count) -> `section` (meta, title `h1`, detail, `#status`, `#scan`) -> overlays (`#browser`,
`#arrangeView`, `#themeView`, absolute, full-screen, inside `main` so they inherit theme variables) ->
`#strip` (thumbnail tiles) -> `footer.nav` (Change theme, Arrange, Refresh).
Outside `main`: `<object id="surface">` (AVPlay target) and `#back` (Back to sources button).

## State (`js/state.js`, `state.*`)

| Variable | Meaning |
|---|---|
| `state.natural` | all known sources in default order (TV, HDMI by number, streams, DLNA) |
| `state.allCards` | `natural` sorted by `prefs.order` (includes hidden) |
| `state.cards` | `allCards` minus hidden. This is what the strip shows |
| `state.index` | selected index into `cards` |
| `state.zone` | virtual cursor zone: 0 tiles, 1 Change theme, 2 Arrange, 3 Refresh |
| `state.active` | the card currently open (HDMI/stream); `null` on the picker |
| `prefs` (prefs.js) | `{theme:{id:key}, hidden:{id:true}, order:[id]}`, persisted in `localStorage["deck-prefs"]` |
| `dlnaFound` (state.js) | DLNA servers found by scan (kept for the session), plus any from `sources.js` |
| `state.lastSources` | last `VIDEOSOURCE` list, lets scan results re-run `populate` |
| `arr`, `picker`, `browser` | state of the Arrange, theme picker and media browser overlays |

A source ("card") is `{id, name, source?, connected?, url?, dlna?}`:
HDMI/TV cards carry the TV's `source` object (needed verbatim by `tvwindow.setSource`), stream cards `url`, server cards `dlna` (ContentDirectory control URL).

## Data flow

1. `refresh()` -> `setBusy(true)` -> `tizen.systeminfo.getPropertyValue("VIDEOSOURCE")` (4 s timeout) ->
   `populate(list)`. A minimum 0.9 s busy time makes the spinner visible. Refresh also cancels an old scan.
2. `populate()` builds `natural` -> `applyPrefs()` (order, hidden, keeps selection by id) -> `buildStrip()` -> `render()`.
3. `scanDlna()` runs after inputs load (see `features.md`), calling `populate(lastSources)` per server found.
4. `render()` sets `deck.dataset.theme` from `themeOf(card)`, updates title/detail/count, marks `.sel`, scrolls the
   strip, calls `drawCursor()`.
5. OK on a tile -> `open(card)`: DLNA card -> `openBrowser`; HDMI/TV -> switch input (see `features.md`); stream URL -> AVPlay.

## Input handling

One `document` `keydown` listener routes by mode, in priority order: theme picker -> Arrange -> media browser ->
(if playing) show Back button -> Back/Escape (exit app, or `stop()` when playing) -> main screen keys.
Every overlay and button blurs on focus (`onfocus = blur`) so only the virtual cursor shows selection.
Key codes: Back = 10009. `Enter` and arrows are handled manually with `preventDefault`.

## Key functions (see the module table above)

`themeOf/detectTheme/kindOf`, `buildStrip`, `drawCursor/focusSel/stepZone`, `render`, `applyPrefs/populate`,
`setBusy/refresh`, `move`, `open/stop/peekBack`, theme picker (`drawPicker/choosePicker/pickerKey`),
Arrange (`drawArrange/toggleHidden/moveInArrange/commitOrder/arrangeKey`), `playNative`, `probe/scanDlna/scanStatus`,
`soap/loadFolder/openBrowser/browserKey`.

## YouTube module (`js/youtube.js`)
`yt` state `{tokens, feed, loading, error, shown, inFeed, idx}`, `loginUi`. `ytLogin` (device flow), `ytAccessToken` (refresh), `ytApi`, `loadFeed`, `renderFeed`, `updateYoutubeUi` (called from `render`),
`playYoutube`. Zones are now `[tiles, ytlogin, theme, arrange, refresh]` (`ZONES`, `LAST_ZONE`); `ytlogin` is hidden unless the YouTube tile is selected. `yt.inFeed` is a mode on top of the zones.
