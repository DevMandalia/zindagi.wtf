const REJECT_RE =
  /\b(karaoke|instrumental only|full\s*movie|full\s*film|movie\s*scene|1\s*hour|2\s*hour|3\s*hour|10\s*hour|hour\s*version|nightcore|slowed\s*\+?\s*reverb|8d\s*audio|bass\s*boosted|reaction|podcast|audio\s*spectrum|non[\s-]?stop|mega\s*mashup|dj\s*mix|lofi\s*hip\s*hop|gameplay)\b/i

const BOOST_RE = /\b(official|topic|lyric|lyrics|bollywood|original|ost|audio|music\s*video|\bmv\b|song)\b/i

function walk(node, out) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, out)
    return
  }
  if (node.videoRenderer?.videoId) {
    const lengthText = flattenText(node.videoRenderer.lengthText)
    out.push({
      youtubeId: node.videoRenderer.videoId,
      title: flattenText(node.videoRenderer.title),
      artist: flattenText(node.videoRenderer.ownerText) || flattenText(node.videoRenderer.shortBylineText),
      durationSec: parseLength(lengthText),
    })
  }
  for (const value of Object.values(node)) walk(value, out)
}

function flattenText(field) {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (Array.isArray(field.runs)) return field.runs.map((r) => r.text || '').join('')
  if (field.simpleText) return field.simpleText
  return ''
}

function parseLength(text) {
  if (!text) return null
  const parts = String(text)
    .trim()
    .split(':')
    .map((p) => Number(p))
  if (parts.some((n) => !Number.isFinite(n))) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return null
}

function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenOverlap(query, hay) {
  const q = new Set(fold(query).split(' ').filter((t) => t.length > 1))
  const h = new Set(fold(hay).split(' ').filter((t) => t.length > 1))
  if (!q.size) return 0
  let hit = 0
  for (const t of q) if (h.has(t)) hit += 1
  return hit / q.size
}

export function scoreCandidate(candidate, title, artist) {
  const hay = `${candidate.title} ${candidate.artist}`
  if (REJECT_RE.test(hay)) return -1000

  let score = 0
  if (BOOST_RE.test(hay)) score += 28

  const titleHit = tokenOverlap(title, candidate.title)
  score += titleHit * 50

  if (artist) {
    const artistHit = Math.max(tokenOverlap(artist, candidate.artist), tokenOverlap(artist, candidate.title))
    score += artistHit * 30
  }

  const dur = candidate.durationSec
  if (typeof dur === 'number') {
    if (dur < 75 || dur > 12 * 60) score -= 40
    else if (dur >= 120 && dur <= 420) score += 12
  }

  // Prefer results whose title actually contains folded query words
  if (titleHit < 0.35) score -= 25

  return score
}

function pickBest(candidates, title, artist) {
  let best = null
  let bestScore = -Infinity
  const seen = new Set()

  for (const c of candidates) {
    if (!c?.youtubeId || seen.has(c.youtubeId)) continue
    seen.add(c.youtubeId)
    const score = scoreCandidate(c, title, artist)
    if (score > bestScore) {
      bestScore = score
      best = { ...c, score }
    }
  }

  if (!best || bestScore < 18) return null
  return best
}

async function searchPiped(query) {
  const instances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.private.coffee',
  ]
  const out = []
  for (const base of instances) {
    try {
      const url = `${base}/search?q=${encodeURIComponent(query)}&filter=all`
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
      if (!res.ok) continue
      const data = await res.json()
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      for (const item of items) {
        if (!(item?.type === 'stream' || item?.url?.includes('/watch') || item?.id)) continue
        const youtubeId = item.id || String(item.url || '').match(/[?&]v=([\w-]{11})/)?.[1]
        if (!youtubeId) continue
        out.push({
          youtubeId,
          title: item.title || query,
          artist: item.uploaderName || item.uploader || '',
          durationSec: typeof item.duration === 'number' ? item.duration : null,
          source: 'piped',
        })
      }
      if (out.length) return out
    } catch {
      /* try next */
    }
  }
  return out
}

async function searchInnertube(query) {
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20250304.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        query,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const found = []
    walk(data, found)
    return found.map((c) => ({ ...c, source: 'innertube' }))
  } catch {
    return []
  }
}

export async function lookupTrack(title, artist) {
  const query = [title, artist].filter(Boolean).join(' ').trim()
  if (!query) return null

  const queries = [`${query} song`, `${query} official`, query]
  const pool = []

  for (const q of queries) {
    const piped = await searchPiped(q)
    pool.push(...piped)
    if (pool.length >= 8) break
  }

  if (pool.length < 3) {
    pool.push(...(await searchInnertube(`${query} song`)))
  }
  if (pool.length < 2) {
    pool.push(...(await searchInnertube(query)))
  }

  const best = pickBest(pool, title, artist)
  if (!best) return null
  return {
    youtubeId: best.youtubeId,
    title: best.title,
    artist: best.artist,
    source: best.source,
    score: best.score,
  }
}
