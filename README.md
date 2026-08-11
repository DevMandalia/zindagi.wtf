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

## Deploy (Vercel)

1. Push to GitHub (`zindagi.wtf` repo).
2. Import the repo in Vercel (framework: Vite — auto-detected).
3. Add domain `zindagi.wtf` in **Project → Settings → Domains**.
4. In GoDaddy DNS, set the **A** / **CNAME** values Vercel shows (apex works via A record).
5. Prefer apex as primary; redirect `www` → `zindagi.wtf`.
