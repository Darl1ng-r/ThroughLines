import React, { memo } from 'react'

/**
 * TopbarWaves - Organic fluid wave currents for the top bar
 *
 * Renders two seamlessly looped SVG water waves with contrasting speeds
 * and a soft ambient caustics shimmer, giving the top bar living energy
 * and a tranquil green water hue.
 */
function TopbarWaves() {
  return (
    <div className="tl-topbar-waves" aria-hidden="true">
      {/* Ambient water shimmer caustics */}
      <div className="tl-water-shimmer" />

      {/* Primary undercurrent wave (flows left) */}
      <svg
        className="tl-wave-svg tl-wave-1"
        viewBox="0 0 2880 60"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 42 C 180 30, 360 56, 540 40 C 720 24, 900 54, 1080 36 C 1260 20, 1380 48, 1440 42 C 1620 30, 1800 56, 1980 40 C 2160 24, 2340 54, 2520 36 C 2700 20, 2820 48, 2880 42 L 2880 60 L 0 60 Z"
          fill="currentColor"
        />
        <path
          d="M 0 42 C 180 30, 360 56, 540 40 C 720 24, 900 54, 1080 36 C 1260 20, 1380 48, 1440 42 C 1620 30, 1800 56, 1980 40 C 2160 24, 2340 54, 2520 36 C 2700 20, 2820 48, 2880 42"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity="0.35"
        />
      </svg>

      {/* Secondary surface ripple wave (flows right) */}
      <svg
        className="tl-wave-svg tl-wave-2"
        viewBox="0 0 2880 60"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 48 C 140 38, 300 58, 460 45 C 620 32, 780 55, 940 43 C 1100 30, 1260 54, 1440 48 C 1580 38, 1740 58, 1900 45 C 2060 32, 2220 55, 2380 43 C 2540 30, 2700 54, 2880 48 L 2880 60 L 0 60 Z"
          fill="currentColor"
        />
        <path
          d="M 0 48 C 140 38, 300 58, 460 45 C 620 32, 780 55, 940 43 C 1100 30, 1260 54, 1440 48 C 1580 38, 1740 58, 1900 45 C 2060 32, 2220 55, 2380 43 C 2540 30, 2700 54, 2880 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.25"
        />
      </svg>
    </div>
  )
}

export default memo(TopbarWaves)
