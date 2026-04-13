import { useEffect, useState } from 'react'
import { fetchConversations } from '../services/chatApi.js'
import { useAuth } from '../../auth/index.js'

export default function ConversationList({ onSelect, activeId }) {
	const { resolveUserOnline } = useAuth()
	const [conversations, setConversations] = useState([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let cancelled = false
		setLoading(true)
		fetchConversations()
			.then((data) => { if (!cancelled) setConversations(data.conversations || []) })
			.catch(() => {})
			.finally(() => { if (!cancelled) setLoading(false) })
		return () => { cancelled = true }
	}, [])

	const refresh = () => {
		fetchConversations()
			.then((data) => setConversations(data.conversations || []))
			.catch(() => {})
	}

	useEffect(() => {
		const interval = setInterval(refresh, 8000)
		return () => clearInterval(interval)
	}, [])

	if (loading) return <div className="chat-loading">Chargement...</div>
	if (!conversations.length) return <div className="chat-empty">Aucune conversation</div>

	return (
		<ul className="chat-conv-list">
			{conversations.map((c) => {
				const other = c.participants?.[0]
				const otherOnline = resolveUserOnline(other)
				const isActive = c.id === activeId
				return (
					<li
						key={c.id}
						className={`chat-conv-item ${isActive ? 'chat-conv-item--active' : ''}`}
						onClick={() => onSelect(c)}
					>
						<img className="chat-conv-avatar" src={other?.avatar || ''} alt="" />
						<div className="chat-conv-info">
							<div className="chat-conv-top">
								<span className="chat-conv-name">{other?.username || 'Inconnu'}</span>
								{c.unread_count > 0 && <span className="chat-conv-badge">{c.unread_count}</span>}
							</div>
							<p className="chat-conv-last">
								{c.last_message?.message_type === 'game_invite'
									? 'Invitation de partie'
									: c.last_message?.content?.slice(0, 40) || 'Pas de message'}
							</p>
						</div>
						<span className={`chat-conv-dot ${otherOnline ? 'online' : ''}`} />
					</li>
				)
			})}
		</ul>
	)
}
