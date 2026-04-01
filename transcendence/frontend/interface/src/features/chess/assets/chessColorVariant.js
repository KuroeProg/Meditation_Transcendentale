/** Variante dossier PNG pièces : blancs → light, noirs → dark. */

export function chessColorToVariant(color) {
	return color === 'w' ? 'light' : 'dark'
}
