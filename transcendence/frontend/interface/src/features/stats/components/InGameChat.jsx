/**
 * InGameChat — Chat temps réel pendant une partie en ligne.
 *
 * Contrat API :
 *   GET  /api/chat/game-conversation?game_id=<id>   → { id, ... }  (get-or-create)
 *   WS   /ws/chat/<conversation_id>/                → new_message / typing
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { GameMusicPanel } from '../../audio/components/GameAudio.jsx'
import { useChatSocket } from '../../chat/hooks/useChatSocket.js'

const QUICK_REPLIES = ['Bonne chance !', 'Bien joué !', 'Match nul ?', 'Rematch ?']

async function resolveGameConversation(gameId) {
	const res = await fetch(`/api/chat/game-conversation?game_id=${encodeURIComponent(gameId)}`, {
		credentials: 'include',
	})
	if (!res.ok) return null
	const data = await res.json()
	return data.id ?? null
}

async function fetchPreviousMessages(conversationId) {
	const res = await fetch(
		`/api/chat/conversations/${conversationId}/messages/`,
		{ credentials: 'include' }
	)
	if (!res.ok) return []
	const data = await res.json()
	return Array.isArray(data.messages) ? data.messages : []
}

function toTimestamp(dateStr) {
	try {
		const d = new Date(dateStr)
		return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
	} catch {
		return '—'
	}
}

export function InGameChat({
	opponentUsername = 'Adversaire',
	gameId,
	userId,
	/** @type {string} slug coalition thème (feu, eau, terre, air) */
	coalitionSlug = null,
}) {
	const [convId, setConvId] = useState(null)
	const [input, setInput] = useState('')
	const [historyLoaded, setHistoryLoaded] = useState(false)
	const bottomRef = useRef(null)
	const inputRef  = useRef(null)

	// Resolve conversation once game_id is known
	useEffect(() => {
		if (!gameId) return
		resolveGameConversation(gameId)
			.then((id) => { if (id) setConvId(id) })
			.catch(() => {})
	}, [gameId])

	const { isConnected, messages, setMessages, sendMessage: wsSend } = useChatSocket(convId, userId)

	// Load previous messages once WS is open
	useEffect(() => {
		if (!isConnected || !convId || historyLoaded) return
		setHistoryLoaded(true)
		fetchPreviousMessages(convId).then((prev) => {
			if (prev.length) setMessages(prev)
		}).catch(() => {})
	}, [isConnected, convId, historyLoaded, setMessages])

	// Auto-scroll
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	const sendMessage = useCallback(() => {
		const text = input.trim()
		if (!text) return
		wsSend(text)
		setInput('')
		inputRef.current?.focus()
	}, [input, wsSend])

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			sendMessage()
		}
	}

	const sendQuick = useCallback((text) => wsSend(text), [wsSend])

	// Normalise message format (API vs WS shape)
	const normalizedMessages = messages.map((m) => {
		if (m.sender !== undefined) return m // already WS format
		const isMe = m.sender_id === userId || m.sender?.id === userId
		return {
			id: m.id,
			sender: isMe ? 'me' : 'opponent',
			text: m.content ?? m.text ?? '',
			timestamp: toTimestamp(m.created_at ?? m.timestamp),
		}
	})

	const gMod = coalitionSlug ? ` ghv-header--${coalitionSlug}` : ''
	return (
		<div className="igc-root" aria-label={`Chat avec ${opponentUsername}`} data-testid="ingame-chat">
			<header className={`ghv-header igc-ghv-header${gMod}`} data-testid="ingame-chat-ghv-header">
				<div className="ghv-header-inner">
					<div className="ghv-header-lead">
						<h2 className="ghv-title">
							<i className="ri-chat-3-line" aria-hidden="true" />
							{opponentUsername}
						</h2>
						<p className="ghv-header-subtitle igc-header-subline">
							{isConnected
								? 'Connecté en temps réel à la salle de partie.'
								: !gameId
									? 'Chat disponible en partie en ligne.'
									: 'Connexion au chat…'}
						</p>
						{!isConnected && gameId && (
							<span className="igc-mock-badge" data-testid="ingame-chat-status-offline">
								<i className="ri-loader-4-line" aria-hidden="true" /> Connexion…
							</span>
						)}
						{isConnected && (
							<span className="igc-mock-badge igc-mock-badge--live" data-testid="ingame-chat-status-live">
								<i className="ri-live-line" aria-hidden="true" /> Live
							</span>
						)}
					</div>
					<div className="ghv-header-actions">
						<GameMusicPanel />
					</div>
				</div>
			</header>

			{/* Messages */}
			<div
				className="igc-messages"
				role="log"
				aria-live="polite"
				aria-label="Messages du chat"
				data-testid="ingame-chat-messages"
			>
				{normalizedMessages.map((msg) => (
					<div
						key={msg.id}
						className={`igc-msg igc-msg--${msg.sender}`}
						aria-label={`${msg.sender === 'me' ? 'Vous' : opponentUsername} : ${msg.text ?? msg.content}`}
					>
						<span className="igc-msg-text">{msg.text ?? msg.content}</span>
						<time className="igc-msg-time" dateTime={msg.timestamp}>{msg.timestamp}</time>
					</div>
				))}
				<div ref={bottomRef} />
			</div>

			{/* Réponses rapides */}
			<div className="igc-quick" role="group" aria-label="Réponses rapides">
				{QUICK_REPLIES.map((q) => (
					<button
						key={q}
						type="button"
						className="igc-quick-btn"
						onClick={() => sendQuick(q)}
						disabled={!isConnected}
					>
						{q}
					</button>
				))}
			</div>

			{/* Saisie */}
			<div className="igc-compose" role="form" aria-label="Rédiger un message">
				<label htmlFor="igc-input" className="visually-hidden">Message</label>
				<input
					ref={inputRef}
					id="igc-input"
					type="text"
					className="igc-input"
					placeholder={isConnected ? 'Message…' : 'En attente de connexion…'}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					maxLength={200}
					autoComplete="off"
					disabled={!isConnected}
					data-testid="ingame-chat-input"
				/>
				<button
					type="button"
					className="igc-send-btn"
					onClick={sendMessage}
					disabled={!input.trim() || !isConnected}
					aria-label="Envoyer le message"
					data-testid="ingame-chat-send"
				>
					<i className="ri-send-plane-fill" aria-hidden="true" />
				</button>
			</div>
		</div>
	)
}
