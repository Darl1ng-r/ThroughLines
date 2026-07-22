import { describe, it, expect, vi } from 'vitest'
import { initBackgroundWorkers, handlePublicPostWorker } from '../backgroundWorker'
import { publishEvent, EVENTS } from '../eventBusService'
import { supabase } from '../supabaseClient'

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    })
  }
}))

describe('backgroundWorker', () => {
  it('initializes worker subscriptions and processes background events', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const cleanup = initBackgroundWorkers()

    await publishEvent(EVENTS.ENTRY_CREATED, {
      topicId: 'topic_123',
      topicTitle: 'AI Scaling Laws',
      entries: [
        { entry_date: '2026-01-01', confidence_rating: 50, content: 'Initial test entry' }
      ]
    })

    await publishEvent(EVENTS.PUBLIC_POST_PUBLISHED, {
      postId: 'post_456',
      content: 'Public throughline post content'
    })

    await publishEvent(EVENTS.NUDGE_CREATED, {
      topicId: 'topic_123',
      nudgerUsername: 'explorer'
    })

    // Wait for worker microtask execution
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Background Worker] AI Synthesis computed'),
      expect.anything()
    )

    consoleSpy.mockRestore()
    cleanup()
  })

  it('scans post content and updates moderation_status in database', async () => {
    const updateSpy = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })
    vi.mocked(supabase.from).mockReturnValue({ update: updateSpy })

    await handlePublicPostWorker({
      payload: {
        postId: 'post_789',
        content: 'Clean thoughtful reflection on technology'
      }
    })

    expect(supabase.from).toHaveBeenCalledWith('public_posts')
    expect(updateSpy).toHaveBeenCalledWith({ moderation_status: 'approved' })
  })

  it('flags post content with spam indicators', async () => {
    const updateSpy = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })
    vi.mocked(supabase.from).mockReturnValue({ update: updateSpy })

    await handlePublicPostWorker({
      payload: {
        postId: 'post_spam',
        content: 'Get free-followers now at http://spam1.com http://spam2.com http://spam3.com http://spam4.com'
      }
    })

    expect(updateSpy).toHaveBeenCalledWith({ moderation_status: 'flagged' })
  })
})
