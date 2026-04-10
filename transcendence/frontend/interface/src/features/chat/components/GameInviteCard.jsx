import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

export default function GameInviteCard({ msg, isOwn }) {
	const navigate = useNavigate()
	const data = useMemo(() => {
		try { return JSON.parse(msg.content) } catch { return {} }
	}, [msg.content])

	const handleAccept = () => {
		navigate('/dashboard')
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
						{data.time_control || '10 min'} — {data.competitive ? 'Classée' : 'Amicale'}
					</span>
				</div>
				{!isOwn && (
					<button className="chat-invite-accept" type="button" onClick={handleAccept}>
						Accepter
					</button>
				)}
			</div>
		</div>
	)
}
