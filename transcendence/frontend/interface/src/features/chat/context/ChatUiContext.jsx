/* eslint-disable react-refresh/only-export-components -- paire Provider + hook */
import { createContext, useContext, useMemo } from 'react'

const ChatUiContext = createContext(null)

export function ChatUiProvider({ children, openChat }) {
	const value = useMemo(() => ({ openChat }), [openChat])
	return <ChatUiContext.Provider value={value}>{children}</ChatUiContext.Provider>
}

export function useChatUi() {
	const ctx = useContext(ChatUiContext)
	if (!ctx) {
		return { openChat: () => {} }
	}
	return ctx
}
