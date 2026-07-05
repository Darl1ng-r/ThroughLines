import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ShieldCheck, LogIn, UserPlus } from 'lucide-react'

const tokens = {
  paper: "#F1EEE4",
  paperDeep: "#E8E3D5",
  card: "#FBF9F3",
  ink: "#211F1B",
  inkSoft: "#6B6459",
  inkFaint: "#9C9587",
  pine: "#2F4A3D",
  pineSoft: "#E3E9E0",
  plum: "#4B3B5C",
  plumSoft: "#EAE3EE",
  ember: "#AD6330",
  emberSoft: "#F3E5D8",
  line: "#D9D2C0",
  danger: "#8C4A3A",
}

export default function Landing() {
  const navigate = useNavigate()
  const { signIn, signUp, signInWithGoogle } = useAuth()

  const [mode, setMode] = useState("login") // 'login' or 'signup'
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [loading, setLoading] = useState(false)

  const canSubmit = mode === "login" 
    ? email.trim() && password.trim() 
    : displayName.trim() && username.trim() && email.trim() && password.trim()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return

    setErrorMsg("")
    setLoading(true)

    try {
      if (mode === "login") {
        await signIn(email, password)
        navigate('/dashboard')
      } else {
        await signUp(email, password, username.toLowerCase(), displayName)
        // Auto sign-in or prompt for email confirmation
        setErrorMsg("Account created! Logging you in...")
        setTimeout(() => {
          navigate('/dashboard')
        }, 1500)
      }
    } catch (err) {
      console.error(err)
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
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || "Google authentication failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex" style={{ minHeight: "100vh", background: tokens.paper, color: tokens.ink }}>
      {/* Left Panel: Branding / Copywriting */}
      <div
        className="flex-col justify-between hidden md:flex"
        style={{ width: "42%", background: tokens.pine, color: tokens.paper, padding: 48 }}
      >
        <div className="flex items-center gap-2">
          <div className="tl-display" style={{ width: 28, height: 28, borderRadius: 6, background: tokens.paper, color: tokens.pine, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>
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
          <p style={{ fontSize: 14.5, opacity: 0.85, maxWidth: 380, lineHeight: 1.6 }}>
            Write about the same topic as many times as you need to. Plot your certainty over time. Keep it private, or put it out into the open — one entry at a time.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="tl-mono" style={{ fontSize: 11, opacity: 0.6 }}>Private by default. Public when you say so.</p>
        </div>
      </div>

      {/* Right Panel: Authentication Form */}
      <div className="flex flex-1 items-center justify-center" style={{ padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          {/* Tabs */}
          <div className="flex items-center gap-1" style={{ background: tokens.paperDeep, borderRadius: 999, padding: 4, marginBottom: 28 }}>
            <button 
              onClick={() => { setMode("login"); setErrorMsg(""); }} 
              className="tl-focus" 
              style={{ flex: 1, padding: "8px 0", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: mode === "login" ? tokens.card : "transparent", color: mode === "login" ? tokens.ink : tokens.inkSoft }}
            >
              Log in
            </button>
            <button 
              onClick={() => { setMode("signup"); setErrorMsg(""); }} 
              className="tl-focus" 
              style={{ flex: 1, padding: "8px 0", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: mode === "signup" ? tokens.card : "transparent", color: mode === "signup" ? tokens.ink : tokens.inkSoft }}
            >
              Sign up
            </button>
          </div>

          <h1 className="tl-display" style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
            {mode === "login" ? "Welcome back" : "Start your throughline"}
          </h1>
          <p style={{ fontSize: 13, color: tokens.inkSoft, marginBottom: 22 }}>
            {mode === "login" ? "Pick up where you left off." : "Takes about a minute. No credit card required."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col">
            {mode === "signup" && (
              <>
                <label className="flex flex-col gap-1" style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 12 }}>
                  Display name
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Sarah Novak"
                    className="tl-focus tl-input"
                    style={{ padding: "9px 11px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 14, fontFamily: "inherit" }}
                  />
                </label>
                <label className="flex flex-col gap-1" style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 12 }}>
                  Username
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="quietriver"
                    className="tl-focus tl-input"
                    style={{ padding: "9px 11px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 14, fontFamily: "inherit" }}
                  />
                </label>
              </>
            )}
            
            <label className="flex flex-col gap-1" style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 12 }}>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="tl-focus tl-input"
                style={{ padding: "9px 11px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 14, fontFamily: "inherit" }}
              />
            </label>

            <label className="flex flex-col gap-1" style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 12 }}>
              Password
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="tl-focus tl-input"
                style={{ padding: "9px 11px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 14, fontFamily: "inherit" }}
              />
            </label>

            {errorMsg && (
              <div className="tl-mono" style={{ color: errorMsg.includes("created") ? tokens.pine : tokens.danger, fontSize: 12, marginBottom: 12, lineHeight: 1.4 }}>
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="tl-focus btn-premium"
              style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600, cursor: (canSubmit && !loading) ? "pointer" : "not-allowed", background: tokens.pine, color: tokens.paper, opacity: (canSubmit && !loading) ? 1 : 0.45, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
              <span>{loading ? "Authenticating..." : mode === "login" ? "Log in" : "Create account"}</span>
            </button>
          </form>

          <div className="flex items-center gap-3" style={{ margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: tokens.line }} />
            <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>or</span>
            <div style={{ flex: 1, height: 1, background: tokens.line }} />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="tl-focus flex items-center justify-center gap-2"
            style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            <span className="tl-display" style={{ fontWeight: 700 }}>G</span> Continue with Google
          </button>

          {/* Privacy Shield Info */}
          <div className="flex items-start gap-2" style={{ marginTop: 24, padding: "10px 12px", background: tokens.pineSoft, borderRadius: 8 }}>
            <ShieldCheck size={16} style={{ color: tokens.pine, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: tokens.pine, margin: 0, lineHeight: 1.4 }}>
              Private entries are encrypted end-to-end and are never accessible on the discover feed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
