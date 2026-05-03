import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/index.js'
import { AUTH_PATHS } from '../../../config/authEndpoints.js'

function readCookie(name) {
	const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&')}=([^;]*)`))
	return m ? decodeURIComponent(m[1]) : null
}

async function ensureCsrfForDelete() {
	await fetch('/api/auth/csrf', {
		method: 'GET',
		credentials: 'include',
		headers: { Accept: 'application/json' },
	})
}
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
	await ensureCsrfForDelete()
	const csrf = readCookie('csrftoken')
	const headers = { 'Content-Type': 'application/json' }
	if (csrf) headers['X-CSRFToken'] = csrf

	await fetch('/api/auth/me/client-settings', {
		method: 'PATCH',
		credentials: 'include',
		headers,
		body: JSON.stringify(delta),
	})
}

function Settings() {
	const [searchParams, setSearchParams] = useSearchParams()
	const { user, loading, loginWith42, logout } = useAuth()
	const [prefs, setPrefsRaw] = useState(loadUiPrefs)
	const [resetDone, setResetDone] = useState(false)
	const [eraseDone, setEraseDone] = useState(false)
	const [confirmErase, setConfirmErase] = useState(false)
	const syncDebounce = useRef(null)

	// RGPD — suppression données serveur
	const [deleteStep, setDeleteStep] = useState(0) // 0=idle 1=confirm 2=in-progress 3=done
	const [deleteError, setDeleteError] = useState(null)
	const [deleteEmailSent, setDeleteEmailSent] = useState(false)
	const [exportBusy, setExportBusy] = useState(false)
	const [exportError, setExportError] = useState(null)
	const [exportDone, setExportDone] = useState(false)

	async function handleExportData() {
		setExportError(null)
		setExportDone(false)
		setExportBusy(true)
		try {
			const res = await fetch('/api/auth/me/export-data', {
				method: 'GET',
				credentials: 'include',
				headers: { Accept: 'application/json' },
			})
			if (!res.ok) {
				const body = await res.json().catch(() => ({}))
				throw new Error(body.error || `Erreur ${res.status}`)
			}
			const blob = await res.blob()
			const cd = res.headers.get('Content-Disposition') || ''
			const m = cd.match(/filename="([^"]+)"/)
			const filename = m ? m[1] : 'transcendence-export.json'
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = filename
			a.rel = 'noopener'
			document.body.appendChild(a)
			a.click()
			a.remove()
			URL.revokeObjectURL(url)
			setExportDone(true)
			setTimeout(() => setExportDone(false), 4000)
		} catch (e) {
			setExportError(e.message || 'Erreur lors de l’export')
		} finally {
			setExportBusy(false)
		}
	}

	async function handleRequestDeleteEmail() {
		setDeleteStep(2)
		setDeleteError(null)
		try {
			await ensureCsrfForDelete()
			const csrf = readCookie('csrftoken')
			const headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
			if (csrf) headers['X-CSRFToken'] = csrf
			const res = await fetch(AUTH_PATHS.deleteDataRequest, {
				method: 'POST',
				credentials: 'include',
				headers,
			})
			if (!res.ok) {
				const body = await res.json().catch(() => ({}))
				throw new Error(body.error || `Erreur ${res.status}`)
			}
			setDeleteEmailSent(true)
			setDeleteStep(1)
		} catch (e) {
			setDeleteError(e.message || 'Erreur lors de l’envoi de l’email de confirmation')
			setDeleteStep(0)
		}
	}

	const confirmDeleteWithToken = useCallback(async (token) => {
		if (!token) return
		setDeleteStep(2)
		setDeleteError(null)
		try {
			await ensureCsrfForDelete()
			const csrf = readCookie('csrftoken')
			const headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
			if (csrf) headers['X-CSRFToken'] = csrf
			const res = await fetch(AUTH_PATHS.deleteDataConfirm, {
				method: 'POST',
				credentials: 'include',
				headers,
				body: JSON.stringify({ token }),
			})
			if (!res.ok) {
				const body = await res.json().catch(() => ({}))
				throw new Error(body.error || `Erreur ${res.status}`)
			}
			setDeleteStep(3)
			const nextParams = new URLSearchParams(searchParams)
			nextParams.delete('deleteToken')
			setSearchParams(nextParams, { replace: true })
			setTimeout(() => {
				logout()
			}, 2500)
		} catch (e) {
			setDeleteError(e.message || 'Erreur lors de la suppression')
			setDeleteStep(0)
		}
	}, [logout, searchParams, setSearchParams])

	const deleteAttemptedRef = useRef(false)
	useEffect(() => {
		const deleteToken = searchParams.get('deleteToken')
		if (!deleteToken || !user) return

		if (deleteStep === 0 && !deleteAttemptedRef.current) {
			deleteAttemptedRef.current = true
			setDeleteStep(2)
			confirmDeleteWithToken(deleteToken)
		}
	}, [searchParams, user, deleteStep, confirmDeleteWithToken])

	// On mount: merge server prefs into local (server wins for keys it has)
	useEffect(() => {
		if (!user) return
		fetchServerPrefs().then((serverPrefs) => {
			if (!serverPrefs || !Object.keys(serverPrefs).length) return
			setPrefsRaw((local) => {
				const merged = { ...local, ...serverPrefs }
				localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(merged))
				applyDocumentUiPrefs()
				setTimeout(() => notifyPrefsChanged(), 0) // Delay to avoid updating other components during render
				return merged
			})
		}).catch(() => {})
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user?.id])

	const setPrefs = useCallback((updater) => {
		const next = typeof updater === 'function' ? updater(prefs) : updater
		setPrefsRaw(next)
		localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next))
		applyDocumentUiPrefs()
		notifyPrefsChanged()
		// Debounced server sync
		if (syncDebounce.current) clearTimeout(syncDebounce.current)
		syncDebounce.current = setTimeout(() => {
			if (user) patchServerPrefs(next).catch(() => {})
		}, 800)
	}, [user, prefs])

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
		logout()
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
									<span className="muted small">(activé par défaut, décoche pour réactiver les animations)</span>
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

					{user && (
						<section className="surface-card">
							<h2 className="card-title">
								<i className="ri-shield-user-line" aria-hidden />
								Données personnelles (RGPD)
							</h2>
							<p className="muted small card-hint">
								<a
									className="settings-privacy-link"
									href={`${import.meta.env.BASE_URL}PRIVACY_RETENTION.md`}
									target="_blank"
									rel="noreferrer"
								>
									Durées de conservation et traitements (fichier public)
								</a>
							</p>
							<ul className="muted small card-hint settings-rgpd-list">
								<li>
									<strong>Export</strong> : profil, préférences, parties en base, invitations, conversations
									dont tu es membre et messages associés (limite de volume côté serveur si besoin).
								</li>
								<li>
									<strong>Suppression</strong> : anonymisation du compte, suppression des messages envoyés,
									retrait des accusés de lecture, sortie des conversations privées, suppression amitiés et
									invitations, effacement des marqueurs présence / partie active en cache. Les lignes de
									parties restent en base liées au compte anonymisé.
								</li>
							</ul>

							<div className="settings-local-actions" style={{ marginBottom: '0.75rem' }}>
								<button
									type="button"
									className="btn btn-secondary"
									data-testid="settings-export-server-data"
									onClick={handleExportData}
									disabled={exportBusy}
								>
									{exportBusy ? (
										<><i className="ri-loader-4-line" aria-hidden /> Préparation du fichier…</>
									) : (
										<><i className="ri-download-cloud-2-line" aria-hidden /> Télécharger mes données (JSON)</>
									)}
								</button>
							</div>
							{exportDone && (
								<p className="muted small settings-feedback" data-testid="settings-export-server-done">
									Téléchargement lancé. Vérifie le dossier de téléchargements du navigateur.
								</p>
							)}
							{exportError && (
								<p className="muted small settings-feedback settings-feedback--error" data-testid="settings-export-server-error">
									{exportError}
								</p>
							)}

							<p className="muted small card-hint">
								La suppression définitive retire tes données personnelles côté serveur comme décrit ci-dessus.
								Cette action est <strong>irréversible</strong> et nécessite un lien de confirmation reçu par email.
							</p>

							{deleteStep === 3 ? (
								<p className="muted small settings-feedback" data-testid="settings-delete-server-done">
									Données supprimées. Déconnexion en cours…
								</p>
							) : (
								<div className="settings-local-actions">
									<button
										type="button"
										className={`btn ${deleteStep === 1 ? 'btn-danger' : 'btn-secondary'}`}
										data-testid="settings-delete-server-data"
										onClick={handleRequestDeleteEmail}
										disabled={deleteStep === 2}
									>
										{deleteStep === 0 && (
											<><i className="ri-mail-send-line" aria-hidden /> Envoyer l’email de confirmation</>
										)}
										{deleteStep === 1 && (
											<><i className="ri-mail-check-line" aria-hidden /> Email envoyé — confirme via le lien reçu</>
										)}
										{deleteStep === 2 && (
											<><i className="ri-loader-4-line" aria-hidden /> Traitement en cours…</>
										)}
									</button>
								</div>
							)}
							{deleteEmailSent && deleteStep === 1 && (
								<p className="muted small settings-feedback" data-testid="settings-delete-server-email-sent">
									Un email de confirmation a été envoyé. Ouvre le lien reçu pour finaliser la suppression.
								</p>
							)}

							{deleteError && (
								<p className="muted small settings-feedback settings-feedback--error" data-testid="settings-delete-server-error">
									{deleteError}
								</p>
							)}
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
