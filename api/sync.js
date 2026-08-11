import { syncPlaylists } from './_lib/sync.js'

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body, null, 2))
}

function readSecret(req) {
  const header = req.headers['x-zindagi-secret'] || req.headers['authorization'] || ''
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim()
  }
  if (typeof header === 'string' && header.trim()) return header.trim()
  try {
    const url = new URL(req.url || '', 'http://localhost')
    return url.searchParams.get('secret') || ''
  } catch {
    return ''
  }
}

function authorized(req) {
  const expected = process.env.SYNC_SECRET || process.env.SUGGESTIONS_SECRET
  if (!expected) return false
  return readSecret(req) === expected
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-zindagi-secret')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    send(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  if (!authorized(req)) {
    send(res, 401, { ok: false, error: 'Unauthorized' })
    return
  }

  const url = new URL(req.url || '', 'http://localhost')
  const dryRun = url.searchParams.get('dry') === '1' || url.searchParams.get('dryRun') === '1'

  try {
    const report = await syncPlaylists({ dryRun })
    send(res, 200, { ok: true, report })
  } catch (error) {
    send(res, 500, { ok: false, error: String(error?.message || error) })
  }
}
