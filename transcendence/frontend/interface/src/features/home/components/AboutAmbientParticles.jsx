import { useEffect, useRef } from 'react'
import { useReduceMotionPref } from '../../theme/index.js'

const COLORS = ['#a3d636', '#ff6b4a', '#5ecfff', '#d8b4fe']

/**
 * Particules légères (canvas) : teintes coalition, influencées par la souris et le scroll.
 */
export default function AboutAmbientParticles() {
	const canvasRef = useRef(null)
	const mouseRef = useRef({ x: 0.5, y: 0.5 })
	const reduceMotion = useReduceMotionPref()

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return undefined
		const ctx = canvas.getContext('2d')
		if (!ctx) return undefined

		let w = 0
		let h = 0
		let dpr = 1

		const resize = () => {
			dpr = Math.min(window.devicePixelRatio || 1, 2)
			w = window.innerWidth
			h = window.innerHeight
			canvas.width = Math.floor(w * dpr)
			canvas.height = Math.floor(h * dpr)
			canvas.style.width = `${w}px`
			canvas.style.height = `${h}px`
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		}

		const count = reduceMotion ? 36 : 88
		const particles = Array.from({ length: count }, (_, i) => ({
			x: Math.random(),
			y: Math.random(),
			r: 0.6 + Math.random() * 1.8,
			vx: (Math.random() - 0.5) * 0.00012,
			vy: (Math.random() - 0.5) * 0.00012,
			color: COLORS[i % COLORS.length],
			phase: Math.random() * Math.PI * 2,
			trail: 0.35 + Math.random() * 0.45,
		}))

		let scrollY = 0
		let raf = 0
		let t0 = performance.now()

		const onScroll = () => {
			scrollY = window.scrollY
		}
		const onMove = (e) => {
			mouseRef.current = {
				x: e.clientX / Math.max(window.innerWidth, 1),
				y: e.clientY / Math.max(window.innerHeight, 1),
			}
		}

		const loop = (now) => {
			const t = (now - t0) * 0.001
			const mx = mouseRef.current.x
			const my = mouseRef.current.y
			const scrollBoost = reduceMotion ? 0 : scrollY * 0.00035

			ctx.clearRect(0, 0, w, h)

			for (const p of particles) {
				if (!reduceMotion) {
					p.x += p.vx + (mx - 0.5) * 0.00008
					p.y += p.vy + (my - 0.5) * 0.00008 + scrollBoost * 0.00002
					p.x = (p.x + 1) % 1
					p.y = (p.y + 1) % 1
				}

				const px = p.x * w
				const py = p.y * h + (reduceMotion ? 0 : Math.sin(t * 0.7 + p.phase) * 6)
				const pullX = (mx - 0.5) * 22 * p.trail
				const pullY = (my - 0.5) * 18 * p.trail + (reduceMotion ? 0 : scrollY * 0.04 * p.trail)

				const alpha = 0.12 + 0.22 * (0.5 + 0.5 * Math.sin(t * 1.3 + p.phase))
				ctx.beginPath()
				ctx.strokeStyle = p.color
				ctx.globalAlpha = alpha * p.trail
				ctx.lineWidth = p.r * 0.45
				ctx.moveTo(px - pullX * 0.35, py - pullY * 0.35)
				ctx.lineTo(px + pullX, py + pullY)
				ctx.stroke()

				ctx.globalAlpha = alpha * 1.1
				ctx.fillStyle = p.color
				ctx.beginPath()
				ctx.arc(px + pullX * 0.15, py + pullY * 0.12, p.r, 0, Math.PI * 2)
				ctx.fill()
			}

			ctx.globalAlpha = 1
			raf = requestAnimationFrame(loop)
		}

		resize()
		window.addEventListener('resize', resize)
		window.addEventListener('scroll', onScroll, { passive: true })
		window.addEventListener('mousemove', onMove, { passive: true })
		raf = requestAnimationFrame(loop)

		return () => {
			cancelAnimationFrame(raf)
			window.removeEventListener('resize', resize)
			window.removeEventListener('scroll', onScroll)
			window.removeEventListener('mousemove', onMove)
		}
	}, [reduceMotion])

	return <canvas ref={canvasRef} className="about-particles-canvas" aria-hidden="true" />
}
