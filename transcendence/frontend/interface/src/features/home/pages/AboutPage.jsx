import { Link } from 'react-router-dom'
import TeamMemberSection from '../components/TeamMemberSection.jsx'
import '../styles/AboutPage.css'

const TEAM = [
	{
		name: 'Membre 1',
		role: 'Backend & infra',
		bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.',
		coalitionSlug: 'feu',
		photoSrc: null,
	},
	{
		name: 'Membre 2',
		role: 'Frontend & UX',
		bio: 'Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta.',
		coalitionSlug: 'eau',
		photoSrc: null,
	},
	{
		name: 'Membre 3',
		role: 'Full-stack / jeu',
		bio: 'Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra.',
		coalitionSlug: 'terre',
		photoSrc: null,
	},
	{
		name: 'Membre 4',
		role: 'Chat & social',
		bio: 'Per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor.',
		coalitionSlug: 'air',
		photoSrc: null,
	},
]

const TEAM_INTRO_LOREM =
	'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Donec velit neque, auctor sit amet aliquam vel, ullamcorper sit amet ligula. Cras ultricies ligula sed magna dictum porta.'

export default function AboutPage() {
	const backHref = '/'

	return (
		<div className="about-page page-shell">
			<div className="about-hero">
				<Link to={backHref} className="about-back">
					<i className="ri-arrow-left-line" aria-hidden="true" />
					Retour
				</Link>
				<h1 className="page-title">À propos de nous</h1>
				<p className="about-intro">
					Transcendance est un projet étudiant autour des échecs en ligne et des coalitions 42.
					Fais défiler pour découvrir l’équipe — chaque section joue un léger effet de profondeur.
				</p>
			</div>

			<section className="about-team-intro surface-card" aria-labelledby="about-team-heading">
				<h2 id="about-team-heading" className="about-team-intro-title">
					L’équipe
				</h2>
				<p className="about-team-intro-text">{TEAM_INTRO_LOREM}</p>
			</section>

			<div className="about-members">
				{TEAM.map((m) => (
					<TeamMemberSection
						key={m.name}
						name={m.name}
						role={m.role}
						bio={m.bio}
						coalitionSlug={m.coalitionSlug}
						photoSrc={m.photoSrc}
						photoAlt={m.name}
					/>
				))}
			</div>
		</div>
	)
}
