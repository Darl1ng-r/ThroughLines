import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { ArrowUpRight, Compass, Search } from 'lucide-react'

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
}

export default function Discover() {
  const navigate = useNavigate()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchDiscoverFeed()
  }, [])

  async function fetchDiscoverFeed() {
    try {
      setLoading(true)
      // Fetch topics, join profiles and approved public posts
      const { data, error } = await supabase
        .from('topics')
        .select(`
          id,
          title,
          slug,
          user_id,
          profiles (
            username,
            display_name,
            bio
          ),
          public_posts (
            id,
            content,
            confidence_rating,
            entry_date,
            moderation_status
          )
        `)
        .eq('public_posts.moderation_status', 'approved')

      if (error) throw error

      // Filter in JS to only include topics with at least one approved public post
      const filtered = (data || [])
        .filter(t => t.public_posts && t.public_posts.length > 0)
        .map(t => {
          // Sort posts by entry_date to find the latest update
          const sortedPosts = [...t.public_posts].sort(
            (a, b) => new Date(a.entry_date) - new Date(b.entry_date)
          )
          return {
            ...t,
            public_posts: sortedPosts,
            latestPost: sortedPosts[sortedPosts.length - 1],
            span: `${sortedPosts.length} ${sortedPosts.length === 1 ? 'entry' : 'entries'}`
          }
        })

      setTopics(filtered)
    } catch (err) {
      console.error('Error fetching discover feed:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredFeed = topics.filter(t => {
    const query = searchQuery.toLowerCase()
    return (
      t.title.toLowerCase().includes(query) ||
      (t.profiles?.username || "").toLowerCase().includes(query) ||
      (t.profiles?.display_name || "").toLowerCase().includes(query) ||
      t.public_posts.some(p => p.content.toLowerCase().includes(query))
    )
  })

  return (
    <div className="tl-scroll" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 58px)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 24px 80px" }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <Compass size={24} color={tokens.pine} />
          <h1 className="tl-display" style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>
            Public throughlines
          </h1>
        </div>
        <p style={{ fontSize: 14, color: tokens.inkSoft, marginBottom: 20 }}>
          Other people's evolving thoughts, out in the open.
        </p>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <Search 
            size={16} 
            color={tokens.inkFaint} 
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} 
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics, content, or writers..."
            className="tl-focus tl-input"
            style={{
              width: "100%",
              padding: "10px 12px 10px 38px",
              borderRadius: 8,
              border: `1px solid ${tokens.line}`,
              background: tokens.card,
              color: tokens.ink,
              fontSize: 14,
              fontFamily: "inherit"
            }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: tokens.inkSoft }} className="tl-mono">
            Loading public minds...
          </div>
        ) : filteredFeed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: tokens.inkSoft, background: tokens.card, borderRadius: 10, border: `1px dashed ${tokens.line}` }}>
            <p className="tl-display" style={{ fontSize: 16, marginBottom: 4 }}>No throughlines found</p>
            <p style={{ fontSize: 13, color: tokens.inkFaint }}>Try adjusting your search terms or check back later.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredFeed.map((topic) => (
              <div 
                key={topic.id} 
                className="tl-entry"
                style={{ 
                  background: tokens.card, 
                  border: `1px solid ${tokens.line}`, 
                  borderRadius: 10, 
                  padding: "16px 18px",
                  boxShadow: "0 2px 8px rgba(33, 31, 27, 0.02)"
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <button 
                    onClick={() => navigate(`/${topic.profiles?.username}`)}
                    className="tl-mono tl-focus"
                    style={{ 
                      fontSize: 12, 
                      color: tokens.pine, 
                      background: "none", 
                      border: "none", 
                      cursor: "pointer",
                      fontWeight: 600,
                      padding: 0
                    }}
                  >
                    @{topic.profiles?.username || 'anonymous'}
                  </button>
                  <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>
                    {topic.span}
                  </span>
                </div>
                
                <h3 
                  className="tl-display" 
                  style={{ 
                    fontSize: 18, 
                    fontWeight: 600, 
                    margin: "0 0 8px", 
                    cursor: "pointer" 
                  }}
                  onClick={() => navigate(`/${topic.profiles?.username}/${topic.slug}`)}
                >
                  {topic.title}
                </h3>
                
                <p style={{ fontSize: 14, lineHeight: 1.55, color: tokens.ink, margin: "0 0 12px" }}>
                  {topic.latestPost?.content}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>
                    Latest confidence: <strong style={{ color: tokens.pine }}>{topic.latestPost?.confidence_rating}%</strong>
                  </span>
                  
                  <button 
                    onClick={() => navigate(`/${topic.profiles?.username}/${topic.slug}`)} 
                    className="tl-focus flex items-center gap-1 btn-premium" 
                    style={{ 
                      border: "none", 
                      background: "none", 
                      cursor: "pointer", 
                      color: tokens.pine, 
                      fontSize: 13, 
                      fontWeight: 500, 
                      padding: 0 
                    }}
                  >
                    Read timeline <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
