import { useEffect, useState } from 'react'
import {
	loadGameAudioPrefs,
	GAME_AUDIO_PREFS_KEY,
} from '../config/gameAudioPrefs.js'

export function useGameAudioPrefsLive() {
	const [prefs, setPrefs] = useState(loadGameAudioPrefs)

	useEffect(() => {
		const onCustom = (e) => {
			setPrefs(e.detail ?? loadGameAudioPrefs())
		}
		const onStorage = (e) => {
			if (e.key === GAME_AUDIO_PREFS_KEY) setPrefs(loadGameAudioPrefs())
		}
		window.addEventListener('transcendence-game-audio-changed', onCustom)
		window.addEventListener('storage', onStorage)
		return () => {
			window.removeEventListener('transcendence-game-audio-changed', onCustom)
			window.removeEventListener('storage', onStorage)
		}
	}, [])

	return prefs
}
