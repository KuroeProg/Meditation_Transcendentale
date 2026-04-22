import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchConversations } from '../services/chatApi.js'
import { loadUiPrefs } from '../../../config/uiPrefs.js'

const TOAST_MS = 7200

function formatGameInviteSubtitle(raw) {
	if (raw == null || raw === '') return 'Invitation de partie'
	const s = String(raw).trim()
	try {
		const o = JSON.parse(s)
		if (o && typeof o === 'object') {
			const parts = []
			if (o.time_control != null && o.time_control !== '') parts.push(String(o.time_control))
			if (typeof o.competitive === 'boolean')
				parts.push(o.competitive ? 'Classée' : 'Amicale')
			if (parts.length) return parts.join(' · ')
		}
	} catch {
		/* pas du JSON */
	}
	return s.length > 72 ? `${s.slice(0, 69)}…` : s
}

/**
 * Compteurs non lus (texte vs invitations de partie) + toast quand une nouvelle invite arrive.
 * Le toast est supprimé si la préférence `hideInviteToasts` est activée dans uiPrefs.
 */
export function useChatInbox(enabled) {
	const [textUnread, setTextUnread] = useState(0)
	const [inviteUnread, setInviteUnread] = useState(0)
	const [toast, setToast] = useState(null)
	const inboxInit = useRef(false)
	const prevLastMsg = useRef(new Map())
	/** Détecte une nouvelle invitation même si le dernier message du fil est déjà un message texte. */
	const prevInviteUnreadByConv = useRef(new Map())
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
				prevInviteUnreadByConv.current.set(c.id, Number(c.unread_invite_count ?? 0))
			}
			inboxInit.current = true
			return
		}

		for (const c of convs) {
			const lm = c.last_message
			const prevId = prevLastMsg.current.get(c.id)
			const unreadInv = Number(c.unread_invite_count ?? 0)
			const prevInv = prevInviteUnreadByConv.current.get(c.id) ?? 0
			const inviteCountWentUp = unreadInv > prevInv && unreadInv > 0
			const newInviteAsLastMessage =
				lm?.message_type === 'game_invite' && lm.id !== prevId && unreadInv > 0

			if (newInviteAsLastMessage || inviteCountWentUp) {
				/* Badge conservé ; seul le toast pop-up est conditionnel à la préférence. */
				if (!loadUiPrefs().hideInviteToasts) {
					const from = c.participants?.[0]?.username || 'Joueur'
					if (lm?.message_type === 'game_invite' && lm.id !== prevId) {
						setToast({
							conversation: c,
							messageId: lm.id,
							title: `${from} te défie`,
							subtitle: formatGameInviteSubtitle(lm.content),
						})
					} else {
						setToast({
							conversation: c,
							messageId: lm?.id ?? null,
							title: `${from} t’a invité`,
							subtitle: 'Invitation en attente — ouvre le chat pour accepter ou refuser.',
						})
					}
				}
				break
			}
		}

		for (const c of convs) {
			prevLastMsg.current.set(c.id, c.last_message?.id ?? null)
			prevInviteUnreadByConv.current.set(c.id, Number(c.unread_invite_count ?? 0))
		}
	}, [enabled])

	useEffect(() => {
		if (!enabled) {
			inboxInit.current = false
			prevLastMsg.current.clear()
			prevInviteUnreadByConv.current.clear()
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
