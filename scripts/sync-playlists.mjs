#!/usr/bin/env node
/**
 * Sync Spotify → YouTube Music playlist + site community tracks.
 *
 * Usage:
 *   node --env-file=.env.local scripts/sync-playlists.mjs
 *   node --env-file=.env.local scripts/sync-playlists.mjs --dry
 */
import { syncPlaylists } from '../api/_lib/sync.js'

const dryRun = process.argv.includes('--dry') || process.argv.includes('--dry-run')
const report = await syncPlaylists({ dryRun })
console.log(JSON.stringify(report, null, 2))
if (report.errors?.length) process.exitCode = 1
