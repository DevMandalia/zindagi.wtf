import { coreTracks, findDuplicate, listKnownKeys, slugify, uniqueCommunityId } from './catalog.js'
import { lookupTrack } from './youtube.js'
import { pickAlias } from '../../shared/aliases.js'
import {
  addTrackToSpotifyPlaylist,
  hasSpotifyReadConfig,
  hasSpotifyWriteConfig,
  listSpotifyPlaylistTracks,
  searchSpotifyTrack,
} from './spotify.js'
import {
  addVideoToYoutubePlaylist,
  hasYoutubeReadConfig,
  hasYoutubeWriteConfig,
  listYoutubePlaylistVideoIds,
} from './youtube-playlist.js'
import { readCommunityTracks, writeCommunityTracks } from './store.js'

function siteCatalog(communityTracks) {
  return [...coreTracks, ...communityTracks]
}

export async function fanOutSuggestion({ title, artist, youtubeId }) {
  const result = {
    spotify: { ok: false, status: 'skipped' },
    youtube: { ok: false, status: 'skipped' },
  }

  if (youtubeId && hasYoutubeWriteConfig()) {
    try {
      result.youtube = await addVideoToYoutubePlaylist(youtubeId)
    } catch (error) {
      result.youtube = { ok: false, status: 'error', error: String(error.message || error) }
    }
  } else if (!hasYoutubeWriteConfig()) {
    result.youtube = { ok: false, status: 'skipped', reason: 'missing_youtube_refresh_token' }
  }

  if (hasSpotifyWriteConfig()) {
    try {
      const hit = await searchSpotifyTrack(title, artist)
      if (!hit?.uri) {
        result.spotify = { ok: false, status: 'unresolved' }
      } else {
        result.spotify = await addTrackToSpotifyPlaylist(hit.uri)
        result.spotify.spotifyId = hit.spotifyId
      }
    } catch (error) {
      result.spotify = { ok: false, status: 'error', error: String(error.message || error) }
    }
  } else {
    result.spotify = { ok: false, status: 'skipped', reason: 'missing_spotify_refresh_token' }
  }

  return result
}

/**
 * Spotify → site (community blob) + YouTube playlist.
 * Adds missing tracks only; does not remove.
 */
export async function syncPlaylists({ dryRun = false } = {}) {
  const report = {
    dryRun,
    spotify: { configured: hasSpotifyReadConfig(), count: 0 },
    youtube: { configured: hasYoutubeReadConfig(), write: hasYoutubeWriteConfig(), count: 0 },
    site: { before: 0, after: 0, added: [] },
    youtubeAdded: [],
    youtubeUnresolved: [],
    errors: [],
  }

  if (!hasSpotifyReadConfig()) {
    report.errors.push('Spotify client id/secret required to read the source playlist.')
    return report
  }

  const spotify = await listSpotifyPlaylistTracks()
  if (!spotify.ok) {
    report.errors.push(spotify.reason || 'spotify_read_failed')
    return report
  }
  report.spotify.count = spotify.tracks.length

  let ytIds = []
  if (hasYoutubeReadConfig()) {
    try {
      const yt = await listYoutubePlaylistVideoIds()
      if (yt.ok) {
        ytIds = yt.ids
        report.youtube.count = ytIds.length
      } else {
        report.errors.push(yt.reason || 'youtube_read_failed')
      }
    } catch (error) {
      report.errors.push(`youtube_list: ${error.message || error}`)
    }
  }

  const community = await readCommunityTracks()
  const communityTracks = Array.isArray(community.tracks) ? community.tracks : []
  report.site.before = coreTracks.length + communityTracks.length

  const { ids, youtubeIds } = listKnownKeys(communityTracks)
  const usedIds = new Set(ids)
  const usedYt = new Set(youtubeIds)

  for (const sp of spotify.tracks) {
    const onSite = findDuplicate(sp.title, sp.artist, siteCatalog(communityTracks))
    let youtubeId = onSite?.youtubeId || null

    if (!onSite) {
      try {
        const match = await lookupTrack(sp.title, sp.artist)
        youtubeId = match?.youtubeId || null
        if (!youtubeId) {
          report.youtubeUnresolved.push({ title: sp.title, artist: sp.artist, spotifyId: sp.spotifyId })
        } else if (!dryRun && !usedYt.has(youtubeId)) {
          const trackId = uniqueCommunityId(slugify(`${sp.title}-${sp.artist || 'track'}`), usedIds)
          const alias = pickAlias(trackId)
          const track = {
            id: trackId,
            title: sp.title,
            artist: sp.artist || 'Unknown',
            film: '',
            youtubeId,
            chapter: 'back',
            whisper: 'A song from the room.',
            alias,
            community: true,
            spotifyId: sp.spotifyId,
            source: 'sync',
            syncedAt: new Date().toISOString(),
            suggestedAt: new Date().toISOString(),
          }
          communityTracks.push(track)
          usedIds.add(trackId)
          usedYt.add(youtubeId)
          report.site.added.push({ id: trackId, title: sp.title, youtubeId })
        } else if (dryRun && youtubeId && !usedYt.has(youtubeId)) {
          report.site.added.push({ id: '(dry)', title: sp.title, youtubeId })
        }
      } catch (error) {
        report.errors.push(`lookup ${sp.title}: ${error.message || error}`)
      }
    }

    if (youtubeId && hasYoutubeWriteConfig() && !ytIds.includes(youtubeId)) {
      if (dryRun) {
        report.youtubeAdded.push({ title: sp.title, youtubeId, status: 'would_add' })
      } else {
        try {
          const added = await addVideoToYoutubePlaylist(youtubeId)
          if (added.status === 'added') {
            ytIds.push(youtubeId)
            report.youtubeAdded.push({ title: sp.title, youtubeId, status: 'added' })
          }
        } catch (error) {
          report.errors.push(`yt add ${sp.title}: ${error.message || error}`)
        }
      }
    }
  }

  if (!dryRun && report.site.added.length) {
    await writeCommunityTracks({ tracks: communityTracks })
  }

  report.site.after = coreTracks.length + communityTracks.length
  report.youtube.count = ytIds.length || report.youtube.count
  report.capabilities = {
    spotifyRead: hasSpotifyReadConfig(),
    spotifyWrite: hasSpotifyWriteConfig(),
    youtubeRead: hasYoutubeReadConfig(),
    youtubeWrite: hasYoutubeWriteConfig(),
  }
  return report
}
