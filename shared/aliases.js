/**
 * Heartbreak / pathos pseudonyms for anonymous community attribution.
 * No real names — only ghosts in the room.
 */
export const ALIASES = [
  'Monsoon Ghost',
  'Soft Ruin',
  'Last Call',
  'Unsent',
  'Empty Passenger Seat',
  'Salt & Static',
  'Half-Written Letter',
  'Quiet Storm',
  'Second Drink',
  'Ash on the Dashboard',
  'Blue Hour',
  'Broken Vinyl',
  'After You',
  'Glass Heart',
  'Hungover Sunrise',
  'Raincheck',
  'Orphaned Chorus',
  'Fade to Grey',
  'The Light Left On',
  'Midnight Passenger',
  'Wet Match',
  'Slow Bleed',
  'Paper Cut Moon',
  'Cold Tea',
  'Missed Exit',
  'Static Lullaby',
  'Borrowed Jacket',
  'Fog on the Mirror',
  'Almost Home',
  'Hollow Chorus',
  'Streetlamp Widow',
  'Unfinished Smoke',
  'Late Reply',
  'Torn Ticket',
  'Silver Lining Gone',
  'Drowned Radio',
  'One More Song',
  'Window Seat',
  'Pale Neon',
  'Ghost Frequency',
  'Sleepless Ink',
  'Burnt Out Star',
  'Quiet Divorce',
  'Velvet Ruin',
  'Rain-Soaked Map',
  'No Forwarding Address',
  'Low Battery Heart',
  'The Last Umbrella',
  'Echo in the Hall',
  'Soft Detour',
  'Wilted Corsage',
  'Thunder Without Rain',
  'Closed Tab',
  'Left on Read',
  'Porcelain Crack',
  'Night Bus',
  'Unclaimed Baggage',
  'Moth to the Ache',
]

const ALIAS_SET = new Set(ALIASES.map((a) => a.toLowerCase()))

export function isValidAlias(value) {
  return typeof value === 'string' && ALIAS_SET.has(value.trim().toLowerCase())
}

export function normalizeAlias(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  const hit = ALIASES.find((a) => a.toLowerCase() === trimmed.toLowerCase())
  return hit || null
}

/** Stable index from any string seed. */
export function hashSeed(seed) {
  const s = String(seed || 'zindagi')
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function pickAlias(seed) {
  return ALIASES[hashSeed(seed) % ALIASES.length]
}

/** Tracks that live in the community playlist (suggestions + room catch-up). */
export function isCommunityTrack(track) {
  if (!track || typeof track !== 'object') return false
  if (track.source === 'suggest' || track.community === true) return true
  if (track.suggestedAt) return true
  if (track.alias) return true
  if (track.syncedAt || track.spotifyId || track.source === 'sync') return true
  const whisper = String(track.whisper || '')
  return /listener|brought by|from the room|spotify playlist/i.test(whisper)
}

/** @deprecated use isCommunityTrack — kept for call sites */
export function isCommunitySuggestion(track) {
  return isCommunityTrack(track)
}

/**
 * Ensure every community playlist track has a stable alias for the ticker.
 * Prefers unique aliases across the list when assigning new ones.
 * Returns true if any track was mutated.
 */
export function ensureTrackAliases(tracks) {
  if (!Array.isArray(tracks)) return false
  let changed = false
  const used = new Set()

  for (const track of tracks) {
    if (!isCommunityTrack(track)) continue
    const existing = normalizeAlias(track.alias)
    if (existing) used.add(existing.toLowerCase())
  }

  for (const track of tracks) {
    if (!isCommunityTrack(track)) continue
    const existing = normalizeAlias(track.alias)
    if (existing) {
      if (track.alias !== existing) {
        track.alias = existing
        changed = true
      }
      continue
    }

    const seed = track.id || track.youtubeId || track.title
    let alias = pickAlias(seed)
    if (used.has(alias.toLowerCase())) {
      const start = hashSeed(seed) % ALIASES.length
      for (let i = 0; i < ALIASES.length; i += 1) {
        const candidate = ALIASES[(start + i) % ALIASES.length]
        if (!used.has(candidate.toLowerCase())) {
          alias = candidate
          break
        }
      }
    }

    track.alias = alias
    used.add(alias.toLowerCase())
    track.community = true
    if (!track.source) {
      track.source = track.syncedAt || track.spotifyId ? 'sync' : 'suggest'
    }
    if (
      track.whisper === 'Suggested by a listener.' ||
      track.whisper === 'From the Spotify playlist.' ||
      !track.whisper
    ) {
      track.whisper = 'A song from the room.'
    }
    if (!track.suggestedAt && (track.syncedAt || track.source === 'sync')) {
      track.suggestedAt = track.syncedAt || null
    }
    changed = true
  }
  return changed
}
