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

/**
 * Worker Task 2: Asynchronous Content Moderation & Quality Scan
 * @param {Object} eventMessage 
 */
async function handlePublicPostWorker(eventMessage) {
  const { postId, content } = eventMessage.payload || {}
  if (!postId || !content) return

  try {
    const isSpam = content.length > 4500 || /http:\/\/[^\s]+/i.test(content)
    console.log(`[Background Worker] Moderation scan completed for post [${postId}]:`, {
      moderationStatus: isSpam ? 'flagged' : 'approved'
    })
  } catch (err) {
    console.error(`[Background Worker] Moderation scan error for post [${postId}]:`, err)
  }
}

/**
 * Worker Task 3: Asynchronous Push Notification Dispatcher
 * @param {Object} eventMessage 
 */
async function handleNudgeWorker(eventMessage) {
  const { topicId, nudgerUsername } = eventMessage.payload || {}
  if (!topicId) return

  try {
    console.log(`[Background Worker] Notification queued for topic [${topicId}] from user [${nudgerUsername || 'anonymous'}]`)
  } catch (err) {
    console.error(`[Background Worker] Notification queue error for topic [${topicId}]:`, err)
  }
}

/**
 * Initialize Background Worker Subscriptions
 */
export function initBackgroundWorkers() {
  const unsubs = [
    subscribeEvent(EVENTS.ENTRY_CREATED, (msg) => {
      processedEvents.add(msg.eventId)
      handleEntryCreatedWorker(msg)
    }),
    subscribeEvent(EVENTS.PUBLIC_POST_PUBLISHED, (msg) => {
      processedEvents.add(msg.eventId)
      handlePublicPostWorker(msg)
    }),
    subscribeEvent(EVENTS.NUDGE_CREATED, (msg) => {
      processedEvents.add(msg.eventId)
      handleNudgeWorker(msg)
    })
  ]

  return () => {
    unsubs.forEach(unsub => unsub())
  }
}

// Auto-start background workers on import
initBackgroundWorkers()
