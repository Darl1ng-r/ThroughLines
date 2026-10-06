import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Dashboard from '../Dashboard'
import * as AuthContext from '../../context/AuthContext'
import { supabase } from '../../services/supabaseClient'

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

function createQueryBuilder(resolvedData) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolvedData, error: null }),
    then: (resolve) => Promise.resolve({ data: resolvedData, error: null }).then(resolve)
  }
  return builder
}

const mockTopics = [
  { id: 'topic-1', title: 'Philosophy of Mind', slug: 'philosophy-of-mind' }
]

const mockEntries = [
  {
    id: 'entry-1',
    topic_id: 'topic-1',
    content: 'Testing initial premise',
    confidence_rating: 80,
    entry_date: '2026-10-06T12:00:00Z',
    public_posts: []
  }
]

vi.mock('../../services/supabaseClient', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({})
  }
  return {
    supabase: {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      from: vi.fn((table) => {
        if (table === 'topics') return createQueryBuilder(mockTopics)
        if (table === 'nudges') return createQueryBuilder([])
        if (table === 'private_entries') return createQueryBuilder(mockEntries)
        return createQueryBuilder([])
      })
    }
  }
})

vi.mock('../../components/ConfidenceChart', () => ({
  default: () => <div data-testid="confidence-chart">Confidence Chart</div>
}))

vi.mock('../../services/draftStorage', () => ({
  getDraft: vi.fn().mockResolvedValue(''),
  saveDraft: vi.fn().mockResolvedValue(),
  removeDraft: vi.fn().mockResolvedValue()
}))

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AuthContext.useAuth.mockReturnValue({
      user: { id: 'user-1', email: 'tester@example.com' }
    })
  })

  it('renders workspace, shows topic title in EntryComposer, and does NOT render AI Evolution Synthesis', async () => {
    render(<Dashboard />)

    // Verify TopicSidebar rendered the topic
    await waitFor(() => {
      expect(screen.getAllByText('Philosophy of Mind').length).toBeGreaterThan(0)
    })

    // Verify EntryComposer rendered and displays topic title
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Why do you believe that/i)).toBeDefined()
      expect(screen.getByText(/• Philosophy of Mind/i)).toBeDefined()
    })

    // Verify TimelineItem rendered the entry
    await waitFor(() => {
      expect(screen.getByText('Testing initial premise')).toBeDefined()
    })

    // Verify AI Evolution Synthesis is completely removed
    expect(screen.queryByText(/AI Evolution Synthesis/i)).toBeNull()
    expect(screen.queryByText(/AI Perspective Evolution Synthesis/i)).toBeNull()

    // Verify "+ New" input has explicit ink color styling
    const newBtn = screen.getByText(/New/i).closest('button')
    fireEvent.click(newBtn)
    const topicInput = screen.getByPlaceholderText(/e.g. AGI Alignment/i)
    expect(topicInput).toBeDefined()
    expect(topicInput.style.color).toBe('var(--color-ink)')
  })
})
