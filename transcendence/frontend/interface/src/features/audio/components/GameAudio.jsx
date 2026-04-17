import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { loadGameAudioPrefs, saveGameAudioPrefs, effectiveBgmVolume } from '../../../config/gameAudioPrefs.js'
import { useGameAudioPrefsLive } from '../hooks/useGameAudioPrefs.js'
import {
	registerGameBgmElement,
	unregisterGameBgmElement,
	tryPlayGameBgm,
} from '../services/gameBgm.js'
import { cancelGameBgmFade, resetGameBgmFadeController } from '../services/audioFade.js'

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
			/* Pause immédiate : sinon le fondu chevauche la reprise du BGM accueil à la sortie de /game */
			audio.pause()
			audio.volume = 0
			unregisterGameBgmElement(audio)
			audio.removeAttribute('src')
			audio.load()
			audioRef.current = null
			resetGameBgmFadeController()
		}
	}, [])

	return null
}

const POPOVER_EST_H = 300

function computePopoverStyle(btnEl) {
	if (!btnEl) return null
	const r = btnEl.getBoundingClientRect()
	const w = Math.min(240, window.innerWidth - 24)
	let left = r.right - w
	if (left < 12) left = 12
	if (left + w > window.innerWidth - 12) left = Math.max(12, window.innerWidth - 12 - w)

	let top = r.bottom + 6
	if (top + POPOVER_EST_H > window.innerHeight - 12) {
		top = Math.max(12, r.top - POPOVER_EST_H - 6)
	}

	return { position: 'fixed', top, left, width: w, zIndex: 11000 }
}

/** Contrôle musique intégré au panneau stats (plus de bouton flottant sur le plateau). */
export function GameMusicPanel() {
	const prefs = useGameAudioPrefsLive()
	const [open, setOpen] = useState(false)
	const wrapRef = useRef(null)
	const btnRef = useRef(null)
	const popoverRef = useRef(null)
	const [popoverStyle, setPopoverStyle] = useState(null)

	const updatePopoverPosition = useCallback(() => {
		if (!open) return
		setPopoverStyle(computePopoverStyle(btnRef.current))
	}, [open])

	useLayoutEffect(() => {
		if (!open) {
			setPopoverStyle(null)
			return
		}
		updatePopoverPosition()
		const onScroll = () => updatePopoverPosition()
		const onResize = () => updatePopoverPosition()
		window.addEventListener('scroll', onScroll, true)
		window.addEventListener('resize', onResize)
		return () => {
			window.removeEventListener('scroll', onScroll, true)
			window.removeEventListener('resize', onResize)
		}
	}, [open, updatePopoverPosition])

	useEffect(() => {
		if (!open) return
		const close = (e) => {
			if (wrapRef.current?.contains(e.target)) return
			if (popoverRef.current?.contains(e.target)) return
			setOpen(false)
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

	const popover = open ? (
		<div
			ref={popoverRef}
			className="game-music-popover game-music-popover--portal"
			style={popoverStyle ?? undefined}
			role="dialog"
			aria-label="Musique du jeu"
		>
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
	) : null

	return (
		<>
			<div className="game-music-panel-wrap game-music-panel-wrap--embedded" ref={wrapRef}>
				<button
					ref={btnRef}
					type="button"
					className={`game-music-fab game-music-fab--embedded${prefs.bgmMuted ? ' game-music-fab--muted' : ''}`}
					aria-expanded={open}
					aria-label={prefs.bgmMuted ? 'Musique coupée — ouvrir les réglages' : 'Musique d’ambiance — réglages'}
					onPointerDown={() => {
						void tryPlayGameBgm()
					}}
					onClick={() => setOpen((o) => !o)}
				>
					<i className={prefs.bgmMuted ? 'ri-volume-mute-line' : 'ri-volume-down-line'} aria-hidden />
				</button>
			</div>
			{popover && createPortal(popover, document.body)}
		</>
	)
}
