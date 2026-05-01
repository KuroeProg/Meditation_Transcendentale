import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import {
	getMockSessionUser,
	isDevMockAuthEnabled,
	maybeClearSortingHatStorageForMock,
	DEV_MOCK_STORAGE,
} from '../../mock/mockSessionUser.js'
import { disableDevGuestPreview, isDevGuestPreviewActive } from '../../utils/devGuestPreview.js'
import { AUTH_PATHS } from '../../config/authEndpoints.js'

const ACTIVE_GAME_STORAGE_KEY = 'activeGameId'

function syncActiveGameStorage(userLike) {
  const activeGameId = userLike?.active_game_id
  if (activeGameId != null && String(activeGameId).trim() !== '') {
    sessionStorage.setItem(ACTIVE_GAME_STORAGE_KEY, String(activeGameId))
  } else {
    sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY)
  }
}

function readCookie(name) {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&')}=([^;]*)`)
  )
  return match ? decodeURIComponent(match[1]) : null
}

async function ensureCsrfCookie() {
  await fetch(AUTH_PATHS.csrf, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function getWebSocketOrigin() {
  const explicitWsOrigin = import.meta.env.VITE_WS_ORIGIN
  const explicitApiOrigin = import.meta.env.VITE_API_ORIGIN
  const appOrigin = import.meta.env.VITE_APP_ORIGIN
  const baseOrigin = explicitWsOrigin || explicitApiOrigin || appOrigin || window.location.origin

  if (baseOrigin.startsWith('https://')) return baseOrigin.replace('https://', 'wss://').replace(/\/$/, '')
  if (baseOrigin.startsWith('http://')) return baseOrigin.replace('http://', 'ws://').replace(/\/$/, '')
  if (baseOrigin.startsWith('wss://') || baseOrigin.startsWith('ws://')) return baseOrigin.replace(/\/$/, '')

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}`
}

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null)
  const [presenceByUserId, setPresenceByUserId] = useState({})
  const [outgoingPendingInvite, setOutgoingPendingInvite] = useState(null)
  const [priorityGameReady, setPriorityGameReady] = useState(null)
  const [inviteById, setInviteById] = useState({})
  const [friendSignalCount, setFriendSignalCount] = useState(0)
  const [achievementToast, setAchievementToast] = useState(null)
  const achievementToastTimerRef = useRef(null)

  // Check if user is already authenticated on mount
  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      /* Aperçu invité dev : pas de session (ignore cookies / mock) */
      if (import.meta.env.DEV && isDevGuestPreviewActive()) {
        sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY)
        setUser(null)
        setTwoFactorChallenge(null)
        return
      }

      /*
       * Session fictive Vite / barre « Dev mock » : ne pas appeler /api/auth/me
       * (sinon 401 après « Lancer l’animation choixpeau » : logout + refetch).
       */
      if (isDevMockAuthEnabled()) {
        const u = getMockSessionUser()
        syncActiveGameStorage(u)
        maybeClearSortingHatStorageForMock(u.id)
        disableDevGuestPreview()
        setUser(u)
        setTwoFactorChallenge(null)
        return
      }

      const response = await fetch(AUTH_PATHS.me, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.ok) {
        const userData = await response.json()
        syncActiveGameStorage(userData)
        setUser(userData)
        setTwoFactorChallenge(null)
      } else {
        sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY)
        setUser(null)
        setTwoFactorChallenge(null)
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY)
      setUser(null)
      setTwoFactorChallenge(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const userId = user?.id ?? user?.user_id ?? null
    if (!userId || twoFactorChallenge) return undefined

    const ws = new WebSocket(`${getWebSocketOrigin()}/ws/notifications/${userId}/`)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data?.action === 'friend_presence') {
          const friendId = Number(data.user_id)
          if (!Number.isFinite(friendId)) return

          setPresenceByUserId((prev) => ({
            ...prev,
            [friendId]: Boolean(data.is_online),
          }))
          return
        }

        if (data?.action === 'invite_created' || data?.action === 'invite_updated') {
          const invite = data?.invite
          const currentUserId = Number(userId)
          const inviteId = Number(invite?.id)
          const senderId = Number(invite?.sender_id)
          const receiverId = Number(invite?.receiver_id)
          if (!invite || !Number.isFinite(currentUserId) || !Number.isFinite(senderId) || !Number.isFinite(inviteId)) return

          if (currentUserId === senderId || currentUserId === receiverId) {
            setInviteById((prev) => ({ ...prev, [inviteId]: invite }))
          }

          if (senderId !== currentUserId) return

          if (String(invite.status) === 'pending') {
            setOutgoingPendingInvite(invite)
          } else {
            setOutgoingPendingInvite((prev) => {
              if (!prev) return null
              return Number(prev.id) === Number(invite.id) ? null : prev
            })
          }
          return
        }

        if (data?.action === 'game_ready') {
          const currentUserId = Number(userId)
          const senderId = Number(data.sender_id)
          if (currentUserId === senderId) {
            setPriorityGameReady({
              gameId: data.game_id,
              inviteId: data.invite_id,
              senderId,
              receiverId: Number(data.receiver_id),
              receivedAt: Date.now(),
            })
          }
          return
        }

        if (data?.action === 'friend_request' || data?.action === 'friend_accepted') {
          setFriendSignalCount((n) => n + 1)
          return
        }

        if (data?.action === 'achievement_unlocked') {
          const achievement = data?.achievement
          if (!achievement?.id) return
          setAchievementToast({
            id: achievement.id,
            title: achievement.title || 'Succès débloqué',
            description: achievement.description || '',
            receivedAt: Date.now(),
          })
        }
      } catch {
        // ignore malformed websocket payloads
      }
    }

    return () => {
      ws.close()
    }
  }, [user, twoFactorChallenge])

  useEffect(() => {
    if (!achievementToast) return undefined
    if (achievementToastTimerRef.current) clearTimeout(achievementToastTimerRef.current)
    achievementToastTimerRef.current = setTimeout(() => {
      setAchievementToast(null)
      achievementToastTimerRef.current = null
    }, 4500)
    return () => {
      if (achievementToastTimerRef.current) {
        clearTimeout(achievementToastTimerRef.current)
        achievementToastTimerRef.current = null
      }
    }
  }, [achievementToast])

  useEffect(() => {
    const userId = user?.id ?? user?.user_id ?? null
    if (!userId || twoFactorChallenge) {
      setOutgoingPendingInvite(null)
      return undefined
    }

    let cancelled = false
    fetch('/api/chat/invites/pending-outgoing', {
      method: 'GET',
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        const invite = data?.invite ?? null
        setOutgoingPendingInvite(invite)
      })
      .catch(() => {
        if (!cancelled) setOutgoingPendingInvite(null)
      })

    return () => {
      cancelled = true
    }
  }, [user, twoFactorChallenge])

  async function loginLocal(email, password) {
    setError(null)
    try {
      if (isDevMockAuthEnabled()) {
        const u = getMockSessionUser()
        syncActiveGameStorage(u)
        maybeClearSortingHatStorageForMock(u.id)
        disableDevGuestPreview()
        setUser(u)
        setTwoFactorChallenge(null)
        return {
          ok: true,
          status: 'authenticated',
          user: u,
        }
      }

      await ensureCsrfCookie()
      const csrf = readCookie('csrftoken')
      const headers = { 'Content-Type': 'application/json' }
      if (csrf) {
        headers['X-CSRFToken'] = csrf
      }

      const response = await fetch(AUTH_PATHS.loginDb, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ email, password }),
      })

      const data = await safeJson(response)

      if (!response.ok) {
        setError(data?.error || 'Login failed')
        return { ok: false, status: 'error' }
      }

      if (data?.status === '2fa_required') {
        const challenge = {
          status: '2fa_required',
          user_id: data.user_id,
          pre_auth_token: data.pre_auth_token,
          email: data.email,
          message: data.message,
        }
        setUser(null)
        setTwoFactorChallenge(challenge)
        return { ok: false, ...challenge }
      }

      disableDevGuestPreview()
      syncActiveGameStorage(data.user)
      setUser(data.user)
      setTwoFactorChallenge(null)
      return {
        ok: true,
        status: 'authenticated',
        user: data.user,
      }
    } catch (err) {
      setError('Network error. Please try again.')
      return { ok: false, status: 'error' }
    }
  }

  async function registerLocal(username, password, email, firstName, lastName) {
    setError(null)
    try {
      if (isDevMockAuthEnabled()) {
        const u = getMockSessionUser()
        syncActiveGameStorage(u)
        maybeClearSortingHatStorageForMock(u.id)
        disableDevGuestPreview()
        setUser(u)
        setTwoFactorChallenge(null)
        return {
          ok: true,
          status: 'authenticated',
          user: u,
        }
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          email,
          first_name: firstName,
          last_name: lastName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Registration failed')
        return { ok: false, status: 'error' }
      }

      const challenge = {
        status: '2fa_required',
        user_id: data?.user_id ?? null,
        pre_auth_token: data?.pre_auth_token ?? null,
        email: data?.email ?? email,
        message: data?.message ?? null,
      }

      if (data?.status === '2fa_required' || challenge.user_id != null) {
        setUser(null)
        setTwoFactorChallenge(challenge)
        return { ok: false, ...challenge }
      }

      if (data?.user) {
        disableDevGuestPreview()
        syncActiveGameStorage(data.user)
        setUser(data.user)
        setTwoFactorChallenge(null)
        return {
          ok: true,
          status: 'authenticated',
          user: data.user,
        }
      }

      setError('Registration response missing challenge')
      return { ok: false, status: 'error' }
    } catch (err) {
      setError('Network error. Please try again.')
      return { ok: false, status: 'error' }
    }
  }

  async function verify2FA(userId, code, preAuthToken = null, rememberDevice = true) {
    setError(null)
    try {
      const payload = { code }
      if (preAuthToken) {
        payload.pre_auth_token = preAuthToken
        payload.remember_device = Boolean(rememberDevice)
      } else {
        payload.user_id = userId
      }

      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Verification failed')
        return { ok: false, status: 'error', error: data?.error || 'Verification failed' }
      }

      disableDevGuestPreview()
      syncActiveGameStorage(data.user)
      setUser(data.user)
      setTwoFactorChallenge(null)
      return { ok: true, status: 'authenticated', user: data.user }
    } catch (err) {
      setError('Network error. Please try again.')
      return { ok: false, status: 'error', error: 'Network error. Please try again.' }
    }
  }

  function clearTwoFactorChallenge() {
    setTwoFactorChallenge(null)
  }

  /**
   * @param {{ redirectTo?: string }} [options]
   * Si `redirectTo` est défini (ex. `/auth`), navigation pleine page après nettoyage — plus fiable que
   * `navigate()` seul quand la route protégée ou la sidebar mobile jouent des courses avec l’état auth.
   */
  async function logout(options = {}) {
    const redirectTo =
      typeof options?.redirectTo === 'string' && options.redirectTo.trim() !== ''
        ? options.redirectTo.trim()
        : null
    const preserveDevMock =
      options?.preserveDevMock === true
    try {
      if (!isDevMockAuthEnabled()) {
        await ensureCsrfCookie()
        const csrf = readCookie('csrftoken')
        const headers = {}
        if (csrf) {
          headers['X-CSRFToken'] = csrf
        }

        await fetch(AUTH_PATHS.logout, {
          method: 'POST',
          credentials: 'include',
          headers,
        })
      }
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY)
      // For a user-facing logout (sidebar/profile/settings), disable dev mock overrides
      // that can auto-reinject a fake session and instantly redirect back to dashboard.
      if (!preserveDevMock) {
        try {
          localStorage.setItem(DEV_MOCK_STORAGE.MODE, 'force_off')
          localStorage.removeItem(DEV_MOCK_STORAGE.COALITION)
          localStorage.removeItem(DEV_MOCK_STORAGE.AUTH_PROVIDER)
        } catch {
          // ignore storage failures (private mode, quota, etc.)
        }
        disableDevGuestPreview()
      }
      setUser(null)
      setTwoFactorChallenge(null)
      setPresenceByUserId({})
      setOutgoingPendingInvite(null)
      setPriorityGameReady(null)
      setInviteById({})
      setAchievementToast(null)
    }
    if (redirectTo && typeof window !== 'undefined') {
      window.location.replace(redirectTo)
    }
  }

  function dismissPriorityGameReady() {
    setPriorityGameReady(null)
  }

  function registerOutgoingPendingInvite(invite) {
    if (!invite || String(invite.status) !== 'pending') return
    const currentUserId = Number(user?.id ?? user?.user_id)
    const senderId = Number(invite.sender_id)
    if (!Number.isFinite(currentUserId) || !Number.isFinite(senderId)) return
    if (currentUserId !== senderId) return
    setOutgoingPendingInvite(invite)
    const inviteId = Number(invite.id)
    if (Number.isFinite(inviteId)) {
      setInviteById((prev) => ({ ...prev, [inviteId]: invite }))
    }
  }

  function resolveInviteState(inviteId) {
    const id = Number(inviteId)
    if (!Number.isFinite(id)) return null
    return inviteById[id] || null
  }

  function resolveUserOnline(userLike) {
    const id = Number(userLike?.id ?? userLike?.user_id)
    if (Number.isFinite(id) && Object.prototype.hasOwnProperty.call(presenceByUserId, id)) {
      return Boolean(presenceByUserId[id])
    }
    return Boolean(userLike?.is_online)
  }

  function loginWith42() {
    window.location.href = '/api/auth/42/login'
  }

  async function forgotPassword(email) {
    setError(null)
    try {
      await ensureCsrfCookie()
      const csrf = readCookie('csrftoken')
      const headers = { 'Content-Type': 'application/json' }
      if (csrf) headers['X-CSRFToken'] = csrf

      const response = await fetch(AUTH_PATHS.forgotPassword, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ email }),
      })

      const data = await safeJson(response)
      if (!response.ok) {
        setError(data?.error || 'Password reset request failed')
        return { ok: false, status: 'error', error: data?.error || 'Password reset request failed' }
      }

      return {
        ok: true,
        status: 'requested',
        message: data?.message || 'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.',
      }
    } catch (err) {
      setError('Network error. Please try again.')
      return { ok: false, status: 'error', error: 'Network error. Please try again.' }
    }
  }

  async function resetPassword(token, newPassword) {
    setError(null)
    try {
      await ensureCsrfCookie()
      const csrf = readCookie('csrftoken')
      const headers = { 'Content-Type': 'application/json' }
      if (csrf) headers['X-CSRFToken'] = csrf

      const response = await fetch(AUTH_PATHS.resetPassword, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ token, new_password: newPassword }),
      })

      const data = await safeJson(response)
      if (!response.ok) {
        setError(data?.error || 'Password reset failed')
        return { ok: false, status: 'error', error: data?.error || 'Password reset failed' }
      }

      return {
        ok: true,
        status: 'reset',
        message: data?.message || 'Mot de passe mis a jour avec succes',
      }
    } catch (err) {
      setError('Network error. Please try again.')
      return { ok: false, status: 'error', error: 'Network error. Please try again.' }
    }
  }

  async function loginWithDb({ email, password }) {
    return loginLocal(email, password)
  }

  function dismissAchievementToast() {
    setAchievementToast(null)
    if (achievementToastTimerRef.current) {
      clearTimeout(achievementToastTimerRef.current)
      achievementToastTimerRef.current = null
    }
  }

  const value = {
    user,
    isLoading,
    loading: isLoading,
    error,
    setError,
    loginLocal,
    loginWithDb,
    loginWith42,
    forgotPassword,
    resetPassword,
    registerLocal,
    verify2FA,
    twoFactorChallenge,
    clearTwoFactorChallenge,
    logout,
    refetch: checkAuth,
    isDevMockAuth: isDevMockAuthEnabled(),
    presenceByUserId,
    resolveUserOnline,
    outgoingPendingInvite,
    hasOutgoingPendingInvite: Boolean(outgoingPendingInvite),
    registerOutgoingPendingInvite,
    resolveInviteState,
    priorityGameReady,
    dismissPriorityGameReady,
    isTwoFactorVerified: !!user && !twoFactorChallenge,
    isAuthenticated: !!user && !twoFactorChallenge,
    friendSignalCount,
    achievementToast,
    dismissAchievementToast,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
