import React, { useState, useEffect, lazy, Suspense } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
const ConfidenceChart = lazy(() => import('../components/ConfidenceChart'))
import ErrorBoundary from '../components/ErrorBoundary'
import { ArrowLeft, Send, User } from 'lucide-react'

import MarkdownText from '../components/MarkdownText'

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
}

function Meter({ value }) {
  const barColor = value >= 70 ? tokens.pine : value >= 40 ? "#56826E" : tokens.ember
  return (
    <div className="flex items-center gap-2">
      <div style={{ width: 48, height: 5, borderRadius: 3, background: tokens.line, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.3s ease" }} />
      </div>
      <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft }}>{value}% sure</span>
    </div>
  )
}

export default function TopicDetail() {
  const { username, topicSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile: currentProfile, user } = useAuth()

  // Instant hydration from Discover navigation state if available
  const initialTopic = location.state?.initialTopic
  const initialProfile = location.state?.initialProfile || location.state?.initialTopic?.profiles

  const [profile, setProfile] = useState(initialProfile || null)
  const [topic, setTopic] = useState(initialTopic || null)
  const [posts, setPosts] = useState(initialTopic?.public_posts || [])
  const [loading, setLoading] = useState(!initialTopic)
  const [error, setError] = useState("")
  const [toastMsg, setToastMsg] = useState("")
  const [selectedEntryId, setSelectedEntryId] = useState(null)
  const [nudgeCooldown, setNudgeCooldown] = useState(0)
  const [hasNudged, setHasNudged] = useState(false)

  const isSelf = currentProfile && currentProfile.username === username

  function handleSelectEntry(id) {
    setSelectedEntryId(id)
    const el = document.getElementById(`entry-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  useEffect(() => {
    fetchTopicData(Boolean(initialTopic))
  }, [username, topicSlug])

  async function fetchTopicData(isBackground = false) {
    try {
      if (!isBackground) setLoading(true)
      setError("")

      // Consolidated single query joining topics, profiles, and public_posts
      const { data, error: queryErr } = await supabase
        .from('topics')
        .select(`
          id,
          title,
          slug,
          user_id,
          created_at,
          profiles!inner (
            id,
            username,
            display_name,
            bio,
            avatar_url
          ),
          public_posts (
            id,
            content,
            confidence_rating,
            entry_date,
            moderation_status
          )
        `)
        .eq('slug', topicSlug)
        .eq('profiles.username', username)
        .order('entry_date', { foreignTable: 'public_posts', ascending: true })
        .maybeSingle()

      if (queryErr) throw queryErr
      if (!data) {
        if (!isBackground) {
          setError("Throughline topic not found")
        }
        return
      }

      setProfile(data.profiles)
      setTopic(data)
      const approvedPosts = (data.public_posts || []).filter(p => p.moderation_status === 'approved')
      setPosts(approvedPosts)
    } catch (err) {
      console.error('Error fetching topic detail:', err)
      if (!isBackground) {
        setError("An error occurred loading the throughline.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Rate limiting cooldown timer for Nudge action
  useEffect(() => {
    if (!topic?.id) return
    const key = `nudge_cooldown_${topic.id}`
    const lastNudgeTime = sessionStorage.getItem(key)
    if (lastNudgeTime) {
      const elapsed = Math.floor((Date.now() - Number(lastNudgeTime)) / 1000)
      if (elapsed < 30) {
        setNudgeCooldown(30 - elapsed)
      }
    }

    if (user && topic?.id) {
      supabase
        .from('nudges')
        .select('id')
        .eq('topic_id', topic.id)
        .eq('nudger_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setHasNudged(true)
        })
    }
  }, [topic?.id, user])

  useEffect(() => {
    if (nudgeCooldown <= 0) return
    const timer = setInterval(() => {
      setNudgeCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [nudgeCooldown])

  async function handleNudge() {
    if (!topic || nudgeCooldown > 0 || hasNudged) return
    if (!user || !currentProfile) {
      navigate('/')
      return
    }
    try {
      const key = `nudge_cooldown_${topic.id}`
      sessionStorage.setItem(key, String(Date.now()))
      setNudgeCooldown(30)

      const { error } = await supabase
        .from('nudges')
        .insert({
          topic_id: topic.id,
          nudger_id: currentProfile.id
        })
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setHasNudged(true)
          setToastMsg("You have already nudged this topic!")
        } else {
          throw error
        }
      } else {
        setHasNudged(true)
        setToastMsg(`Nudge sent to @${username} for an update!`)
      }
    } catch (err) {
      console.error('Error sending nudge:', err)
      setToastMsg("Could not send nudge. Please try again.")
    } finally {
      setTimeout(() => setToastMsg(""), 3000)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: tokens.inkSoft }} className="tl-mono">
        Loading throughline timeline...
      </div>
    )
  }

  if (error || !topic) {
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", padding: 24, textAlign: "center" }}>
        <h2 className="tl-display" style={{ fontSize: 22, color: tokens.inkSoft, marginBottom: 8 }}>{error || "Topic not found"}</h2>
        <p style={{ color: tokens.inkFaint, marginBottom: 20 }}>This throughline might be private or does not exist.</p>
        <button onClick={() => navigate('/discover')} className="tl-focus btn-premium" style={{ background: tokens.pine, color: tokens.paper, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
          Back to Discover
        </button>
      </div>
    )
  }

  const chartEntries = posts.map(p => ({
    id: p.id,
    entry_date: p.entry_date,
    confidence_rating: p.confidence_rating,
    visibility: 'public',
    text: p.content
  }))

  return (
    <div className="tl-scroll tl-ambient-glow" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 58px)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 24px 80px" }}>
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 20 }}>
          <button 
            onClick={() => navigate('/discover')} 
            className="tl-focus flex items-center gap-1.5 btn-premium" 
            style={{ background: "transparent", border: "none", color: tokens.inkSoft, cursor: "pointer", fontSize: 13, padding: 0 }}
          >
            <ArrowLeft size={14} /> Back to Discover
          </button>

          <button
            onClick={() => navigate(`/${username}`)}
            className="tl-focus btn-premium flex items-center gap-2"
            style={{
              background: tokens.paperDeep,
              border: `1px solid ${tokens.line}`,
              borderRadius: 999,
              padding: "4px 12px 4px 6px",
              fontSize: 12,
              color: tokens.ink,
              cursor: "pointer"
            }}
            title={`View ${profile?.display_name || username}'s full profile`}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || username}
                style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: tokens.pineSoft,
                  color: tokens.pine,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600
                }}
              >
                {(profile?.display_name || username || 'U')[0].toUpperCase()}
              </div>
            )}
            <span style={{ fontWeight: 500 }}>@{username}</span>
            <span style={{ fontSize: 11, color: tokens.inkFaint }}>profile →</span>
          </button>
        </div>

        {isSelf && (
          <div 
            style={{ 
              background: tokens.emberSoft, 
              border: `1px solid ${tokens.ember}33`, 
              borderRadius: 8, 
              padding: "8px 12px", 
              fontSize: 12.5, 
              color: tokens.ember, 
              marginBottom: 20 
            }}
          >
            Previewing how this throughline looks to visitors — only approved public entries are shown.
          </div>
        )}

        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <button 
            onClick={() => navigate(`/${username}`)}
            className="tl-mono tl-focus" 
            style={{ fontSize: 12, color: tokens.pine, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
            @{username}
          </button>
          {profile?.display_name && (
            <span style={{ fontSize: 12, color: tokens.inkSoft }}>• {profile.display_name}</span>
          )}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="tl-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 4px", color: tokens.ink }}>
              {topic.title}
            </h1>
            <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, margin: 0 }}>
              {posts.length} public {posts.length === 1 ? "entry" : "entries"}
            </p>
          </div>

          {!isSelf && (
            <button
              onClick={handleNudge}
              disabled={hasNudged || nudgeCooldown > 0}
              className="tl-focus btn-premium flex items-center gap-1"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${tokens.line}`,
                background: hasNudged ? tokens.pineSoft : tokens.emberSoft,
                color: hasNudged ? tokens.pine : tokens.ember,
                fontSize: 12,
                fontWeight: 600,
                cursor: (hasNudged || nudgeCooldown > 0) ? "default" : "pointer"
              }}
            >
              <span>
                {hasNudged 
                  ? "✓ Nudge Sent" 
                  : nudgeCooldown > 0 
                    ? `Nudge (${nudgeCooldown}s)` 
                    : "🔔 Nudge for update"}
              </span>
            </button>
          )}
        </div>

        {/* Confidence Chart with localized Error Boundary */}
        <ErrorBoundary fallback={
          <div style={{ padding: 16, background: tokens.card, borderRadius: 8, border: `1px dashed ${tokens.line}`, textAlign: 'center', fontSize: 13, color: tokens.inkSoft, marginBottom: 24 }}>
            Trajectory chart temporarily unavailable.
          </div>
        }>
          <Suspense fallback={<div style={{ height: 160, background: tokens.paperDeep, borderRadius: 8, margin: "16px 0", opacity: 0.5 }} />}>
            <ConfidenceChart entries={chartEntries} onSelectEntry={handleSelectEntry} selectedEntryId={selectedEntryId} />
          </Suspense>
        </ErrorBoundary>

        {/* Timeline List */}
        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: tokens.inkFaint, background: tokens.card, borderRadius: 10, border: `1px dashed ${tokens.line}` }}>
            <p className="tl-display" style={{ fontSize: 16, marginBottom: 4 }}>No public entries yet</p>
            <p style={{ fontSize: 13 }}>Check back later for updates on this topic.</p>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <div 
              style={{ 
                position: "absolute", 
                left: 5, 
                top: 6, 
                bottom: 6, 
                width: 2, 
                background: `repeating-linear-gradient(to bottom, ${tokens.line} 0, ${tokens.line} 4px, transparent 4px, transparent 8px)` 
              }} 
            />
            
            <div className="flex flex-col gap-6">
              {posts.map((entry, index) => {
                let formattedDate = entry.entry_date
                try {
                  const d = new Date(entry.entry_date)
                  if (!isNaN(d.getTime())) {
                    formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  }
                } catch (_) {}

                const isSelected = selectedEntryId === entry.id
                const isLatest = index === posts.length - 1
                const nodeColor = isSelected 
                  ? tokens.ember 
                  : (entry.confidence_rating >= 70 ? tokens.pine : entry.confidence_rating >= 40 ? '#56826E' : tokens.ember)

                return (
                  <div id={`entry-${entry.id}`} key={entry.id} className="tl-entry flex gap-4" style={{ position: "relative" }}>
                    <div 
                      style={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: "50%", 
                        background: isSelected ? tokens.ember : nodeColor, 
                        border: `2.5px solid ${isSelected ? tokens.ember : nodeColor}`, 
                        boxShadow: isLatest 
                          ? `0 0 0 3px ${nodeColor}33, 0 0 8px ${nodeColor}44` 
                          : (isSelected ? `0 0 0 3px ${tokens.ember}33` : "none"),
                        flexShrink: 0, 
                        marginTop: 6,
                        transition: "all 0.25s ease"
                      }} 
                      title={`${entry.confidence_rating}% conviction`}
                    />
                    
                    <div 
                      className="tl-card tl-card-interactive"
                      style={{ 
                        flex: 1, 
                        background: tokens.card, 
                        border: isSelected ? `2px solid ${tokens.ember}` : `1px solid ${tokens.line}`, 
                        borderRadius: 12, 
                        padding: "16px 18px",
                        boxShadow: isSelected ? "var(--shadow-hover)" : "var(--shadow-card)",
                        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                      }}
                    >
                      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                        <div className="flex items-center gap-3">
                          <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>
                            {formattedDate}
                          </span>
                          <Meter value={entry.confidence_rating} />
                        </div>
                      </div>
                      <div style={{ fontSize: 14.5, color: tokens.ink, margin: 0 }}>
                        <MarkdownText content={entry.content} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!isSelf && (
          <button
            onClick={handleNudge}
            disabled={nudgeCooldown > 0}
            className="tl-focus flex items-center gap-2 btn-premium"
            style={{ 
              marginTop: 28, 
              padding: "9px 16px", 
              borderRadius: 8, 
              border: `1px solid ${nudgeCooldown > 0 ? tokens.line : tokens.ember}`, 
              background: nudgeCooldown > 0 ? tokens.paperDeep : tokens.card, 
              color: nudgeCooldown > 0 ? tokens.inkFaint : tokens.ink, 
              fontSize: 13, 
              fontWeight: 500, 
              cursor: nudgeCooldown > 0 ? "not-allowed" : "pointer" 
            }}
          >
            <Send size={13} /> {nudgeCooldown > 0 ? `Nudge sent (Wait ${nudgeCooldown}s)` : `Nudge @${username} for an update`}
          </button>
        )}
      </div>

      {toastMsg && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: tokens.ink, color: tokens.paper, padding: "10px 18px", borderRadius: 999, fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 50 }}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}
