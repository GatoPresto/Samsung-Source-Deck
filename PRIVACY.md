# Source Deck — Privacy Policy

_Last updated: 8 November 2026 (background pictures added)_

Source Deck is a personal, open-source app for Samsung TVs. It shows your TV inputs, apps and media in one place. This page explains what the app does with data.

## What the app accesses

- **Your TV:** the list of inputs, installed apps and, on your local network, UPnP/DLNA media servers.
- **YouTube (only if you choose to log in):** with your permission (Google OAuth, scope `youtube.readonly`) the app reads your **channel subscriptions** and the **latest public uploads** of those channels, so it can show them on the YouTube slide. It cannot change anything in your account, post, comment, or see your private data beyond that read-only access.
- **Apple Music charts, search and previews:** public data from Apple's free iTunes feeds (`itunes.apple.com`). No Apple account or login is used and the app cannot see your Apple Music library or playlists. To show this content the app sends Apple:
  - the **text you type into the search box**,
  - **ids of songs, albums and artists** it needs details for (for example the chart entries, or the artists of songs you recently played in the app so it can suggest more songs by them),
  - your **country** (taken from the TV's language/region setting) to pick the right chart.

  Like any web request, these requests also reveal your IP address to Apple. The app does not send Apple your name, account or a list of what you have played; the "For you" suggestions are worked out on the TV from your local play history (see below). Apple's own privacy policy applies to these requests.
- **Background pictures (only if you use "Change background"):** you can pick a picture from Unsplash or Wallhaven, from a media server on your local network, or from a USB drive. For Unsplash and Wallhaven the app sends the **text you type into the search box** and requests the pictures you choose from `api.unsplash.com`/`images.unsplash.com` and `wallhaven.cc`/`w.wallhaven.cc`/`th.wallhaven.cc`; these requests also reveal your IP address to those services, and their own privacy policies apply. Pictures from your media server or USB drive are only read on your TV or home network and are never uploaded. The app asks the TV for read access to its file system for the USB option.

- **Weather widget (only if you add one and choose a city):** the app sends the **city name you type** to Open-Meteo's geocoding service (`geocoding-api.open-meteo.com`) to find it, and the **chosen city's coordinates** to Open-Meteo's forecast service (`api.open-meteo.com`) to get the current weather. No account or key is used. These requests also reveal your IP address to Open-Meteo, whose own privacy policy applies. The clock and date widgets use only the TV's clock.
- **News, Currency and Sports widgets (only if you add them):** each one contacts a public service directly from the TV, without an account or key, and only to read: the **News** widget downloads the RSS feed you choose (one of the built-in publishers, or an address you type yourself) from that publisher's own server; the **Currency** widget asks ExchangeRate-API (`open.er-api.com`) for rates for the base currency you chose; the **Sports scores** widget asks ESPN's public scoreboard (`site.api.espn.com`) for the league you chose. Your team filter text is applied on the TV and is not sent. These requests also reveal your IP address to those services, whose own privacy policies apply. The **Inputs** widget uses only what the TV reports about its HDMI ports.
- **Developer link:** the "About the developer" screen can open the developer's LinkedIn page in the TV's browser, only when you choose it. The app itself sends nothing to LinkedIn.

## Where data is stored

Everything stays **on your TV**. Login tokens, your settings (themes, order, hidden sources, language, background choices, widget layouts and the city of a weather widget), the last answers of the widgets (weather, headlines, rates and scores, cached for a few minutes to an hour), a **history of the last 60 Apple Music previews you played in this app** (used only for the "For you" suggestions), a short-lived cache of your YouTube feed and the **background pictures you chose** (kept while a source uses them, or until you remove their star; deleted when you replace or remove them otherwise) are stored in the app's local storage on the TV. The app has **no server of its own**: nothing is sent to the developer or to any third party except the direct requests to Google (YouTube API), Apple (public feeds) and, if you use background pictures, Unsplash and Wallhaven, and, if you use the widgets that need them, Open-Meteo, the news publishers you choose, ExchangeRate-API and ESPN, that are needed to show the content.

## What the app does not do

- It does not collect, sell, share or analyse your personal data.
- It does not use advertising or tracking.
- It does not store your Google password (login happens on Google's own page on your phone).

## Your control

- Choose **Log out** on the YouTube slide to delete the stored login and cached feed from the TV. Background pictures are deleted when you remove or replace them (pictures you starred stay until you remove the star). The Apple Music play history stays until the app is uninstalled or its data is cleared on the TV.
- Remove the app's access any time at <https://myaccount.google.com/permissions>.
- Uninstalling the app from the TV deletes all of its stored data.

## Google API Services

Source Deck's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Contact

Questions: open an issue at <https://github.com/GatoPresto/Samsung-Source-Deck/issues>.
