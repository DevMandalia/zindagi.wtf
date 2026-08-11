import { ensureTrackAliases, isCommunityTrack } from '../shared/aliases.js'

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'GET') {
    send(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const { readCommunityTracks, writeCommunityTracks } = await import('./_lib/store.js')
    const data = await readCommunityTracks()
    const tracks = Array.isArray(data.tracks) ? data.tracks : []

    if (ensureTrackAliases(tracks)) {
      try {
        await writeCommunityTracks({ tracks })
      } catch {
        /* read still succeeds even if backfill write fails */
      }
    }

    const feed = tracks
      .filter((t) => isCommunityTrack(t) && t.alias && t.title)
      .map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist || '',
        alias: t.alias,
        youtubeId: t.youtubeId || null,
        suggestedAt: t.suggestedAt || t.syncedAt || null,
      }))
      .sort((a, b) => Date.parse(b.suggestedAt || 0) - Date.parse(a.suggestedAt || 0))

    send(res, 200, {
      ok: true,
      updatedAt: data.updatedAt || null,
      tracks,
      feed,
    })
  } catch (error) {
    send(res, 500, { ok: false, error: 'Failed to load community tracks', detail: String(error?.message || error) })
  }
}
