import { findDuplicate, listKnownKeys, normalizeKey, slugify, uniqueCommunityId } from './_lib/catalog.js'
import { normalizeAlias, pickAlias } from '../shared/aliases.js'
import { readCommunityTracks, readSuggestions, writeCommunityTracks, writeSuggestions } from './_lib/store.js'
import { fanOutSuggestion } from './_lib/sync.js'
import { lookupTrack } from './_lib/youtube.js'

const MAX_TITLE = 80
const MAX_ARTIST = 80
const COOLDOWN_MS = 45_000

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 8_000) {
        reject(new Error('Body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8') || '{}'
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

function clean(text, max) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  let body
  try {
    body = await readBody(req)
  } catch {
    send(res, 400, { ok: false, error: 'Invalid JSON' })
    return
  }

  if (body.website || body.company) {
    send(res, 200, { ok: true, status: 'queued' })
    return
  }

  const title = clean(body.title, MAX_TITLE)
  const artist = clean(body.artist, MAX_ARTIST)
  if (title.length < 2) {
    send(res, 400, { ok: false, error: 'Add a song title.' })
    return
  }

  const ip = clientIp(req)
  const now = Date.now()
  const alias = normalizeAlias(body.alias) || pickAlias(`${ip}:${now}`)

  try {
    const suggestions = await readSuggestions()
    const community = await readCommunityTracks()
    const items = Array.isArray(suggestions.items) ? suggestions.items : []
    const communityTracks = Array.isArray(community.tracks) ? community.tracks : []

    const recent = items.find((item) => item.ip === ip && now - Date.parse(item.createdAt || 0) < COOLDOWN_MS)
    if (recent) {
      send(res, 429, { ok: false, error: 'Give it a minute — one suggestion at a time.' })
      return
    }

    const { ids, youtubeIds, catalog } = listKnownKeys(communityTracks)

    const suggestion = {
      id: `sug_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      artist,
      alias,
      createdAt: new Date().toISOString(),
      ip,
      status: 'pending',
      youtubeId: null,
      trackId: null,
      lookupSource: null,
      lookupScore: null,
    }

    const dup = findDuplicate(title, artist, catalog)
    if (dup) {
      suggestion.status = 'duplicate'
      suggestion.trackId = dup.id
      suggestion.youtubeId = dup.youtubeId || null
      items.unshift(suggestion)
      suggestions.items = items.slice(0, 500)
      await writeSuggestions(suggestions)
      send(res, 200, { ok: true, status: 'duplicate', message: 'Already in the night.' })
      return
    }

    // Also catch near-dupes already sitting unresolved/added in the queue
    const queuedDup = items.find(
      (item) =>
        (item.status === 'added' || item.status === 'unresolved' || item.status === 'duplicate') &&
        normalizeKey(item.title, item.artist) === normalizeKey(title, artist),
    )
    if (queuedDup?.status === 'unresolved') {
      suggestion.status = 'duplicate'
      items.unshift(suggestion)
      suggestions.items = items.slice(0, 500)
      await writeSuggestions(suggestions)
      send(res, 200, {
        ok: true,
        status: 'queued',
        message: 'Already saved — still looking for a playable version.',
      })
      return
    }

    const match = await lookupTrack(title, artist)
    if (match?.youtubeId) {
      suggestion.youtubeId = match.youtubeId
      suggestion.lookupSource = match.source || null
      suggestion.lookupScore = match.score ?? null

      if (youtubeIds.has(match.youtubeId)) {
        suggestion.status = 'duplicate'
        items.unshift(suggestion)
        suggestions.items = items.slice(0, 500)
        await writeSuggestions(suggestions)
        send(res, 200, { ok: true, status: 'duplicate', message: 'Already in the night.' })
        return
      }

      const trackId = uniqueCommunityId(slugify(`${title}-${artist || match.artist || 'track'}`), ids)
      const track = {
        id: trackId,
        title: title || match.title,
        artist: artist || match.artist || 'Unknown',
        film: '',
        youtubeId: match.youtubeId,
        chapter: 'back',
        whisper: 'A song from the room.',
        alias,
        community: true,
        source: 'suggest',
        suggestedAt: suggestion.createdAt,
      }

      communityTracks.push(track)
      suggestion.status = 'added'
      suggestion.trackId = trackId

      let fanout = null
      try {
        fanout = await fanOutSuggestion({
          title: track.title,
          artist: track.artist,
          youtubeId: track.youtubeId,
        })
        suggestion.fanout = fanout
      } catch (error) {
        suggestion.fanout = { error: String(error?.message || error) }
      }

      items.unshift(suggestion)
      suggestions.items = items.slice(0, 500)
      await writeSuggestions(suggestions)
      await writeCommunityTracks({ tracks: communityTracks })

      send(res, 200, {
        ok: true,
        status: 'added',
        message: `Caught in the storm — ${alias}.`,
        alias,
        track,
        fanout,
      })
      return
    }

    suggestion.status = 'unresolved'
    items.unshift(suggestion)
    suggestions.items = items.slice(0, 500)
    await writeSuggestions(suggestions)

    send(res, 200, {
      ok: true,
      status: 'queued',
      message: `Saved as ${alias} — still looking for a playable version.`,
      alias,
    })
  } catch (error) {
    send(res, 500, {
      ok: false,
      error: 'Could not save suggestion.',
      detail: String(error?.message || error),
    })
  }
}
