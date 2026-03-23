export const PREFS_STORAGE_KEY = 'transcendence_ui_prefs'

/** Pas de thème global clair/sombre ici : réservé à la future DA par coalition (sidebar, fonds, accents). */
const defaultPrefs = {
	reduceMotion: false,
	notificationsEnabled: true,
}

export function loadUiPrefs() {
	try {
		const raw = localStorage.getItem(PREFS_STORAGE_KEY)
		if (!raw) return { ...defaultPrefs }
		const parsed = { ...defaultPrefs, ...JSON.parse(raw) }
		// Ancienne clé "theme" ignorée — ne pas recolorer toute l’app par-dessus les coalitions
		delete parsed.theme
		return parsed
	} catch {
		return { ...defaultPrefs }
	}
}

/** Applique uniquement des flags neutres (ex. mouvement), sans toucher aux couleurs de marque / coalition. */
export function applyDocumentUiPrefs() {
	const p = loadUiPrefs()
	const root = document.documentElement
	if (p.reduceMotion) root.setAttribute('data-reduce-motion', 'true')
	else root.removeAttribute('data-reduce-motion')
}

export function notifyPrefsChanged() {
	window.dispatchEvent(new CustomEvent('transcendence-prefs-changed'))
}
