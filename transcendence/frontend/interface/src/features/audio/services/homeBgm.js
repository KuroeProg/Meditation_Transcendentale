import { loadGameAudioPrefs, effectiveBgmVolume } from '../../../config/gameAudioPrefs.js'

/** Aligné sur HomeAudio.jsx (boost home). */
const HOME_BGM_EXTRA_GAIN = 1.65

/** Référence à l’élément Audio BGM home pour débloquer la lecture après geste utilisateur. */
let homeBgmElement = null

export function registerHomeBgmElement(el) {
	homeBgmElement = el
}

export function unregisterHomeBgmElement(el) {
	if (homeBgmElement === el) homeBgmElement = null
}

export function tryPlayHomeBgm() {
	if (!homeBgmElement) return Promise.resolve()
	const p = loadGameAudioPrefs()
	homeBgmElement.muted = p.bgmMuted
	if (p.bgmMuted) {
		homeBgmElement.volume = 0
	} else {
		const base = effectiveBgmVolume(p)
		homeBgmElement.volume = Math.min(1, base * HOME_BGM_EXTRA_GAIN)
	}
	return homeBgmElement.play().catch(() => {})
}
