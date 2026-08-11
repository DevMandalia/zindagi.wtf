import { tracks as coreTracks } from '../../src/tracks.js'

export function slugify(input) {
  return (
    String(input || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'song'
  )
}

/** Soft fold for fuzzy Bollywood title matching */
export function foldText(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[''`´]/g, '')
    .replace(/&/g, ' and ')
    // Spotify often appends (From "Film") / - From "Film"
    .replace(/\s*[\(\[]\s*from\s+[^\)\]]+[\)\]]/gi, ' ')
    .replace(/\s*-\s*from\s+".*?"/gi, ' ')
    .replace(/\s*-\s*(original version|title track|sad|male|female|lofi mix)\b/gi, ' ')
    .replace(/\s*[\(\[]\s*(original version|title track|sad|male|female|lofi mix)\s*[\)\]]/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an|ost|from|song|full|video|official|audio|lyrics?)\b/g, ' ')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/saath/g, 'sath')
    .replace(/tumhe/g, 'tum')
    .replace(/mujhe/g, 'mujh')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeKey(title, artist = '') {
  return `${foldText(title)}::${foldText(artist)}`
}

function tokens(text) {
  return foldText(text)
    .split(' ')
    .filter((t) => t.length > 1)
}

function jaccard(a, b) {
  const A = new Set(tokens(a))
  const B = new Set(tokens(b))
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter += 1
  return inter / (A.size + B.size - inter)
}

export function titlesFuzzyMatch(a, b) {
  const fa = foldText(a)
  const fb = foldText(b)
  if (!fa || !fb) return false
  if (fa === fb) return true
  if (fa.includes(fb) || fb.includes(fa)) {
    const shorter = Math.min(fa.length, fb.length)
    const longer = Math.max(fa.length, fb.length)
    if (shorter >= 6 && shorter / longer >= 0.72) return true
  }
  return jaccard(fa, fb) >= 0.82
}

export function listKnownKeys(communityTracks = []) {
  const keys = new Set()
  const ids = new Set()
  const youtubeIds = new Set()
  const catalog = []

  for (const track of [...coreTracks, ...communityTracks]) {
    keys.add(normalizeKey(track.title, track.artist))
    ids.add(track.id)
    if (track.youtubeId) youtubeIds.add(track.youtubeId)
    catalog.push(track)
  }
  return { keys, ids, youtubeIds, catalog }
}

export function findDuplicate(title, artist, catalog) {
  const key = normalizeKey(title, artist)
  const foldedArtist = foldText(artist)
  const foldedTitle = foldText(title)

  for (const track of catalog) {
    if (normalizeKey(track.title, track.artist) === key) return track
    if (!titlesFuzzyMatch(title, track.title)) continue
    const trackArtist = foldText(track.artist)
    if (!foldedArtist || !trackArtist) return track
    if (foldedArtist === trackArtist) return track
    if (jaccard(foldedArtist, trackArtist) >= 0.34) return track
    // Strong exact title fold (after stripping "From …") — treat as same song
    if (foldedTitle && foldedTitle === foldText(track.title)) return track
  }
  return null
}

export function uniqueCommunityId(base, usedIds) {
  let id = `s-${base}`
  let n = 2
  while (usedIds.has(id)) {
    id = `s-${base}-${n}`
    n += 1
  }
  return id
}

export { coreTracks }
