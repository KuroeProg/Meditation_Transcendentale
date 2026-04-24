import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/index.js'
import {
	PREFS_STORAGE_KEY,
	loadUiPrefs,
	applyDocumentUiPrefs,
	notifyPrefsChanged,
} from '../../../config/uiPrefs.js'
import { GAME_AUDIO_PREFS_KEY } from '../../../config/gameAudioPrefs.js'
import { GameAudioPrefsForm } from '../../audio/components/AudioPrefsForm.jsx'

async function fetchServerPrefs() {
	const res = await fetch('/api/auth/me/client-settings', { credentials: 'include' })
	if (!res.ok) return null
	const data = await res.json()
	return data.prefs || {}
}

async function patchServerPrefs(delta) {
	await fetch('/api/auth/me/client-settings', {
		method: 'PATCH',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(delta),
	})
}

function Settings() {
	const { user, loading, loginWith42, logout } = useAuth()
	const [prefs, setPrefsRaw] = useState(loadUiPrefs)
	const [resetDone, setResetDone] = useState(false)
	const [eraseDone, setEraseDone] = useState(false)
	const [confirmErase, setConfirmErase] = useState(false)
	const syncDebounce = useRef(null)

	// On mount: merge server prefs into local (server wins for keys it has)
	useEffect(() => {
		if (!user) return
		fetchServerPrefs().then((serverPrefs) => {
			if (!serverPrefs || !Object.keys(serverPrefs).length) return
			setPrefsRaw((local) => {
				const merged = { ...local, ...serverPrefs }
				localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(merged))
				applyDocumentUiPrefs()
				notifyPrefsChanged()
				return merged
			})
		}).catch(() => {})
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user?.id])

	const setPrefs = useCallback((updater) => {
		setPrefsRaw((prev) => {
			const next = typeof updater === 'function' ? updater(prev) : updater
			localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next))
			applyDocumentUiPrefs()
			notifyPrefsChanged()
			// Debounced server sync
			if (syncDebounce.current) clearTimeout(syncDebounce.current)
			syncDebounce.current = setTimeout(() => {
				if (user) patchServerPrefs(next).catch(() => {})
			}, 800)
			return next
		})
	}, [user])

	useEffect(() => {
		return () => { if (syncDebounce.current) clearTimeout(syncDebounce.current) }
	}, [])

	function handleResetPrefs() {
		localStorage.removeItem(PREFS_STORAGE_KEY)
		localStorage.removeItem(GAME_AUDIO_PREFS_KEY)
		const defaults = loadUiPrefs()
		applyDocumentUiPrefs()
		notifyPrefsChanged()
		setPrefsRaw(defaults)
		if (user) patchServerPrefs(defaults).catch(() => {})
		setResetDone(true)
		setTimeout(() => setResetDone(false), 2500)
	}

	function handleEraseLocal() {
		if (!confirmErase) {
			setConfirmErase(true)
			return
		}
		const keysToRemove = [PREFS_STORAGE_KEY, GAME_AUDIO_PREFS_KEY]
		keysToRemove.forEach((k) => localStorage.removeItem(k))
		const defaults = loadUiPrefs()
		applyDocumentUiPrefs()
		notifyPrefsChanged()
		setPrefsRaw(defaults)
		if (user) patchServerPrefs(defaults).catch(() => {})
		setConfirmErase(false)
		setEraseDone(true)
		setTimeout(() => setEraseDone(false), 2500)
	}

	function handleLogout() {
		logout({ redirectTo: '/auth' })
	}

	return (
		<div className="page-shell chess-grid-pattern" data-testid="settings-page">
			<div className="page-header">
				<h1 className="page-title">Paramètres</h1>
				<p className="page-subtitle">
					Audio de partie et préférences d’affichage — l’avatar reste celui de ton compte 42.
				</p>
			</div>

			{loading ? (
				<p className="muted">Chargement…</p>
			) : (
				<>
					<section className="surface-card settings-audio-card">
						<h2 className="card-title">
							<i className="ri-volume-up-line" aria-hidden />
							Audio
						</h2>
						<GameAudioPrefsForm variant="settings" />
					</section>

					{user && (
						<section className="surface-card">
							<h2 className="card-title">
								<i className="ri-layout-line" aria-hidden />
								Interface et performance
							</h2>
							<p className="muted small card-hint settings-coalition-note">
								Les <strong>couleurs et le style par coalition</strong> (sidebar, fonds, accents) sont
								gérés à part : rien ici ne les remplace, pour laisser la place à la DA 42.
							</p>

							<label className="toggle-row">
								<input
									type="checkbox"
									data-testid="settings-reduce-motion"
									checked={prefs.reduceMotion}
									onChange={(e) =>
										setPrefs((p) => ({ ...p, reduceMotion: e.target.checked }))
									}
								/>
								<span>
									Réduire les animations{' '}
									<span className="muted small">(accessibilité stricte)</span>
								</span>
							</label>

							<label className="toggle-row">
								<input
									type="checkbox"
									data-testid="settings-light-mode"
									checked={prefs.lightMode}
									onChange={(e) =>
										setPrefs((p) => ({ ...p, lightMode: e.target.checked }))
									}
								/>
								<span>
									Mode léger{' '}
									<span className="muted small">
										(désactive particules et effets d’arrière-plan)
									</span>
								</span>
							</label>

							<label className="toggle-row">
								<input
									type="checkbox"
									data-testid="settings-show-scrollbars"
									checked={prefs.showScrollbars}
									onChange={(e) =>
										setPrefs((p) => ({ ...p, showScrollbars: e.target.checked }))
									}
								/>
								<span>Afficher les barres de défilement</span>
							</label>
						</section>
					)}

					{user && (
						<section className="surface-card">
							<h2 className="card-title">
								<i className="ri-chat-3-line" aria-hidden />
								Chat et notifications
							</h2>

							<label className="toggle-row">
								<input
									type="checkbox"
									data-testid="settings-hide-invite-toasts"
									checked={prefs.hideInviteToasts}
									onChange={(e) =>
										setPrefs((p) => ({ ...p, hideInviteToasts: e.target.checked }))
									}
								/>
								<span>
									Masquer les pop-ups de défi{' '}
									<span className="muted small">(le badge dans le chat reste actif)</span>
								</span>
							</label>
						</section>
					)}

					{!user && (
						<section className="surface-card surface-card--cta">
							<p>Connecte-toi pour accéder aux paramètres liés au compte.</p>
							<button type="button" className="btn btn-primary" onClick={loginWith42}>
								Se connecter avec 42
							</button>
						</section>
					)}

					{user && (
						<section className="surface-card">
							<h2 className="card-title">
								<i className="ri-user-line" aria-hidden />
								Compte
							</h2>

							<div className="settings-account-row">
								<span className="settings-account-label">Profil 42</span>
								<Link to="/profile" className="btn btn-secondary settings-account-btn">
									<i className="ri-external-link-line" aria-hidden /> Voir mon profil
								</Link>
							</div>

							<div className="settings-account-row">
								<span className="settings-account-label">Session</span>
								<button
									type="button"
									className="btn btn-secondary settings-account-btn"
									data-testid="settings-logout"
									onClick={handleLogout}
								>
									<i className="ri-logout-box-r-line" aria-hidden /> Se déconnecter
								</button>
							</div>
						</section>
					)}

					<section className="surface-card">
						<h2 className="card-title">
							<i className="ri-database-2-line" aria-hidden />
							Données locales
						</h2>
						<p className="muted small card-hint">
							Ces actions n’affectent que les données stockées dans ce navigateur (préférences audio,
							options d’interface). Elles ne suppriment rien côté serveur.
						</p>

						<div className="settings-local-actions">
							<button
								type="button"
								className="btn btn-secondary"
								data-testid="settings-reset-prefs"
								onClick={handleResetPrefs}
							>
								{resetDone ? (
									<>
										<i className="ri-check-line" aria-hidden /> Réinitialisé
									</>
								) : (
									<>
										<i className="ri-refresh-line" aria-hidden /> Réinitialiser les préférences
									</>
								)}
							</button>

							<button
								type="button"
								className={`btn ${confirmErase ? 'btn-danger' : 'btn-secondary'}`}
								data-testid="settings-erase-local"
								onClick={handleEraseLocal}
							>
								{eraseDone ? (
									<>
										<i className="ri-check-line" aria-hidden /> Effacé
									</>
								) : confirmErase ? (
									<>
										<i className="ri-alert-line" aria-hidden /> Confirmer l’effacement
									</>
								) : (
									<>
										<i className="ri-delete-bin-line" aria-hidden /> Effacer les données locales
									</>
								)}
							</button>
							{confirmErase && (
								<button
									type="button"
									className="btn btn-secondary"
									data-testid="settings-erase-cancel"
									onClick={() => setConfirmErase(false)}
								>
									Annuler
								</button>
							)}
						</div>

						{eraseDone && (
							<p className="muted small settings-feedback" data-testid="settings-erase-feedback">
								Données locales effacées.
							</p>
						)}
					</section>
				</>
			)}
		</div>
	)
}

export default Settings
