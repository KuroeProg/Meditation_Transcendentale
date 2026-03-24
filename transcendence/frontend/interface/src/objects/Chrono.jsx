import { useState, useEffect, useRef } from 'react'

function formatTime(seconds) {
	const minutes = String(Math.floor(seconds / 60)).padStart(2, '0')
	const secondsLeft = String(seconds % 60).padStart(2, '0')
	return `${minutes}:${secondsLeft}`
}

/**
 * Compte à rebours. Un interval par hook, nettoyé à la désactivation ou à la fin du temps.
 */
export function useChessTimer(initialSeconds, isActive, onTimeOut) {
	const [timeLeft, setTimeLeft] = useState(initialSeconds)
	const hasTimedOutRef = useRef(false)
	const onTimeOutRef = useRef(onTimeOut)
	onTimeOutRef.current = onTimeOut

	useEffect(() => {
		setTimeLeft(initialSeconds)
		hasTimedOutRef.current = false
	}, [initialSeconds])

	useEffect(() => {
		if (!isActive) return undefined

		const id = window.setInterval(() => {
			setTimeLeft((t) => {
				if (t <= 1) {
					window.clearInterval(id)
					return 0
				}
				return t - 1
			})
		}, 1000)

		return () => window.clearInterval(id)
	}, [isActive])

	useEffect(() => {
		if (timeLeft === 0 && onTimeOutRef.current && !hasTimedOutRef.current) {
			hasTimedOutRef.current = true
			onTimeOutRef.current()
		}
	}, [timeLeft])

	return formatTime(timeLeft)
}
