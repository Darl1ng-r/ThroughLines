import { describe, it, expect, beforeEach } from 'vitest'
import { getCache, setCache, invalidateCache, checkRateLimit } from '../redisCacheService'

describe('redisCacheService', () => {
  beforeEach(async () => {
    await invalidateCache('test_key')
  })

  it('sets and retrieves cached values within TTL', async () => {
    const data = { topicsCount: 42, feed: ['a', 'b', 'c'] }
    await setCache('test_key', data, 10)

    const cached = await getCache('test_key')
    expect(cached).toEqual(data)
  })

  it('invalidates cache properly', async () => {
    await setCache('test_key', 'some value', 10)
    await invalidateCache('test_key')

    const cached = await getCache('test_key')
    expect(cached).toBeNull()
  })

  it('enforces rate limits correctly', async () => {
    const action = 'nudge_action_user_1'
    const limit = 2

    const res1 = await checkRateLimit(action, limit, 10)
    expect(res1.allowed).toBe(true)
    expect(res1.remaining).toBe(1)

    const res2 = await checkRateLimit(action, limit, 10)
    expect(res2.allowed).toBe(true)
    expect(res2.remaining).toBe(0)

    const res3 = await checkRateLimit(action, limit, 10)
    expect(res3.allowed).toBe(false)
    expect(res3.remaining).toBe(0)
  })
})
