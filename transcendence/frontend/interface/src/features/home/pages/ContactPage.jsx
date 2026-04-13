import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/ContactPage.css'

export default function ContactPage() {
	const backHref = '/'
	const [sent, setSent] = useState(false)
	const [busy, setBusy] = useState(false)

	const handleSubmit = (e) => {
		e.preventDefault()
		setBusy(true)
		// Front uniquement : simule l’envoi
		window.setTimeout(() => {
			setBusy(false)
			setSent(true)
		}, 650)
	}

	return (
		<div className="contact-page page-shell">
			<div className="contact-page-header">
				<Link to={backHref} className="contact-back">
					<i className="ri-arrow-left-line" aria-hidden="true" />
					Retour
				</Link>
				<h1 className="page-title">Contact</h1>
				<p className="contact-lead">
					Une question sur Transcendance ? Écris-nous — cette page est une démo front (aucun envoi serveur).
				</p>
			</div>

			<div className="contact-layout">
				<form className="contact-card surface-card" onSubmit={handleSubmit}>
					{sent ? (
						<div className="contact-success" role="status">
							<i className="ri-mail-send-line contact-success-icon" aria-hidden="true" />
							<h2 className="contact-success-title">Message prêt à partir</h2>
							<p className="contact-success-text">
								En production, ce formulaire serait relié au backend. Ici, c’est uniquement pour la mise en page.
							</p>
							<button type="button" className="contact-btn contact-btn--ghost" onClick={() => setSent(false)}>
								Nouveau message
							</button>
						</div>
					) : (
						<>
							<label className="contact-field">
								<span>Nom</span>
								<input name="name" type="text" autoComplete="name" required placeholder="Ton nom" />
							</label>
							<label className="contact-field">
								<span>Email</span>
								<input name="email" type="email" autoComplete="email" required placeholder="toi@exemple.fr" />
							</label>
							<label className="contact-field">
								<span>Message</span>
								<textarea name="message" rows={5} required placeholder="Ton message…" />
							</label>
							<button type="submit" className="contact-btn contact-btn--primary" disabled={busy}>
								{busy ? 'Envoi…' : 'Envoyer'}
							</button>
						</>
					)}
				</form>
			</div>
		</div>
	)
}
