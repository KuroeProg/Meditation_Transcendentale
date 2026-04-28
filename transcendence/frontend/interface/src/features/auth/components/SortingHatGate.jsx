/**
 * Feature optionnelle « choixpeau » : attribution aléatoire de coalition pour les comptes locaux.
 *
 * Pour supprimer complètement : retirer <SortingHatGate /> de App.jsx
 * (et optionnellement ce fichier + styles / assets liés).
 */
import { useEffect, useRef, useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { useReduceMotionPref, coalitionSlugToLabel } from '../../theme/index.js'
import { DEV_MOCK_STORAGE, SORTING_HAT_DEV_RETRY_EVENT } from '../../../mock/mockSessionUser.js'
import choixpeauUrl from '../assets/choixpeau.png'
import '../styles/SortingHatGate.css'

const STORAGE_PREFIX = 'transcendance_sorting_hat_v1_'
export const SORTING_HAT_STARTED_EVENT = 'transcendance-sorting-hat-started'
export const SORTING_HAT_COMPLETED_EVENT = 'transcendance-sorting-hat-completed'
const SLUGS = ['feu', 'eau', 'terre', 'air']

const INTRO_LINES = [
	'Approche… Le cuir a soif de vérités, et la couronne sur ton crâne n’est pas qu’un pion décoratif.',
	'Les runes frémissent. Une 418 est passée par là — théière détectée — mais nous allons quand même trancher.',
	'Respire. Déploie ton esprit comme un fou sur la diagonale magique.',
]

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

function pickRandomSlug() {
	return SLUGS[Math.floor(Math.random() * SLUGS.length)]
}

export default function SortingHatGate() {
	const { user, refetch, isAuthenticated, isDevMockAuth, logout } = useAuth()
	const reduceMotion = useReduceMotionPref()
	const [open, setOpen] = useState(false)
	const [phase, setPhase] = useState('idle')
	const [displaySlug, setDisplaySlug] = useState('feu')
	const [finalSlug, setFinalSlug] = useState(null)
	const [introIndex, setIntroIndex] = useState(0)
	const [countdownN, setCountdownN] = useState(null)
	const [saveError, setSaveError] = useState('')
	const cancelledRef = useRef(false)
	const [replayTick, setReplayTick] = useState(0)
	const refetchRef = useRef(refetch)
	const isDevMockAuthRef = useRef(isDevMockAuth)
	const logoutRef = useRef(logout)

	useEffect(() => {
		refetchRef.current = refetch
	}, [refetch])

	useEffect(() => {
		isDevMockAuthRef.current = isDevMockAuth
	}, [isDevMockAuth])

	useEffect(() => {
		logoutRef.current = logout
	}, [logout])

	useEffect(() => {
		const bump = () => setReplayTick((n) => n + 1)
		window.addEventListener(SORTING_HAT_DEV_RETRY_EVENT, bump)
		return () => window.removeEventListener(SORTING_HAT_DEV_RETRY_EVENT, bump)
	}, [])

	useEffect(() => {
		if (!isAuthenticated || !user?.id) return
		const authProv = String(user.auth_provider ?? '')
			.toLowerCase()
			.trim()
		/** En dev, le bouton « Lancer l’animation » relance même avec un compte OAuth (ex. 42). */
		const devForcedReplay = import.meta.env.DEV === true && replayTick > 0
		if (authProv !== 'local' && !devForcedReplay) return
		if (typeof window === 'undefined') return

		/*
		 * Fix principal — one-shot garanti :
		 * Si l'utilisateur a DÉJÀ une coalition côté serveur, on synchronise le
		 * localStorage et on ne déclenche plus jamais la cérémonie.
		 * Couvre : refresh de page, multi-onglets, connexion OAuth sur compte local.
		 */
		if (user?.coalition && !devForcedReplay) {
			const syncKey = `${STORAGE_PREFIX}${user.id}`
			try {
				if (!window.localStorage.getItem(syncKey)) {
					window.localStorage.setItem(syncKey, '1')
				}
			} catch { /* ignore */ }
			return
		}

		const key = `${STORAGE_PREFIX}${user.id}`
		const pendingKey = `${key}_pending`
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
			setSaveError('')
			const target = pickRandomSlug()
			const devReplay = import.meta.env.DEV === true && replayTick > 0

			setPhase('intro')
			setIntroIndex(0)
			setCountdownN(null)
			for (let i = 0; i < INTRO_LINES.length; i++) {
				if (cancelledRef.current) {
					clearPending()
					return
				}
				setIntroIndex(i)
				await sleep(reduceMotion ? 950 : 1450)
			}
			if (cancelledRef.current) {
				clearPending()
				return
			}

			setPhase('countdown')
			for (let n = 3; n >= 1; n--) {
				if (cancelledRef.current) {
					clearPending()
					return
				}
				setCountdownN(n)
				await sleep(reduceMotion ? 620 : 880)
			}
			setCountdownN(null)

			if (cancelledRef.current) {
				clearPending()
				return
			}

			setPhase('suspense')
			await sleep(reduceMotion ? 1100 : 1700)
			if (cancelledRef.current) {
				clearPending()
				return
			}

			setPhase('thinking')
			let i = 0
			let delay = reduceMotion ? 60 : 70
			while (i < 18 && !cancelledRef.current) {
				setDisplaySlug(SLUGS[i % SLUGS.length])
				await sleep(delay)
				delay = Math.min(delay + (reduceMotion ? 14 : 22), reduceMotion ? 140 : 200)
				i++
			}
			if (cancelledRef.current) {
				clearPending()
				return
			}
			setDisplaySlug(target)
			setFinalSlug(target)
			setPhase('reveal')
			await sleep(reduceMotion ? 1200 : 900)

			if (cancelledRef.current) {
				clearPending()
				return
			}

			let persisted = false
			let statusCode = 0
			try {
				const res = await fetch('/api/auth/me/update', {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ coalition: target }),
				})
				statusCode = res.status
				persisted = res.ok
			} catch {
				persisted = false
			}
			if (!persisted && (statusCode === 401 || statusCode === 403)) {
				clearPending()
				await logoutRef.current({ redirectTo: '/auth?mode=login' })
				return
			}
			/* Mock sans cookie API : éviter la boucle infinie si le PUT échoue ; dev replay OAuth idem */
			const shouldPersistAsSuccess = persisted || (import.meta.env.DEV && (isDevMockAuthRef.current || devReplay))
			if (shouldPersistAsSuccess) {
				if (import.meta.env.DEV === true && isDevMockAuthRef.current) {
					try {
						window.localStorage.setItem(DEV_MOCK_STORAGE.COALITION, target)
					} catch {
						/* ignore */
					}
				}
				await refetchRef.current()
				try {
					window.localStorage.setItem(key, '1')
				} catch {
					/* ignore */
				}
				window.dispatchEvent(
					new CustomEvent(SORTING_HAT_COMPLETED_EVENT, {
						detail: { userId: user.id, coalition: target },
					})
				)
				clearPending()
				if (!cancelledRef.current) {
					setPhase('done')
					setOpen(false)
				}
				return
			}

			clearPending()
			if (!cancelledRef.current) {
				setPhase('reveal')
				const suffix = statusCode ? ` (API ${statusCode})` : ''
				setSaveError(`Impossible d'attribuer ta coalition${suffix}. Vérifie la connexion puis réessaie.`)
			}
		}

		queueMicrotask(() => {
			if (cancelledRef.current) return
			window.dispatchEvent(
				new CustomEvent(SORTING_HAT_STARTED_EVENT, {
					detail: { userId: user.id },
				})
			)
			setOpen(true)
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
	}, [user?.id, user?.auth_provider, isAuthenticated, reduceMotion, replayTick])

	const showHat = open && phase !== 'done' && phase !== 'idle'
	const title = 'La cérémonie de Transcendance'

	return (
		<AnimatePresence>
			{open && (
				<Motion.div
					key="sorting-hat-overlay"
					className="sorting-hat-overlay"
					role="dialog"
					aria-modal="true"
					aria-live="polite"
					aria-label={title}
					data-testid="sorting-hat-overlay"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: reduceMotion ? 0 : 0.35 }}
				>
					<Motion.div
						className="sorting-hat-frame"
						initial={reduceMotion ? false : { scale: 0.94, y: 20 }}
						animate={{ scale: 1, y: 0 }}
						exit={reduceMotion ? undefined : { scale: 0.96, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 300, damping: 28 }}
					>
						<header className="sorting-hat-banner">
							<h2 className="sorting-hat-banner-title">{title}</h2>
						</header>

						<div className="sorting-hat-panel">
							{showHat && (
								<div className="sorting-hat-pedestal">
									<Motion.img
										src={choixpeauUrl}
										alt=""
										className="sorting-hat-asset"
										initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
									/>
								</div>
							)}

							<AnimatePresence mode="wait">
								{phase === 'intro' && !reduceMotion && (
									<Motion.p
										key={`intro-${introIndex}`}
										className="sorting-hat-prose"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -6 }}
										transition={{ duration: 0.35 }}
									>
										{INTRO_LINES[introIndex] ?? INTRO_LINES[0]}
									</Motion.p>
								)}

								{phase === 'countdown' && countdownN != null && !reduceMotion && (
									<Motion.div
										key={`cd-${countdownN}`}
										className="sorting-hat-count-wrap"
										initial={{ opacity: 0, scale: 0.6 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 1.15 }}
										transition={{ duration: 0.32 }}
									>
										<p className="sorting-hat-count-label">Le sort s’active dans…</p>
										<div className="sorting-hat-count" aria-live="assertive">
											{countdownN}
										</div>
									</Motion.div>
								)}

								{phase === 'suspense' && !reduceMotion && (
									<Motion.p
										key="suspense"
										className="sorting-hat-suspense"
										initial={{ opacity: 0 }}
										animate={{ opacity: [0.35, 1, 0.35] }}
										transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
									>
										Shhh… le plateau écoute.
									</Motion.p>
								)}

								{(phase === 'thinking' || phase === 'reveal') && (
									<Motion.div
										key="result-block"
										className="sorting-hat-result-block"
										initial={reduceMotion ? false : { opacity: 0 }}
										animate={{ opacity: 1 }}
									>
										<p className="sorting-hat-kicker">
											{phase === 'reveal' && finalSlug ? 'Verdict' : 'Le choixpeau hésite…'}
										</p>
										<AnimatePresence mode="wait">
											<Motion.p
												key={`${phase}-${displaySlug}-${finalSlug ?? ''}`}
												className={`sorting-hat-result sorting-hat-result--${phase === 'reveal' && finalSlug ? finalSlug : displaySlug}`}
												initial={reduceMotion ? false : { opacity: 0, y: 8 }}
												animate={{ opacity: 1, y: 0 }}
												exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
												transition={{ duration: reduceMotion ? 0 : 0.22 }}
											>
												{phase === 'reveal' && finalSlug
													? `Ta coalition : ${coalitionSlugToLabel(finalSlug)} — que les parties te soient favorables.`
													: `${coalitionSlugToLabel(displaySlug)}...`}
											</Motion.p>
										</AnimatePresence>
									</Motion.div>
								)}
							</AnimatePresence>

							<p className="sorting-hat-hint">
								Compte local (ou aperçu dev) — attribution symbolique hors coalition Intra 42.
							</p>
							{saveError ? (
								<div className="sorting-hat-error" role="status" aria-live="assertive">
									<p>{saveError}</p>
									<button
										type="button"
										className="sorting-hat-retry-btn"
										onClick={() => setReplayTick((n) => n + 1)}
										data-testid="sorting-hat-retry"
									>
										Réessayer
									</button>
								</div>
							) : null}
						</div>
					</Motion.div>
				</Motion.div>
			)}
		</AnimatePresence>
	)
}
