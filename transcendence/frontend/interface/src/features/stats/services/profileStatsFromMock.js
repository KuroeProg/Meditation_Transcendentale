/**
 * Résumé Victoires / Défaites / Classement / Niveau — aligné sur mockPersonalStats.json
 * (même source que la page Statistiques). À remplacer par l’API quand le module stats sera branché.
 */
import mockPersonalStats from '../assets/mockPersonalStats.json'

export function getProfileSummaryFromMock() {
	return mockPersonalStats.profileSummary
}

/** Fusionne `user.stats` (API / session) avec le mock si une clé manque. */
export function resolveProfileGameStats(user) {
	const mock = mockPersonalStats.profileSummary
	return {
		wins: user?.games_won ?? user?.stats?.wins ?? 0,
		losses: user?.games_lost ?? user?.stats?.losses ?? 0,
		draws: user?.games_draw ?? user?.stats?.draws ?? 0,
		rank: user?.stats?.rank ?? 0,
		level: user?.stats?.level ?? 0,
	}
}
