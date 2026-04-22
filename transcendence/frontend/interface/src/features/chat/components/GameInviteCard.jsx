import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cancelGameInviteHttp, respondGameInviteHttp } from '../services/chatApi.js'
import { useAuth } from '../../auth/index.js'

/**
 * Construit un libellé de cadence homogène à partir des champs disponibles.
 *
 * Priorité (du plus précis au moins précis) :
 *   1. `time_control`             — libellé canonique fourni par le serveur (ex. "3+2")
 *   2. `time_control_label`       — alias parfois présent côté `GameInvite.to_dict()`
 *   3. Calcul depuis `time_seconds` + `increment_seconds`
 *   4. Fallback si aucun champ disponible
 */
function buildTimeLabel(data) {
	if (data.time_control && data.time_control !== 'N/A') return data.time_control
	if (data.time_control_label)                          return data.time_control_label

	const seconds   = Number(data.time_seconds   ?? data.time_control_seconds   ?? 0)
	const increment = Number(data.increment      ?? data.increment_seconds      ?? 0)

	if (!seconds) return null

	const mins = Math.floor(seconds / 60)
	const secs = seconds % 60

	const base = secs > 0 ? `${mins}m${secs}s` : `${mins} min`
	return increment > 0 ? `${base} +${increment}` : base
}

export default function GameInviteCard({ msg, isOwn }) {
	const navigate = useNavigate()
	const { resolveInviteState } = useAuth()
	const [busyAction, setBusyAction] = useState(null)
	const [localStatus, setLocalStatus] = useState(null)
	const [errorMsg, setErrorMsg] = useState(null)

	/* Données figées du message (source de vérité pour l'affichage) */
	const msgData = useMemo(() => {
		try { return JSON.parse(msg.content) } catch { return {} }
	}, [msg.content])

	const inviteId = Number(msgData.invite_id)

	/*
	 * liveInvite : état temps-réel depuis le canal de notifications.
	 * On l'utilise UNIQUEMENT pour le statut (pending / accepted / expired…),
	 * PAS pour écraser les champs d'affichage (cadence, format) qui sont déjà
	 * fiables dans le snapshot du message.
	 */
	const liveInvite = resolveInviteState(inviteId)
	const inviteStatus =
		localStatus ||
		liveInvite?.invite_status ||
		liveInvite?.status ||
		msgData.invite_status ||
		msgData.status ||
		'pending'

	/* Champ d'affichage : cadence */
	const timeLabel = buildTimeLabel(msgData) ?? '—'
	/* game_id disponible une fois acceptée */
	const gameId = msgData.game_id ?? liveInvite?.game_id

	const canAct = Number.isFinite(inviteId) && inviteStatus === 'pending'

	const runAction = async (action) => {
		if (!canAct || busyAction) return
		setBusyAction(action)
		setErrorMsg(null)
		try {
			if (action === 'cancel') {
				const res = await cancelGameInviteHttp(inviteId, 'manual_cancel')
				setLocalStatus(res?.invite?.status || 'cancelled')
				return
			}

			const res = await respondGameInviteHttp(inviteId, action)
			const nextStatus = res?.invite?.status || (action === 'accept' ? 'accepted' : 'declined')
			setLocalStatus(nextStatus)
			if (nextStatus === 'accepted' && res?.invite?.game_id) {
				navigate(`/game/${res.invite.game_id}`)
			}
		} catch (err) {
			const msg = err?.message || 'Une erreur est survenue'
			setErrorMsg(msg)
		} finally {
			setBusyAction(null)
		}
	}

	const handleJoin = () => {
		if (gameId) navigate(`/game/${gameId}`)
	}

	const statusLabel = {
		declined:  'Invitation refusée',
		cancelled: 'Invitation annulée',
		expired:   'Invitation expirée',
		accepted:  'Invitation acceptée',
	}[inviteStatus]

	return (
		<div className={`chat-msg ${isOwn ? 'chat-msg--own' : 'chat-msg--other'}`}>
			<div className="chat-invite-card" data-testid="chat-game-invite-card">
				<div className="chat-invite-icon" aria-hidden="true">
					<i className="ri-sword-line" />
				</div>

				<div className="chat-invite-info">
					<span className="chat-invite-title">
						{isOwn ? 'Invitation envoyée' : 'Invitation de partie'}
					</span>
					<span className="chat-invite-detail">
						<strong>{timeLabel}</strong>
						{' — '}
						{msgData.competitive ? 'Classée' : 'Amicale'}
					</span>
				</div>

				{/* Actions pour le destinataire */}
				{canAct && !isOwn && (
					<div className="chat-invite-actions">
						<button
							className="chat-invite-accept"
							type="button"
							data-testid="chat-invite-accept"
							onClick={() => runAction('accept')}
							disabled={Boolean(busyAction)}
							aria-busy={busyAction === 'accept'}
						>
							{busyAction === 'accept' ? (
								<><i className="ri-loader-4-line" aria-hidden="true" /> Chargement…</>
							) : 'Accepter'}
						</button>
						<button
							className="chat-invite-accept"
							type="button"
							onClick={() => runAction('decline')}
							disabled={Boolean(busyAction)}
						>
							Refuser
						</button>
					</div>
				)}

				{/* Annulation pour l'expéditeur */}
				{canAct && isOwn && (
					<button
						className="chat-invite-accept"
						type="button"
						onClick={() => runAction('cancel')}
						disabled={Boolean(busyAction)}
						aria-busy={busyAction === 'cancel'}
					>
						{busyAction === 'cancel' ? (
							<><i className="ri-loader-4-line" aria-hidden="true" /> Chargement…</>
						) : 'Annuler'}
					</button>
				)}

				{/* Bouton rejoindre si partie prête */}
				{inviteStatus === 'accepted' && gameId && (
					<button className="chat-invite-accept" type="button" onClick={handleJoin}>
						<i className="ri-play-line" aria-hidden="true" /> Rejoindre
					</button>
				)}

				{/* Statut final */}
				{inviteStatus !== 'pending' && !(inviteStatus === 'accepted' && gameId) && statusLabel && (
					<span className="chat-invite-detail">{statusLabel}</span>
				)}

				{/* Message d'erreur visible */}
				{errorMsg && (
					<span className="chat-invite-error" role="alert">
						<i className="ri-error-warning-line" aria-hidden="true" /> {errorMsg}
					</span>
				)}
			</div>
		</div>
	)
}
