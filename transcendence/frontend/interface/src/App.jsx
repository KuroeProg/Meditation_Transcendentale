import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import Home from './pages/Home.jsx'
import Game from './pages/Game.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile from './pages/Profile.jsx'
import Settings from './pages/Settings.jsx'
import Auth from './pages/Auth.jsx'
import Statistics from './pages/Statistics.jsx'
import Sidebar from './components/sidebar.jsx'
import ThemeSync from './components/ThemeSync.jsx'
import DevAuthToolbar from './components/DevAuthToolbar.jsx'
import CoalitionHtmlSync from './components/CoalitionHtmlSync.jsx'
import CoalitionAmbient from './components/CoalitionAmbient.jsx'
import { useAuth } from './hooks/useAuth.js'

const ACTIVE_GAME_STORAGE_KEY = 'activeGameId'

function AppContent() {
	const { isAuthenticated } = useAuth()
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
			<div className="aurora-bg" />
			<CoalitionAmbient />
			{!isAuthRoute && <Sidebar />}
			<div className={`main-content ${isAuthRoute ? 'full-width' : ''}`}>
				<Routes>
					<Route path="/auth" element={<Auth />} />
					<Route
						path="/"
						element={
							<ProtectedRoute>
								<Home />
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
								<Game />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<Dashboard />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/profile"
						element={
							<ProtectedRoute>
								<Profile />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/settings"
						element={
							<ProtectedRoute>
								<Settings />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/statistics"
						element={
							<ProtectedRoute>
								<Statistics />
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
