import { Link } from 'react-router-dom'
import TeamMemberSection from '../components/TeamMemberSection.jsx'
import PantheonConstellation from '../components/PantheonConstellation.jsx'
import AboutAmbientParticles from '../components/AboutAmbientParticles.jsx'
import '../styles/AboutPage.css'

const GITHUB_URL_VINCENT = 'https://github.com/Corgidev42'
const GITHUB_URL_ALEXIE = 'https://github.com/FeyNey'
const GITHUB_URL_EVEN = 'https://github.com/EvenZeppa'
const GITHUB_URL_CLOE = 'https://github.com/KuroeProg'
const GITHUB_URL_THEO = 'https://github.com/Mileumm'

/**
 * Portraits : placer les fichiers dans `public/team/` puis exposer `/team/<fichier>`.
 * Pour ajouter un membre : copier l’image → constante `PHOTO_SRC_*` → `photoSrc` dans `TEAM` (ou `null` + Intra).
 */
const PHOTO_SRC_VINCENT = '/team/vincent.png'
const PHOTO_SRC_ALEXIE = '/team/alexie.png'
const PHOTO_SRC_EVEN = '/team/even.png'
const PHOTO_SRC_CLOE = '/team/cloe.png'
const PHOTO_SRC_THEO = '/team/theo.png'

/** Si la constante photo est `null`, on retombe sur l’avatar Intra (à retirer quand tout est local). */
const intraAvatar = (login) => `https://cdn.intra.42.fr/users/${login}/medium_avatar.jpg`

/** Cinq membres — rôles et périmètres alignés sur `Todo.md` (ft_transcendence). Les logins 42 sont à ajuster si besoin. */
const TEAM = [
	{
		displayName: 'Vincent',
		login42: 'vbonnard',
		role: 'Frontend — React, UI jeu, design system, WebSocket client',
		roleEmoji: '🎨',
		bio: 'Shell responsive, dashboard v2, auth & coalitions, chat côté interface, CSS découpé (layout, jeu, profil). Bonus audio (BGM accueil / partie, prefs), logo & favicon, accessibilité « réduire les animations » branchée sur le thème.',
		coalitionSlug: 'feu',
		statLine: 'Modules front revendiqués : jeu distant + UI, interaction users, customisation (quasi)',
		quote: '« Si le plateau respire, le joueur reste. »',
		githubUrl: GITHUB_URL_VINCENT,
		photoSrc: PHOTO_SRC_VINCENT ?? intraAvatar('vbonnard'),
	},
	{
		displayName: 'Alexie',
		login42: 'acoste',
		role: 'Frontend — React, UI jeu, design system, WebSocket client',
		roleEmoji: '💻',
		bio: 'Même colonne front que Vyke sur le sujet : drawer chat & FAB, profil & amis, WebSockets côté client, polish UI/UX. Livraisons 2026-04 : chat Django + intégration React, refonte profil, navigation mobile (bottom nav).',
		coalitionSlug: 'feu',
		statLine: 'WebSockets (client) + interaction users : co-owner avec Vyke & Even',
		quote: '« Le composant est prêt quand l’évaluateur ne voit pas la couture. »',
		githubUrl: GITHUB_URL_ALEXIE,
		photoSrc: PHOTO_SRC_ALEXIE ?? intraAvatar('acoste'),
	},
	{
		displayName: 'Even',
		login42: 'ezeppa',
		role: 'Backend — Django, APIs, auth, WebSockets serveur, jeu à distance',
		roleEmoji: '🛡️',
		bio: 'Cœur Django : OAuth 42, 2FA, friendships, app chat (REST + consumer ASGI), persistance, nginx & orchestration avec l’équipe. Remote players et sync temps réel côté serveur ; pairage avec le front pour profil, stats et matchmaking.',
		coalitionSlug: 'eau',
		statLine: 'ORM + jeu complet + remote : co-owner ; schéma DB / health : en cours avec l’équipe',
		quote: '« Un endpoint clair vaut trois specs floues. »',
		githubUrl: GITHUB_URL_EVEN,
		photoSrc: PHOTO_SRC_EVEN ?? intraAvatar('ezeppa'),
	},
	{
		displayName: 'Cloé',
		login42: 'cfiachet',
		role: 'Cybersécurité — WAF, Vault, durcissement, monitoring',
		roleEmoji: '🔐',
		bio: 'ModSecurity + HashiCorp Vault, TLS/nginx avec Even, accès logs & durcissement. Prometheus + Grafana (Major IV.7 — alerting à finaliser) ; ELK en cours avec Théo (Elasticsearch, rétention, accès).',
		coalitionSlug: 'eau',
		statLine: 'Major cyber (WAF + Vault) : en cours de démo complète',
		quote: '« Les secrets ne voyagent pas en clair. »',
		githubUrl: GITHUB_URL_CLOE,
		photoSrc: PHOTO_SRC_CLOE ?? intraAvatar('cfiachet'),
	},
	{
		displayName: 'Théo',
		login42: 'tbahin',
		role: 'Statistiques & data — IV.3 / IV.8, appui backend & DevOps',
		roleEmoji: '📊',
		bio: 'Stats & historique (page /statistics, Recharts, thème coalition, mocks alignés profil / fin de partie). Appui ORM, données, ELK avec Cloé. Feuille de suivi des points modules dans Todo.md.',
		coalitionSlug: 'eau',
		statLine: 'Stats perso + panneaux : front prêt ; persistance parties : en lien avec Even',
		quote: '« Un graphique honnête vaut mieux qu’un KPI inventé. »',
		githubUrl: GITHUB_URL_THEO,
		photoSrc: PHOTO_SRC_THEO ?? intraAvatar('tbahin'),
	},
]

const PANTHEON_INTRO =
	'Transcendance est une arène d’échecs en ligne pour le sujet ft_transcendence : cinq bâtisseurs — deux sur le front (Vyke, Fey), un back (Even), la cybersécurité (Cloé), les stats & data avec appui back (Mileum). Coalitions, OAuth, jeu distant, chat, monitoring : le détail des modules et des owners est suivi dans Todo.md. Fais défiler : les cartes flottent à des profondeurs différentes, et le cosmos réagit à ta souris et au scroll.'

export default function AboutPage() {
	const backHref = '/'

	return (
		<div className="about-page page-shell about-page--pantheon">
			<div className="about-page__cosmic-bg" aria-hidden="true">
				<span className="about-page__orb about-page__orb--terre" />
				<span className="about-page__orb about-page__orb--feu" />
				<span className="about-page__orb about-page__orb--eau" />
				<span className="about-page__orb about-page__orb--air" />
				<span className="about-page__orb about-page__orb--core" />
			</div>
			<AboutAmbientParticles />

			<header className="about-hero about-hero--pantheon">
				<Link to={backHref} className="about-back">
					<i className="ri-arrow-left-line" aria-hidden="true" />
					Retour
				</Link>
				<p className="about-kicker">Le Panthéon des Bâtisseurs</p>
				<h1 className="page-title about-page-title">Les architectes de l&apos;Arène</h1>
				<p className="about-intro about-intro--runic">
					Cinq architectes · front ×2 · back · cyber · data — même arène, même sujet : le fil conducteur est
					dans Todo.md.
				</p>
			</header>

			<section className="about-pantheon-intro" aria-labelledby="about-pantheon-heading">
				<div className="about-pantheon-intro__visual">
					<PantheonConstellation />
				</div>
				<div className="about-pantheon-intro__copy">
					<h2 id="about-pantheon-heading" className="about-pantheon-intro__title">
						Constellation du projet
					</h2>
					<p className="about-pantheon-intro__text">{PANTHEON_INTRO}</p>
				</div>
			</section>

			<div className="about-members about-members--pantheon">
				{TEAM.map((m, i) => (
					<TeamMemberSection
						key={m.login42}
						displayName={m.displayName}
						login42={m.login42}
						role={m.role}
						roleEmoji={m.roleEmoji}
						bio={m.bio}
						coalitionSlug={m.coalitionSlug}
						photoSrc={m.photoSrc}
						photoAlt={m.displayName}
						statLine={m.statLine}
						quote={m.quote}
						githubUrl={m.githubUrl}
						depthIndex={i}
					/>
				))}
			</div>
		</div>
	)
}
