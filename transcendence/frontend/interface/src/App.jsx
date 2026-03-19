import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Game from './pages/Game.jsx'
import Sidebar from './components/sidebar.jsx'

function App() {
return (
	<div className="app-layout">
		<div className="aurora-bg" />
			<div className="calque">
		<Sidebar />
		<div className="main-content">
			<Routes>
			<Route path="/"		element={<Home />} />
			<Route path="/game"	element={<Game />} />
			</Routes>
			</div>
		</div>
	</div>
	)
}

export default App