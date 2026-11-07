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
