import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { loadGameAudioPrefs, effectiveBgmVolume } from '../../../config/gameAudioPrefs.js'
import { registerHomeBgmElement, unregisterHomeBgmElement } from '../services/homeBgm.js'

const HOME_BGM_FILE = "Beth's Story.m4a"
const HOME_BGM_SRC = `${import.meta.env.BASE_URL}sounds/home/${encodeURIComponent(HOME_BGM_FILE)}`.replace(
	/([^:]\/)\/+/g,
	'$1',
)

/** Même courbe que l’historique du projet : léger boost sans toucher au curseur global. */
const HOME_BGM_EXTRA_GAIN = 1.65

const TOUCH_OPTS = { passive: true, capture: true }

function applyHomeBgmVolume(audio) {
	const p = loadGameAudioPrefs()
	audio.muted = p.bgmMuted
	if (p.bgmMuted) {
		audio.volume = 0
	} else {
		const base = effectiveBgmVolume(p)
		audio.volume = Math.min(1, base * HOME_BGM_EXTRA_GAIN)
	}
}

/** Musique d’ambiance : toutes les routes sauf `/game/*` (pause simple, pas de fondu). */
export function HomeAmbientBgm() {
	const audioRef = useRef(null)
	const location = useLocation()
	const isGameRouteRef = useRef(false)
	isGameRouteRef.current = location.pathname.startsWith('/game/')

	useLayoutEffect(() => {
		const audio = new Audio()
		audio.src = HOME_BGM_SRC
		audio.preload = 'auto'
		audio.loop = true
		audio.setAttribute('playsInline', 'true')
		audioRef.current = audio
		registerHomeBgmElement(audio)
		return () => {
			unregisterHomeBgmElement(audio)
			audio.pause()
			audio.removeAttribute('src')
			audio.load()
			audioRef.current = null
		}
	}, [])

	useEffect(() => {
		const audio = audioRef.current
		if (!audio) return undefined

		const applyPrefs = () => applyHomeBgmVolume(audio)
		applyPrefs()

		const onPrefs = () => applyPrefs()
		window.addEventListener('transcendence-game-audio-changed', onPrefs)

		const tryPlay = () => {
			if (isGameRouteRef.current) return
			applyHomeBgmVolume(audio)
			const playPromise = audio.play()
			if (playPromise !== undefined) {
				playPromise.catch(() => {})
			}
		}

		const onCanPlay = () => tryPlay()
		audio.addEventListener('canplay', onCanPlay)

		const unlock = () => tryPlay()
		document.addEventListener('pointerdown', unlock, true)
		document.addEventListener('keydown', unlock, true)
		document.addEventListener('touchstart', unlock, TOUCH_OPTS)

		const onVis = () => {
			if (!document.hidden) tryPlay()
		}
		document.addEventListener('visibilitychange', onVis)

		audio.load()

		return () => {
			window.removeEventListener('transcendence-game-audio-changed', onPrefs)
			document.removeEventListener('pointerdown', unlock, true)
			document.removeEventListener('keydown', unlock, true)
			document.removeEventListener('touchstart', unlock, TOUCH_OPTS)
			document.removeEventListener('visibilitychange', onVis)
			audio.removeEventListener('canplay', onCanPlay)
			audio.pause()
			audio.removeAttribute('src')
			audio.load()
		}
	}, [])

	useEffect(() => {
		const audio = audioRef.current
		if (!audio) return undefined
		const onGame = location.pathname.startsWith('/game/')
		isGameRouteRef.current = onGame
		if (onGame) {
			audio.pause()
			return undefined
		}
		applyHomeBgmVolume(audio)
		const p = loadGameAudioPrefs()
		if (!p.bgmMuted) {
			void audio.play().catch(() => {})
		}
		return undefined
	}, [location.pathname])

	return null
}
