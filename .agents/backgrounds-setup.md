# Background pictures: API keys

Only Unsplash needs a free key. Wallhaven, router and USB pictures need none, so the app works without any key. (Pexels was dropped: it paused issuing new API keys.)

1. Copy `app/backgrounds-config.example.js` to `app/backgrounds-config.js` (git-ignored, never commit it).
2. Unsplash: create an app at https://unsplash.com/oauth/applications and paste its **Access Key** as `unsplashKey`. Demo mode allows 50 requests/hour, enough for personal use. Unsplash's API rules ask for a download trigger (done on pick) and a credit (shown on screen).
3. Redeploy with `scripts/deploy.sh`. The keys are shipped inside the installed app on the TV only.

Needed permissions in `config.xml`: network access (already `<access origin="*">`) and `http://tizen.org/privilege/filesystem.read` (USB drive).
