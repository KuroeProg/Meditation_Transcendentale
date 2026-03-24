import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { coalitionToSlug } from '../utils/coalitionTheme.js'
import { COALITION_ACCENTS, COALITION_BACKGROUNDS } from '../theme/coalitionAmbience.js'
import CoalitionParticleCanvas from './CoalitionParticleCanvas.jsx'
import './CoalitionAmbient.css'

/**
 * Fond coalition + parallax + particules.
 * Désactivé sur `/`. Parallax en rAF direct (refs) pour éviter 60 re-renders/s React.
 * Masqué pendant le chargement session + jusqu’au decode du PNG → plus de flash au reload.
 */
export default function CoalitionAmbient() {
	const location = useLocation()
	const { user, loading } = useAuth()
	const slug = coalitionToSlug(user?.coalition ?? user?.coalition_name)
	const [reducedMotion, setReducedMotion] = useState(
		() => document.documentElement.getAttribute('data-reduce-motion') === 'true',
	)
	const [bgReady, setBgReady] = useState(false)
	const deepRef = useRef(null)
	const midRef = useRef(null)
	const mouseRef = useRef({ x: 0, y: 0 })
	const reducedMotionRef = useRef(reducedMotion)

	useEffect(() => {
		reducedMotionRef.current = reducedMotion
	}, [reducedMotion])

	useEffect(() => {
		const sync = () => {
			const v = document.documentElement.getAttribute('data-reduce-motion') === 'true'
			setReducedMotion(v)
			reducedMotionRef.current = v
		}
		sync()
		window.addEventListener('transcendence-prefs-changed', sync)
		return () => window.removeEventListener('transcendence-prefs-changed', sync)
	}, [])

	/* Pas d’ambiance tant que la session n’est pas résolue → évite feu puis eau au reload */
	const onAppRoute = location.pathname !== '/'

	useEffect(() => {
		if (!onAppRoute || loading) {
			setBgReady(false)
			return
		}
		setBgReady(false)
		const url = COALITION_BACKGROUNDS[slug] ?? COALITION_BACKGROUNDS.feu
		const img = new Image()
		img.decoding = 'async'
		const done = () => setBgReady(true)
		img.onload = done
		img.onerror = done
		img.src = url
	}, [slug, onAppRoute, loading])

	useEffect(() => {
		if (!onAppRoute || loading) return
		const onMove = (e) => {
			mouseRef.current = {
				x: (e.clientX / window.innerWidth - 0.5) * 2,
				y: (e.clientY / window.innerHeight - 0.5) * 2,
			}
		}
		window.addEventListener('mousemove', onMove, { passive: true })
		return () => window.removeEventListener('mousemove', onMove)
	}, [onAppRoute, loading])

	function applyParallax(now, t0) {
		const rm = reducedMotionRef.current
		const t = (now - t0) * 0.00035
		const driftX = rm ? 0 : Math.sin(t * 0.7) * 0.55 + Math.sin(t * 1.3) * 0.2
		const driftY = rm ? 0 : Math.cos(t * 0.5) * 0.4 + Math.cos(t * 1.1) * 0.15
		const m = mouseRef.current
		const px = rm ? 0 : m.x + driftX
		const py = rm ? 0 : m.y + driftY
		const d = deepRef.current
		const mi = midRef.current
		if (d) {
			d.style.backgroundPosition = `${50 + px * 5}% ${50 + py * 4}%`
			d.style.transform = rm ? 'scale(1.14)' : `scale(1.18) translate(${px * 14}px, ${py * 10}px)`
		}
		if (mi) {
			mi.style.backgroundPosition = `${50 + px * 2.8}% ${50 + py * 2.2}%`
			mi.style.transform = rm ? 'scale(1.06)' : `scale(1.1) translate(${px * 7}px, ${py * 5}px)`
		}
	}

	useLayoutEffect(() => {
		if (!onAppRoute || loading || !bgReady) return
		applyParallax(performance.now(), performance.now())
	}, [onAppRoute, loading, bgReady])

	useEffect(() => {
		if (!onAppRoute || loading || !bgReady) return
		const t0 = performance.now()
		let id = 0
		function tick(now) {
			applyParallax(now, t0)
			id = requestAnimationFrame(tick)
		}
		id = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(id)
	}, [onAppRoute, loading, bgReady])

	if (!onAppRoute) return null
	if (loading) return null

	const bg = COALITION_BACKGROUNDS[slug] ?? COALITION_BACKGROUNDS.feu
	const accent = COALITION_ACCENTS[slug] ?? COALITION_ACCENTS.feu
	const showParticles = !reducedMotion && bgReady

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
				style={{
					backgroundImage: `url(${bg})`,
					backgroundSize: 'cover',
					backgroundRepeat: 'no-repeat',
					transform: reducedMotion ? 'scale(1.14)' : 'scale(1.18)',
					backgroundPosition: '50% 50%',
				}}
			/>
			<div
				ref={midRef}
				className="coalition-ambient__layer coalition-ambient__layer--mid"
				style={{
					backgroundImage: `url(${bg})`,
					backgroundSize: 'cover',
					backgroundRepeat: 'no-repeat',
					transform: reducedMotion ? 'scale(1.06)' : 'scale(1.1)',
					backgroundPosition: '50% 50%',
				}}
			/>
			<div className="coalition-ambient__veil" />
			{showParticles && <CoalitionParticleCanvas slug={slug} reducedMotion={false} />}
			<div className="coalition-ambient__vignette" />
		</div>
	)
}
