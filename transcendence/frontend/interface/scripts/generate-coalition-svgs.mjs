/**
 * Génère 48 SVG (4 coalitions × clair/sombre × 6 pièces) dans public/chess/coalitions/
 * Exécution : node scripts/generate-coalition-svgs.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outRoot = path.join(root, 'public', 'chess', 'coalitions')

const palettes = {
	feu: {
		clair: { main: '#fff7ed', stroke: '#c2410c', accent: '#ea580c', detail: '#fdba74' },
		sombre: { main: '#7f1d1d', stroke: '#450a0a', accent: '#dc2626', detail: '#fecaca' },
	},
	eau: {
		clair: { main: '#f0f9ff', stroke: '#0369a1', accent: '#0284c7', detail: '#7dd3fc' },
		sombre: { main: '#0c4a6e', stroke: '#082f49', accent: '#22d3ee', detail: '#164e63' },
	},
	terre: {
		clair: { main: '#fefce8', stroke: '#4d7c0f', accent: '#65a30d', detail: '#d9f99d' },
		sombre: { main: '#422006', stroke: '#1c1917', accent: '#a16207', detail: '#84cc16' },
	},
	air: {
		clair: { main: '#f8fafc', stroke: '#64748b', accent: '#94a3b8', detail: '#e2e8f0' },
		sombre: { main: '#1e293b', stroke: '#0f172a', accent: '#cbd5e1', detail: '#475569' },
	},
}

function wrap(svgInner, c) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="45" height="45" aria-hidden="true">
${svgInner}
</svg>`
}

/** Pièces stylisées (silhouettes type Staunton simplifiées) */
const pieces = {
	p: (c) => wrap(
		`<g stroke="${c.stroke}" stroke-width="1.1" stroke-linejoin="round">
  <ellipse cx="22.5" cy="11" rx="5" ry="5.5" fill="${c.main}"/>
  <path d="M16 19 Q22.5 15 29 19 L27 31 L18 31 Z" fill="${c.main}"/>
  <path d="M13 33 h19 v4 h-19 z" rx="1" fill="${c.accent}" opacity="0.85"/>
  <ellipse cx="22.5" cy="35" rx="10" ry="2.2" fill="${c.detail}" opacity="0.5"/>
</g>`,
		c,
	),
	r: (c) => wrap(
		`<g stroke="${c.stroke}" stroke-width="1.1" stroke-linejoin="round" fill="${c.main}">
  <path d="M14 12 h17 v4 h-3 v3 h3 v4 h-3 v3 h3 v4 h-17 v-4 h3 v-3 h-3 v-4 h3 v-3 h-3 z"/>
  <rect x="12" y="33" width="21" height="5" rx="1" fill="${c.accent}"/>
  <ellipse cx="22.5" cy="35" rx="10" ry="2" fill="${c.detail}" opacity="0.45"/>
</g>`,
		c,
	),
	n: (c) => wrap(
		`<g stroke="${c.stroke}" stroke-width="1.1" stroke-linejoin="round" fill="${c.main}">
  <path d="M12 34 L14 18 Q22 10 30 14 L32 20 Q28 22 26 18 Q24 28 20 32 Z"/>
  <circle cx="28" cy="12" r="2.5" fill="${c.detail}"/>
  <path d="M10 34 h26 v4 h-26 z" fill="${c.accent}"/>
</g>`,
		c,
	),
	b: (c) => wrap(
		`<g stroke="${c.stroke}" stroke-width="1.1" stroke-linejoin="round" fill="${c.main}">
  <path d="M22.5 8 L28 14 L26 22 L19 22 L17 14 Z"/>
  <ellipse cx="22.5" cy="24" rx="7" ry="5" fill="${c.main}"/>
  <path d="M16 28 Q22.5 26 29 28 L27 33 L18 33 Z"/>
  <rect x="12" y="33" width="21" height="5" rx="1" fill="${c.accent}"/>
  <circle cx="22.5" cy="10" r="1.8" fill="${c.detail}"/>
</g>`,
		c,
	),
	q: (c) => wrap(
		`<g stroke="${c.stroke}" stroke-width="1.1" stroke-linejoin="round" fill="${c.main}">
  <circle cx="14" cy="10" r="2.5" fill="${c.detail}"/>
  <circle cx="22.5" cy="8" r="2.5" fill="${c.detail}"/>
  <circle cx="31" cy="10" r="2.5" fill="${c.detail}"/>
  <path d="M12 14 h21 v6 h-3 l-2 14 h-11 l-2-14 h-3 z"/>
  <rect x="11" y="33" width="23" height="5" rx="1" fill="${c.accent}"/>
</g>`,
		c,
	),
	k: (c) => wrap(
		`<g stroke="${c.stroke}" stroke-width="1.1" stroke-linejoin="round" fill="${c.main}">
  <path d="M22.5 6 v6 M19.5 9 h6" stroke-width="1.4"/>
  <rect x="20" y="12" width="5" height="4" fill="${c.detail}"/>
  <path d="M15 16 h15 l-2 18 h-11 z"/>
  <rect x="11" y="33" width="23" height="5" rx="1" fill="${c.accent}"/>
</g>`,
		c,
	),
}

for (const [coal, shades] of Object.entries(palettes)) {
	for (const [shade, colors] of Object.entries(shades)) {
		const dir = path.join(outRoot, coal, shade)
		fs.mkdirSync(dir, { recursive: true })
		for (const [key, fn] of Object.entries(pieces)) {
			const file = path.join(dir, `${key}.svg`)
			fs.writeFileSync(file, fn(colors), 'utf8')
		}
	}
}

console.log('OK →', outRoot)
