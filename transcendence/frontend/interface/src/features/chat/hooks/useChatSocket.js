import { useCallback, useEffect, useRef, useState } from 'react'

function buildWsUrl(conversationId) {
	const wsOrigin =
		import.meta.env.VITE_WS_ORIGIN ||
		import.meta.env.VITE_API_ORIGIN ||
		`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
	return `${wsOrigin.replace(/^http/, 'ws')}/ws/chat/${conversationId}/`
}

export function useChatSocket(conversationId, userId) {
	const wsRef = useRef(null)
	const [isConnected, setIsConnected] = useState(false)
	const [messages, setMessages] = useState([])
	const [typingUsers, setTypingUsers] = useState({})
	const typingTimeoutsRef = useRef({})

	useEffect(() => {
		if (!conversationId) return

		const ws = new WebSocket(buildWsUrl(conversationId))
		wsRef.current = ws

		ws.onopen = () => {
			setIsConnected(true)
			if (userId) {
				ws.send(JSON.stringify({ action: 'authenticate', user_id: userId }))
			}
		}

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data)

				if (data.action === 'new_message') {
					setMessages((prev) => [...prev, data.message])
				}

				if (data.action === 'typing') {
					if (data.user_id !== userId) {
						setTypingUsers((prev) => ({ ...prev, [data.user_id]: data.is_typing ? data.username : null }))
						if (data.is_typing) {
							if (typingTimeoutsRef.current[data.user_id]) clearTimeout(typingTimeoutsRef.current[data.user_id])
							typingTimeoutsRef.current[data.user_id] = setTimeout(() => {
								setTypingUsers((prev) => ({ ...prev, [data.user_id]: null }))
							}, 3000)
						}
					}
				}

				if (data.action === 'read') {
					setMessages((prev) =>
						prev.map((m) =>
							data.message_ids.includes(m.id)
								? { ...m, read_by: [...new Set([...(m.read_by || []), data.user_id])] }
								: m
						)
					)
				}
			} catch {}
		}

		ws.onclose = () => setIsConnected(false)
		ws.onerror = () => setIsConnected(false)

		return () => {
			ws.close()
			wsRef.current = null
			setIsConnected(false)
			Object.values(typingTimeoutsRef.current).forEach(clearTimeout)
		}
	}, [conversationId, userId])

	const sendMessage = useCallback((content) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({ action: 'send_message', content }))
		}
	}, [])

	const sendTyping = useCallback((isTyping, username) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({ action: 'typing', is_typing: isTyping, username }))
		}
	}, [])

	const markAsRead = useCallback((messageIds) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({ action: 'read', message_ids: messageIds }))
		}
	}, [])

	/** @param {{ time_control: string, competitive: boolean, time_seconds?: number, increment?: number }} payload */
	const sendGameInvite = useCallback((payload) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({ action: 'game_invite', ...payload }))
		}
	}, [])

	const activeTyping = Object.values(typingUsers).filter(Boolean)

	return {
		isConnected,
		messages,
		setMessages,
		activeTyping,
		sendMessage,
		sendTyping,
		markAsRead,
		sendGameInvite,
	}
}
