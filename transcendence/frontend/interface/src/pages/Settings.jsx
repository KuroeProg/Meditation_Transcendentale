import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import {
	PREFS_STORAGE_KEY,
	loadUiPrefs,
	applyDocumentUiPrefs,
	notifyPrefsChanged,
} from '../config/uiPrefs.js'
import { GameAudioPrefsForm } from '../components/GameAudioPrefsForm.jsx'

function Settings() {
	const { user, loading, loginWith42 } = useAuth()
	const [prefs, setPrefs] = useState(loadUiPrefs)

	useEffect(() => {
		localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
		applyDocumentUiPrefs()
		notifyPrefsChanged()
	}, [prefs])

	return (
		<div className="page-shell">
			<div className="page-header">
				<h1 className="page-title">Paramètres</h1>
				<p className="page-subtitle">Audio de partie et préférences d’affichage — l’avatar reste celui de ton compte 42.</p>
			</div>

			{loading ? (
				<p className="muted">Chargement…</p>
			) : (
				<>
					<section className="surface-card settings-audio-card">
						<h2 className="card-title">Audio — partie d’échecs</h2>
						<GameAudioPrefsForm variant="settings" />
					</section>

					{!user ? (
						<section className="surface-card surface-card--cta">
							<p>Connecte-toi pour accéder aux paramètres liés au compte.</p>
							<button type="button" className="btn btn-primary" onClick={loginWith42}>
								Se connecter avec 42
							</button>
						</section>
					) : (
						<div className="settings-stack">
							<section className="surface-card">
								<h2 className="card-title">Préférences d’interface</h2>
								<p className="muted small card-hint settings-coalition-note">
									Les <strong>couleurs et le style par coalition</strong> (sidebar, fonds, accents) seront gérés
									à part : rien ici ne les remplace, pour laisser la place à la DA 42.
								</p>
								<label className="toggle-row">
									<input
										type="checkbox"
										checked={prefs.reduceMotion}
										onChange={(e) =>
											setPrefs((p) => ({ ...p, reduceMotion: e.target.checked }))
										}
									/>
									<span>Réduire les animations (accessibilité)</span>
								</label>
							</section>
						</div>
					)}
				</>
			)}
		</div>
	)
}

export default Settings
