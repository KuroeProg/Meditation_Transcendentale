import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { TwoFactorVerify } from '../components/TwoFactorVerify.jsx'
import '../styles/Auth.css'

function LoginForm({ on2FARequired }) {
  const { loginLocal, error, setError } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await loginLocal(formData.email, formData.password)

    if (result?.status === '2fa_required') {
      on2FARequired(result)
    }

    setLoading(false)
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} autoComplete="on" data-lpignore="true">
      <h2>Login</h2>

      <div className="form-group">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          required
          disabled={loading}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}

function RegisterForm({ onRegistrationSuccess }) {
  const { registerLocal, error, setError } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await registerLocal(
      formData.username,
      formData.password,
      formData.email,
      formData.firstName,
      formData.lastName
    )

    setLoading(false)

    if (result?.status === '2fa_required') {
      onRegistrationSuccess(result)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} autoComplete="on" data-lpignore="true">
      <h2>Register</h2>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            type="text"
            name="firstName"
            autoComplete="given-name"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First name"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            type="text"
            name="lastName"
            autoComplete="family-name"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last name"
            disabled={loading}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="reg-username">Username</label>
        <input
          id="reg-username"
          type="text"
          name="username"
          autoComplete="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Choose a username"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="reg-email">Email</label>
        <input
          id="reg-email"
          type="email"
          name="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="reg-password">Password</label>
        <input
          id="reg-password"
          type="password"
          name="password"
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Choose a strong password"
          required
          disabled={loading}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Creating account...' : 'Register'}
      </button>
    </form>
  )
}

export default function AuthPage() {
  const { isAuthenticated, twoFactorChallenge, clearTwoFactorChallenge } = useAuth()
  const [stage, setStage] = useState('select') // select, login, register, 2fa
  const [authMode, setAuthMode] = useState(null) // local

  const userInfo = twoFactorChallenge
    ? {
        userId: twoFactorChallenge.user_id,
        email: twoFactorChallenge.email,
        preAuthToken: twoFactorChallenge.pre_auth_token,
      }
    : null

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleRegistrationSuccess = ({ user_id }) => {
    if (!user_id) return
    setStage('2fa')
  }

  const handleLogin2FARequired = ({ user_id }) => {
    if (!user_id) return
    setStage('2fa')
  }

  const handleVerificationSuccess = () => {
    // Auto-redirect to dashboard
    window.location.href = '/dashboard'
  }

  const handleOAuth42Click = () => {
    // Redirect to OAuth endpoint
    window.location.href = '/api/auth/42/login/'
  }

  return (
    <div className="auth-page">
      <div className="aurora-bg" />
      <div className="auth-container">
        <div className="auth-header">
          <h1>Chess Arena</h1>
          <p className="subtitle">Connect to play</p>
        </div>

        <div className="auth-content">
          {stage === 'select' && (
            <div className="auth-select">
              <button
                onClick={() => {
                  setAuthMode('local')
                  setStage('login')
                }}
                className="btn btn-large btn-local"
              >
                📧 Login with Email
              </button>

              <div className="divider">OR</div>

              <button
                onClick={() => {
                  setAuthMode('local')
                  setStage('register')
                }}
                className="btn btn-large btn-local"
              >
                ✍️ Create Account
              </button>

              <div className="divider">OR</div>

              <button onClick={handleOAuth42Click} className="btn btn-large btn-oauth42">
                🔐 Login with 42 Intra
              </button>
            </div>
          )}

          {stage === 'login' && authMode === 'local' && (
            <div>
              <LoginForm on2FARequired={handleLogin2FARequired} />
              <button
                onClick={() => setStage('select')}
                className="btn-back"
              >
                ← Back
              </button>
            </div>
          )}

          {stage === 'register' && authMode === 'local' && (
            <div>
              <RegisterForm onRegistrationSuccess={handleRegistrationSuccess} />
              <button
                onClick={() => setStage('select')}
                className="btn-back"
              >
                ← Back
              </button>
            </div>
          )}

          {stage === '2fa' && userInfo && (
            <TwoFactorVerify
                userId={userInfo.userId}
                email={userInfo.email}
                preAuthToken={userInfo.preAuthToken}
                onVerificationSuccess={handleVerificationSuccess}
                onCancel={() => {
                  clearTwoFactorChallenge()
                  setStage('select')
                }}
              />
          )}
        </div>
      </div>
    </div>
  )
}
