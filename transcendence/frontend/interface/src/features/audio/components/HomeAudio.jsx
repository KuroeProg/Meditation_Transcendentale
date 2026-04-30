import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { loadGameAudioPrefs, effectiveHomeBgmVolume } from '../../../config/gameAudioPrefs.js'
import { registerHomeBgmElement, unregisterHomeBgmElement } from '../services/homeBgm.js'

const HOME_BGM_FILE = "Beth's Story.m4a"
const HOME_BGM_SRC = `${import.meta.env.BASE_URL}sounds/home/${encodeURIComponent(HOME_BGM_FILE)}`.replace(
	/([^:]\/)\/+/g,
	'$1',
)

/** Léger boost propre au contexte accueil (volume perçu plus doux que la musique de partie). */
const HOME_BGM_EXTRA_GAIN = 1.65

const TOUCH_OPTS = { passive: true, capture: true }

function applyHomeBgmVolume(audio) {
	const p = loadGameAudioPrefs()
	const muted = p.homeBgmMuted
	audio.muted = muted
	if (muted) {
		audio.volume = 0
	} else {
		const base = effectiveHomeBgmVolume(p)
		audio.volume = Math.min(1, base * HOME_BGM_EXTRA_GAIN)
	}
}

/** Musique d'ambiance : toutes les routes sauf `/game/*` (pause simple, pas de fondu). */
export function HomeAmbientBgm() {
	const audioRef = useRef(null)
	const location = useLocation()
	const mayPlayHomeRef = useRef(true)
	mayPlayHomeRef.current = !location.pathname.startsWith('/game/')

	useEffect(() => {
		const audio = new Audio()
		audio.src = HOME_BGM_SRC
		audio.preload = 'auto'
		audio.loop = true
		audio.setAttribute('playsInline', 'true')
		audioRef.current = audio
		registerHomeBgmElement(audio)
		applyHomeBgmVolume(audio)

		const tryPlay = () => {
			if (!mayPlayHomeRef.current) return
			applyHomeBgmVolume(audio)
			const p = audio.play()
			if (p !== undefined) {
				p.catch((err) => {
					const ignoredErrors = ['NotAllowedError', 'AbortError'];
					if (import.meta.env.DEV && !ignoredErrors.includes(err.name)) {
						console.warn('[HomeAmbientBgm] play()', err)
					}
				})
			}
		}

		const onPrefs = () => {
			applyHomeBgmVolume(audio)
			if (!mayPlayHomeRef.current) return
			if (!loadGameAudioPrefs().homeBgmMuted) {
				void tryPlay()
			}
		}
		window.addEventListener('transcendence-game-audio-changed', onPrefs)

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
		const onGame = location.pathname.startsWith('/game/')
		mayPlayHomeRef.current = !onGame
		if (onGame) {
			audio.pause()
			return undefined
		}
		applyHomeBgmVolume(audio)
		const p = loadGameAudioPrefs()
		if (!p.homeBgmMuted) {
			void audio.play().catch((err) => {
				// On ignore NotAllowedError (auto-play) et AbortError (navigation rapide)
				const ignoredErrors = ['NotAllowedError', 'AbortError'];
				if (import.meta.env.DEV && !ignoredErrors.includes(err.name)) {
					console.warn('[HomeAmbientBgm] play() après navigation', err)
				}
			})
		}
		return undefined
	}, [location.pathname])

	return null
}
