import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth/index.js'
import {
	DEV_MOCK_STORAGE,
	clearSortingHatStorageForUserId,
	getDevMockUserId,
} from '../../../mock/mockSessionUser.js'
import {
	disableDevGuestPreview,
	goToGuestHome,
	isDevGuestPreviewActive,
} from '../../../utils/devGuestPreview.js'
import './DevAuthToolbar.css'

function readStoredMode() {
	try {
		const v = localStorage.getItem(DEV_MOCK_STORAGE.MODE)
		if (v === 'force_on' || v === 'force_off' || v === 'follow_env') return v
	} catch {
		/* ignore */
	}
	return 'follow_env'
}

function readStoredCoalition() {
	try {
		return localStorage.getItem(DEV_MOCK_STORAGE.COALITION) || ''
	} catch {
		return ''
	}
}

function readStoredAuthProvider() {
	try {
		return localStorage.getItem(DEV_MOCK_STORAGE.AUTH_PROVIDER) || ''
	} catch {
		return ''
	}
}

function resolveUserId(user) {
	if (!user) return null
	return user.id ?? user.user_id ?? user.pk ?? null
}

/**
 * Dev uniquement : mock session (surcharge .env), coalition, compte local vs 42, réinit choixpeau.
 */
export default function DevAuthToolbar() {
	const navigate = useNavigate()
	const { user, refetch, isDevMockAuth, logout } = useAuth()
	const [open, setOpen] = useState(false)
	const guestPreview = isDevGuestPreviewActive()
	const [mode, setMode] = useState(readStoredMode)
	const [coalition, setCoalition] = useState(readStoredCoalition)
	const [authProvider, setAuthProvider] = useState(readStoredAuthProvider)
	const [hatReplayBusy, setHatReplayBusy] = useState(false)

	const uid = useMemo(() => resolveUserId(user), [user])

	const applySettings = useCallback(() => {
		try {
			localStorage.setItem(DEV_MOCK_STORAGE.MODE, mode)
			if (coalition) localStorage.setItem(DEV_MOCK_STORAGE.COALITION, coalition)
			else localStorage.removeItem(DEV_MOCK_STORAGE.COALITION)
			if (authProvider) localStorage.setItem(DEV_MOCK_STORAGE.AUTH_PROVIDER, authProvider)
			else localStorage.removeItem(DEV_MOCK_STORAGE.AUTH_PROVIDER)
		} catch {
			/* ignore */
		}
		void refetch()
	}, [mode, coalition, authProvider, refetch])

	/**
	 * Simule une première connexion mock : déconnexion, session fictive locale sans coalition,
	 * stockage choixpeau effacé — la cérémonie se lance au rechargement de session.
	 */
	const replaySortingHatCeremony = useCallback(async () => {
		const mockId = getDevMockUserId()
		try {
			localStorage.setItem(DEV_MOCK_STORAGE.MODE, 'force_on')
			localStorage.setItem(DEV_MOCK_STORAGE.AUTH_PROVIDER, 'local')
			localStorage.setItem(DEV_MOCK_STORAGE.COALITION, 'pending_hat')
		} catch {
			/* ignore */
		}
		setMode('force_on')
		setAuthProvider('local')
		setCoalition('pending_hat')
		clearSortingHatStorageForUserId(mockId)
		if (uid != null && uid !== mockId) clearSortingHatStorageForUserId(uid)
		setHatReplayBusy(true)
		try {
			await logout()
			await refetch()
		} finally {
			setHatReplayBusy(false)
		}
	}, [uid, logout, refetch])

	const handleGuestHome = useCallback(async () => {
		await goToGuestHome(logout, navigate)
	}, [logout, navigate])

	const handleResumeSession = useCallback(() => {
		disableDevGuestPreview()
		void refetch()
	}, [refetch])

	if (!import.meta.env.DEV) return null

	return (
		<div className="dev-auth-toolbar-host">
			<button
				type="button"
				className="dev-auth-toolbar__toggle"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
			>
				{open ? 'Fermer' : 'Dev mock'}
			</button>

			{open && (
				<div className="dev-auth-toolbar dev-auth-toolbar--panel" role="region" aria-label="Réglages mock développement">
					<p className="dev-auth-toolbar__hint">
						Surcharges <code>localStorage</code> — pas besoin de relancer Vite. Voir aussi{' '}
						<code>make mock-help</code>.
					</p>

					<div className="dev-auth-toolbar__row">
						<label>
							Session mock
							<select value={mode} onChange={(e) => setMode(e.target.value)}>
								<option value="follow_env">Suivre .env (VITE_DEV_MOCK_USER)</option>
								<option value="force_on">Forcer mock ON</option>
								<option value="force_off">Forcer mock OFF</option>
							</select>
						</label>
					</div>

					<div className="dev-auth-toolbar__row">
						<label>
							Coalition (mock)
							<select value={coalition} onChange={(e) => setCoalition(e.target.value)}>
								<option value="">— .env / défaut —</option>
								<option value="feu">feu</option>
								<option value="eau">eau</option>
								<option value="terre">terre</option>
								<option value="air">air</option>
								<option value="pending_hat">pending_hat (avant choixpeau)</option>
							</select>
						</label>
						<label>
							Type de compte (mock)
							<select value={authProvider} onChange={(e) => setAuthProvider(e.target.value)}>
								<option value="">— .env —</option>
								<option value="local">local (choixpeau si VITE_SORTING_HAT…)</option>
								<option value="oauth42">oauth42 (pas de choixpeau)</option>
							</select>
						</label>
					</div>

					<p className="dev-auth-toolbar__hint">
						État actuel : <strong>{isDevMockAuth ? 'mock actif' : 'mock inactif'}</strong>
						{user ? ` · id ${uid ?? '?'}` : ' · pas de session'}
						{guestPreview ? (
							<>
								{' '}
								· <strong>aperçu invité</strong> (cookies ignorés jusqu’à réactivation)
							</>
						) : null}
					</p>

					<div className="dev-auth-toolbar__actions">
						<button
							type="button"
							className="dev-auth-toolbar__btn dev-auth-toolbar__btn--accent"
							onClick={() => void handleGuestHome()}
						>
							Home invité (déco + ignorer session)
						</button>
						<button
							type="button"
							className="dev-auth-toolbar__btn"
							onClick={handleResumeSession}
							disabled={!guestPreview}
							title="Retire le flag dev et relance /api/auth/me"
						>
							Réactiver la session
						</button>
					</div>
					<p className="dev-auth-toolbar__hint">
						Choixpeau : <code>VITE_SORTING_HAT_COALITION=true</code>. Le bouton ci‑dessous force le mock local, coalition « en attente », déconnecte puis recharge la session comme après une première inscription.
					</p>

					<div className="dev-auth-toolbar__actions">
						<button type="button" className="dev-auth-toolbar__btn dev-auth-toolbar__btn--accent" onClick={applySettings}>
							Appliquer et recharger la session
						</button>
						<button
							type="button"
							className="dev-auth-toolbar__btn dev-auth-toolbar__btn--accent"
							onClick={() => void replaySortingHatCeremony()}
							disabled={hatReplayBusy}
							title="Déconnexion puis session mock locale sans coalition — relance la cérémonie"
						>
							{hatReplayBusy ? 'Préparation…' : '▶ Lancer l’animation choixpeau'}
						</button>
					</div>

					{!user && isDevMockAuth && (
						<button type="button" className="dev-auth-toolbar__btn" onClick={() => void refetch()}>
							Réinjecter utilisateur fictif
						</button>
					)}

					<p className="dev-auth-toolbar__hint">
						J2 (noirs) : <code>src/features/chess/mock/mockGameOpponent.js</code>
					</p>
				</div>
			)}
		</div>
	)
}
