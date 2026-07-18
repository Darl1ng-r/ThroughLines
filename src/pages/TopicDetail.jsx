import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import ConfidenceChart from '../components/ConfidenceChart'
import { ArrowLeft, Send } from 'lucide-react'

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
  return (
    <div className="flex items-center gap-2">
      <div style={{ width: 46, height: 4, borderRadius: 2, background: tokens.line, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: tokens.pine }} />
      </div>
      <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft }}>{value}% sure</span>
    </div>
  )
}

export default function TopicDetail() {
  const { username, topicSlug } = useParams()
  const navigate = useNavigate()
  const { profile: currentProfile } = useAuth()

  const [profile, setProfile] = useState(null)
  const [topic, setTopic] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [toastMsg, setToastMsg] = useState("")

  const isSelf = currentProfile && currentProfile.username === username

  useEffect(() => {
    fetchTopicData()
  }, [username, topicSlug])

  async function fetchTopicData() {
    try {
      setLoading(true)
      setError("")

      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle()

      if (profileErr) throw profileErr
      if (!profileData) {
        setError("User profile not found")
        setLoading(false)
        return
      }
      setProfile(profileData)

      const { data: topicData, error: topicErr } = await supabase
        .from('topics')
        .select('*')
        .eq('slug', topicSlug)
        .eq('user_id', profileData.id)
        .maybeSingle()

      if (topicErr) throw topicErr
      if (!topicData) {
        setError("Throughline topic not found")
        setLoading(false)
        return
      }
      setTopic(topicData)

      const { data: postsData, error: postsErr } = await supabase
        .from('public_posts')
        .select('*')
        .eq('topic_id', topicData.id)
        .eq('moderation_status', 'approved')
        .order('entry_date', { ascending: true })

      if (postsErr) throw postsErr
      setPosts(postsData || [])
    } catch (err) {
      console.error('Error fetching topic detail:', err)
      setError("An error occurred loading the throughline.")
    } finally {
      setLoading(false)
    }
  }

  async function handleNudge() {
    try {
      const { error } = await supabase
        .from('nudges')
        .insert({
          topic_id: topic.id,
          nudger_id: currentProfile?.id || null
        })
      if (error) throw error
      setToastMsg(`Nudge sent to @${username} for an update.`)
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
    entry_date: p.entry_date,
    confidence_rating: p.confidence_rating,
    visibility: 'public',
    text: p.content
  }))

  return (
    <div className="tl-scroll" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 58px)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 24px 80px" }}>
        <button 
          onClick={() => navigate(`/${username}`)} 
          className="tl-focus flex items-center gap-1 btn-premium" 
          style={{ background: "transparent", border: "none", color: tokens.inkSoft, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}
        >
          <ArrowLeft size={14} /> Back to @{username}'s profile
        </button>

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

        <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, marginBottom: 4 }}>
          @{username}
        </p>
        
        <h1 className="tl-display" style={{ fontSize: 28, fontWeight: 600, marginBottom: 6, color: tokens.ink }}>
          {topic.title}
        </h1>
        
        <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, marginBottom: 24 }}>
          {posts.length} public {posts.length === 1 ? "entry" : "entries"}
        </p>

        {/* Confidence Chart */}
        <ConfidenceChart entries={chartEntries} />

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
              {posts.map((entry) => {
                let formattedDate = entry.entry_date
                try {
                  const d = new Date(entry.entry_date)
                  if (!isNaN(d.getTime())) {
                    formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  }
                } catch (_) {}

                return (
                  <div key={entry.id} className="tl-entry flex gap-4" style={{ position: "relative" }}>
                    <div style={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: "50%", 
                      background: tokens.pine, 
                      border: `2px solid ${tokens.pine}`, 
                      flexShrink: 0, 
                      marginTop: 6 
                    }} />
                    
                    <div style={{ flex: 1, background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: "14px 16px" }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                        <div className="flex items-center gap-3">
                          <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>
                            {formattedDate}
                          </span>
                          <Meter value={entry.confidence_rating} />
                        </div>
                      </div>
                      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: tokens.ink, margin: 0, whiteSpace: "pre-wrap" }}>
                        {entry.content}
                      </p>
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
            className="tl-focus flex items-center gap-2 btn-premium"
            style={{ 
              marginTop: 28, 
              padding: "9px 16px", 
              borderRadius: 8, 
              border: `1px solid ${tokens.line}`, 
              background: tokens.card, 
              color: tokens.ink, 
              fontSize: 13, 
              fontWeight: 500, 
              cursor: "pointer" 
            }}
          >
            <Send size={13} /> Nudge @{username} for an update
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
