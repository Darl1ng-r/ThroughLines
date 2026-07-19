import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import EntryComposer from '../EntryComposer'

describe('EntryComposer', () => {
  const defaultProps = {
    entriesCount: 3,
    composeText: '',
    onComposeChange: vi.fn(),
    composeConfidence: 65,
    setComposeConfidence: vi.fn(),
    composeVisibility: 'private',
    setComposeVisibility: vi.fn(),
    onAddEntry: vi.fn(),
    submitting: false
  }

  it('renders correctly with default props', () => {
    render(<EntryComposer {...defaultProps} />)
    expect(screen.getByText('Add another log')).toBeDefined()
    expect(screen.getByPlaceholderText(/Why do you believe that/i)).toBeDefined()
    expect(screen.getByText('65%')).toBeDefined()
  })

  it('shows first entry header when entriesCount is 0', () => {
    render(<EntryComposer {...defaultProps} entriesCount={0} />)
    expect(screen.getByText('First entry')).toBeDefined()
  })

  it('disables submit button when composeText is empty', () => {
    render(<EntryComposer {...defaultProps} composeText="" />)
    const btn = screen.getByRole('button', { name: /Log entry/i })
    expect(btn.disabled).toBe(true)
  })

  it('locks controls and displays Logging entry... when submitting is true', () => {
    render(<EntryComposer {...defaultProps} composeText="Valid text" submitting={true} />)
    const textarea = screen.getByPlaceholderText(/Why do you believe that/i)
    const btn = screen.getByRole('button', { name: /Logging entry.../i })
    
    expect(textarea.disabled).toBe(true)
    expect(btn.disabled).toBe(true)
  })
})
