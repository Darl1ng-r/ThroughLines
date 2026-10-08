import React, { memo } from 'react'
import { PenLine, Send, Lock, Globe, AlertCircle } from 'lucide-react'
import { moderateContent } from '../../services/contentModerationService'

const tokens = {
  paper: "var(--color-paper)",
  paperDeep: "var(--color-paper-deep)",
  card: "var(--color-card)",
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  pine: "var(--color-pine)",
  plum: "var(--color-plum)",
  plumSoft: "var(--color-plum-soft)",
  ember: "var(--color-ember)",
  line: "var(--color-line)",
}

const EntryComposer = memo(function EntryComposer({
  entriesCount,
  composeText,
  onComposeChange,
  composeConfidence,
  setComposeConfidence,
  composeShiftReason = null,
  setComposeShiftReason,
  composeVisibility,
  setComposeVisibility,
  onAddEntry,
  submitting = false,
  topicTitle = "",
  nudgeCount = 0
}) {
  const sliderColor = composeConfidence >= 70 ? tokens.pine : composeConfidence >= 40 ? '#56826E' : tokens.ember

  // Moderation check on active composition text
  const moderationResult = moderateContent(composeText)
  const isBlockedByModeration = composeVisibility === 'public' && moderationResult.isFlagged

  return (
    <div className="flex gap-4" style={{ position: "relative" }}>
      <div 
        style={{ 
          width: 12, 
          height: 12, 
          borderRadius: "50%", 
          border: `2px dashed ${tokens.ember}`, 
          boxShadow: `0 0 0 2px ${tokens.emberSoft}`,
          marginTop: 6, 
          flexShrink: 0 
        }} 
      />
      <div 
        className="tl-card-frosted tl-card-interactive"
        style={{ 
          flex: 1, 
          borderRadius: 14, 
          padding: "18px 20px",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 8 }}>
          <div className="flex items-center gap-1.5 flex-wrap" style={{ color: tokens.inkSoft }}>
            <PenLine size={13} />
            <span className="tl-mono" style={{ fontSize: 12 }}>
              {entriesCount === 0 ? "First entry" : "Add another log"}
            </span>
            {topicTitle && (
              <span className="tl-display" style={{ fontSize: 13, fontWeight: 600, color: tokens.ink, marginLeft: 4 }}>
                • {topicTitle}
              </span>
            )}
            {nudgeCount > 0 && (
              <span 
                className="tl-mono animate-fade-in" 
                style={{ 
                  fontSize: 11, 
                  background: tokens.ember, 
                  color: tokens.paper, 
                  padding: "1px 7px", 
                  borderRadius: 999, 
                  fontWeight: 600,
                  marginLeft: 6
                }}
              >
                🔔 {nudgeCount} waiting for update
              </span>
            )}
          </div>
        </div>
        
        <textarea
          value={composeText}
          disabled={submitting}
          maxLength={5000}
          aria-label="Journal entry content"
          onChange={(e) => onComposeChange(e.target.value)}
          placeholder="Why do you believe that — today? Your drafts are saved automatically."
          rows={3}
          className="tl-focus"
          style={{ 
            width: "100%", 
            resize: "none", 
            border: `1px solid ${tokens.line}`, 
            borderRadius: 6,
            padding: "8px 10px",
            outline: "none", 
            fontSize: 14.5, 
            lineHeight: 1.6, 
            fontFamily: "inherit", 
            background: tokens.paper, 
            color: tokens.ink, 
            marginBottom: 6,
            opacity: submitting ? 0.6 : 1 
          }}
        />
        
        {/* Confidence Slider */}
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft, whiteSpace: "nowrap" }}>How sure?</span>
          <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
            <input 
              type="range" 
              min="0" 
              max="100" 
              disabled={submitting}
              value={composeConfidence} 
              aria-label="Confidence rating percentage"
              aria-valuenow={composeConfidence}
              aria-valuemin={0}
              aria-valuemax={100}
              onChange={(e) => setComposeConfidence(Number(e.target.value))} 
              className="tl-range tl-focus" 
              style={{
                background: `linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${composeConfidence}%, var(--color-line) ${composeConfidence}%, var(--color-line) 100%)`
              }}
            />
          </div>
          <span 
            className="tl-mono" 
            style={{ 
              fontSize: 12, 
              fontWeight: 600,
              color: sliderColor, 
              width: 40, 
              textAlign: "right",
              transition: "color 0.2s ease"
            }}
          >
            {composeConfidence}%
          </span>
        </div>

        {/* Structured Shift Reason Scaffolding */}
        {setComposeShiftReason && (
          <div style={{ marginBottom: 12 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft }}>
                What influenced this conviction? <span style={{ opacity: 0.6 }}>(optional)</span>
              </span>
              {composeShiftReason && (
                <button
                  type="button"
                  onClick={() => setComposeShiftReason(null)}
                  className="tl-mono"
                  style={{ background: "none", border: "none", fontSize: 10, color: tokens.inkFaint, cursor: "pointer", textDecoration: "underline" }}
                >
                  clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'empirical_evidence', label: '📊 Empirical Data' },
                { id: 'counter_argument', label: '⚖️ Counter-Argument' },
                { id: 'real_world_event', label: '🌍 Real-World Event' },
                { id: 'value_shift', label: '💡 Value Shift' },
                { id: 'introspective_review', label: '🔍 Introspection' }
              ].map(reason => {
                const isActive = composeShiftReason === reason.id
                return (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => setComposeShiftReason(isActive ? null : reason.id)}
                    className="tl-focus btn-premium"
                    style={{
                      padding: "3px 9px",
                      borderRadius: 999,
                      fontSize: 11.5,
                      border: isActive ? `1px solid ${tokens.pine}` : `1px solid ${tokens.line}`,
                      background: isActive ? tokens.pineSoft : tokens.paperDeep,
                      color: isActive ? tokens.pine : tokens.inkSoft,
                      fontWeight: isActive ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {reason.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Community Guidelines Advisory Banner */}
        {composeVisibility === 'public' && moderationResult.isFlagged && (
          <div 
            className="flex items-start gap-2"
            style={{
              marginBottom: 12,
              padding: "9px 12px",
              borderRadius: 8,
              background: "rgba(140, 74, 58, 0.08)",
              border: "1px solid rgba(140, 74, 58, 0.28)",
              color: "var(--color-danger, #8C4A3A)",
              fontSize: 12.5,
              lineHeight: 1.45
            }}
          >
            <AlertCircle size={15} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontWeight: 600 }}>Community Notice:</strong>{" "}
              {moderationResult.reason} Please rephrase to publish publicly, or toggle to <strong>Private</strong>.
            </div>
          </div>
        )}

        {/* Visibility and Save Buttons */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Entry visibility" style={{ background: tokens.paperDeep, borderRadius: 999, padding: 3 }}>
            <button 
              disabled={submitting}
              type="button"
              role="radio"
              aria-checked={composeVisibility === "private"}
              aria-label="Set entry visibility to private"
              onClick={() => setComposeVisibility("private")} 
              className="tl-focus"
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: 12,
                background: composeVisibility === "private" ? tokens.plumSoft : "transparent",
                color: composeVisibility === "private" ? tokens.plum : tokens.inkSoft,
                fontWeight: composeVisibility === "private" ? 600 : 400
              }}
            >
              <Lock size={11} style={{ marginRight: 3, verticalAlign: "middle" }} /> Private
            </button>
            <button 
              disabled={submitting}
              type="button"
              role="radio"
              aria-checked={composeVisibility === "public"}
              aria-label="Set entry visibility to public"
              onClick={() => setComposeVisibility("public")} 
              className="tl-focus"
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: 12,
                background: composeVisibility === "public" ? tokens.pine : "transparent",
                color: composeVisibility === "public" ? tokens.paper : tokens.inkSoft,
                fontWeight: composeVisibility === "public" ? 600 : 400
              }}
            >
              <Globe size={11} style={{ marginRight: 3, verticalAlign: "middle" }} /> Public
            </button>
          </div>

          <button 
            type="button"
            onClick={onAddEntry}
            aria-label={submitting ? "Logging entry..." : "Log entry"}
            disabled={!composeText.trim() || submitting || isBlockedByModeration}
            className="tl-focus btn-premium flex items-center gap-1"
            title={isBlockedByModeration ? "Please rephrase flagged content or set visibility to Private" : undefined}
            style={{ 
              background: (composeText.trim() && !submitting && !isBlockedByModeration) ? tokens.pine : tokens.line, 
              color: (composeText.trim() && !submitting && !isBlockedByModeration) ? tokens.paper : tokens.inkFaint, 
              border: "none", 
              borderRadius: 8, 
              padding: "7px 14px", 
              fontSize: 13, 
              fontWeight: 500, 
              cursor: (composeText.trim() && !submitting && !isBlockedByModeration) ? "pointer" : "not-allowed" 
            }}
          >
            <Send size={13} /> {submitting ? "Logging entry..." : "Log entry"}
          </button>
        </div>
      </div>
    </div>
  )
})

export default EntryComposer
