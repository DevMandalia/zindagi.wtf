# Zindagi — Next ideas (round 2)

**North star:** One rainy-night composition. Brand first. Minimal chrome. Feeling > features.

What’s already working: full playlist, persistence, Media Session, atmosphere (rain / glow / late / flicker), whispers, film ghost, suggest → lookup → community playlist.

---

## Recommended next slice (build these)

~~Small, on-brand, high leverage — no new surface area in the first viewport.~~

### Shipped (2026-08-11)
1. **Share this song** — click vinyl → copies `?t=` link; overlay shows “Copy link” / “Copied”.
2. **Smarter suggestions** — candidate scoring, reject karaoke/hour-long junk, fuzzy dedupe.
3. **Owner digest** — `GET /api/suggestions` with `SUGGESTIONS_SECRET`.

### Still recommended
3. **Chapter as weather** — shade/rain/glow by `edge` / `words` / `back`.
4. **First-visit play gate** — mobile tap-to-enter.
5. **Presence that isn’t a lie** — soft real counter.
---

## Strong ideas (later)

| Idea | Why it fits | Risk |
|------|-------------|------|
| Owner sync script: community → Spotify / YT Music | Suggestions “really” join the canonical playlists | OAuth setup |
| Soft crossfade / gapless-ish | Bar DJ feel | YouTube IFrame limits |
| PWA + richer Media Session artwork | Phone lock-screen as the product | Scope creep |
| Condensation / glass fog on player while raining | Atmosphere | Can look gimmicky if overdone |
| Whisper fade-in on track change | Motion with purpose | Must stay quiet |
| “Last call” after 4am — one alternate shade + slower rain | Extends `is-late` | Timezone assumptions |

---

## Explicit no (still)

Playlist drawers, cards, chat, emoji reactions, stats strips, login walls, purple glow, inset hero media, competing first-viewport copy.

---

## Decision bias

If only one thing ships next: **Share this song** + **suggestion quality**.  
If two: add **chapter-as-weather**.  
If the night still feels hard to enter on iPhone: **first-visit play gate**.
