import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/index.js'
import TeamMemberSection from '../components/TeamMemberSection.jsx'
import '../styles/AboutPage.css'

const TEAM = [
	{
		name: 'Membre 1',
		role: 'Backend & infra',
		bio: 'Branche la stack Docker, le jeu temps réel et la sécurité. Remplace ce texte par ta présentation.',
		coalitionSlug: 'feu',
		photoSrc: null,
	},
	{
		name: 'Membre 2',
		role: 'Frontend & UX',
		bio: 'Interface React, thème coalitions et expérience mobile. Ajoute ta photo dans les props plus tard.',
		coalitionSlug: 'eau',
		photoSrc: null,
	},
	{
		name: 'Membre 3',
		role: 'Full-stack / jeu',
		bio: 'Matchmaking, échiquier et logique de partie. Personnalise ce bloc comme tu veux.',
		coalitionSlug: 'terre',
		photoSrc: null,
	},
	{
		name: 'Membre 4',
		role: 'Chat & social',
		bio: 'Messagerie, amis et invites. Un parallax t’accompagne en scrollant vers la section suivante.',
		coalitionSlug: 'air',
		photoSrc: null,
	},
]

export default function AboutPage() {
	const { isAuthenticated, isTwoFactorVerified, isLoading } = useAuth()
	const backHref =
		!isLoading && isAuthenticated && isTwoFactorVerified ? '/' : '/auth'

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
