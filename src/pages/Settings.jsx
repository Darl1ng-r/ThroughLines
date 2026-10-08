import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Settings as SettingsIcon, Save, ArrowLeft, Download, FileText, Database, ShieldCheck } from 'lucide-react'
import { moderateContent } from '../services/contentModerationService'
import { supabase } from '../services/supabaseClient'
import { downloadJSONArchive, downloadMarkdownDigest } from '../services/dataPortabilityService'

const tokens = {
  paper: "var(--color-paper)",
  paperDeep: "var(--color-paper-deep)",
  card: "var(--color-card)",
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  inkFaint: "var(--color-ink-faint)",
  pine: "var(--color-pine)",
  pineSoft: "var(--color-pine-soft)",
  line: "var(--color-line)",
  danger: "var(--color-danger)",
}

export default function Settings() {
  const navigate = useNavigate()
  const { profile, updateProfile, user } = useAuth()

  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [exportingJSON, setExportingJSON] = useState(false)
  const [exportingMD, setExportingMD] = useState(false)
  const [exportStatus, setExportStatus] = useState("")

  useEffect(() => {
    document.title = 'Settings — Throughline'
    if (profile) {
      setDisplayName(profile.display_name || "")
      setBio(profile.bio || "")
    }
  }, [profile])

  async function handleExportJSON() {
    if (!user) return
    setExportingJSON(true)
    setExportStatus("Generating cryptographic JSON archive...")
    try {
      const { data: topics, error: tErr } = await supabase
        .from('topics')
        .select('*')
        .eq('user_id', user.id)
      if (tErr) throw tErr

      const { data: entries, error: eErr } = await supabase
        .from('private_entries')
        .select('*, public_posts(*)')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: true })
      if (eErr) throw eErr

      const { data: revisions } = await supabase
        .from('entry_revisions')
        .select('*')
        .eq('revised_by', user.id)
        .order('revised_at', { ascending: false })

      const { data: outbox } = await supabase
        .from('outbox_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      downloadJSONArchive({
        profile,
        topics: topics || [],
        entries: entries || [],
        revisions: revisions || [],
        outbox: outbox || []
      })
      setExportStatus("JSON archive downloaded successfully.")
    } catch (err) {
      console.error('Export JSON error:', err)
      setExportStatus("Failed to generate JSON archive.")
    } finally {
      setExportingJSON(false)
    }
  }

  async function handleExportMarkdown() {
    if (!user) return
    setExportingMD(true)
    setExportStatus("Synthesizing Obsidian / Logseq Markdown digest...")
    try {
      const { data: topics, error: tErr } = await supabase
        .from('topics')
        .select('*')
        .eq('user_id', user.id)
      if (tErr) throw tErr

      const { data: entries, error: eErr } = await supabase
        .from('private_entries')
        .select('*, public_posts(*)')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: true })
      if (eErr) throw eErr

      downloadMarkdownDigest({
        profile,
        topics: topics || [],
        entries: entries || []
      })
      setExportStatus("Markdown digest downloaded successfully.")
    } catch (err) {
      console.error('Export Markdown error:', err)
      setExportStatus("Failed to generate Markdown digest.")
    } finally {
      setExportingMD(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    setMessage("")
    setIsError(false)

    const nameMod = moderateContent(displayName)
    if (!nameMod.isValid) {
      setIsError(true)
      setMessage(`Display name contains flagged language: ${nameMod.category}`)
      setLoading(false)
      return
    }

    const bioMod = moderateContent(bio)
    if (!bioMod.isValid) {
      setIsError(true)
      setMessage(`Profile bio contains flagged language: ${bioMod.category}`)
      setLoading(false)
      return
    }

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

        {/* Epistemic Data Portability & Vault Export Card */}
        <div style={{ background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 12, padding: 24, marginTop: 24 }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
            <Database size={18} color={tokens.pine} />
            <h2 className="tl-display" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
              Sovereign Data Portability & Vault Export
            </h2>
          </div>
          <p style={{ fontSize: 13, color: tokens.inkSoft, lineHeight: 1.5, margin: "0 0 16px" }}>
            Preserve complete ownership of your intellectual trajectory. Export your entire cognitive history with cryptographic timestamps, conviction vectors, and revision logs. Compatible directly with Obsidian, Logseq, and local Markdown notes.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleExportMarkdown}
              disabled={exportingMD}
              className="tl-focus btn-premium flex-1 flex items-center justify-center gap-2"
              style={{
                background: tokens.paper,
                color: tokens.ink,
                border: `1px solid ${tokens.line}`,
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 500,
                cursor: exportingMD ? "not-allowed" : "pointer"
              }}
            >
              <FileText size={15} color={tokens.pine} />
              <span>{exportingMD ? "Exporting..." : "Obsidian / Logseq Markdown"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              disabled={exportingJSON}
              className="tl-focus btn-premium flex-1 flex items-center justify-center gap-2"
              style={{
                background: tokens.paper,
                color: tokens.ink,
                border: `1px solid ${tokens.line}`,
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 500,
                cursor: exportingJSON ? "not-allowed" : "pointer"
              }}
            >
              <Download size={15} color={tokens.pine} />
              <span>{exportingJSON ? "Exporting..." : "Full JSON Archive (GDPR)"}</span>
            </button>
          </div>

          {exportStatus && (
            <div className="tl-mono flex items-center gap-1.5" style={{ fontSize: 12, color: tokens.pine, marginTop: 14 }}>
              <ShieldCheck size={14} />
              <span>{exportStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
