import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcRoot = path.join(root, 'src')

const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.scss', '.html', '.md', '.json'])

function walkFiles(dir, onFile) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			walkFiles(fullPath, onFile)
			continue
		}
		onFile(fullPath)
	}
}

function toPosixPath(filePath) {
	return path.relative(root, filePath).split(path.sep).join('/')
}

function renameCssFiles() {
	const cssFiles = []
	walkFiles(srcRoot, (filePath) => {
		if (path.extname(filePath) === '.css') cssFiles.push(filePath)
	})

	for (const cssFile of cssFiles) {
		const scssFile = cssFile.slice(0, -4) + '.scss'
		if (fs.existsSync(scssFile)) {
			throw new Error(`Refusing to overwrite existing file: ${toPosixPath(scssFile)}`)
		}
		fs.renameSync(cssFile, scssFile)
		console.log(`renamed ${toPosixPath(cssFile)} -> ${toPosixPath(scssFile)}`)
	}

	console.log(`Renamed ${cssFiles.length} CSS file${cssFiles.length === 1 ? '' : 's'}.`)
}

function replaceCssImports() {
	const importPatterns = [
		/(\bfrom\s+['"][^'"]+?)\.css(['"])/g,
		/(\bimport\s+['"][^'"]+?)\.css(['"])/g,
		/(@import\s+['"][^'"]+?)\.css(['"])/g,
	]

	let changedFiles = 0
	walkFiles(srcRoot, (filePath) => {
		if (!TEXT_EXTENSIONS.has(path.extname(filePath))) return

		const original = fs.readFileSync(filePath, 'utf8')
		let updated = original

		for (const pattern of importPatterns) {
			updated = updated.replace(pattern, '$1.scss$2')
		}

		if (updated === original) return

		fs.writeFileSync(filePath, updated, 'utf8')
		changedFiles += 1
		console.log(`updated ${toPosixPath(filePath)}`)
	})

	console.log(`Updated imports in ${changedFiles} file${changedFiles === 1 ? '' : 's'}.`)
}

function run() {
	const mode = process.argv[2] ?? 'all'

	if (mode === 'files') {
		renameCssFiles()
		return
	}

	if (mode === 'imports') {
		replaceCssImports()
		return
	}

	if (mode === 'all') {
		renameCssFiles()
		replaceCssImports()
		return
	}

	throw new Error(`Unknown mode: ${mode}`)
}

run()
