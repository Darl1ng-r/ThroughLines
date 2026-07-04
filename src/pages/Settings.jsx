import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Settings as SettingsIcon, Save, ArrowLeft } from 'lucide-react'

const tokens = {
  paper: "#F1EEE4",
  paperDeep: "#E8E3D5",
  card: "#FBF9F3",
  ink: "#211F1B",
  inkSoft: "#6B6459",
  inkFaint: "#9C9587",
  pine: "#2F4A3D",
  pineSoft: "#E3E9E0",
  line: "#D9D2C0",
  danger: "#8C4A3A",
}

export default function Settings() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useAuth()

  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "")
      setBio(profile.bio || "")
    }
  }, [profile])

  async function handleSave(e) {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    setMessage("")
    setIsError(false)

    try {
      await updateProfile({
        display_name: displayName,
        bio: bio
      })
      setMessage("Profile settings updated successfully.")
    } catch (err) {
      console.error(err)
      setIsError(true)
      setMessage(err.message || "Failed to update profile settings.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tl-scroll" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 58px)" }}>
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "36px 24px 80px" }}>
        {/* Back Button */}
        <button 
          onClick={() => navigate('/dashboard')} 
          className="tl-focus flex items-center gap-1 btn-premium" 
          style={{ background: "transparent", border: "none", color: tokens.inkSoft, cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="flex items-center gap-2" style={{ marginBottom: 20 }}>
          <SettingsIcon size={22} color={tokens.pine} />
          <h1 className="tl-display" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
            Profile settings
          </h1>
        </div>

        <div style={{ background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 12, padding: 24 }}>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1" style={{ fontSize: 12, color: tokens.inkSoft }}>
              Display name
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Sarah Novak"
                className="tl-focus tl-input"
                style={{
                  padding: "9px 11px",
                  borderRadius: 8,
                  border: `1px solid ${tokens.line}`,
                  background: tokens.paper,
                  color: tokens.ink,
                  fontSize: 14,
                  fontFamily: "inherit"
                }}
              />
            </label>

            <label className="flex flex-col gap-1" style={{ fontSize: 12, color: tokens.inkSoft }}>
              Biography
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a short summary about yourself..."
                rows={4}
                className="tl-focus tl-input"
                style={{
                  padding: "9px 11px",
                  borderRadius: 8,
                  border: `1px solid ${tokens.line}`,
                  background: tokens.paper,
                  color: tokens.ink,
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "none"
                }}
              />
            </label>

            <div className="flex flex-col gap-1" style={{ fontSize: 12, color: tokens.inkSoft }}>
              Username
              <input
                type="text"
                disabled
                value={`@${profile?.username || ""}`}
                style={{
                  padding: "9px 11px",
                  borderRadius: 8,
                  border: `1px solid ${tokens.line}`,
                  background: tokens.paperDeep,
                  color: tokens.inkSoft,
                  fontSize: 14,
                  fontFamily: "var(--font-mono)",
                  cursor: "not-allowed"
                }}
              />
              <span style={{ fontSize: 10, color: tokens.inkFaint }}>Username handles are locked to preserve permalinks.</span>
            </div>

            {message && (
              <div className="tl-mono" style={{ color: isError ? tokens.danger : tokens.pine, fontSize: 12, marginTop: 4 }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="tl-focus btn-premium"
              style={{
                background: tokens.pine,
                color: tokens.paper,
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 8
              }}
            >
              <Save size={14} />
              <span>{loading ? "Saving changes..." : "Save changes"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
