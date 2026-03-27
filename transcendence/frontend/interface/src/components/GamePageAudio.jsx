import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { loadGameAudioPrefs, saveGameAudioPrefs } from '../config/gameAudioPrefs.js'
import { useGameAudioPrefsLive } from '../hooks/useGameAudioPrefs.js'
import {
	registerGameBgmElement,
	unregisterGameBgmElement,
	tryPlayGameBgm,
} from '../audio/gameBgm.js'

const BGM_SRC = `${import.meta.env.BASE_URL}sounds/game/Midnight_Basin.mp3`.replace(/([^:]\/)\/+/g, '$1')

/** Durée de la boucle (secondes) — seules les 29 premières secondes sont rejouées. */
export const BGM_LOOP_DURATION_SEC = 29

/**
 * Courbe de volume : le fichier peut être mixé bas ; on compense légèrement tout en restant ≤ 1.
 * À 100 % du curseur → volume navigateur = 1.
 */
function effectiveBgmVolume(prefs) {
	if (prefs.bgmMuted) return 0
	const raw = Math.min(1, Math.max(0, prefs.bgmVolume))
	return Math.min(1, raw * 2.15)
}

/** Musique d’ambiance : page partie uniquement, boucle 0–29 s. */
export function GameAmbientBgm() {
	const audioRef = useRef(null)

	useEffect(() => {
		const audio = new Audio()
		audio.src = BGM_SRC
		audio.preload = 'auto'
		audio.loop = false
		audio.setAttribute('playsInline', 'true')
		audioRef.current = audio
		registerGameBgmElement(audio)

		const loopSegment = () => {
			if (audio.currentTime >= BGM_LOOP_DURATION_SEC) {
				audio.currentTime = 0
			}
		}

		const applyPrefs = () => {
			const p = loadGameAudioPrefs()
			audio.volume = effectiveBgmVolume(p)
			audio.muted = p.bgmMuted
		}
		applyPrefs()

		const onPrefs = () => applyPrefs()
		window.addEventListener('transcendence-game-audio-changed', onPrefs)
		audio.addEventListener('timeupdate', loopSegment)

		const tryPlay = () => {
			void tryPlayGameBgm()
		}

		const onCanPlay = () => {
			tryPlay()
		}
		audio.addEventListener('canplay', onCanPlay)

		const unlock = () => {
			tryPlay()
		}
		window.addEventListener('pointerdown', unlock, true)

		audio.load()

		return () => {
			window.removeEventListener('transcendence-game-audio-changed', onPrefs)
			window.removeEventListener('pointerdown', unlock, true)
			audio.removeEventListener('timeupdate', loopSegment)
			audio.removeEventListener('canplay', onCanPlay)
			unregisterGameBgmElement(audio)
			audio.pause()
			audio.removeAttribute('src')
			audio.load()
			audioRef.current = null
		}
	}, [])

	return null
}

/** Panneau musique : accessible pendant la partie (coin du plateau). */
export function GameMusicPanel() {
	const prefs = useGameAudioPrefsLive()
	const [open, setOpen] = useState(false)
	const wrapRef = useRef(null)

	useEffect(() => {
		if (!open) return
		const close = (e) => {
			if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
		}
		document.addEventListener('pointerdown', close, true)
		return () => document.removeEventListener('pointerdown', close, true)
	}, [open])

	const pct = Math.round(prefs.bgmVolume * 100)

	const setVolume = useCallback((v) => {
		saveGameAudioPrefs({ bgmVolume: v })
	}, [])

	const setMuted = useCallback((m) => {
		saveGameAudioPrefs({ bgmMuted: m })
	}, [])

	return (
		<div className="game-music-panel-wrap" ref={wrapRef}>
			<button
				type="button"
				className={`game-music-fab${prefs.bgmMuted ? ' game-music-fab--muted' : ''}`}
				aria-expanded={open}
				aria-label={prefs.bgmMuted ? 'Musique coupée — ouvrir les réglages' : 'Musique d’ambiance — réglages'}
				onPointerDown={() => {
					void tryPlayGameBgm()
				}}
				onClick={() => setOpen((o) => !o)}
			>
				<i className={prefs.bgmMuted ? 'ri-volume-mute-line' : 'ri-volume-down-line'} aria-hidden />
			</button>
			{open ? (
				<div className="game-music-popover" role="dialog" aria-label="Musique du jeu">
					<p className="game-music-popover__title">Musique d’ambiance</p>
					<p className="game-music-popover__hint">
						Boucle sur les {BGM_LOOP_DURATION_SEC} premières secondes. Très discret par défaut — monte le volume si
						besoin.
					</p>
					<label className="game-music-slider-label">
						<span>Volume</span>
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
						<input
							type="checkbox"
							checked={prefs.bgmMuted}
							onChange={(e) => setMuted(e.target.checked)}
						/>
						<span>Couper la musique</span>
					</label>
					<Link
						to="/settings"
						className="game-music-popover__settings-link"
						onClick={() => setOpen(false)}
					>
						Paramètres complets
					</Link>
				</div>
			) : null}
		</div>
	)
}
