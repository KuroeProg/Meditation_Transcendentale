import { useAuth } from '../hooks/useAuth.js'
import { get42AvatarUrl, getDisplayTitle } from '../utils/sessionUser.js'

function PlaceholderStat({ label, value }) {
	return (
		<div className="stat-tile">
			<span className="stat-label">{label}</span>
			<span className="stat-value">{value ?? '—'}</span>
		</div>
	)
}

function Profile() {
	const { user, loading, error, loginWith42, isDevMockAuth } = useAuth()

	const email = user?.email ?? null
	const { primary: titlePrimary, secondary: titleSecondary } = user
		? getDisplayTitle(user)
		: { primary: null, secondary: null }

	const coalition = user?.coalition ?? user?.coalition_name ?? user?.coalition_slug
	const levelCursus =
		user?.cursus_level ?? user?.level ?? user?.pool_level ?? user?.intra_level

	const stats = user?.stats ?? {}
	const wins = stats.wins ?? stats.victoires
	const losses = stats.losses ?? stats.defaites
	const rank = stats.rank ?? stats.classement
	const levelGame = stats.level ?? stats.niveau

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
						<h2 className="card-title">
							<span className="badge-42">42</span> Coalition &amp; niveau
						</h2>
						<dl className="info-dl info-dl--compact">
							<div>
								<dt>Coalition</dt>
								<dd>{coalition ?? '—'}</dd>
							</div>
							<div>
								<dt>Niveau</dt>
								<dd>{levelCursus ?? '—'}</dd>
							</div>
						</dl>
					</section>

					<section className="surface-card">
						<h2 className="card-title">Statistiques de jeu</h2>
						<p className="muted small card-hint">
							Remplies quand le module stats / historique sera branché côté API.
						</p>
						<div className="stats-grid">
							<PlaceholderStat label="Victoires" value={wins} />
							<PlaceholderStat label="Défaites" value={losses} />
							<PlaceholderStat label="Classement" value={rank} />
							<PlaceholderStat label="Niveau" value={levelGame} />
						</div>
					</section>
				</div>
			)}
		</div>
	)
}

export default Profile
