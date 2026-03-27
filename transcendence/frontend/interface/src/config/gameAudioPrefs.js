export const GAME_AUDIO_PREFS_KEY = 'transcendence_game_audio'

/** Volume linéaire 0–1 ; défaut très bas pour une ambiance discrète. */
const defaultGameAudioPrefs = {
	bgmVolume: 0.14,
	bgmMuted: false,
}

export function loadGameAudioPrefs() {
	try {
		const raw = localStorage.getItem(GAME_AUDIO_PREFS_KEY)
		if (!raw) return { ...defaultGameAudioPrefs }
		const parsed = JSON.parse(raw)
		let bgmVolume =
			typeof parsed.bgmVolume === 'number' && Number.isFinite(parsed.bgmVolume)
				? Math.min(1, Math.max(0, parsed.bgmVolume))
				: defaultGameAudioPrefs.bgmVolume
		const bgmMuted = Boolean(parsed.bgmMuted)
		return { bgmVolume, bgmMuted }
	} catch {
		return { ...defaultGameAudioPrefs }
	}
}

export function saveGameAudioPrefs(partial) {
	const prev = loadGameAudioPrefs()
	const next = { ...prev, ...partial }
	if (typeof next.bgmVolume === 'number') {
		next.bgmVolume = Math.min(1, Math.max(0, next.bgmVolume))
	}
	next.bgmMuted = Boolean(next.bgmMuted)
	try {
		localStorage.setItem(GAME_AUDIO_PREFS_KEY, JSON.stringify(next))
	} catch {
		/* ignore */
	}
	window.dispatchEvent(new CustomEvent('transcendence-game-audio-changed', { detail: next }))
}

export function getDefaultBgmVolume() {
	return defaultGameAudioPrefs.bgmVolume
}
