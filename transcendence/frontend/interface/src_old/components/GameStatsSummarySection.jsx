import { resolveProfileGameStats } from '../dev/profileStatsFromMock.js'

function StatTile({ label, value }) {
	return (
		<div className="stat-tile">
			<span className="stat-label">{label}</span>
			<span className="stat-value">{value ?? '—'}</span>
		</div>
	)
}

/** Résumé 4 tuiles — données fusionnées session + mockPersonalStats (aligné page Statistiques). */
export default function GameStatsSummarySection({ user }) {
	const { wins, losses, rank, level } = resolveProfileGameStats(user)

	return (
		<section className="surface-card">
			<h2 className="card-title">Statistiques de jeu</h2>
			<p className="muted small card-hint">
				Valeurs de démo alignées sur <code>mockPersonalStats.json</code> (résumé profil) — même source
				que la page Statistiques ; remplacées par l’API quand le module stats / historique sera branché.
			</p>
			<div className="stats-grid">
				<StatTile label="Victoires" value={wins} />
				<StatTile label="Défaites" value={losses} />
				<StatTile label="Classement" value={rank} />
				<StatTile label="Niveau" value={level} />
			</div>
		</section>
	)
}
