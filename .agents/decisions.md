# Decision log

Format: decision, reason, rejected alternatives. Newest at the bottom. Add an entry for every non-obvious choice.

## D1. Plain web app, packaged with the Tizen CLI
Single-purpose TV app, three static files. No bundler or framework. Rejected: React/Vite (adds build and weight, no need).

## D2. Inputs are auto-detected from the TV, names from the TV
`tizen.systeminfo VIDEOSOURCE` returns `connected` and `disconnected` arrays (not `supported`, which does not exist)
with `editName`. Early versions read only `connected`, which holds just `TV`, so HDMI ports vanished. Both groups are used.
The app no longer renames ports: the user maintains names in TV settings. Rejected: hardcoded console list and an
"Assign console" dialog (removed, replaced by per-source themes).

## D3. Virtual cursor, never DOM focus
Symptoms with native focus: outline one step behind the selection, OK acting on the wrong tile, two selections
(TV spatial navigation moved focus in addition to our handler), invisible native `<select>` dropdown that keeps eating
Left/Right. Fix: all selection is drawn with `.cur` from our own state; elements blur on focus; Enter is handled in JS;
pickers are custom list overlays. Rejected: relying on `preventDefault` on arrow keys (not enough on this TV), native select/dialog.

## D4. Full input switch via the TV viewer, not an in-app window
`tvwindow.show()` only draws the input inside our app (needs a permanent Back button). Found in the open-source
free-my-tv project: `tvwindow.setSource()` then `tizen.application.launch("org.tizen.tv-viewer")` makes the TV switch for real.
In-app `tvwindow.show()` remains as fallback only. The Back button auto-hides after 4 s in fallback mode.

## D5. Native TV player for media files
Playing DLNA files inside our AVPlay surface looked like an app. Hand off to `org.tizen.video-player-tv` via an app control
(`view`, file URL + mime). AVPlay in-app is the fallback. Network stream cards still use in-app AVPlay.

## D6. DLNA discovery by subnet probing, not SSDP
Web apps have no UDP/multicast. SSDP from a PC found the router (MiniDLNA, `192.168.50.1:8200`, "GatoShared") which proved
HTTP + SOAP works from the TV. The app probes `.1-.254` on a few known ports/paths. Limits: servers on unusual ports are
missed (add them in `sources.js` `dlna`). The first version hardcoded the router URL, the user wanted auto-detect.
Scan runs 16 parallel requests (40 lagged the remote), 1 s timeout, newest Refresh cancels the previous scan.
Scan status has its own element so other messages cannot erase it.

## D7. Themes: whole screen restyles per selected source
Per-source `data-theme` on `main`; tile shape/font fixed (see themes.md). Themes are user-assignable per source; PS5 and PS5
Pro collapse into one PlayStation theme, Switch and Switch 2 into one Nintendo Switch theme. Saved choices override detection
and survive restarts. Live TV and media servers are ordinary themeable sources (their original looks became options).

## D8. Performance rules (the TV is slow)
Removed: drifting background-position animations, scale/rotate/glow on focus, multi-layer gradients, slide-in transform.
Kept: static backgrounds and a 0.25 s opacity fade. Rule: if it repaints the full screen continuously, do not add it.

## D9. Preferences keyed by stable id
`HDMI-n`, `TV-1`, `dlna:<control>`, `stream:<url>`. Order stored as a full id list; unknown ids sort last in natural order,
so newly found sources append. Hidden sources stay in Arrange (dimmed) so they can be restored.

## D10. Layout is bottom-anchored
The Switch theme's thicker button border made the footer taller and pushed the tiles up (visible "jump"). Footer has a fixed
height and the title section flexes, so tile position is theme-independent.

## D11. Install workflow quirks
`.wgt` names with spaces fail to install silently. Copy to `SourceDeck.wgt`. Package outside `app/` (`-o build`) so old
packages are not bundled; packaging writes signature XML into `app/`, delete it after each build. `build/` is git-ignored.

## D12. Switch theme redone as Zelda-inspired Hyrule dusk
The user wanted a richer Switch look. Original SVG artwork was drawn in code (Triforce, mountains, pines, sword in pedestal, stars) instead of
sourcing images from the internet, to avoid copyright issues and keep it a small static layer (performance rule D8). Joy-Con red/blue survives only as thin edge lines.

## D13. GTA 6 theme: original Vice City-style art, no logos
Added `gta6` to `THEMES` (glyph "VI") with hand-drawn SVG (sun, skyline, palms, grid). No Rockstar logos or game artwork are used, only a generic neon-sunset style.

## D14. Two GTA 6 themes; key rename with migration
The first look became `gta6classic` (label "GTA 6 Retro"), and `gta6` now means the new screenshot-based look. `prefs.v` (set to 1) triggers a one-time
migration in `js/prefs.js` that turns saved `gta6` choices into `gta6classic`, so users keep the look they picked. Bump `prefs.v` for future key renames.

## D15. App tiles launch YouTube/Netflix; no in-deck recommendations
The user wanted personal recommendations from both apps. Neither exposes them to third-party apps (see features.md), so the deck only detects installed apps and
launches them; the apps' own home screens show the recommendations. Detection uses the app list rather than hardcoding tiles, so tiles appear only when installed.

## D16. YouTube feed via Data API v3 + device-flow login
The user asked for subscriptions and subscribed-channel videos on the YouTube tile. YouTube has no "subscription feed" endpoint, so the feed is built from `subscriptions.list` +
`playlistItems.list` on each channel's uploads playlist (`UU` + channel id minus `UC`), merged and sorted by date. Login uses the TV device flow (user enters a code on a phone).
Client id/secret live in a git-ignored `app/youtube-config.js`. Video playback is delegated to the TV's YouTube app because the YouTube embed does not play in the TV browser; deep-link support is unverified.

## D17. Channel selection filters in-deck, video deep link uses PAYLOAD
Opening a channel in the native YouTube app has no known deep link, so choosing a channel shows that channel's uploads in the deck's own video row instead. Videos use the Cobalt `PAYLOAD` format (D16 replaced the earlier guessed `view` + uri attempt, which did not open the video). If the TV changes the YouTube app id, update `YT_APP_IDS`.

## D19. App icon: fan of themed cards
The icon shows the idea of the app: a fan of four source cards (pink/purple, green, blue, red-gold, echoing the PS5/Xbox/Switch/GTA looks) behind a selected
dark card with a play triangle. Drawn as SVG in `design/icon.svg` (original artwork, no logos) and rendered to `app/icon.png` at 512x423, the size Samsung's launcher expects.

## D18. Split into ES modules, CSS files and HTML templates
`app.js` (about 940 lines) and the inline CSS in `index.html` were split: `js/` ES modules (one concern each, entry `main.js`), `css/` files (base, tiles, overlays, feed, fades, one per theme),
and `<template>`s for repeated elements. Native ES modules were chosen over concatenation to keep "no build step"; a throwaway test on the TV confirmed `<script type="module">`,
static `import` and `import.meta` work from the installed widget (`import.meta.url` is `file:///js/...`). Shared mutable state moved to one `state` object because
exported `let` bindings cannot be reassigned from other modules. The refactor was verified by hashing element geometry, classes and computed styles in 8 states
before and after (identical). Unused `dialog`/`select` CSS was dropped.

## D20. Icon is pre-stretched for the home tile (measured, not guessed)
A calibration image (`design/icon-test.svg`: circle, square, stripes, corner letters) installed on the TV and photographed showed: the Apps tab shows `icon.png` undistorted at 512x423, while the
home-screen row squeezes the whole image into a square-ish squircle tile (the yellow circle became an oval 0.83 as wide as tall = 423/512) and the squircle mask clips the corners.
Samsung's guide (https://developer.samsung.com/smarttv/design/app-icons-and-screenshots.html) asks for a 1920x1080 logo+background pair plus a 512x423 logo, but only in the store portal;
a sideloaded app gets the single `config.xml` icon (a second `<icon>` with 1920x1080 was tried and ignored).
So the artwork in `design/icon.svg` is drawn pre-stretched by 1/0.826 (scale 1.03 x 0.85) so it looks right on the home tile, and slightly wide on the Apps tab. Keep important content away from
the corners (squircle mask). To re-measure, render `icon-test.svg` into `app/icon.png`, reinstall and photograph the tile.

## D21. More app tiles with the same pattern
HBO Max, Prime Video, Apple TV and Apple Music were added to `APPS` (js/apps.js) with one theme file each. ids came from logging `getAppsInfo` on the TV (HBO Max is `5b8c3eb16b.BeamCTVDev`).
They only launch the apps (see D15); real ids are listed before `-dummy` placeholders.

## D22. Apple Music slide from free feeds only
Personal recommendations and the user's library need a paid Apple Developer key plus a MusicKit user token (no device-code login exists), so they were not built. The slide uses
the public iTunes feeds instead (charts, genre charts, lookup, search) and 30 s previews; "For you" is derived from the app's own play history. The newer `rss.applemarketingtools.com` charts were
tried first but are not callable from a browser page (no CORS after a redirect) and lack `previewUrl`, so charts use the classic `itunes.apple.com/<cc>/rss/...` feeds (CORS-friendly, same data).
The panel reuses the YouTube feed DOM and cursor state; `music.js` is hooked in from `render()` after `updateYoutubeUi`, and `keys.js` routes Enter to `musicEnter` while it is shown.
Search is the one place a native `<input>` takes focus (needed for the TV keyboard); everything else stays on the virtual cursor.

## D23. Music panel keeps a fixed height; empty state is not a child
The tab row jumped because the card row collapsed (loading text, empty "For you"). Cards now have a fixed height, the row has a min-height, loading uses skeleton cards, and the empty message is drawn with `#vids:empty::before`
so `vids.children.length` stays 0 and the cursor never selects it. `keys.js` lets Up enter the feed when the tab row exists even if there are no cards (this was why the tab row could not be focused after switching away from an empty "For you").

## D24. Apple Music: open full songs best-effort; search submit survives a hidden keyboard
Previews are 30 s; the full song needs Apple's own app. No deep link for Samsung's Apple Music app (`org.tizen.apple.apple-music`) is documented (searched), so `musicOpenFull()` tries `view`+web link, then `default`+PAYLOAD,
then a plain launch, and reports which was used. Unverified on the TV: update the attempts when the working format is known.
Search: with a plain `<input>` the TV keyboard's Done only hides the keyboard, so the old Enter-only handler could not submit. The overlay now has Search/Cancel targets on the virtual cursor and reacts to the keyboard's Done/Cancel
key codes, Up/Down and blur. `event.stopPropagation()` keeps those keys from also reaching the main key router after the overlay closes.

## D25. Apple Music deep link found by trial
Format 1 (view + web link) launched the app but not the song. `FORMATS` now lists 8 candidate app controls and the button cycles through them, reporting the number used, so the user can tell which one works.
Pin the winner with `appleMusicFormat` in `sources.js`, then simplify `musicOpenFull()` to that single format. Searches for documentation found nothing.

## D26. Music panel sized to fit 1080 px
With the open button row, 170 px cards and the larger feed, the Apple Music slide made the page 1127 px tall on a 1080 px screen, so the tiles and buttons sat 47 px lower than in every other theme.
Cards are now 150 px (220 px tall with text), the action row 44 px, the feed gap 10 px and bottom margin 36 px (`main.feedmusic` rules in css/feed.css). Verified in the preview at 1920x1080:
meta/title/strip/footer tops are 107/141/797/947 for both the PS and Apple Music slides, in loaded, skeleton and empty states. Rule: any panel added above the tiles must keep `#deck` at 100vh (measure `#deck` height and `#strip` top).
FORMATS for the Apple Music deep link grew to 16 (format 1-2 tried first, still unresolved).

## D27. Try the canonical link with a slug, and with no app id
The user suggested `https://music.apple.com/us/album/<album-name>/<albumId>?i=<songId>` launched via `view` with a null app id (the TV chooses the handler). Both were added as the first formats of the cycle (`slugLink`, `anyApp`).

## D28. No "any app" launches
Launching the web link with a null app id (TV picks the handler) opened the TV's web browser, not Apple Music, so those formats were removed. All formats name `org.tizen.apple.apple-music`.

## D29. Also try the `-dummy` Apple Music app id
Formats 19-20 repeat the two slug-link formats against `org.tizen.apple.apple-music-dummy` (`viaId`), since the detected real id may not be the one that handles links.

## D30. Apple Music deep link through the TV's remote-control service
launchAppControl formats did not open the song, so the user proposed the TV's own WebSocket API (`ed.apps.launch` + `DEEP_LINK`). `js/tvremote.js` connects to the TV's own IP (wss 8002, then ws 8001), reuses the token the TV returns after the one-time Allow prompt, and sends the launch message. These are formats 1-3 of the cycle; the numeric Apple Music id was also tried via launchAppControl (4-5). Outcome unknown until tested on the TV.

## D31. Apple Music opens the album (format 12 pinned)
On the TV, formats 11 and 12 (`default` operation + `PAYLOAD` = web link, plain or as `{"values": link}`) opened the album in the Apple Music app but not the specific song; the user accepted that. Format 12 is pinned with `appleMusicFormat: 12` in `sources.js`.
The remote-service formats (1-3) and the rest are unproven; once the user confirms format 12, prune `FORMATS` to the working one and remove the cycling/`am-format6` code.

## D32. Apple Music launch simplified to the one working format
After trial (D25-D31) only the `default` + `PAYLOAD` link formats (11, 12) opened anything useful (the album). Format 12 (`PAYLOAD` = `{"values": link}`) was kept; `FORMATS`, the cycling (`am-format*`), the `appleMusicFormat` pin, the `-dummy` ids and `js/tvremote.js` were deleted.
Also: when a preview ends and playback moves to the next track, `mu.audio.onended` moves `yt.idx` (the cursor) to it when the shown list is the queue (and scrolls it into view), so the open button's label and target stay current.

## D33. Media keys for Apple Music previews
The TV only delivers the remote's media keys to an app that registered them, so `registerMediaKeys()` registers MediaPlayPause/Play/Pause/Stop at start-up and `keys.js` routes them to `musicMediaKey` only when the Apple Music slide is shown (before the other handlers, so the cursor position does not matter).

## D34. Arrange list + Source list
The Arrange screen had grown too long (every app, server and port in one list). It is now two lists: the Arrange list (`prefs.added`, ordered, with hide/show kept) and the Source list (`state.pool`, everything else including all TV apps).
Rules from the user: new discoveries never enter the deck by themselves; every installed app is available; generic theme for apps without a curated look. Replaced `prefs.order` (a full ordering of everything) with `prefs.added` (membership + order); migrated once so the existing deck does not change.
`getAppsInfo` reports 243 launchable (`show:true`) apps on this TV, most of them Samsung internals, so apps are split into store/useful apps (default) and `system` apps (behind a toggle). Edit mode (OK on a row) is used because the remote has no spare key for move/hide/remove.

## D35. Apple Music Liquid Glass theme (light, static refraction art)
The user wanted an iOS-style Liquid Glass look from reference images (pearl white, glass vinyl, glass app icon with iridescent edges). Real refraction (`backdrop-filter: url(#displacement)`) is Chrome-only and expensive, so the glass objects are drawn once in an SVG (blurred coloured edge lobes, specular strokes, groove rings) and only a few small controls use live blur. Original artwork, not Apple's logo. The theme is selectable only (no auto-detection) so the existing red Apple Music theme stays the default.

## D36. Liquid Glass lens is live, not baked
Following the user's pointer to liquidglass.dev, the glass app icon became a live element (`#glassLens`) that refracts the vinyl behind it with a generated displacement map (see themes.md). It uses `backdrop-filter: url(#...)` because the TV's browser is Chromium; the library's own default (`filter:` on a copy of the element) was not needed. The code was re-implemented (MIT library read for the optics), not copied.

## D37. Glass on everything, tiered for the TV
The user wanted liquid glass on buttons, music cards and everything, with a background that shows the refraction. Backdrop refraction is used for translucent controls, own-pixel refraction (`filter:`) for opaque cards/tiles, both from the same generated map. To limit cost: on-screen elements only, one filter per size, chroma only on the cursor/playing element, and a `glass` setting (`all`/`controls`/`lens`) in sources.js. Whether the S95C stays smooth with ~35 filtered elements is unverified: check on the TV and drop to `controls` or `lens` if it lags.

## D38. Glass default lowered to "focus"
The user reported heavy lag with the `all` level (D37). Default became `focus` (cursor item + playing card + lens live, the rest CSS-only). Rule of thumb for this TV: keep live SVG/backdrop filters to a handful; never apply them to whole lists.

## D39. Full-quality glass with a floating focus ring
The user proposed: keep high-quality reflections but redraw only on scroll/content change, not on focus. Cause of the redraws: the cursor changed each element's outline/border/opacity, which repainted it and re-ran its SVG filter. Fix: in the glass theme the cursor never styles elements; a single `#focusRing` div follows it. Default `glass` is back to `"quality"` (all visible elements, 3-pass). If the TV still lags on scroll jumps, set `glass: "focus"` or `"lens"`. Also removed the fade mask from `#subs` (backdrop root).

## D40. Remaining focus lag: unconditional DOM writes; liquid focus bubble; shadows
After D39 the TV still lagged on plain focus moves. Cause found by logging DOM mutations: every cursor move rewrote the "Open in Apple Music" text, the `data-lg` attribute of ~35 glass elements and the fade CSS variables of three rows, each of which repaints and re-runs SVG filters. All writes are now conditional. The blue/white outline ring was replaced by a glass bubble that glides and refracts. Clipped shadows fixed with padded rows (negative margins keep the layout).

## D41. No glass on music cards and thumbnails
On request the own-pixel refraction was removed from `.vid` cards and `.tile` thumbnails (they stay plain with their CSS tint/shadow); glass remains on buttons, chips, the focus bubble and the big lens. The extra text padding added for the bent rim was reverted. This also removes about 15 live filters.

## D42. Liquid look for the overlay screens
Change theme and the media-server browser (and Arrange, search, login for consistency) get the glass background, rows and focus bubble in the glass theme. Only the single bubble is a live filter; rows are CSS-only so a 300-item folder stays cheap.

## D43. Overlay lag: bubble area
The overlay lists were full-width, so the focus bubble was ~1700x67 px and its live displacement filter (re-run every frame while it glides) cost about 8x more than on the main screen. Glass-theme lists are now max 760 px wide (Arrange columns 1300 px max) and bubbles over 40,000 px² use the single-pass filter (no colour fringe). Rule: a live filter's cost scales with its area, keep bubbles small.

## D44. Page is exactly one screen tall
On the TV the Apple Music slides' tiles and buttons sat a few pixels lower than on other slides. The music panel left only ~17 px of slack, and the TV's fonts are slightly taller than the desktop preview's, so `main` (which had `min-height:100vh`) grew past the screen and pushed everything down (reproduced with `line-height:1.45`: +8 px). `main` is now `height:100vh` and header/feed/strip/footer are `flex-shrink:0`, so only the title area absorbs extra height. Measured tile/footer tops stay 807/947 on all slides for line-heights up to 1.7.

## D45. QR code on the YouTube login screen
The login screen shows the device code and a QR code. The QR encodes Google's device URL plus `?user_code=` (undocumented pre-fill; harmless if ignored). It uses the MIT-licensed single-file `qrcode-generator` (downloaded from the jsDelivr npm mirror, bundled in `app/vendor/`, no network use at runtime) instead of hand-writing a QR encoder. Verified: the generated matrix decodes to the exact URL with Chrome's BarcodeDetector.

## D46. Privacy policy and the rule to keep it in sync
Google requires a privacy policy URL to publish the OAuth consent screen, so `PRIVACY.md` was added (linked from the Branding page; the logo is left empty to avoid mandatory verification). To stop it going stale, `AGENTS.md` rule 10 and `.agents/privacy.md` list the data inventory, the external hosts and a checklist that must be followed whenever data handling changes.

## D47. Up from the footer goes straight to the tiles
The footer buttons used to be stepped through with Up/Down like a column, so Up from "Refresh" moved to "Arrange" first. They are a horizontal row: Up from any button now returns to the thumbnails at once, Down from the thumbnails lands on the first usable button.

## D48. One deploy script, one package
Builds produced two files (`Source Deck.wgt` and a copy `SourceDeck.wgt`) because the installer cannot take a name with a space and `tizen package` cannot rename its output. `scripts/deploy.sh` packages, moves the file to `SourceDeck.wgt` and installs/launches it, so `build/` holds a single package and the long command sequences are no longer repeated by hand.

## D49. Background pictures: several sources, stored locally, deleted when unused
"Change background" works on every theme and takes pictures from Unsplash and Pexels (search by text, free API keys in the git-ignored `backgrounds-config.js`), from the router's media server (UPnP image browse) and from a USB drive (Tizen filesystem API). Chosen pictures are downloaded once, shrunk to 1920x1080 JPEG (the TV's decoder and memory are small) and kept in IndexedDB; `gc()` deletes every picture no source references, so storage stays small. Rejected: hot-linking the remote URLs (slow, needs internet every time, no credit/download tracking for Unsplash) and localStorage (too small, text only). The Apple Music search overlay was generalised into `textprompt.js` so the background searches reuse the TV-keyboard handling. "All sources" clears per-source pictures so the label is true. Bug fixed on the way: `applyBackground` treated "no picture" and "unknown" as the same (`null`), so Remove did not redraw.

## D50. Background screen: live preview drawer, None dimming (palette superseded by D51)
The background screens used each theme's `--accent`/`--ink`, which gave unreadable focused rows on some themes (and the glass theme had its own variant). They now use one fixed dark palette (`css/background.css`, no theme overrides, no glass bubble) so focus is identical everywhere. In the menu view the overlay is transparent except a left panel, so changing "Dimming" or "Apply to" is visible immediately; "Apply to" re-assigns the current picture instead of only changing the next pick, and the menu reads the real scope when it opens. Dimming gained "None"; `prefs.bg.dv` migrates old stored dim indexes.

## D51. Background drawer follows the theme, with guaranteed contrast
The fixed dark palette of D50 fixed legibility but looked foreign. The drawer and grid now use the theme's own button variables (shape, border, font, case) and four explicit per-theme colours (`--dr-*`, see `themes.md`) so text and focus are readable on every theme, instead of reusing `--accent`/`--ink` (which had poor contrast on some themes). Bug found on the way: a hidden menu list kept a `.cur` that the glass ring found first; lists/grids are now emptied when the other view is shown.

## D52. Wallhaven replaces Pexels
Pexels stopped issuing new API keys ("paused"), so it cannot be used. Wallhaven's public search API needs no key for safe-for-work pictures (`purity=100`, `categories=100`, `atleast=1920x1080`, `ratios=16x9`), returns full-size files and thumbnails, and is wallpaper-oriented, so it suits the feature better. Limits: about 45 requests/minute without a key; no photographer name in search results (the credit says "Wallpaper from Wallhaven"); pictures are user uploads, so licensing is for personal use only (the app never redistributes them). Pixabay (needs a free key, 1280 px images) was the other candidate. `PRIVACY.md` lists the Wallhaven hosts.
