/**
 * Scanne public/chess/tiles/<feu|eau|terre|air>/{light,dark}/*.png
 * (fichiers nommés uniquement par un nombre : 1.png, 12.png, …)
 * et écrit src/features/chess/assets/boardTilesManifest.json
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const tilesRoot = path.join(root, 'public', 'chess', 'tiles')
const outFile = path.join(root, 'src', 'features', 'chess', 'assets', 'boardTilesManifest.json')

const SLUGS = ['feu', 'eau', 'terre', 'air']
const SHADES = ['light', 'dark']
const PNG_NUM = /^(\d+)\.png$/i

function listNumericIds(dir) {
	if (!fs.existsSync(dir)) return []
	const ids = new Set()
	for (const name of fs.readdirSync(dir)) {
		const m = name.match(PNG_NUM)
		if (m) ids.add(parseInt(m[1], 10))
	}
	return [...ids].sort((a, b) => a - b)
}

const manifest = {}

for (const slug of SLUGS) {
	manifest[slug] = { light: [], dark: [] }
	for (const shade of SHADES) {
		const dir = path.join(tilesRoot, slug, shade)
		manifest[slug][shade] = listNumericIds(dir)
	}
}

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(manifest, null, '\t') + '\n', 'utf8')

console.log('boardTilesManifest.json ←', outFile)
for (const slug of SLUGS) {
	const { light, dark } = manifest[slug]
	console.log(`  ${slug}: light [${light.join(', ')}] · dark [${dark.join(', ')}]`)
}
