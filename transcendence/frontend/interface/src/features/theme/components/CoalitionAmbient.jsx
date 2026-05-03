import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/index.js'
import { coalitionToSlug, shouldUseNeutralGuestTheme } from '../services/coalitionTheme.js'
import { COALITION_ACCENTS, COALITION_BACKGROUNDS } from '../services/coalitionAmbience.js'
import CoalitionParticleCanvas from './CoalitionParticleCanvas.jsx'
import '../styles/CoalitionAmbient.css'

/** Fond coalition : `/` exclus, masqué tant que la session ou le PNG ne sont pas prêts. */
export default function CoalitionAmbient() {
	const location = useLocation()
	const { user, loading } = useAuth()
	const slug = user
		? coalitionToSlug(user?.coalition ?? user?.coalition_name)
		: shouldUseNeutralGuestTheme(location.pathname, Boolean(user), loading)
			? 'neutral'
			: coalitionToSlug(null)
	const [reducedMotion, setReducedMotion] = useState(
		() => document.documentElement.getAttribute('data-reduce-motion') === 'true',
	)
	const [lightMode, setLightMode] = useState(
		() => document.documentElement.getAttribute('data-light-mode') === 'true',
	)
	const [bgReady, setBgReady] = useState(false)
	const deepRef = useRef(null)
	const particlesRef = useRef(null)
	const mouseRef = useRef({ x: 0, y: 0 })
	const reducedMotionRef = useRef(reducedMotion)
	const lightModeRef = useRef(lightMode)

	useEffect(() => {
		reducedMotionRef.current = reducedMotion
	}, [reducedMotion])

	useEffect(() => {
		lightModeRef.current = lightMode
	}, [lightMode])

	useEffect(() => {
		const sync = () => {
			const rm = document.documentElement.getAttribute('data-reduce-motion') === 'true'
			setReducedMotion(rm)
			reducedMotionRef.current = rm
			const lm = document.documentElement.getAttribute('data-light-mode') === 'true'
			setLightMode(lm)
			lightModeRef.current = lm
		}
		sync()
		window.addEventListener('transcendence-prefs-changed', sync)
		return () => window.removeEventListener('transcendence-prefs-changed', sync)
	}, [])

	const onAppRoute = location.pathname !== '/'

	useEffect(() => {
		let cancelled = false
		const markNotReady = () => {
			void Promise.resolve().then(() => {
				if (!cancelled) setBgReady(false)
			})
		}
		if (!onAppRoute || loading) {
			markNotReady()
			return () => {
				cancelled = true
			}
		}
		markNotReady()
		if (slug === 'neutral') {
			void Promise.resolve().then(() => {
				if (!cancelled) setBgReady(true)
			})
			return () => {
				cancelled = true
			}
		}
		const url = COALITION_BACKGROUNDS[slug] ?? COALITION_BACKGROUNDS.feu
		const img = new Image()
		img.decoding = 'async'
		const done = () => {
			if (!cancelled) setBgReady(true)
		}
		img.onload = done
		img.onerror = done
		img.src = url
		return () => {
			cancelled = true
		}
	}, [slug, onAppRoute, loading])

	useEffect(() => {
		/* Mode léger ou animations réduites : pas de suivi souris. */
		if (!onAppRoute || loading || lightMode) return
		const onMove = (e) => {
			mouseRef.current = {
				x: (e.clientX / window.innerWidth - 0.5) * 2,
				y: (e.clientY / window.innerHeight - 0.5) * 2,
			}
		}
		window.addEventListener('mousemove', onMove, { passive: true })
		return () => window.removeEventListener('mousemove', onMove)
	}, [onAppRoute, loading, lightMode])

	function applyParallax(now, t0) {
		const rm = reducedMotionRef.current || lightModeRef.current
		const t = (now - t0) * 0.00035
		const driftX = rm ? 0 : Math.sin(t * 0.7) * 0.55 + Math.sin(t * 1.3) * 0.2
		const driftY = rm ? 0 : Math.cos(t * 0.5) * 0.4 + Math.cos(t * 1.1) * 0.15
		const m = mouseRef.current
		const px = rm ? 0 : m.x + driftX
		const py = rm ? 0 : m.y + driftY
		const d = deepRef.current
		const posX = 50 + px * 5
		const posY = 50 + py * 4
		const tf = rm ? 'scale(1.14)' : `scale(1.18) translate(${px * 14}px, ${py * 10}px)`
		if (d) {
			d.style.backgroundPosition = `${posX}% ${posY}%`
			d.style.transform = tf
		}
		/* Même transform que le fond : sinon la pluie (canvas) semble dériver en X/Y (effet « neige »). */
		const pc = particlesRef.current
		if (pc) {
			pc.style.transform = tf
		}
	}

	useLayoutEffect(() => {
		if (!onAppRoute || loading || !bgReady) return
		applyParallax(performance.now(), performance.now())
	}, [onAppRoute, loading, bgReady, slug, lightMode])

	useEffect(() => {
		if (!onAppRoute || loading || !bgReady) return
		if (reducedMotion || lightMode) {
			applyParallax(performance.now(), performance.now())
			return undefined
		}
		const t0 = performance.now()
		let id = 0
		function tick(now) {
			applyParallax(now, t0)
			id = requestAnimationFrame(tick)
		}
		id = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(id)
	}, [onAppRoute, loading, bgReady, reducedMotion, lightMode, slug])

	if (!onAppRoute) return null
	if (loading) return null

	const isNeutral = slug === 'neutral'
	const bg = isNeutral ? null : COALITION_BACKGROUNDS[slug] ?? COALITION_BACKGROUNDS.feu
	const accent = COALITION_ACCENTS[slug] ?? COALITION_ACCENTS.feu
	/* Mode léger : pas de particules, pas d'animation ; fond coalition gardé (DA coalitions préservée). */
	const showParticles = !reducedMotion && !lightMode && bgReady && !isNeutral

	const staticLayout = reducedMotion || lightMode
	const deepTfNeutral = staticLayout ? 'scale(1.06)' : 'scale(1.08)'
	const deepTfCoalition = staticLayout ? 'scale(1.14)' : 'scale(1.18)'
	const deepStyle = isNeutral
		? {
				backgroundColor: '#060814',
				backgroundImage:
					'radial-gradient(ellipse 95% 70% at 50% 18%, rgba(72, 96, 150, 0.28) 0%, transparent 52%), radial-gradient(ellipse 80% 55% at 80% 90%, rgba(30, 45, 88, 0.22) 0%, transparent 45%), linear-gradient(168deg, #070a14 0%, #0c1226 42%, #080a12 100%)',
				backgroundSize: 'cover',
				backgroundRepeat: 'no-repeat',
				transform: deepTfNeutral,
				backgroundPosition: '50% 50%',
			}
		: {
				backgroundImage: `url(${bg})`,
				backgroundSize: 'cover',
				backgroundRepeat: 'no-repeat',
				transform: deepTfCoalition,
				backgroundPosition: '50% 50%',
			}

	return (
		<div
			className={`coalition-ambient ${bgReady ? 'coalition-ambient--ready' : ''}`}
			data-coalition-scene={slug}
			style={{ '--coalition-accent': accent }}
			aria-hidden
		>
			<div className="coalition-ambient__glow" />
			<div
				ref={deepRef}
				className="coalition-ambient__layer coalition-ambient__layer--deep"
				style={deepStyle}
			/>
			<div className="coalition-ambient__punch" />
			<div className="coalition-ambient__veil" />
			{showParticles && (
				<div
					ref={particlesRef}
					className="coalition-ambient__particles-parallax"
					style={{ transform: deepTfCoalition }}
				>
					<CoalitionParticleCanvas slug={slug} reducedMotion={false} />
				</div>
			)}
			<div className="coalition-ambient__vignette" />
		</div>
	)
}
