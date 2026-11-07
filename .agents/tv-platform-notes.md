# Samsung / Tizen platform notes (learned on the real TV)

Device: QE77S95CAUXUA, platform 9.0, Chromium 120 (`TV Safari`). Developer Mode must be On with Host PC IP = the
computer's LAN IP (otherwise `sdb connect` is refused although port 26101 is open).

## APIs that work
- `tizen.systeminfo.getPropertyValue("VIDEOSOURCE")` -> `{connected:[{type,number,signal,editName}], disconnected:[...]}`.
  Needs `systeminfo` privilege. First call takes ~1 s. `connected` usually holds only `{type:"TV"}`. HDMI ports are in `disconnected`.
- `tizen.tvwindow.setSource(sourceObj, ok, err, "MAIN")` needs the **exact object** from `VIDEOSOURCE`. A plain
  `{type, number}` fails with "Cannot convert [object Object] to SystemInfoVideoSourceInfo".
- `tizen.application.launch("org.tizen.tv-viewer")` after `setSource` gives a true source switch.
- `tizen.application.launchAppControl(new tizen.ApplicationControl("http://tizen.org/appcontrol/operation/view", url, mime, null, null), "org.tizen.video-player-tv", ...)` opens the native player for a media URL.
- `webapis.network.getIp()` / `getGateway()` need `network.public` privilege.
- XHR (GET/POST SOAP) to LAN hosts works with `<access origin="*" subdomains="true"/>`.
- `webapis.avplay` for in-app streams (`<object type="application/avplayer">`).
- `tizen.application.getAppsInfo` lists ~540 apps (needs `application.info`, was only used for discovery).
  Useful ids: `org.tizen.tv-viewer`, `org.tizen.video-player-tv`, `org.tizen.mycontent-video-player-tv`, `org.tizen.photo-player-tv`.

## Pitfalls
- Native `<select>`, `<dialog>` and DOM focus misbehave with the remote (see decisions D3).
- The TV's shell is restricted (`sdb shell` mostly returns nothing). To debug, run a tiny HTTP logger on the Mac and have the
  app send `new Image().src = "http://<mac-ip>:8099/log?..."`. That is how `VIDEOSOURCE` and the app list were inspected. Remove such code afterwards.
- Remote Back key code is 10009. Remote "OK" arrives as `Enter`.
- `sdb connect` can drop after the TV sleeps or restarts: `sdb kill-server; sdb start-server; sdb connect <ip>`.
- Unsigned packages do not install: a Samsung certificate profile with the TV's DUID is required (profile `GatoPresto`,
  Public privilege, valid until Nov 2027). Reinstall after expiry. DUID is read with `sdb -s <ip>:26101 shell "0 getduid"`.
- A browser pane/desktop browser can preview logic only (`tizen` is undefined -> demo mode with fake PS5/Switch/Xbox cards).
  Serve `app/` with `python3 -m http.server`, because `file://` previews do not run the scripts.

## App ids seen on this TV
YouTube `9Ur5IzDKqV.TizenYouTube` (also `com.samsung.tv.cobalt-yt`, kids `com.samsung.tv.cobalt-ytkids`, TV `com.samsung.tv.cobalt-yttv`), Netflix `org.tizen.netflix-app`,
Prime Video `org.tizen.primevideo` (+ `-dummy`), Apple TV `com.samsung.tv.aria-video` (+ `com.samsung.tv.aria-dummy`), Apple Music `org.tizen.apple.apple-music` (+ `-dummy`), HBO Max `5b8c3eb16b.BeamCTVDev` (the other `5b8c3eb16b.*` ids are background workers).
The `-dummy` ids are placeholders the home screen uses; `APPS` lists the real id first and uses the first one present.

## ES modules work
`<script type="module" src="js/main.js">` with static `import`s (including import cycles) and `import.meta` load fine from the installed widget on this TV (Tizen 9 / Chromium 120). Verified on the TV, not just assumed.
