import { useEffect, useState } from 'react'
import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'
import { coalitionSlugToLabel, coalitionToSlug } from '../../theme/services/coalitionTheme.js'
import { fetchConversations } from '../services/chatApi.js'

export default function ConversationList({ onSelect, activeId }) {
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

	if (loading) return <div className="chat-loading" data-testid="chat-conversations-loading">Chargement...</div>
	if (!conversations.length) return <div className="chat-empty" data-testid="chat-conversations-empty">Aucune conversation</div>

	return (
		<ul className="chat-conv-list" data-testid="chat-conversation-list">
			{conversations.map((c) => {
				const other = c.participants?.[0]
				const isActive = c.id === activeId
				const coalSlug = coalitionToSlug(other?.coalition)
				return (
					<li
						key={c.id}
						className={`chat-conv-item ${isActive ? 'chat-conv-item--active' : ''}`}
						data-testid={`chat-conversation-item-${c.id}`}
						onClick={() => onSelect(c)}
					>
						<img className="chat-conv-avatar" src={other?.avatar || ''} alt="" />
						<div className="chat-conv-info">
							<div className="chat-conv-top">
								<div className="chat-conv-name-line">
									<span className="chat-conv-name">{other?.username || 'Inconnu'}</span>
									<span className="chat-coalition-mini" title={coalitionSlugToLabel(coalSlug)}>
										<ProfileCoalitionIcon slug={coalSlug} />
									</span>
								</div>
								{c.unread_count > 0 && <span className="chat-conv-badge">{c.unread_count}</span>}
							</div>
							<p className="chat-conv-last">
								{c.last_message?.message_type === 'game_invite'
									? 'Invitation de partie'
									: c.last_message?.content?.slice(0, 40) || 'Pas de message'}
							</p>
						</div>
						<span className={`chat-conv-dot ${other?.is_online ? 'online' : ''}`} />
					</li>
				)
			})}
		</ul>
	)
}
