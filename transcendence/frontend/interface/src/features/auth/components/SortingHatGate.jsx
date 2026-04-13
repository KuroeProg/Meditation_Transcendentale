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
import { SORTING_HAT_DEV_RETRY_EVENT } from '../../../mock/mockSessionUser.js'
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

/** Ancien format `pending` = "1" pouvait bloquer l’anim après crash ; timestamp = fenêtre anti-doublon courte. */
/** Au-delà, un `pending` orphelin (crash / onglet fermé) est purgé au prochain montage. */
const PENDING_MAX_AGE_MS = 90_000

/**
 * @returns {'absent' | 'recent'}
 */
function normalizeSortingHatPending(pendingKey) {
	try {
		const raw = window.localStorage.getItem(pendingKey)
		if (!raw) return 'absent'
		if (raw === '1') {
			window.localStorage.removeItem(pendingKey)
			return 'absent'
		}
		const ts = parseInt(raw, 10)
		if (Number.isNaN(ts)) {
			window.localStorage.removeItem(pendingKey)
			return 'absent'
		}
		const age = Date.now() - ts
		if (age > PENDING_MAX_AGE_MS || age < -120_000) {
			window.localStorage.removeItem(pendingKey)
			return 'absent'
		}
		return 'recent'
	} catch {
		return 'absent'
	}
}

export default function SortingHatGate() {
	const { user, refetch, isAuthenticated, isDevMockAuth } = useAuth()
	const reduceMotion = useReduceMotionPref()
	const [open, setOpen] = useState(false)
	const [phase, setPhase] = useState('idle')
	const [displaySlug, setDisplaySlug] = useState('feu')
	const [finalSlug, setFinalSlug] = useState(null)
	const cancelledRef = useRef(false)
	const [replayTick, setReplayTick] = useState(0)

	useEffect(() => {
		const bump = () => setReplayTick((n) => n + 1)
		window.addEventListener(SORTING_HAT_DEV_RETRY_EVENT, bump)
		return () => window.removeEventListener(SORTING_HAT_DEV_RETRY_EVENT, bump)
	}, [])

	useEffect(() => {
		if (!SORTING_HAT_COALITION_ENABLED || !isAuthenticated || !user?.id) return
		const authProv = String(user.auth_provider ?? '')
			.toLowerCase()
			.trim()
		if (authProv !== 'local') return
		if (typeof window === 'undefined') return

		const key = `${STORAGE_PREFIX}${user.id}`
		const pendingKey = `${key}_pending`
		if (window.localStorage.getItem(key)) return
		if (normalizeSortingHatPending(pendingKey) === 'recent') return
		window.localStorage.setItem(pendingKey, String(Date.now()))

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

			let persisted = false
			try {
				const res = await fetch('/api/auth/me/update', {
					method: 'PUT',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ coalition: target }),
				})
				persisted = res.ok
			} catch {
				persisted = false
			}
			/* Mock sans cookie API : éviter la boucle infinie si le PUT échoue */
			if (persisted || (import.meta.env.DEV && isDevMockAuth)) {
				await refetch()
				try {
					window.localStorage.setItem(key, '1')
				} catch {
					/* ignore */
				}
			}
			clearPending()

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
	}, [user?.id, user?.auth_provider, isAuthenticated, refetch, reduceMotion, replayTick, isDevMockAuth])

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
