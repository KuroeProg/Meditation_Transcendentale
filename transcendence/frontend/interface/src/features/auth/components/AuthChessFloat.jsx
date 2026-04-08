import { useMemo } from 'react'

const POOL = [
	'/chess/pieces/feu/light/k.png',
	'/chess/pieces/eau/light/q.png',
	'/chess/pieces/terre/light/r.png',
	'/chess/pieces/air/light/n.png',
	'/chess/pieces/feu/dark/b.png',
	'/chess/pieces/eau/dark/p.png',
	'/chess/pieces/terre/dark/k.png',
	'/chess/pieces/air/dark/q.png',
	'/chess/pieces/feu/light/p.png',
	'/chess/pieces/eau/light/r.png',
	'/chess/pieces/terre/light/b.png',
	'/chess/pieces/air/light/k.png',
]

/**
 * Pièces en filigrane, défilant du bas vers le haut (derrière le formulaire).
 */
export default function AuthChessFloat() {
	const items = useMemo(
		() =>
			Array.from({ length: 18 }, (_, i) => {
				const row = Math.floor(i / 6)
				const col = i % 6
				return {
					id: i,
					src: POOL[i % POOL.length],
					left: `${8 + col * 14 + (row % 2) * 7}%`,
					delay: `${i * 0.55}s`,
					duration: `${16 + (i % 7)}s`,
					size: 26 + (i % 5) * 10,
					opacity: 0.12 + (i % 4) * 0.04,
				}
			}),
		[],
	)

	return (
		<div className="auth-chess-float" aria-hidden>
			{items.map((p) => (
				<img
					key={p.id}
					className="auth-chess-float-piece"
					src={p.src}
					alt=""
					draggable={false}
					style={{
						left: p.left,
						width: p.size,
						height: p.size,
						animationDelay: p.delay,
						animationDuration: p.duration,
						opacity: p.opacity,
					}}
				/>
			))}
		</div>
	)
}
