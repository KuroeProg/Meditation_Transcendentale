import React, { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import '../styles/Auth.css'

export default function ResetPasswordPage() {
  const { isAuthenticated, resetPassword, error, setError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const token = useMemo(() => new URLSearchParams(location.search).get('token') || '', [location.search])

  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setMessage('')

    if (!token) {
      setError('Lien de reinitialisation invalide.')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const result = await resetPassword(token, password)
    setLoading(false)

    if (result?.ok) {
      setMessage(result.message || 'Mot de passe mis a jour avec succes.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-form-side" style={{ margin: '0 auto' }}>
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2 className="auth-form-heading">Reinitialiser le mot de passe</h2>
          </div>

          <form className="auth-form auth-form--login" onSubmit={handleSubmit} autoComplete="on" data-lpignore="true">
            <div className="auth-form-group">
              <div className="auth-input-wrapper auth-input-wrapper--mono">
                <i className="ri-lock-line auth-input-icon" />
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nouveau mot de passe"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="auth-form-group">
              <div className="auth-input-wrapper auth-input-wrapper--mono">
                <i className="ri-lock-line auth-input-icon" />
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirme le mot de passe"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}
            {message && <div className="auth-success">{message}</div>}

            <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
              {loading ? 'Mise a jour...' : 'Changer le mot de passe'}
            </button>

            <p className="auth-switch-text">
              <button type="button" className="auth-link-btn auth-link-underline" onClick={() => navigate('/auth')}>
                Retour a la connexion
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
