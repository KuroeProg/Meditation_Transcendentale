import { fetchHistory } from '../../history/services/historyApi.js';

// We can reuse the jsonFetch from historyApi if we export it, 
// but since it's not exported, I'll just use a similar one or import what I can.
// Actually, historyApi.js doesn't export jsonFetch. I'll just use a local helper.

async function jsonFetch(url, opts = {}) {
	const res = await fetch(url, { credentials: 'include', ...opts });
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.error || `HTTP ${res.status}`);
	}
	return res.json();
}

export async function fetchGameDetails(gameId) {
	// The backend route is api/history/detail/<game_id>/
    // We strip 'game-' prefix if it's there
    const cleanId = String(gameId).replace('game-', '');
	if (!/^\d+$/.test(cleanId)) {
		return Promise.reject(new Error('Invalid numeric game ID for backend fetch'));
	}
	return jsonFetch(`/api/history/detail/${cleanId}/`);
}
