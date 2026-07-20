import { describe, it, expect } from 'vitest'
import { searchFeed } from '../semanticSearchService'

describe('semanticSearchService', () => {
  const mockFeed = [
    {
      id: 't1',
      title: 'Neural Networks & Deep Learning',
      profiles: { username: 'ai_researcher' },
      latestPost: { content: 'Exploring transformer architectures and scaling laws.' },
      badge: '🔥 High Evolution'
    },
    {
      id: 't2',
      title: 'Philosophy of Mind & Consciousness',
      profiles: { username: 'thinker99' },
      latestPost: { content: 'Is subjective experience emergent or fundamental?' },
      badge: '🌿 Deep Journey'
    },
    {
      id: 't3',
      title: 'Distributed Systems & Database Scalability',
      profiles: { username: 'sys_architect' },
      latestPost: { content: 'Benchmarking Postgres RLS vs Redis caching.' },
      badge: '🆕 Fresh Thought'
    }
  ]

  it('returns all items when query is empty', () => {
    const res = searchFeed(mockFeed, '')
    expect(res.length).toBe(3)
  })

  it('ranks exact title match highest', () => {
    const res = searchFeed(mockFeed, 'neural networks')
    expect(res.length).toBe(1)
    expect(res[0].id).toBe('t1')
  })

  it('matches author handle properly', () => {
    const res = searchFeed(mockFeed, 'sys_architect')
    expect(res.length).toBe(1)
    expect(res[0].id).toBe('t3')
  })

  it('matches fuzzy prefixes and content terms', () => {
    const res = searchFeed(mockFeed, 'transformer')
    expect(res.length).toBe(1)
    expect(res[0].id).toBe('t1')
  })
})
