/**
 * Référence globale à l’élément Audio BGM pour déclencher play() après un geste utilisateur
 * (échiquier, bouton volume, etc.).
 */
let bgmElement = null

export function registerGameBgmElement(el) {
	bgmElement = el
}

export function unregisterGameBgmElement(el) {
	if (bgmElement === el) bgmElement = null
}

export function tryPlayGameBgm() {
	if (!bgmElement) return Promise.resolve()
	return bgmElement.play().catch(() => {})
}
