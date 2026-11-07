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
