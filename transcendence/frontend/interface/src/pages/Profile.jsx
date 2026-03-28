import { useAuth } from '../hooks/useAuth.js'
import Logo42 from '../components/Logo42.jsx'
import ProfileCoalitionIcon from '../components/ProfileCoalitionIcon.jsx'
import { coalitionToSlug, coalitionSlugToLabel } from '../utils/coalitionTheme.js'
import { get42AvatarUrl, getDisplayTitle } from '../utils/sessionUser.js'
import GameStatsSummarySection from '../components/GameStatsSummarySection.jsx'

function Profile() {
	const { user, loading, error, loginWith42, isDevMockAuth } = useAuth()

	const email = user?.email ?? null
	const { primary: titlePrimary, secondary: titleSecondary } = user
		? getDisplayTitle(user)
		: { primary: null, secondary: null }

	const coalition = user?.coalition ?? user?.coalition_name ?? user?.coalition_slug
	const hasCoalition = coalition != null && String(coalition).trim() !== ''
	const coalitionSlug = hasCoalition ? coalitionToSlug(coalition) : 'feu'
	const coalitionLabel = hasCoalition ? coalitionSlugToLabel(coalitionSlug) : null
	const coalitionRaw = hasCoalition ? String(coalition).trim() : ''
	const normCoal = (s) =>
		s
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/['\u2019]/g, '')
			.replace(/\s+/g, '')
	const showCoalitionRaw =
		hasCoalition &&
		coalitionRaw !== '' &&
		normCoal(coalitionRaw) !== coalitionSlug &&
		normCoal(coalitionRaw) !== normCoal(coalitionLabel)
	const levelCursus =
		user?.cursus_level ?? user?.level ?? user?.pool_level ?? user?.intra_level

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
					<p>Connecte-toi avec ton compte 42 pour afficher ton profil.</p>
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
									Login 42 : <strong>{titleSecondary}</strong>
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
