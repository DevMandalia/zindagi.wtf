/**
 * Spotify helpers for Zindagi playlist sync.
 * Read: client-credentials (public playlist) or user token.
 * Write: requires SPOTIFY_REFRESH_TOKEN (playlist-modify-*).
 */

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const API = 'https://api.spotify.com/v1'

function required(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

function hasSpotifyReadConfig() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET)
}

function hasSpotifyWriteConfig() {
  return hasSpotifyReadConfig() && Boolean(process.env.SPOTIFY_REFRESH_TOKEN)
}

export function spotifyPlaylistId() {
  return process.env.SPOTIFY_PLAYLIST_ID || '58RxFrb0cLd6jM1JzKNp2x'
}

async function clientCredentialsToken() {
  const id = required('SPOTIFY_CLIENT_ID')
  const secret = required('SPOTIFY_CLIENT_SECRET')
  const basic = Buffer.from(`${id}:${secret}`).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Spotify client token: ${data.error || res.status}`)
  return data.access_token
}

async function userAccessToken() {
  const id = required('SPOTIFY_CLIENT_ID')
  const secret = required('SPOTIFY_CLIENT_SECRET')
  const refresh = required('SPOTIFY_REFRESH_TOKEN')
  const basic = Buffer.from(`${id}:${secret}`).toString('base64')
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refresh,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Spotify refresh: ${data.error || res.status}`)
  return data.access_token
}

async function spotifyFetch(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || text || res.status
    throw new Error(`Spotify ${method} ${path}: ${msg}`)
  }
  return data
}

export async function listSpotifyPlaylistTracks() {
  if (!hasSpotifyReadConfig()) {
    return { ok: false, reason: 'missing_spotify_client', tracks: [] }
  }
  const token = hasSpotifyWriteConfig() ? await userAccessToken() : await clientCredentialsToken()
  const id = spotifyPlaylistId()
  const tracks = []
  let url = `/playlists/${id}/items?limit=100&market=from_token`

  while (url) {
    const path = url.startsWith('http') ? url.replace(API, '') : url
    const page = await spotifyFetch(path, { token })
    for (const entry of page.items || []) {
      // New playlist items API uses `item`; older `/tracks` used `track`
      const t = entry.item || entry.track
      if (!t?.id || entry.is_local || t.is_local) continue
      if (t.type && t.type !== 'track') continue
      tracks.push({
        spotifyId: t.id,
        uri: t.uri,
        title: t.name,
        artist: (t.artists || []).map((a) => a.name).join(', '),
        url: t.external_urls?.spotify || null,
        durationMs: t.duration_ms || null,
      })
    }
    url = page.next || null
  }

  return { ok: true, tracks }
}

export async function searchSpotifyTrack(title, artist) {
  if (!hasSpotifyReadConfig()) return null
  const token = await clientCredentialsToken()
  const q = artist ? `track:${title} artist:${artist}` : title
  const data = await spotifyFetch(
    `/search?q=${encodeURIComponent(q)}&type=track&limit=5`,
    { token },
  )
  const items = data.tracks?.items || []
  if (!items.length) return null
  const folded = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  const wantTitle = folded(title)
  const wantArtist = folded(artist)
  let best = items[0]
  let bestScore = -1
  for (const item of items) {
    let score = 0
    const t = folded(item.name)
    if (t === wantTitle) score += 5
    else if (t.includes(wantTitle) || wantTitle.includes(t)) score += 3
    if (wantArtist) {
      const artists = folded((item.artists || []).map((a) => a.name).join(' '))
      if (artists.includes(wantArtist) || wantArtist.includes(artists.split(' ')[0] || '')) score += 3
    }
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }
  return {
    spotifyId: best.id,
    uri: best.uri,
    title: best.name,
    artist: (best.artists || []).map((a) => a.name).join(', '),
  }
}

export async function addTrackToSpotifyPlaylist(spotifyUri) {
  if (!hasSpotifyWriteConfig()) {
    return { ok: false, reason: 'missing_spotify_refresh_token' }
  }
  const token = await userAccessToken()
  const id = spotifyPlaylistId()
  // Skip if already present
  const existing = await listSpotifyPlaylistTracks()
  if (existing.tracks.some((t) => t.uri === spotifyUri || `spotify:track:${t.spotifyId}` === spotifyUri)) {
    return { ok: true, status: 'duplicate' }
  }
  await spotifyFetch(`/playlists/${id}/items`, {
    method: 'POST',
    token,
    body: { uris: [spotifyUri] },
  })
  return { ok: true, status: 'added' }
}

export { hasSpotifyReadConfig, hasSpotifyWriteConfig }
