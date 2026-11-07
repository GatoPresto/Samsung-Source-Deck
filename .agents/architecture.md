# Architecture

## Files

```
AGENTS.md                 entry point for agents
README.md                 user-facing setup (outdated, see AGENTS.md "Known gaps")
.gitignore                build/, .DS_Store, packaging temp files
.agents/                  project memory (this folder)
app/                      the Tizen web app (this folder is what gets packaged)
  config.xml              widget manifest, app id, privileges
  index.html              markup + ALL CSS (themes included)
  sources.js              optional user config (window.sourceDeck: dlna[], streams[])
  app.js                  all logic, one script, no modules
build/                    generated .wgt packages (git-ignored)
```

- App id `SrcDeck001.SourceDeck`, package `SrcDeck001`, profile `tv-samsung`, `required_version` 7.0.
- Privileges in `config.xml`: `tv.window`, `internet`, `systeminfo`, `application.launch`,
  `developer.samsung.com/privilege/network.public` (for `webapis.network.getIp()`), plus `<access origin="*">` so
  XHR to LAN servers is allowed.
- `index.html` loads `$WEBAPIS/webapis/webapis.js` (resolved on the TV, a 404 in a desktop browser is expected),
  then `sources.js`, then `app.js`.

## Screen structure (`index.html`)

`<main id="deck" data-theme data-card>` is a flex column:
header (title + count) -> `section` (meta, title `h1`, detail, `#status`, `#scan`) -> overlays (`#browser`,
`#arrangeView`, `#themeView`, absolute, full-screen, inside `main` so they inherit theme variables) ->
`#strip` (thumbnail tiles) -> `footer.nav` (Change theme, Arrange, Refresh).
Outside `main`: `<object id="surface">` (AVPlay target) and `#back` (Back to sources button).

## State in `app.js`

| Variable | Meaning |
|---|---|
| `natural` | all known sources in default order (TV, HDMI by number, streams, DLNA) |
| `allCards` | `natural` sorted by `prefs.order` (includes hidden) |
| `cards` | `allCards` minus hidden. This is what the strip shows |
| `index` | selected index into `cards` |
| `zone` | virtual cursor zone: 0 tiles, 1 Change theme, 2 Arrange, 3 Refresh |
| `active` | the card currently open (HDMI/stream); `null` on the picker |
| `prefs` | `{theme:{id:key}, hidden:{id:true}, order:[id]}`, persisted in `localStorage["deck-prefs"]` |
| `dlnaFound` | DLNA servers found by scan (kept for the session), plus any from `sources.js` |
| `lastSources` | last `VIDEOSOURCE` list, lets scan results re-run `populate` |
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

## Key functions (`app/app.js`)

`themeOf/detectTheme/kindOf`, `buildStrip`, `drawCursor/focusSel/stepZone`, `render`, `applyPrefs/populate`,
`setBusy/refresh`, `move`, `open/stop/peekBack`, theme picker (`drawPicker/choosePicker/pickerKey`),
Arrange (`drawArrange/toggleHidden/moveInArrange/commitOrder/arrangeKey`), `playNative`, `probe/scanDlna/scanStatus`,
`soap/loadFolder/openBrowser/browserKey`.
