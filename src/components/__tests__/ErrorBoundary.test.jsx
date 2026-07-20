import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../ErrorBoundary'

function ProblemChild({ shouldThrow = false }) {
  if (shouldThrow) {
    throw new Error('Test rendering crash')
  }
  return <div>Normal child component</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Normal child component')).toBeDefined()
  })

  it('catches error and displays fallback UI', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something unexpected happened')).toBeDefined()
    expect(screen.getByRole('button', { name: /Refresh view/i })).toBeDefined()

    consoleSpy.mockRestore()
  })
})
