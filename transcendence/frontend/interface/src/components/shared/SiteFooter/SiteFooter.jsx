import { Link } from 'react-router-dom'
import { LEGAL_COOKIES_URL, LEGAL_PRIVACY_URL, LEGAL_TOS_URL } from '../../../config/legalPages.js'
import './SiteFooter.scss'

/**
 * Pied de page global : liens discrets sur le fond (pas de bandeau opaque).
 */
export default function SiteFooter({ sidewallOffset = false }) {
	return (
		<footer
			className={`site-footer${sidewallOffset ? ' site-footer--sidewall' : ''}`}
			role="contentinfo"
		>
			<div className="site-footer__inner">
			<nav className="site-footer__nav" aria-label="Liens pied de page">
				<Link className="site-footer__link site-footer__link--app" to="/contact">
					Contact
				</Link>
				<span className="site-footer__sep" aria-hidden="true">
					·
				</span>
				<Link className="site-footer__link site-footer__link--app" to="/about">
					À propos
				</Link>
				<span className="site-footer__sep" aria-hidden="true">
					·
				</span>
				<a className="site-footer__link" href={LEGAL_PRIVACY_URL} target="_blank" rel="noreferrer">
					Confidentialité
				</a>
				<span className="site-footer__sep" aria-hidden="true">
					·
				</span>
				<a className="site-footer__link" href={LEGAL_TOS_URL} target="_blank" rel="noreferrer">
					CGU
				</a>
				<span className="site-footer__sep" aria-hidden="true">
					·
				</span>
				<a className="site-footer__link" href={LEGAL_COOKIES_URL} target="_blank" rel="noreferrer">
					Cookies
				</a>
			</nav>
				<a
					className="site-footer__github"
					href="https://github.com/KuroeProg/Meditation_Transcendentale"
					target="_blank"
					rel="noreferrer"
					aria-label="Dépôt GitHub du projet"
				>
					<i className="ri-github-fill" aria-hidden="true" />
				</a>
			</div>
		</footer>
	)
}
