<p align="center">
  <a href="https://zindagi.wtf">
    <img src="docs/zindagi-preview.jpg" alt="Zindagi — late-night breakup jukebox" width="100%" />
  </a>
</p>

# Zindagi

Late-night breakup jukebox for **[zindagi.wtf](https://zindagi.wtf)** — saloon.wtf-style player, rainy bar scene.

## Local

```bash
npm install
npm run dev
```

## Customize

- Background: `public/bg.jpg`
- Songs: `src/tracks.js` (core list; community suggestions merge at runtime)
- Spotify / YT Music: set `SPOTIFY_URL` / `YT_MUSIC_URL` in `src/main.js`
- Suggestions: `+` in the top-right → `POST /api/suggest` (Vercel Blob queue + YouTube lookup)

## Suggestions

Plan: `docs/song-suggestions-plan.md`

- Queue + community tracks live in a private Vercel Blob store (`zindagi-data`)
- Site playlist grows when lookup succeeds; Spotify/YT Music playlists stay manual
- Lookup ranks candidates (rejects karaoke/hour-long junk; prefers official/audio)
- Fuzzy dedupe on title/artist transliterations
- Owner digest: `GET /api/suggestions` with `Authorization: Bearer $SUGGESTIONS_SECRET` (or `?secret=`)
- Local API: `npx vercel dev` (needs `.env.local` with `BLOB_READ_WRITE_TOKEN` + `SUGGESTIONS_SECRET`)

## Playlist sync

Spotify is the catch-up source of truth. Suggestions fan out to the **site**, then **Spotify** + **YouTube** when OAuth tokens are configured.

See `docs/playlist-sync.md`.

```bash
npm run auth:spotify
npm run auth:youtube
npm run sync:dry
npm run sync
```

## Deploy (Vercel)

1. Push to GitHub (`zindagi.wtf` repo).
2. Import the repo in Vercel (framework: Vite — auto-detected).
3. Add domain `zindagi.wtf` in **Project → Settings → Domains**.
4. In GoDaddy DNS, set the **A** / **CNAME** values Vercel shows (apex works via A record).
5. Prefer apex as primary; redirect `www` → `zindagi.wtf`.
