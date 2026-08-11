import { readSuggestions } from './_lib/store.js'

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-zindagi-secret')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'GET') {
    send(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  const expected = process.env.SUGGESTIONS_SECRET
  if (!expected) {
    send(res, 503, { ok: false, error: 'Suggestions digest is not configured.' })
    return
  }

  if (readSecret(req) !== expected) {
    send(res, 401, { ok: false, error: 'Unauthorized' })
    return
  }

  try {
    const data = await readSuggestions()
    const items = Array.isArray(data.items) ? data.items : []
    const unresolved = items.filter((i) => i.status === 'unresolved')
    const recent = items.slice(0, 40).map(({ ip, ...rest }) => rest)

    send(res, 200, {
      ok: true,
      updatedAt: data.updatedAt || null,
      totals: {
        all: items.length,
        unresolved: unresolved.length,
        added: items.filter((i) => i.status === 'added').length,
        duplicate: items.filter((i) => i.status === 'duplicate').length,
      },
      unresolved: unresolved.slice(0, 50).map(({ ip, ...rest }) => rest),
      recent,
    })
  } catch (error) {
    send(res, 500, { ok: false, error: 'Failed to read suggestions', detail: String(error?.message || error) })
  }
}
