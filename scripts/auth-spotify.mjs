#!/usr/bin/env node
/**
 * One-time Spotify OAuth (authorization code → refresh token).
 *
 * 1. Create an app at https://developer.spotify.com/dashboard
 * 2. Add redirect URI http://127.0.0.1:8732/callback
 * 3. Export SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET
 * 4. Run: node scripts/auth-spotify.mjs
 */
import http from 'node:http'
import { createInterface } from 'node:readline'

const PORT = 8732
const REDIRECT = `http://127.0.0.1:${PORT}/callback`
const SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private',
  'playlist-read-private',
].join(' ')

function ask(q) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(q, (a) => {
    rl.close()
    resolve(a.trim())
  }))
}

const clientId = process.env.SPOTIFY_CLIENT_ID || (await ask('SPOTIFY_CLIENT_ID: '))
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || (await ask('SPOTIFY_CLIENT_SECRET: '))

const authUrl = new URL('https://accounts.spotify.com/authorize')
authUrl.searchParams.set('client_id', clientId)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('redirect_uri', REDIRECT)
authUrl.searchParams.set('scope', SCOPES)

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
      res.end('<h1>Spotify connected</h1><p>You can close this tab.</p>')
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

const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT,
  }),
})
const tokens = await tokenRes.json()
if (!tokenRes.ok) {
  console.error(tokens)
  process.exit(1)
}

console.log('\nAdd these to Vercel / .env.local:\n')
console.log(`SPOTIFY_CLIENT_ID=${clientId}`)
console.log(`SPOTIFY_CLIENT_SECRET=${clientSecret}`)
console.log(`SPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}`)
console.log('SPOTIFY_PLAYLIST_ID=58RxFrb0cLd6jM1JzKNp2x')
