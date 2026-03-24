import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Game from './pages/Game.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile from './pages/Profile.jsx'
import Settings from './pages/Settings.jsx'
import Sidebar from './components/sidebar.jsx'
import ThemeSync from './components/ThemeSync.jsx'
import DevAuthToolbar from './components/DevAuthToolbar.jsx'
import CoalitionHtmlSync from './components/CoalitionHtmlSync.jsx'
import CoalitionAmbient from './components/CoalitionAmbient.jsx'

function App() {
	return (
		<div className="app-layout">
			<ThemeSync />
			<CoalitionHtmlSync />
			<DevAuthToolbar />
			<div className="aurora-bg" />
			<CoalitionAmbient />
			<Sidebar />
			<div className="main-content">
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/game" element={<Game />} />
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/profile" element={<Profile />} />
					<Route path="/settings" element={<Settings />} />
				</Routes>
			</div>
		</div>
	)
}

export default App
