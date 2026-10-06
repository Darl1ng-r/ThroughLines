import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Discover from '../Discover'
import { supabase } from '../../services/supabaseClient'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

const mockTopics = [
  {
    id: 'topic-older',
    title: 'Cognitive Architecture Fundamentals',
    slug: 'cognitive-architecture',
    created_at: '2026-10-01T10:00:00Z',
    profiles: {
      username: 'elena_v',
      display_name: 'Elena V',
      bio: 'Cognitive scientist'
    },
    public_posts: [
      {
        id: 'post-1',
        content: 'Older entry discussing dual-process theory.',
        confidence_rating: 60,
        entry_date: '2026-10-01T10:00:00Z',
        moderation_status: 'approved'
      }
    ]
  },
  {
    id: 'topic-newer',
    title: 'Decentralized Social Coordination',
    slug: 'decentralized-social-coordination',
    created_at: '2026-10-06T15:00:00Z',
    profiles: {
      username: 'marcus_k',
      display_name: 'Marcus K',
      bio: 'Systems theorist'
    },
    public_posts: [
      {
        id: 'post-2',
        content: 'Latest reflection on epistemic networks.',
        confidence_rating: 85,
        entry_date: '2026-10-06T15:00:00Z',
        moderation_status: 'approved'
      }
    ]
  }
]

function createQueryBuilder(resolvedData) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    textSearch: vi.fn(() => builder),
    then: (resolve) => Promise.resolve({ data: resolvedData, error: null }).then(resolve)
  }
  return builder
}

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
        return createQueryBuilder([])
      })
    }
  }
})

vi.mock('../../services/redisCacheService', () => ({
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(),
  invalidateCache: vi.fn().mockResolvedValue(),
  getSyncCache: vi.fn().mockReturnValue(null)
}))

vi.mock('../../components/ConfidenceChart', () => ({
  default: () => <div data-testid="confidence-chart">Confidence Chart</div>
}))

describe('Discover Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders public throughlines in reverse chronological order', async () => {
    render(<Discover />)

    await waitFor(() => {
      expect(screen.getByText('Decentralized Social Coordination')).toBeDefined()
      expect(screen.getByText('Cognitive Architecture Fundamentals')).toBeDefined()
    })

    // The newer topic should appear first in the feed
    const titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)
    expect(titles[0]).toBe('Decentralized Social Coordination')
    expect(titles[1]).toBe('Cognitive Architecture Fundamentals')
  })

  it('does NOT render Apache Spark macro trends banner', async () => {
    render(<Discover />)

    await waitFor(() => {
      expect(screen.getByText('Decentralized Social Coordination')).toBeDefined()
    })

    expect(screen.queryByText(/Apache Spark/i)).toBeNull()
    expect(screen.queryByText(/Macro Trends/i)).toBeNull()
  })

  it('does NOT render Mindscape Algorithm mode switcher', async () => {
    render(<Discover />)

    await waitFor(() => {
      expect(screen.getByText('Decentralized Social Coordination')).toBeDefined()
    })

    expect(screen.queryByText(/Mindscape/i)).toBeNull()
    expect(screen.queryByText(/Smart Feed/i)).toBeNull()
    expect(screen.queryByText(/Most Evolved/i)).toBeNull()
  })

  it('does NOT render badges or tags under posts', async () => {
    render(<Discover />)

    await waitFor(() => {
      expect(screen.getByText('Decentralized Social Coordination')).toBeDefined()
    })

    expect(screen.queryByText(/Fresh Thought/i)).toBeNull()
    expect(screen.queryByText(/High Evolution/i)).toBeNull()
    expect(screen.queryByText(/Deep Journey/i)).toBeNull()
    expect(screen.queryByText(/Shifted Mindset/i)).toBeNull()
  })

  it('ensures search input has explicit color styling', async () => {
    render(<Discover />)

    const searchInput = screen.getByPlaceholderText(/Search topics, content, or writers/i)
    expect(searchInput).toBeDefined()
    expect(searchInput.style.color).toBe('var(--color-ink)')
  })
})
