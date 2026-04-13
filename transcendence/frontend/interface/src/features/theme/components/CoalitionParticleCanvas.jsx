import { useEffect, useRef } from 'react'
import { COALITION_LIGHTNING_FLASH_EDGE } from '../services/coalitionAmbience.js'

/** Particules plein écran par coalition (éclairs uniquement pour l’air). */
export default function CoalitionParticleCanvas({ slug, reducedMotion }) {
	const ref = useRef(null)
	const raf = useRef(0)
	const particlesRef = useRef(null)
	const lastRef = useRef(0)
	const dimsRef = useRef({ w: 0, h: 0 })

	useEffect(() => {
		const canvas = ref.current
		if (!canvas) return

		const ctx = canvas.getContext('2d', { alpha: true })
		let dpr = 1

		function resize() {
			dpr = Math.min(window.devicePixelRatio || 1, 2)
			const w = window.innerWidth
			const h = window.innerHeight
			dimsRef.current = { w, h }
			canvas.width = Math.floor(w * dpr)
			canvas.height = Math.floor(h * dpr)
			canvas.style.width = `${w}px`
			canvas.style.height = `${h}px`
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			particlesRef.current = initParticles(slug, w, h)
		}

		resize()
		const ro = new ResizeObserver(resize)
		ro.observe(document.documentElement)
		window.addEventListener('resize', resize)

		if (reducedMotion) {
			const { w, h } = dimsRef.current
			ctx.clearRect(0, 0, w, h)
			return () => {
				ro.disconnect()
				window.removeEventListener('resize', resize)
			}
		}

		lastRef.current = performance.now()

		function frame(now) {
			if (typeof document !== 'undefined' && document.hidden) {
				lastRef.current = performance.now()
				raf.current = requestAnimationFrame(frame)
				return
			}
			const { w, h } = dimsRef.current
			const dt = Math.min(48, now - lastRef.current)
			lastRef.current = now
			const bundle = particlesRef.current
			ctx.clearRect(0, 0, w, h)

			if (bundle?.kind === 'eau') {
				const now = performance.now()
				for (const d of bundle.back) d.draw(ctx, w, h, now)
				for (const d of bundle.front) d.draw(ctx, w, h, now)
			} else if (bundle?.kind === 'air') {
				bundle.lightning.update(now, w, h, dt)
				for (const s of bundle.streaks) {
					s.update(w, h, dt)
					s.draw(ctx)
				}
				for (const d of bundle.dust) {
					d.update(w, h, dt)
					d.draw(ctx)
				}
				bundle.lightning.draw(ctx)
			} else if (Array.isArray(bundle)) {
				for (const p of bundle) {
					p.update(w, h, dt)
					p.draw(ctx)
				}
			}

			raf.current = requestAnimationFrame(frame)
		}

		raf.current = requestAnimationFrame(frame)

		return () => {
			cancelAnimationFrame(raf.current)
			ro.disconnect()
			window.removeEventListener('resize', resize)
		}
	}, [slug, reducedMotion])

	return <canvas ref={ref} className="coalition-ambient__particles" aria-hidden />
}

function initParticles(slug, w, h) {
	switch (slug) {
		case 'feu':
			return Array.from({ length: 120 }, () => new Ember(w, h))
		case 'eau':
			return makeCodePenEauRain(w, h)
		case 'neutral':
			return []
		case 'terre':
			return [
				...Array.from({ length: 72 }, () => new Leaf(w, h)),
				...Array.from({ length: 40 }, () => new Firefly(w, h)),
			]
		case 'air':
			return {
				kind: 'air',
				streaks: Array.from({ length: 58 }, () => new WindStreak(w, h)),
				dust: Array.from({ length: 52 }, () => new DustMote(w, h)),
				lightning: new LightningField(w, h, slug),
			}
		default:
			return []
	}
}

/* --- Feu : braises + halo chaud --- */
class Ember {
	constructor(w, h) {
		this.w = w
		this.h = h
		this.reset()
	}
	reset() {
		const w = this.w
		const h = this.h
		this.x = Math.random() * w
		this.y = h + 30 + Math.random() * 120
		this.vx = (Math.random() - 0.5) * 0.9
		this.vy = -(1.2 + Math.random() * 2.8)
		this.life = 0.35 + Math.random() * 0.65
		this.r = 0.8 + Math.random() * 2.8
		this.hue = 12 + Math.random() * 38
		this.wobble = Math.random() * Math.PI * 2
	}
	update(w, h, dt) {
		this.w = w
		this.h = h
		this.wobble += dt * 0.004
		this.x += (this.vx + Math.sin(this.wobble) * 0.35) * dt * 0.055
		this.y += this.vy * dt * 0.055
		this.life -= dt * 0.00045
		this.vy *= 0.999
		if (this.life <= 0 || this.y < -40) this.reset()
	}
	draw(ctx) {
		const a = Math.max(0, Math.min(1, this.life))
		const cx = this.x
		const cy = this.y
		const r = this.r
		ctx.save()
		ctx.globalAlpha = a * 0.5
		ctx.shadowBlur = 28
		ctx.shadowColor = `hsla(${this.hue}, 100%, 55%, 0.9)`
		const g0 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4.5)
		g0.addColorStop(0, `hsla(${this.hue}, 100%, 65%, 0.4)`)
		g0.addColorStop(0.5, `hsla(${this.hue - 5}, 95%, 40%, 0.12)`)
		g0.addColorStop(1, 'transparent')
		ctx.fillStyle = g0
		ctx.beginPath()
		ctx.arc(cx, cy, r * 4, 0, Math.PI * 2)
		ctx.fill()

		ctx.globalAlpha = a * 0.95
		ctx.shadowBlur = 14
		const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3)
		g.addColorStop(0, `hsla(${this.hue}, 100%, 72%, 1)`)
		g.addColorStop(0.35, `hsla(${this.hue - 8}, 95%, 52%, 0.65)`)
		g.addColorStop(1, 'hsla(25, 90%, 25%, 0)')
		ctx.fillStyle = g
		ctx.beginPath()
		ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2)
		ctx.fill()
		ctx.restore()
	}
}

/*
 * Eau : pluie inspirée de https://codepen.io/arickle/pen/XKjMZY
 * (boucle increment + durée / délai aléatoires, tige en dégradé, splat en fin de cycle).
 * Couleurs adaptées à la DA eau du site (cyan / glacial).
 */
function makeCodePenEauRain(w, h) {
	const limit = w > 1500 ? 118 : 100
	const buildRow = (fromRight, layerAlpha, verticalNudge) => {
		const drops = []
		let increment = 0
		while (increment < limit) {
			const randoHundo = Math.floor(Math.random() * 98) + 1
			const randoFiver = Math.floor(Math.random() * 4) + 2
			increment += randoFiver
			if (increment >= limit) break
			const durationSec = 0.5 + randoHundo / 1000
			const delaySec = randoHundo / 1000
			drops.push(
				new CodePenRainDrop(w, h, {
					xPct: increment,
					durationSec,
					delaySec,
					fromRight,
					layerAlpha,
					verticalNudge,
				}),
			)
		}
		return drops
	}
	return {
		kind: 'eau',
		front: buildRow(false, 1, 0),
		back: buildRow(true, 0.5, -Math.min(68, h * 0.065)),
	}
}

class CodePenRainDrop {
	constructor(w, h, opts) {
		this.w = w
		this.h = h
		this.xPct = opts.xPct
		this.durationSec = opts.durationSec
		this.delaySec = opts.delaySec
		this.fromRight = Boolean(opts.fromRight)
		this.layerAlpha = opts.layerAlpha ?? 1
		this.verticalNudge = opts.verticalNudge ?? 0
		this.dropHeightPx = 96 + Math.random() * 56
		this.stemRatio = 0.56 + Math.random() * 0.1
	}

	draw(ctx, w, h, nowMs) {
		this.w = w
		this.h = h
		const t = nowMs / 1000 + this.delaySec
		const d = this.durationSec
		const p = ((t % d) + d) % d / d

		const travelEnd = 0.75
		const travel = Math.min(p / travelEnd, 1)
		const yLand = h * 0.91 + this.verticalNudge
		const above = this.dropHeightPx + 28
		const yTop = -above + (yLand + above) * travel

		let x = (this.xPct / 100) * w
		if (this.fromRight) x = w - (this.xPct / 100) * w

		const stemLen = this.dropHeightPx * this.stemRatio
		const stemBottom = yTop + stemLen

		let stemOpacity = 1
		if (p >= 0.65 && p < 0.75) stemOpacity = 1 - (p - 0.65) / 0.1
		else if (p >= 0.75) stemOpacity = 0

		ctx.save()
		ctx.globalAlpha = stemOpacity * this.layerAlpha
		ctx.lineCap = 'round'
		const g = ctx.createLinearGradient(x, yTop, x, stemBottom)
		g.addColorStop(0, 'rgba(210, 248, 255, 0)')
		g.addColorStop(0.45, 'rgba(185, 235, 255, 0.14)')
		g.addColorStop(1, 'rgba(160, 220, 250, 0.42)')
		ctx.strokeStyle = g
		ctx.lineWidth = 1.25
		ctx.beginPath()
		ctx.moveTo(x, yTop)
		ctx.lineTo(x, stemBottom)
		ctx.stroke()

		ctx.globalAlpha = stemOpacity * this.layerAlpha * 0.35
		ctx.strokeStyle = 'rgba(120, 200, 255, 0.45)'
		ctx.lineWidth = 3
		ctx.beginPath()
		ctx.moveTo(x, yTop)
		ctx.lineTo(x, stemBottom)
		ctx.stroke()
		ctx.restore()

		const splatBaseY = yTop + this.dropHeightPx
		let splatScale = 0
		let splatOp = 0
		if (p >= 0.8 && p < 0.9) {
			const u = (p - 0.8) / 0.1
			splatScale = u
			splatOp = 1 - u * 0.35
		} else if (p >= 0.9) {
			const u = (p - 0.9) / 0.1
			splatScale = 1 + u * 0.55
			splatOp = 0.65 * (1 - u)
		}

		if (splatScale > 0.02 && splatOp > 0.03) {
			const ref = Math.min(w, h) / 900
			const rw = (7 + splatScale * 7) * ref * 18
			const rhFlat = (4 + splatScale * 5) * ref * 12
			ctx.save()
			ctx.globalAlpha = splatOp * this.layerAlpha
			ctx.translate(x, splatBaseY)
			ctx.scale(1, 0.42)
			ctx.strokeStyle = 'rgba(200, 240, 255, 0.62)'
			ctx.lineWidth = 1.6
			ctx.setLineDash([2, 3])
			ctx.beginPath()
			ctx.ellipse(0, 0, rw, rhFlat, 0, 0, Math.PI * 2)
			ctx.stroke()
			ctx.setLineDash([])
			ctx.lineWidth = 1
			ctx.globalAlpha = splatOp * this.layerAlpha * 0.35
			ctx.strokeStyle = 'rgba(170, 230, 255, 0.5)'
			ctx.beginPath()
			ctx.arc(0, -rhFlat * 0.35, rw * 0.92, Math.PI * 1.05, Math.PI * 1.95)
			ctx.stroke()
			ctx.restore()
		}
	}
}

/* --- Terre : petites feuilles (silhouette, pas des ellipses « boules ») --- */
class Leaf {
	constructor(w, h) {
		this.w = w
		this.h = h
		this.reset(true)
	}
	reset(initial) {
		const w = this.w
		const h = this.h
		this.x = Math.random() * w
		this.y = initial ? Math.random() * h : -40 - Math.random() * 200
		this.vx = (Math.random() - 0.5) * 0.55
		this.vy = 0.32 + Math.random() * 0.75
		this.rot = Math.random() * Math.PI * 2
		this.spin = (Math.random() - 0.5) * 0.012
		/* Longueur / demi-largeur max au plus large — tout petit sur l’écran */
		this.len = 2.4 + Math.random() * 4.2
		this.halfW = 0.55 + Math.random() * 1.15
		const hues = [92, 88, 38, 42, 32, 48]
		this.hue = hues[(Math.random() * hues.length) | 0]
		this.sat = 38 + Math.random() * 38
		this.light = 24 + Math.random() * 26
		this.alpha = 0.38 + Math.random() * 0.42
	}
	update(w, h, dt) {
		this.w = w
		this.h = h
		this.rot += this.spin * dt * 0.08
		this.x += (this.vx + Math.sin(this.y * 0.015) * 0.65) * dt * 0.05
		this.y += this.vy * dt * 0.08
		if (this.y > h + 30 || this.x < -40 || this.x > w + 40) this.reset(false)
	}
	draw(ctx) {
		const L = this.len
		const W = this.halfW
		ctx.save()
		ctx.translate(this.x, this.y)
		ctx.rotate(this.rot)
		ctx.globalAlpha = this.alpha
		/* Dégradé le long de la feuille (pointe → pétiole) */
		const g = ctx.createLinearGradient(0, -L, 0, L * 0.42)
		g.addColorStop(0, `hsla(${this.hue + 12}, ${Math.min(85, this.sat + 12)}%, ${this.light + 14}%, 0.92)`)
		g.addColorStop(0.5, `hsl(${this.hue}, ${this.sat}%, ${this.light}%)`)
		g.addColorStop(1, `hsla(${this.hue - 6}, ${this.sat}%, ${this.light - 12}%, 0.88)`)
		ctx.fillStyle = g
		ctx.beginPath()
		/* Pointe en haut (0,-L), pétiole vers le bas — bords en courbes de Bézier */
		ctx.moveTo(0, -L)
		ctx.bezierCurveTo(W * 1.15, -L * 0.38, W, L * 0.05, W * 0.28, L * 0.34)
		ctx.quadraticCurveTo(0, L * 0.4, -W * 0.28, L * 0.34)
		ctx.bezierCurveTo(-W, L * 0.05, -W * 1.15, -L * 0.38, 0, -L)
		ctx.closePath()
		ctx.fill()
		/* Nervure centrale discrète */
		ctx.globalAlpha = this.alpha * 0.55
		ctx.strokeStyle = `hsla(${this.hue - 8}, ${this.sat * 0.75}%, ${this.light - 18}%, 0.5)`
		ctx.lineWidth = Math.max(0.25, W * 0.22)
		ctx.lineCap = 'round'
		ctx.beginPath()
		ctx.moveTo(0, -L * 0.82)
		ctx.lineTo(0, L * 0.28)
		ctx.stroke()
		ctx.restore()
	}
}

/* --- Terre : luciole --- */
class Firefly {
	constructor(w, h) {
		this.w = w
		this.h = h
		this.reset()
	}
	reset() {
		const w = this.w
		const h = this.h
		this.x = Math.random() * w
		this.y = Math.random() * h
		this.tx = Math.random() * w
		this.ty = Math.random() * h
		this.phase = Math.random() * Math.PI * 2
		this.r = 1.2 + Math.random() * 2
	}
	update(w, h, dt) {
		this.w = w
		this.h = h
		this.phase += dt * 0.0025
		const dx = this.tx - this.x
		const dy = this.ty - this.y
		const d = Math.hypot(dx, dy) || 1
		this.x += (dx / d) * dt * 0.018
		this.y += (dy / d) * dt * 0.018
		if (d < 20 || Math.random() < 0.002) {
			this.tx = Math.random() * w
			this.ty = Math.random() * h
		}
	}
	draw(ctx) {
		const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.phase))
		ctx.save()
		ctx.globalAlpha = pulse * 0.45
		ctx.shadowBlur = 28
		ctx.shadowColor = 'rgba(255, 255, 200, 0.75)'
		const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 5)
		g.addColorStop(0, 'rgba(255, 255, 220, 0.5)')
		g.addColorStop(1, 'transparent')
		ctx.fillStyle = g
		ctx.beginPath()
		ctx.arc(this.x, this.y, this.r * 5, 0, Math.PI * 2)
		ctx.fill()

		ctx.globalAlpha = pulse * 0.95
		ctx.shadowBlur = 16
		ctx.shadowColor = 'rgba(255, 255, 180, 0.95)'
		ctx.fillStyle = 'rgba(255, 255, 230, 0.98)'
		ctx.beginPath()
		ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
		ctx.fill()
		ctx.restore()
	}
}

/* --- Air : éclairs + vent --- */
class LightningField {
	constructor(w, h, slug = 'air') {
		this.w = w
		this.h = h
		this.slug = slug
		this.bolts = []
		this.flashScreen = 0
		this.nextStrikeAt = performance.now() + 400 + Math.random() * 1000
	}
	update(now, w, h, dt) {
		this.w = w
		this.h = h
		if (this.flashScreen > 0) this.flashScreen = Math.max(0, this.flashScreen - dt * 0.008)

		if (now >= this.nextStrikeAt && this.bolts.length < 4) {
			this.bolts.push(new LightningBolt(w, h))
			this.nextStrikeAt = now + 280 + Math.random() * 3400
			this.flashScreen = 0.38 + Math.random() * 0.28
		}

		for (const b of this.bolts) b.update(dt)
		this.bolts = this.bolts.filter((b) => !b.dead)
	}
	draw(ctx) {
		const { w, h } = this
		if (this.flashScreen > 0) {
			const edge =
				COALITION_LIGHTNING_FLASH_EDGE[this.slug] ?? COALITION_LIGHTNING_FLASH_EDGE.air
			const air = this.slug === 'air'
			ctx.save()
			ctx.globalAlpha = Math.min(0.55, this.flashScreen * 0.62)
			const fx = w * 0.68
			const g = ctx.createRadialGradient(fx, 0, 0, fx, h * 0.32, h * 0.88)
			g.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
			g.addColorStop(
				0.22,
				air ? 'rgba(255, 236, 140, 0.58)' : 'rgba(235, 242, 255, 0.42)',
			)
			g.addColorStop(
				0.5,
				air ? 'rgba(255, 200, 55, 0.45)' : 'rgba(55, 35, 88, 0.58)',
			)
			g.addColorStop(
				0.76,
				air ? 'rgba(200, 130, 35, 0.88)' : 'rgba(24, 14, 40, 0.92)',
			)
			g.addColorStop(1, edge)
			ctx.fillStyle = g
			ctx.fillRect(0, 0, w, h)
			ctx.restore()
		}
		for (const b of this.bolts) b.draw(ctx)
	}
}

class LightningBolt {
	constructor(w, h) {
		this.build(w, h)
		this.life = 1
		this.dead = false
		this.age = 0
		this.maxAge = 140 + Math.random() * 200
	}
	build(w, h) {
		this.points = []
		this.branches = []
		/*
		 * La majorité des impacts à droite (souvent visible à côté de l’échiquier) ;
		 * ~18 % gardent une zone large pour varier l’ambiance.
		 */
		this.anchorRight = Math.random() > 0.18
		const xMin = this.anchorRight ? w * 0.48 : 16
		const xMax = this.anchorRight ? w - 12 : w * 0.42
		let x = this.anchorRight
			? w * (0.55 + Math.random() * 0.4)
			: w * (0.12 + Math.random() * 0.32)
		let y = -10 - Math.random() * 50
		this.points.push({ x, y })
		const targetY = h * (0.22 + Math.random() * 0.48)
		const drift = this.anchorRight ? 0.44 : 0.52
		while (y < targetY) {
			x += (Math.random() - drift) * 86
			y += 16 + Math.random() * 38
			x = Math.max(xMin, Math.min(xMax, x))
			this.points.push({ x, y })
		}
		const branches = Math.random() < 0.72 ? 1 + (Math.random() < 0.4 ? 1 : 0) : 0
		for (let b = 0; b < branches; b++) {
			const i = 1 + ((Math.random() * (this.points.length - 2)) | 0)
			const p = this.points[i]
			let bx = p.x
			let by = p.y
			const bp = [{ x: bx, y: by }]
			const steps = 2 + (Math.random() * 4) | 0
			for (let s = 0; s < steps; s++) {
				bx += (Math.random() - (this.anchorRight ? 0.32 : 0.35)) * 55
				by += 20 + Math.random() * 38
				if (this.anchorRight) bx = Math.max(xMin, Math.min(xMax, bx))
				else bx = Math.max(16, Math.min(w * 0.48, bx))
				bp.push({ x: bx, y: by })
			}
			this.branches.push(bp)
		}
	}
	update(dt) {
		this.age += dt
		this.life = 1 - this.age / this.maxAge
		if (this.life <= 0) this.dead = true
	}
	draw(ctx) {
		const flicker = 0.62 + 0.38 * Math.sin(this.age * 0.12)
		const a = Math.max(0, this.life * flicker)
		ctx.save()
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		this.strokeGlowPath(ctx, this.points, a, [14, 6, 2.2], [
			`rgba(255, 210, 80, ${0.28 * a})`,
			`rgba(255, 238, 160, ${0.78 * a})`,
			`rgba(255, 252, 230, ${0.2 + 0.8 * a})`,
		])
		for (const br of this.branches) {
			this.strokeGlowPath(ctx, br, a, [7, 3, 1.3], [
				`rgba(255, 200, 70, ${0.22 * a})`,
				`rgba(255, 230, 140, ${0.6 * a})`,
				`rgba(255, 248, 210, ${0.55 * a})`,
			])
		}
		ctx.restore()
	}
	strokeGlowPath(ctx, pts, a, widths, colors) {
		if (pts.length < 2) return
		for (let i = 0; i < widths.length; i++) {
			ctx.strokeStyle = colors[i]
			ctx.lineWidth = widths[i]
			ctx.beginPath()
			ctx.moveTo(pts[0].x, pts[0].y)
			for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y)
			ctx.stroke()
		}
	}
}

class WindStreak {
	constructor(w, h) {
		this.w = w
		this.h = h
		this.reset(true)
	}
	reset(initial) {
		const w = this.w
		const h = this.h
		this.y = Math.random() * h
		this.x = initial ? Math.random() * w : -80 - Math.random() * 260
		this.speed = 1.8 + Math.random() * 3.2
		this.len = 48 + Math.random() * 120
		this.alpha = 0.08 + Math.random() * 0.2
		this.tilt = -0.18 + Math.random() * 0.36
	}
	update(w, h, dt) {
		this.w = w
		this.h = h
		this.x += this.speed * dt * 0.12
		this.y += Math.sin(this.x * 0.01) * 0.08 * dt * 0.05
		if (this.x > w + this.len) this.reset(false)
	}
	draw(ctx) {
		ctx.save()
		ctx.globalAlpha = this.alpha
		const g = ctx.createLinearGradient(this.x, this.y, this.x + this.len, this.y + this.len * this.tilt)
		g.addColorStop(0, 'rgba(240, 230, 255, 0)')
		g.addColorStop(0.45, 'rgba(248, 240, 255, 0.75)')
		g.addColorStop(0.55, 'rgba(220, 200, 255, 0.65)')
		g.addColorStop(1, 'rgba(240, 230, 255, 0)')
		ctx.strokeStyle = g
		ctx.lineWidth = 1.6
		ctx.beginPath()
		ctx.moveTo(this.x, this.y)
		ctx.lineTo(this.x + this.len * 0.88, this.y + this.len * this.tilt * 0.28)
		ctx.stroke()
		ctx.restore()
	}
}

class DustMote {
	constructor(w, h) {
		this.w = w
		this.h = h
		this.reset(true)
	}
	reset(initial) {
		const w = this.w
		const h = this.h
		this.x = initial ? Math.random() * w : -20
		this.y = Math.random() * h
		this.vx = 0.4 + Math.random() * 1.2
		this.vy = (Math.random() - 0.5) * 0.35
		this.r = 0.4 + Math.random() * 1.6
		this.alpha = 0.1 + Math.random() * 0.24
		this.phase = Math.random() * Math.PI * 2
	}
	update(w, h, dt) {
		this.w = w
		this.h = h
		this.phase += dt * 0.001
		this.x += this.vx * dt * 0.06
		this.y += (this.vy + Math.sin(this.phase) * 0.2) * dt * 0.04
		if (this.x > w + 20) {
			this.x = -10
			this.y = Math.random() * h
		}
		if (this.y < -10) this.y = h + 10
		if (this.y > h + 10) this.y = -10
	}
	draw(ctx) {
		const tw = 0.7 + 0.3 * Math.sin(this.phase)
		ctx.save()
		ctx.globalAlpha = this.alpha * tw
		const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 3)
		g.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
		g.addColorStop(0.35, 'rgba(230, 220, 255, 0.5)')
		g.addColorStop(1, 'transparent')
		ctx.fillStyle = g
		ctx.beginPath()
		ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
		ctx.fill()
		ctx.restore()
	}
}
