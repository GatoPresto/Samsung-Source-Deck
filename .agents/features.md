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
- Scan status has its own line (`#scan`, in the header under the "n / m" count, right-aligned) with spinner and percent, separate from `#status`. Each Refresh cancels the
  previous scan (`scanRun`) and starts a new one. Result line: "Media servers found: N" or "No media servers found on x.y.z.x".
- Servers can also be forced via `dlna: [{name, control}]` in `sources.js`.
- Browser overlay: `soap()` does UPnP `Browse` (BrowseDirectChildren, up to 300 items). Folders first, then files;
  only items whose `res` protocolInfo is audio/video are shown (images skipped). Up/Down move, OK opens folder or plays,
  Left/Back goes up a level, Back at root closes.
- Playing a file calls `playNative()`: `tizen.application.launchAppControl` (operation `view`, uri = file URL, mime from
  protocolInfo) to the TV's native player `org.tizen.video-player-tv`, then `org.tizen.mycontent-video-player-tv`. If both
  fail, falls back to AVPlay inside the app.

## Streaming apps (YouTube, Netflix, HBO Max, Prime Video, Apple TV, Apple Music)
- `APPS` in `js/apps.js` lists known apps with candidate package ids (YouTube `9Ur5IzDKqV.TizenYouTube` / `com.samsung.tv.cobalt-yt`, Netflix `org.tizen.netflix-app`).
  `detectApps()` calls `tizen.application.getAppsInfo` (privilege `application.info`) and adds a tile only for apps installed on the TV
  (`id = "app:<key>"`, themes `youtube` / `netflix`). OK launches the app with `tizen.application.launch`.
- **Recommendations are not shown by the deck.** YouTube and Netflix expose no API for personal home-feed recommendations (Netflix has no public API,
  YouTube's Data API dropped the recommendations feed and needs OAuth). The app's own screen, which opens on OK, shows them.
- **YouTube login + feed** (only on the YouTube tile): footer gets a first button "Log in" (becomes "Log out"). Log in shows a code and google.com/device (Google OAuth device flow, needs `app/youtube-config.js`, see `youtube-setup.md`).
  After login a panel appears above the tiles: avatars of your subscribed channels (up to 50) and a row of recent videos from up to 15 subscribed channels (newest first, 3 each,
  via each channel's uploads playlist `UU…`). Cached 10 min in `localStorage`. Up from the tiles enters the video row, Left/Right move, OK opens the video in the TV's YouTube app
  (`launchAppControl` operation `default`, no uri, extra data `PAYLOAD` = `#watch?v=ID&launch=launcher`, tried on `com.samsung.tv.cobalt-yt` then `9Ur5IzDKqV.TizenYouTube`;
  format from flutter-tizen's example, success callback does not prove the video started). Up again from the videos reaches the channel row ("All" + avatars): OK on a channel (the cursor stays on the channel row) loads
  its latest 24 uploads into the video row ("All" restores the mixed feed). Down or Back steps back out to the tiles.
- **Apple Music panel** (only on the Apple Music tile, `js/music.js`): built from Apple's free public feeds, no developer account or login. Up from the tiles enters the panel:
  top row = tab chips (For you, Top songs, Top albums, Search, then genre charts Pop...Classical), below = square-artwork cards.
  Songs: OK plays a 30-second preview (HTML5 `Audio`), OK again pauses, it auto-advances through the list; the status line shows what is playing. Albums: OK lists the album's tracks
  (choose any tab to go back). Search: the chip opens an overlay with a text input (TV on-screen keyboard), Enter searches, Back cancels. Charts use `itunes.apple.com/<cc>/rss/topsongs|topalbums[/genre=N]`
  (country from `sources.js` `musicCountry`, else the TV locale, else US), song details/previews come from `itunes.apple.com/lookup`. "For you" = more top songs by the artists played most recently in this app
  (history kept in `localStorage["music-history"]`, 60 items), so it is not Apple's personal recommendations (those need the paid developer account + user login). Full songs cannot be played (DRM).
  OK on the tile itself still launches the real Apple Music app.
  **Open full song:** Down from the card row reaches an "Open “<title>” in Apple Music" button (always reserved under the cards; its label follows the card under the cursor, and the cursor follows
  the song when a preview auto-advances to the next track). OK launches the TV's Apple Music app with `launchAppControl`: operation `default`, no uri, data `PAYLOAD` = `{"values":"https://music.apple.com/<cc>/album/<albumId>?i=<trackId>"}`.
  Found by trial on the TV: this opens the song's **album** in the app, not the individual song (Samsung's app has no documented deep link and ignores the `?i=` part). Albums open their own page.
  **Colours:** the playing card has a pink-red (`#ff375f`) border and tint; the card under the cursor is white (white wins when both). Cursor rows: tabs -> cards -> open button.
  **Search overlay:** the box, a Search button and a Cancel button, drawn with the virtual cursor. OK on the box opens the TV keyboard; Done (keyCode 65376) searches immediately; Cancel (65385), Up/Down or a blur
  close the keyboard and move the cursor to Search, where OK runs the search. (The keyboard may hide without blurring the box, hence the key handlers.)
  Loading shows nine pulsing skeleton cards (no "Loading…" text). The card row keeps one card's height (`main.feedmusic #vids{min-height}`) and the empty-state text is a CSS `::before` of the empty row
  (`data-empty`), so the tab row never moves between loading, empty and loaded. Up from the tiles enters the feed even when there are no cards (cursor lands on the tab row).
- Add another app: append `{key, name, theme, ids}` to `APPS` (find ids by logging `getAppsInfo`, see `tv-platform-notes.md`) and optionally a theme.

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
