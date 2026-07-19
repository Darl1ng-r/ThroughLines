import { describe, it, expect } from 'vitest'
import { generatePerspectiveSynthesis } from '../aiSynthesisService'

describe('aiSynthesisService', () => {
  it('handles empty entries gracefully', () => {
    const res = generatePerspectiveSynthesis('Test Topic', [])
    expect(res.totalEntries).toBeUndefined()
    expect(res.stabilityScore).toBe(100)
    expect(res.summary).toContain('No entries available')
  })

  it('correctly calculates trajectory, shift, and pivots', () => {
    const mockEntries = [
      { id: '1', entry_date: '2026-01-01', confidence_rating: 40, content: 'Initial hypothesis on neural architecture' },
      { id: '2', entry_date: '2026-02-01', confidence_rating: 70, content: 'Strong breakthrough results seen in training' },
      { id: '3', entry_date: '2026-03-01', confidence_rating: 85, content: 'Validated in production environment' }
    ]

    const res = generatePerspectiveSynthesis('AI Scalability', mockEntries)
    expect(res.totalEntries).toBe(3)
    expect(res.startConf).toBe(40)
    expect(res.latestConf).toBe(85)
    expect(res.totalShift).toBe(45)
    expect(res.summary).toContain('strengthened significantly')
    expect(res.pivots.length).toBeGreaterThan(0)
    expect(res.themes.length).toBeGreaterThan(0)
  })
})
