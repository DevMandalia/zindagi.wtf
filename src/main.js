import './style.css'
import { tracks } from './tracks.js'

const SPOTIFY_URL = 'https://open.spotify.com/playlist/37i9dQZF1FwQHrJc6k5MR5?si=2b98c57f091646cd'
const YT_MUSIC_URL = 'https://music.youtube.com/playlist?list=PLUvh2lQtfqSw&si=jW6HnGvpGOshrDpL'

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
  return { hours, minutes: pad2(minutes), ampm }
}

const initialOnline = 18 + Math.floor(Math.random() * 22)

document.querySelector('#app').innerHTML = `
  <main class="main">
    <div class="hero-bg" aria-hidden="true">
      <div class="hero-bg__shade"></div>
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
      ${
        SPOTIFY_URL
          ? `<a href="${SPOTIFY_URL}" target="_blank" rel="noopener noreferrer" aria-label="Open on Spotify">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg>
              <span>Spotify</span>
              <span class="arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </a>`
          : ''
      }
      ${
        YT_MUSIC_URL
          ? `<a href="${YT_MUSIC_URL}" target="_blank" rel="noopener noreferrer" aria-label="Open on YouTube Music">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/></svg>
              <span>YT Music</span>
              <span class="arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </a>`
          : ''
      }
    </div>

    <div class="brand-wrap">
      <h1 class="logo">ज़िंदगी</h1>
    </div>

    <div class="player-wrap">
      <div class="player">
        <div class="player-slot" id="player"></div>
        <div class="player-bar">
          <div class="vinyl">
            <div class="vinyl__disc" id="vinyl-disc">
              <img id="cover-img" src="${coverUrl(tracks[0].youtubeId)}" alt="" />
            </div>
            <div class="vinyl__hub"></div>
          </div>

          <div class="meta">
            <p class="meta__title" id="track-title">${tracks[0].title}</p>
            <p class="meta__artist" id="track-artist">${tracks[0].artist}</p>
            <div class="seek">
              <div class="seek__bar" id="seek-bar" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <div class="seek__track"><div class="seek__fill" id="seek-fill"></div></div>
                <div class="seek__thumb" id="seek-thumb"></div>
              </div>
              <div class="seek__time"><span id="time-current">0:00</span> / <span id="time-duration">0:00</span></div>
            </div>
          </div>

          <div class="controls">
            <button type="button" class="ctrl" id="prev-btn" aria-label="Previous track">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button type="button" class="ctrl ctrl--play" id="play-btn" aria-label="Play" aria-pressed="false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" id="play-icon"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button type="button" class="ctrl" id="next-btn" aria-label="Next track">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 6h2v12h-2zm-2 6L5.5 6v12z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
`

const PLAY_PATH = '<path d="M8 5v14l11-7z"/>'
const PAUSE_PATH = '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>'

let player = null
let ready = false
let index = 0
let playing = false
let duration = 0
let raf = 0

const clockEl = document.getElementById('clock')
const onlineEl = document.getElementById('online-count')
const coverImg = document.getElementById('cover-img')
const vinylDisc = document.getElementById('vinyl-disc')
const trackTitle = document.getElementById('track-title')
const trackArtist = document.getElementById('track-artist')
const playBtn = document.getElementById('play-btn')
const playIcon = document.getElementById('play-icon')
const seekBar = document.getElementById('seek-bar')
const seekFill = document.getElementById('seek-fill')
const seekThumb = document.getElementById('seek-thumb')
const timeCurrent = document.getElementById('time-current')
const timeDuration = document.getElementById('time-duration')

function updateClock() {
  const { hours, minutes, ampm } = currentClockParts()
  clockEl.innerHTML = `${hours}<span class="clock__blink">:</span>${minutes}<span class="clock__ampm">${ampm}</span>`
}

function bumpOnline() {
  const current = Number(onlineEl.textContent) || initialOnline
  const next = Math.max(9, Math.min(64, current + (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 2))))
  onlineEl.textContent = String(next)
}

function setPlayingUI(isPlaying) {
  playing = isPlaying
  vinylDisc.classList.toggle('is-spinning', isPlaying)
  playBtn.setAttribute('aria-pressed', String(isPlaying))
  playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play')
  playIcon.innerHTML = isPlaying ? PAUSE_PATH : PLAY_PATH
}

function syncTrackUI() {
  const track = tracks[index]
  coverImg.src = coverUrl(track.youtubeId)
  coverImg.alt = `${track.title} artwork`
  trackTitle.textContent = track.title
  trackArtist.textContent = track.artist
}

function setProgress(current, total) {
  duration = total || 0
  const pct = total > 0 ? (current / total) * 100 : 0
  seekFill.style.width = `${pct}%`
  seekThumb.style.left = `${pct}%`
  seekBar.setAttribute('aria-valuenow', String(Math.round(pct)))
  timeCurrent.textContent = formatTime(current)
  timeDuration.textContent = formatTime(total)
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
}

function stopProgress() {
  cancelAnimationFrame(raf)
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
        },
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setPlayingUI(true)
            startProgress()
          }
          if (event.data === window.YT.PlayerState.PAUSED) {
            setPlayingUI(false)
            stopProgress()
          }
          if (event.data === window.YT.PlayerState.ENDED) {
            playIndex((index + 1) % tracks.length, true)
          }
        },
      },
    })
  })

  return player
}

async function playIndex(nextIndex, forceLoad = false) {
  index = nextIndex
  syncTrackUI()
  setProgress(0, 0)

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

function seekToEvent(event) {
  if (!player || !ready || !duration) return
  const rect = seekBar.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const next = duration * ratio
  player.seekTo(next, true)
  setProgress(next, duration)
}

playBtn.addEventListener('click', () => togglePlay())
document.getElementById('prev-btn').addEventListener('click', () => {
  playIndex((index - 1 + tracks.length) % tracks.length, true)
})
document.getElementById('next-btn').addEventListener('click', () => {
  playIndex((index + 1) % tracks.length, true)
})
seekBar.addEventListener('click', seekToEvent)

document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, textarea')) return
  if (event.code === 'Space') {
    event.preventDefault()
    togglePlay()
  }
  if (event.code === 'ArrowRight') playIndex((index + 1) % tracks.length, true)
  if (event.code === 'ArrowLeft') playIndex((index - 1 + tracks.length) % tracks.length, true)
})

updateClock()
setInterval(updateClock, 1000)
setInterval(bumpOnline, 12000 + Math.floor(Math.random() * 8000))
syncTrackUI()
