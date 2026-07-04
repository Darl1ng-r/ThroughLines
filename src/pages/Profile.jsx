import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'

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
  line: "#D9D2C0",
}

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { profile: currentProfile } = useAuth()
  
  const [profile, setProfile] = useState(null)
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const isSelf = currentProfile && currentProfile.username === username

  useEffect(() => {
    fetchProfileAndTopics()
  }, [username])

  async function fetchProfileAndTopics() {
    try {
      setLoading(true)
      setError("")

      // 1. Fetch profile
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

      // 2. Fetch topics with their approved public posts
      const { data: topicsData, error: topicsErr } = await supabase
        .from('topics')
        .select(`
          id,
          title,
          slug,
          public_posts (
            id,
            moderation_status
          )
        `)
        .eq('user_id', profileData.id)
        .eq('public_posts.moderation_status', 'approved')

      if (topicsErr) throw topicsErr

      // Filter in JS to only include topics with at least one approved public post (or if it's self-previewing, maybe show empty topics? But spec says "Only approved public entries are shown")
      const filteredTopics = (topicsData || [])
        .filter(t => t.public_posts && t.public_posts.length > 0)
        .map(t => ({
          ...t,
          publicCount: t.public_posts.length
        }))

      setTopics(filteredTopics)
    } catch (err) {
      console.error('Error loading profile page:', err)
      setError("An error occurred loading the profile.")
    } finally {
      setLoading(false)
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
        {/* Back Button */}
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
            This is how your profile looks to anyone who isn't you.
          </div>
        )}

        {/* Profile Card */}
        <div className="flex items-center gap-4" style={{ marginBottom: 12 }}>
          <div 
            className="tl-display" 
            style={{ 
              width: 56, 
              height: 56, 
              borderRadius: "50%", 
              background: tokens.plumSoft, 
              color: tokens.plum, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: 20, 
              fontWeight: 600 
            }}
          >
            {initials}
          </div>
          <div>
            <h1 className="tl-display" style={{ fontSize: 22, fontWeight: 600 }}>
              {profile.display_name || profile.username}
            </h1>
            <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>
              @{profile.username}
            </p>
          </div>
        </div>
        
        <p style={{ fontSize: 14.5, color: tokens.inkSoft, margin: "12px 0 6px", lineHeight: 1.5 }}>
          {profile.bio || "No biography provided."}
        </p>
        
        <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, marginBottom: 28 }}>
          {topics.length} public {topics.length === 1 ? "throughline" : "throughlines"} · {totalPublicEntries} public {totalPublicEntries === 1 ? "entry" : "entries"}
        </p>

        {/* Public Topics Grid */}
        {topics.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: tokens.inkFaint, background: tokens.card, borderRadius: 10, border: `1px dashed ${tokens.line}` }}>
            <p className="tl-display" style={{ fontSize: 16, marginBottom: 4 }}>No public throughlines yet</p>
            <p style={{ fontSize: 13 }}>When this user publishes entries, they will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {topics.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/${profile.username}/${t.slug}`)}
                className="tl-focus btn-premium"
                style={{ 
                  textAlign: "left", 
                  background: tokens.card, 
                  border: `1px solid ${tokens.line}`, 
                  borderRadius: 10, 
                  padding: "14px 16px", 
                  cursor: "pointer" 
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="tl-display" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                    {t.title}
                  </h3>
                  <ArrowUpRight size={14} color={tokens.inkFaint} />
                </div>
                <p className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint, margin: "4px 0 0" }}>
                  {t.publicCount} public {t.publicCount === 1 ? "entry" : "entries"}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
