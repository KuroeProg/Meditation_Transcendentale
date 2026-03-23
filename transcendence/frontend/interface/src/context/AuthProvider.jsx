import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchSessionUser, logoutRequest } from '../api/authClient.js'
import { getLogin42AbsoluteUrl } from '../config/authEndpoints.js'
import { AuthContext } from './authContext.js'
import { getMockSessionUser, isDevMockAuthEnabled } from '../dev/mockSessionUser.js'

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const mounted = useRef(true)

	const refetch = useCallback(async () => {
		setError(null)
		if (isDevMockAuthEnabled()) {
			setLoading(true)
			if (mounted.current) {
				setUser(getMockSessionUser())
				setLoading(false)
			}
			return
		}
		setLoading(true)
		try {
			const data = await fetchSessionUser()
			if (mounted.current) setUser(data)
		} catch (e) {
			if (e.name === 'AbortError') return
			if (mounted.current) {
				setError(e.message ?? 'Erreur réseau')
				setUser(null)
			}
		} finally {
			if (mounted.current) setLoading(false)
		}
	}, [])

	useEffect(() => {
		mounted.current = true
		refetch()
		return () => {
			mounted.current = false
		}
	}, [refetch])

	const loginWith42 = useCallback(() => {
		window.location.assign(getLogin42AbsoluteUrl())
	}, [])

	const logout = useCallback(async () => {
		setError(null)
		if (isDevMockAuthEnabled()) {
			setUser(null)
			return
		}
		try {
			await logoutRequest()
		} catch {
			/* ignore */
		}
		setUser(null)
		await refetch()
	}, [refetch])

	const value = useMemo(
		() => ({
			user,
			loading,
			error,
			isAuthenticated: Boolean(user),
			isDevMockAuth: isDevMockAuthEnabled(),
			refetch,
			loginWith42,
			logout,
		}),
		[user, loading, error, refetch, loginWith42, logout],
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
