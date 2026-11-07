# Source Deck — Privacy Policy

_Last updated: 8 November 2026_

Source Deck is a personal, open-source app for Samsung TVs. It shows your TV inputs, apps and media in one place. This page explains what the app does with data.

## What the app accesses

- **Your TV:** the list of inputs, installed apps and, on your local network, UPnP/DLNA media servers.
- **YouTube (only if you choose to log in):** with your permission (Google OAuth, scope `youtube.readonly`) the app reads your **channel subscriptions** and the **latest public uploads** of those channels, so it can show them on the YouTube slide. It cannot change anything in your account, post, comment, or see your private data beyond that read-only access.
- **Apple Music charts and previews:** public data from Apple's free iTunes feeds. No Apple account or login is used.

## Where data is stored

Everything stays **on your TV**. Login tokens, your settings (themes, order, hidden sources), your recently played previews and a short-lived cache of your YouTube feed are stored in the app's local storage on the TV. The app has **no server of its own**: nothing is sent to the developer or to any third party except the direct requests to Google (YouTube API) and Apple (public feeds) that are needed to show the content.

## What the app does not do

- It does not collect, sell, share or analyse your personal data.
- It does not use advertising or tracking.
- It does not store your Google password (login happens on Google's own page on your phone).

## Your control

- Choose **Log out** on the YouTube slide to delete the stored login and cached feed from the TV.
- Remove the app's access any time at <https://myaccount.google.com/permissions>.
- Uninstalling the app from the TV deletes all of its stored data.

## Google API Services

Source Deck's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Contact

Questions: open an issue at <https://github.com/GatoPresto/Samsung-Source-Deck/issues>.
