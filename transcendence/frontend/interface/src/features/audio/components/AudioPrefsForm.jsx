import { useCallback } from 'react'
import { saveGameAudioPrefs } from '../../../config/gameAudioPrefs.js'
import { useGameAudioPrefsLive } from '../hooks/useGameAudioPrefs.js'

/** Champs partagés : page Paramètres et (optionnel) ailleurs. */
export function GameAudioPrefsForm({ variant = 'settings' }) {
	const prefs = useGameAudioPrefsLive()
	const pct = Math.round(prefs.bgmVolume * 100)

	const setVolume = useCallback((v) => {
		saveGameAudioPrefs({ bgmVolume: v })
	}, [])

	const setMuted = useCallback((m) => {
		saveGameAudioPrefs({ bgmMuted: m })
	}, [])

	const wrapClass = variant === 'settings' ? 'game-audio-prefs-form game-audio-prefs-form--settings' : 'game-audio-prefs-form'

	return (
		<div className={wrapClass}>
			<p className="muted small card-hint">
				La piste <strong>Midnight Basin</strong> ne joue que sur l’écran de partie ; niveau très bas par défaut pour ne pas
				gêner la concentration.
			</p>
			<label className="game-music-slider-label">
				<span>Volume musique d’ambiance</span>
				<span className="game-music-slider-value">{pct}%</span>
			</label>
			<input
				type="range"
				className="game-music-slider"
				min={0}
				max={100}
				value={pct}
				onChange={(e) => setVolume(Number(e.target.value) / 100)}
			/>
			<label className="game-music-mute-row">
				<input type="checkbox" checked={prefs.bgmMuted} onChange={(e) => setMuted(e.target.checked)} />
				<span>Couper la musique en partie</span>
			</label>
		</div>
	)
}
