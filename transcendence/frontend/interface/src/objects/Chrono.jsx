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

	useEffect(() => {
		onTimeOutRef.current = onTimeOut
	}, [onTimeOut])

	useEffect(() => {
		queueMicrotask(() => {
			setTimeLeft(initialSeconds)
			hasTimedOutRef.current = false
		})
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

function toNumber(value, fallback = 0) {
	const n = Number(value)
	return Number.isFinite(n) ? n : fallback
}

export function useSynchronizedChessTimers(gameState, currentTurn) {
	const [nowMs, setNowMs] = useState(() => Date.now())

	useEffect(() => {
		if (!gameState || gameState.status !== 'active') return undefined

		const id = window.setInterval(() => {
			setNowMs(Date.now())
		}, 250)

		return () => window.clearInterval(id)
	}, [gameState?.status, gameState?.last_move_timestamp])

	const whiteBase = toNumber(gameState?.white_time_left, 600)
	const blackBase = toNumber(gameState?.black_time_left, 600)
	const lastMoveTs = toNumber(gameState?.last_move_timestamp, nowMs / 1000)
	const elapsed = Math.max(0, nowMs / 1000 - lastMoveTs)

	let whiteSeconds = whiteBase
	let blackSeconds = blackBase

	if (gameState?.status === 'active') {
		if (currentTurn === 'w') {
			whiteSeconds = Math.max(0, whiteBase - elapsed)
		} else if (currentTurn === 'b') {
			blackSeconds = Math.max(0, blackBase - elapsed)
		}
	}

	return {
		whiteSeconds,
		blackSeconds,
		whiteTime: formatTime(Math.floor(whiteSeconds)),
		blackTime: formatTime(Math.floor(blackSeconds)),
	}
}
