import { useCallback } from 'react'
import { saveGameAudioPrefs, GAME_BGM_FILES } from '../../../config/gameAudioPrefs.js'
import { useGameAudioPrefsLive } from '../hooks/useGameAudioPrefs.js'

function VolumeRow({ label, value, onChange }) {
	const pct = Math.round(value * 100)
	return (
		<>
			<label className="game-music-slider-label">
				<span>{label}</span>
				<span className="game-music-slider-value">{pct}%</span>
			</label>
			<input
				type="range"
				className="game-music-slider"
				min={0}
				max={100}
				value={pct}
				onChange={(e) => onChange(Number(e.target.value) / 100)}
			/>
		</>
	)
}

/** Formulaire audio complet : accueil, partie (BGM + piste), effets. */
export function GameAudioPrefsForm({ variant = 'settings' }) {
	const prefs = useGameAudioPrefsLive()
	const wrapClass =
		variant === 'settings' ? 'game-audio-prefs-form game-audio-prefs-form--settings' : 'game-audio-prefs-form'

	const homeBgmVolume = prefs.homeBgmVolume ?? prefs.bgmVolume ?? 0.78
	const homeBgmMuted = prefs.homeBgmMuted ?? false
	const gameBgmVolume = prefs.gameBgmVolume ?? prefs.bgmVolume ?? 0.78
	const gameBgmMuted = prefs.gameBgmMuted ?? prefs.bgmMuted ?? false
	const sfxVolume = prefs.sfxVolume ?? 0.8
	const sfxMuted = prefs.sfxMuted ?? false
	const trackMode = prefs.gameBgmTrackMode ?? 'rotate'
	const fixedTrack = prefs.gameBgmFixedTrack ?? ''

	const setHomeVol = useCallback((v) => saveGameAudioPrefs({ homeBgmVolume: v }), [])
	const setHomeMuted = useCallback((m) => saveGameAudioPrefs({ homeBgmMuted: m }), [])
	const setGameVol = useCallback((v) => saveGameAudioPrefs({ gameBgmVolume: v }), [])
	const setGameMuted = useCallback((m) => saveGameAudioPrefs({ gameBgmMuted: m }), [])
	const setSfxVol = useCallback((v) => saveGameAudioPrefs({ sfxVolume: v }), [])
	const setSfxMuted = useCallback((m) => saveGameAudioPrefs({ sfxMuted: m }), [])
	const setTrackMode = useCallback((m) => saveGameAudioPrefs({ gameBgmTrackMode: m }), [])
	const setFixedTrack = useCallback((t) => saveGameAudioPrefs({ gameBgmFixedTrack: t }), [])

	return (
		<div className={wrapClass} data-testid="settings-audio-form">
			{/* Musique d'accueil */}
			<p className="settings-audio-section-label">Musique d'accueil</p>
			<VolumeRow label="Volume" value={homeBgmVolume} onChange={setHomeVol} />
			<label className="toggle-row">
				<input
					type="checkbox"
					data-testid="settings-home-bgm-muted"
					checked={homeBgmMuted}
					onChange={(e) => setHomeMuted(e.target.checked)}
				/>
				<span>Couper la musique d'accueil</span>
			</label>

			<div className="settings-audio-divider" />

			{/* Musique de partie */}
			<p className="settings-audio-section-label">Musique de partie</p>
			<p className="muted small card-hint">
				La piste démarre avec le chronomètre (après le premier coup des blancs).
			</p>
			<VolumeRow label="Volume" value={gameBgmVolume} onChange={setGameVol} />
			<label className="toggle-row">
				<input
					type="checkbox"
					data-testid="settings-game-bgm-muted"
					checked={gameBgmMuted}
					onChange={(e) => setGameMuted(e.target.checked)}
				/>
				<span>Couper la musique de partie</span>
			</label>

			<div className="settings-audio-track-wrap">
				<span className="settings-audio-track-label">Sélection de la piste</span>
				<div className="settings-audio-track-options">
					{[
						{ value: 'rotate', label: 'Rotation' },
						{ value: 'random', label: 'Aléatoire' },
						{ value: 'fixed', label: 'Piste fixe' },
					].map(({ value, label }) => (
						<label key={value} className="toggle-row settings-audio-track-option">
							<input
								type="radio"
								name="gameBgmTrackMode"
								data-testid={`settings-bgm-track-${value}`}
								value={value}
								checked={trackMode === value}
								onChange={() => setTrackMode(value)}
							/>
							<span>{label}</span>
						</label>
					))}
				</div>
				{trackMode === 'fixed' && (
					<select
						className="settings-audio-track-select"
						data-testid="settings-bgm-fixed-track"
						value={fixedTrack || GAME_BGM_FILES[0]}
						onChange={(e) => setFixedTrack(e.target.value)}
					>
						{GAME_BGM_FILES.map((f) => (
							<option key={f} value={f}>
								{f.replace(/\.[^.]+$/, '')}
							</option>
						))}
					</select>
				)}
			</div>

			<div className="settings-audio-divider" />

			{/* Effets sonores */}
			<p className="settings-audio-section-label">Effets sonores</p>
			<p className="muted small card-hint">
				Coups, captures, échec, victoire, défaite — générés localement (Web Audio).
			</p>
			<VolumeRow label="Volume des effets" value={sfxVolume} onChange={setSfxVol} />
			<label className="toggle-row">
				<input
					type="checkbox"
					data-testid="settings-sfx-muted"
					checked={sfxMuted}
					onChange={(e) => setSfxMuted(e.target.checked)}
				/>
				<span>Couper les effets sonores</span>
			</label>
		</div>
	)
}
