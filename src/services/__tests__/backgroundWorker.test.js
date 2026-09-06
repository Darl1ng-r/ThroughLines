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

  it('invalidates discover cache on public post publish event', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await handlePublicPostWorker({
      payload: {
        postId: 'post_789'
      }
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Background Worker] Cache invalidated for public post [post_789]')
    )
    consoleSpy.mockRestore()
  })
})
