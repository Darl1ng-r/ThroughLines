import { describe, it, expect } from 'vitest'
import {
  formatArchiveJSON,
  formatArchiveMarkdown
} from '../dataPortabilityService'

describe('dataPortabilityService', () => {
  const mockProfile = {
    id: 'user-123',
    username: 'zane_holloway',
    display_name: 'Zane Holloway',
    bio: 'Epistemic explorer investigating complex societal systems.',
    avatar_url: 'https://example.com/avatar.png'
  }

  const mockTopics = [
    {
      id: 'topic-1',
      title: 'Universal Basic Income',
      slug: 'universal-basic-income',
      created_at: '2026-01-10T00:00:00Z'
    },
    {
      id: 'topic-2',
      title: 'Commercial Nuclear Fusion',
      slug: 'commercial-nuclear-fusion',
      created_at: '2026-02-15T00:00:00Z'
    }
  ]

  const mockEntries = [
    {
      id: 'entry-1',
      topic_id: 'topic-1',
      content: 'Early pilot shows positive labor market mobility.',
      confidence_rating: 65,
      shift_reason: 'empirical_evidence',
      entry_date: '2026-01-12T00:00:00Z',
      public_posts: [{ id: 'pub-1', moderation_status: 'approved' }],
      created_at: '2026-01-12T00:00:00Z'
    },
    {
      id: 'entry-2',
      topic_id: 'topic-1',
      content: 'Macroeconomic inflationary pressure is higher than assumed.',
      confidence_rating: 45,
      shift_reason: 'counter_argument',
      entry_date: '2026-03-05T00:00:00Z',
      public_posts: [],
      created_at: '2026-03-05T00:00:00Z'
    }
  ]

  describe('formatArchiveJSON', () => {
    it('produces valid JSON with lossless metadata structure', () => {
      const jsonString = formatArchiveJSON(mockProfile, mockTopics, mockEntries)
      const parsed = JSON.parse(jsonString)

      expect(parsed.schemaVersion).toBe('1.0.0')
      expect(parsed.platform).toBe('ThroughLines')
      expect(parsed.thinker.username).toBe('zane_holloway')
      expect(parsed.metrics.totalTopics).toBe(2)
      expect(parsed.metrics.totalEntries).toBe(2)
      expect(parsed.metrics.publicCount).toBe(1)
      expect(parsed.metrics.privateCount).toBe(1)

      const ubiTopic = parsed.throughlines.find(t => t.id === 'topic-1')
      expect(ubiTopic).toBeDefined()
      expect(ubiTopic.entriesCount).toBe(2)
      expect(ubiTopic.currentConviction).toBe(45)
      expect(ubiTopic.entries[0].shiftReason).toBe('empirical_evidence')
    })
  })

  describe('formatArchiveMarkdown', () => {
    it('produces formatted Markdown with YAML frontmatter for Obsidian/Logseq', () => {
      const md = formatArchiveMarkdown(mockProfile, mockTopics, mockEntries)

      expect(md).toContain('# Epistemic Archive: Zane Holloway')
      expect(md).toContain('> **Thinker Bio:** Epistemic explorer')
      expect(md).toContain('## Throughline: Universal Basic Income')
      expect(md).toContain('current_conviction: 45%')
      expect(md).toContain('empirical evidence')
      expect(md).toContain('*Status:* **Public**')
      expect(md).toContain('*Status:* **Private**')
    })
  })
})
