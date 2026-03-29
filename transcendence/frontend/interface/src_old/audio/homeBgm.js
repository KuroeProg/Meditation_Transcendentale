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
	return homeBgmElement.play().catch(() => {})
}
