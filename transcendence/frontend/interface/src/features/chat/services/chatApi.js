const BASE = '/api/chat'

async function jsonFetch(url, opts = {}) {
	const res = await fetch(url, { credentials: 'include', ...opts })
	if (!res.ok) {
		const data = await res.json().catch(() => ({}))
		throw new Error(data.error || `HTTP ${res.status}`)
	}
	return res.json()
}

export function fetchConversations() {
	return jsonFetch(`${BASE}/conversations`)
}

export function createConversation(participantId, type = 'private', gameId = null) {
	return jsonFetch(`${BASE}/conversations/create`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ participant_id: participantId, type, game_id: gameId }),
	})
}

export function fetchMessages(conversationId, offset = 0, limit = 50) {
	return jsonFetch(`${BASE}/conversations/${conversationId}/messages?offset=${offset}&limit=${limit}`)
}

export function sendMessageHttp(conversationId, content, messageType = 'text') {
	return jsonFetch(`${BASE}/conversations/${conversationId}/send`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ content, message_type: messageType }),
	})
}

export function sendGameInviteHttp(conversationId, timeControl, competitive = false) {
	return jsonFetch(`${BASE}/conversations/${conversationId}/invite`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ time_control: timeControl, competitive }),
	})
}

export function searchUsers(query) {
	return jsonFetch(`/api/auth/search?q=${encodeURIComponent(query)}`)
}

export function fetchFriends(status = '') {
	const qs = status ? `?status=${status}` : ''
	return jsonFetch(`/api/auth/friends${qs}`)
}

export function sendFriendRequest(userId) {
	return jsonFetch('/api/auth/friends/request', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ user_id: userId }),
	})
}

export function friendAction(friendshipId, action) {
	return jsonFetch(`/api/auth/friends/${friendshipId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action }),
	})
}

export function removeFriend(friendshipId) {
	return jsonFetch(`/api/auth/friends/${friendshipId}`, { method: 'DELETE' })
}
