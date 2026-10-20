import React from 'react'

const tokens = {
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  pine: "var(--color-pine)",
  card: "var(--color-card)",
  line: "var(--color-line)",
}

const INLINE_REGEX = /(`[^`\r\n]+`|\*{1,2}[^\r\n*]+\*{1,2}|\[[^\r\n\]]+\]\([^)\s]+\))/g
const LINK_INNER_REGEX = /^\[([^\]]+)\]\(([^)\s]+)\)$/

function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#'
  // Strip control, zero-width, and non-printable characters
  const cleaned = url.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF\u2060]/g, '').trim()
  if (cleaned.startsWith('//') || cleaned.startsWith('/\\')) return '#'
  
  // Guard against obscured script protocols
  const lower = cleaned.toLowerCase()
  if (lower.includes('javascript:') || lower.includes('data:') || lower.includes('vbscript:')) {
    return '#'
  }

  // Allow relative paths and hash anchors
  if (cleaned.startsWith('/') || cleaned.startsWith('#')) return cleaned

  try {
    const parsed = new URL(cleaned)
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return cleaned
    }
  } catch {
    // Gracefully fallback to safe anchor on invalid or malformed URL formats
  }
  return '#'
}

function renderToken(token, key) {
  if (token.startsWith('`') && token.endsWith('`')) {
    return (
      <code
        key={key}
        className="tl-mono"
        style={{
          background: "var(--color-paper-deep)",
          padding: "2px 6px",
          borderRadius: 4,
          fontSize: "0.9em"
        }}
      >
        {token.slice(1, -1)}
      </code>
    )
  }

  if (token.startsWith('**') && token.endsWith('**')) {
    return <strong key={key}>{token.slice(2, -2)}</strong>
  }

  if (token.startsWith('*') && token.endsWith('*')) {
    return <em key={key}>{token.slice(1, -1)}</em>
  }

  if (token.startsWith('[')) {
    const linkMatch = LINK_INNER_REGEX.exec(token)
    if (linkMatch) {
      const safeHref = sanitizeUrl(linkMatch[2])
      return (
        <a
          key={key}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: tokens.pine, textDecoration: 'underline' }}
        >
          {linkMatch[1]}
        </a>
      )
    }
  }

  return token
}

function formatInline(text) {
  const parts = []
  let key = 0
  let lastIdx = 0

  INLINE_REGEX.lastIndex = 0
  let match = INLINE_REGEX.exec(text)

  while (match !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index))
    }
    parts.push(renderToken(match[0], key++))
    lastIdx = INLINE_REGEX.lastIndex
    match = INLINE_REGEX.exec(text)
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx))
  }

  return parts.length > 0 ? parts : text
}

export default function MarkdownText({ content, className = "", style = {} }) {
  if (!content) return null

  // Process blocks: paragraphs, headings, blockquotes, lists
  const lines = content.split(/\r?\n|\\n/)
  const elements = []
  let currentList = []

  function flushList() {
    if (currentList.length > 0) {
      const listIndex = elements.length
      elements.push(
        <ul key={`ul-${listIndex}`} style={{ margin: '8px 0', paddingLeft: 20 }}>
          {currentList.map((item, idx) => (
            <li key={`li-${listIndex}-${idx}-${item.slice(0, 8)}`} style={{ marginBottom: 4 }}>
              {formatInline(item)}
            </li>
          ))}
        </ul>
      )
      currentList = []
    }
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    const blockKey = `blk-${index}-${trimmed.slice(0, 10)}`

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.slice(2))
      return
    }

    flushList()

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h3 key={blockKey} style={{ fontSize: 18, fontWeight: 700, margin: '12px 0 6px', color: tokens.ink }}>
          {formatInline(trimmed.slice(2))}
        </h3>
      )
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h4 key={blockKey} style={{ fontSize: 16, fontWeight: 600, margin: '10px 0 4px', color: tokens.ink }}>
          {formatInline(trimmed.slice(3))}
        </h4>
      )
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={blockKey}
          style={{ borderLeft: `3px solid ${tokens.pine}`, paddingLeft: 12, margin: '8px 0', color: tokens.inkSoft, fontStyle: 'italic' }}
        >
          {formatInline(trimmed.slice(2))}
        </blockquote>
      )
    } else if (trimmed === '') {
      elements.push(<div key={blockKey} style={{ height: 6 }} />)
    } else {
      elements.push(
        <p key={blockKey} style={{ margin: '4px 0', lineHeight: 1.6 }}>
          {formatInline(line)}
        </p>
      )
    }
  })

  flushList()

  return (
    <div className={`tl-markdown ${className}`} style={style}>
      {elements}
    </div>
  )
}
