import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App'

// Mock useAuth
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'test@throughlines.org' },
    profile: { id: 'u1', username: 'tester', display_name: 'Test Thinker' },
    loading: false,
    signOut: vi.fn()
  }),
  AuthProvider: ({ children }) => <div>{children}</div>
}))

describe('Theme toggling in App and NavBar', () => {
  it('toggles theme when clicking the theme toggle button', () => {
    // Start at /dashboard so NavBar is rendered (NavBar is hidden on '/')
    window.history.pushState({}, 'Test', '/dashboard')

    render(<App />)

    // Initially light mode
    const toggleBtn = screen.getByRole('button', { name: /Switch to dark mode/i })
    expect(toggleBtn).toBeDefined()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    // Click to switch to dark mode
    fireEvent.click(toggleBtn)

    // Should now be dark mode
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(screen.getByRole('button', { name: /Switch to light mode/i })).toBeDefined()

    // Click again to switch back to light mode
    fireEvent.click(screen.getByRole('button', { name: /Switch to light mode/i }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
