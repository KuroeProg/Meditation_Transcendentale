import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/index.js'
import { useReduceMotionPref, coalitionToSlug, coalitionSlugToLabel } from '../../theme/index.js'
import { getLogin42 } from '../../../utils/sessionUser.js'
import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'
import '../styles/ContactPage.scss'

const GITHUB_PROJECT = 'https://github.com/KuroeProg/Meditation_Transcendentale'
const DISCORD_42 = '/'

const SUBJECT_OPTIONS = [
	{
		id: 'support',
		value: 'support',
		label: 'Support technique',
		element: 'La Terre',
		blurb: 'Solide, résolution de problèmes',
		iconClass: 'ri-shield-fill',
		accentVar: '--contact-element-terre',
	},
	{
		id: 'moderation',
		value: 'moderation',
		label: 'Signalement de comportement',
		element: 'Le Feu',
		blurb: 'Ardent, modération',
		iconClass: 'ri-fire-line',
		accentVar: '--contact-element-feu',
	},
	{
		id: 'feature',
		value: 'feature',
		label: 'Suggestions de fonctionnalités',
		element: "L'Eau",
		blurb: 'Fluide, évolution',
		iconClass: 'ri-drop-fill',
		accentVar: '--contact-element-eau',
	},
	{
		id: 'partnership',
		value: 'partnership',
		label: 'Partenariats / Autre',
		element: "L'Air",
		blurb: 'Éthéré, connexions',
		iconClass: 'ri-atom-line',
		accentVar: '--contact-element-air',
	},
]

export default function ContactPage() {
	const backHref = '/'
	const { user, loading } = useAuth()
	const reduceMotion = useReduceMotionPref()
	const formRef = useRef(null)

	const [sent, setSent] = useState(false)
	const [busy, setBusy] = useState(false)
	const [vanishing, setVanishing] = useState(false)
	const [subject, setSubject] = useState('support')

	const login42 = user && !loading ? getLogin42(user) : null
	const coalSlug = user && !loading ? coalitionToSlug(user?.coalition ?? user?.coalition_name) : 'feu'
	const hasCoalitionBadge = Boolean(user && !loading && (user.coalition ?? user.coalition_name))

	const finishSend = useCallback(() => {
		setBusy(false)
		setVanishing(false)
		setSent(true)
	}, [])

	const handleSubmit = (e) => {
		e.preventDefault()
		if (busy || vanishing) return
		setBusy(true)
		if (reduceMotion) {
			finishSend()
			return
		}
		setVanishing(true)
	}

	const handleVanishEnd = (e) => {
		if (e.animationName !== 'contact-dematerialize' || !vanishing) return
		finishSend()
	}

	const handleNewMessage = () => {
		setSent(false)
		setSubject('support')
		requestAnimationFrame(() => {
			const form = formRef.current
			if (!form) return
			form.reset()
			const nameInput = form.elements.namedItem('name')
			const again = getLogin42(user)
			if (nameInput && again) {
				nameInput.value = again
			}
		})
	}

	return (
		<div className="contact-page page-shell contact-page--council">
			<div className="contact-page__elemental-bg" aria-hidden="true">
				<span className="contact-page__orb contact-page__orb--terre" />
				<span className="contact-page__orb contact-page__orb--feu" />
				<span className="contact-page__orb contact-page__orb--eau" />
				<span className="contact-page__orb contact-page__orb--air" />
				<span className="contact-page__orb contact-page__orb--core" />
			</div>

			<header className="contact-page-header">
				<div className="contact-page-header__back-row">
					<Link to={backHref} className="contact-back">
						<i className="ri-arrow-left-line" aria-hidden="true" />
						Retour
					</Link>
				</div>
				<div className="contact-page-header__center">
					<p className="contact-kicker">Le Conseil des Éléments</p>
					<h1 className="page-title contact-page-title">Transmettre aux maîtres de l&apos;Arène</h1>
					<p className="contact-lead">
						Adresse-toi au conseil : bug, signalement, idée ou partenariat — chaque filière élémentaire route ta
						requête. Cette page reste une{' '}
						<strong className="contact-lead-strong">démo front</strong> (aucun envoi serveur pour l&apos;instant).
					</p>
				</div>
			</header>

			<div className="contact-dash">
				<aside className="contact-dash__aside" aria-label="Ressources et informations">
					<section className="contact-aside-card surface-card">
						<h2 className="contact-aside-card__title">
							<i className="ri-timer-flash-line" aria-hidden="true" />
							Réactivité du conseil
						</h2>
						<p className="contact-stat-metric">
							<span className="contact-stat-metric__value">~42</span>
							<span className="contact-stat-metric__unit">min</span>
						</p>
						<p className="contact-stat-caption">Temps de réponse moyen visé (indicatif projet étudiant).</p>
					</section>

					<section className="contact-aside-card surface-card">
						<h2 className="contact-aside-card__title">
							<i className="ri-book-2-line" aria-hidden="true" />
							Le Grimoire des Stratégies
						</h2>
						<p className="contact-aside-card__text">
							Contexte projet, équipe et vision — un bon premier rituel avant d&apos;ouvrir un fil au conseil.
						</p>
						<Link to="/about" className="contact-aside-link">
							Consulter le grimoire
							<i className="ri-arrow-right-up-line" aria-hidden="true" />
						</Link>
					</section>

					<section className="contact-aside-card surface-card contact-aside-card--social">
						<h2 className="contact-aside-card__title">Réseaux du projet</h2>
						<div className="contact-social-row">
							<a
								className="contact-social-btn"
								href={GITHUB_PROJECT}
								target="_blank"
								rel="noreferrer"
								aria-label="Dépôt GitHub"
							>
								<i className="ri-github-fill" aria-hidden="true" />
								<span>GitHub</span>
							</a>
							<a
								className="contact-social-btn contact-social-btn--discord"
								href={DISCORD_42}
								target="_blank"
								rel="noreferrer"
								aria-label="Communauté Discord 42"
							>
								<i className="ri-discord-fill" aria-hidden="true" />
								<span>Discord 42</span>
							</a>
						</div>
					</section>
				</aside>

				<div className="contact-dash__form-column">
					<form ref={formRef} className="contact-form-glass" onSubmit={handleSubmit}>
						{sent ? (
							<div className="contact-success" role="status">
								<i className="ri-mail-send-line contact-success-icon" aria-hidden="true" />
								<h2 className="contact-success-title">Message transmis au conseil</h2>
								<p className="contact-success-text">
									En production, ce formulaire serait relié au backend. Ici, l&apos;effet et la mise en page
									valident l&apos;expérience seulement.
								</p>
								<button type="button" className="contact-btn contact-btn--ghost" onClick={handleNewMessage}>
									Nouveau message
								</button>
							</div>
						) : (
							<div
								className={`contact-form-inner${vanishing ? ' contact-form-inner--vanish' : ''}`}
								onAnimationEnd={handleVanishEnd}
							>
								<fieldset className="contact-subject-fieldset">
									<legend className="contact-subject-legend">Sujet du conseil</legend>
									<div className="contact-subject-grid" role="radiogroup" aria-label="Choisir le sujet">
										{SUBJECT_OPTIONS.map((opt) => (
											<label
												key={opt.id}
												className={`contact-subject-tile${subject === opt.value ? ' is-selected' : ''}`}
												style={{ '--tile-accent': `var(${opt.accentVar})` }}
											>
												<input
													type="radio"
													name="subject"
													value={opt.value}
													checked={subject === opt.value}
													onChange={() => setSubject(opt.value)}
												/>
												<span className="contact-subject-tile__icon" aria-hidden="true">
													<i className={opt.iconClass} />
												</span>
												<span className="contact-subject-tile__label">{opt.label}</span>
												<span className="contact-subject-tile__meta">
													{opt.element} — {opt.blurb}
												</span>
											</label>
										))}
									</div>
								</fieldset>

								<div className="contact-field contact-field--name-row">
									<span className="contact-field-label">Identité (login 42)</span>
									<div className="contact-name-row">
										<div className="contact-name-input-wrap">
											<input
												key={user?.id ?? user?.user_id ?? 'guest'}
												name="name"
												type="text"
												autoComplete="username"
												required
												placeholder="login_42"
												defaultValue={login42 ?? ''}
												className={login42 ? 'is-prefilled' : ''}
												aria-describedby={hasCoalitionBadge ? 'contact-coalition-hint' : undefined}
											/>
										</div>
										{hasCoalitionBadge && (
											<div
												className="contact-coalition-sig"
												id="contact-coalition-hint"
												title={coalitionSlugToLabel(coalSlug)}
											>
												<span className="contact-coalition-sig__icon" aria-hidden="true">
													<ProfileCoalitionIcon slug={coalSlug} />
												</span>
												<span className="contact-coalition-sig__text">{coalitionSlugToLabel(coalSlug)}</span>
											</div>
										)}
									</div>
								</div>

								<label className="contact-field">
									<span className="contact-field-label">Courriel</span>
									<input name="email" type="email" autoComplete="email" required placeholder="toi@student.42.fr" />
								</label>
								<label className="contact-field">
									<span className="contact-field-label">Message</span>
									<textarea name="message" rows={4} required placeholder="Ton message au conseil…" />
								</label>

								<button type="submit" className="contact-btn contact-btn--primary contact-btn--spark" disabled={busy}>
									<span className="contact-btn__label">{busy ? 'Transmission…' : 'Envoyer au conseil'}</span>
									<span className="contact-btn__particles" aria-hidden="true" />
								</button>
							</div>
						)}
					</form>
				</div>
			</div>
		</div>
	)
}
