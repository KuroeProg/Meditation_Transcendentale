import React, { createContext, useContext, useState, useEffect } from 'react'

const ACTIVE_GAME_STORAGE_KEY = 'activeGameId'

function readCookie(name) {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&')}=([^;]*)`)
  )
  return match ? decodeURIComponent(match[1]) : null
}

async function ensureCsrfCookie() {
  await fetch('/api/auth/csrf', {
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

  // Check if user is already authenticated on mount
  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      setUser(null)
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

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ email, password }),
      })

      const data = await safeJson(response)

      if (!response.ok) {
        setError(data?.error || 'Login failed')
        return false
      }

      setUser(data.user)
      return true
    } catch (err) {
      setError('Network error. Please try again.')
      return false
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
        return null
      }

      // Return user_id for 2FA step
      return data.user_id
    } catch (err) {
      setError('Network error. Please try again.')
      return null
    }
  }

  async function verify2FA(userId, code) {
    setError(null)
    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, code }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Verification failed')
        return false
      }

      setUser(data.user)
      return true
    } catch (err) {
      setError('Network error. Please try again.')
      return false
    }
  }

  async function logout() {
    try {
      await ensureCsrfCookie()
      const csrf = readCookie('csrftoken')
      const headers = {}
      if (csrf) {
        headers['X-CSRFToken'] = csrf
      }

      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers,
      })
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY)
      setUser(null)
    }
  }

  function loginWith42() {
    window.location.href = '/api/auth/42/login'
  }

  async function loginWithDb({ email, username, password }) {
    return loginLocal(email || username, password)
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
    registerLocal,
    verify2FA,
    logout,
    refetch: checkAuth,
    isDevMockAuth: false,
    isAuthenticated: !!user,
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
