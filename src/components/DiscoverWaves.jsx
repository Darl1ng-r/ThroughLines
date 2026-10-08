import React, { memo } from 'react'

/**
 * DiscoverWaves - Ambient flowing water waves at the bottom of the Discover feed
 *
 * Sits peacefully behind the public throughline cards at the bottom of the viewport,
 * providing organic movement and subtle green water energy.
 */
function DiscoverWaves() {
  return (
    <div className="tl-discover-waves" aria-hidden="true">
      {/* Ambient water caustics shimmer */}
      <div className="tl-water-shimmer" />

      {/* Primary undercurrent wave (flows left) */}
      <svg
        className="tl-wave-svg tl-wave-1"
        viewBox="0 0 2880 140"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 55 C 240 35, 480 75, 720 55 C 960 35, 1200 75, 1440 55 C 1680 35, 1920 75, 2160 55 C 2400 35, 2640 75, 2880 55 L 2880 140 L 0 140 Z"
          fill="currentColor"
        />
        <path
          d="M 0 55 C 240 35, 480 75, 720 55 C 960 35, 1200 75, 1440 55 C 1680 35, 1920 75, 2160 55 C 2400 35, 2640 75, 2880 55"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.25"
        />
      </svg>

      {/* Secondary ripple wave (flows right) */}
      <svg
        className="tl-wave-svg tl-wave-2"
        viewBox="0 0 2880 140"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 75 C 200 55, 420 95, 680 70 C 920 45, 1180 90, 1440 75 C 1640 55, 1860 95, 2120 70 C 2360 45, 2620 90, 2880 75 L 2880 140 L 0 140 Z"
          fill="currentColor"
        />
        <path
          d="M 0 75 C 200 55, 420 95, 680 70 C 920 45, 1180 90, 1440 75 C 1640 55, 1860 95, 2120 70 C 2360 45, 2620 90, 2880 75"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity="0.18"
        />
      </svg>
    </div>
  )
}

export default memo(DiscoverWaves)
