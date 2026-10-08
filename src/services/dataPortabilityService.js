/**
 * ThroughLines Epistemic Data Portability & Archive Engine
 * 
 * Provides zero-dependency, client-side export capabilities:
 * 1. Full JSON Archive (lossless database schema export)
 * 2. Markdown Digest with YAML Frontmatter (Obsidian / Logseq compatible)
 */

export function formatArchiveJSON(profile = {}, topics = [], entries = []) {
  const exportPayload = {
    schemaVersion: '1.0.0',
    platform: 'ThroughLines',
    exportedAt: new Date().toISOString(),
    thinker: {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      bio: profile.bio,
      avatarUrl: profile.avatar_url
    },
    metrics: {
      totalTopics: topics.length,
      totalEntries: entries.length,
      publicCount: entries.filter(e => e.public_posts && e.public_posts.length > 0).length,
      privateCount: entries.filter(e => !e.public_posts || e.public_posts.length === 0).length
    },
    throughlines: topics.map(topic => {
      const topicEntries = entries
        .filter(e => e.topic_id === topic.id)
        .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())

      return {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        createdAt: topic.created_at,
        entriesCount: topicEntries.length,
        currentConviction: topicEntries.length > 0 ? topicEntries[topicEntries.length - 1].confidence_rating : null,
        entries: topicEntries.map(e => ({
          id: e.id,
          date: e.entry_date,
          confidenceRating: e.confidence_rating,
          shiftReason: e.shift_reason || null,
          isPublic: Boolean(e.public_posts && e.public_posts.length > 0),
          moderationStatus: e.public_posts?.[0]?.moderation_status || null,
          content: e.content,
          createdAt: e.created_at
        }))
      }
    })
  }

  return JSON.stringify(exportPayload, null, 2)
}

export function formatArchiveMarkdown(profile = {}, topics = [], entries = []) {
  const thinkerName = profile.display_name || profile.username || 'Thinker'
  const exportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  let md = `# Epistemic Archive: ${thinkerName}\n\n`
  md += `*Exported on ${exportDate} from ThroughLines*\n\n`
  if (profile.bio) {
    md += `> **Thinker Bio:** ${profile.bio}\n\n`
  }
  md += `---\n\n`

  topics.forEach((topic) => {
    const topicEntries = entries
      .filter(e => e.topic_id === topic.id)
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())

    const latestConviction = topicEntries.length > 0 ? topicEntries[topicEntries.length - 1].confidence_rating : 50

    md += `## Throughline: ${topic.title}\n\n`
    md += `\`\`\`yaml\n`
    md += `title: "${topic.title}"\n`
    md += `slug: "${topic.slug}"\n`
    md += `entries_count: ${topicEntries.length}\n`
    md += `current_conviction: ${latestConviction}%\n`
    md += `created_at: "${topic.created_at || new Date().toISOString()}"\n`
    md += `\`\`\`\n\n`

    if (topicEntries.length === 0) {
      md += `*No entries recorded for this throughline yet.*\n\n`
    } else {
      topicEntries.forEach((entry, idx) => {
        const prevEntry = idx > 0 ? topicEntries[idx - 1] : null
        const delta = prevEntry ? entry.confidence_rating - prevEntry.confidence_rating : null
        const deltaStr = delta !== null ? (delta > 0 ? ` (+${delta}%)` : ` (${delta}%)`) : ''
        const dateStr = new Date(entry.entry_date).toISOString().split('T')[0]
        const visibility = (entry.public_posts && entry.public_posts.length > 0) ? 'Public' : 'Private'
        const shiftReasonTag = entry.shift_reason ? ` • *Reason:* \`${entry.shift_reason.replace(/_/g, ' ')}\`` : ''

        md += `### ${dateStr} — ${entry.confidence_rating}% Conviction${deltaStr}\n`
        md += `*Status:* **${visibility}**${shiftReasonTag}\n\n`
        md += `${entry.content}\n\n`
        md += `---\n\n`
      })
    }
  })

  return md
}

export function downloadBrowserFile(content, filename, mimeType = 'text/plain') {
  if (typeof window === 'undefined' || !window.Blob) return false

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return true
}

export function downloadJSONArchive(profile, topics, entries) {
  const json = formatArchiveJSON(profile, topics, entries)
  const username = profile?.username || 'thinker'
  const dateStr = new Date().toISOString().split('T')[0]
  return downloadBrowserFile(json, `throughlines_${username}_${dateStr}.json`, 'application/json')
}

export function downloadMarkdownDigest(profile, topics, entries) {
  const md = formatArchiveMarkdown(profile, topics, entries)
  const username = profile?.username || 'thinker'
  const dateStr = new Date().toISOString().split('T')[0]
  return downloadBrowserFile(md, `throughlines_${username}_${dateStr}.md`, 'text/markdown')
}
