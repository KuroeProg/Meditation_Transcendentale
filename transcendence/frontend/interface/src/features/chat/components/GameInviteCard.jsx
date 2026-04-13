import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cancelGameInviteHttp, respondGameInviteHttp } from '../services/chatApi.js'
import { useAuth } from '../../auth/index.js'

export default function GameInviteCard({ msg, isOwn }) {
	const navigate = useNavigate()
	const { resolveInviteState } = useAuth()
	const [busyAction, setBusyAction] = useState(null)
	const [localStatus, setLocalStatus] = useState(null)
	const data = useMemo(() => {
		try { return JSON.parse(msg.content) } catch { return {} }
	}, [msg.content])
	const inviteId = Number(data.invite_id)
	const liveInvite = resolveInviteState(inviteId)
	const effectiveData = liveInvite || data
	const inviteStatus = localStatus || effectiveData.invite_status || effectiveData.status || 'pending'
	const canAct = Number.isFinite(inviteId) && inviteStatus === 'pending'

	const runAction = async (action) => {
		if (!canAct || busyAction) return
		setBusyAction(action)
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
		} catch {
			// keep current UI state on transient API failures
		} finally {
			setBusyAction(null)
		}
	}

	const handleJoin = () => {
		const gameId = effectiveData.game_id
		if (gameId) navigate(`/game/${gameId}`)
	}

	return (
		<div className={`chat-msg ${isOwn ? 'chat-msg--own' : 'chat-msg--other'}`}>
			<div className="chat-invite-card">
				<div className="chat-invite-icon"><i className="ri-sword-line" /></div>
				<div className="chat-invite-info">
					<span className="chat-invite-title">
						{isOwn ? 'Invitation envoyee' : 'Invitation de partie'}
					</span>
					<span className="chat-invite-detail">
						{effectiveData.time_control || '10 min'} — {effectiveData.competitive ? 'Classée' : 'Amicale'}
					</span>
				</div>
				{canAct && !isOwn && (
					<div className="chat-invite-actions">
						<button className="chat-invite-accept" type="button" onClick={() => runAction('accept')} disabled={Boolean(busyAction)}>
							{busyAction === 'accept' ? '...' : 'Accepter'}
						</button>
						<button className="chat-invite-accept" type="button" onClick={() => runAction('decline')} disabled={Boolean(busyAction)}>
							Refuser
						</button>
					</div>
				)}
				{canAct && isOwn && (
					<button className="chat-invite-accept" type="button" onClick={() => runAction('cancel')} disabled={Boolean(busyAction)}>
						{busyAction === 'cancel' ? '...' : 'Annuler'}
					</button>
				)}
				{inviteStatus === 'accepted' && effectiveData.game_id && (
					<button className="chat-invite-accept" type="button" onClick={handleJoin}>
						Rejoindre
					</button>
				)}
				{inviteStatus !== 'pending' && !(inviteStatus === 'accepted' && effectiveData.game_id) && (
					<span className="chat-invite-detail">
						{inviteStatus === 'declined' ? 'Invitation refusee' : inviteStatus === 'cancelled' ? 'Invitation annulee' : inviteStatus === 'expired' ? 'Invitation expiree' : 'Invitation acceptee'}
					</span>
				)}
			</div>
		</div>
	)
}
