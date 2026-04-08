import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { loadGameAudioPrefs, saveGameAudioPrefs, effectiveBgmVolume } from '../../../config/gameAudioPrefs.js'
import { useGameAudioPrefsLive } from '../hooks/useGameAudioPrefs.js'
import {
	registerGameBgmElement,
	unregisterGameBgmElement,
	tryPlayGameBgm,
} from '../services/gameBgm.js'
import { FADE_OUT_MS, cancelGameBgmFade, fadeGameBgmTo, resetGameBgmFadeController } from '../services/audioFade.js'

/** Musiques d’ambiance en partie : rotation à chaque montage du composant (session). */
const GAME_BGM_FILES = [
	'Theme_of_game.wav',
	'Playing Beltik.m4a',
	'Playing Girev I.m4a',
	'Main Title.m4a',
]

const BGM_ROT_KEY = 'transcendence-game-bgm-rot'

function nextGameBgmSrc() {
	const i = Number(sessionStorage.getItem(BGM_ROT_KEY)) || 0
	const file = GAME_BGM_FILES[i % GAME_BGM_FILES.length]
	sessionStorage.setItem(BGM_ROT_KEY, String(i + 1))
	return `${import.meta.env.BASE_URL}sounds/game/${encodeURIComponent(file)}`.replace(/([^:]\/)\/+/g, '$1')
}

/** Musique de partie : route jeu uniquement ; la lecture démarre au premier coup (voir useChessAudio). */
export function GameAmbientBgm() {
	const audioRef = useRef(null)

	useEffect(() => {
		const audio = new Audio()
		audio.src = nextGameBgmSrc()
		audio.preload = 'auto'
		audio.loop = true
		audio.setAttribute('playsInline', 'true')
		audioRef.current = audio
		registerGameBgmElement(audio)

		const applyPrefs = () => {
			const p = loadGameAudioPrefs()
			audio.volume = effectiveBgmVolume(p)
			audio.muted = p.bgmMuted
		}
		applyPrefs()

		const onPrefs = () => applyPrefs()
		window.addEventListener('transcendence-game-audio-changed', onPrefs)

		audio.load()

		return () => {
			window.removeEventListener('transcendence-game-audio-changed', onPrefs)
			cancelGameBgmFade()
			const v = audio.volume
			void fadeGameBgmTo(audio, 0, FADE_OUT_MS, v).finally(() => {
				unregisterGameBgmElement(audio)
				audio.pause()
				audio.removeAttribute('src')
				audio.load()
				audioRef.current = null
				resetGameBgmFadeController()
			})
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
						Le thème se lance avec le chronomètre (après le premier coup des blancs). Ajustez le volume si besoin.
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
