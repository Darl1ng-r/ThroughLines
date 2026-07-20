import { describe, it, expect } from 'vitest'
import { logMetric, logError, getTelemetrySummary } from '../telemetryService'

describe('telemetryService', () => {
  it('records metrics and calculates min/max/avg', () => {
    logMetric('api_latency_ms', 120)
    logMetric('api_latency_ms', 80)
    logMetric('api_latency_ms', 200)

    const summary = getTelemetrySummary()
    expect(summary.metrics.api_latency_ms.count).toBe(3)
    expect(summary.metrics.api_latency_ms.avg).toBe(133.33)
    expect(summary.metrics.api_latency_ms.min).toBe(80)
    expect(summary.metrics.api_latency_ms.max).toBe(200)
  })

  it('records error events cleanly', () => {
    const err = new Error('Test database timeout')
    const logged = logError(err, { component: 'Dashboard' })

    expect(logged.message).toBe('Test database timeout')
    expect(logged.context.component).toBe('Dashboard')

    const summary = getTelemetrySummary()
    expect(summary.totalErrorsLogged).toBeGreaterThan(0)
    expect(summary.recentErrors[0].message).toBe('Test database timeout')
  })
})
