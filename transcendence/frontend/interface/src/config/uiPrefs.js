export const PREFS_STORAGE_KEY = 'transcendence_ui_prefs'

/**
 * Pas de thème global clair/sombre ici : réservé à la future DA par coalition.
 *
 * Clés disponibles :
 *  - reduceMotion         : supprime toutes les animations (accessibilité stricte)
 *  - lightMode            : mode léger — désactive particules/parallax/glow (performance)
 *  - showScrollbars       : rend les barres de défilement visibles
 *  - hideInviteToasts     : masque les toasts d'invitation de partie (badge chat conservé)
 */
const defaultPrefs = {
	reduceMotion: false,
	lightMode: false,
	showScrollbars: false,
	hideInviteToasts: false,
}

export function loadUiPrefs() {
	try {
		const raw = localStorage.getItem(PREFS_STORAGE_KEY)
		if (!raw) return { ...defaultPrefs }
		const parsed = { ...defaultPrefs, ...JSON.parse(raw) }
		/* Anciennes clés ignorées */
		delete parsed.theme
		delete parsed.notificationsEnabled
		/* Normalisation des booléens */
		parsed.reduceMotion = Boolean(parsed.reduceMotion)
		parsed.lightMode = Boolean(parsed.lightMode)
		parsed.showScrollbars = Boolean(parsed.showScrollbars)
		parsed.hideInviteToasts = Boolean(parsed.hideInviteToasts)
		return parsed
	} catch {
		return { ...defaultPrefs }
	}
}

/** Applique les flags neutres sur l'élément <html> sans toucher aux couleurs coalition. */
export function applyDocumentUiPrefs() {
	const p = loadUiPrefs()
	const root = document.documentElement

	if (p.reduceMotion) root.setAttribute('data-reduce-motion', 'true')
	else root.removeAttribute('data-reduce-motion')

	if (p.lightMode) root.setAttribute('data-light-mode', 'true')
	else root.removeAttribute('data-light-mode')

	if (p.showScrollbars) root.setAttribute('data-show-scrollbars', 'true')
	else root.removeAttribute('data-show-scrollbars')
}

export function notifyPrefsChanged() {
	window.dispatchEvent(new CustomEvent('transcendence-prefs-changed'))
}
