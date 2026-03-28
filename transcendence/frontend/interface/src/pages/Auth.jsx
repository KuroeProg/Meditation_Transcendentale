import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

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
      on2FARequired({
        userId: result.user_id,
        email: result.email,
        preAuthToken: result.pre_auth_token,
      })
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

    const userId = await registerLocal(
      formData.username,
      formData.password,
      formData.email,
      formData.firstName,
      formData.lastName
    )

    setLoading(false)

    if (userId) {
      onRegistrationSuccess(userId, formData.email)
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

function Verify2FAForm({ userId, email, preAuthToken, onVerificationSuccess }) {
  const { verify2FA, error, setError } = useAuth()
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [rememberDevice, setRememberDevice] = useState(true)
  const [attemptsLeft, setAttemptsLeft] = useState(null)
  const [canResend, setCanResend] = useState(true)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  // Resend countdown timer
  React.useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
    setCanResend(resendCountdown === 0)
  }, [resendCountdown])

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)

    // Auto-submit when 6 digits
    if (value.length === 6) {
      handleVerify(value)
    }
  }

  const handleVerify = async (codeToVerify) => {
    setLoading(true)
    setError(null)

    const success = await verify2FA(userId, codeToVerify, preAuthToken, rememberDevice)

    setLoading(false)

    if (success) {
      onVerificationSuccess()
    } else {
      // Extract attempts from error message
      const match = error?.match(/(\d+) attempt\(s\) remaining/)
      if (match) {
        setAttemptsLeft(parseInt(match[1]))
      }
      setCode('')
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          preAuthToken
            ? { pre_auth_token: preAuthToken, email }
            : { user_id: userId, email }
        ),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to resend code')
      } else {
        setCode('')
        setCanResend(false)
        setResendCountdown(60) // 60 second cooldown
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="auth-form verify-form">
      <h2>Verify Your Email</h2>
      <p className="verify-subtitle">Enter the 6-digit code sent to {email}</p>

      <div className="code-input-group">
        <input
          type="text"
          inputMode="numeric"
          maxLength="6"
          placeholder="000000"
          value={code}
          onChange={handleCodeChange}
          disabled={loading}
          className="code-input"
        />
      </div>

      {attemptsLeft !== null && (
        <div className="attempts-warning">⚠️ {attemptsLeft} attempt(s) remaining</div>
      )}

      {error && <div className="error-message">{error}</div>}

      {preAuthToken && (
        <label className="remember-device-row">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
            disabled={loading}
          />
          <span>Se souvenir de cet appareil pendant 10 minutes</span>
        </label>
      )}

      <button
        onClick={() => handleVerify(code)}
        disabled={loading || code.length !== 6}
        className="btn btn-primary"
      >
        {loading ? 'Verifying...' : 'Verify'}
      </button>

      <button
        onClick={handleResend}
        disabled={resendLoading || !canResend}
        className="btn btn-secondary"
      >
        {resendCountdown > 0
          ? `Resend in ${resendCountdown}s`
          : resendLoading
            ? 'Sending...'
            : 'Resend Code'}
      </button>
    </div>
  )
}

export default function AuthPage() {
  const { isAuthenticated } = useAuth()
  const [stage, setStage] = useState('select') // select, login, register, 2fa
  const [authMode, setAuthMode] = useState(null) // local
  const [userInfo, setUserInfo] = useState(null) // { userId, email, preAuthToken? }

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleRegistrationSuccess = (userId, email) => {
    setUserInfo({ userId, email })
    setStage('2fa')
  }

  const handleLogin2FARequired = ({ userId, email, preAuthToken }) => {
    setUserInfo({ userId, email, preAuthToken })
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
            <div>
              <Verify2FAForm
                userId={userInfo.userId}
                email={userInfo.email}
                preAuthToken={userInfo.preAuthToken}
                onVerificationSuccess={handleVerificationSuccess}
              />
              <button
                onClick={() => {
                  setStage('select')
                  setUserInfo(null)
                }}
                className="btn-back"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
