import React from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts"
import { TrendingUp, TrendingDown, Activity, Minus } from "lucide-react"

const tokens = {
  card: "var(--color-card)",
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  inkFaint: "var(--color-ink-faint)",
  pine: "var(--color-pine)",
  pineSoft: "var(--color-pine-soft)",
  plum: "var(--color-plum)",
  line: "var(--color-line)",
  ember: "var(--color-ember)",
}

function ChartDot(props) {
  const { cx, cy, payload, onSelectEntry, selectedEntryId } = props
  if (!cx || !cy) return null
  const isPublic = payload.visibility === "public"
  const isPivot = payload.isPivot
  const isSelected = selectedEntryId && selectedEntryId === payload.id

  return (
    <g 
      style={{ cursor: onSelectEntry ? "pointer" : "default" }}
      onClick={() => onSelectEntry && payload.id && onSelectEntry(payload.id)}
    >
      {isPivot && (
        <circle
          cx={cx}
          cy={cy}
          r={9}
          fill="none"
          stroke={payload.delta > 0 ? tokens.pine : tokens.ember}
          strokeWidth={1.5}
          strokeDasharray="2 2"
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={isSelected ? 7 : 5}
        fill={isSelected ? tokens.ember : (isPublic ? tokens.pine : tokens.card)}
        stroke={isPublic ? tokens.pine : tokens.plum}
        strokeWidth={isSelected ? 3 : 2}
      />
    </g>
  )
}

function CustomTooltip({ active, payload, label, onSelectEntry }) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload
  const deltaText = data.delta !== null ? (data.delta >= 0 ? `+${data.delta}%` : `${data.delta}%`) : null
  const deltaColor = data.delta > 0 ? tokens.pine : data.delta < 0 ? tokens.ember : tokens.inkSoft

  return (
    <div 
      onClick={() => onSelectEntry && data.id && onSelectEntry(data.id)}
      style={{ 
        background: tokens.card, 
        border: `1px solid ${tokens.line}`, 
        borderRadius: 8, 
        padding: "10px 14px", 
        fontSize: 12, 
        maxWidth: 240,
        boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
        cursor: onSelectEntry ? "pointer" : "default"
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: tokens.ink }}>{label}</span>
        <span className="tl-mono" style={{ fontSize: 10, color: data.visibility === 'public' ? tokens.pine : tokens.plum }}>
          {data.visibility === 'public' ? '● Public' : '○ Private'}
        </span>
      </div>

      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <span className="tl-mono" style={{ fontSize: 15, fontWeight: 700, color: tokens.pine }}>
          {data.confidence}%
        </span>
        {deltaText && (
          <span className="tl-mono" style={{ fontSize: 11, fontWeight: 600, color: deltaColor }}>
            ({deltaText})
          </span>
        )}
        {data.isPivot && (
          <span className="tl-mono" style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: tokens.emberSoft, color: tokens.ember, fontWeight: 600 }}>
            PIVOT
          </span>
        )}
      </div>

      {data.excerpt && (
        <p style={{ fontSize: 11, color: tokens.inkSoft, margin: 0, lineHeight: 1.4, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          "{data.excerpt}"
        </p>
      )}

      {onSelectEntry && (
        <div className="tl-mono" style={{ fontSize: 10, color: tokens.inkFaint, marginTop: 6, paddingTop: 4, borderTop: `1px dashed ${tokens.line}` }}>
          Click to jump to entry ↵
        </div>
      )}
    </div>
  )
}

export default function ConfidenceChart({ entries, onSelectEntry, selectedEntryId }) {
  if (!entries || entries.length < 2) {
    return (
      <div 
        className="tl-mono"
        style={{ 
          background: tokens.card, 
          border: `1px dashed ${tokens.line}`, 
          borderRadius: 10, 
          padding: "16px 20px", 
          fontSize: 12, 
          color: tokens.inkSoft,
          marginBottom: 24,
          textAlign: "center"
        }}
      >
        Add at least two entries with confidence values to chart your opinion's evolution.
      </div>
    )
  }

  // Format date for chart labels & compute deltas & pivot points
  const data = entries.map((e, index) => {
    let dateStr = e.entry_date
    try {
      const d = new Date(e.entry_date)
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleString("en-US", { month: "short", day: "numeric", year: "2-digit" })
      }
    } catch (_) {}

    const prevConfidence = index > 0 ? entries[index - 1].confidence_rating : null
    const delta = prevConfidence !== null ? e.confidence_rating - prevConfidence : null
    const isPivot = delta !== null && Math.abs(delta) >= 20

    return {
      id: e.id,
      date: dateStr,
      confidence: e.confidence_rating,
      visibility: e.visibility,
      excerpt: e.content || e.text || "",
      delta,
      isPivot
    }
  })

  const latestVal = data[data.length - 1].confidence
  const startVal = data[0].confidence
  const totalShift = latestVal - startVal
  const pivotCount = data.filter(d => d.isPivot).length

  // Velocity calculation
  let increases = 0
  let decreases = 0
  for (let i = 1; i < data.length; i++) {
    if (data[i].confidence > data[i - 1].confidence) increases++
    else if (data[i].confidence < data[i - 1].confidence) decreases++
  }

  let velocityLabel = "Stable"
  let VelocityIcon = Minus
  let velocityColor = tokens.inkSoft

  if (totalShift > 5 && increases > decreases) {
    velocityLabel = "Trending Up"
    VelocityIcon = TrendingUp
    velocityColor = tokens.pine
  } else if (totalShift < -5 && decreases > increases) {
    velocityLabel = "Trending Down"
    VelocityIcon = TrendingDown
    velocityColor = tokens.ember
  } else if (increases > 0 && decreases > 0) {
    velocityLabel = "Fluctuating"
    VelocityIcon = Activity
    velocityColor = tokens.plum
  }

  return (
    <div style={{ background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: "14px 16px 10px", marginBottom: 24 }}>
      <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 12 }}>
        <div className="flex items-center gap-2">
          <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Belief Evolution Timeline
          </span>
          <span 
            className="tl-mono flex items-center gap-1" 
            style={{ 
              fontSize: 10, 
              padding: "2px 8px", 
              borderRadius: 999, 
              background: "var(--color-paper)", 
              border: `1px solid ${tokens.line}`, 
              color: velocityColor,
              fontWeight: 600
            }}
          >
            <VelocityIcon size={11} /> {velocityLabel}
          </span>
          {pivotCount > 0 && (
            <span 
              className="tl-mono flex items-center gap-1" 
              style={{ 
                fontSize: 10, 
                padding: "2px 8px", 
                borderRadius: 999, 
                background: tokens.emberSoft, 
                color: tokens.ember,
                fontWeight: 600
              }}
            >
              ⚡ {pivotCount} Pivot{pivotCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <div className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>
          Overall Shift: <strong style={{ color: totalShift >= 0 ? tokens.pine : tokens.ember }}>{totalShift >= 0 ? `+${totalShift}%` : `${totalShift}%`}</strong>
        </div>
      </div>

      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={tokens.pine} stopOpacity={0.3} />
                <stop offset="95%" stopColor={tokens.pine} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={tokens.line} strokeDasharray="3 3" vertical={false} />
            
            {/* Baseline Guides */}
            <ReferenceLine y={50} stroke={tokens.line} strokeDasharray="4 4" label={{ value: '50%', position: 'right', fill: tokens.inkFaint, fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
            <ReferenceLine y={100} stroke={tokens.line} strokeDasharray="2 2" />
            <ReferenceLine y={0} stroke={tokens.line} strokeDasharray="2 2" />

            <XAxis 
              dataKey="date" 
              tick={{ fill: tokens.inkFaint, fontSize: 10, fontFamily: "IBM Plex Mono" }} 
              axisLine={{ stroke: tokens.line }} 
              tickLine={false} 
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fill: tokens.inkFaint, fontSize: 10, fontFamily: "IBM Plex Mono" }} 
              axisLine={false} 
              tickLine={false} 
              width={34} 
            />
            <Tooltip content={<CustomTooltip onSelectEntry={onSelectEntry} />} />
            <Area 
              type="monotone" 
              dataKey="confidence" 
              stroke={tokens.pine} 
              strokeWidth={2.5} 
              fillOpacity={1} 
              fill="url(#confidenceGradient)" 
              dot={<ChartDot onSelectEntry={onSelectEntry} selectedEntryId={selectedEntryId} />} 
              activeDot={{ r: 7 }} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


