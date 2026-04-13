import { useAuth } from '../../../features/auth/index.js'

/**
 * Visible uniquement si VITE_DEV_MOCK_USER=true : permet de réinjecter l’utilisateur fictif après un logout de test.
 */
export default function DevAuthToolbar() {
	const { isDevMockAuth, user, refetch } = useAuth()

	if (!isDevMockAuth) return null

	return (
		<div className="dev-auth-toolbar" role="status">
			<span className="dev-auth-toolbar__label">
				Mock user — voir <code>make mock-help</code> · J2 (noirs) :{' '}
				<code>src/features/chess/mock/mockGameOpponent.js</code>
			</span>
			{!user && (
				<button type="button" className="dev-auth-toolbar__btn" onClick={() => refetch()}>
					Réinjecter l’utilisateur fictif
				</button>
			)}
		</div>
	)
}
