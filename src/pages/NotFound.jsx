import React from 'react'
import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

const tokens = {
  paper: "var(--color-paper)",
  card: "var(--color-card)",
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  inkFaint: "var(--color-ink-faint)",
  pine: "var(--color-pine)",
  pineSoft: "var(--color-pine-soft)",
  line: "var(--color-line)",
}

export default function NotFound() {
  React.useEffect(() => {
    document.title = 'Page Not Found — Throughline'
  }, [])

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        background: tokens.paper,
        color: tokens.ink,
        minHeight: 'calc(100vh - 58px)',
      }}
      role="main"
      aria-labelledby="not-found-title"
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Decorative number */}
        <div
          className="tl-display"
          style={{
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1,
            color: tokens.pineSoft,
            marginBottom: 8,
            userSelect: 'none',
            letterSpacing: '-4px',
          }}
          aria-hidden="true"
        >
          404
        </div>

        <h1
          id="not-found-title"
          className="tl-display"
          style={{ fontSize: 24, fontWeight: 600, marginBottom: 10 }}
        >
          This page doesn't exist
        </h1>

        <p
          style={{
            fontSize: 14,
            color: tokens.inkSoft,
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          The page you're looking for may have been moved, deleted, or never existed.
          If you were looking for someone's profile, double-check the username in the URL.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', width: '100%', maxWidth: 240 }}>
            <button
              className="tl-focus btn-premium flex items-center justify-center gap-2"
              style={{
                width: '100%',
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: tokens.pine,
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Home size={15} />
              Go to homepage
            </button>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="tl-focus flex items-center justify-center gap-2"
            style={{
              width: '100%',
              maxWidth: 240,
              padding: '10px 20px',
              borderRadius: 8,
              border: `1px solid ${tokens.line}`,
              background: 'transparent',
              color: tokens.inkSoft,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={15} />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
