import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Route wrapper that enforces user authentication.
 * Redirects unauthenticated users to the Landing page ('/').
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return children
}
