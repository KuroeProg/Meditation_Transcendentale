import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { TwoFactorVerify } from '../components/TwoFactorVerify.jsx'
import SiteBrandLogo from '../../../components/common/Logo/SiteBrandLogo.jsx'
import Logo42 from '../../../components/common/Logo/Logo42.jsx'
import CoalitionFire from '../../theme/components/CoalitionSymbols/Coalition_Fire.jsx'
import CoalitionWater from '../../theme/components/CoalitionSymbols/Coalition_Water.jsx'
import CoalitionWind from '../../theme/components/CoalitionSymbols/Coalition_Wind.jsx'
import CoalitionEarth from '../../theme/components/CoalitionSymbols/Coalition_Earth.jsx'
import '../styles/Auth.css'
import AuthChessFloat from '../components/AuthChessFloat.jsx'
import { LEGAL_COOKIES_URL, LEGAL_PRIVACY_URL, LEGAL_TOS_URL } from '../../../config/legalPages.js'

function LoginForm({ on2FARequired, onSwitchToRegister }) {
  const { loginLocal, error, setError } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
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
    <form className="auth-form auth-form--login" onSubmit={handleSubmit} autoComplete="on" data-lpignore="true">
      <div className="auth-form-group">
        <div className="auth-input-wrapper auth-input-wrapper--mono">
          <i className="ri-user-line auth-input-icon" />
          <input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Adresse email"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="auth-form-group">
        <div className="auth-input-wrapper auth-input-wrapper--mono">
          <i className="ri-lock-line auth-input-icon" />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Mot de passe"
            required
            disabled={loading}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            <i className={showPassword ? 'ri-eye-line' : 'ri-eye-off-line'} />
          </button>
        </div>
      </div>

      <div className="auth-options-row">
        <label className="auth-checkbox-label">
          <input type="checkbox" name="remember" checked={formData.remember} onChange={handleChange} />
          <span>Se souvenir de moi</span>
        </label>
        <button type="button" className="auth-link-btn" tabIndex={-1}>
          Mot de passe oublie ?
        </button>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
        {loading ? 'Connexion...' : 'Se Connecter'}
      </button>

      <div className="auth-btn-42-wrap">
        <button type="button" className="auth-btn auth-btn-42" onClick={() => (window.location.href = '/api/auth/42/login/')}>
          <span>Se connecter via</span>
          <Logo42 className="auth-42-logo" />
        </button>
      </div>

      <p className="auth-switch-text">
        Pas encore de compte ?{' '}
        <button type="button" className="auth-link-btn auth-link-underline" onClick={onSwitchToRegister}>
          S'inscrire
        </button>
      </p>
    </form>
  )
}

function RegisterForm({ onRegistrationSuccess, onSwitchToLogin }) {
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
      formData.username, formData.password, formData.email, formData.firstName, formData.lastName
    )
    setLoading(false)
    if (result?.status === '2fa_required') {
      onRegistrationSuccess(result)
    }
  }

  return (
    <form className="auth-form auth-form--register" onSubmit={handleSubmit} autoComplete="on" data-lpignore="true">
      <h2 className="auth-form-title">Creer un compte</h2>

      <div className="auth-form-row">
        <div className="auth-form-group">
          <div className="auth-input-wrapper auth-input-wrapper--mono">
            <i className="ri-user-smile-line auth-input-icon" />
            <input id="firstName" type="text" name="firstName" autoComplete="given-name"
              value={formData.firstName} onChange={handleChange} placeholder="Prenom" disabled={loading} />
          </div>
        </div>
        <div className="auth-form-group">
          <div className="auth-input-wrapper auth-input-wrapper--mono">
            <i className="ri-user-smile-line auth-input-icon" />
            <input id="lastName" type="text" name="lastName" autoComplete="family-name"
              value={formData.lastName} onChange={handleChange} placeholder="Nom" disabled={loading} />
          </div>
        </div>
      </div>

      <div className="auth-form-group">
        <div className="auth-input-wrapper auth-input-wrapper--mono">
          <i className="ri-at-line auth-input-icon" />
          <input id="reg-username" type="text" name="username" autoComplete="username"
            value={formData.username} onChange={handleChange} placeholder="Nom d'utilisateur" required disabled={loading} />
        </div>
      </div>

      <div className="auth-form-group">
        <div className="auth-input-wrapper auth-input-wrapper--mono">
          <i className="ri-mail-line auth-input-icon" />
          <input id="reg-email" type="email" name="email" autoComplete="email"
            value={formData.email} onChange={handleChange} placeholder="Adresse email" required disabled={loading} />
        </div>
      </div>

      <div className="auth-form-group">
        <div className="auth-input-wrapper auth-input-wrapper--mono">
          <i className="ri-lock-line auth-input-icon" />
          <input id="reg-password" type="password" name="password" autoComplete="new-password"
            value={formData.password} onChange={handleChange} placeholder="Mot de passe" required disabled={loading} />
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
        {loading ? 'Creation...' : 'Creer mon compte'}
      </button>

      <p className="auth-switch-text">
        Deja un compte ?{' '}
        <button type="button" className="auth-link-btn auth-link-underline" onClick={onSwitchToLogin}>
          Se connecter
        </button>
      </p>
    </form>
  )
}

export default function AuthPage() {
  const { isAuthenticated, twoFactorChallenge, clearTwoFactorChallenge } = useAuth()
  const [stage, setStage] = useState('login')
  const userInfo = twoFactorChallenge
    ? { userId: twoFactorChallenge.user_id, email: twoFactorChallenge.email, preAuthToken: twoFactorChallenge.pre_auth_token }
    : null

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

  return (
    <div className="auth-page">
      <div className="auth-branding">
        <div className="auth-branding-content">
          <div className="auth-coalition-grid">
            <div className="auth-coalition-symbol auth-coalition-fire"><CoalitionFire /></div>
            <div className="auth-coalition-symbol auth-coalition-water"><CoalitionWater /></div>
            <div className="auth-coalition-symbol auth-coalition-wind"><CoalitionWind /></div>
            <div className="auth-coalition-symbol auth-coalition-earth"><CoalitionEarth /></div>
          </div>
          <SiteBrandLogo className="auth-site-logo" />
          <h1 className="auth-brand-title">TRANSCENDANCE</h1>
          <p className="auth-brand-subtitle">L'Arene Echecs de 42 Perpignan</p>
          <p className="auth-brand-tagline">Affutez votre logique. Dominez le plateau.<br />Elevez votre coalition.</p>
        </div>
        <div className="auth-wave-decoration" />
      </div>

      <div className="auth-form-side">
        <AuthChessFloat />
        <div className="auth-form-container">
          <div className="auth-form-header">
            <Logo42 className="auth-header-42-logo" />
            <h2 className="auth-form-heading">
              {stage === 'register' ? 'Rejoindre l\'Arene' : 'Connexion a l\'Arene'}
            </h2>
          </div>

          {stage === 'login' && (
            <LoginForm
              on2FARequired={handleLogin2FARequired}
              onSwitchToRegister={() => setStage('register')}
            />
          )}

          {stage === 'register' && (
            <RegisterForm
              onRegistrationSuccess={handleRegistrationSuccess}
              onSwitchToLogin={() => setStage('login')}
            />
          )}

          {stage === '2fa' && userInfo && (
            <TwoFactorVerify
              userId={userInfo.userId}
              email={userInfo.email}
              preAuthToken={userInfo.preAuthToken}
              onVerificationSuccess={() => (window.location.href = '/dashboard')}
              onCancel={() => { clearTwoFactorChallenge(); setStage('login') }}
            />
          )}
        </div>

        <footer className="auth-footer">
          <a href={LEGAL_PRIVACY_URL} target="_blank" rel="noreferrer" className="auth-footer-link">
            Confidentialité
          </a>
          <span className="auth-footer-sep" aria-hidden="true">
            |
          </span>
          <a href={LEGAL_TOS_URL} target="_blank" rel="noreferrer" className="auth-footer-link">
            Mentions legales
          </a>
          <span className="auth-footer-sep" aria-hidden="true">
            |
          </span>
          <a href={LEGAL_COOKIES_URL} target="_blank" rel="noreferrer" className="auth-footer-link">
            Cookies
          </a>
          <span className="auth-footer-sep" aria-hidden="true">
            |
          </span>
          <span>Contact</span>
          <span className="auth-footer-sep" aria-hidden="true">
            |
          </span>
          <span>Ecole 42 Perpignan</span>
        </footer>
      </div>
    </div>
  )
}
