/**
 * Plateau image plein écran : géométrie native (px) de la zone 8×8 jouable.
 * Calage manuel affiné (l’art n’est pas mathématiquement parfait ; ajuster ici si besoin).
 *
 * - Augmenter gridTop → la grille (pièces) descend sur le dessin.
 * - Diminuer gridLeft → la grille se décale vers la gauche.
 * - gridSide : taille du carré 8×8 dans l’image (erreur = dérive rangée après rangée).
 */
export const BOARD_TERRE = {
	src: '/imgs/board-terre.png',
	imgWidth: 1024,
	imgHeight: 931,
	gridLeft: 194,
	gridTop: 75,
	gridSide: 634,
}
