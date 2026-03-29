import { useEffect, useState } from 'react'

/** Préférence « Réduire les animations » : reflet de `document.documentElement` (`data-reduce-motion`). */
export function useReduceMotionPref() {
	const [on, setOn] = useState(
		() => typeof document !== 'undefined' && document.documentElement.getAttribute('data-reduce-motion') === 'true',
	)

	useEffect(() => {
		const sync = () => {
			setOn(document.documentElement.getAttribute('data-reduce-motion') === 'true')
		}
		sync()
		window.addEventListener('transcendence-prefs-changed', sync)
		return () => window.removeEventListener('transcendence-prefs-changed', sync)
	}, [])

	return on
}
