/**
 * YouTube Data API playlist helpers.
 * List public playlists: API key OR OAuth.
 * Insert into playlist: requires YOUTUBE_REFRESH_TOKEN.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://www.googleapis.com/youtube/v3'

function hasYoutubeReadConfig() {
  return Boolean(process.env.YOUTUBE_API_KEY || (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_REFRESH_TOKEN))
}

function hasYoutubeWriteConfig() {
  return Boolean(
    process.env.YOUTUBE_CLIENT_ID &&
      process.env.YOUTUBE_CLIENT_SECRET &&
      process.env.YOUTUBE_REFRESH_TOKEN,
  )
}

export function youtubePlaylistId() {
  return process.env.YOUTUBE_PLAYLIST_ID || 'PLUvh2lQtfqSw'
}

async function youtubeAccessToken() {
  const body = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET,
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`YouTube refresh: ${data.error || res.status}`)
  return data.access_token
}

async function ytFetch(path, { method = 'GET', token, apiKey, body } = {}) {
  const url = new URL(`${API}${path}`)
  if (apiKey) url.searchParams.set('key', apiKey)
  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data.error || data) || res.status
    throw new Error(`YouTube ${method} ${path}: ${msg}`)
  }
  return data
}

export async function listYoutubePlaylistVideoIds() {
  if (!hasYoutubeReadConfig()) {
    return { ok: false, reason: 'missing_youtube_credentials', ids: [] }
  }

  const token = hasYoutubeWriteConfig() ? await youtubeAccessToken() : null
  const apiKey = !token ? process.env.YOUTUBE_API_KEY : null
  const playlistId = youtubePlaylistId()
  const ids = []
  let pageToken = ''

  do {
    const params = new URLSearchParams({
      part: 'contentDetails',
      playlistId,
      maxResults: '50',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const data = await ytFetch(`/playlistItems?${params}`, { token, apiKey })
    for (const item of data.items || []) {
      const id = item.contentDetails?.videoId
      if (id) ids.push(id)
    }
    pageToken = data.nextPageToken || ''
  } while (pageToken)

  return { ok: true, ids }
}

export async function addVideoToYoutubePlaylist(videoId) {
  if (!hasYoutubeWriteConfig()) {
    return { ok: false, reason: 'missing_youtube_refresh_token' }
  }
  const token = await youtubeAccessToken()
  const playlistId = youtubePlaylistId()

  const existing = await listYoutubePlaylistVideoIds()
  if (existing.ids.includes(videoId)) {
    return { ok: true, status: 'duplicate' }
  }

  await ytFetch('/playlistItems?part=snippet', {
    method: 'POST',
    token,
    body: {
      snippet: {
        playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId,
        },
      },
    },
  })
  return { ok: true, status: 'added' }
}

export { hasYoutubeReadConfig, hasYoutubeWriteConfig }
