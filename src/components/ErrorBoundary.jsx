import React, { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { logError } from '../services/telemetryService'

const tokens = {
  paper: "var(--color-paper)",
  card: "var(--color-card)",
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  pine: "var(--color-pine)",
  line: "var(--color-line)",
  danger: "var(--color-danger)"
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    logError(error, { componentStack: errorInfo?.componentStack })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          style={{ 
            minHeight: "80vh", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            padding: 24, 
            background: tokens.paper, 
            color: tokens.ink 
          }}
        >
          <div 
            style={{ 
              maxWidth: 480, 
              width: "100%", 
              background: tokens.card, 
              border: `1px solid ${tokens.line}`, 
              borderRadius: 12, 
              padding: 32, 
              textAlign: "center", 
              boxShadow: "0 12px 32px rgba(0,0,0,0.08)" 
            }}
          >
            <div 
              style={{ 
                width: 48, 
                height: 48, 
                borderRadius: "50%", 
                background: "rgba(224, 98, 88, 0.1)", 
                color: tokens.danger, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                margin: "0 auto 16px" 
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h2 className="tl-display" style={{ fontSize: 20, marginBottom: 8 }}>
              Something unexpected happened
            </h2>
            
            <p style={{ fontSize: 14, color: tokens.inkSoft, marginBottom: 20, lineHeight: 1.6 }}>
              An isolated interface error occurred. Don't worry — your logged throughlines and saved drafts remain completely safe.
            </p>

            <button 
              onClick={this.handleReset}
              className="tl-focus btn-premium flex items-center justify-center gap-2"
              style={{ 
                margin: "0 auto", 
                padding: "9px 18px", 
                borderRadius: 8, 
                border: "none", 
                background: tokens.pine, 
                color: tokens.paper, 
                fontSize: 13, 
                fontWeight: 500, 
                cursor: "pointer" 
              }}
            >
              <RefreshCw size={14} /> Refresh view
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
