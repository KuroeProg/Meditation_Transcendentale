import { useRef } from 'react'
import { motion as Motion, useScroll, useTransform } from 'framer-motion'
import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'
import { useReduceMotionPref } from '../../theme/index.js'
import { coalitionSlugToLabel } from '../../theme/services/coalitionTheme.js'

const DEPTH_RANGES = [
	{ y: [56, 0, -44], scale: [0.97, 1, 0.985] },
	{ y: [40, 0, -32], scale: [0.99, 1, 0.992] },
	{ y: [72, 0, -52], scale: [0.965, 1, 0.978] },
]

/**
 * Carte membre « bâtisseur » : verre, coalition, portrait type carte de jeu, révélation au survol.
 */
export default function TeamMemberSection({
	displayName,
	login42,
	role,
	roleEmoji,
	bio,
	coalitionSlug,
	photoSrc,
	photoAlt,
	statLine,
	quote,
	githubUrl,
	depthIndex = 0,
}) {
	const ref = useRef(null)
	const reduceMotion = useReduceMotionPref()
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ['start end', 'end start'],
	})

	const depth = DEPTH_RANGES[depthIndex % DEPTH_RANGES.length]
	const y = useTransform(scrollYProgress, [0, 0.45, 1], reduceMotion ? [0, 0, 0] : depth.y)
	const scale = useTransform(scrollYProgress, [0, 0.5, 1], reduceMotion ? [1, 1, 1] : depth.scale)

	return (
		<section ref={ref} className={`about-member about-member--${coalitionSlug}`} data-testid={`about-member-${login42}`}>
			<Motion.div className="about-member-card" style={{ y, scale }}>
				<div className="about-member-card__inner">
					<div className="about-member-portrait-wrap">
						{photoSrc ? (
							<div className="about-member-portrait about-member-portrait--photo">
								<img
									src={photoSrc}
									alt={photoAlt || displayName}
									className="about-member-portrait__img"
									data-testid={`about-member-photo-${login42}`}
								/>
								<span className="about-member-portrait__login">{login42}</span>
							</div>
						) : (
							<div className="about-member-portrait about-member-portrait--card" aria-hidden="true">
								<div className="about-member-portrait__pattern" />
								<div className="about-member-portrait__coal-watermark">
									<ProfileCoalitionIcon slug={coalitionSlug} />
								</div>
								<div className="about-member-portrait__rank">
									<i className="ri-vip-crown-2-fill" aria-hidden="true" />
									<span>Bâtisseur</span>
								</div>
								<div className="about-member-portrait__login-block">
									<span className="about-member-portrait__login-label">login 42</span>
									<span className="about-member-portrait__login">{login42}</span>
								</div>
								{statLine && <p className="about-member-portrait__stat">{statLine}</p>}
							</div>
						)}
					</div>

					<div className="about-member-body">
						<div className="about-member-name-row">
							<span className="about-member-coalition" title={coalitionSlugToLabel(coalitionSlug)}>
								<ProfileCoalitionIcon slug={coalitionSlug} />
							</span>
							<h2 className="about-member-name">{displayName}</h2>
							{roleEmoji && (
								<span className="about-member-role-emoji" title={role} aria-hidden="true">
									{roleEmoji}
								</span>
							)}
						</div>
						<p className="about-member-role">{role}</p>
						<p className="about-member-bio">{bio}</p>
					</div>
				</div>

				{(quote || githubUrl) && (
					<div className="about-member-card__reveal">
						{quote && <blockquote className="about-member-quote">{quote}</blockquote>}
						{githubUrl && (
							<a className="about-member-github" href={githubUrl} target="_blank" rel="noreferrer">
								<i className="ri-github-fill" aria-hidden="true" />
								Profil GitHub
							</a>
						)}
					</div>
				)}
			</Motion.div>
		</section>
	)
}
