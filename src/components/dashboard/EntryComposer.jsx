import React, { memo } from 'react'
import { PenLine, Send, Lock, Globe } from 'lucide-react'

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
  composeVisibility,
  setComposeVisibility,
  onAddEntry
}) {
  return (
    <div className="flex gap-4" style={{ position: "relative" }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px dashed ${tokens.ember}`, marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1, background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: "16px 18px" }}>
        <div className="flex items-center gap-1" style={{ marginBottom: 8, color: tokens.inkSoft }}>
          <PenLine size={13} />
          <span className="tl-mono" style={{ fontSize: 12 }}>
            {entriesCount === 0 ? "First entry" : "Add another log"}
          </span>
        </div>
        
        <textarea
          value={composeText}
          onChange={(e) => onComposeChange(e.target.value)}
          placeholder="Why do you believe that — today? Your drafts are saved automatically."
          rows={3}
          className="tl-focus"
          style={{ 
            width: "100%", 
            resize: "none", 
            border: "none", 
            outline: "none", 
            fontSize: 14.5, 
            lineHeight: 1.6, 
            fontFamily: "inherit", 
            background: "transparent", 
            color: tokens.ink, 
            marginBottom: 6 
          }}
        />
        
        {/* Confidence Slider */}
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft, whiteSpace: "nowrap" }}>How sure?</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={composeConfidence} 
            onChange={(e) => setComposeConfidence(Number(e.target.value))} 
            className="tl-range tl-focus" 
          />
          <span className="tl-mono" style={{ fontSize: 12, color: tokens.ink, width: 34, textAlign: "right" }}>
            {composeConfidence}%
          </span>
        </div>

        {/* Visibility and Save Buttons */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1" style={{ background: tokens.paperDeep, borderRadius: 999, padding: 3 }}>
            <button 
              onClick={() => setComposeVisibility("private")} 
              className="tl-focus"
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                background: composeVisibility === "private" ? tokens.plumSoft : "transparent",
                color: composeVisibility === "private" ? tokens.plum : tokens.inkSoft,
                fontWeight: composeVisibility === "private" ? 600 : 400
              }}
            >
              <Lock size={11} style={{ marginRight: 3, verticalAlign: "middle" }} /> Private
            </button>
            <button 
              onClick={() => setComposeVisibility("public")} 
              className="tl-focus"
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
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
            onClick={onAddEntry}
            disabled={!composeText.trim()}
            className="tl-focus btn-premium flex items-center gap-1"
            style={{ 
              background: composeText.trim() ? tokens.pine : tokens.line, 
              color: composeText.trim() ? tokens.paper : tokens.inkFaint, 
              border: "none", 
              borderRadius: 8, 
              padding: "7px 14px", 
              fontSize: 13, 
              fontWeight: 500, 
              cursor: composeText.trim() ? "pointer" : "not-allowed" 
            }}
          >
            <Send size={13} /> Log entry
          </button>
        </div>
      </div>
    </div>
  )
})

export default EntryComposer
