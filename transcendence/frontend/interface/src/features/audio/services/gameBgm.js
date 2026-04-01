/**
 * Référence globale à l’élément Audio BGM pour déclencher play() après un geste utilisateur
 * (échiquier, bouton volume, etc.).
 */
import { loadGameAudioPrefs, effectiveBgmVolume } from '../../../config/gameAudioPrefs.js'
import { cancelGameBgmFade, fadeGameBgmTo, FADE_IN_MS } from './audioFade.js'

let bgmElement = null

export function registerGameBgmElement(el) {
	bgmElement = el
}

export function unregisterGameBgmElement(el) {
	if (bgmElement === el) bgmElement = null
}

export function tryPlayGameBgm() {
	if (!bgmElement) return Promise.resolve()
	const p = loadGameAudioPrefs()
	if (p.bgmMuted) {
		cancelGameBgmFade()
		bgmElement.volume = 0
		return bgmElement.play().catch(() => {})
	}
	cancelGameBgmFade()
	const target = effectiveBgmVolume(p)
	bgmElement.volume = 0
	return bgmElement
		.play()
		.then(() => fadeGameBgmTo(bgmElement, target, FADE_IN_MS, 0))
		.then(() => {})
		.catch(() => {})
}
