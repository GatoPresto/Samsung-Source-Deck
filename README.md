# Source Deck

Source Deck is a personal Samsung TV app that shows every video source as a themed thumbnail, with one slide each for Live TV, HDMI inputs, network streams, media servers and apps. Left/Right picks a source and OK opens it. The whole screen restyles per source (PlayStation, Switch, Xbox and more), and you can pick your own background picture.

A Tizen TV app for the 2023 Samsung S95C. Left and Right cycle through sources. OK opens the selected source. Back returns to the picker. The previews are themed cards.

## Set up sources

- HDMI sources come from the TV's connected video source list. Use Up/Down to focus **Assign console**, press OK, and select a console for that port. You can also prefill labels in `app/sources.js`. PS5 and Switch labels activate their respective themes. The public HDMI API reports the port and signal, with no console model field.
- Wake or dock a device and use **Refresh** if the TV omits its HDMI port.
- For network media, add a name and a direct HTTP(S) playback URL to `app/sources.js` before packaging. Use a LAN IP reachable by the TV and a supported stream or file, such as HLS (.m3u8), DASH (.mpd), or compatible MP4. A router's administration URL is not a playback URL. The first version does not browse DLNA/UPnP or SMB shares, discover casting targets, or implement wireless screen mirroring. A server that exposes media over HTTP can be added by URL.

## Preview

Open `app/index.html` in a desktop browser. The browser demo has sample cards and simulates opening a source. On a phone use the on-screen arrows and Open button. The Tizen-specific script URL may report a missing file in the browser and is resolved on the TV.

## Install on your Samsung TV

1. Install Tizen Studio with the Samsung TV Extension and Samsung Certificate Extension.
2. Enable Developer Mode from the TV's Apps screen using the 12345 keypad sequence. Enter your computer's LAN IP, then restart the TV. Add the TV's IP in Tizen Device Manager.
3. Create a Samsung TV certificate profile that includes the TV's DUID. If prompted, use **Permit to install applications** in Device Manager.
4. From a terminal, in this project's extracted folder, package and install using the Tizen CLI. Replace the sample profile and device names with yours.

   ```sh
   tizen package -t wgt -s YOUR_PROFILE -- app
   tizen install -n SourceDeck.wgt -t YOUR_TV -- app
   ```

   Use the actual generated package filename if it differs. Launch Source Deck from the TV's Apps screen.

5. Test a powered HDMI console and a known-good LAN stream. The HDMI path uses Samsung's public TVWindow API to show the selected input full-screen inside the app. TV firmware, signal negotiation and console display modes require testing on the actual TV.

Samsung docs:
- https://developer.samsung.com/smarttv/develop/getting-started/quick-start-guide.html
- https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/tvwindow-api.html
- https://developer.samsung.com/smarttv/develop/guides/multimedia/adaptive-streaming.html
