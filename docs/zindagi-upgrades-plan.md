# Zindagi.wtf — Upgrade Plan

**Theme:** One composition. Rainy night after it ends. Brand first. Minimal chrome.  
**Parent:** Personal → Dragonstone (Notion mirror when auth available)

## Goals
Stay true to saloon-style single-viewport jukebox. Make the night feel alive, the player feel solid, and the on-site playlist match Spotify / YT Music.

## Scope

### 1. Content sync
- Expand `tracks.js` to the full Spotify playlist (32 tracks; skip Beete Lamhein lofi dup).
- Keep emotional arc chapters: `edge` → `words` → `back`.
- Add one-line lyric whisper per track.

### 2. Player robustness
- Persist last track + seek position (+ shuffle/loop) in `localStorage`.
- Media Session API (lock screen / Control Center).
- Shuffle + loop as tiny icons in the existing player bar.
- Deep links: `?t=<track-id>` opens that song.
- YouTube error → auto-skip next.
- Prefetch next cover art.
- Keyboard: Space, ←/→ (already present; keep + respect inputs).

### 3. Atmosphere (2–3 intentional motions)
- Soft CSS rain layer over the hero.
- Player glass “breathe” glow while playing.
- After midnight: deeper shade (`is-late`).

### 4. Whisper UI
- One lyric line under title/artist — quiet, no cards.
- Film name as ghost text on vinyl hover.

### 5. Explicit non-goals
No cards, stats strips, chat, login, playlist drawers, purple glow, emoji reactions.

## Acceptance
- [x] 32 tracks play in Spotify order (site).
- [x] Refresh restores song + position.
- [x] `?t=mausam` loads Mausam.
- [x] Shuffle / loop work; Media Session updates.
- [x] Rain + glow + late-night shade present, not noisy.
- [x] Deployed to zindagi.wtf.

## Status notes
- Local mirror of this plan lives at `docs/zindagi-upgrades-plan.md`.
- Notion → Personal → Dragonstone: paste/create when Notion MCP is authenticated.
