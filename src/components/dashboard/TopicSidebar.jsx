import React, { memo } from 'react'
import { Plus, X, Lock, Globe } from 'lucide-react'

const tokens = {
  paper: "var(--color-paper)",
  paperDeep: "var(--color-paper-deep)",
  card: "var(--color-card)",
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  inkFaint: "var(--color-ink-faint)",
  pine: "var(--color-pine)",
  pineSoft: "var(--color-pine-soft)",
  ember: "var(--color-ember)",
  line: "var(--color-line)",
}

const TopicSidebar = memo(function TopicSidebar({
  topics,
  selectedId,
  onSelectTopic,
  nudges,
  showNewTopic,
  setShowNewTopic,
  newTopicTitle,
  setNewTopicTitle,
  onCreateTopic,
  loadingTopics
}) {
  return (
    <div 
      style={{ 
        width: 260, 
        borderRight: `1px solid ${tokens.line}`, 
        background: tokens.card, 
        display: "flex", 
        flexDirection: "column" 
      }}
      className="no-print"
    >
      {/* Header & Add Button */}
      <div className="flex items-center justify-between" style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${tokens.line}` }}>
        <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Throughlines
        </span>
        <button 
          onClick={() => setShowNewTopic(true)}
          className="tl-focus btn-premium flex items-center gap-1"
          style={{ 
            background: tokens.pine, 
            color: tokens.paper, 
            border: "none", 
            borderRadius: 6, 
            padding: "4px 8px", 
            fontSize: 12, 
            fontWeight: 500, 
            cursor: "pointer" 
          }}
        >
          <Plus size={13} /> New
        </button>
      </div>

      {/* New Topic Inline Composer */}
      {showNewTopic && (
        <div style={{ padding: 12, borderBottom: `1px solid ${tokens.line}`, background: tokens.paper }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>New Throughline</span>
            <button onClick={() => setShowNewTopic(false)} style={{ border: "none", background: "none", cursor: "pointer" }}>
              <X size={13} color={tokens.inkSoft} />
            </button>
          </div>
          <input 
            type="text" 
            value={newTopicTitle} 
            onChange={(e) => setNewTopicTitle(e.target.value)} 
            placeholder="e.g. AGI Alignment" 
            className="tl-focus"
            style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${tokens.line}`, fontSize: 13, marginBottom: 8, background: tokens.card }}
            autoFocus 
            onKeyDown={(e) => e.key === 'Enter' && onCreateTopic()}
          />
          <button 
            onClick={onCreateTopic} 
            className="tl-focus btn-premium"
            style={{ width: "100%", padding: "6px", background: tokens.pine, color: tokens.paper, border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
          >
            Create
          </button>
        </div>
      )}

      {/* Topic List */}
      <div className="tl-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {loadingTopics ? (
          <div className="tl-mono" style={{ padding: "16px", fontSize: 12, color: tokens.inkSoft, textAlign: "center" }}>
            Loading throughlines...
          </div>
        ) : topics.length === 0 ? (
          <div className="tl-mono" style={{ padding: "16px", fontSize: 12, color: tokens.inkFaint, textAlign: "center" }}>
            No topics yet. Click "+ New" to begin.
          </div>
        ) : (
          topics.map(t => {
            const isSelected = t.id === selectedId
            const nudgeCount = nudges.filter(n => n.topic_id === t.id).length
            return (
              <button
                key={t.id}
                onClick={() => onSelectTopic(t.id)}
                className="tl-focus flex items-center justify-between"
                style={{ 
                  width: "100%", 
                  padding: "10px 16px", 
                  border: "none", 
                  background: isSelected ? tokens.paperDeep : "transparent", 
                  color: isSelected ? tokens.ink : tokens.inkSoft, 
                  cursor: "pointer", 
                  textAlign: "left", 
                  fontSize: 13.5, 
                  fontWeight: isSelected ? 600 : 400,
                  borderLeft: isSelected ? `3px solid ${tokens.pine}` : "3px solid transparent"
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.title}
                </span>

                {nudgeCount > 0 && (
                  <span 
                    className="tl-mono" 
                    style={{ 
                      fontSize: 10, 
                      background: tokens.ember, 
                      color: tokens.paper, 
                      padding: "2px 6px", 
                      borderRadius: 999, 
                      fontWeight: 600,
                      marginLeft: 8,
                      flexShrink: 0
                    }}
                    title={`${nudgeCount} nudge${nudgeCount > 1 ? 's' : ''} received`}
                  >
                    {nudgeCount}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
})

export default TopicSidebar
