import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'
import * as AuthContext from '../../context/AuthContext'

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<div>Landing Page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Protected Dashboard')).toBeDefined()
  })

  it('redirects to landing page when user is not authenticated', () => {
    AuthContext.useAuth.mockReturnValue({
      user: null,
      loading: false
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<div>Landing Page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Landing Page')).toBeDefined()
    expect(screen.queryByText('Protected Dashboard')).toBeNull()
  })
})
