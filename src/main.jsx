import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// -----------------------------------------------------------------------
// Sentry Error Tracking — set VITE_SENTRY_DSN in your .env file
// Get your DSN from: https://sentry.io → Project Settings → SDK Setup
// Free tier supports 5,000 errors/month with 14-day retention.
// -----------------------------------------------------------------------
async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return // Skip Sentry in local dev unless DSN is set

  try {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || '0.1.0',
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          // Replay recording only on errors — minimal privacy impact
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      // Sample 10% of performance traces in production; 100% in dev
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      // Replay only on errors, not random sessions
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
    })
  } catch (err) {
    console.warn('Sentry failed to initialize (non-blocking):', err)
  }
}

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err =>
      console.warn('Service worker registration failed:', err)
    )
  })
}

initSentry().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
