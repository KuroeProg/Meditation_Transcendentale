import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'remixicon/fonts/remixicon.scss'
import './index.scss'
import App from './App.jsx'
import { AuthProvider } from './store/context/AuthContext.jsx'
import { RemoteLogger } from './utils/logger.js'

// Track all uncaught Javascript errors natively
window.addEventListener('error', (event) => {
	RemoteLogger.error(`Uncaught Error: ${event.message}`, {
		filename: event.filename,
		lineno: event.lineno,
		errorStack: event.error?.stack
	});
});

// Track failed promises (often fetch requests or async thrown logic)
window.addEventListener('unhandledrejection', (event) => {
	RemoteLogger.error(`Unhandled Promise Rejection: ${event.reason}`, {
		reasonStack: event.reason?.stack || event.reason
	});
});

// Intercept all native console warnings and errors 
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
	originalConsoleWarn(...args); // Keep it visible in browser dev tools
	RemoteLogger.warn(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
};

const originalConsoleError = console.error;
console.error = (...args) => {
	originalConsoleError(...args);
	RemoteLogger.error(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
};

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<App />
			</AuthProvider>
		</BrowserRouter>
	</StrictMode>,
)
