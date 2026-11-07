# Privacy: what the app handles, and keeping PRIVACY.md in sync

`PRIVACY.md` (repo root) is the public privacy policy. Its URL (`https://github.com/GatoPresto/Samsung-Source-Deck/blob/main/PRIVACY.md`) is entered as the privacy policy link on the Google Cloud OAuth consent screen
(Branding page), so it must stay accurate. The app has no server: all data stays on the TV.

## Current data inventory (keep this table up to date, then update PRIVACY.md to match)

| Data | Where it comes from | Where it is stored | Leaves the TV? |
|---|---|---|---|
| TV inputs, installed apps | Tizen APIs on the TV | not stored (rebuilt each start) | no |
| Media servers and their file names | UPnP on the local network | not stored | no (local network only) |
| Settings: themes, hidden/added/ordered sources | the user | `localStorage["deck-prefs"]` | no |
| YouTube login tokens (access + refresh) | Google OAuth device flow, scope `youtube.readonly` | `localStorage["yt-tokens"]` | only sent back to Google's APIs |
| YouTube subscriptions + latest uploads (cache, 10 min) | YouTube Data API v3 | `localStorage["yt-feed"]` | no |
| Apple Music play history (60 songs) | what the user plays | `localStorage["music-history"]` | no; only artist ids go to Apple's public lookup to find more songs |
| Apple Music charts/search/previews | Apple's public iTunes feeds (no login) | not stored | yes, to `itunes.apple.com`: search text, song/album/artist ids, country from the TV locale, plus the IP address (spelled out in PRIVACY.md) |
| Background pictures | chosen by the user from Unsplash, Wallhaven, the router's media server or a USB drive | IndexedDB `deck-bg`, only while in use (deleted when replaced/removed); choices in `localStorage["deck-prefs"].bg` | search text and the picture requests go to Unsplash/Wallhaven (plus IP); router/USB files are only read locally |
| Unsplash API key | the developer (`backgrounds-config.js`, git-ignored) | in the installed app only | sent to Unsplash as the API key |
| Google OAuth client id/secret | the developer (`youtube-config.js`, git-ignored) | in the installed app only | sent to Google during login |

External hosts the app talks to: `oauth2.googleapis.com`, `www.googleapis.com` (YouTube Data API), `itunes.apple.com`, `api.unsplash.com`, `images.unsplash.com`, `wallhaven.cc`, `w.wallhaven.cc`, `th.wallhaven.cc`, song-preview/artwork hosts of Apple and YouTube thumbnails (`i.ytimg.com` etc.), and local-network media servers. Nothing else.

## Checklist when adding or changing a feature

1. Does it read a new kind of personal data, call a new host, or request a new Google scope? Add it to the table above and to `PRIVACY.md` ("What the app accesses").
2. Does it store anything new (localStorage, files)? Add it to the table and to `PRIVACY.md` ("Where data is stored") and make sure "Log out" or uninstall removes it, or say so.
3. Does anything leave the TV (analytics, logs, crash reports, a backend, sharing)? That contradicts the current "no server, nothing is sent" text. Update `PRIVACY.md` first and tell the user.
4. New Google scope: also update the consent screen in Google Cloud (a sensitive/restricted scope may require Google verification) and `youtube-setup.md`.
5. Change the "Last updated" date in `PRIVACY.md`, tell the user the policy changed, and remind them to push (the Google form links to the file on GitHub).
