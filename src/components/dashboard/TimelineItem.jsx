import React, { memo, useState } from 'react'
import MarkdownText from '../MarkdownText'
import { Lock, Globe, AlertCircle, Edit3, Check, X, History, ChevronDown, ChevronUp } from 'lucide-react'
import { moderateContent } from '../../services/contentModerationService'
import { supabase } from '../../services/supabaseClient'

const tokens = {
  paper: "var(--color-paper)",
  card: "var(--color-card)",
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  inkFaint: "var(--color-ink-faint)",
  pine: "var(--color-pine)",
  plum: "var(--color-plum)",
  ember: "var(--color-ember)",
  emberSoft: "var(--color-ember-soft)",
  danger: "var(--color-danger)",
  line: "var(--color-line)",
}

const SHIFT_REASONS = {
  empirical_data: { label: 'Empirical Data', icon: '📊' },
  counter_argument: { label: 'Counter-Argument', icon: '⚖️' },
  real_world_event: { label: 'Real-World Event', icon: '🌍' },
  value_shift: { label: 'Value Shift', icon: '💡' },
  introspection: { label: 'Introspection', icon: '🔍' },
}

function Meter({ value }) {
  const barColor = value >= 70 ? tokens.pine : value >= 40 ? "#56826E" : tokens.ember
  return (
    <div className="flex items-center gap-2">
      <div style={{ width: 48, height: 5, borderRadius: 3, background: tokens.line, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.3s ease" }} />
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
  if (status === 'rejected') {
    return (
      <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.danger, textTransform: "uppercase" }}>
        <AlertCircle size={11} /> Rejected
      </span>
    )
  }
  return (
    <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.pine, textTransform: "uppercase" }}>
      <Globe size={11} /> Public
    </span>
  )
}

const TimelineItem = memo(function TimelineItem({ 
  entry, 
  isSelected, 
  onPublish, 
  onUnpublish, 
  onUpdate,
  isLatest = false,
  nudges = []
}) {
  const isPublic = entry.public_posts && entry.public_posts.length > 0
  const status = isPublic ? entry.public_posts[0].moderation_status : null

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(entry.content)
  const [editConfidence, setEditConfidence] = useState(entry.confidence_rating)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState(null)
  const [showRevisions, setShowRevisions] = useState(false)
  const [revisions, setRevisions] = useState(null)
  const [loadingRevisions, setLoadingRevisions] = useState(false)

  const nodeColor = isSelected 
    ? tokens.ember 
    : (entry.confidence_rating >= 70 ? tokens.pine : entry.confidence_rating >= 40 ? '#56826E' : tokens.ember)

  let formattedDate = entry.entry_date
  try {
    const d = new Date(entry.entry_date)
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }
  } catch (_) {}

  async function handleToggleRevisions() {
    if (showRevisions) {
      setShowRevisions(false)
      return
    }

    setShowRevisions(true)
    if (revisions === null) {
      setLoadingRevisions(true)
      try {
        const { data, error } = await supabase
          .from('entry_revisions')
          .select('*')
          .eq('entry_id', entry.id)
          .order('revised_at', { ascending: false })

        if (!error && data) {
          setRevisions(data)
        } else {
          setRevisions([])
        }
      } catch (e) {
        console.warn('Could not load entry revisions:', e)
        setRevisions([])
      } finally {
        setLoadingRevisions(false)
      }
    }
  }

  async function handleSaveEdit() {
    const trimmed = editContent.trim()
    if (!trimmed || saving) return
    setEditError(null)

    if (isPublic) {
      const contentMod = moderateContent(trimmed)
      if (!contentMod.isValid) {
        setEditError(contentMod.reason)
        return
      }
    }

    try {
      setSaving(true)
      if (onUpdate) {
        await onUpdate(entry.id, trimmed, Number(editConfidence))
      }
      setIsEditing(false)
      // Invalidate cached revisions so next click reflects new revision log
      setRevisions(null)
    } catch (err) {
      console.error('Save edit error:', err)
      setEditError('Failed to save edit.')
    } finally {
      setSaving(false)
    }
  }

  const shiftInfo = entry.shift_reason ? SHIFT_REASONS[entry.shift_reason] : null

  return (
    <div id={`entry-${entry.id}`} className="tl-entry flex gap-4" style={{ position: "relative" }}>
      {/* Illuminated Thread Node */}
      <div 
        style={{ 
          width: 12, 
          height: 12, 
          borderRadius: "50%", 
          background: isSelected ? tokens.ember : (isPublic ? nodeColor : tokens.card), 
          border: `2.5px solid ${isSelected ? tokens.ember : nodeColor}`, 
          boxShadow: isLatest 
            ? `0 0 0 3px ${nodeColor}33, 0 0 8px ${nodeColor}44` 
            : (isSelected ? `0 0 0 3px ${tokens.ember}33` : "none"),
          flexShrink: 0, 
          marginTop: 6,
          transition: "all 0.25s ease"
        }} 
        title={`${entry.confidence_rating}% conviction`}
      />
      
      {/* Card */}
      <div 
        className="tl-card tl-card-interactive"
        style={{ 
          flex: 1, 
          background: tokens.card, 
          border: isSelected ? `2px solid ${tokens.ember}` : `1px solid ${tokens.line}`, 
          borderRadius: 12, 
          padding: "16px 18px",
          boxShadow: isSelected ? "var(--shadow-hover)" : "var(--shadow-card)",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)" 
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 8 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>
              {formattedDate}
            </span>
            <Meter value={isEditing ? editConfidence : entry.confidence_rating} />
            {shiftInfo && (
              <span 
                className="tl-mono flex items-center gap-1"
                style={{
                  fontSize: 11,
                  padding: "1px 7px",
                  borderRadius: 6,
                  background: "rgba(74, 107, 90, 0.1)",
                  color: tokens.pine,
                  border: `1px solid rgba(74, 107, 90, 0.22)`,
                  fontWeight: 500
                }}
                title={`Attributed shift reason: ${shiftInfo.label}`}
              >
                <span>{shiftInfo.icon}</span>
                <span>{shiftInfo.label}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={handleToggleRevisions}
                  className="tl-focus flex items-center gap-1 btn-premium"
                  style={{ border: "none", background: "none", cursor: "pointer", color: tokens.inkSoft, fontSize: 11, fontWeight: 500, padding: 0 }}
                  title="View revision audit trail"
                >
                  <History size={12} /> {showRevisions ? 'Hide Audit' : 'History'}
                </button>
                <button
                  onClick={() => { setEditContent(entry.content); setEditConfidence(entry.confidence_rating); setIsEditing(true); }}
                  className="tl-focus flex items-center gap-1 btn-premium"
                  style={{ border: "none", background: "none", cursor: "pointer", color: tokens.inkSoft, fontSize: 11, fontWeight: 500, padding: 0 }}
                  title="Edit entry"
                >
                  <Edit3 size={12} /> Edit
                </button>
              </>
            )}
            <VisibilityStatus visibility={isPublic ? 'public' : 'private'} status={status} />
          </div>
        </div>
        
        {isEditing ? (
          <div className="flex flex-col gap-3" style={{ margin: "10px 0" }}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="tl-focus tl-input"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${tokens.line}`,
                background: tokens.paper,
                fontSize: 14,
                fontFamily: "inherit",
                color: tokens.ink,
                resize: "vertical"
              }}
            />

            {editError && (
              <div 
                style={{
                  fontSize: 12,
                  color: "var(--color-danger, #8C4A3A)",
                  background: "rgba(140, 74, 58, 0.08)",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(140, 74, 58, 0.28)",
                  lineHeight: 1.4
                }}
              >
                <strong>Community Notice:</strong> {editError}
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft }}>Confidence: {editConfidence}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editConfidence}
                  onChange={(e) => setEditConfidence(Number(e.target.value))}
                  style={{ width: 100, accentColor: tokens.pine, cursor: "pointer" }}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="tl-focus flex items-center gap-1 btn-premium"
                  style={{ border: `1px solid ${tokens.line}`, background: "transparent", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: tokens.inkSoft }}
                >
                  <X size={12} /> Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editContent.trim()}
                  className="tl-focus flex items-center gap-1 btn-premium"
                  style={{ border: "none", background: tokens.pine, color: tokens.paper, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer" }}
                >
                  <Check size={12} /> {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14.5, color: tokens.ink, marginBottom: 10 }}>
            <MarkdownText content={entry.content} />
          </div>
        )}
        
        {/* Immutable Revision History Audit Trail */}
        {showRevisions && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: 12,
              marginBottom: 12,
              padding: "12px 14px",
              borderRadius: 8,
              background: "rgba(0, 0, 0, 0.03)",
              border: `1px solid ${tokens.line}`,
              borderLeft: `3px solid ${tokens.pine}`
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span className="tl-mono" style={{ fontSize: 11, fontWeight: 600, color: tokens.inkSoft, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Immutable Audit Trail ({revisions ? revisions.length : '...'})
              </span>
              <button
                onClick={() => setShowRevisions(false)}
                className="tl-focus btn-premium"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.inkFaint, fontSize: 11, padding: 0 }}
              >
                Close
              </button>
            </div>

            {loadingRevisions ? (
              <div className="tl-mono" style={{ fontSize: 12, color: tokens.inkSoft }}>Loading immutable revision ledger...</div>
            ) : !revisions || revisions.length === 0 ? (
              <div className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>
                No prior revisions recorded. This entry stands at original creation state.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {revisions.map((rev) => {
                  let revDate = rev.revised_at
                  try {
                    revDate = new Date(rev.revised_at).toLocaleString()
                  } catch (_) {}
                  return (
                    <div
                      key={rev.id}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: tokens.card,
                        border: `1px solid ${tokens.line}`,
                        fontSize: 12.5
                      }}
                    >
                      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                        <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft }}>
                          Prior Conviction: <strong>{rev.prior_confidence}%</strong>
                        </span>
                        <span className="tl-mono" style={{ fontSize: 10, color: tokens.inkFaint }}>
                          Revised {revDate}
                        </span>
                      </div>
                      <div style={{ color: tokens.ink, fontSize: 13, fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                        &ldquo;{rev.prior_content}&rdquo;
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        
        {/* Publish/Unpublish Action */}
        {!isEditing && (
          !isPublic ? (
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
          )
        )}

        {/* Nudge Indicator on Latest Entry */}
        {isLatest && nudges && nudges.length > 0 && (
          <div 
            className="flex items-center gap-2 animate-fade-in"
            style={{
              background: tokens.emberSoft,
              border: `1px solid ${tokens.ember}33`,
              borderRadius: 8,
              padding: "8px 12px",
              marginTop: 12
            }}
          >
            <span style={{ fontSize: 13 }}>🔔</span>
            <span className="tl-mono" style={{ fontSize: 12, color: tokens.ember, fontWeight: 500 }}>
              <strong>{nudges.length} {nudges.length === 1 ? 'reader wants' : 'readers want'}</strong> an update after this log:
              {" "}
              {nudges.slice(0, 3).map(n => `@${n.nudger?.username || 'reader'}`).join(', ')}
              {nudges.length > 3 ? ` +${nudges.length - 3} more` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
})

export default TimelineItem
