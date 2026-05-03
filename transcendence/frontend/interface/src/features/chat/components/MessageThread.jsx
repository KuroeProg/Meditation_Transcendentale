import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMessages } from '../services/chatApi.js'
import { useFriendInvite } from '../context/FriendInviteContext.jsx'
import { useChatSocket } from '../hooks/useChatSocket.js'
import { useAuth } from '../../auth/index.js'
import GameInviteCard from './GameInviteCard.jsx'
import UserProfileLink from '../../../components/common/UserProfileLink.jsx'

function MessageBubble({ msg, isOwn, currentUserId }) {
	if (msg.message_type === 'game_invite') {
		return <GameInviteCard msg={msg} isOwn={isOwn} />
	}

	if (msg.message_type === 'system') {
		return <div className="chat-msg-system">{msg.content}</div>
	}

	const isRead = msg.read_by?.length > 1

	return (
		<div className={`chat-msg ${isOwn ? 'chat-msg--own' : 'chat-msg--other'}`}>
			{!isOwn && <img className="chat-msg-avatar" src={msg.sender?.avatar || undefined} alt="" />}
			<div className="chat-msg-body">
				{!isOwn && (
					<UserProfileLink
						userId={msg.sender?.id}
						username={msg.sender?.username}
						className="chat-msg-sender"
					/>
				)}
				<div className="chat-msg-bubble">
					<p className="chat-msg-text">{msg.content}</p>
				</div>
				<span className="chat-msg-meta">
					{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
					{isOwn && isRead && <i className="ri-check-double-line chat-msg-read" />}
				</span>
			</div>
		</div>
	)
}

export default function MessageThread({ conversation, userId, username }) {
	const { openFriendInvite } = useFriendInvite()
	const { resolveUserOnline, hasOutgoingPendingInvite } = useAuth()
	const scrollRef = useRef(null)
	const inputRef = useRef(null)
	const [draft, setDraft] = useState('')
	const [initialMessages, setInitialMessages] = useState([])
	const typingTimerRef = useRef(null)

	const {
		isConnected,
		messages: wsMessages,
		setMessages: setWsMessages,
		activeTyping,
		sendMessage,
		sendTyping,
		markAsRead,
	} = useChatSocket(conversation?.id, userId)

	useEffect(() => {
		if (!conversation?.id) return
		let cancelled = false
		fetchMessages(conversation.id)
			.then((data) => {
				if (!cancelled) {
					setInitialMessages(data.messages || [])
					setWsMessages([])
				}
			})
			.catch(() => {})
		return () => { cancelled = true }
	}, [conversation?.id, setWsMessages])

	const allMessages = [...initialMessages, ...wsMessages.filter(
		(wm) => !initialMessages.some((im) => im.id === wm.id)
	)]

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight
		}
	}, [allMessages.length])

	useEffect(() => {
		if (!conversation?.id || !userId) return
		const unreadIds = allMessages
			.filter((m) => m.sender?.id !== userId && !(m.read_by || []).includes(userId))
			.map((m) => m.id)
		if (unreadIds.length > 0) markAsRead(unreadIds)
	}, [allMessages, userId, conversation?.id, markAsRead])

	const handleSend = () => {
		const text = draft.trim()
		if (!text) return
		sendMessage(text)
		setDraft('')
		sendTyping(false, username)
	}

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	const handleInput = (e) => {
		setDraft(e.target.value)
		if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
		sendTyping(true, username)
		typingTimerRef.current = setTimeout(() => sendTyping(false, username), 2000)
	}

	const handleGameInvite = useCallback(() => {
		const other = conversation?.participants?.[0]
		if (!other?.id || !conversation?.id) return
		if (hasOutgoingPendingInvite) return
		openFriendInvite({
			friendUserId: other.id,
			conversationId: conversation.id,
			friendLabel: other.username,
			activeGameId: other.active_game_id ?? other.activeGameId ?? null,
		})
	}, [conversation, openFriendInvite, hasOutgoingPendingInvite])

	if (!conversation) return <div className="chat-empty" data-testid="chat-thread-empty">Selectionne une conversation</div>

	const other = conversation.participants?.[0]
	const otherOnline = resolveUserOnline(other)

	return (
		<div className="chat-thread" data-testid="chat-thread">
			<div className="chat-thread-header">
				<img className="chat-thread-avatar" src={other?.avatar || undefined} alt="" />
				<div className="chat-thread-info">
					<UserProfileLink
						userId={other?.id}
						username={other?.username || 'Inconnu'}
						className="chat-thread-name"
					/>
					<span className={`chat-thread-status ${otherOnline ? 'online' : ''}`}>
						{otherOnline ? 'En ligne' : 'Hors ligne'}
					</span>
				</div>
				<button
					className="chat-thread-invite"
					type="button"
					data-testid="chat-thread-invite-button"
					onClick={handleGameInvite}
					title={hasOutgoingPendingInvite ? 'Invitation deja en attente' : 'Inviter a jouer'}
					disabled={hasOutgoingPendingInvite}
				>
					<i className="ri-sword-line" />
				</button>
			</div>

			<div className="chat-thread-messages" ref={scrollRef} data-testid="chat-thread-messages">
				{allMessages.map((msg) => (
					<MessageBubble key={msg.id} msg={msg} isOwn={msg.sender?.id === userId} currentUserId={userId} />
				))}
				{activeTyping.length > 0 && (
					<div className="chat-typing-indicator">
						{activeTyping.join(', ')} tape...
					</div>
				)}
			</div>

			<div className="chat-thread-input">
				<input
					ref={inputRef}
					className="chat-input"
					data-testid="chat-message-input"
					type="text"
					value={draft}
					onChange={handleInput}
					onKeyDown={handleKeyDown}
					placeholder="Ecrire un message..."
				/>
				<button className="chat-send-btn" type="button" onClick={handleSend} disabled={!draft.trim()} data-testid="chat-send-button">
					<i className="ri-send-plane-2-fill" />
				</button>
			</div>
		</div>
	)
}
