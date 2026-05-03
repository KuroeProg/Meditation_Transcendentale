import { useState, useMemo, useCallback, useEffect } from 'react'
import { useAuth } from '../../auth/index.js'
import ConversationList from './ConversationList.jsx'
import MessageThread from './MessageThread.jsx'
import ContactSearch from './ContactSearch.jsx'
import '../styles/Chat.scss'

export default function ChatDrawer({ isOpen, onClose, initialConversation = null, onConsumedInitial }) {
	const { user } = useAuth()
	const [view, setView] = useState('conversations')
	const [activeConversation, setActiveConversation] = useState(null)

	const userId = useMemo(() => user?.id ?? user?.user_id ?? null, [user])
	const username = user?.username || ''

	const handleSelectConversation = useCallback((conv) => {
		setActiveConversation(conv)
		setView('thread')
	}, [])

	const handleBack = useCallback(() => {
		if (view === 'thread') {
			setView('conversations')
			setActiveConversation(null)
		} else {
			setView('conversations')
		}
	}, [view])

	const handleOpenConversation = useCallback((conv) => {
		setActiveConversation(conv)
		setView('thread')
	}, [])

	useEffect(() => {
		if (!isOpen || !initialConversation) return
		setActiveConversation(initialConversation)
		setView('thread')
		onConsumedInitial?.()
	}, [isOpen, initialConversation, onConsumedInitial])

	if (!isOpen) return null

	return (
		<div className="chat-drawer-overlay" onClick={onClose} data-testid="chat-drawer-overlay">
			<aside className="chat-drawer" onClick={(e) => e.stopPropagation()} data-testid="chat-drawer">
				<header className="chat-drawer-header">
					{view !== 'conversations' && (
						<button className="chat-drawer-back" type="button" onClick={handleBack}>
							<i className="ri-arrow-left-line" />
						</button>
					)}
					<h2 className="chat-drawer-title">
						{view === 'conversations' && 'Messages'}
						{view === 'thread' && (activeConversation?.participants?.[0]?.username || 'Chat')}
						{view === 'contacts' && 'Contacts'}
					</h2>
					<div className="chat-drawer-actions">
						{view === 'conversations' && (
							<button
								className="chat-drawer-action-btn"
								type="button"
								data-testid="chat-drawer-contacts"
								onClick={() => setView('contacts')}
								title="Contacts"
							>
								<i className="ri-contacts-book-line" />
							</button>
						)}
						<button className="chat-drawer-action-btn" type="button" onClick={onClose} title="Fermer">
							<i className="ri-close-line" />
						</button>
					</div>
				</header>

				<div className="chat-drawer-body" data-testid="chat-drawer-body">
					{view === 'conversations' && (
						<ConversationList
							onSelect={handleSelectConversation}
							activeId={activeConversation?.id}
						/>
					)}

					{view === 'thread' && (
						<MessageThread
							conversation={activeConversation}
							userId={userId}
							username={username}
						/>
					)}

					{view === 'contacts' && (
						<ContactSearch
							onOpenConversation={handleOpenConversation}
						/>
					)}
				</div>
			</aside>
		</div>
	)
}
