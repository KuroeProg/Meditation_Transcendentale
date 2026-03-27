import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchSessionUser, loginDbRequest, logoutRequest } from '../api/authClient.js'
import { getLogin42AbsoluteUrl } from '../config/authEndpoints.js'
import { AuthContext } from './authContext.js'
import { getMockSessionUser, isDevMockAuthEnabled } from '../dev/mockSessionUser.js'

const LOCAL_AUTH_USER_KEY = 'localAuthUser'

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

		const localUserRaw = sessionStorage.getItem(LOCAL_AUTH_USER_KEY)
		if (localUserRaw) {
			try {
				const localUser = JSON.parse(localUserRaw)
				if (mounted.current) {
					setUser(localUser)
					setLoading(false)
				}
				return
			} catch {
				sessionStorage.removeItem(LOCAL_AUTH_USER_KEY)
			}
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

	const loginWithDb = useCallback(async ({ username, password }) => {
		setError(null)
		const userData = await loginDbRequest(username, password)
		sessionStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(userData))
		if (mounted.current) setUser(userData)
		return userData
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
		sessionStorage.removeItem(LOCAL_AUTH_USER_KEY)
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
			loginWithDb,
			logout,
		}),
		[user, loading, error, refetch, loginWith42, loginWithDb, logout],
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
