/** Nouvelle clé : ancienne courbe (×2.15) rendait ~50 % = volume max ; migration implicite. */
export const GAME_AUDIO_PREFS_KEY = 'transcendence_game_audio_v2'

/**
 * Curseur 0–1 → volume HTMLAudio 0–1 : la moitié du curseur ≈ 1 % du volume max, montée douce jusqu’à 100 %.
 */
const SLIDER_MID = 0.5
const VOL_AT_MID = 0.01
/** >1 : après 50 % le volume monte plus lentement qu’en linéaire (puis s’accélère vers 100 %). */
const UPPER_HALF_CURVE = 2.35

/** Curseur par défaut : avec la courbe ci-dessous, ~0,78 reste clairement audible (0,55 donnait ~1–2 % effectif). */
const defaultGameAudioPrefs = {
	bgmVolume: 0.78,
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

/**
 * Volume 0–1 pour HTMLAudioElement — même courbe home + jeu (événement `transcendence-game-audio-changed`).
 */
export function effectiveBgmVolume(prefs) {
	if (prefs.bgmMuted) return 0
	const raw = Math.min(1, Math.max(0, prefs.bgmVolume))
	let v
	if (raw <= SLIDER_MID) {
		v = raw * (VOL_AT_MID / SLIDER_MID)
	} else {
		const u = (raw - SLIDER_MID) / (1 - SLIDER_MID)
		v = VOL_AT_MID + (1 - VOL_AT_MID) * Math.pow(Math.min(1, Math.max(0, u)), UPPER_HALF_CURVE)
		/* Juste au-dessus du milieu, la courbe peut tomber à ~1 % HTML5 : inaudible sur beaucoup de configs. */
		if (v > 0 && v < 0.07) {
			v = 0.07
		}
	}
	return Math.min(1, Math.max(0, v))
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
