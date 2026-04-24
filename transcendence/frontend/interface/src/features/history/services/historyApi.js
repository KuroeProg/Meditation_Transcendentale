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
	if (!res.ok) {
		const data = await res.json().catch(() => ({}))
		throw new Error(data.error || `HTTP ${res.status}`)
	}
	return res.json()
}

export function fetchHistory() {
	return jsonFetch('/api/game/history?limit=100')
}
