import './style.css'
import { tracks as CORE_TRACKS } from './tracks.js'
import { isValidAlias, normalizeAlias, pickAlias, isCommunityTrack } from '../shared/aliases.js'

const SPOTIFY_URL = 'https://open.spotify.com/playlist/58RxFrb0cLd6jM1JzKNp2x?si=d222ff4bb8de4fa4'
const YT_MUSIC_URL = 'https://music.youtube.com/playlist?list=PLUvh2lQtfqSw&si=jW6HnGvpGOshrDpL'
const GITHUB_URL = 'https://github.com/DevMandalia/zindagi.wtf'
const STORAGE_KEY = 'zindagi.player.v1'
const ALIAS_KEY = 'zindagi.alias'
const tracks = [...CORE_TRACKS]

function getVisitorAlias() {
  try {
    const savedAlias = normalizeAlias(localStorage.getItem(ALIAS_KEY) || '')
    if (savedAlias) return savedAlias
  } catch {
    /* private mode */
  }
  const seed =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  const alias = pickAlias(seed)
  try {
    localStorage.setItem(ALIAS_KEY, alias)
  } catch {
    /* ignore */
  }
  return alias
}

const visitorAlias = getVisitorAlias()

function coverUrl(youtubeId) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function currentClockParts() {
  const now = new Date()
  let hours = now.getHours()
  const minutes = now.getMinutes()
  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12 || 12
  return { hours, minutes: pad2(minutes), ampm, rawHours: now.getHours() }
}

function isLateHour(rawHours = new Date().getHours()) {
  return rawHours >= 0 && rawHours < 5
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveState(partial) {
  const next = { ...loadState(), ...partial, updatedAt: Date.now() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
}

function trackIndexById(id) {
  if (!id) return -1
  return tracks.findIndex((t) => t.id === id)
}

const saved = loadState()
const params = new URLSearchParams(window.location.search)
const deepId = params.get('t')
const deepIndex = trackIndexById(deepId)
const initialOnline = 18 + Math.floor(Math.random() * 22)

let index =
  deepIndex >= 0
    ? deepIndex
    : Math.min(Math.max(0, Number(saved.index) || 0), tracks.length - 1)
let shuffle = Boolean(saved.shuffle)
let loop = Boolean(saved.loop)
let restoreSeek = deepIndex >= 0 ? 0 : Number(saved.seek) || 0

document.querySelector('#app').innerHTML = `
  <main class="main">
    <div class="hero-bg" aria-hidden="true">
      <div class="hero-bg__light" id="street-light"></div>
      <div class="hero-bg__shade"></div>
      <div class="rain" id="rain"></div>
    </div>

    <div class="clock" id="clock" aria-hidden="true"></div>

    <div class="online" aria-live="polite">
      <span class="online__dot-wrap">
        <span class="online__ping"></span>
        <span class="online__dot"></span>
      </span>
      <span class="online__count" id="online-count">${initialOnline}</span>
      <span class="online__label">online</span>
    </div>

    <div class="top-links">
      <button type="button" class="top-links__suggest" id="suggest-open" aria-label="Suggest a song">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
        </svg>
      </button>
      ${
        SPOTIFY_URL
          ? `<a href="${SPOTIFY_URL}" target="_blank" rel="noopener noreferrer" aria-label="Open on Spotify">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            </a>`
          : ''
      }
      ${
        YT_MUSIC_URL
          ? `<a href="${YT_MUSIC_URL}" target="_blank" rel="noopener noreferrer" aria-label="Open on YouTube Music">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/></svg>
            </a>`
          : ''
      }
      ${
        GITHUB_URL
          ? `<a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer" aria-label="View source on GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            </a>`
          : ''
      }
    </div>

    <div class="brand-wrap">
      <h1 class="logo">ज़िंदगी</h1>
    </div>

    <div class="player-wrap">
      <div class="player" id="player-shell">
        <div class="player-slot" id="player"></div>
        <div class="player-bar">
          <button type="button" class="vinyl" id="vinyl" aria-label="Copy link to this song" title="Copy link">
            <div class="vinyl__disc" id="vinyl-disc">
              <img id="cover-img" src="${coverUrl(tracks[index].youtubeId)}" alt="" />
            </div>
            <div class="vinyl__hub"></div>
            <p class="vinyl__film" id="vinyl-film"></p>
          </button>

          <div class="meta">
            <p class="meta__title" id="track-title">${tracks[index].title}</p>
            <p class="meta__artist" id="track-artist">${tracks[index].artist}</p>
            <p class="meta__whisper" id="track-whisper">${tracks[index].whisper || ''}</p>
            <p class="meta__from" id="track-from" hidden></p>
            <div class="seek">
              <div class="seek__bar" id="seek-bar" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <div class="seek__track"><div class="seek__fill" id="seek-fill"></div></div>
                <div class="seek__thumb" id="seek-thumb"></div>
              </div>
              <div class="seek__time"><span id="time-current">0:00</span> / <span id="time-duration">0:00</span></div>
            </div>
          </div>

          <div class="controls">
            <button type="button" class="ctrl ctrl--mode ${shuffle ? 'is-on' : ''}" id="shuffle-btn" aria-label="Shuffle" aria-pressed="${shuffle}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
            </button>
            <button type="button" class="ctrl" id="prev-btn" aria-label="Previous track">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button type="button" class="ctrl ctrl--play" id="play-btn" aria-label="Play" aria-pressed="false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" id="play-icon"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button type="button" class="ctrl" id="next-btn" aria-label="Next track">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 6h2v12h-2zm-2 6L5.5 6v12z"/></svg>
            </button>
            <button type="button" class="ctrl ctrl--mode ${loop ? 'is-on' : ''}" id="loop-btn" aria-label="Loop track" aria-pressed="${loop}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="ticker" id="ticker" hidden aria-label="Recent songs from the room">
      <div class="ticker__viewport">
        <div class="ticker__track" id="ticker-track"></div>
      </div>
    </div>
  </main>

  <div class="storm" id="storm" hidden aria-live="polite">
    <div class="storm__flash" aria-hidden="true"></div>
    <svg class="storm__bolt" viewBox="0 0 64 120" aria-hidden="true">
      <path d="M38 2 14 62h18L22 118 54 48H34L50 2Z" />
    </svg>
    <p class="storm__line" id="storm-line"></p>
  </div>

  <div class="suggest" id="suggest-modal" hidden>
    <button type="button" class="suggest__backdrop" id="suggest-close-backdrop" aria-label="Close"></button>
    <div class="suggest__panel" role="dialog" aria-modal="true" aria-label="Suggest a song">
      <span class="suggest__stain" aria-hidden="true"></span>
      <span class="suggest__fold" aria-hidden="true"></span>
      <form class="suggest__form" id="suggest-form">
        <label class="suggest__field">
          <input class="suggest__input" id="suggest-song" name="title" type="text" maxlength="80" required autocomplete="off" placeholder="" aria-label="Song" />
        </label>
        <label class="suggest__field">
          <input class="suggest__input" id="suggest-artist" name="artist" type="text" maxlength="80" autocomplete="off" placeholder="" aria-label="Artist" />
        </label>
        <input class="suggest__hp" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <p class="suggest__status" id="suggest-status" role="status" aria-live="polite"></p>
        <div class="suggest__actions">
          <button type="button" class="suggest__cancel" id="suggest-close" aria-label="Cancel">×</button>
          <button type="submit" class="suggest__submit" id="suggest-submit" aria-label="Submit">→</button>
        </div>
      </form>
    </div>
  </div>
`

const PLAY_PATH = '<path d="M8 5v14l11-7z"/>'
const PAUSE_PATH = '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>'

let player = null
let ready = false
let playing = false
let duration = 0
let raf = 0
let persistTimer = 0
let pendingSeek = restoreSeek > 2 ? restoreSeek : 0

const clockEl = document.getElementById('clock')
const onlineEl = document.getElementById('online-count')
const coverImg = document.getElementById('cover-img')
const vinylEl = document.getElementById('vinyl')
const vinylDisc = document.getElementById('vinyl-disc')
const vinylFilm = document.getElementById('vinyl-film')
const playerShell = document.getElementById('player-shell')
let shareResetTimer = 0

function songShareUrl(track = tracks[index]) {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('t', track.id)
  return url.toString()
}

function setVinylOverlay(text, { copied = false } = {}) {
  vinylFilm.textContent = text || 'Copy link'
  vinylEl.classList.toggle('is-copied', copied)
  vinylEl.title = copied ? 'Link copied' : text && text !== 'Copy link' ? text : 'Copy link to this song'
}

async function copySongLink() {
  const track = tracks[index]
  const link = songShareUrl(track)
  try {
    await navigator.clipboard.writeText(link)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = link
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  setVinylOverlay('Copied', { copied: true })
  window.clearTimeout(shareResetTimer)
  shareResetTimer = window.setTimeout(() => {
    const film = tracks[index]?.film
    setVinylOverlay(film || 'Copy link')
  }, 1400)
}

const trackTitle = document.getElementById('track-title')
const trackArtist = document.getElementById('track-artist')
const trackWhisper = document.getElementById('track-whisper')
const trackFrom = document.getElementById('track-from')
const playBtn = document.getElementById('play-btn')
const playIcon = document.getElementById('play-icon')
const shuffleBtn = document.getElementById('shuffle-btn')
const loopBtn = document.getElementById('loop-btn')
const seekBar = document.getElementById('seek-bar')
const seekFill = document.getElementById('seek-fill')
const seekThumb = document.getElementById('seek-thumb')
const timeCurrent = document.getElementById('time-current')
const timeDuration = document.getElementById('time-duration')
const tickerEl = document.getElementById('ticker')
const tickerTrack = document.getElementById('ticker-track')
const stormEl = document.getElementById('storm')
const stormLine = document.getElementById('storm-line')
const rainEl = document.getElementById('rain')

function buildRain() {
  const rain = document.getElementById('rain')
  const drops = 56
  const frag = document.createDocumentFragment()
  for (let i = 0; i < drops; i++) {
    const drop = document.createElement('span')
    drop.className = 'rain__drop'
    drop.style.left = `${Math.random() * 100}%`
    drop.style.animationDuration = `${0.65 + Math.random() * 0.95}s`
    drop.style.animationDelay = `${-Math.random() * 2}s`
    drop.style.opacity = String(0.18 + Math.random() * 0.38)
    drop.style.height = `${14 + Math.random() * 22}px`
    drop.style.width = Math.random() > 0.85 ? '2px' : '1px'
    frag.appendChild(drop)
  }
  rain.appendChild(frag)
}

function scheduleStreetFlicker() {
  const light = document.getElementById('street-light')
  if (!light) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const burst = () => {
    const hits = 2 + Math.floor(Math.random() * 4)
    let i = 0
    const tick = () => {
      light.classList.add('is-flickering')
      const dim = 0.35 + Math.random() * 0.45
      light.style.setProperty('--flicker', String(dim))
      window.setTimeout(() => {
        light.classList.remove('is-flickering')
        light.style.removeProperty('--flicker')
        i += 1
        if (i < hits) {
          window.setTimeout(tick, 40 + Math.random() * 120)
        } else {
          window.setTimeout(burst, 2800 + Math.random() * 7200)
        }
      }, 45 + Math.random() * 90)
    }
    tick()
  }

  window.setTimeout(burst, 1200 + Math.random() * 2500)
}

function updateLateMode() {
  document.documentElement.classList.toggle('is-late', isLateHour())
}

function updateClock() {
  const { hours, minutes, ampm, rawHours } = currentClockParts()
  clockEl.innerHTML = `${hours}<span class="clock__blink">:</span>${minutes}<span class="clock__ampm">${ampm}</span>`
  document.documentElement.classList.toggle('is-late', isLateHour(rawHours))
}

function bumpOnline() {
  const current = Number(onlineEl.textContent) || initialOnline
  const next = Math.max(
    9,
    Math.min(64, current + (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 2))),
  )
  onlineEl.textContent = String(next)
}

function setPlayingUI(isPlaying) {
  playing = isPlaying
  vinylDisc.classList.toggle('is-spinning', isPlaying)
  playerShell.classList.toggle('is-playing', isPlaying)
  playBtn.setAttribute('aria-pressed', String(isPlaying))
  playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play')
  playIcon.innerHTML = isPlaying ? PAUSE_PATH : PLAY_PATH
}

function prefetchCover(i) {
  const track = tracks[i]
  if (!track) return
  const img = new Image()
  img.src = coverUrl(track.youtubeId)
}

function syncMediaSession() {
  if (!('mediaSession' in navigator)) return
  const track = tracks[index]
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.film || 'ज़िंदगी',
    artwork: [
      { src: coverUrl(track.youtubeId), sizes: '480x360', type: 'image/jpeg' },
      { src: coverUrl(track.youtubeId), sizes: '640x480', type: 'image/jpeg' },
    ],
  })
  navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
}

function syncTrackUI() {
  const track = tracks[index]
  coverImg.src = coverUrl(track.youtubeId)
  coverImg.alt = `${track.title} artwork`
  trackTitle.textContent = track.title
  trackArtist.textContent = track.artist
  trackWhisper.textContent = track.whisper || ''
  if (isCommunityTrack(track) && isValidAlias(track.alias)) {
    trackFrom.hidden = false
    trackFrom.textContent = `brought by ${track.alias}`
  } else {
    trackFrom.hidden = true
    trackFrom.textContent = ''
  }
  setVinylOverlay(track.film || 'Copy link')
  prefetchCover((index + 1) % tracks.length)
  syncMediaSession()
  history.replaceState(null, '', `${window.location.pathname}?t=${encodeURIComponent(track.id)}`)
  saveState({ index, shuffle, loop })
}

function setProgress(current, total) {
  duration = total || 0
  const pct = total > 0 ? (current / total) * 100 : 0
  seekFill.style.width = `${pct}%`
  seekThumb.style.left = `${pct}%`
  seekBar.setAttribute('aria-valuenow', String(Math.round(pct)))
  timeCurrent.textContent = formatTime(current)
  timeDuration.textContent = formatTime(total)
  if ('mediaSession' in navigator && total > 0) {
    try {
      navigator.mediaSession.setPositionState({
        duration: total,
        position: Math.min(current, total),
        playbackRate: 1,
      })
    } catch {
      /* ignore unsupported */
    }
  }
}

function persistProgress() {
  if (!player || !ready) return
  const current = player.getCurrentTime?.() || 0
  saveState({ index, seek: current, shuffle, loop })
}

function tickProgress() {
  if (!player || !playing) return
  const current = player.getCurrentTime?.() || 0
  const total = player.getDuration?.() || duration
  setProgress(current, total)
  raf = requestAnimationFrame(tickProgress)
}

function startProgress() {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(tickProgress)
  clearInterval(persistTimer)
  persistTimer = window.setInterval(persistProgress, 4000)
}

function stopProgress() {
  cancelAnimationFrame(raf)
  clearInterval(persistTimer)
  persistProgress()
}

function nextIndex() {
  if (shuffle && tracks.length > 1) {
    let n = index
    while (n === index) n = Math.floor(Math.random() * tracks.length)
    return n
  }
  return (index + 1) % tracks.length
}

function prevIndex() {
  if (shuffle && tracks.length > 1) {
    let n = index
    while (n === index) n = Math.floor(Math.random() * tracks.length)
    return n
  }
  return (index - 1 + tracks.length) % tracks.length
}

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve()
      return
    }
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
}

async function ensurePlayer() {
  if (player) return player
  await loadYouTubeAPI()

  player = await new Promise((resolve) => {
    const instance = new window.YT.Player('player', {
      height: '1',
      width: '1',
      videoId: tracks[index].youtubeId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: () => {
          ready = true
          resolve(instance)
          if (pendingSeek > 0) {
            instance.seekTo(pendingSeek, true)
            setProgress(pendingSeek, instance.getDuration?.() || 0)
            pendingSeek = 0
          }
        },
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setPlayingUI(true)
            startProgress()
            syncMediaSession()
          }
          if (event.data === window.YT.PlayerState.PAUSED) {
            setPlayingUI(false)
            stopProgress()
            syncMediaSession()
          }
          if (event.data === window.YT.PlayerState.ENDED) {
            if (loop) {
              playIndex(index, true, true)
            } else {
              playIndex(nextIndex(), true)
            }
          }
        },
        onError: () => {
          playIndex(nextIndex(), true)
        },
      },
    })
  })

  return player
}

async function playIndex(nextIdx, forceLoad = false, fromLoop = false) {
  index = nextIdx
  syncTrackUI()
  if (!fromLoop) setProgress(0, 0)

  const yt = await ensurePlayer()
  if (!ready) return

  const currentId = yt.getVideoData?.()?.video_id
  if (forceLoad || currentId !== tracks[index].youtubeId) {
    yt.loadVideoById(tracks[index].youtubeId)
  } else {
    yt.playVideo()
  }
}

async function togglePlay() {
  const yt = await ensurePlayer()
  if (!ready) return

  const state = yt.getPlayerState()
  if (state === window.YT.PlayerState.PLAYING) {
    yt.pauseVideo()
    return
  }
  if (state === window.YT.PlayerState.PAUSED) {
    yt.playVideo()
    return
  }
  await playIndex(index)
}

function seekToClientX(clientX) {
  if (!player || !ready || !duration) return
  const rect = seekBar.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  const next = duration * ratio
  player.seekTo(next, true)
  setProgress(next, duration)
  saveState({ index, seek: next, shuffle, loop })
}

playBtn.addEventListener('click', () => togglePlay())
vinylEl.addEventListener('click', () => {
  copySongLink()
})
document.getElementById('prev-btn').addEventListener('click', () => {
  playIndex(prevIndex(), true)
})
document.getElementById('next-btn').addEventListener('click', () => {
  playIndex(nextIndex(), true)
})
shuffleBtn.addEventListener('click', () => {
  shuffle = !shuffle
  shuffleBtn.classList.toggle('is-on', shuffle)
  shuffleBtn.setAttribute('aria-pressed', String(shuffle))
  saveState({ shuffle, loop, index })
})
loopBtn.addEventListener('click', () => {
  loop = !loop
  loopBtn.classList.toggle('is-on', loop)
  loopBtn.setAttribute('aria-pressed', String(loop))
  saveState({ shuffle, loop, index })
})
seekBar.addEventListener('click', (event) => seekToClientX(event.clientX))
seekBar.addEventListener('keydown', (event) => {
  if (!player || !ready || !duration) return
  const step = duration * 0.05
  const current = player.getCurrentTime?.() || 0
  if (event.code === 'ArrowRight') {
    event.preventDefault()
    const next = Math.min(duration, current + step)
    player.seekTo(next, true)
    setProgress(next, duration)
  }
  if (event.code === 'ArrowLeft') {
    event.preventDefault()
    const next = Math.max(0, current - step)
    player.seekTo(next, true)
    setProgress(next, duration)
  }
})

document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, textarea, [contenteditable="true"]')) return
  if (event.code === 'Space') {
    event.preventDefault()
    togglePlay()
  }
  if (event.code === 'ArrowRight' && !event.target.closest('#seek-bar')) {
    playIndex(nextIndex(), true)
  }
  if (event.code === 'ArrowLeft' && !event.target.closest('#seek-bar')) {
    playIndex(prevIndex(), true)
  }
})

if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => togglePlay())
  navigator.mediaSession.setActionHandler('pause', () => togglePlay())
  navigator.mediaSession.setActionHandler('previoustrack', () => playIndex(prevIndex(), true))
  navigator.mediaSession.setActionHandler('nexttrack', () => playIndex(nextIndex(), true))
  try {
    navigator.mediaSession.setActionHandler('share', () => copySongLink())
  } catch {
    /* share action unsupported */
  }
}

window.addEventListener('beforeunload', persistProgress)

function mergeCommunityTracks(extra) {
  if (!Array.isArray(extra) || !extra.length) return 0
  const known = new Set(tracks.map((t) => t.id))
  const yt = new Set(tracks.map((t) => t.youtubeId))
  let added = 0
  for (const track of extra) {
    if (!track?.id || !track?.youtubeId) continue
    if (known.has(track.id) || yt.has(track.youtubeId)) continue
    tracks.push(track)
    known.add(track.id)
    yt.add(track.youtubeId)
    added += 1
  }
  return added
}

let communityFeed = []

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderTicker(feed, { pulse = false } = {}) {
  communityFeed = Array.isArray(feed) ? feed.filter((item) => item?.alias && item?.title) : []
  if (!communityFeed.length) {
    tickerEl.hidden = true
    tickerTrack.innerHTML = ''
    return
  }

  const items = communityFeed.slice(0, 30)
  const padded =
    items.length >= 6 ? items : items.length >= 3 ? [...items, ...items] : [...items, ...items, ...items, ...items]
  const html = padded
    .map(
      (item) =>
        `<button type="button" class="ticker__item" data-track-id="${escapeHtml(item.id)}" title="Play ${escapeHtml(item.title)}">
          <span class="ticker__alias">${escapeHtml(item.alias)}</span>
          <span class="ticker__sep">added</span>
          <span class="ticker__song">${escapeHtml(item.title)}</span>
        </button>`,
    )
    .join('<span class="ticker__dot" aria-hidden="true">·</span>')

  // Duplicate for seamless marquee loop
  tickerTrack.innerHTML = `${html}<span class="ticker__dot" aria-hidden="true">·</span>${html}`
  tickerEl.hidden = false
  tickerEl.classList.toggle('is-pulse', pulse)
  if (pulse) {
    window.setTimeout(() => tickerEl.classList.remove('is-pulse'), 1600)
  }
}

tickerTrack.addEventListener('click', (event) => {
  const btn = event.target.closest('.ticker__item')
  if (!btn) return
  const id = btn.getAttribute('data-track-id')
  const i = trackIndexById(id)
  if (i < 0) return
  playIndex(i, true)
})

function playStorm(alias, { queued = false } = {}) {
  const name = normalizeAlias(alias) || visitorAlias
  stormLine.textContent = queued
    ? `Held in the rain — ${name}`
    : `Caught in the storm — ${name}`
  stormEl.hidden = false
  stormEl.classList.remove('is-on')
  // reflow so animation restarts
  void stormEl.offsetWidth
  stormEl.classList.add('is-on')
  rainEl?.classList.add('is-storm')
  document.body.classList.add('storm-active')

  window.setTimeout(() => {
    stormEl.classList.remove('is-on')
    stormEl.hidden = true
    rainEl?.classList.remove('is-storm')
    document.body.classList.remove('storm-active')
  }, 2200)
}

async function loadCommunityTracks({ silent = false } = {}) {
  try {
    const res = await fetch('/api/community-tracks', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    const before = communityFeed.map((f) => f.id).join('|')
    mergeCommunityTracks(data.tracks)
    const feed = Array.isArray(data.feed)
      ? data.feed
      : (data.tracks || []).filter((t) => isCommunityTrack(t) && t.alias)
    const after = feed.map((f) => f.id).join('|')
    renderTicker(feed, { pulse: silent && before && before !== after })
  } catch {
    /* offline / local vite without api */
  }
}

const suggestModal = document.getElementById('suggest-modal')
const suggestForm = document.getElementById('suggest-form')
const suggestStatus = document.getElementById('suggest-status')
const suggestSubmit = document.getElementById('suggest-submit')
const suggestOpen = document.getElementById('suggest-open')

function openSuggest() {
  suggestModal.hidden = false
  document.body.classList.add('suggest-open')
  suggestStatus.textContent = ''
  window.setTimeout(() => document.getElementById('suggest-song')?.focus(), 30)
}

function closeSuggest() {
  suggestModal.hidden = true
  document.body.classList.remove('suggest-open')
  suggestSubmit.disabled = false
}

suggestOpen.addEventListener('click', openSuggest)
document.getElementById('suggest-close').addEventListener('click', closeSuggest)
document.getElementById('suggest-close-backdrop').addEventListener('click', closeSuggest)
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !suggestModal.hidden) closeSuggest()
})

suggestForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const title = document.getElementById('suggest-song').value.trim()
  const artist = document.getElementById('suggest-artist').value.trim()
  const website = suggestForm.elements.website?.value || ''
  if (title.length < 2) {
    suggestStatus.textContent = 'Add a song title.'
    return
  }

  suggestSubmit.disabled = true
  suggestStatus.textContent = 'Looking it up…'

  try {
    const res = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, artist, website, alias: visitorAlias }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      suggestStatus.textContent = data.error || 'Couldn’t send that. Try again?'
      suggestSubmit.disabled = false
      return
    }

    const alias = normalizeAlias(data.alias) || visitorAlias
    closeSuggest()
    suggestForm.reset()

    if (data.status === 'added' && data.track) {
      mergeCommunityTracks([data.track])
      const nextFeed = [
        {
          id: data.track.id,
          title: data.track.title,
          artist: data.track.artist,
          alias: data.track.alias || alias,
          youtubeId: data.track.youtubeId,
          suggestedAt: data.track.suggestedAt,
        },
        ...communityFeed.filter((f) => f.id !== data.track.id),
      ]
      renderTicker(nextFeed, { pulse: true })
      playStorm(alias)
      syncTrackUI()
      return
    }

    if (data.status === 'queued') {
      playStorm(alias, { queued: true })
    }
  } catch {
    suggestStatus.textContent = 'Network hiccup — try again in a bit.'
    suggestSubmit.disabled = false
  }
})

buildRain()
scheduleStreetFlicker()
updateLateMode()
updateClock()
setInterval(updateClock, 1000)
setInterval(bumpOnline, 12000 + Math.floor(Math.random() * 8000))
setInterval(() => loadCommunityTracks({ silent: true }), 45000)
loadCommunityTracks().finally(() => {
  // Re-resolve deep link / saved index after community merge
  const still = tracks.findIndex((t) => t.id === tracks[index]?.id)
  if (still < 0) index = Math.min(index, tracks.length - 1)
  syncTrackUI()
  ensurePlayer().catch(() => {})
})
syncTrackUI()
ensurePlayer().catch(() => {})
