import React from 'react'

const tokens = {
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  pine: "var(--color-pine)",
  card: "var(--color-card)",
  line: "var(--color-line)",
}

export default function MarkdownText({ content, className = "", style = {} }) {
  if (!content) return null

  // Process blocks: paragraphs, headings, blockquotes, lists
  const lines = content.split(/\r?\n|\\n/)
  const elements = []
  let currentList = []

  function flushList() {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} style={{ margin: '8px 0', paddingLeft: 20 }}>
          {currentList.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>{formatInline(item)}</li>
          ))}
        </ul>
      )
      currentList = []
    }
  }

  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#'
    const trimmed = url.trim()
    // Allow relative paths
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
    try {
      const parsed = new URL(trimmed, 'https://throughlines.app')
      if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        return trimmed
      }
    } catch (_) {}
    return '#'
  }

  function formatInline(text) {
    // Simple inline formatting: code, bold, italic, links
    const parts = []
    let remaining = text
    let key = 0

    // Regex matchers for code, bold, italic, links
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
    let match
    let lastIdx = 0

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.substring(lastIdx, match.index))
      }
      const token = match[0]
      if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code key={key++} className="tl-mono" style={{ background: "var(--color-paper-deep)", padding: "2px 6px", borderRadius: 4, fontSize: "0.9em" }}>
            {token.slice(1, -1)}
          </code>
        )
      } else if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(<em key={key++}>{token.slice(1, -1)}</em>)
      } else if (token.startsWith('[')) {
        const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/)
        if (linkMatch) {
          const safeHref = sanitizeUrl(linkMatch[2])
          parts.push(
            <a key={key++} href={safeHref} target="_blank" rel="noopener noreferrer" style={{ color: tokens.pine, textDecoration: 'underline' }}>
              {linkMatch[1]}
            </a>
          )
        } else {
          parts.push(token)
        }
      }
      lastIdx = regex.lastIndex
    }

    if (lastIdx < text.length) {
      parts.push(text.substring(lastIdx))
    }

    return parts.length > 0 ? parts : text
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.slice(2))
      return
    } else {
      flushList()
    }

    if (trimmed.startsWith('# ')) {
      elements.push(<h3 key={index} style={{ fontSize: 18, fontWeight: 700, margin: '12px 0 6px', color: tokens.ink }}>{formatInline(trimmed.slice(2))}</h3>)
    } else if (trimmed.startsWith('## ')) {
      elements.push(<h4 key={index} style={{ fontSize: 16, fontWeight: 600, margin: '10px 0 4px', color: tokens.ink }}>{formatInline(trimmed.slice(3))}</h4>)
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={index} style={{ borderLeft: `3px solid ${tokens.pine}`, paddingLeft: 12, margin: '8px 0', color: tokens.inkSoft, fontStyle: 'italic' }}>
          {formatInline(trimmed.slice(2))}
        </blockquote>
      )
    } else if (trimmed === '') {
      elements.push(<div key={index} style={{ height: 6 }} />)
    } else {
      elements.push(<p key={index} style={{ margin: '4px 0', lineHeight: 1.6 }}>{formatInline(line)}</p>)
    }
  })

  flushList()

  return (
    <div className={`tl-markdown ${className}`} style={style}>
      {elements}
    </div>
  )
}
