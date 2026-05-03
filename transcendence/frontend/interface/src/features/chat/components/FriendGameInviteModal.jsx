import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TimeControlSection, defaultSelectedControl } from '../../chess/components/TimeControlPicker.jsx'
import { TIME_CONTROLS } from '../../chess/constants/timeControls.js'
import { useAuth } from '../../auth/index.js'
import '../../profile/styles/Dashboard.scss'
import '../styles/FriendGameInviteModal.scss'
import { createConversation, sendGameInviteHttp } from '../services/chatApi.js'

function buildInviteBody(selectedTC, competitive) {
	return {
		time_control: selectedTC.label,
		competitive,
		time_seconds: selectedTC.time,
		increment: selectedTC.increment ?? 0,
	}
}

export default function FriendGameInviteModal({
	friendUserId,
	conversationId: existingConversationId,
	friendLabel,
	activeGameId = null,
	onClose,
	onSent,
}) {
	const navigate = useNavigate()
	const { registerOutgoingPendingInvite } = useAuth()
	const [selectedTC, setSelectedTC] = useState(defaultSelectedControl)
	const [isCompetitive, setIsCompetitive] = useState(false)
	const [showCorrespondence, setShowCorrespondence] = useState(false)
	const [sending, setSending] = useState(false)
	const [error, setError] = useState(null)

	const handleWatch = useCallback(() => {
		if (!activeGameId) return
		navigate(`/game/${encodeURIComponent(String(activeGameId))}`)
		onClose()
	}, [activeGameId, navigate, onClose])

	const handleSubmit = useCallback(async () => {
		if (activeGameId) {
			return
		}
		if (!friendUserId) return
		setError(null)
		setSending(true)
		try {
			let convId = existingConversationId
			if (convId == null) {
				const conv = await createConversation(friendUserId, 'private', null)
				convId = conv?.id
			}
			if (convId == null) throw new Error('Conversation introuvable')
			const result = await sendGameInviteHttp(convId, buildInviteBody(selectedTC, isCompetitive))
			registerOutgoingPendingInvite(result?.invite)
			onSent?.()
			onClose()
		} catch (e) {
			setError(e?.message || 'Envoi impossible')
		} finally {
			setSending(false)
		}
	}, [activeGameId, friendUserId, existingConversationId, selectedTC, isCompetitive, onClose, onSent, registerOutgoingPendingInvite])

	const title = friendLabel ? `Defier ${friendLabel}` : 'Defier un ami'

	return (
		<div className="friend-invite-overlay" role="presentation" onClick={onClose}>
			<div
				className="friend-invite-dialog dashboard-v2"
				data-testid="friend-invite-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="friend-invite-title"
				onClick={(e) => e.stopPropagation()}
			>
				<header className="friend-invite-header">
					<h2 id="friend-invite-title">{title}</h2>
					<button type="button" className="friend-invite-close" onClick={onClose} aria-label="Fermer">
						<i className="ri-close-line" />
					</button>
				</header>

				<p className="friend-invite-hint">Cadence et mode de la partie proposee.</p>

				{activeGameId && (
					<div
						className="friend-invite-in-game"
						role="status"
						data-testid="friend-invite-target-in-game"
					>
						<p>
							<strong>{friendLabel || 'Ce joueur'}</strong> est deja en partie. Tu peux
							{' '}regarder le match ou attendre la fin de la partie pour lancer un defi.
						</p>
						<button
							type="button"
							className="friend-invite-btn friend-invite-btn--primary"
							data-testid="friend-invite-watch"
							onClick={handleWatch}
						>
							<i className="ri-eye-line" aria-hidden="true" /> Regarder la partie
						</button>
					</div>
				)}

				<div
					className="dash-competitive-toggle"
					style={activeGameId ? { pointerEvents: 'none', opacity: 0.45 } : undefined}
					aria-hidden={activeGameId || undefined}
				>
					<span className={!isCompetitive ? 'active' : ''}>Amicale</span>
					<button
						className={`dash-toggle ${isCompetitive ? 'dash-toggle--on' : ''}`}
						type="button"
						onClick={() => setIsCompetitive(!isCompetitive)}
						aria-label="Basculer partie classée"
					>
						<span className="dash-toggle-thumb" />
					</button>
					<span className={isCompetitive ? 'active' : ''}>Classée</span>
				</div>

				<div
					className="friend-invite-scroll"
					style={activeGameId ? { pointerEvents: 'none', opacity: 0.45 } : undefined}
					aria-hidden={activeGameId || undefined}
				>
					<TimeControlSection category="bullet" controls={TIME_CONTROLS.bullet} selected={selectedTC} onSelect={setSelectedTC} />
					<TimeControlSection category="blitz" controls={TIME_CONTROLS.blitz} selected={selectedTC} onSelect={setSelectedTC} />
					<TimeControlSection category="rapid" controls={TIME_CONTROLS.rapid} selected={selectedTC} onSelect={setSelectedTC} />
					{showCorrespondence && (
						<TimeControlSection category="correspondence" controls={TIME_CONTROLS.correspondence} selected={selectedTC} onSelect={setSelectedTC} />
					)}
					<button className="dash-more-tc" type="button" onClick={() => setShowCorrespondence(!showCorrespondence)}>
						{showCorrespondence ? 'Masquer correspondance' : 'Correspondance'}{' '}
						<i className={showCorrespondence ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
					</button>
				</div>

				{error && <p className="friend-invite-error" role="alert">{error}</p>}

				<footer className="friend-invite-footer">
					<button type="button" className="friend-invite-btn friend-invite-btn--ghost" onClick={onClose} disabled={sending}>
						Annuler
					</button>
					<button type="button" className="friend-invite-btn friend-invite-btn--primary" data-testid="friend-invite-send" onClick={handleSubmit} disabled={sending || Boolean(activeGameId)}>
						{sending ? 'Envoi…' : 'Envoyer l’invitation'}
					</button>
				</footer>
			</div>
		</div>
	)
}
