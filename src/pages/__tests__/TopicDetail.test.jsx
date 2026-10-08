import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import TopicDetail from '../TopicDetail'
import * as AuthContext from '../../context/AuthContext'
import { supabase } from '../../services/supabaseClient'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

function createQueryBuilder(resolvedData) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolvedData, error: null }),
    then: (resolve) => Promise.resolve({ data: resolvedData, error: null }).then(resolve)
  }
  return builder
}

const mockDbTopic = {
  id: 'topic-123',
  title: 'Epistemic Humility in AI',
  slug: 'epistemic-humility-ai',
  profiles: {
    id: 'author-1',
    username: 'elena_vance',
    display_name: 'Elena Vance'
  },
  public_posts: [
    {
      id: 'post-1',
      content: 'First premise on epistemic uncertainty.',
      confidence_rating: 65,
      entry_date: '2026-10-06T10:00:00Z',
      moderation_status: 'approved'
    }
  ]
}

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'topics') {
        return createQueryBuilder(mockDbTopic)
      }
      if (table === 'nudges') {
        return createQueryBuilder(null)
      }
      return createQueryBuilder(null)
    })
  }
}))

vi.mock('../../components/ConfidenceChart', () => ({
  default: () => <div data-testid="confidence-chart">Confidence Chart</div>
}))

describe('TopicDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AuthContext.useAuth.mockReturnValue({
      user: { id: 'visitor-1' },
      profile: { id: 'visitor-1', username: 'visitor' }
    })
  })

  it('renders instantly when hydrated from Discover state', async () => {
    const mockTopic = {
      id: 'topic-hydrated',
      title: 'Decentralized Coordination Mechanisms',
      slug: 'decentralized-coordination',
      profiles: {
        id: 'author-2',
        username: 'talia_systems',
        display_name: 'Talia Ramos'
      },
      public_posts: [
        {
          id: 'post-h1',
          content: 'Synchronous meetings act as a cognitive tax.',
          confidence_rating: 72,
          entry_date: '2026-10-06T12:00:00Z',
          moderation_status: 'approved'
        }
      ]
    }

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/talia_systems/decentralized-coordination',
            state: { initialTopic: mockTopic, initialProfile: mockTopic.profiles, from: 'discover' }
          }
        ]}
      >
        <Routes>
          <Route path="/:username/:topicSlug" element={<TopicDetail />} />
        </Routes>
      </MemoryRouter>
    )

    // Verify title and content rendered immediately
    expect(screen.getByText('Decentralized Coordination Mechanisms')).toBeDefined()
    expect(screen.getByText('Synchronous meetings act as a cognitive tax.')).toBeDefined()
    expect(screen.getAllByText('@talia_systems').length).toBeGreaterThan(0)
  })

  it('navigates back to Discover when the back button is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/elena_vance/epistemic-humility-ai']}>
        <Routes>
          <Route path="/:username/:topicSlug" element={<TopicDetail />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Back to Discover')).toBeDefined()
    })

    const backButton = screen.getByText('Back to Discover')
    fireEvent.click(backButton)

    expect(mockNavigate).toHaveBeenCalledWith('/discover')
  })

  it('navigates to author profile as an optional action', async () => {
    render(
      <MemoryRouter initialEntries={['/elena_vance/epistemic-humility-ai']}>
        <Routes>
          <Route path="/:username/:topicSlug" element={<TopicDetail />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/profile →/i)).toBeDefined()
    })

    const profilePill = screen.getByText(/profile →/i).closest('button')
    fireEvent.click(profilePill)

    expect(mockNavigate).toHaveBeenCalledWith('/elena_vance')
  })
})
