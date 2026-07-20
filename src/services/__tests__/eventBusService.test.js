import { describe, it, expect, vi } from 'vitest'
import { publishEvent, subscribeEvent, EVENTS } from '../eventBusService'

describe('eventBusService', () => {
  it('publishes and subscribes to events asynchronously', async () => {
    const handler = vi.fn()
    const unsubscribe = subscribeEvent(EVENTS.ENTRY_CREATED, handler)

    const payload = { entryId: 'e123', topicId: 't456', content: 'Testing Kafka event bus' }
    const evt = await publishEvent(EVENTS.ENTRY_CREATED, payload)

    expect(evt.topic).toBe(EVENTS.ENTRY_CREATED)
    expect(evt.payload).toEqual(payload)

    // Wait for async microtask queue dispatch
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(evt)

    unsubscribe()
  })

  it('unsubscribes cleanly from event topics', async () => {
    const handler = vi.fn()
    const unsubscribe = subscribeEvent(EVENTS.PUBLIC_POST_PUBLISHED, handler)

    unsubscribe()
    await publishEvent(EVENTS.PUBLIC_POST_PUBLISHED, { postId: 'p999' })

    await new Promise(resolve => setTimeout(resolve, 10))
    expect(handler).not.toHaveBeenCalled()
  })
})
