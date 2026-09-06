/**
 * Macro Belief Trend Analytics Engine
 * Computes velocity, volatility standard deviation, and evolution trends over throughlines.
 */

/**
 * Run macro analytics over public topics
 * @param {Array} topics 
 * @returns {Promise<{ totalTopics: number, avgShift: number, macroVelocity: string, macroVolatility: number, topEvolved: Array }>}
 */
export async function computeMacroBeliefTrends(topics = []) {
  if (!topics || topics.length === 0) {
    return {
      totalTopics: 0,
      avgShift: 0,
      macroVelocity: '0.0% / day',
      macroVolatility: 0,
      topEvolved: []
    }
  }

  let totalShiftSum = 0
  let totalVelocitySum = 0

  const processed = topics.map(t => {
    const shift = t.delta || 0
    const spanDays = Math.max(1, t.daysAgo || 1)
    const velocity = shift / spanDays

    totalShiftSum += shift
    totalVelocitySum += velocity

    return {
      id: t.id,
      title: t.title,
      username: t.profiles?.username || 'anonymous',
      shift,
      velocity
    }
  })

  const count = processed.length
  const avgShift = Number((totalShiftSum / count).toFixed(1))
  const avgVelocity = Number((totalVelocitySum / count).toFixed(2))

  // Compute volatility standard deviation
  const variance = processed.reduce((acc, curr) => acc + Math.pow(curr.shift - avgShift, 2), 0) / count
  const macroVolatility = Number(Math.sqrt(variance).toFixed(1))

  const topEvolved = [...processed]
    .sort((a, b) => b.shift - a.shift)
    .slice(0, 3)

  return {
    totalTopics: count,
    avgShift,
    macroVelocity: `+${avgVelocity}% / day`,
    macroVolatility,
    topEvolved
  }
}
