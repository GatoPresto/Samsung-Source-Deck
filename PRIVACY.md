# Source Deck — Privacy Policy

_Last updated: 8 November 2026 (Apple Music details added)_

Source Deck is a personal, open-source app for Samsung TVs. It shows your TV inputs, apps and media in one place. This page explains what the app does with data.

## What the app accesses

- **Your TV:** the list of inputs, installed apps and, on your local network, UPnP/DLNA media servers.
- **YouTube (only if you choose to log in):** with your permission (Google OAuth, scope `youtube.readonly`) the app reads your **channel subscriptions** and the **latest public uploads** of those channels, so it can show them on the YouTube slide. It cannot change anything in your account, post, comment, or see your private data beyond that read-only access.
- **Apple Music charts, search and previews:** public data from Apple's free iTunes feeds (`itunes.apple.com`). No Apple account or login is used and the app cannot see your Apple Music library or playlists. To show this content the app sends Apple:
  - the **text you type into the search box**,
  - **ids of songs, albums and artists** it needs details for (for example the chart entries, or the artists of songs you recently played in the app so it can suggest more songs by them),
  - your **country** (taken from the TV's language/region setting) to pick the right chart.

  Like any web request, these requests also reveal your IP address to Apple. The app does not send Apple your name, account or a list of what you have played; the "For you" suggestions are worked out on the TV from your local play history (see below). Apple's own privacy policy applies to these requests.

## Where data is stored

Everything stays **on your TV**. Login tokens, your settings (themes, order, hidden sources), a **history of the last 60 Apple Music previews you played in this app** (used only for the "For you" suggestions) and a short-lived cache of your YouTube feed are stored in the app's local storage on the TV. The app has **no server of its own**: nothing is sent to the developer or to any third party except the direct requests to Google (YouTube API) and Apple (public feeds) that are needed to show the content.

## What the app does not do

- It does not collect, sell, share or analyse your personal data.
- It does not use advertising or tracking.
- It does not store your Google password (login happens on Google's own page on your phone).

## Your control

- Choose **Log out** on the YouTube slide to delete the stored login and cached feed from the TV. The Apple Music play history stays until the app is uninstalled or its data is cleared on the TV.
- Remove the app's access any time at <https://myaccount.google.com/permissions>.
- Uninstalling the app from the TV deletes all of its stored data.

## Google API Services

Source Deck's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Contact

Questions: open an issue at <https://github.com/GatoPresto/Samsung-Source-Deck/issues>.
