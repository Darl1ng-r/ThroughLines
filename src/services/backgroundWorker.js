/**
 * Decoupled Asynchronous Background Worker Engine
 * Listens to Event Bus streams and processes background tasks without blocking UI HTTP threads.
 */

import { subscribeEvent, EVENTS } from './eventBusService'
import { generatePerspectiveSynthesis } from './aiSynthesisService'
import { supabase } from './supabaseClient'
import { invalidateCache } from './redisCacheService'
import { sendNativeNotification } from './notificationService'

const MAX_PROCESSED_EVENTS = 200
const processedEvents = new Set()

function trackProcessedEvent(eventId) {
  if (!eventId) return false
  if (processedEvents.has(eventId)) return true
  if (processedEvents.size >= MAX_PROCESSED_EVENTS) {
    const oldest = processedEvents.keys().next().value
    if (oldest) processedEvents.delete(oldest)
  }
  processedEvents.add(eventId)
  return false
}

/**
 * Worker Task 1: Asynchronous AI Trajectory & Synthesis Processing
 * @param {Object} eventMessage 
 */
async function handleEntryCreatedWorker(eventMessage) {
  const { topicId, topicTitle, entries } = eventMessage.payload || {}
  if (!topicId || !entries) return

  try {
    // Re-calculate AI perspective synthesis in background
    const synthesisResult = generatePerspectiveSynthesis(topicTitle || 'Topic', entries)
    // Cache or log background synthesis completion
    console.log(`[Background Worker] AI Synthesis computed for topic [${topicId}]:`, {
      stabilityScore: synthesisResult.stabilityScore,
      pivotsCount: synthesisResult.pivots?.length || 0
    })
  } catch (err) {
    console.error(`[Background Worker] Error computing AI synthesis for topic [${topicId}]:`, err)
  }
}

/**
 * Worker Task 2: Asynchronous Content Cache Invalidation
 * @param {Object} eventMessage 
 */
export async function handlePublicPostWorker(eventMessage) {
  const { postId } = eventMessage.payload || {}
  if (!postId) return

  try {
    // Invalidate Discover feed cache so new public post reflects immediately
    await invalidateCache('discover_feed_cursor_null')
    console.log(`[Background Worker] Cache invalidated for public post [${postId}]`)
  } catch (err) {
    console.error(`[Background Worker] Cache invalidation error for post [${postId}]:`, err)
  }
}

/**
 * Worker Task 3: Asynchronous Push Notification Dispatcher
 * @param {Object} eventMessage 
 */
export async function handleNudgeWorker(eventMessage) {
  const { topicId, nudgerUsername } = eventMessage.payload || {}
  if (!topicId) return

  try {
    const sender = nudgerUsername ? `@${nudgerUsername}` : 'Someone'
    await sendNativeNotification('🌿 New Throughline Nudge!', {
      body: `${sender} requested an update on your throughline!`,
      url: '/dashboard'
    })
    console.log(`[Background Worker] Notification dispatched for topic [${topicId}] from user [${nudgerUsername || 'anonymous'}]`)
  } catch (err) {
    console.error(`[Background Worker] Notification queue error for topic [${topicId}]:`, err)
  }
}

function scheduleTaskOnIdle(taskFn) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => taskFn(), { timeout: 1000 })
  } else {
    setTimeout(taskFn, 0)
  }
}

/**
 * Initialize Background Worker Subscriptions
 */
export function initBackgroundWorkers() {
  const unsubs = [
    subscribeEvent(EVENTS.ENTRY_CREATED, (msg) => {
      if (trackProcessedEvent(msg?.eventId)) return
      scheduleTaskOnIdle(() => handleEntryCreatedWorker(msg))
    }),
    subscribeEvent(EVENTS.PUBLIC_POST_PUBLISHED, (msg) => {
      if (trackProcessedEvent(msg?.eventId)) return
      scheduleTaskOnIdle(() => handlePublicPostWorker(msg))
    }),
    subscribeEvent(EVENTS.NUDGE_CREATED, (msg) => {
      if (trackProcessedEvent(msg?.eventId)) return
      scheduleTaskOnIdle(() => handleNudgeWorker(msg))
    })
  ]

  return () => {
    unsubs.forEach(unsub => unsub())
  }
}

// Auto-start background workers on import
initBackgroundWorkers()
