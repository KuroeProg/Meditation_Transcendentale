import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import FriendGameInviteModal from '../components/FriendGameInviteModal.jsx'

const FriendInviteContext = createContext(null)

export function FriendInviteProvider({ children, onInviteSent }) {
	const [modal, setModal] = useState(null)

	const openFriendInvite = useCallback((payload) => {
		const friendUserId = payload?.friendUserId ?? payload?.userId
		if (friendUserId == null) return
		setModal({
			friendUserId,
			conversationId: payload.conversationId ?? null,
			friendLabel: payload.friendLabel ?? payload.username ?? '',
		})
	}, [])

	const closeFriendInvite = useCallback(() => setModal(null), [])

	const value = useMemo(
		() => ({ openFriendInvite, closeFriendInvite }),
		[openFriendInvite, closeFriendInvite],
	)

	return (
		<FriendInviteContext.Provider value={value}>
			{children}
			{modal && (
				<FriendGameInviteModal
					friendUserId={modal.friendUserId}
					conversationId={modal.conversationId}
					friendLabel={modal.friendLabel}
					onClose={closeFriendInvite}
					onSent={onInviteSent}
				/>
			)}
		</FriendInviteContext.Provider>
	)
}

export function useFriendInvite() {
	return (
		useContext(FriendInviteContext) ?? {
			openFriendInvite: () => {},
			closeFriendInvite: () => {},
		}
	)
}
