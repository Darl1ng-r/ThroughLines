/**
 * Redis Caching & Rate Limiting Service
 *
 * Caching strategy (priority order):
 *   1. Nginx reverse-proxy at /api/cache/ — token never exposed to the browser.
 *      In production, set VITE_REDIS_PROXY_URL to your Supabase Edge Function URL
 *      or leave it unset to use the Nginx /api/cache/ default.
 *   2. In-memory Map fallback (per-tab, resets on refresh) — used in dev & tests.
 *
 * IMPORTANT: VITE_UPSTASH_REDIS_REST_TOKEN must NOT be set in production.
 * Setting it would bundle the secret into the client JS. All Redis auth is
 * handled server-side by the Nginx proxy (see nginx.conf + Dockerfile).
 */

const MAX_MEMORY_ENTRIES = 500
const memoryCache = new Map()
const rateLimits = new Map()

// In test environments, VITE_ env vars are not set and /api/cache/ is unreachable.
// Fall through to the in-memory cache immediately.
const isTestEnv = import.meta.env.MODE === 'test'

// Proxy URL: defaults to the Nginx /api/cache/ reverse proxy or Edge Function.
const PROXY_CACHE_URL = isTestEnv ? null : (import.meta.env.VITE_REDIS_PROXY_URL || null)

/**
 * Retrieve cached value by key.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export async function getCache(key) {
  if (!key) return null

  // Check in-memory L1 cache first
  const entry = memoryCache.get(key)
  if (entry) {
    if (Date.now() <= entry.expiry) {
      return entry.value
    }
    memoryCache.delete(key)
  }

  if (PROXY_CACHE_URL) {
    try {
      const res = await fetch(`${PROXY_CACHE_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', key })
      })
      if (res.ok) {
        const data = await res.json()
        if (data && data.result) {
          const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result
          memoryCache.set(key, { value: parsed, expiry: Date.now() + 60000 })
          return parsed
        }
      }
    } catch (err) {
      // Graceful fallback to memory
    }
  }

  return null
}

/**
 * Store a value in cache with a TTL in seconds.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds
 */
export async function setCache(key, value, ttlSeconds = 60) {
  if (!key) return

  // Bounded LRU eviction for in-memory cache
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const firstKey = memoryCache.keys().next().value
    if (firstKey) memoryCache.delete(firstKey)
  }

  memoryCache.set(key, {
    value,
    expiry: Date.now() + ttlSeconds * 1000,
  })

  if (PROXY_CACHE_URL) {
    try {
      await fetch(`${PROXY_CACHE_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', key, value, ttl: ttlSeconds })
      })
    } catch (_) {
      // Memory fallback is already set
    }
  }
}

/**
 * Invalidate a cached key.
 * @param {string} key
 */
export async function invalidateCache(key) {
  if (!key) return
  memoryCache.delete(key)

  if (PROXY_CACHE_URL) {
    try {
      await fetch(`${PROXY_CACHE_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'del', key })
      })
    } catch (_) {}
  }
}

/**
 * Client-side session throttle (UX layer only).
 *
 * This is NOT a server-side rate limiter. It provides immediate UI feedback
 * (e.g. disabling a Nudge button) within the current browser session.
 * The authoritative rate limits are enforced at:
 *   - DB layer: UNIQUE constraint on (topic_id, nudger_id) — hard per-user cap.
 *   - RLS policy: nudge_cooldown_until — time-window cap enforced in PostgreSQL.
 *   - Nginx: IP-level 10r/s limit_req zone.
 *
 * @param {string} actionKey
 * @param {number} limit Max calls allowed in the window
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

  return {
    allowed: true,
    remaining: limit - record.count,
    resetSeconds: Math.ceil((record.resetTime - now) / 1000),
  }
}
