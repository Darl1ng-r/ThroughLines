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

  it('renders nudge badge when nudgeCount is greater than 0', () => {
    render(<EntryComposer {...defaultProps} nudgeCount={3} topicTitle="AI Safety" />)
    expect(screen.getByText(/3 waiting for update/i)).toBeDefined()
    expect(screen.getByText(/• AI Safety/i)).toBeDefined()
  })

  it('renders community guidelines notice and disables submit for public entry with flagged content', () => {
    render(<EntryComposer {...defaultProps} composeText="you are a piece of shit" composeVisibility="public" />)
    expect(screen.getByText(/Community Notice:/i)).toBeDefined()
    const btn = screen.getByRole('button', { name: /Log entry/i })
    expect(btn.disabled).toBe(true)
  })

  it('allows saving private entries without blocking when flagged content is personal', () => {
    render(<EntryComposer {...defaultProps} composeText="Personal private note with swear fuck" composeVisibility="private" />)
    expect(screen.queryByText(/Community Notice:/i)).toBeNull()
    const btn = screen.getByRole('button', { name: /Log entry/i })
    expect(btn.disabled).toBe(false)
  })
})
