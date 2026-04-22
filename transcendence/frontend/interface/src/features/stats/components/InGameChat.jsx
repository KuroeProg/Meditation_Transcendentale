/**
 * InGameChat — Shell frontend du chat en cours de partie.
 *
 * V1 : UI complète avec mocks, prête pour branchement backend.
 * Contrat API attendu (backend) :
 *   GET  /api/chat/conversations/?type=game&game_id=<id>  → { conversation_id }
 *   WS   /ws/chat/<conversation_id>/                       → messages
 *   POST /api/chat/conversations/<id>/messages/            → envoyer un message
 */
import { useState, useRef, useEffect, useCallback } from 'react'

/* ── Mock messages initiaux ── */
const MOCK_MESSAGES = [
	{ id: 1, sender: 'opponent', text: 'Bonne partie !',       timestamp: '14:28' },
	{ id: 2, sender: 'me',       text: 'À toi aussi 😄',       timestamp: '14:28' },
	{ id: 3, sender: 'opponent', text: 'Tu joues la Sicilienne souvent ?', timestamp: '14:30' },
]

/* ── Suggestions rapides ── */
const QUICK_REPLIES = [
	'Bonne chance !',
	'Bien joué !',
	'Match nul ?',
	'Rematch ?',
]

export function InGameChat({ opponentUsername = 'Adversaire', gameId }) {
	const [messages, setMessages] = useState(MOCK_MESSAGES)
	const [input, setInput] = useState('')
	const [isConnected] = useState(false) // false = mock / pas encore branché backend
	const bottomRef = useRef(null)
	const inputRef  = useRef(null)

	// Auto-scroll au dernier message
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	const sendMessage = useCallback(() => {
		const text = input.trim()
		if (!text) return
		const now = new Date()
		const timestamp = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
		setMessages((prev) => [...prev, { id: Date.now(), sender: 'me', text, timestamp }])
		setInput('')
		inputRef.current?.focus()
		// TODO: envoyer via WS ou POST /api/chat/conversations/<id>/messages/
	}, [input])

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			sendMessage()
		}
	}

	const sendQuick = (text) => {
		setMessages((prev) => [...prev, {
			id: Date.now(),
			sender: 'me',
			text,
			timestamp: `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`,
		}])
		// TODO: envoyer via backend
	}

	return (
		<div className="igc-root" aria-label={`Chat avec ${opponentUsername}`}>
			{/* En-tête */}
			<div className="igc-header">
				<i className="ri-chat-3-line igc-header-icon" aria-hidden="true" />
				<span className="igc-header-title">{opponentUsername}</span>
				{!isConnected && (
					<span className="igc-mock-badge" title="Mode aperçu — le chat sera actif en partie réelle">
						<i className="ri-information-line" aria-hidden="true" /> Aperçu
					</span>
				)}
			</div>

			{/* Messages */}
			<div
				className="igc-messages"
				role="log"
				aria-live="polite"
				aria-label="Messages du chat"
			>
				{messages.map((msg) => (
					<div
						key={msg.id}
						className={`igc-msg igc-msg--${msg.sender}`}
						aria-label={`${msg.sender === 'me' ? 'Vous' : opponentUsername} : ${msg.text}`}
					>
						<span className="igc-msg-text">{msg.text}</span>
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
					placeholder="Message…"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					maxLength={200}
					autoComplete="off"
				/>
				<button
					type="button"
					className="igc-send-btn"
					onClick={sendMessage}
					disabled={!input.trim()}
					aria-label="Envoyer le message"
				>
					<i className="ri-send-plane-fill" aria-hidden="true" />
				</button>
			</div>
		</div>
	)
}
