import { useEffect, useLayoutEffect, useRef } from 'react'
import { loadGameAudioPrefs, effectiveBgmVolume } from '../config/gameAudioPrefs.js'
import { registerHomeBgmElement, unregisterHomeBgmElement } from '../audio/homeBgm.js'

const HOME_BGM_SRC = `${import.meta.env.BASE_URL}sounds/home/Under_the_Glass_Canopy.mp3`.replace(
	/([^:]\/)\/+/g,
	'$1',
)

/**
 * Piste home souvent mixée plus bas que le BGM jeu : léger gain (plafonné à 1) sans toucher au curseur global.
 */
const HOME_BGM_EXTRA_GAIN = 1.65

const TOUCH_OPTS = { passive: true, capture: true }

/** Musique d’accueil : boucle, prefs partagées + gain home, lecture déclenchée sur le même nœud Audio que le geste. */
export function HomeAmbientBgm() {
	const audioRef = useRef(null)

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

		const applyPrefs = () => {
			const p = loadGameAudioPrefs()
			audio.muted = p.bgmMuted
			if (p.bgmMuted) {
				audio.volume = 0
			} else {
				const base = effectiveBgmVolume(p)
				audio.volume = Math.min(1, base * HOME_BGM_EXTRA_GAIN)
			}
		}
		applyPrefs()

		const onPrefs = () => applyPrefs()
		window.addEventListener('transcendence-game-audio-changed', onPrefs)

		/** Même instance que dans l’effet : évite tout décalage avec `registerHomeBgm` / StrictMode. */
		const tryPlay = () => {
			const playPromise = audio.play()
			if (playPromise !== undefined) {
				playPromise.catch((err) => {
					if (import.meta.env.DEV) {
						console.warn('[home-bgm] play()', err?.message ?? err)
					}
				})
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

	return null
}
