# Features and behaviour

## Source list
- Built from the TV's `VIDEOSOURCE`: type `TV` (Live TV) and `HDMI` entries, from both `connected` and `disconnected`
  groups (unplugged ports are still listed; signal info is not available, `signal` is null).
- Names come from the TV (`editName`, e.g. "PS5", "Switch" set in TV settings). Fallback `HDMI n`. Live TV is "Live TV".
- Default order: Live TV, HDMI 1..4, streams from `sources.js`, DLNA servers.

## Opening a source (OK)
- **HDMI / Live TV: full switch.** `tizen.tvwindow.setSource(source, ..., "MAIN")`, then
  `tizen.application.launch("org.tizen.tv-viewer")` so the TV's own viewer takes the screen. The app UI resets for
  when the user returns. If the viewer cannot be launched, fall back to `tvwindow.show()` full-screen inside the
  app with a Back button that hides after 4 s (any key shows it again; remote Back always returns).
- **Network stream (`url`)**: Samsung AVPlay inside the app (`webapis.avplay`), Back returns.
- **DLNA server**: opens the media browser (below).

## Media servers (DLNA / UPnP)
- Web apps cannot send SSDP multicast, so `scanDlna()` probes the TV's own /24 (IP from `webapis.network.getIp()`)
  with HTTP GETs of known description URLs: ports/paths in `PROBES` (8200 `/rootDesc.xml`, 50001
  `/desc/device.xml`, 32469, 49152, 5001, 9000). A response containing `MediaServer` + a ContentDirectory service
  becomes a card (`id = "dlna:" + controlURL`). 16 requests at a time, 1 s timeout.
- Scan status has its own line (`#scan`) with spinner and percent, separate from `#status`. Each Refresh cancels the
  previous scan (`scanRun`) and starts a new one. Result line: "Media servers found: N" or "No media servers found on x.y.z.x".
- Servers can also be forced via `dlna: [{name, control}]` in `sources.js`.
- Browser overlay: `soap()` does UPnP `Browse` (BrowseDirectChildren, up to 300 items). Folders first, then files;
  only items whose `res` protocolInfo is audio/video are shown (images skipped). Up/Down move, OK opens folder or plays,
  Left/Back goes up a level, Back at root closes.
- Playing a file calls `playNative()`: `tizen.application.launchAppControl` (operation `view`, uri = file URL, mime from
  protocolInfo) to the TV's native player `org.tizen.video-player-tv`, then `org.tizen.mycontent-video-player-tv`. If both
  fail, falls back to AVPlay inside the app.

## Change theme
- Footer button "Change theme" opens a full-screen list (`#themeView`) for the selected source: "Auto (<detected>)" plus
  every theme in `THEMES`. A filled dot marks the current choice. Up/Down move, OK applies and closes, Back/Left cancel.
- Choice saved in `prefs.theme[id]`; "Auto" deletes the entry so detection applies again. Works for every source
  including Live TV and media servers.
- Auto detection (`detectTheme`): `url`/`dlna` -> `stream`; type TV -> `tv`; name matches `playstation|ps<digit>` -> `ps`
  (so PS5 and PS5 Pro are one theme); `switch|nintendo` -> `switch` (Switch and Switch 2 are one theme); `xbox` -> `xbox`;
  else `default`. A saved choice always wins over detection.

## Arrange (show/hide + reorder)
- Footer "Arrange" opens `#arrangeView` listing every source including hidden ones (dimmed, "hidden").
- OK toggles show/hide (`prefs.hidden`), Left moves the item up, Right moves it down (`prefs.order`, full id list),
  Back saves and closes. New sources not in `prefs.order` are appended at the end in default order.
- If every source is hidden the title shows "All sources hidden" and the detail line points to Arrange.

## Refresh
- Button turns into a spinner "Scanning…" for at least 0.9 s, status "Scanning for inputs…", then runs the DLNA scan.

## Main-screen navigation
Left/Right: previous/next tile (wraps). Down from tiles: Change theme -> Arrange -> Refresh; Up goes back. Left/Right
between footer buttons cycle them. OK activates the cursor. Back exits the app.

## Persistence
Only `localStorage["deck-prefs"]` (theme, hidden, order). Discovered servers are not stored and reappear after each scan.
