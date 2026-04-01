import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ProtectedRoute, Sidebar, BottomNav, DevAuthToolbar } from './components/shared/index.js'
import { useBreakpoint } from './hooks/useBreakpoint.js'
import {
	HomePage,
	GamePage,
	DashboardPage,
	ProfilePage,
	SettingsPage,
	AuthPage,
	StatisticsPage,
	ThemeSync,
	CoalitionHtmlSync,
	CoalitionAmbient,
	HomeAmbientBgm,
	useAuth,
} from './features/index.js'

const ACTIVE_GAME_STORAGE_KEY = 'activeGameId'

function AppContent() {
	const { isAuthenticated } = useAuth()
	const { isMobile } = useBreakpoint()
	const location = useLocation()
	const activeGameId = sessionStorage.getItem(ACTIVE_GAME_STORAGE_KEY)
	const isOnGameRoute = location.pathname.startsWith('/game/')
	const currentGameId = isOnGameRoute ? location.pathname.replace('/game/', '') : null
	const mustRedirectToActiveGame =
		isAuthenticated && activeGameId && (!isOnGameRoute || currentGameId !== activeGameId)
	const isAuthRoute = location.pathname === '/auth'

	if (mustRedirectToActiveGame) {
		return <Navigate to={`/game/${activeGameId}`} replace />
	}

	return (
		<div className="app-layout">
			<ThemeSync />
			<CoalitionHtmlSync />
			<DevAuthToolbar />
			<HomeAmbientBgm />
			<div className="aurora-bg" />
			<CoalitionAmbient />
			{!isAuthRoute && (isMobile ? <BottomNav /> : <Sidebar />)}
			<div className={`main-content ${isAuthRoute ? 'full-width' : ''}`}>
				<Routes>
					<Route path="/auth" element={<AuthPage />} />
					<Route
						path="/"
						element={
							<ProtectedRoute>
								<HomePage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/game"
						element={
							<ProtectedRoute>
								<Navigate to="/game/default_room" replace />
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
					{/* Catch-all redirect to home */}
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</div>
		</div>
	)
}

export default AppContent
