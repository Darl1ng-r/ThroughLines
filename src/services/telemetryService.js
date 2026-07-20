/**
 * Enterprise Telemetry & Observability Service
 * Tracks Web Vitals, API request latencies, unhandled UI exceptions, and health metrics.
 */

const metrics = new Map()
const errorLogs = []
const MAX_ERROR_LOGS = 50

const TELEMETRY_URL = import.meta.env.VITE_TELEMETRY_ENDPOINT

/**
 * Record a performance metric
 * @param {string} name 
 * @param {number} value 
 */
export function logMetric(name, value) {
  if (typeof value !== 'number') return
  const current = metrics.get(name) || { count: 0, sum: 0, min: Infinity, max: -Infinity }
  
  current.count += 1
  current.sum += value
  current.min = Math.min(current.min, value)
  current.max = Math.max(current.max, value)

  metrics.set(name, current)
}

/**
 * Record an unhandled error or exception
 * @param {Error|string} error 
 * @param {Object} context 
 */
export function logError(error, context = {}) {
  const errorEvent = {
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    message: typeof error === 'string' ? error : error?.message || 'Unknown Error',
    stack: error?.stack || null,
    timestamp: new Date().toISOString(),
    context
  }

  errorLogs.unshift(errorEvent)
  if (errorLogs.length > MAX_ERROR_LOGS) {
    errorLogs.pop()
  }

  // Dispatch to external Telemetry Endpoint if configured
  if (TELEMETRY_URL) {
    try {
      fetch(TELEMETRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorEvent)
      }).catch(_ => {})
    } catch (_) {}
  }

  return errorEvent
}

/**
 * Get Telemetry Summary Report
 * @returns {Object}
 */
export function getTelemetrySummary() {
  const metricsSummary = {}
  metrics.forEach((val, key) => {
    metricsSummary[key] = {
      count: val.count,
      avg: Number((val.sum / val.count).toFixed(2)),
      min: val.min,
      max: val.max
    }
  })

  return {
    uptimeSeconds: Math.floor(performance.now() / 1000),
    totalErrorsLogged: errorLogs.length,
    recentErrors: errorLogs.slice(0, 5),
    metrics: metricsSummary
  }
}

// Auto-instrument global unhandled rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason || 'Unhandled Promise Rejection', { source: 'window.unhandledrejection' })
  })
}
