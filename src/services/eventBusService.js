/**
 * Event Bus Publisher Service
 * Enables decoupled, asynchronous in-memory event communication across UI components and client workers.
 */

export const EVENTS = {
  ENTRY_CREATED: 'ENTRY_CREATED',
  PUBLIC_POST_PUBLISHED: 'PUBLIC_POST_PUBLISHED',
  NUDGE_CREATED: 'NUDGE_CREATED'
}

const listeners = new Map()

/**
 * Subscribe to an event stream
 * @param {string} eventTopic 
 * @param {Function} handler 
 * @returns {Function} Unsubscribe function
 */
export function subscribeEvent(eventTopic, handler) {
  if (!listeners.has(eventTopic)) {
    listeners.set(eventTopic, new Set())
  }
  listeners.get(eventTopic).add(handler)

  return () => {
    const topicSet = listeners.get(eventTopic)
    if (topicSet) {
      topicSet.delete(handler)
    }
  }
}

/**
 * Asynchronously publish an event to the local Event Bus
 * @param {string} eventTopic 
 * @param {Object} payload 
 */
export async function publishEvent(eventTopic, payload = {}) {
  const eventMessage = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    topic: eventTopic,
    timestamp: new Date().toISOString(),
    payload
  }

  // Asynchronous Non-Blocking Local Event Bus Dispatch
  const topicListeners = listeners.get(eventTopic)
  if (topicListeners && topicListeners.size > 0) {
    setTimeout(() => {
      topicListeners.forEach(handler => {
        try {
          handler(eventMessage)
        } catch (err) {
          console.error(`Error in event handler for topic [${eventTopic}]:`, err)
        }
      })
    }, 0)
  }

  return eventMessage
}
