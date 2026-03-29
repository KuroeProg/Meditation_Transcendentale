import { useEffect } from 'react'
import { applyDocumentUiPrefs } from '../config/uiPrefs.js'

/** Synchronise les préférences UI neutres (ex. mouvement) — pas de thème global couleur. */
export default function ThemeSync() {
	useEffect(() => {
		applyDocumentUiPrefs()
		const onChange = () => applyDocumentUiPrefs()
		window.addEventListener('transcendence-prefs-changed', onChange)
		return () => window.removeEventListener('transcendence-prefs-changed', onChange)
	}, [])
	return null
}
