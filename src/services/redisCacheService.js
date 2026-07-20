/**
 * Redis Caching & Rate Limiting Service
 * Supports Upstash Redis REST API integration with zero-config high-speed local fallback.
 */

const memoryCache = new Map()
const rateLimits = new Map()

const UPSTASH_URL = import.meta.env.VITE_UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN

/**
 * Retrieve cached value by key
 * @param {string} key 
 * @returns {Promise<any|null>}
 */
export async function getCache(key) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      })
      const data = await res.json()
      if (data && data.result) {
        return JSON.parse(data.result)
      }
    } catch (err) {
      console.warn('Upstash Redis get error, falling back to memory cache:', err)
    }
  }

  // In-Memory Fallback
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    memoryCache.delete(key)
    return null
  }
  return entry.value
}

/**
 * Store value in cache with TTL in seconds
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlSeconds 
 */
export async function setCache(key, value, ttlSeconds = 60) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const jsonStr = JSON.stringify(value)
      await fetch(`${UPSTASH_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(jsonStr)}/EX/${ttlSeconds}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      })
    } catch (err) {
      console.warn('Upstash Redis set error, using memory cache:', err)
    }
  }

  // In-Memory Fallback
  memoryCache.set(key, {
    value,
    expiry: Date.now() + (ttlSeconds * 1000)
  })
}

/**
 * Invalidate a cached key
 * @param {string} key 
 */
export async function invalidateCache(key) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      await fetch(`${UPSTASH_URL}/del/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      })
    } catch (err) {
      console.warn('Upstash Redis del error:', err)
    }
  }
  memoryCache.delete(key)
}

/**
 * Check rate limit for an action
 * @param {string} actionKey 
 * @param {number} limit Max allowed calls in window
 * @param {number} windowSeconds Window duration in seconds
 * @returns {Promise<{ allowed: boolean, remaining: number, resetSeconds: number }>}
 */
export async function checkRateLimit(actionKey, limit = 5, windowSeconds = 60) {
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  let record = rateLimits.get(actionKey)
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + windowMs }
  }

  if (record.count >= limit) {
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000)
    return { allowed: false, remaining: 0, resetSeconds }
  }

  record.count += 1
  rateLimits.set(actionKey, record)
  const remaining = limit - record.count
  const resetSeconds = Math.ceil((record.resetTime - now) / 1000)

  return { allowed: true, remaining, resetSeconds }
}
