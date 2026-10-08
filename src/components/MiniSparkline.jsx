import React, { useId } from 'react'

/**
 * MiniSparkline - Zero-dependency SVG Sparkline for Throughline belief progression
 *
 * Renders an organic, smooth Bezier curve of confidence ratings ($0-100\%$)
 * over time with a subtle green gradient area fill and an illuminated endpoint.
 */
export default function MiniSparkline({ 
  data = [], 
  width = 96, 
  height = 26, 
  color = "var(--color-pine)",
  ariaLabel = "Belief trajectory sparkline" 
}) {
  const gradientId = useId()

  // Extract numeric confidence values
  const points = (data || [])
    .map(p => typeof p === 'number' ? p : (p?.confidence_rating ?? p?.confidence))
    .filter(val => typeof val === 'number' && !isNaN(val))

  if (points.length === 0) {
    return null
  }

  const padX = 4
  const padY = 4
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  // Map points to SVG coordinates
  const coords = points.map((val, idx) => {
    const x = points.length === 1 
      ? width / 2 
      : padX + (idx / (points.length - 1)) * innerW
    
    // Invert Y: 100% is top, 0% is bottom
    const clamped = Math.max(0, Math.min(100, val))
    const y = padY + innerH - (clamped / 100) * innerH
    return { x, y }
  })

  // Build smooth cubic Bezier path
  let pathD = ""
  if (coords.length === 1) {
    pathD = `M ${coords[0].x - 12} ${coords[0].y} L ${coords[0].x + 12} ${coords[0].y}`
  } else {
    pathD = `M ${coords[0].x} ${coords[0].y}`
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i]
      const next = coords[i + 1]
      const cpX = (curr.x + next.x) / 2
      pathD += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`
    }
  }

  // Build closed area path for the subtle translucent fill
  const lastCoord = coords[coords.length - 1]
  const firstCoord = coords[0]
  const areaD = coords.length > 1 
    ? `${pathD} L ${lastCoord.x} ${height} L ${firstCoord.x} ${height} Z`
    : ""

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`} 
      aria-label={ariaLabel}
      style={{ overflow: 'visible', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Translucent area fill */}
      {areaD && (
        <path 
          d={areaD} 
          fill={`url(#${gradientId})`} 
        />
      )}

      {/* Main trajectory stroke */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Glowing terminal node */}
      <circle 
        cx={lastCoord.x} 
        cy={lastCoord.y} 
        r="2.5" 
        fill={color} 
      />
      <circle 
        cx={lastCoord.x} 
        cy={lastCoord.y} 
        r="5" 
        fill={color} 
        opacity="0.25"
      />
    </svg>
  )
}
