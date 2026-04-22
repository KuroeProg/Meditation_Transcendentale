/**
 * Préférences audio du jeu — clé v2.
 * Schéma étendu : accueil et partie séparés, effets sonores, mode de piste.
 * Migration douce : ancien `bgmVolume`/`bgmMuted` copié vers `gameBgmVolume`/`gameBgmMuted`
 * et `homeBgmVolume`/`homeBgmMuted` si les nouvelles clés sont absentes.
 */
export const GAME_AUDIO_PREFS_KEY = 'transcendence_game_audio_v2'

/**
 * Curseur 0–1 → volume HTMLAudio 0–1 : la moitié du curseur ≈ 1 % du volume max, montée douce jusqu'à 100 %.
 */
const SLIDER_MID = 0.5
const VOL_AT_MID = 0.01
/** >1 : après 50 % le volume monte plus lentement qu'en linéaire (puis s'accélère vers 100 %). */
const UPPER_HALF_CURVE = 2.35

/** @type {{ gameBgmVolume: number, gameBgmMuted: boolean, homeBgmVolume: number, homeBgmMuted: boolean, sfxVolume: number, sfxMuted: boolean, gameBgmTrackMode: string, gameBgmFixedTrack: string }} */
const defaultGameAudioPrefs = {
	gameBgmVolume: 0.78,
	gameBgmMuted: false,
	homeBgmVolume: 0.78,
	homeBgmMuted: false,
	sfxVolume: 0.8,
	sfxMuted: false,
	gameBgmTrackMode: 'rotate',
	gameBgmFixedTrack: '',
}

/** Pistes disponibles (doit rester synchro avec GameAudio.jsx). */
export const GAME_BGM_FILES = [
	'Theme_of_game.wav',
	'Playing Beltik.m4a',
	'Playing Girev I.m4a',
	'Main Title.m4a',
]

function clampVol(v, def) {
	return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : def
}

export function loadGameAudioPrefs() {
	try {
		const raw = localStorage.getItem(GAME_AUDIO_PREFS_KEY)
		if (!raw) return { ...defaultGameAudioPrefs }
		const parsed = JSON.parse(raw)

		/* Migration depuis l'ancien format (bgmVolume / bgmMuted uniquement). */
		const legacyVol = clampVol(parsed.bgmVolume, defaultGameAudioPrefs.gameBgmVolume)
		const legacyMuted = Boolean(parsed.bgmMuted)

		const gameBgmVolume = clampVol(
			parsed.gameBgmVolume ?? parsed.bgmVolume,
			legacyVol,
		)
		const gameBgmMuted = 'gameBgmMuted' in parsed ? Boolean(parsed.gameBgmMuted) : legacyMuted
		const homeBgmVolume = clampVol(
			parsed.homeBgmVolume ?? parsed.bgmVolume,
			legacyVol,
		)
		const homeBgmMuted = 'homeBgmMuted' in parsed ? Boolean(parsed.homeBgmMuted) : legacyMuted
		const sfxVolume = clampVol(parsed.sfxVolume, defaultGameAudioPrefs.sfxVolume)
		const sfxMuted = Boolean(parsed.sfxMuted)

		const validModes = ['rotate', 'random', 'fixed']
		const gameBgmTrackMode = validModes.includes(parsed.gameBgmTrackMode)
			? parsed.gameBgmTrackMode
			: defaultGameAudioPrefs.gameBgmTrackMode
		const gameBgmFixedTrack =
			typeof parsed.gameBgmFixedTrack === 'string' && GAME_BGM_FILES.includes(parsed.gameBgmFixedTrack)
				? parsed.gameBgmFixedTrack
				: defaultGameAudioPrefs.gameBgmFixedTrack

		/* Conserver la rétrocompatibilité : exposer bgmVolume/bgmMuted comme alias jeu. */
		return {
			gameBgmVolume,
			gameBgmMuted,
			homeBgmVolume,
			homeBgmMuted,
			sfxVolume,
			sfxMuted,
			gameBgmTrackMode,
			gameBgmFixedTrack,
			bgmVolume: gameBgmVolume,
			bgmMuted: gameBgmMuted,
		}
	} catch {
		return {
			...defaultGameAudioPrefs,
			bgmVolume: defaultGameAudioPrefs.gameBgmVolume,
			bgmMuted: defaultGameAudioPrefs.gameBgmMuted,
		}
	}
}

/**
 * Courbe non-linéaire commune BGM (accueil + partie).
 * Accepte un curseur 0–1, retourne un volume HTMLAudio 0–1.
 */
function applyBgmCurve(raw, muted) {
	if (muted) return 0
	const r = Math.min(1, Math.max(0, raw))
	let v
	if (r <= SLIDER_MID) {
		v = r * (VOL_AT_MID / SLIDER_MID)
	} else {
		const u = (r - SLIDER_MID) / (1 - SLIDER_MID)
		v = VOL_AT_MID + (1 - VOL_AT_MID) * Math.pow(Math.min(1, Math.max(0, u)), UPPER_HALF_CURVE)
		if (v > 0 && v < 0.07) v = 0.07
	}
	return Math.min(1, Math.max(0, v))
}

/** Volume effectif pour la musique de partie (HTMLAudioElement). */
export function effectiveBgmVolume(prefs) {
	return applyBgmCurve(prefs.gameBgmVolume ?? prefs.bgmVolume ?? 0.78, prefs.gameBgmMuted ?? prefs.bgmMuted ?? false)
}

/** Volume effectif pour la musique d'accueil (HTMLAudioElement). */
export function effectiveHomeBgmVolume(prefs) {
	return applyBgmCurve(prefs.homeBgmVolume ?? 0.78, prefs.homeBgmMuted ?? false)
}

/**
 * Facteur multiplicatif pour les effets sonores (0–1 linéaire).
 * 0 si muted, valeur directe sinon.
 */
export function effectiveSfxGain(prefs) {
	if (prefs.sfxMuted) return 0
	return Math.min(1, Math.max(0, prefs.sfxVolume ?? 0.8))
}

export function saveGameAudioPrefs(partial) {
	const prev = loadGameAudioPrefs()
	const merged = { ...prev, ...partial }

	/* Synchroniser les alias pour rétrocompatibilité. */
	if ('gameBgmVolume' in partial) merged.bgmVolume = merged.gameBgmVolume
	if ('gameBgmMuted' in partial) merged.bgmMuted = merged.gameBgmMuted
	if ('bgmVolume' in partial && !('gameBgmVolume' in partial)) {
		merged.gameBgmVolume = merged.bgmVolume
	}
	if ('bgmMuted' in partial && !('gameBgmMuted' in partial)) {
		merged.gameBgmMuted = merged.bgmMuted
	}

	/* Validation. */
	merged.gameBgmVolume = Math.min(1, Math.max(0, merged.gameBgmVolume ?? 0.78))
	merged.gameBgmMuted = Boolean(merged.gameBgmMuted)
	merged.homeBgmVolume = Math.min(1, Math.max(0, merged.homeBgmVolume ?? 0.78))
	merged.homeBgmMuted = Boolean(merged.homeBgmMuted)
	merged.sfxVolume = Math.min(1, Math.max(0, merged.sfxVolume ?? 0.8))
	merged.sfxMuted = Boolean(merged.sfxMuted)
	merged.bgmVolume = merged.gameBgmVolume
	merged.bgmMuted = merged.gameBgmMuted

	const validModes = ['rotate', 'random', 'fixed']
	if (!validModes.includes(merged.gameBgmTrackMode)) merged.gameBgmTrackMode = 'rotate'
	if (!GAME_BGM_FILES.includes(merged.gameBgmFixedTrack)) merged.gameBgmFixedTrack = ''

	try {
		localStorage.setItem(GAME_AUDIO_PREFS_KEY, JSON.stringify(merged))
	} catch {
		/* ignore */
	}
	window.dispatchEvent(new CustomEvent('transcendence-game-audio-changed', { detail: merged }))
}

export function getDefaultBgmVolume() {
	return defaultGameAudioPrefs.gameBgmVolume
}
