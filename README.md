# Zindagi

Late-night breakup jukebox for [zindagi.wtf](https://zindagi.wtf) — saloon.wtf-style player, rainy bar scene.

## Local

```bash
npm install
npm run dev
```

## Customize

- Background: `public/bg.jpg`
- Songs: `src/tracks.js` (first track is the cold open)
- Spotify / YT Music: set `SPOTIFY_URL` / `YT_MUSIC_URL` in `src/main.js`

## Deploy on Railway

This repo includes a `Dockerfile` + `Caddyfile` so Railway can build Vite and serve `dist/`.

1. Push this project to GitHub (or deploy with Railway CLI).
2. In Railway: **New Project → Deploy from GitHub** → select this repo.
3. After deploy succeeds: **Settings → Networking**
   - Add custom domain: `zindagi.wtf`
   - (Optional) also add `www.zindagi.wtf` and redirect later
   - Once `zindagi.wtf` is **Active**, remove any `*.up.railway.app` generated domain so visitors only use your domain
4. At your DNS provider, add the exact `CNAME` + `TXT` records Railway shows.
5. Wait for green verification + HTTPS, then open https://zindagi.wtf
