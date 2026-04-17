import { SITE_LOGO_URL } from '../../../constants/brandAssets.js'

/**
 * Logo Transcendance (PNG) — même ressource que le favicon.
 * @param {string} [className]
 * @param {string} [alt] — par défaut nom du produit (accessibilité).
 */
export default function SiteBrandLogo({
	className,
	alt = 'Transcendance',
	decoding = 'async',
	draggable = false,
	onClick,
}) {
	const wrapClass = `site-brand-logo-wrap ${className ?? ''}`.trim()
	const img = (
		<img
			src={SITE_LOGO_URL}
			className="site-brand-logo-img"
			alt={alt}
			decoding={decoding}
			draggable={draggable}
		/>
	)
	if (onClick) {
		return (
			<button type="button" className={wrapClass} onClick={onClick} aria-label={alt || 'Transcendance'}>
				{img}
			</button>
		)
	}
	return <span className={wrapClass}>{img}</span>
}
