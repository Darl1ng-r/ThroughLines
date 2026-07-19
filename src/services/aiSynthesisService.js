/**
 * ThroughLines AI Perspective Evolution Synthesis Engine
 */

export function generatePerspectiveSynthesis(topicTitle, entries) {
  if (!entries || entries.length === 0) {
    return {
      summary: "No entries available to analyze.",
      pivots: [],
      themes: [],
      stabilityScore: 100,
      reflectionPrompt: "What is your initial hypothesis on this topic?"
    }
  }

  const sorted = [...entries].sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))
  const first = sorted[0]
  const latest = sorted[sorted.length - 1]
  const startConf = first.confidence_rating ?? 50
  const latestConf = latest.confidence_rating ?? 50
  const totalShift = latestConf - startConf

  // Detect pivots (> 15% change)
  const pivots = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const delta = curr.confidence_rating - prev.confidence_rating
    if (Math.abs(delta) >= 15) {
      pivots.push({
        date: curr.entry_date,
        delta,
        from: prev.confidence_rating,
        to: curr.confidence_rating,
        textSnippet: (curr.content || "").slice(0, 100) + "..."
      })
    }
  }

  // Extract themes (most frequent words > 4 chars excluding common stopwords)
  const stopwords = new Set(["about", "above", "after", "again", "against", "all", "also", "and", "any", "are", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "cannot", "could", "did", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have", "having", "here", "how", "into", "is", "its", "just", "more", "most", "other", "our", "out", "over", "same", "should", "some", "such", "than", "that", "the", "their", "theirs", "them", "then", "there", "these", "they", "this", "those", "through", "under", "until", "very", "was", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "with", "would", "your"])

  const wordCounts = {}
  sorted.forEach(e => {
    const words = (e.content || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)
    words.forEach(w => {
      if (w.length > 4 && !stopwords.has(w)) {
        wordCounts[w] = (wordCounts[w] || 0) + 1
      }
    })
  })

  const topThemes = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1))

  // Calculate variance/stability
  let totalDeltaSum = 0
  for (let i = 1; i < sorted.length; i++) {
    totalDeltaSum += Math.abs(sorted[i].confidence_rating - sorted[i - 1].confidence_rating)
  }
  const avgVolatility = sorted.length > 1 ? totalDeltaSum / (sorted.length - 1) : 0
  const stabilityScore = Math.max(0, Math.round(100 - (avgVolatility * 2)))

  // Generate structured textual summary
  let trajectoryDesc = "held stable"
  if (totalShift > 15) trajectoryDesc = "strengthened significantly (+ " + totalShift + "%)"
  else if (totalShift > 5) trajectoryDesc = "gradually increased (+ " + totalShift + "%)"
  else if (totalShift < -15) trajectoryDesc = "weakened significantly (" + totalShift + "%)"
  else if (totalShift < -5) trajectoryDesc = "gradually declined (" + totalShift + "%)"

  const summary = `Over ${sorted.length} journal entries starting from ${first.entry_date}, your conviction on "${topicTitle}" has ${trajectoryDesc}. Initial baseline conviction started at ${startConf}% and is currently recorded at ${latestConf}%.`

  // Generate reflection prompt
  let reflectionPrompt = "What additional evidence would further refine your conviction on this topic?"
  if (pivots.length > 0) {
    const lastPivot = pivots[pivots.length - 1]
    reflectionPrompt = `Your last major pivot was on ${lastPivot.date} (${lastPivot.delta > 0 ? '+' : ''}${lastPivot.delta}%). Has any recent event challenged or validated that pivot?`
  } else if (sorted.length >= 3 && stabilityScore > 85) {
    reflectionPrompt = "Your belief has remained remarkably constant. What counter-arguments might test your current perspective?"
  }

  return {
    summary,
    pivots,
    themes: topThemes,
    stabilityScore,
    reflectionPrompt,
    totalEntries: sorted.length,
    startConf,
    latestConf,
    totalShift
  }
}
