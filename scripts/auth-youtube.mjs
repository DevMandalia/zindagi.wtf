#!/usr/bin/env node
/**
 * One-time YouTube OAuth (authorization code → refresh token).
 *
 * 1. Google Cloud console → OAuth client (Desktop or Web)
 * 2. Enable YouTube Data API v3
 * 3. Redirect URI http://127.0.0.1:8733/callback
 * 4. Export YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET
 * 5. Run: node scripts/auth-youtube.mjs
 */
import http from 'node:http'
import { createInterface } from 'node:readline'

const PORT = 8733
const REDIRECT = `http://127.0.0.1:${PORT}/callback`
const SCOPE = 'https://www.googleapis.com/auth/youtube'

function ask(q) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(q, (a) => {
    rl.close()
    resolve(a.trim())
  }))
}

const clientId = process.env.YOUTUBE_CLIENT_ID || (await ask('YOUTUBE_CLIENT_ID: '))
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || (await ask('YOUTUBE_CLIENT_SECRET: '))

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.set('client_id', clientId)
authUrl.searchParams.set('redirect_uri', REDIRECT)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('access_type', 'offline')
authUrl.searchParams.set('prompt', 'consent')
authUrl.searchParams.set('scope', SCOPE)

console.log('\nOpen this URL, approve access:\n')
console.log(authUrl.toString(), '\n')

const code = await new Promise((resolve, reject) => {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
      if (url.pathname !== '/callback') {
        res.writeHead(404)
        res.end('Not found')
        return
      }
      const err = url.searchParams.get('error')
      if (err) throw new Error(err)
      const c = url.searchParams.get('code')
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<h1>YouTube connected</h1><p>You can close this tab.</p>')
      server.close()
      resolve(c)
    } catch (error) {
      res.writeHead(500)
      res.end(String(error))
      server.close()
      reject(error)
    }
  })
  server.listen(PORT, '127.0.0.1')
})

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT,
    grant_type: 'authorization_code',
  }),
})
const tokens = await tokenRes.json()
if (!tokenRes.ok) {
  console.error(tokens)
  process.exit(1)
}

console.log('\nAdd these to Vercel / .env.local:\n')
console.log(`YOUTUBE_CLIENT_ID=${clientId}`)
console.log(`YOUTUBE_CLIENT_SECRET=${clientSecret}`)
console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`)
console.log('YOUTUBE_PLAYLIST_ID=PLUvh2lQtfqSw')
console.log('\nOptional for read-only listing without OAuth: YOUTUBE_API_KEY=...')
