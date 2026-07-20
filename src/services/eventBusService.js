/**
 * Event Bus Streaming Publisher Service (Kafka / RabbitMQ Pattern)
 * Enables asynchronous, event-driven architecture across ThroughLines services.
 */

export const EVENTS = {
  ENTRY_CREATED: 'ENTRY_CREATED',
  PUBLIC_POST_PUBLISHED: 'PUBLIC_POST_PUBLISHED',
  NUDGE_CREATED: 'NUDGE_CREATED'
}

const listeners = new Map()

const KAFKA_URL = import.meta.env.VITE_KAFKA_REST_URL
const RABBITMQ_URL = import.meta.env.VITE_RABBITMQ_STOMP_URL

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
 * Asynchronously publish an event to the Event Bus
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

  // 1. Forward to external Kafka REST Proxy if configured
  if (KAFKA_URL) {
    try {
      fetch(`${KAFKA_URL}/topics/${eventTopic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.kafka.json.v2+json' },
        body: JSON.stringify({ records: [{ value: eventMessage }] })
      }).catch(err => console.warn('Kafka REST dispatch warning:', err))
    } catch (_) {}
  }

  // 2. Forward to external RabbitMQ Web STOMP if configured
  if (RABBITMQ_URL) {
    try {
      fetch(`${RABBITMQ_URL}/api/exchanges/%2F/amq.default/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: {},
          routing_key: eventTopic,
          payload: JSON.stringify(eventMessage),
          payload_encoding: 'string'
        })
      }).catch(err => console.warn('RabbitMQ REST dispatch warning:', err))
    } catch (_) {}
  }

  // 3. Asynchronous Non-Blocking Local Event Bus Dispatch
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
