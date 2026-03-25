/**
 * Recalibre gridLeft, gridTop, gridSide en maximisant le contraste sur les
 * lignes entre cases (bords du damier), pas la variance interne.
 * Usage : npm i -D sharp && node scripts/measure-board-terre.mjs
 */
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imgPath = path.join(__dirname, '../public/imgs/board-terre.png')

const { data, info } = await sharp(imgPath).greyscale().raw().toBuffer({ resolveWithObject: true })

const W = info.width
const H = info.height

function lum(x, y) {
	if (x < 0 || x >= W || y < 0 || y >= H) return 0
	return data[y * W + x]
}

/** Contraste cumulé sur les 7 lignes verticales + 7 horizontales internes au damier */
function boundaryScore(L, T, S) {
	if (L < 8 || T < 8 || L + S > W - 8 || T + S > H - 8) return -1e15
	const cw = S / 8
	const chh = S / 8
	let s = 0
	const y0 = Math.floor(T + chh * 0.2)
	const y1 = Math.ceil(T + S - chh * 0.2)
	const x0 = Math.floor(L + cw * 0.2)
	const x1 = Math.ceil(L + S - cw * 0.2)

	for (let ci = 1; ci <= 7; ci++) {
		const x = Math.floor(L + ci * cw)
		for (let y = y0; y < y1; y += 2) {
			s += Math.abs(lum(x - 1, y) - lum(x + 1, y))
		}
	}
	for (let ri = 1; ri <= 7; ri++) {
		const y = Math.floor(T + ri * chh)
		for (let x = x0; x < x1; x += 2) {
			s += Math.abs(lum(x, y - 1) - lum(x, y + 1))
		}
	}
	return s
}

/* Éviter le cadre décoratif (racines à gauche / bas) : L assez grand, T modéré */
let best = { score: -1e15, L: 0, T: 0, S: 0 }
for (let S = 640; S <= 720; S += 2) {
	const Lmin = Math.max(145, Math.floor((W - S) / 2) - 35)
	const Lmax = Math.min(W - S - 120, Math.ceil((W - S) / 2) + 35)
	const Tmin = Math.max(95, Math.floor((H - S) / 2) - 50)
	const Tmax = Math.min(H - S - 70, Math.ceil((H - S) / 2) + 80)
	for (let L = Lmin; L <= Lmax; L += 2) {
		for (let T = Tmin; T <= Tmax; T += 2) {
			const sc = boundaryScore(L, T, S)
			if (sc > best.score) best = { score: sc, L, T, S }
		}
	}
}
const ref = { ...best }
for (let S = ref.S - 4; S <= ref.S + 4; S++) {
	for (let L = ref.L - 6; L <= ref.L + 6; L++) {
		for (let T = ref.T - 6; T <= ref.T + 6; T++) {
			const sc = boundaryScore(L, T, S)
			if (sc > best.score) best = { score: sc, L, T, S }
		}
	}
}

console.log(JSON.stringify({ gridLeft: best.L, gridTop: best.T, gridSide: best.S, W, H, score: best.score }, null, 2))
console.log('margins', { R: W - best.L - best.S, B: H - best.T - best.S })
