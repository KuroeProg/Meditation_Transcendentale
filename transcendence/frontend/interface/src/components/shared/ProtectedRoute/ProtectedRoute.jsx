import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth/index.js'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isTwoFactorVerified, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated || !isTwoFactorVerified) {
    return <Navigate to="/auth" replace />
  }

  return children
}
