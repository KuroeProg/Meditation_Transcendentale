import { useState } from 'react'
import { useAuth } from '../../auth/index.js'
import Logo42 from '../../../components/common/Logo/Logo42.jsx'
import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'
import { coalitionToSlug, coalitionSlugToLabel } from '../../theme/services/coalitionTheme.js'
import { deriveCoalitionPresentation, deriveCursusLevel } from '../services/profileService.js'
import { get42AvatarUrl, getDisplayTitle } from '../../../utils/sessionUser.js'
import GameStatsSummarySection from '../../stats/components/GameStatsSummarySection.jsx'

function Profile() {
	const { user, loading, error, loginWith42, loginWithDb, isDevMockAuth } = useAuth()
	const [emailInput, setEmailInput] = useState('')
	const [password, setPassword] = useState('')
	const [loginError, setLoginError] = useState(null)
	const [submitting, setSubmitting] = useState(false)

	const handleDbLogin = async (event) => {
		event.preventDefault()
		setLoginError(null)
		setSubmitting(true)
		try {
			await loginWithDb({ email: emailInput, password })
			setPassword('')
		} catch (e) {
			setLoginError(e?.message || 'Echec de connexion')
		} finally {
			setSubmitting(false)
		}
	}

	const email = user?.email ?? null
	const { primary: titlePrimary, secondary: titleSecondary } = user
		? getDisplayTitle(user)
		: { primary: null, secondary: null }

	const {
		coalition,
		hasCoalition,
		coalitionSlug,
		coalitionLabel,
		showCoalitionRaw,
	} = deriveCoalitionPresentation(user, coalitionToSlug, coalitionSlugToLabel)
	const levelCursus = deriveCursusLevel(user)

	const avatarSrc = get42AvatarUrl(user)

	return (
		<div className="page-shell">
			<div className="page-header">
				<h1 className="page-title">Profil</h1>
				<p className="page-subtitle">
					Données issues de ton compte 42 après connexion — photo de profil Intra (non modifiable
					pour l’instant).
				</p>
			</div>

			{error && !isDevMockAuth && (
				<p className="error-banner" role="alert">
					{error} — le backend doit exposer <code>/api/auth/me</code> avec les champs Intra (voir{' '}
					<code>src/utils/sessionUser.js</code>).
				</p>
			)}

			{loading ? (
				<p className="muted">Chargement du profil…</p>
			) : !user ? (
				<section className="surface-card surface-card--cta">
					<p>Connecte-toi avec la base de donnees pour afficher ton profil.</p>
					<form onSubmit={handleDbLogin} autoComplete="on" data-lpignore="true" style={{ display: 'grid', gap: '0.6rem', maxWidth: '360px' }}>
						<input
							type="email"
							name="email"
							autoComplete="email"
							placeholder="email"
							value={emailInput}
							onChange={(e) => setEmailInput(e.target.value)}
							required
						/>
						<input
							type="password"
							name="password"
							autoComplete="current-password"
							placeholder="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
						<button type="submit" className="btn btn-primary" disabled={submitting}>
							{submitting ? 'Connexion...' : 'Se connecter (DB)'}
						</button>
					</form>
					<p className="muted small">Comptes de test: white@transcendence.local / white1234 et black@transcendence.local / black1234</p>
					{loginError && <p className="error-banner" role="alert">{loginError}</p>}
					<p className="muted small">Ou via OAuth 42 si besoin:</p>
					<button type="button" className="btn btn-primary" onClick={loginWith42}>
						Se connecter avec 42
					</button>
				</section>
			) : (
				<div className="profile-layout">
					<section className="surface-card profile-hero">
						<div className="profile-avatar-wrap">
							<img className="profile-avatar-lg" src={avatarSrc} alt="" />
						</div>
						<div className="profile-hero-text">
							<h2 className="profile-name">{titlePrimary}</h2>
							{titleSecondary && (
								<p className="profile-login42 muted">
									Nom d'utilisateur : <strong>{titleSecondary}</strong>
								</p>
							)}
							{email && (
								<p className="muted small profile-email">
									<strong>Email :</strong> {email}
								</p>
							)}
						</div>
					</section>

					<section className="surface-card surface-card--42">
						<h2 className="card-title card-title--with-logo42">
							<Logo42 className="logo-42-title" title="42" />
							<span>Coalition &amp; niveau</span>
						</h2>
						<dl className="info-dl info-dl--compact">
							<div className="profile-coalition-field">
								<dt>Coalition</dt>
								<dd
									className={hasCoalition ? 'profile-coalition-value' : undefined}
								>
									{hasCoalition ? (
										<>
											<span className="profile-coalition-icon-wrap" aria-hidden>
												<ProfileCoalitionIcon slug={coalitionSlug} />
											</span>
											<span className="profile-coalition-text">
												<span className="profile-coalition-label">{coalitionLabel}</span>
												{showCoalitionRaw && (
													<span className="muted small profile-coalition-raw">{coalition}</span>
												)}
											</span>
										</>
									) : (
										'—'
									)}
								</dd>
							</div>
							<div>
								<dt>Niveau</dt>
								<dd>{levelCursus ?? '—'}</dd>
							</div>
						</dl>
					</section>

					<GameStatsSummarySection user={user} />
				</div>
			)}
		</div>
	)
}

export default Profile
