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
- **YouTube login + feed** (only on the YouTube tile): footer gets a first button "Log in" (becomes "Log out"). Log in shows the code AND a QR code on the right (QR = `https://www.google.com/device?user_code=<code>`; the code is also on screen, in case the page does not pre-fill it). Google OAuth device flow, needs `app/youtube-config.js`, see `youtube-setup.md`. The QR is drawn as inline SVG by `drawQr()` in youtube.js using `app/vendor/qrcode.js`.
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
  **Remote media keys:** while the Apple Music slide is shown (cursor anywhere: tiles, feed or buttons), the remote's Play/Pause (10252) toggles the current preview, or starts the song under the card cursor if nothing plays;
  Play (415) resumes/starts, Pause (19) pauses, Stop (413) stops. They are registered with `tizen.tvinputdevice.registerKey` (privilege `tv.inputdevice`) in `main.js`; handled in `keys.js` via `musicMediaKey`. Ignored on other slides.
  **Colours:** the playing card has a pink-red (`#ff375f`) border and tint; the card under the cursor is white (white wins when both). Cursor rows: tabs -> cards -> open button.
  **Search overlay:** the box, a Search button and a Cancel button, drawn with the virtual cursor. OK on the box opens the TV keyboard; Done (keyCode 65376) searches immediately; Cancel (65385), Up/Down or a blur
  close the keyboard and move the cursor to Search, where OK runs the search. (The keyboard may hide without blurring the box, hence the key handlers.)
  Loading shows nine pulsing skeleton cards (no "Loading…" text). The card row keeps one card's height (`main.feedmusic #vids{min-height}`) and the empty-state text is a CSS `::before` of the empty row
  (`data-empty`), so the tab row never moves between loading, empty and loaded. Up from the tiles enters the feed even when there are no cards (cursor lands on the tab row).
- Add another app: append `{key, name, theme, ids}` to `APPS` (find ids by logging `getAppsInfo`, see `tv-platform-notes.md`) and optionally a theme.

## Change theme
- The screen has **two lists**: Themes (left) and Accent color (right). The right list shows the accents of the *highlighted* theme (a note "This theme has no accent colors." when it has none). OK on a theme applies it (the saved accent stays); **Right** moves to the accents (only if the theme has some), OK there applies the theme **and** the accent; Left returns, Back cancels. A radio dot and a colour swatch mark the current accent. Today only **Home** has accents: Blue (default), Purple, Pink, Red, Orange, Yellow, Green, Teal, Graphite. The choice is saved per source in `prefs.accent[cardId]` (the theme's first accent = default = nothing saved).
- Footer button "Change theme" opens a full-screen list (`#themeView`) for the selected source: "Auto (<detected>)" plus
  every theme in `THEMES`. A filled dot marks the current choice. Up/Down move, OK applies and closes, Back/Left cancel.
- Choice saved in `prefs.theme[id]`; "Auto" deletes the entry so detection applies again. Works for every source
  including Live TV and media servers.
- Auto detection (`detectTheme`): `url`/`dlna` -> `stream`; type TV -> `tv`; name matches `playstation|ps<digit>` -> `ps`
  (so PS5 and PS5 Pro are one theme); `switch|nintendo` -> `switch` (Switch and Switch 2 are one theme); `xbox` -> `xbox`;
  else `default`. A saved choice always wins over detection.

## Change background
- Footer button "Change background" (next to "Change theme"; works on every theme) opens `#bgView`. Rows: Search Unsplash, Search Wallhaven wallpapers (a text prompt, empty = top list; safe-for-work, 16:9, at least 1920x1080, no key), Pictures from the router (browse folders, images only), Pictures from a USB drive, "Apply to: This source only / All sources", "Dimming: None / Light / Medium / Strong", Remove the background.
- In the menu only a left panel is drawn; the slide stays visible behind it, so "Apply to" and "Dimming" take effect at once and you see the result. "Apply to" moves the picture now in effect (to all sources, or to this source only: the other sources then lose it); with no picture it only sets the target for the next pick. The drawer and the picture grid take the current theme's look (button shape, border, font, case, accent). Readability is guaranteed by four per-theme variables defined in each theme file: `--dr-bg` (drawer), `--dr-ink` (text), `--dr-focus-bg` / `--dr-focus-ink` (focused row or folder; also the focused picture's outline). Liquid Glass keeps its floating bubble on the menu rows, but not on the picture grid (it would blur the picture).
- Choosing a picture downloads it, shrinks it to <=1920x1080 JPEG and stores it in IndexedDB. A picture is kept only while some source uses it or it is starred: replacing or removing it deletes the file (`gc()`). "All sources" replaces every per-source picture; a per-source picture wins over the all-sources one.
- The picture is drawn behind the content with a dark scrim (dimming level); Unsplash shows "Photo by X on Unsplash" and Wallhaven "Wallpaper from Wallhaven" as a small credit above the thumbnails.
- Unsplash needs a free API key in `app/backgrounds-config.js` (git-ignored; see `backgrounds-setup.md`); without it that row says so. Wallhaven needs none. Router pictures need a media server found by the scan; USB needs a drive plugged in (unverified on the TV).
- **Starred backgrounds**: in a picture grid, OK on a picture opens a small sheet (Use as background / Add to starred or Remove from starred; starred pictures show a ★ badge). The menu row "★ Starred backgrounds · N" opens the grid of starred pictures (newest first; same sheet), and "☆ Star this background" / "★ Remove the star from this background" stars the picture now in effect. A starred picture survives "Remove the background" and replacing it, so it can be applied again from the Starred grid without downloading; removing the star deletes the stored file unless a source still uses it. Starred pictures live in IndexedDB (`starred`, `starredAt`, and a 480x270 `thumb`), there is no limit on their number.
- Saved in `prefs.bg = {map: {sourceId: key}, all, dim, scope}`; keys are `unsplash:<id>`, `wallhaven:<id>`, `router:<url>`, `usb:<path>`.

## Arrange (two lists)
- Footer "Arrange" opens a screen with two columns:
  - **Arrange list** (left) = the sources shown in the deck, in order (`prefs.added`). Navigation: Up/Down choose, **OK** enters edit mode for the row; in edit mode Up/Down **move** it, OK **hides/shows** it (hidden rows stay in
    the list, dimmed), Left **removes** it (it goes back to the Source list), Back/Right leave edit mode. Right (outside edit mode) switches to the Source list.
  - **Source list** (right) = every known source that is not in the Arrange list: unused HDMI/Live TV, streams, media servers, curated apps and **all apps found on the TV**. OK **adds** the row to the end of the Arrange list; Left goes back.
    First row "Show system apps (N)" toggles the Samsung system/service apps (session only); store apps (ids like `FyObqYlHVG.SWEETTV`) and a few useful built-ins (Internet, SmartThings...) are listed by default.
- New apps, servers or ports found later go to the Source list only; nothing is added to the deck automatically. Generic apps (not in the curated `APPS`) use the generic theme and launch with `tizen.application.launch`.
- One-time migration (`migrateToArrangeList` in render.js): everything the deck showed before (old `prefs.order` plus every non-generic source) becomes the Arrange list, then `prefs.order` is dropped and `prefs.v = 2`.
- If every source is hidden the title shows "All sources hidden" and the detail line points to Arrange.

## Home slide and widgets
- **Home** is a built-in slide (card id `home`, theme `home`, tile glyph ⌂). It is put at the front of the Arrange list once (`prefs.homeSeeded`); the user can move or remove it (it then waits in the Source list). It starts with a Clock, the Date and a Weather widget (no city yet). OK on the Home tile opens the widget editor.
- **Widgets** are small panels on a 12 x 6 grid (an absolute layer between the header and the thumbnails, `#widgets`, so tiles and footer never move). Every slide can have its own widgets (`prefs.widgets[cardId]`) except the ones that draw a feed: YouTube and Apple Music (`allowsWidgets` in widgets.js). The footer button **Widgets** (hidden on those slides) opens the editor.
- **Editor** (drawer, like Change background): "＋ Add widget" (a type; placed at the first free spot, right side first) and one row per widget. OK on a widget: **Move** (arrows, 1 cell; the drawer hides), **Resize** (←→ width, ↑↓ height), options (OK cycles the value), **City** (Weather: text prompt, then a list of matches), **Remove widget**. Widgets cannot overlap or leave the grid. The widget under the cursor is outlined on the slide.
- **Options**: every widget has *Card* (Panel = translucent panel in the theme colours, None, Accent). Clock: Time format (Auto/24-hour/12-hour), Seconds. Date: Long/Short/Numeric. Weather: Units (Auto/Celsius/Fahrenheit; Auto = Fahrenheit for en-US), Details (feels like, high/low, wind), City. Text scales with the widget size (container units).
- **Weather** comes from Open-Meteo (no key): geocoding for the city search, forecast for the conditions; cached 20 min; shows "…" while loading. Times and dates use the app language (`Intl`) and the TV's clock.
- **More widgets** (`js/wtypes/`): **Inputs** (HDMI ports with name and Connected/No signal; option Show all / connected only; while the widget is on screen the TV's VIDEOSOURCE is re-read every 3 s, so a console switched on or off shows without a rescan - the TV must report the signal itself, which is unverified), **News** (headlines of an RSS/Atom feed: presets BBC, DW, Al Jazeera, NPR, The Verge, Ars Technica, Hacker News, NASA; gaming: PlayStation Blog and Xbox Wire (official), Nintendo Life, Push Square, Pure Xbox, IGN, GameSpot, Eurogamer, PC Gamer, Kotaku, Video Games Chronicle; Ukrainian: Українська правда, Суспільне, Європейська правда; or a typed address; refresh 15 min; pages through headlines every 12 s when not all fit), **Currency** (ExchangeRate-API: From + amount + up to 3 target currencies from 18; refresh 1 h; attribution line shown), **Sports scores** (ESPN public scoreboard JSON for a league: 11 football leagues, NBA, NFL, NHL, MLB; live first, then upcoming, then finished; optional team filter; refresh 2 min while a match is live, else 10). Ukrainian Premier League is not available from ESPN. ESPN's endpoint is unofficial and could change.
- **News cards** (interactive widget, `wtypes/newscards.js`): the same sources and custom address as News, shown as cards with the item's picture when the feed has one (`media:content`, `media:thumbnail`, an image enclosure, or the first `<img>` in the item text; option Images On/Off; pictures only from height 3 cells up). One card per 3 grid columns. **Up** from the thumbnails puts the cursor on the first interactive widget of the slide (outline + a hint bar at the bottom), **Left/Right** choose a card (the row scrolls), **OK** opens the article in the TV browser (`openUrl`; unverified on the TV), **Up/Down** move to another interactive widget (Down from the last one returns to the thumbnails), **Back** leaves. A widget type becomes interactive with `interactive: true`, `hint`, and `key(el, w, event)`; the focus state is `wf` in state.js and the routing is `widgetFocusKey` (widgets.js, called first by keys.js).
- In the editor's widget view, **OK or ←→** changes a choice option's value (Left no longer goes back on those rows; Back does); **text options** (feed address, team filter) open the TV keyboard prompt (Save).
- Adding a widget type: one entry in `TYPES` (widgets.js) + CSS in `css/widgets.css` + the strings through `t()`/`T()`.

## Settings (gear button) and languages
- A gear icon button ends the footer row, right-aligned (the only icon-only button). OK opens a drawer like "Change background" with two rows: **Language** and **About the developer**.
- **Language**: "System language (<name>)" plus English, Ukrainian, Spanish, French, German, Italian, Portuguese, Polish, Dutch, Czech, Swedish, Turkish, Japanese, Korean, Simplified Chinese (native names; no Russian, no right-to-left languages). "System" follows `navigator.language` (the TV's menu language); if it is not in the list (or is Traditional Chinese) the app falls back to English. The choice is saved in `prefs.lang` (`"system"` by default) and applies at once (static texts via `applyStatic`, cards via `populate`, everything else on redraw).
- **About the developer**: name, bio, a button that opens https://www.linkedin.com/in/gatopresto and a QR code for the same address. The button asks Tizen to `view` the URL (first with no app id so the system picks a handler, then the Samsung browser `org.tizen.browser`); if both fail the screen tells the user to scan the QR. Samsung TVs have no LinkedIn app, so in practice it opens the TV browser (not yet verified on the TV).
- Rule: every user-visible string goes through `t("English text")` (or `T()` for constants) and gets a translation in every `js/lang/*.js`; run `node scripts/check-i18n.mjs` (it lists missing/unused keys and mismatched `{placeholders}`). Brand names, music genre names and developer-only setup messages stay English.

## Rescan sources
The footer button formerly called Refresh. It re-reads the TV's inputs (HDMI ports, Live TV), re-detects installed apps and rescans the network for media servers (busy label "Scanning…").
- Button turns into a spinner "Scanning…" for at least 0.9 s, status "Scanning for inputs…", then runs the DLNA scan.

## Main-screen navigation
Left/Right: previous/next tile (wraps). The footer buttons are one row: Down from the tiles lands on the first button, Left/Right move (and wrap) between buttons, and Up from any button goes straight back to the tiles. OK activates the cursor. Back exits the app.

## Persistence
`localStorage["deck-prefs"]` (theme, hidden, order, background choices) and, for background pictures, IndexedDB `deck-bg`. Discovered servers are not stored and reappear after each scan.
