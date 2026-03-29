import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
