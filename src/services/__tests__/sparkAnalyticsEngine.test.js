import { describe, it, expect } from 'vitest'
import { computeMacroBeliefTrends } from '../sparkAnalyticsEngine'

describe('sparkAnalyticsEngine', () => {
  const mockTopics = [
    { id: '1', title: 'AI Scaling Laws', delta: 35, daysAgo: 5, profiles: { username: 'ai_researcher' } },
    { id: '2', title: 'Quantum Computing', delta: 15, daysAgo: 10, profiles: { username: 'physicist' } },
    { id: '3', title: 'Macro Economics', delta: 10, daysAgo: 2, profiles: { username: 'economist' } }
  ]

  it('handles empty topics list gracefully', async () => {
    const res = await computeMacroBeliefTrends([])
    expect(res.totalTopics).toBe(0)
    expect(res.avgShift).toBe(0)
    expect(res.topEvolved.length).toBe(0)
  })

  it('correctly calculates avgShift, macroVelocity, and volatility', async () => {
    const res = await computeMacroBeliefTrends(mockTopics)
    expect(res.totalTopics).toBe(3)
    expect(res.avgShift).toBe(20) // (35 + 15 + 10) / 3 = 20
    expect(res.topEvolved[0].title).toBe('AI Scaling Laws')
    expect(res.macroVelocity).toContain('% / day')
  })
})
