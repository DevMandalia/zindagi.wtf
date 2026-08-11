# Playlist sync (Spotify ↔ YouTube ↔ site)

## Goal
Keep three surfaces aligned:

1. **Spotify** playlist `58RxFrb0cLd6jM1JzKNp2x`
2. **YouTube / YT Music** playlist `PLUvh2lQtfqSw` (override with `YOUTUBE_PLAYLIST_ID` if the full id differs)
3. **Website** = `src/tracks.js` (core) + Blob `community-tracks.json`

**Source of truth for catch-up:** Spotify (it’s the one growing).  
**On each suggestion:** site first, then fan-out to Spotify + YouTube when credentials exist.

## What ships

| Piece | Role |
|-------|------|
| `api/_lib/sync.js` | Shared sync + suggestion fan-out |
| `api/sync.js` | `GET/POST /api/sync` (secret) — run catch-up |
| `api/suggest.js` | After site add → Spotify + YouTube |
| `scripts/sync-playlists.mjs` | Local/CI catch-up |
| `scripts/auth-spotify.mjs` | One-time Spotify refresh token |
| `scripts/auth-youtube.mjs` | One-time YouTube refresh token |

## One-time auth

### Spotify
1. Create app: https://developer.spotify.com/dashboard  
2. Redirect URI: `http://127.0.0.1:8732/callback`  
3. `SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… node scripts/auth-spotify.mjs`  
4. Put printed vars into Vercel + `.env.local`

### YouTube
1. Google Cloud project → enable **YouTube Data API v3**  
2. OAuth client; redirect `http://127.0.0.1:8733/callback`  
3. `YOUTUBE_CLIENT_ID=… YOUTUBE_CLIENT_SECRET=… node scripts/auth-youtube.mjs`  
4. Put printed vars into Vercel + `.env.local`  
5. Confirm `YOUTUBE_PLAYLIST_ID` matches the playlist in the YT Music URL (full id)

Also set `SYNC_SECRET` (or reuse `SUGGESTIONS_SECRET`) for `/api/sync`.

## Run sync

```bash
# dry run
node --env-file=.env.local scripts/sync-playlists.mjs --dry

# apply: missing Spotify songs → site + YouTube
node --env-file=.env.local scripts/sync-playlists.mjs

# or remotely
curl -X POST -H "Authorization: Bearer $SYNC_SECRET" 'https://zindagi.wtf/api/sync'
```

## Env checklist

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=          # write
SPOTIFY_PLAYLIST_ID=58RxFrb0cLd6jM1JzKNp2x

YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=          # write
YOUTUBE_PLAYLIST_ID=PLUvh2lQtfqSw
YOUTUBE_API_KEY=                # optional read-only

SYNC_SECRET=                    # or SUGGESTIONS_SECRET
BLOB_READ_WRITE_TOKEN=          # already set
```

Until write tokens are set, suggestions still update the **website**; Spotify/YT fan-out is skipped and reported in the API response under `fanout`.
