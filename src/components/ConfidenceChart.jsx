import React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

const tokens = {
  paper: "#F1EEE4",
  card: "#FBF9F3",
  ink: "#211F1B",
  inkSoft: "#6B6459",
  inkFaint: "#9C9587",
  pine: "#2F4A3D",
  plum: "#4B3B5C",
  line: "#D9D2C0",
}

function ChartDot(props) {
  const { cx, cy, payload } = props
  const isPublic = payload.visibility === "public"
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={isPublic ? tokens.pine : tokens.card}
      stroke={isPublic ? tokens.pine : tokens.plum}
      strokeWidth={2}
    />
  )
}

export default function ConfidenceChart({ entries }) {
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

  // Format date for chart labels
  const data = entries.map((e) => {
    // If the entry date is a timestamp string, parse it to a nicer month/year format
    let dateStr = e.entry_date
    try {
      const d = new Date(e.entry_date)
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleString("en-US", { month: "short", year: "2-digit" })
      }
    } catch (_) {}

    return {
      date: dateStr,
      confidence: e.confidence_rating,
      visibility: e.visibility
    }
  })

  return (
    <div style={{ background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: "14px 16px 6px", marginBottom: 24 }}>
      <div className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        How sure you've felt, over time
      </div>
      <div style={{ height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
            <CartesianGrid stroke={tokens.line} strokeDasharray="3 3" vertical={false} />
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
            <Tooltip
              contentStyle={{ background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 8, fontSize: 12, fontFamily: "Public Sans" }}
              formatter={(v) => [`${v}% confidence`, ""]}
              labelStyle={{ color: tokens.ink, fontWeight: 600 }}
            />
            <Line 
              type="monotone" 
              dataKey="confidence" 
              stroke={tokens.pine} 
              strokeWidth={2} 
              dot={<ChartDot />} 
              activeDot={{ r: 5 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
