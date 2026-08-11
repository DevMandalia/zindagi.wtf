import { get, put } from '@vercel/blob'

const SUGGESTIONS_PATH = 'suggestions.json'
const COMMUNITY_PATH = 'community-tracks.json'

function token() {
  return process.env.BLOB_READ_WRITE_TOKEN
}

async function readJson(pathname, fallback) {
  try {
    const result = await get(pathname, {
      access: 'private',
      useCache: false,
      token: token(),
    })
    if (!result?.stream) return fallback
    const text = await new Response(result.stream).text()
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

async function writeJson(pathname, data) {
  await put(pathname, JSON.stringify(data, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    token: token(),
  })
}

export async function readSuggestions() {
  return readJson(SUGGESTIONS_PATH, { updatedAt: null, items: [] })
}

export async function writeSuggestions(data) {
  data.updatedAt = new Date().toISOString()
  await writeJson(SUGGESTIONS_PATH, data)
}

export async function readCommunityTracks() {
  return readJson(COMMUNITY_PATH, { updatedAt: null, tracks: [] })
}

export async function writeCommunityTracks(data) {
  data.updatedAt = new Date().toISOString()
  await writeJson(COMMUNITY_PATH, data)
}
