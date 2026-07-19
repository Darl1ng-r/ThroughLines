import React, { memo } from 'react'
import MarkdownText from '../MarkdownText'
import { Lock, Globe, AlertCircle } from 'lucide-react'

const tokens = {
  paper: "var(--color-paper)",
  card: "var(--color-card)",
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  inkFaint: "var(--color-ink-faint)",
  pine: "var(--color-pine)",
  plum: "var(--color-plum)",
  ember: "var(--color-ember)",
  danger: "var(--color-danger)",
  line: "var(--color-line)",
}

function Meter({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div style={{ width: 46, height: 4, borderRadius: 2, background: tokens.line, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: tokens.pine }} />
      </div>
      <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft }}>{value}% sure</span>
    </div>
  )
}

function VisibilityStatus({ visibility, status }) {
  if (visibility === 'private') {
    return (
      <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.plum, textTransform: "uppercase" }}>
        <Lock size={11} /> Private
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.ember, textTransform: "uppercase" }}>
        <span className="tl-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: tokens.ember, display: "inline-block" }} />
        Reviewing
      </span>
    )
  }
  if (status === 'flagged') {
    return (
      <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.danger, textTransform: "uppercase" }}>
        <AlertCircle size={11} /> Flagged
      </span>
    )
  }
  return (
    <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.pine, textTransform: "uppercase" }}>
      <Globe size={11} /> Public
    </span>
  )
}

const TimelineItem = memo(function TimelineItem({ entry, isSelected, onPublish, onUnpublish }) {
  const isPublic = entry.public_posts && entry.public_posts.length > 0
  const status = isPublic ? entry.public_posts[0].moderation_status : null

  let formattedDate = entry.entry_date
  try {
    const d = new Date(entry.entry_date)
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }
  } catch (_) {}

  return (
    <div id={`entry-${entry.id}`} className="tl-entry flex gap-4" style={{ position: "relative" }}>
      {/* Dot Indicator */}
      <div style={{ 
        width: 12, 
        height: 12, 
        borderRadius: "50%", 
        background: isSelected ? tokens.ember : (isPublic ? tokens.pine : tokens.card), 
        border: `2px solid ${isSelected ? tokens.ember : (isPublic ? tokens.pine : tokens.plum)}`, 
        flexShrink: 0, 
        marginTop: 6 
      }} />
      
      {/* Card */}
      <div 
        style={{ 
          flex: 1, 
          background: tokens.card, 
          border: isSelected ? `2px solid ${tokens.ember}` : `1px solid ${tokens.line}`, 
          borderRadius: 10, 
          padding: "14px 16px",
          transition: "all 0.2s ease" 
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 8 }}>
          <div className="flex items-center gap-3">
            <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>
              {formattedDate}
            </span>
            <Meter value={entry.confidence_rating} />
          </div>
          <VisibilityStatus visibility={isPublic ? 'public' : 'private'} status={status} />
        </div>
        
        <div style={{ fontSize: 14.5, color: tokens.ink, marginBottom: 10 }}>
          <MarkdownText content={entry.content} />
        </div>
        
        {/* Publish/Unpublish Action */}
        {!isPublic ? (
          <button 
            onClick={() => onPublish(entry)} 
            className="tl-focus flex items-center gap-1 btn-premium" 
            style={{ border: "none", background: "none", cursor: "pointer", color: tokens.pine, fontSize: 12, fontWeight: 500, padding: 0 }}
          >
            <Globe size={12} /> Publish this entry
          </button>
        ) : (
          <button 
            onClick={() => onUnpublish(entry)} 
            className="tl-focus flex items-center gap-1 btn-premium" 
            style={{ border: "none", background: "none", cursor: "pointer", color: tokens.inkSoft, fontSize: 12, fontWeight: 500, padding: 0 }}
          >
            <Lock size={12} /> Make private
          </button>
        )}
      </div>
    </div>
  )
})

export default TimelineItem
