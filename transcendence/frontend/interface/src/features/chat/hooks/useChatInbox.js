import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchConversations } from '../services/chatApi.js'

const TOAST_MS = 7200

/**
 * Compteurs non lus (texte vs invitations de partie) + toast quand une nouvelle invite arrive.
 */
export function useChatInbox(enabled) {
	const [textUnread, setTextUnread] = useState(0)
	const [inviteUnread, setInviteUnread] = useState(0)
	const [toast, setToast] = useState(null)
	const inboxInit = useRef(false)
	const prevLastMsg = useRef(new Map())
	const toastTimer = useRef(null)

	const clearToast = useCallback(() => {
		if (toastTimer.current) {
			clearTimeout(toastTimer.current)
			toastTimer.current = null
		}
		setToast(null)
	}, [])

	const refresh = useCallback(async () => {
		if (!enabled) return
		let data
		try {
			data = await fetchConversations()
		} catch {
			return
		}
		const convs = data.conversations || []
		let text = 0
		let invite = 0
		for (const c of convs) {
			text += Number(c.unread_text_count ?? 0)
			invite += Number(c.unread_invite_count ?? 0)
		}
		setTextUnread(text)
		setInviteUnread(invite)

		if (!inboxInit.current) {
			for (const c of convs) {
				prevLastMsg.current.set(c.id, c.last_message?.id ?? null)
			}
			inboxInit.current = true
			return
		}

		for (const c of convs) {
			const lm = c.last_message
			const prevId = prevLastMsg.current.get(c.id)
			const unreadInv = Number(c.unread_invite_count ?? 0)
			if (
				lm?.message_type === 'game_invite'
				&& lm.id !== prevId
				&& unreadInv > 0
			) {
				const from = c.participants?.[0]?.username || 'Joueur'
				setToast({
					conversation: c,
					messageId: lm.id,
					title: `${from} te défie`,
					subtitle: (lm.content && String(lm.content).slice(0, 72)) || 'Invitation de partie',
				})
				break
			}
		}

		for (const c of convs) {
			prevLastMsg.current.set(c.id, c.last_message?.id ?? null)
		}
	}, [enabled])

	useEffect(() => {
		if (!enabled) {
			inboxInit.current = false
			prevLastMsg.current.clear()
			setTextUnread(0)
			setInviteUnread(0)
			clearToast()
			return
		}
		void refresh()
		const id = setInterval(() => void refresh(), 10000)
		const onFocus = () => void refresh()
		window.addEventListener('focus', onFocus)
		return () => {
			clearInterval(id)
			window.removeEventListener('focus', onFocus)
		}
	}, [enabled, refresh, clearToast])

	useEffect(() => {
		if (!toast) return
		if (toastTimer.current) clearTimeout(toastTimer.current)
		toastTimer.current = setTimeout(() => {
			toastTimer.current = null
			setToast(null)
		}, TOAST_MS)
		return () => {
			if (toastTimer.current) clearTimeout(toastTimer.current)
		}
	}, [toast])

	return {
		textUnread,
		inviteUnread,
		toast,
		clearToast,
		refresh,
	}
}
