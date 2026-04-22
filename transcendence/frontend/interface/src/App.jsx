import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ProtectedRoute, Sidebar, BottomNav, DevAuthToolbar, SiteFooter } from './components/shared/index.js'
import { useBreakpoint } from './hooks/useBreakpoint.js'
import {
	HomePage,
	ContactPage,
	AboutPage,
	GamePage,
	DashboardPage,
	ProfilePage,
	SettingsPage,
	AuthPage,
	ResetPasswordPage,
	StatisticsPage,
	HistoryPage,
	ThemeSync,
	CoalitionHtmlSync,
	CoalitionAmbient,
	HomeAmbientBgm,
	ChatDrawer,
	FriendInviteProvider,
	ChatUiProvider,
	useAuth,
} from './features/index.js'
import SortingHatGate from './features/auth/components/SortingHatGate.jsx'
import ChatFabCluster from './features/chat/components/ChatFabCluster.jsx'
import { useChatInbox } from './features/chat/hooks/useChatInbox.js'
import { cancelGameInviteHttp, presencePing } from './features/chat/services/chatApi.js'

const ACTIVE_GAME_STORAGE_KEY = 'activeGameId'

function AppContent() {
	const { isAuthenticated, priorityGameReady, dismissPriorityGameReady, outgoingPendingInvite } = useAuth()
	const { isMobile } = useBreakpoint()
	const location = useLocation()
	const navigate = useNavigate()
	const isAuthRoute = location.pathname.startsWith('/auth')
	const [chatOpen, setChatOpen] = useState(false)
	const [chatInitialConversation, setChatInitialConversation] = useState(null)
	const inboxEnabled = isAuthenticated && !isAuthRoute
	const { textUnread, inviteUnread, toast, clearToast, refresh: refreshInbox } = useChatInbox(inboxEnabled)
	const clearChatInitial = useCallback(() => setChatInitialConversation(null), [])

	const activeGameId = sessionStorage.getItem(ACTIVE_GAME_STORAGE_KEY)
	const isOnGameRoute = location.pathname.startsWith('/game/')
	const currentGameId = isOnGameRoute ? location.pathname.replace('/game/', '') : null
	const isOnlineGameRoute = Boolean(
		currentGameId &&
		currentGameId !== 'training' &&
		currentGameId !== 'local' &&
		!String(currentGameId).startsWith('training_')
	)
	const mustRedirectToActiveGame =
		isAuthenticated && activeGameId && (!isOnGameRoute || currentGameId !== activeGameId)
	const footerSidewallOffset = isAuthenticated && !isAuthRoute && !isMobile

	const handleJoinReadyGame = useCallback(() => {
		if (!priorityGameReady?.gameId) return
		navigate(`/game/${priorityGameReady.gameId}`)
		dismissPriorityGameReady()
	}, [priorityGameReady, navigate, dismissPriorityGameReady])

	useEffect(() => {
		if (!isAuthenticated) return
		presencePing().catch(() => {})
		const interval = setInterval(() => presencePing().catch(() => {}), 45000)
		const onVis = () => {
			if (document.visibilityState === 'visible') presencePing().catch(() => {})
		}
		document.addEventListener('visibilitychange', onVis)
		return () => {
			clearInterval(interval)
			document.removeEventListener('visibilitychange', onVis)
		}
	}, [isAuthenticated])

	useEffect(() => {
		if (!isAuthenticated || !isOnlineGameRoute) return
		const inviteId = outgoingPendingInvite?.id
		if (!inviteId) return
		cancelGameInviteHttp(inviteId, 'sender_busy').catch(() => {})
	}, [isAuthenticated, isOnlineGameRoute, outgoingPendingInvite?.id])

	if (mustRedirectToActiveGame) {
		return <Navigate to={`/game/${activeGameId}`} replace />
	}

	return (
		<FriendInviteProvider onInviteSent={() => void refreshInbox()}>
		<ChatUiProvider openChat={() => setChatOpen(true)}>
		<div className={`app-layout${!isAuthenticated ? ' app-layout--guest-session' : ''}`}>
			<ThemeSync />
			<SortingHatGate />
			<CoalitionHtmlSync />
			<DevAuthToolbar />
			<HomeAmbientBgm />
			<div className="aurora-bg" />
			<CoalitionAmbient />
			{!isAuthRoute && isAuthenticated && (isMobile ? <BottomNav /> : <Sidebar />)}
			<div
				className={`main-content ${isAuthRoute ? 'full-width' : ''} ${!isAuthenticated && !isAuthRoute ? 'main-content--guest' : ''}`}
			>
				<Routes>
					<Route path="/auth" element={<AuthPage />} />
					<Route path="/auth/reset-password" element={<ResetPasswordPage />} />
					<Route
						path="/"
						element={
							<HomePage />
						}
					/>
					<Route
						path="/game"
						element={
							<ProtectedRoute>
								<Navigate to="/game/training" replace />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/game/:gameId"
						element={
							<ProtectedRoute>
								<GamePage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<DashboardPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/profile"
						element={
							<ProtectedRoute>
								<ProfilePage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/settings"
						element={
							<ProtectedRoute>
								<SettingsPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/statistics"
						element={
							<ProtectedRoute>
								<StatisticsPage />
							</ProtectedRoute>
						}
					/>
				<Route
					path="/history"
					element={
						<ProtectedRoute>
							<HistoryPage />
						</ProtectedRoute>
					}
				/>
				<Route path="/contact" element={<ContactPage />} />
				<Route path="/about" element={<AboutPage />} />
				<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</div>

			<SiteFooter sidewallOffset={footerSidewallOffset} />

			{isAuthenticated && !isAuthRoute && (
				<>
					{priorityGameReady?.gameId && (
						<div className="priority-game-cta" role="status" aria-live="polite">
							<div className="priority-game-cta__text">
								<strong>Partie prete</strong>
								<span>Ton ami a accepte l'invitation. Rejoindre maintenant ?</span>
							</div>
							<div className="priority-game-cta__actions">
								<button type="button" className="priority-game-cta__btn" onClick={dismissPriorityGameReady}>
									Plus tard
								</button>
								<button type="button" className="priority-game-cta__btn priority-game-cta__btn--primary" onClick={handleJoinReadyGame}>
									Rejoindre
								</button>
							</div>
						</div>
					)}
					<ChatFabCluster
						textUnread={textUnread}
						inviteUnread={inviteUnread}
						toast={toast}
						onToastClick={(t) => {
							setChatInitialConversation(t.conversation)
							setChatOpen(true)
							clearToast()
						}}
						onToastDismiss={clearToast}
						onOpenChat={() => setChatOpen(true)}
					/>
					<ChatDrawer
						isOpen={chatOpen}
						onClose={() => {
							setChatOpen(false)
							setChatInitialConversation(null)
							void refreshInbox()
						}}
						initialConversation={chatInitialConversation}
						onConsumedInitial={clearChatInitial}
					/>
				</>
			)}
		</div>
		</ChatUiProvider>
		</FriendInviteProvider>
	)
}

export default AppContent
