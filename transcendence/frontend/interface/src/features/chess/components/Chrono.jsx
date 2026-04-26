import { useState, useEffect, useRef } from 'react'

function formatDuration(totalSeconds) {
	const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0))
	const days = Math.floor(safeSeconds / 86400)
	const hours = Math.floor((safeSeconds % 86400) / 3600)
	const minutes = Math.floor((safeSeconds % 3600) / 60)
	const seconds = safeSeconds % 60

	const paddedMinutes = String(minutes).padStart(2, '0')
	const paddedSeconds = String(seconds).padStart(2, '0')

	if (days > 0) {
		const paddedHours = String(hours).padStart(2, '0')
		return `${days}j ${paddedHours}:${paddedMinutes}:${paddedSeconds}`
	}

	if (hours > 0) {
		const paddedHours = String(hours).padStart(2, '0')
		return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`
	}

	return `${paddedMinutes}:${paddedSeconds}`
}

/**
 * Compte à rebours. Un interval par hook, nettoyé à la désactivation ou à la fin du temps.
 * @param {number} [resetVersion] — incrémenter pour remettre le chrono à `initialSeconds` (ex. nouvelle partie).
 */
export function useChessTimer(initialSeconds, isActive, onTimeOut, resetVersion = 0) {
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
	}, [initialSeconds, resetVersion])

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

	return formatDuration(timeLeft)
}

function toNumber(value, fallback = 0) {
	const n = Number(value)
	return Number.isFinite(n) ? n : fallback
}

/**
 * @param {number} movesPlayed — nombre de demi-coups joués (ex. moveLog.length).
 *   Tant que movesPlayed est strictement inférieur à 2, aucun décompte (ouverture).
 */
export function useSynchronizedChessTimers(gameState, currentTurn, movesPlayed = 0) {
	const [nowMs, setNowMs] = useState(() => Date.now())

	useEffect(() => {
		if (!gameState || gameState.status !== 'active') return undefined

		const id = window.setInterval(() => {
			setNowMs(Date.now())
		}, 250)

		return () => window.clearInterval(id)
	}, [gameState?.status, gameState?.last_move_timestamp])

	const fallbackClock = toNumber(gameState?.time_control_seconds, 600)
	const whiteBase = toNumber(gameState?.white_time_left, fallbackClock)
	const blackBase = toNumber(gameState?.black_time_left, fallbackClock)
	const lastMoveTs = toNumber(gameState?.last_move_timestamp, nowMs / 1000)
	let elapsed = Math.max(0, nowMs / 1000 - lastMoveTs)
	// Avant 2 demi-coups, chrono figé (aligné serveur : is_clock_running).
	if (movesPlayed < 2) {
		elapsed = 0
	}

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
		whiteTime: formatDuration(whiteSeconds),
		blackTime: formatDuration(blackSeconds),
	}
}
