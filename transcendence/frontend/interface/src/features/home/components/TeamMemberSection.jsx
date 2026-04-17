import { useRef } from 'react'
import { motion as Motion, useScroll, useTransform } from 'framer-motion'
import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'
import { useReduceMotionPref } from '../../theme/index.js'

/**
 * Bloc membre avec léger parallax vertical (désactivé si reduce motion).
 */
export default function TeamMemberSection({ name, role, bio, coalitionSlug, photoSrc, photoAlt }) {
	const ref = useRef(null)
	const reduceMotion = useReduceMotionPref()
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ['start end', 'end start'],
	})
	const y = useTransform(scrollYProgress, [0, 0.45, 1], reduceMotion ? [0, 0, 0] : [48, 0, -36])
	const photoY = useTransform(scrollYProgress, [0, 0.5, 1], reduceMotion ? [0, 0, 0] : [-24, 0, 32])

	return (
		<section ref={ref} className="about-member">
			<Motion.div className="about-member-inner" style={{ y }}>
				<Motion.div className="about-member-photo-wrap" style={{ y: photoY }}>
					<div className="about-member-photo-ring" />
					{photoSrc ? (
						<img className="about-member-photo" src={photoSrc} alt={photoAlt || name} />
					) : (
						<div className="about-member-photo about-member-photo--placeholder" aria-hidden="true">
							<i className="ri-user-3-line" />
						</div>
					)}
				</Motion.div>
				<div className="about-member-text">
					<h2 className="about-member-name-row">
						<span className="about-member-name">{name}</span>
						<span className="about-member-coalition" title={`Coalition ${coalitionSlug}`}>
							<ProfileCoalitionIcon slug={coalitionSlug} />
						</span>
					</h2>
					<p className="about-member-role">{role}</p>
					<p className="about-member-bio">{bio}</p>
				</div>
			</Motion.div>
		</section>
	)
}
