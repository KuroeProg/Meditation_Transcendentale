import { resolveProfileGameStats } from '../../stats/services/profileStatsFromMock.js'

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
	const { wins, losses, draws } = resolveProfileGameStats(user)
    const total = wins + losses + draws

	return (
		<section className="surface-card">
			<h2 className="card-title">Statistiques de jeu</h2>
			
			<div className="stats-grid">
				<StatTile label="Victoires" value={wins} />
				<StatTile label="Défaites" value={losses} />
				<StatTile label="Nuls" value={draws} />
				<StatTile label="Matches Joués" value={total} />
			</div>

			<div className="stats-elo-row">
				<div className="stat-elo-item">
					<i className="ri-dashboard-3-line" />
					<div className="stat-elo-details">
						<span className="stat-elo-label">Bullet</span>
						<span className="stat-elo-value">{user?.elo_bullet ?? 0}</span>
					</div>
				</div>
				<div className="stat-elo-item">
					<i className="ri-flashlight-line" />
					<div className="stat-elo-details">
						<span className="stat-elo-label">Blitz</span>
						<span className="stat-elo-value">{user?.elo_blitz ?? 0}</span>
					</div>
				</div>
				<div className="stat-elo-item">
					<i className="ri-timer-line" />
					<div className="stat-elo-details">
						<span className="stat-elo-label">Rapide</span>
						<span className="stat-elo-value">{user?.elo_rapid ?? 0}</span>
					</div>
				</div>
			</div>
		</section>
	)
}
