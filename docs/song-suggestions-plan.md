# Zindagi — Song suggestions

## Goal
Visitors can suggest a song in one modal. Suggestions are stored, looked up on YouTube, and (when found) added to the on-site playlist. Spotify / YT Music curated lists stay owner-managed.

## Placement
Suggest control lives in the **top-right** with Spotify / YT Music — same chrome family, doesn’t fight the player.

## Flow
1. Visitor opens **Suggest**, enters title (+ optional artist).
2. `POST /api/suggest` validates, rate-limits, dedupes.
3. Server searches YouTube (Innertube) for a music-ish match.
4. Every suggestion is appended to the **queue** in Vercel Blob (`suggestions.json`).
5. If a video ID is found and isn’t already in the core or community list → append to `community-tracks.json` and return `added`.
6. Client merges community tracks on load (and after a successful add).

## Storage
- **Vercel Blob** (Hobby): durable JSON documents, no extra DB signup.
- `suggestions.json` — full queue (`pending` / `added` / `duplicate` / `unresolved`).
- `community-tracks.json` — playable extras the site loads at runtime.

## Non-goals (v1 UI)
No moderation UI, accounts, or chat.

Playlist write fan-out (Spotify + YouTube) is implemented when OAuth env vars are set — see `docs/playlist-sync.md`.

- Abuse basics: honeypot, short caps, IP cooldown, max body size.
- Lookup quality: score candidates; reject karaoke / hour-long / reaction junk; prefer official/audio/lyrics; duration sweet spot.
- Fuzzy dedupe on folded titles (transliteration-tolerant).
- Owner digest: `GET /api/suggestions` behind `SUGGESTIONS_SECRET`.
