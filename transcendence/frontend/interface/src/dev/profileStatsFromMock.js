/**
 * Résumé Victoires / Défaites / Classement / Niveau — aligné sur mockPersonalStats.json
 * (même source que la page Statistiques). À remplacer par l’API quand le module stats sera branché.
 */
import mockPersonalStats from './mockPersonalStats.json'

export function getProfileSummaryFromMock() {
	return mockPersonalStats.profileSummary
}

/** Fusionne `user.stats` (API / session) avec le mock si une clé manque. */
export function resolveProfileGameStats(user) {
	const mock = mockPersonalStats.profileSummary
	const s = user?.stats ?? {}
	return {
		wins: s.wins ?? s.victoires ?? mock.wins,
		losses: s.losses ?? s.defaites ?? mock.losses,
		rank: s.rank ?? s.classement ?? mock.rank,
		level: s.level ?? s.niveau ?? mock.level,
	}
}
