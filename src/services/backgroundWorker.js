/**
 * Decoupled Asynchronous Background Worker Engine
 * Listens to Event Bus streams and processes background tasks without blocking UI HTTP threads.
 */

import { subscribeEvent, EVENTS } from './eventBusService'
import { generatePerspectiveSynthesis } from './aiSynthesisService'

const processedEvents = new Set()

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

import { supabase } from './supabaseClient'
import { invalidateCache } from './redisCacheService'

/**
 * Worker Task 2: Asynchronous Content Moderation & Quality Scan
 * @param {Object} eventMessage 
 */
export async function handlePublicPostWorker(eventMessage) {
  const { postId, content } = eventMessage.payload || {}
  if (!postId || !content) return

  try {
    // 1. Content Moderation & Spam Detection Rules
    const httpCount = (content.match(/https?:\/\//gi) || []).length
    const isSpam = content.length > 4500 || httpCount > 3 || /\b(casino|crypto-airdrop|free-followers|phishing)\b/i.test(content)
    const newStatus = isSpam ? 'flagged' : 'approved'

    // 2. Persist updated moderation status directly to database
    const { error } = await supabase
      .from('public_posts')
      .update({ moderation_status: newStatus })
      .eq('id', postId)

    if (error) {
      console.warn(`[Background Worker] DB update failed for post [${postId}]:`, error.message)
    }

    // 3. Invalidate Discover feed cache so updated status reflects immediately
    await invalidateCache('discover_feed_0')

    console.log(`[Background Worker] Moderation scan completed for post [${postId}]:`, {
      moderationStatus: newStatus
    })
  } catch (err) {
    console.error(`[Background Worker] Moderation scan error for post [${postId}]:`, err)
  }
}

import { sendNativeNotification } from './notificationService'

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
      processedEvents.add(msg.eventId)
      scheduleTaskOnIdle(() => handleEntryCreatedWorker(msg))
    }),
    subscribeEvent(EVENTS.PUBLIC_POST_PUBLISHED, (msg) => {
      processedEvents.add(msg.eventId)
      scheduleTaskOnIdle(() => handlePublicPostWorker(msg))
    }),
    subscribeEvent(EVENTS.NUDGE_CREATED, (msg) => {
      processedEvents.add(msg.eventId)
      scheduleTaskOnIdle(() => handleNudgeWorker(msg))
    })
  ]

  return () => {
    unsubs.forEach(unsub => unsub())
  }
}

// Auto-start background workers on import
initBackgroundWorkers()
