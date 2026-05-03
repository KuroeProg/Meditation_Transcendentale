/**
 * SFX procéduraux Transcendance (Web Audio API).
 * Toutes les chaînes audio terminent sur `sfxMasterGain` plutôt que directement sur
 * `audioCtx.destination`, ce qui permet d'appliquer le volume et le mute des effets
 * en temps réel depuis les préférences utilisateur.
 */
import { loadGameAudioPrefs, effectiveSfxGain } from '../../../config/gameAudioPrefs.js'

let audioCtx = null
let sfxMasterGain = null
let hasUserInteracted = false

function initInteractionListeners() {
	if (typeof window === 'undefined') return
	const unlock = () => {
		hasUserInteracted = true
		window.removeEventListener('pointerdown', unlock)
		window.removeEventListener('keydown', unlock)
		if (audioCtx && audioCtx.state === 'suspended') {
			void audioCtx.resume().catch(() => {})
		}
	}
	window.addEventListener('pointerdown', unlock, { once: true })
	window.addEventListener('keydown', unlock, { once: true })
}
initInteractionListeners()

function applyMasterGain() {
	if (!sfxMasterGain) return
	try {
		const p = loadGameAudioPrefs()
		sfxMasterGain.gain.setTargetAtTime(effectiveSfxGain(p), audioCtx.currentTime, 0.01)
	} catch {
		/* ignore */
	}
}

export function unlockGameAudio() {
	try {
		const AC = window.AudioContext || window.webkitAudioContext
		if (!AC) return
		if (!audioCtx) {
			audioCtx = new AC()
			sfxMasterGain = audioCtx.createGain()
			sfxMasterGain.connect(audioCtx.destination)
			applyMasterGain()
			window.addEventListener('transcendence-game-audio-changed', applyMasterGain)
		}
		if (hasUserInteracted && audioCtx.state === 'suspended') {
			void audioCtx.resume().catch(() => {})
		}
	} catch {
		/* ignore */
	}
}

function getCtx() {
	if (!audioCtx) unlockGameAudio()
	return audioCtx
}

function getDest() {
	if (!sfxMasterGain) unlockGameAudio()
	return sfxMasterGain ?? audioCtx?.destination ?? null
}

function now() {
	const c = getCtx()
	return c ? c.currentTime : 0
}

function gainEnvelope(c, t0, peak, attack, decay, duration) {
	const g = c.createGain()
	g.gain.setValueAtTime(0.0001, t0)
	g.gain.exponentialRampToValueAtTime(peak, t0 + attack)
	g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.min(duration, attack + decay))
	return g
}

/** Bois / pierre : bruit filtré, ~150 ms */
export function playMoveLegal() {
	const c = getCtx()
	if (!c) return
	const dest = getDest()
	if (!dest) return
	const t0 = now()
	const dur = 0.15
	const bufferSize = c.sampleRate * dur
	const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
	const data = buffer.getChannelData(0)
	for (let i = 0; i < bufferSize; i++) {
		data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) ** 0.5
	}
	const src = c.createBufferSource()
	src.buffer = buffer
	const bp = c.createBiquadFilter()
	bp.type = 'bandpass'
	bp.frequency.value = 420
	bp.Q.value = 0.9
	const g = gainEnvelope(c, t0, 0.22, 0.008, 0.12, dur)
	src.connect(bp)
	bp.connect(g)
	g.connect(dest)
	src.start(t0)
	src.stop(t0 + dur + 0.02)
}

/** Capture : bruit court + cloche métal mate, ~250 ms, +volume */
export function playMoveCapture() {
	const c = getCtx()
	if (!c) return
	const dest = getDest()
	if (!dest) return
	const t0 = now()
	const dur = 0.25
	const bufferSize = c.sampleRate * 0.08
	const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
	const data = buffer.getChannelData(0)
	for (let i = 0; i < bufferSize; i++) {
		data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
	}
	const ns = c.createBufferSource()
	ns.buffer = buffer
	const bp = c.createBiquadFilter()
	bp.type = 'bandpass'
	bp.frequency.value = 380
	const ng = gainEnvelope(c, t0, 0.18, 0.006, 0.07, 0.08)
	ns.connect(bp)
	bp.connect(ng)
	ng.connect(dest)
	ns.start(t0)
	ns.stop(t0 + 0.09)
	const osc = c.createOscillator()
	osc.type = 'triangle'
	osc.frequency.setValueAtTime(620, t0 + 0.02)
	osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.22)
	const bell = c.createBiquadFilter()
	bell.type = 'lowpass'
	bell.frequency.value = 2400
	const g = gainEnvelope(c, t0 + 0.02, 0.32, 0.01, 0.2, dur)
	osc.connect(bell)
	bell.connect(g)
	g.connect(dest)
	osc.start(t0 + 0.02)
	osc.stop(t0 + dur)
}

/** Roque : double impact + feutre (bruit très bas) */
export function playMoveCastling() {
	const c = getCtx()
	if (!c) return
	const dest = getDest()
	if (!dest) return
	const t0 = now()
	const mkThud = (offset, freq) => {
		const osc = c.createOscillator()
		osc.type = 'sine'
		osc.frequency.value = freq
		const g = c.createGain()
		g.gain.setValueAtTime(0.0001, t0 + offset)
		g.gain.exponentialRampToValueAtTime(0.2, t0 + offset + 0.012)
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.1)
		osc.connect(g)
		g.connect(dest)
		osc.start(t0 + offset)
		osc.stop(t0 + offset + 0.12)
	}
	mkThud(0, 95)
	mkThud(0.09, 78)
	const noiseBuf = c.createBuffer(1, c.sampleRate * 0.08, c.sampleRate)
	const nd = noiseBuf.getChannelData(0)
	for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.4
	const ns = c.createBufferSource()
	ns.buffer = noiseBuf
	const lp = c.createBiquadFilter()
	lp.type = 'lowpass'
	lp.frequency.value = 400
	const ng = gainEnvelope(c, t0, 0.06, 0.02, 0.06, 0.08)
	ns.connect(lp)
	lp.connect(ng)
	ng.connect(dest)
	ns.start(t0)
	ns.stop(t0 + 0.09)
}

/** Échec : ping cristal ~400 ms */
export function playMoveCheck() {
	const c = getCtx()
	if (!c) return
	const dest = getDest()
	if (!dest) return
	const t0 = now()
	const dur = 0.4
	const osc = c.createOscillator()
	osc.type = 'sine'
	osc.frequency.setValueAtTime(1320, t0)
	osc.frequency.exponentialRampToValueAtTime(880, t0 + 0.08)
	const osc2 = c.createOscillator()
	osc2.type = 'sine'
	osc2.frequency.setValueAtTime(2640, t0)
	const g1 = gainEnvelope(c, t0, 0.12, 0.003, 0.35, dur)
	const g2 = gainEnvelope(c, t0, 0.05, 0.003, 0.3, dur)
	osc.connect(g1)
	osc2.connect(g2)
	g1.connect(dest)
	g2.connect(dest)
	osc.start(t0)
	osc2.start(t0)
	osc.stop(t0 + dur)
	osc2.stop(t0 + dur)
}

/** Victoire (mat) ~2.5 s shimmer */
export function playGameWin() {
	const c = getCtx()
	if (!c) return
	const dest = getDest()
	if (!dest) return
	const t0 = now()
	const dur = 2.5
	const freqs = [392, 494, 587, 784]
	freqs.forEach((f, i) => {
		const osc = c.createOscillator()
		osc.type = 'sine'
		osc.frequency.setValueAtTime(f * 0.5, t0)
		osc.frequency.exponentialRampToValueAtTime(f * 1.2, t0 + dur * 0.85)
		const g = c.createGain()
		const delay = i * 0.08
		g.gain.setValueAtTime(0.0001, t0 + delay)
		g.gain.exponentialRampToValueAtTime(0.06 / (i + 1), t0 + delay + 0.15)
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
		osc.connect(g)
		g.connect(dest)
		osc.start(t0 + delay)
		osc.stop(t0 + dur)
	})
}

/** Nulle ~2 s piano bas filtré */
export function playGameDraw() {
	const c = getCtx()
	if (!c) return
	const dest = getDest()
	if (!dest) return
	const t0 = now()
	const dur = 2
	const osc = c.createOscillator()
	osc.type = 'triangle'
	osc.frequency.value = 98
	const lp = c.createBiquadFilter()
	lp.type = 'lowpass'
	lp.frequency.setValueAtTime(900, t0)
	lp.frequency.exponentialRampToValueAtTime(120, t0 + dur)
	const g = c.createGain()
	g.gain.setValueAtTime(0.0001, t0)
	g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.2)
	g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
	osc.connect(lp)
	lp.connect(g)
	g.connect(dest)
	osc.start(t0)
	osc.stop(t0 + dur + 0.05)
}

/** Abandon ~1.5 s impact + descente */
export function playGameResign() {
	const c = getCtx()
	if (!c) return
	const dest = getDest()
	if (!dest) return
	const t0 = now()
	const dur = 1.5
	const osc = c.createOscillator()
	osc.type = 'sine'
	osc.frequency.setValueAtTime(110, t0)
	osc.frequency.exponentialRampToValueAtTime(45, t0 + 1.2)
	const g = c.createGain()
	g.gain.setValueAtTime(0.0001, t0)
	g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.04)
	g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
	osc.connect(g)
	g.connect(dest)
	osc.start(t0)
	osc.stop(t0 + dur)
}

/** Timeout : 3 bips ~800 ms */
export function playClockTimeout() {
	const c = getCtx()
	if (!c) return
	const dest = getDest()
	if (!dest) return
	const t0 = now()
	for (let i = 0; i < 3; i++) {
		const osc = c.createOscillator()
		osc.type = 'sine'
		osc.frequency.value = 440
		const g = c.createGain()
		const s = t0 + i * 0.22
		g.gain.setValueAtTime(0.0001, s)
		g.gain.exponentialRampToValueAtTime(0.18, s + 0.01)
		g.gain.exponentialRampToValueAtTime(0.0001, s + 0.08)
		osc.connect(g)
		g.connect(dest)
		osc.start(s)
		osc.stop(s + 0.09)
	}
}

/** Coup illégal ~100 ms */
export function playUiErrorDeny() {
	const c = getCtx()
	if (!c) return
	const dest = getDest()
	if (!dest) return
	const t0 = now()
	const osc = c.createOscillator()
	osc.type = 'sine'
	osc.frequency.value = 72
	const g = gainEnvelope(c, t0, 0.35, 0.005, 0.09, 0.1)
	osc.connect(g)
	g.connect(dest)
	osc.start(t0)
	osc.stop(t0 + 0.11)
}

/**
 * @param {string} [flags] drapeaux chess.js (ex. "c" capture, "e" ep, "k"/"q" roque)
 */
export function playPieceMoveFromFlags(flags = '') {
	const f = typeof flags === 'string' ? flags : ''
	if (f.includes('k') || f.includes('q')) {
		playMoveCastling()
		return
	}
	if (f.includes('c') || f.includes('e')) {
		playMoveCapture()
		return
	}
	playMoveLegal()
}
