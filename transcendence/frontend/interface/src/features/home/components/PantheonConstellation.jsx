import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'

const SLUGS = ['feu', 'eau', 'terre', 'air']

/**
 * Visuel hero : constellation des coalitions autour d’un motif arène / échecs (sans photo réaliste).
 */
export default function PantheonConstellation() {
	return (
		<div className="pantheon-constellation" role="img" aria-label="Illustration : quatre coalitions autour de l’arène">
			<div className="pantheon-constellation__glow" aria-hidden="true" />
			<div className="pantheon-constellation__orbit" aria-hidden="true" />
			{SLUGS.map((slug) => (
				<div
					key={slug}
					className={`pantheon-constellation__emblem pantheon-constellation__emblem--${slug}`}
					title={slug}
				>
					<ProfileCoalitionIcon slug={slug} />
				</div>
			))}
			<div className="pantheon-constellation__core">
				<i className="ri-chess-line pantheon-constellation__core-icon" aria-hidden="true" />
				<span className="pantheon-constellation__core-label">Arène</span>
			</div>
			<div className="pantheon-constellation__stars" aria-hidden="true" />
		</div>
	)
}
