import React, { memo, useState } from 'react'
import { Plus, X, Lock, Globe, Edit2, Trash2, Check } from 'lucide-react'

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
  danger: "var(--color-danger)",
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
  loadingTopics,
  onRenameTopic,
  onDeleteTopic
}) {
  const [editingTopicId, setEditingTopicId] = useState(null)
  const [editTitle, setEditTitle] = useState("")

  function handleStartRename(topic, e) {
    e.stopPropagation()
    setEditingTopicId(topic.id)
    setEditTitle(topic.title)
  }

  function handleSaveRename(topicId, e) {
    e.stopPropagation()
    if (editTitle.trim() && onRenameTopic) {
      onRenameTopic(topicId, editTitle.trim())
    }
    setEditingTopicId(null)
  }

  function handleDelete(topic, e) {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to delete "${topic.title}"? All entries in this throughline will be permanently removed.`)) {
      if (onDeleteTopic) onDeleteTopic(topic.id)
    }
  }

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
            const isEditingThis = editingTopicId === t.id

            if (isEditingThis) {
              return (
                <div 
                  key={t.id}
                  style={{
                    padding: "6px 12px",
                    background: tokens.paper,
                    borderBottom: `1px solid ${tokens.line}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                    className="tl-focus"
                    style={{
                      flex: 1,
                      padding: "4px 6px",
                      borderRadius: 4,
                      border: `1px solid ${tokens.line}`,
                      fontSize: 13,
                      background: tokens.card
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(t.id, e)
                      if (e.key === 'Escape') setEditingTopicId(null)
                    }}
                  />
                  <button onClick={(e) => handleSaveRename(t.id, e)} style={{ border: "none", background: "none", cursor: "pointer" }} title="Save">
                    <Check size={14} color={tokens.pine} />
                  </button>
                  <button onClick={() => setEditingTopicId(null)} style={{ border: "none", background: "none", cursor: "pointer" }} title="Cancel">
                    <X size={14} color={tokens.inkSoft} />
                  </button>
                </div>
              )
            }

            return (
              <div
                key={t.id}
                onClick={() => onSelectTopic(t.id)}
                className="tl-focus flex items-center justify-between group"
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
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {t.title}
                </span>

                <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
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
                        marginLeft: 4
                      }}
                      title={`${nudgeCount} nudge${nudgeCount > 1 ? 's' : ''} received`}
                    >
                      {nudgeCount}
                    </span>
                  )}

                  {isSelected && (
                    <div className="flex items-center gap-1" style={{ marginLeft: 4 }}>
                      <button 
                        onClick={(e) => handleStartRename(t, e)}
                        style={{ border: "none", background: "none", cursor: "pointer", padding: 2 }}
                        title="Rename topic"
                      >
                        <Edit2 size={12} color={tokens.inkSoft} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(t, e)}
                        style={{ border: "none", background: "none", cursor: "pointer", padding: 2 }}
                        title="Delete topic"
                      >
                        <Trash2 size={12} color={tokens.danger} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
})

export default TopicSidebar
