# YouTube login setup (one time)

The deck logs in to YouTube with Google's **OAuth device flow** (the "enter a code on your phone" flow) and reads your subscriptions with the
YouTube Data API v3, read-only (`youtube.readonly`). It does not reuse the TV YouTube app's login (impossible, apps are sandboxed).

1. Google Cloud Console -> create a project -> **APIs & Services -> Library -> YouTube Data API v3 -> Enable**.
2. **OAuth consent screen**: External, add your Google account under **Test users** (while the app is in Testing mode only listed accounts can sign in;
   refresh tokens of Testing apps expire after 7 days, so re-login weekly unless you publish the consent screen).
3. **Credentials -> Create credentials -> OAuth client ID -> Application type "TVs and Limited Input devices"**.
4. Copy `app/youtube-config.example.js` to `app/youtube-config.js` and paste the client id and client secret. The file is git-ignored. Never commit it.
5. Repackage and reinstall (see `build-and-deploy.md`), select the YouTube tile and press **Log in**. On a phone open google.com/device, enter the shown code.

Quota: each feed load uses ~17 units (1 subscriptions list + up to 15 playlistItems calls), well under the 10,000/day default.

Tokens (`yt-tokens`) and the cached feed (`yt-feed`) live in the app's localStorage on the TV. "Log out" clears both.
