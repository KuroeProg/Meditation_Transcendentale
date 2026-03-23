import { Navigate } from 'react-router-dom'

/**
 * Redirection seule : la page tableau de bord est gérée par un autre dev.
 * Garde /dashboard pour un éventuel callback OAuth backend (ex. redirect après login 42).
 */
export default function Dashboard() {
	return <Navigate to="/profile" replace />
}
