import React, { createContext, useContext, useState, useEffect } from 'react'
import { AUTH_PATHS } from '../../config/authEndpoints.js'

const ACTIVE_GAME_STORAGE_KEY = 'activeGameId'

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

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null)

  // Check if user is already authenticated on mount
  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const response = await fetch(AUTH_PATHS.me, {
        credentials: 'include',
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setTwoFactorChallenge(null)
      } else {
        setUser(null)
        setTwoFactorChallenge(null)
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      setUser(null)
      setTwoFactorChallenge(null)
    } finally {
      setIsLoading(false)
    }
  }

  async function loginLocal(email, password) {
    setError(null)
    try {
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

  async function logout() {
    try {
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
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY)
      setUser(null)
      setTwoFactorChallenge(null)
    }
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
    isDevMockAuth: false,
    isTwoFactorVerified: !!user && !twoFactorChallenge,
    isAuthenticated: !!user && !twoFactorChallenge,
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
