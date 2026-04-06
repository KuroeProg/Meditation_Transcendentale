/**
 * Fondus de volume sur HTMLAudioElement (approche proche des sites « prod » :
 * courbe douce + durées asymétriques montée / descente).
 */

/** Fondu entrant un peu plus long (perception plus naturelle). */
export const FADE_IN_MS = 520
/** Fondu sortant un peu plus court. */
export const FADE_OUT_MS = 380
/** Premier lancement / après refresh. */
export const FADE_IN_INITIAL_MS = 640

function smoothstep(t) {
	const x = Math.min(1, Math.max(0, t))
	return x * x * (3 - 2 * x)
}

/**
 * @returns {{ fade: (el: HTMLAudioElement, toVol: number, durationMs: number, fromVol?: number|null) => Promise<'done'|'cancelled'>, cancel: () => void }}
 */
export function createFadeController() {
	let rafId = 0
	let cancelled = false

	function cancel() {
		cancelled = true
		if (rafId) {
			cancelAnimationFrame(rafId)
			rafId = 0
		}
	}

	/**
	 * @param {HTMLAudioElement} element
	 * @param {number} toVol — cible 0..1
	 * @param {number} durationMs
	 * @param {number|null|undefined} fromVol — si omis, utilise element.volume
	 */
	function fade(element, toVol, durationMs, fromVol = null) {
		cancel()
		cancelled = false
		const start = fromVol != null ? fromVol : element.volume
		const t0 = performance.now()
		const clampedTarget = Math.max(0, Math.min(1, toVol))

		return new Promise((resolve) => {
			function step(now) {
				if (cancelled) {
					resolve('cancelled')
					return
				}
				const elapsed = now - t0
				const u = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs)
				const k = smoothstep(u)
				element.volume = start + (clampedTarget - start) * k
				if (u < 1) {
					rafId = requestAnimationFrame(step)
				} else {
					element.volume = clampedTarget
					rafId = 0
					resolve('done')
				}
			}
			rafId = requestAnimationFrame(step)
		})
	}

	return { fade, cancel }
}

/** Contrôle global optionnel pour le BGM jeu (tryPlayGameBgm vs cleanup). */
let gameBgmFadeSingleton = createFadeController()

export function cancelGameBgmFade() {
	gameBgmFadeSingleton.cancel()
}

export function fadeGameBgmTo(element, toVol, durationMs, fromVol) {
	return gameBgmFadeSingleton.fade(element, toVol, durationMs, fromVol)
}

export function resetGameBgmFadeController() {
	gameBgmFadeSingleton.cancel()
	gameBgmFadeSingleton = createFadeController()
}
