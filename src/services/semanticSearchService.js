/**
 * Semantic & Fuzzy Search Engine for Discover Throughlines
 */

/**
 * Perform semantic & fuzzy search over Discover feed items
 * @param {Array} feedItems 
 * @param {string} query 
 * @returns {Array} Filtered and relevance-ranked feed items
 */
export function searchFeed(feedItems = [], query = '') {
  if (!query || !query.trim()) return feedItems

  const terms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (terms.length === 0) return feedItems

  const scored = feedItems.map(item => {
    let relevanceScore = 0

    const titleLower = (item.title || '').toLowerCase()
    const authorLower = (item.profiles?.username || '').toLowerCase()
    const contentLower = (item.latestPost?.content || '').toLowerCase()
    const badgeLower = (item.badge || '').toLowerCase()

    terms.forEach(term => {
      // 1. Exact title match (Highest Weight)
      if (titleLower === term) relevanceScore += 50
      else if (titleLower.includes(term)) relevanceScore += 25

      // 2. Author username match
      if (authorLower.includes(term)) relevanceScore += 20

      // 3. Content matching
      if (contentLower.includes(term)) relevanceScore += 10

      // 4. Badge matching
      if (badgeLower.includes(term)) relevanceScore += 5

      // 5. Fuzzy character overlap matching
      if (term.length >= 4) {
        const titleWords = titleLower.split(/\s+/)
        titleWords.forEach(w => {
          if (w.startsWith(term.slice(0, 3))) relevanceScore += 8
        })
      }
    })

    return { item, relevanceScore }
  })

  return scored
    .filter(s => s.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .map(s => s.item)
}
