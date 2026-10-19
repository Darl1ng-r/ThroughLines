import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { checkPasswordBreached } from '../services/passwordSecurityService'
import { ShieldCheck, LogIn, UserPlus, AlertCircle } from 'lucide-react'

const tokens = {
  paper: "var(--color-paper)",
  paperDeep: "var(--color-paper-deep)",
  card: "var(--color-card)",
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  inkFaint: "var(--color-ink-faint)",
  pine: "var(--color-pine)",
  pineSoft: "var(--color-pine-soft)",
  plum: "var(--color-plum)",
  plumSoft: "var(--color-plum-soft)",
  ember: "var(--color-ember)",
  emberSoft: "var(--color-ember-soft)",
  line: "var(--color-line)",
  danger: "var(--color-danger)",
}

// Lockout config: block after 5 consecutive failures for 30 seconds
const MAX_FAILURES = 5
const LOCKOUT_SECONDS = 30

function useAuthLockout() {
  const [failureCount, setFailureCount] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState(null)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const lockoutTimerRef = useRef(null)

  function startLockout() {
    const unlockAt = Date.now() + LOCKOUT_SECONDS * 1000
    setLockoutUntil(unlockAt)
    setLockoutSeconds(LOCKOUT_SECONDS)

    if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current)
    lockoutTimerRef.current = setInterval(() => {
      const remaining = Math.ceil((unlockAt - Date.now()) / 1000)
      if (remaining <= 0) {
        clearInterval(lockoutTimerRef.current)
        setLockoutUntil(null)
        setLockoutSeconds(0)
        setFailureCount(0)
      } else {
        setLockoutSeconds(remaining)
      }
    }, 1000)
  }

  function recordFailure() {
    const next = failureCount + 1
    setFailureCount(next)
    if (next >= MAX_FAILURES) {
      startLockout()
    }
  }

  function resetFailures() {
    setFailureCount(0)
  }

  useEffect(() => {
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current)
    }
  }, [])

  const isLockedOut = Boolean(lockoutUntil && Date.now() < lockoutUntil)

  return {
    failureCount,
    lockoutSeconds,
    isLockedOut,
    recordFailure,
    resetFailures
  }
}

export default function Landing() {
  const navigate = useNavigate()
  const { signIn, signUp, signInWithGoogle, signInWithGoogleCredential } = useAuth()

  const [mode, setMode] = useState("login") // 'login' or 'signup'
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [loading, setLoading] = useState(false)

  const {
    failureCount,
    lockoutSeconds,
    isLockedOut,
    recordFailure,
    resetFailures
  } = useAuthLockout()

  // Handle Google Platform & Identity callbacks
  useEffect(() => {
    window.onSignIn = async (googleUser) => {
      try {
        setLoading(true)
        if (googleUser && typeof googleUser.getAuthResponse === 'function') {
          const authRes = googleUser.getAuthResponse()
          if (authRes?.id_token) {
            await signInWithGoogleCredential(authRes.id_token)
            navigate('/dashboard')
            return
          }
        }
        await signInWithGoogle()
        navigate('/dashboard')
      } catch (err) {
        console.error(err)
        setErrorMsg(err.message || "Google Sign-In failed.")
      } finally {
        setLoading(false)
      }
    }
  }, [signInWithGoogle, signInWithGoogleCredential, navigate])

  const canSubmit = !isLockedOut && !loading && (
    mode === "login"
      ? email.trim() && password.trim()
      : displayName.trim() && username.trim() && email.trim() && password.trim()
  )

  async function executeSignUp() {
    const breachCheck = await checkPasswordBreached(password)
    if (breachCheck.isBreached) {
      setErrorMsg(
        `This password has appeared in ${breachCheck.count.toLocaleString()} known data breaches. Please choose a stronger, unique password.`
      )
      return
    }

    await signUp(email, password, username.toLowerCase(), displayName)
    resetFailures()
    setErrorMsg("Account created! Logging you in...")
    setTimeout(() => {
      navigate('/dashboard')
    }, 1500)
  }

  async function executeLogin() {
    await signIn(email, password)
    resetFailures()
    navigate('/dashboard')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit || isLockedOut) return

    setErrorMsg("")
    setLoading(true)

    try {
      if (mode === "login") {
        await executeLogin()
      } else {
        await executeSignUp()
      }
    } catch (err) {
      console.error(err)
      recordFailure()
      setErrorMsg(err.message || "An authentication error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    try {
      setErrorMsg("")
      setLoading(true)
      await signInWithGoogle()
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || "Google authentication failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  let submitButtonText = mode === "login" ? "Log in" : "Create account"
  if (loading) {
    submitButtonText = "Authenticating..."
  }

  return (
    <div className="flex" style={{ minHeight: "100vh", background: tokens.paper, color: tokens.ink }}>
      {/* Left Panel: Branding / Copywriting */}
      <div
        className="flex-col justify-between hidden md:flex"
        style={{ width: "42%", background: tokens.pine, color: tokens.paper, padding: 48 }}
      >
        <div className="flex items-center gap-2">
          <div
            className="tl-display"
            aria-hidden="true"
            style={{ width: 28, height: 28, borderRadius: 6, background: tokens.paper, color: tokens.pine, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}
          >
            🌿
          </div>
          <span className="tl-display" style={{ fontSize: 20, fontWeight: 600 }}>Throughline</span>
        </div>
        <div>
          <p className="tl-display" style={{ fontSize: 32, lineHeight: 1.35, fontWeight: 500, marginBottom: 16 }}>
            Say what you think.
            <br />
            Say it again when you don't anymore.
          </p>
          <p style={{ fontSize: 14.5, opacity: 0.85, maxWidth: 380, lineHeight: 1.6, marginBottom: 20 }}>
            Write about the same topic as many times as you need to. Plot your certainty over time. Keep it private, or put it out into the open — one entry at a time.
          </p>

          {/* Tactile Throughline Evolution Preview */}
          <div 
            style={{ 
              background: "rgba(255, 255, 255, 0.07)", 
              backdropFilter: "blur(8px)",
              borderRadius: 14, 
              border: "1px solid rgba(241, 238, 228, 0.16)", 
              padding: "18px 20px",
              maxWidth: 380,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)"
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <span className="tl-mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.8 }}>
                Sample Throughline
              </span>
              <span className="tl-mono" style={{ fontSize: 11, opacity: 0.7 }}>
                3 logs recorded
              </span>
            </div>

            <p className="tl-display" style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px 0", color: tokens.paper }}>
              "Will AI agents replace junior developers?"
            </p>

            {/* SVG Smooth Curve */}
            <div style={{ position: "relative", width: "100%", height: 56, marginBottom: 10 }}>
              <svg viewBox="0 0 300 56" style={{ width: "100%", height: "100%", overflow: "visible" }} preserveAspectRatio="none" aria-hidden="true" role="img">
                <defs>
                  <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F1EEE4" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F1EEE4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 15 38 C 65 38, 105 12, 150 14 C 195 16, 235 44, 285 20 L 285 52 L 15 52 Z"
                  fill="url(#heroGradient)"
                />
                <path
                  d="M 15 38 C 65 38, 105 12, 150 14 C 195 16, 235 44, 285 20"
                  fill="none"
                  stroke="#F1EEE4"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="15" cy="38" r="4" fill="#2F4A3D" stroke="#F1EEE4" strokeWidth="2" />
                <circle cx="150" cy="14" r="4" fill="#2F4A3D" stroke="#F1EEE4" strokeWidth="2" />
                <circle cx="285" cy="20" r="5" fill="#C46238" stroke="#F1EEE4" strokeWidth="2" />
              </svg>
            </div>

            <div className="tl-mono flex justify-between" style={{ fontSize: 11, opacity: 0.85 }}>
              <span>May: 40%</span>
              <span>Nov: 85%</span>
              <span style={{ color: tokens.emberSoft, fontWeight: 600 }}>Today: 70%</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="tl-mono" style={{ fontSize: 11, opacity: 0.6 }}>Private by default. Public when you say so.</p>
        </div>
      </div>

      {/* Right Panel: Authentication Form */}
      <div
        className="flex items-center justify-center flex-1 p-6 sm:p-12"
        style={{ background: tokens.paper }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h1 className="tl-display" style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>
            {mode === "login" ? "Welcome back" : "Create your notebook"}
          </h1>
          <p style={{ color: tokens.inkSoft, fontSize: 13.5, marginBottom: 20 }}>
            {mode === "login" ? "Continue writing through your thoughts." : "Start tracking how your conviction changes."}
          </p>

          {/* Mode Tabs */}
          <div
            className="flex p-1"
            role="tablist"
            aria-label="Authentication mode"
            style={{ background: tokens.paperDeep, borderRadius: 8, marginBottom: 18 }}
          >
            <button
              role="tab"
              aria-selected={mode === "login"}
              aria-controls="auth-panel"
              onClick={() => { setMode("login"); setErrorMsg(""); }}
              className="tl-focus"
              style={{
                flex: 1,
                padding: "7px 0",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: mode === "login" ? tokens.card : "transparent",
                color: mode === "login" ? tokens.ink : tokens.inkSoft,
                boxShadow: mode === "login" ? "0 1px 3px rgba(33,31,27,0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Log in
            </button>
            <button
              role="tab"
              aria-selected={mode === "signup"}
              aria-controls="auth-panel"
              onClick={() => { setMode("signup"); setErrorMsg(""); }}
              className="tl-focus"
              style={{
                flex: 1,
                padding: "7px 0",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: mode === "signup" ? tokens.card : "transparent",
                color: mode === "signup" ? tokens.ink : tokens.inkSoft,
                boxShadow: mode === "signup" ? "0 1px 3px rgba(33,31,27,0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Sign up
            </button>
          </div>

          {/* Lockout Warning Banner */}
          {isLockedOut && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3"
              style={{ background: tokens.emberSoft, color: tokens.ember, borderRadius: 8, fontSize: 12.5, marginBottom: 16, border: `1px solid ${tokens.ember}` }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>Too many failed attempts. Locked out for {lockoutSeconds}s.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col" aria-label={mode === "login" ? "Log in form" : "Sign up form"}>
            {mode === "signup" && (
              <>
                <label className="flex flex-col gap-1" style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 12 }}>
                  <span>Display name</span>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Sarah Novak"
                    className="tl-focus tl-input"
                    autoComplete="name"
                    style={{ padding: "9px 11px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 14, fontFamily: "inherit" }}
                  />
                </label>
                <label className="flex flex-col gap-1" style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 12 }}>
                  <span>Username</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="quietriver"
                    className="tl-focus tl-input"
                    autoComplete="username"
                    style={{ padding: "9px 11px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 14, fontFamily: "inherit" }}
                  />
                </label>
              </>
            )}

            <label className="flex flex-col gap-1" style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 12 }}>
              <span>Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="tl-focus tl-input"
                autoComplete="email"
                style={{ padding: "9px 11px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 14, fontFamily: "inherit" }}
              />
            </label>

            <label className="flex flex-col gap-1" style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 12 }}>
              <span>Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="tl-focus tl-input"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                style={{ padding: "9px 11px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 14, fontFamily: "inherit" }}
              />
            </label>

            {failureCount > 0 && failureCount < MAX_FAILURES && !isLockedOut && (
              <p className="tl-mono" style={{ fontSize: 11, color: tokens.ember, marginBottom: 8 }}>
                {MAX_FAILURES - failureCount} attempt{MAX_FAILURES - failureCount !== 1 ? 's' : ''} remaining before temporary lockout.
              </p>
            )}

            {errorMsg && (
              <div
                role="alert"
                aria-live="assertive"
                className="tl-mono"
                style={{ color: errorMsg.includes("created") ? tokens.pine : tokens.danger, fontSize: 12, marginBottom: 12, lineHeight: 1.4 }}
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || loading || isLockedOut}
              className="tl-focus btn-premium"
              aria-disabled={!canSubmit || loading || isLockedOut}
              style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600, cursor: (canSubmit && !loading && !isLockedOut) ? "pointer" : "not-allowed", background: tokens.pine, color: tokens.paper, opacity: (canSubmit && !loading && !isLockedOut) ? 1 : 0.45, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {mode === "login" ? <LogIn size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
              <span>{submitButtonText}</span>
            </button>
          </form>

          <div className="flex items-center gap-3" style={{ margin: "18px 0" }} aria-hidden="true">
            <div style={{ flex: 1, height: 1, background: tokens.line }} />
            <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>or</span>
            <div style={{ flex: 1, height: 1, background: tokens.line }} />
          </div>

          <div className="flex flex-col gap-2">
            {/* Google Identity Services button container */}
            <div id="googleBtn" style={{ width: "100%", minHeight: 40, display: "flex", justifyContent: "center" }} />

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || isLockedOut}
              className="tl-focus"
              style={{
                width: "100%",
                padding: "9px 0",
                borderRadius: 8,
                border: `1px solid ${tokens.line}`,
                background: tokens.card,
                color: tokens.ink,
                fontSize: 13,
                fontWeight: 500,
                cursor: (loading || isLockedOut) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.15s ease"
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Privacy & Zero-Knowledge Architecture Assurance */}
          <div
            className="flex items-center gap-2 p-3 mt-4"
            style={{
              background: tokens.paperDeep,
              border: `1px solid ${tokens.line}`,
              borderRadius: 8,
              fontSize: 11,
              color: tokens.inkSoft,
              lineHeight: 1.45,
            }}
          >
            <ShieldCheck size={16} color={tokens.pine} style={{ flexShrink: 0 }} />
            <span>
              Your evolving viewpoints are private by default. Your entries stay locked until you choose to publish them.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
