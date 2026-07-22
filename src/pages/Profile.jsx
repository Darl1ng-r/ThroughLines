import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, ArrowUpRight, Award, Bell, ChevronDown } from 'lucide-react'

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
  line: "var(--color-line)",
}

function MiniSparkline({ posts }) {
  if (!posts || posts.length < 2) return null
  const sorted = [...posts].sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))
  const width = 54
  const height = 20
  const points = sorted.map((p, i) => {
    const x = (i / (sorted.length - 1)) * width
    const y = height - Math.max(0, Math.min(100, p.confidence_rating || 50)) / 100 * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <polyline
          fill="none"
          stroke="var(--color-pine)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    </div>
  )
}

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { profile: currentProfile, user } = useAuth()
  
  const [profile, setProfile] = useState(null)
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [nudgedTopicIds, setNudgedTopicIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tl_nudged_topics') || '[]')
    } catch (_) {
      return []
    }
  })

  // Pagination state for scalability
  const [page, setPage] = useState(0)
  const [hasMoreTopics, setHasMoreTopics] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const TOPICS_PAGE_SIZE = 10

  const isSelf = currentProfile && currentProfile.username === username

  useEffect(() => {
    setPage(0)
    fetchProfileAndTopics(0, true)
  }, [username])

  async function fetchProfileAndTopics(pageNum = 0, isInitial = false) {
    try {
      if (isInitial) {
        setLoading(true)
        setError("")
      } else {
        setLoadingMore(true)
      }

      let activeProfile = profile
      if (isInitial || !activeProfile) {
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
        activeProfile = profileData
      }

      // Check DB for existing user nudges if authenticated
      if (user && isInitial) {
        const { data: userNudges } = await supabase
          .from('nudges')
          .select('topic_id')
          .eq('nudger_id', user.id)

        if (userNudges) {
          const dbNudged = userNudges.map(n => n.topic_id)
          setNudgedTopicIds(prev => {
            const combined = Array.from(new Set([...prev, ...dbNudged]))
            localStorage.setItem('tl_nudged_topics', JSON.stringify(combined))
            return combined
          })
        }
      }

      const from = pageNum * TOPICS_PAGE_SIZE
      const to = from + TOPICS_PAGE_SIZE - 1

      const { data: topicsData, error: topicsErr } = await supabase
        .from('topics')
        .select(`
          id,
          title,
          slug,
          public_posts (
            id,
            moderation_status,
            confidence_rating
          )
        `)
        .eq('user_id', activeProfile.id)
        .eq('public_posts.moderation_status', 'approved')
        .range(from, to)

      if (topicsErr) throw topicsErr

      const filteredTopics = (topicsData || [])
        .filter(t => t.public_posts && t.public_posts.length > 0)
        .map(t => {
          const avgConfidence = Math.round(
            t.public_posts.reduce((acc, p) => acc + (p.confidence_rating || 50), 0) / t.public_posts.length
          )
          return {
            ...t,
            publicCount: t.public_posts.length,
            avgConfidence
          }
        })

      if (isInitial) {
        setTopics(filteredTopics)
      } else {
        setTopics(prev => [...prev, ...filteredTopics])
      }

      setHasMoreTopics(topicsData && topicsData.length === TOPICS_PAGE_SIZE)
    } catch (err) {
      console.error('Error loading profile page:', err)
      setError("An error occurred loading the profile.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  function loadMoreTopics() {
    if (loadingMore || !hasMoreTopics) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchProfileAndTopics(nextPage, false)
  }

  async function sendNudge(topicId) {
    if (!user) {
      navigate('/')
      return
    }
    try {
      const { error } = await supabase
        .from('nudges')
        .insert({
          topic_id: topicId,
          nudger_id: user.id
        })
      if (!error || error.code === '23505') {
        setNudgedTopicIds(prev => {
          if (prev.includes(topicId)) return prev
          const updated = [...prev, topicId]
          localStorage.setItem('tl_nudged_topics', JSON.stringify(updated))
          return updated
        })
      } else {
        console.error('Nudge error:', error)
      }
    } catch (err) {
      console.error('Nudge error:', err)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: tokens.inkSoft }} className="tl-mono">
        Loading creator profile...
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", padding: 24, textAlign: "center" }}>
        <h2 className="tl-display" style={{ fontSize: 22, color: tokens.inkSoft, marginBottom: 8 }}>{error || "Profile not found"}</h2>
        <p style={{ color: tokens.inkFaint, marginBottom: 20 }}>This profile might be private or does not exist.</p>
        <button onClick={() => navigate('/discover')} className="tl-focus btn-premium" style={{ background: tokens.pine, color: tokens.paper, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
          Back to Discover
        </button>
      </div>
    )
  }

  const initials = (profile.display_name || profile.username)
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const totalPublicEntries = topics.reduce((sum, t) => sum + t.publicCount, 0)

  return (
    <div className="tl-scroll" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 58px)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 24px 80px" }}>
        <button 
          onClick={() => navigate('/discover')} 
          className="tl-focus flex items-center gap-1 btn-premium" 
          style={{ background: "transparent", border: "none", color: tokens.inkSoft, cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}
        >
          <ArrowLeft size={16} /> Back to Discover
        </button>

        {isSelf && (
          <div 
            style={{ 
              background: tokens.plumSoft, 
              border: `1px solid ${tokens.plum}33`, 
              borderRadius: 8, 
              padding: "10px 14px", 
              fontSize: 12.5, 
              color: tokens.plum, 
              marginBottom: 24 
            }}
          >
            This is how your creator profile looks to visitors.
          </div>
        )}

        {/* Profile Card Header */}
        <div className="flex items-center gap-4" style={{ marginBottom: 16 }}>
          <div 
            className="tl-display" 
            style={{ 
              width: 64, 
              height: 64, 
              borderRadius: "50%", 
              background: tokens.plumSoft, 
              color: tokens.plum, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: 22, 
              fontWeight: 600 
            }}
          >
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="tl-display" style={{ fontSize: 24, fontWeight: 600, margin: 0, color: tokens.ink }}>
                {profile.display_name || profile.username}
              </h1>
              <Award size={18} color={tokens.pine} title="Verified Thinker" />
            </div>
            <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, margin: "2px 0 0" }}>
              @{profile.username}
            </p>
          </div>
        </div>
        
        <p style={{ fontSize: 14.5, color: tokens.inkSoft, margin: "0 0 20px", lineHeight: 1.5 }}>
          {profile.bio || "No biography provided."}
        </p>

        {/* Creator Stats Row */}
        <div 
          className="flex items-center justify-between" 
          style={{ 
            background: tokens.card, 
            border: `1px solid ${tokens.line}`, 
            borderRadius: 10, 
            padding: "14px 20px", 
            marginBottom: 32 
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div className="tl-mono" style={{ fontSize: 18, fontWeight: 700, color: tokens.pine }}>
              {topics.length}
            </div>
            <div className="tl-mono" style={{ fontSize: 10, color: tokens.inkFaint, textTransform: "uppercase" }}>
              Throughlines
            </div>
          </div>

          <div style={{ width: 1, height: 28, background: tokens.line }} />

          <div style={{ textAlign: "center" }}>
            <div className="tl-mono" style={{ fontSize: 18, fontWeight: 700, color: tokens.plum }}>
              {totalPublicEntries}
            </div>
            <div className="tl-mono" style={{ fontSize: 10, color: tokens.inkFaint, textTransform: "uppercase" }}>
              Public Logs
            </div>
          </div>

          <div style={{ width: 1, height: 28, background: tokens.line }} />

          <div style={{ textAlign: "center" }}>
            <div className="tl-mono" style={{ fontSize: 18, fontWeight: 700, color: tokens.ember }}>
              Slow Social
            </div>
            <div className="tl-mono" style={{ fontSize: 10, color: tokens.inkFaint, textTransform: "uppercase" }}>
              Writing Pace
            </div>
          </div>
        </div>

        <h2 className="tl-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 14, color: tokens.ink }}>
          Public Throughlines
        </h2>

        {/* Public Topics Grid */}
        {topics.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: tokens.inkFaint, background: tokens.card, borderRadius: 10, border: `1px dashed ${tokens.line}` }}>
            <p className="tl-display" style={{ fontSize: 16, marginBottom: 4 }}>No public throughlines yet</p>
            <p style={{ fontSize: 13 }}>When this user publishes entries, they will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {topics.map((t) => (
              <div
                key={t.id}
                className="tl-entry"
                style={{ 
                  background: tokens.card, 
                  border: `1px solid ${tokens.line}`, 
                  borderRadius: 10, 
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <h3 
                    className="tl-display" 
                    style={{ fontSize: 17, fontWeight: 600, margin: "0 0 4px", cursor: "pointer", color: tokens.ink }}
                    onClick={() => navigate(`/${profile.username}/${t.slug}`)}
                  >
                    {t.title}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>
                      {t.publicCount} public {t.publicCount === 1 ? "entry" : "entries"}
                    </span>
                    <span className="tl-mono" style={{ fontSize: 11, color: tokens.pine }}>
                      Avg confidence: {t.avgConfidence}%
                    </span>
                    <MiniSparkline posts={t.public_posts} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isSelf && (
                    <button
                      onClick={() => sendNudge(t.id)}
                      disabled={nudgedTopicIds.includes(t.id)}
                      className="tl-focus btn-premium flex items-center gap-1"
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: `1px solid ${tokens.line}`,
                        background: nudgedTopicIds.includes(t.id) ? tokens.pineSoft : tokens.emberSoft,
                        color: nudgedTopicIds.includes(t.id) ? tokens.pine : tokens.ember,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: nudgedTopicIds.includes(t.id) ? "default" : "pointer"
                      }}
                    >
                      <Bell size={12} /> {nudgedTopicIds.includes(t.id) ? "Nudge sent!" : "Nudge"}
                    </button>
                  )}

                  <button
                    onClick={() => navigate(`/${profile.username}/${t.slug}`)}
                    className="tl-focus btn-premium flex items-center gap-1"
                    style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: tokens.pine, color: tokens.paper, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                  >
                    View <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Pagination */}
        {hasMoreTopics && topics.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button 
              onClick={loadMoreTopics}
              disabled={loadingMore}
              className="tl-focus btn-premium flex items-center justify-center gap-1"
              style={{ 
                margin: "0 auto", 
                padding: "9px 18px", 
                borderRadius: 8, 
                border: `1px solid ${tokens.line}`, 
                background: tokens.card, 
                color: tokens.ink, 
                fontSize: 12.5, 
                fontWeight: 500, 
                cursor: loadingMore ? "not-allowed" : "pointer" 
              }}
            >
              <ChevronDown size={14} /> {loadingMore ? "Loading earlier throughlines..." : "Load more throughlines"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
