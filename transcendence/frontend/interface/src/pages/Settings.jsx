import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import {
	PREFS_STORAGE_KEY,
	loadUiPrefs,
	applyDocumentUiPrefs,
	notifyPrefsChanged,
} from '../config/uiPrefs.js'

function Settings() {
	const { user, loading, loginWith42 } = useAuth()
	const [prefs, setPrefs] = useState(loadUiPrefs)
	const [twoFAEnabled, setTwoFAEnabled] = useState(false)

	useEffect(() => {
		localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
		applyDocumentUiPrefs()
		notifyPrefsChanged()
	}, [prefs])

	return (
		<div className="page-shell">
			<div className="page-header">
				<h1 className="page-title">Paramètres</h1>
				<p className="page-subtitle">Sécurité (2FA) et préférences d’affichage — l’avatar reste celui de ton compte 42.</p>
			</div>

			{loading ? (
				<p className="muted">Chargement…</p>
			) : !user ? (
				<section className="surface-card surface-card--cta">
					<p>Connecte-toi pour accéder aux paramètres liés au compte.</p>
					<button type="button" className="btn btn-primary" onClick={loginWith42}>
						Se connecter avec 42
					</button>
				</section>
			) : (
				<div className="settings-stack">
					<section className="surface-card">
						<h2 className="card-title">Double authentification (2FA)</h2>
						<p className="muted small card-hint">
							Interrupteur préparé pour l’UI ; la persistance et les codes TOTP seront gérés côté backend.
						</p>
						<label className="toggle-row">
							<input
								type="checkbox"
								checked={twoFAEnabled}
								onChange={(e) => setTwoFAEnabled(e.target.checked)}
							/>
							<span>Activer la 2FA sur mon compte</span>
						</label>
					</section>

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
						<label className="toggle-row">
							<input
								type="checkbox"
								checked={prefs.notificationsEnabled}
								onChange={(e) =>
									setPrefs((p) => ({ ...p, notificationsEnabled: e.target.checked }))
								}
							/>
							<span>Notifications (interface)</span>
						</label>
					</section>
				</div>
			)}
		</div>
	)
}

export default Settings
