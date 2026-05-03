const BASE = '/api/chat'

function readCookie(name) {
	const match = document.cookie.match(
		new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&')}=([^;]*)`),
	)
	return match ? decodeURIComponent(match[1]) : null
}

async function ensureCsrfCookie() {
	await fetch('/api/auth/csrf', {
		method: 'GET',
		credentials: 'include',
		headers: { Accept: 'application/json' },
	})
}

function csrfHeaders(extra = {}) {
	const csrf = readCookie('csrftoken')
	const h = { ...extra }
	if (csrf) h['X-CSRFToken'] = csrf
	return h
}

async function jsonFetch(url, opts = {}) {
	const method = (opts.method || 'GET').toUpperCase()
	if (method !== 'GET' && method !== 'HEAD') {
		await ensureCsrfCookie()
	}
	const headers = {
		...csrfHeaders({ 'Content-Type': 'application/json' }),
		...opts.headers,
	}
	const res = await fetch(url, { credentials: 'include', ...opts, headers })
	let data = {}
	try {
		data = await res.json()
	} catch {}

	if (!res.ok || data.error) {
		const err = new Error(data.error || `HTTP ${res.status}`)
		err.status = res.status
		err.payload = data
		throw err
	}
	return data
}

export function fetchConversations() {
	return jsonFetch(`${BASE}/conversations`)
}

export function createConversation(participantId, type = 'private', gameId = null) {
	return jsonFetch(`${BASE}/conversations/create`, {
		method: 'POST',
		body: JSON.stringify({ participant_id: participantId, type, game_id: gameId }),
	})
}

export function fetchMessages(conversationId, offset = 0, limit = 50) {
	return jsonFetch(`${BASE}/conversations/${conversationId}/messages?offset=${offset}&limit=${limit}`)
}

export function sendMessageHttp(conversationId, content, messageType = 'text') {
	return jsonFetch(`${BASE}/conversations/${conversationId}/send`, {
		method: 'POST',
		body: JSON.stringify({ content, message_type: messageType }),
	})
}

/** @param {object} body — time_control, competitive, time_seconds?, increment? */
export function sendGameInviteHttp(conversationId, body) {
	return jsonFetch(`${BASE}/conversations/${conversationId}/invite`, {
		method: 'POST',
		body: JSON.stringify(body),
	})
}

export function cancelGameInviteHttp(inviteId, reason = 'manual_cancel') {
	return jsonFetch(`${BASE}/invites/${inviteId}/cancel`, {
		method: 'POST',
		body: JSON.stringify({ reason }),
	})
}

export function respondGameInviteHttp(inviteId, action) {
	return jsonFetch(`${BASE}/invites/${inviteId}/respond`, {
		method: 'POST',
		body: JSON.stringify({ action }),
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
		body: JSON.stringify({ user_id: userId }),
	})
}

export function friendAction(friendshipId, action) {
	return jsonFetch(`/api/auth/friends/${friendshipId}`, {
		method: 'PUT',
		body: JSON.stringify({ action }),
	})
}

export function removeFriend(friendshipId) {
	return jsonFetch(`/api/auth/friends/${friendshipId}`, { method: 'DELETE' })
}

/** Heartbeat présence (session) — appeler au montage et ~45s tant que l’utilisateur est connecté. */
export function presencePing() {
	return jsonFetch('/api/auth/me/presence', {
		method: 'POST',
		body: '{}',
	})
}
