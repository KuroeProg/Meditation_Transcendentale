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

const HISTORY_LIST_URLS = ['/api/game/history?limit=100', '/api/history?limit=100']

/**
 * Liste des parties (même contrat JSON) : route canonique sous /api/game/, alias legacy /api/history/.
 * En cas de 404 sur la première (vieux proxy ou backend partiel), on retente la seconde.
 */
export async function fetchHistory() {
	for (let i = 0; i < HISTORY_LIST_URLS.length; i++) {
		try {
			return await jsonFetch(HISTORY_LIST_URLS[i])
		} catch (e) {
			const is404 = String(e?.message || '').includes('404')
			if (is404 && i < HISTORY_LIST_URLS.length - 1) continue
			throw e
		}
	}
	throw new Error('Historique indisponible')
}
