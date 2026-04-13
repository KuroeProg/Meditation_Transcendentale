/**
 * Feature optionnelle « choixpeau » : attribution aléatoire de coalition pour les comptes locaux.
 *
 * Pour supprimer complètement :
 * 1) Retirer <SortingHatGate /> de App.jsx
 * 2) Ne pas activer VITE_SORTING_HAT_COALITION (ou false)
 * 3) Optionnel : supprimer ce fichier + featureFlags.js + la clé .env.example
 */
import { useEffect, useRef, useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { useReduceMotionPref, coalitionSlugToLabel } from '../../theme/index.js'
import { SORTING_HAT_COALITION_ENABLED } from '../../../config/featureFlags.js'
import '../styles/SortingHatGate.css'

const STORAGE_PREFIX = 'transcendance_sorting_hat_v1_'
const SLUGS = ['feu', 'eau', 'terre', 'air']

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

function pickRandomSlug() {
	return SLUGS[Math.floor(Math.random() * SLUGS.length)]
}

export default function SortingHatGate() {
	const { user, refetch, isAuthenticated } = useAuth()
	const reduceMotion = useReduceMotionPref()
	const [open, setOpen] = useState(false)
	const [phase, setPhase] = useState('idle')
	const [displaySlug, setDisplaySlug] = useState('feu')
	const [finalSlug, setFinalSlug] = useState(null)
	const cancelledRef = useRef(false)

	useEffect(() => {
		if (!SORTING_HAT_COALITION_ENABLED || !isAuthenticated || !user?.id) return
		if (user.auth_provider !== 'local') return
		if (typeof window === 'undefined') return

		const key = `${STORAGE_PREFIX}${user.id}`
		const pendingKey = `${key}_pending`
		if (window.localStorage.getItem(key)) return
		if (window.localStorage.getItem(pendingKey)) return
		window.localStorage.setItem(pendingKey, '1')

		cancelledRef.current = false

		const clearPending = () => {
			try {
				window.localStorage.removeItem(pendingKey)
			} catch {
				/* ignore */
			}
		}

		const run = async () => {
			const target = pickRandomSlug()
			if (reduceMotion) {
				setDisplaySlug(target)
				setFinalSlug(target)
				setPhase('reveal')
				await sleep(400)
			} else {
				let i = 0
				let delay = 70
				while (i < 18 && !cancelledRef.current) {
					setDisplaySlug(SLUGS[i % SLUGS.length])
					await sleep(delay)
					delay = Math.min(delay + 22, 200)
					i++
				}
				if (cancelledRef.current) {
					clearPending()
					return
				}
				setDisplaySlug(target)
				setFinalSlug(target)
				setPhase('reveal')
				await sleep(720)
			}

			if (cancelledRef.current) {
				clearPending()
				return
			}

			try {
				const res = await fetch('/api/auth/me/update', {
					method: 'PUT',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ coalition: target }),
				})
				if (res.ok) {
					await refetch()
					window.localStorage.setItem(key, '1')
					clearPending()
				} else {
					clearPending()
				}
			} catch {
				clearPending()
			}

			if (!cancelledRef.current) {
				setPhase('done')
				setOpen(false)
			}
		}

		queueMicrotask(() => {
			if (cancelledRef.current) return
			setOpen(true)
			setPhase('thinking')
			setFinalSlug(null)
			void run()
		})

		return () => {
			cancelledRef.current = true
			try {
				if (!window.localStorage.getItem(key)) {
					window.localStorage.removeItem(pendingKey)
				}
			} catch {
				/* ignore */
			}
		}
	}, [user?.id, user?.auth_provider, isAuthenticated, refetch, reduceMotion])

	if (!SORTING_HAT_COALITION_ENABLED) return null

	return (
		<AnimatePresence>
			{open && (
				<Motion.div
					key="sorting-hat-overlay"
					className="sorting-hat-overlay"
					role="dialog"
					aria-modal="true"
					aria-live="polite"
					aria-label="Attribution de coalition"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: reduceMotion ? 0 : 0.35 }}
				>
					<Motion.div
						className="sorting-hat-card"
						initial={reduceMotion ? false : { scale: 0.92, y: 16 }}
						animate={{ scale: 1, y: 0 }}
						exit={reduceMotion ? undefined : { scale: 0.96, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 320, damping: 28 }}
					>
						<div className="sorting-hat-icon" aria-hidden="true">
							<i className="ri-magic-line" />
						</div>
						<p className="sorting-hat-kicker">Un instant…</p>
						<h2 className="sorting-hat-title">Le choixpeau choisit ta coalition</h2>
						<AnimatePresence mode="wait">
							<Motion.p
								key={`${phase}-${displaySlug}`}
								className={`sorting-hat-result sorting-hat-result--${displaySlug}`}
								initial={reduceMotion ? false : { opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
								transition={{ duration: reduceMotion ? 0 : 0.22 }}
							>
								{phase === 'reveal' && finalSlug
									? `C’est décidé : ${coalitionSlugToLabel(finalSlug)} !`
									: `Hmm… ${coalitionSlugToLabel(displaySlug)} ?`}
							</Motion.p>
						</AnimatePresence>
						<p className="sorting-hat-hint">Compte local — pas de coalition Intra 42 détectée.</p>
					</Motion.div>
				</Motion.div>
			)}
		</AnimatePresence>
	)
}
