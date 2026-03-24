import { useEffect, useRef } from 'react'

/**
 * Canvas plein écran : particules thématiques + lueurs (feu / eau / terre / air + éclairs).
 * @param {{ slug: string, reducedMotion: boolean }} props
 */
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
				const { drops, ripples, maxRipples } = bundle
				const cap = maxRipples ?? 32
				for (let i = ripples.length - 1; i >= 0; i--) {
					ripples[i].update(dt)
					if (ripples[i].dead) ripples.splice(i, 1)
				}
				for (const d of drops) {
					const spawned = d.update(w, h, dt)
					if (spawned?.length) {
						for (const s of spawned) {
							if (ripples.length >= cap) ripples.shift()
							ripples.push(s)
						}
					}
				}
				for (const r of ripples) r.draw(ctx)
				for (const d of drops) d.draw(ctx)
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
		case 'eau': {
			/* ~90–130 gouttes selon la surface (shadowBlur retiré : le coût était énorme) */
			const n = Math.min(130, Math.max(72, Math.floor((w * h) / 18000)))
			return {
				kind: 'eau',
				drops: Array.from({ length: n }, () => new RainDrop(w, h)),
				ripples: [],
				maxRipples: 32,
			}
		}
		case 'terre':
			return [
				...Array.from({ length: 44 }, () => new Leaf(w, h)),
				...Array.from({ length: 40 }, () => new Firefly(w, h)),
			]
		case 'air':
			return {
				kind: 'air',
				streaks: Array.from({ length: 58 }, () => new WindStreak(w, h)),
				dust: Array.from({ length: 52 }, () => new DustMote(w, h)),
				lightning: new LightningField(w, h),
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

/* --- Eau : pluie riche + éclaboussures en ondes --- */
class RainDrop {
	constructor(w, h) {
		this.w = w
		this.h = h
		this.reset(true)
	}
	reset(initial) {
		const w = this.w
		const h = this.h
		const t = Math.random()
		if (t < 0.12) this.mode = 'drizzle'
		else if (t < 0.22) this.mode = 'blob'
		else if (t < 0.88) this.mode = 'streak'
		else this.mode = 'sheet'

		this.x = Math.random() * (w + 400) - 200
		this.y = initial ? Math.random() * h * 1.1 : -30 - Math.random() * 600

		this.impactY = h * (0.52 + Math.random() * 0.44) + (Math.random() - 0.5) * 40
		this.len =
			this.mode === 'drizzle'
				? 6 + Math.random() * 14
				: this.mode === 'blob'
					? 3 + Math.random() * 6
					: this.mode === 'sheet'
						? 28 + Math.random() * 45
						: 16 + Math.random() * 38

		this.speed =
			this.mode === 'drizzle'
				? 0.55 + Math.random() * 0.65
				: this.mode === 'blob'
					? 1.4 + Math.random() * 1.2
					: 1.05 + Math.random() * 1.85

		this.thick =
			this.mode === 'blob'
				? 1.2 + Math.random() * 2.2
				: 0.45 + Math.random() * 1.35

		this.alpha = 0.14 + Math.random() * 0.42
		this.angle = (Math.random() - 0.5) * 0.55
		this.windBase = (Math.random() - 0.5) * 2.4
		this.gustPhase = Math.random() * Math.PI * 2
		this.gustFreq = 0.0008 + Math.random() * 0.0022
		this.turbSeed = Math.random() * 10
		this.twist = (Math.random() - 0.5) * 0.02
	}
	update(w, h, dt) {
		this.w = w
		this.h = h
		this.gustPhase += dt * this.gustFreq
		const gust = Math.sin(this.gustPhase) * 1.1 + Math.sin(this.gustPhase * 2.3 + this.turbSeed) * 0.45
		const turb = Math.sin(this.y * 0.04 + this.turbSeed) * 0.35
		const vx = (this.windBase + gust + turb) * dt * 0.07
		this.x += vx + this.twist * dt * 0.05
		this.y += this.speed * dt * (this.mode === 'blob' ? 0.22 : 0.19)

		if (this.y >= this.impactY) {
			const spawned = this.splash()
			this.reset(false)
			return spawned
		}
		if (this.y > h + 40 || this.x < -80 || this.x > w + 80) {
			this.reset(false)
		}
		return null
	}
	splash() {
		const n = 1 + (Math.random() < 0.22 ? 1 : 0)
		const out = []
		for (let i = 0; i < n; i++) {
			out.push(
				new WaterRipple(
					this.x + (Math.random() - 0.5) * 10,
					this.impactY,
					i * 22 + Math.random() * 14,
				),
			)
		}
		if (Math.random() < 0.06) {
			out.push(new SplashSpark(this.x, this.impactY))
		}
		return out
	}
	draw(ctx) {
		const { x, y, len, angle, thick, alpha, mode } = this
		const ux = Math.sin(angle)
		const uy = Math.cos(angle)
		const x1 = x
		const y1 = y
		const x2 = x + ux * len
		const y2 = y + uy * len

		ctx.save()
		ctx.lineCap = 'round'
		if (mode === 'blob') {
			ctx.globalAlpha = alpha * 0.9
			ctx.fillStyle = `rgba(200, 235, 255, ${alpha * 0.55})`
			ctx.beginPath()
			ctx.ellipse(x, y, thick * 1.15, thick * 1.45, angle, 0, Math.PI * 2)
			ctx.fill()
			ctx.globalAlpha = alpha
			ctx.fillStyle = `rgba(248, 252, 255, ${alpha * 0.85})`
			ctx.beginPath()
			ctx.ellipse(x, y, thick * 0.45, thick * 0.55, angle, 0, Math.PI * 2)
			ctx.fill()
			ctx.restore()
			return
		}

		/* Un seul trait : large atténué + pas de shadowBlur (très coûteux) */
		ctx.globalAlpha = alpha * 0.45
		ctx.strokeStyle = 'rgba(160, 210, 245, 0.9)'
		ctx.lineWidth = thick + 2.5
		ctx.beginPath()
		ctx.moveTo(x1, y1)
		ctx.lineTo(x2, y2)
		ctx.stroke()
		ctx.globalAlpha = alpha * 0.95
		ctx.strokeStyle = 'rgba(248, 252, 255, 0.92)'
		ctx.lineWidth = Math.max(0.5, thick * 0.55)
		ctx.beginPath()
		ctx.moveTo(x1, y1)
		ctx.lineTo(x2, y2)
		ctx.stroke()
		ctx.restore()
	}
}

/** Onde concentrique à la surface de l’eau */
class WaterRipple {
	constructor(x, y, delayMs = 0) {
		this.x = x
		this.y = y
		this.r = 0
		this.delay = delayMs
		this.maxR = 22 + Math.random() * 72
		this.grow = 0.22 + Math.random() * 0.55
		this.alpha = 0.5 + Math.random() * 0.45
		this.baseAlpha = this.alpha
		this.w = 1.2 + Math.random() * 2.2
		this.dead = false
		this.hue = 195 + Math.random() * 25
	}
	update(dt) {
		if (this.delay > 0) {
			this.delay -= dt
			return
		}
		this.r += this.grow * dt * 0.11
		this.alpha = this.baseAlpha * (1 - this.r / (this.maxR * 1.15))
		if (this.alpha <= 0.02 || this.r > this.maxR) this.dead = true
	}
	draw(ctx) {
		if (this.delay > 0) return
		const a = Math.max(0, this.alpha)
		const py = this.y * 0.998
		const rx = this.r
		const ry = this.r * 0.28
		ctx.save()
		ctx.globalAlpha = a * 0.35
		ctx.lineWidth = this.w * 2.2
		ctx.strokeStyle = `hsla(${this.hue}, 75%, 88%, 0.4)`
		ctx.beginPath()
		ctx.ellipse(this.x, py, rx * 1.02, ry * 1.05, 0, 0, Math.PI * 2)
		ctx.stroke()
		ctx.globalAlpha = a
		ctx.lineWidth = Math.max(0.8, this.w * (1 - this.r / (this.maxR + 10)))
		ctx.strokeStyle = `hsla(${this.hue}, 90%, 82%, 0.82)`
		ctx.beginPath()
		ctx.ellipse(this.x, py, rx, ry, 0, 0, Math.PI * 2)
		ctx.stroke()
		ctx.restore()
	}
}

/** Petit éclair lumineux ponctuel à l’impact */
class SplashSpark {
	constructor(x, y) {
		this.x = x
		this.y = y
		this.life = 1
		this.dead = false
		this.r = 4 + Math.random() * 10
	}
	update(dt) {
		this.life -= dt * 0.0045
		if (this.life <= 0) this.dead = true
	}
	draw(ctx) {
		if (this.dead) return
		ctx.save()
		ctx.globalAlpha = this.life * 0.75
		ctx.fillStyle = 'rgba(220, 245, 255, 0.55)'
		ctx.beginPath()
		ctx.arc(this.x, this.y, this.r * 1.6, 0, Math.PI * 2)
		ctx.fill()
		ctx.globalAlpha = this.life
		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
		ctx.beginPath()
		ctx.arc(this.x, this.y, this.r * 0.45, 0, Math.PI * 2)
		ctx.fill()
		ctx.restore()
	}
}

/* --- Terre : feuille avec liseré lumineux --- */
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
		this.vx = (Math.random() - 0.5) * 0.6
		this.vy = 0.35 + Math.random() * 0.85
		this.rot = Math.random() * Math.PI * 2
		this.spin = (Math.random() - 0.5) * 0.008
		this.wid = 5 + Math.random() * 7
		this.hei = 7 + Math.random() * 10
		const hues = [88, 95, 35, 42, 28]
		this.hue = hues[(Math.random() * hues.length) | 0]
		this.sat = 35 + Math.random() * 40
		this.light = 22 + Math.random() * 28
		this.alpha = 0.25 + Math.random() * 0.45
	}
	update(w, h, dt) {
		this.w = w
		this.h = h
		this.rot += this.spin * dt * 0.08
		this.x += (this.vx + Math.sin(this.y * 0.015) * 0.8) * dt * 0.05
		this.y += this.vy * dt * 0.08
		if (this.y > h + 30 || this.x < -40 || this.x > w + 40) this.reset(false)
	}
	draw(ctx) {
		ctx.save()
		ctx.translate(this.x, this.y)
		ctx.rotate(this.rot)
		ctx.globalAlpha = this.alpha
		ctx.shadowBlur = 6
		ctx.shadowColor = `hsla(${this.hue + 15}, 60%, 45%, 0.35)`
		const g = ctx.createRadialGradient(-this.wid * 0.2, -this.hei * 0.2, 0, 0, 0, this.hei * 1.2)
		g.addColorStop(0, `hsla(${this.hue + 25}, ${this.sat + 15}%, ${this.light + 22}%, 0.95)`)
		g.addColorStop(0.55, `hsl(${this.hue}, ${this.sat}%, ${this.light}%)`)
		g.addColorStop(1, `hsla(${this.hue - 8}, ${this.sat}%, ${this.light - 8}%, 0.85)`)
		ctx.fillStyle = g
		ctx.beginPath()
		ctx.ellipse(0, 0, this.wid, this.hei, 0.3, 0, Math.PI * 2)
		ctx.fill()
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
	constructor(w, h) {
		this.w = w
		this.h = h
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
			/* Éclair bien lisible : flash quasi systématique, plus long */
			this.flashScreen = 0.38 + Math.random() * 0.28
		}

		for (const b of this.bolts) b.update(dt)
		this.bolts = this.bolts.filter((b) => !b.dead)
	}
	draw(ctx) {
		const { w, h } = this
		if (this.flashScreen > 0) {
			ctx.save()
			ctx.globalAlpha = Math.min(0.55, this.flashScreen * 0.62)
			/* Centre du flash vers la droite : même zone que les éclairs (hors échiquier) */
			const fx = w * 0.68
			const g = ctx.createRadialGradient(fx, 0, 0, fx, h * 0.32, h * 0.88)
			g.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
			g.addColorStop(0.25, 'rgba(230, 240, 255, 0.35)')
			g.addColorStop(1, 'rgba(30, 40, 80, 0)')
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
		/* Pas de shadowBlur : 3 passes épaisseur = glow lisible et GPU léger */
		this.strokeGlowPath(ctx, this.points, a, [14, 6, 2.2], [
			`rgba(200, 220, 255, ${0.2 * a})`,
			`rgba(240, 248, 255, ${0.72 * a})`,
			`rgba(255, 255, 255, ${0.15 + 0.85 * a})`,
		])
		for (const br of this.branches) {
			this.strokeGlowPath(ctx, br, a, [7, 3, 1.3], [
				`rgba(190, 210, 255, ${0.18 * a})`,
				`rgba(230, 240, 255, ${0.55 * a})`,
				`rgba(255, 255, 255, ${0.5 * a})`,
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
