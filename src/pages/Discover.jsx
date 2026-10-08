import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { ArrowUpRight, Compass, Search, Bookmark, Share2 } from 'lucide-react'
import { getCache, setCache, invalidateCache, getSyncCache } from '../services/redisCacheService'
import { searchFeed } from '../services/semanticSearchService'
import MiniSparkline from '../components/MiniSparkline'

// Preload ConfidenceChart bundle ahead of user click
const preloadConfidenceChart = () => {
  import('../components/ConfidenceChart').catch(() => {})
}

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
  plum: "var(--color-plum)",
  ember: "var(--color-ember)",
}

// Topic domain & category classifier matching editorial taxonomy
function getTopicCategory(topic) {
  if (topic.category) {
    return { name: topic.category, theme: 'sage' }
  }
  const title = (topic.title || '').toLowerCase()
  const slug = (topic.slug || '').toLowerCase()
  
  if (title.includes('open weights') || title.includes('regulation') || title.includes('safety bill') || slug.includes('regulation') || slug.includes('oligopoly')) {
    return { name: 'AI Policy', theme: 'sage' }
  }
  if (title.includes('compute') || title.includes('ubi') || title.includes('income') || title.includes('capital') || title.includes('economic') || title.includes('market')) {
    return { name: 'Economics', theme: 'sand' }
  }
  if (title.includes('llm') || title.includes('consciousness') || title.includes('reasoning') || title.includes('ai agent') || title.includes('alignment')) {
    return { name: 'AI & Mind', theme: 'sage' }
  }
  if (title.includes('battery') || title.includes('nuclear') || title.includes('energy') || title.includes('storage') || title.includes('grid')) {
    return { name: 'Clean Energy', theme: 'sand' }
  }
  if (title.includes('async') || title.includes('office') || title.includes('coordination') || title.includes('culture') || title.includes('remote')) {
    return { name: 'Work & Systems', theme: 'sage' }
  }
  if (title.includes('crispr') || title.includes('healthspan') || title.includes('epigenetic') || title.includes('biology') || title.includes('longevity')) {
    return { name: 'Bio & Longevity', theme: 'sand' }
  }
  if (title.includes('offloading') || title.includes('cognitive') || title.includes('neuro') || title.includes('brain')) {
    return { name: 'Cognitive Science', theme: 'lavender' }
  }
  if (title.includes('commons') || title.includes('resilience') || title.includes('ecology')) {
    return { name: 'Ecology', theme: 'sage' }
  }
  return { name: 'Perspective', theme: 'sage' }
}

const AVATAR_PALETTES = [
  { bg: "#D5E2D8", text: "#2A4235" }, // Sage (e.g. Zane Holloway)
  { bg: "#EEDCD2", text: "#5A3B30" }, // Warm Peach / Terracotta (e.g. Elena Vance)
  { bg: "#E2DEEE", text: "#383152" }, // Soft Lavender
  { bg: "#EAE5D4", text: "#484025" }, // Soft Sand / Ochre
  { bg: "#DEE7EE", text: "#2B3C4B" }, // Soft Slate
  { bg: "#E8DED8", text: "#4E362C" }, // Warm Clay
]

function getAvatarStyle(username = '', displayName = '') {
  const u = (username || '').toLowerCase()
  if (u.includes('zane')) return AVATAR_PALETTES[0]
  if (u.includes('socrates') || u.includes('elena')) return AVATAR_PALETTES[1]
  if (u.includes('marcus')) return AVATAR_PALETTES[3]
  if (u.includes('talia')) return AVATAR_PALETTES[4]
  if (u.includes('maya')) return AVATAR_PALETTES[2]
  
  let hash = 0
  const str = u || displayName || 'author'
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

export default function Discover() {
  const navigate = useNavigate()
  const cachedInitial = getSyncCache('discover_feed_cursor_null')
  const [topics, setTopics] = useState(cachedInitial || [])
  const [loading, setLoading] = useState(!cachedInitial || cachedInitial.length === 0)
  const [searchQuery, setSearchQuery] = useState("")
  const [feedTab, setFeedTab] = useState("all") // "all" | "bookmarked"
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tl_bookmarks') || '[]')
    } catch (_) {
      return []
    }
  })
  const [toastMsg, setToastMsg] = useState("")

  // Cursor-based pagination state
  const [lastCursor, setLastCursor] = useState(null)  // created_at of last fetched topic
  const [hasMoreFeed, setHasMoreFeed] = useState(true)
  const [loadingMoreFeed, setLoadingMoreFeed] = useState(false)
  const [newUpdatesCount, setNewUpdatesCount] = useState(0)
  const FEED_PAGE_SIZE = 12

  useEffect(() => {
    document.title = 'Discover — Throughline'
    fetchDiscoverFeed(null, true, searchQuery)
    // Preload chart bundle during browser idle
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(preloadConfidenceChart)
    } else {
      setTimeout(preloadConfidenceChart, 500)
    }

    // Real-Time WebSocket Listener for live public posts
    const channel = supabase
      .channel('discover_public_posts_ws')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'public_posts' },
        () => {
          invalidateCache('discover_feed_cursor_null')
          setNewUpdatesCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Guard against duplicate fetch on initial mount while supporting debounced search
  const isSearchMountedRef = useRef(false)
  useEffect(() => {
    if (!isSearchMountedRef.current) {
      isSearchMountedRef.current = true
      return
    }
    const timer = setTimeout(() => {
      setLastCursor(null)
      fetchDiscoverFeed(null, true, searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  function triggerToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(""), 3000)
  }

  function toggleBookmark(topicId) {
    let updated
    if (bookmarks.includes(topicId)) {
      updated = bookmarks.filter(id => id !== topicId)
      triggerToast("Removed from bookmarks")
    } else {
      updated = [...bookmarks, topicId]
      triggerToast("Saved to bookmarks!")
    }
    setBookmarks(updated)
    localStorage.setItem("tl_bookmarks", JSON.stringify(updated))
  }

  function handleShare(topic) {
    const url = `${window.location.origin}/${topic.profiles?.username}/${topic.slug}`
    const snippet = `"${topic.title}" by @${topic.profiles?.username}: ${url}`
    navigator.clipboard.writeText(snippet)
    triggerToast("Link & snippet copied to clipboard!")
  }

  function handleOpenTopic(topic) {
    navigate(`/${topic.profiles?.username}/${topic.slug}`, {
      state: {
        initialTopic: topic,
        initialProfile: topic.profiles,
        from: 'discover'
      }
    })
  }

  async function fetchDiscoverFeed(cursor = null, isInitial = false, query = searchQuery) {
    try {
      const cleanQuery = (query || '').trim()

      if (isInitial) {
        const cacheKey = `discover_feed_cursor_${cursor || 'null'}`
        const syncCached = !cleanQuery ? getSyncCache(cacheKey) : null
        if (syncCached && Array.isArray(syncCached) && syncCached.length > 0) {
          setTopics(syncCached)
          setLoading(false)
        } else {
          setLoading(true)
        }

        if (!cleanQuery && !syncCached) {
          const cached = await getCache(cacheKey)
          if (cached && Array.isArray(cached) && cached.length > 0) {
            setTopics(cached)
            setLoading(false)
            return
          }
        }
      } else {
        setLoadingMoreFeed(true)
      }

      let req = supabase
        .from('topics')
        .select(`
          id,
          title,
          slug,
          user_id,
          created_at,
          profiles (
            username,
            display_name,
            bio,
            avatar_url
          ),
          public_posts!inner (
            id,
            content,
            confidence_rating,
            entry_date,
            moderation_status
          )
        `)
        .eq('public_posts.moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .order('entry_date', { foreignTable: 'public_posts', ascending: true })
        .limit(50, { foreignTable: 'public_posts' })
        .limit(FEED_PAGE_SIZE)

      // Cursor: only fetch topics older than the last seen created_at
      if (cursor) {
        req = req.lt('created_at', cursor)
      }

      const sanitized = cleanQuery.replace(/[^a-zA-Z0-9 _-]/g, '').trim()
      if (sanitized) {
        req = req.textSearch('fts', sanitized, { config: 'english', type: 'websearch' })
      }

      const { data, error } = await req

      if (error) throw error

      const filtered = (data || [])
        .filter(t => t.public_posts && t.public_posts.length > 0)
        .map(t => {
          const sortedPosts = [...t.public_posts].sort(
            (a, b) => new Date(a.entry_date) - new Date(b.entry_date)
          )
          const firstConfidence = sortedPosts[0]?.confidence_rating || 50
          const latestPost = sortedPosts[sortedPosts.length - 1]
          const latestConfidence = latestPost?.confidence_rating || 50
          const delta = Math.abs(latestConfidence - firstConfidence)
          const diff = latestConfidence - firstConfidence
          
          // Time decay in days since latest post
          const lastDate = new Date(latestPost?.entry_date || new Date())
          const now = new Date()
          const daysAgo = Math.max(0, (now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24))
          const decay = 1 / Math.pow(1 + daysAgo, 0.75)

          return {
            ...t,
            public_posts: sortedPosts,
            latestPost,
            firstConfidence,
            latestConfidence,
            delta,
            diff,
            daysAgo,
            span: `${sortedPosts.length} ${sortedPosts.length === 1 ? 'entry' : 'entries'}`
          }
        })

      if (isInitial) {
        setTopics(filtered)
        if (!cleanQuery) {
          setCache(`discover_feed_cursor_null`, filtered, 60)
        }
      } else {
        setTopics(prev => [...prev, ...filtered])
      }

      // Advance cursor to the created_at of the last fetched topic
      if (data && data.length > 0) {
        setLastCursor(data[data.length - 1].created_at)
      }
      setHasMoreFeed(data && data.length === FEED_PAGE_SIZE)
    } catch (err) {
      console.error('Error fetching discover feed:', err)
    } finally {
      setLoading(false)
      setLoadingMoreFeed(false)
    }
  }

  function loadMoreFeed() {
    if (loadingMoreFeed || !hasMoreFeed) return
    fetchDiscoverFeed(lastCursor, false, searchQuery)
  }

  // 1. Filter feed by tab
  const tabFiltered = useMemo(() => {
    return topics.filter(t => {
      if (feedTab === "bookmarked" && !bookmarks.includes(t.id)) return false
      return true
    })
  }, [topics, feedTab, bookmarks])

  // 2. Perform semantic & fuzzy search
  const filteredFeed = useMemo(() => {
    return searchFeed(tabFiltered, searchQuery)
  }, [tabFiltered, searchQuery])

  // 3. Sort feed chronologically by most recent update
  const sortedFeed = useMemo(() => {
    return [...filteredFeed].sort((a, b) => {
      const dateA = new Date(a.latestPost?.entry_date || a.created_at)
      const dateB = new Date(b.latestPost?.entry_date || b.created_at)
      return dateB - dateA
    })
  }, [filteredFeed])

  return (
    <div className="tl-scroll" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 58px)", position: "relative" }}>
      <div className="tl-ambient-glow" aria-hidden="true" />
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "36px 24px 80px", position: "relative", zIndex: 1 }}>
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 4 }}>
          <div className="flex items-center gap-2">
            <Compass size={24} color={tokens.pine} />
            <h1 className="tl-display" style={{ fontSize: 26, fontWeight: 600, margin: 0, color: tokens.ink }}>
              Public throughlines
            </h1>
          </div>

          {/* Feed Filter Tabs */}
          <div className="flex items-center gap-1" style={{ background: tokens.paperDeep, borderRadius: 999, padding: 3 }}>
            <button
              onClick={() => setFeedTab("all")}
              className="tl-focus"
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                border: "none",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                background: feedTab === "all" ? tokens.card : "transparent",
                color: feedTab === "all" ? tokens.ink : tokens.inkSoft,
                boxShadow: feedTab === "all" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
              }}
            >
              All Throughlines
            </button>
            <button
              onClick={() => setFeedTab("bookmarked")}
              className="tl-focus flex items-center gap-1"
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                border: "none",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                background: feedTab === "bookmarked" ? tokens.card : "transparent",
                color: feedTab === "bookmarked" ? tokens.pine : tokens.inkSoft,
                boxShadow: feedTab === "bookmarked" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
              }}
            >
              <Bookmark size={12} fill={feedTab === "bookmarked" ? tokens.pine : "none"} /> Bookmarked ({bookmarks.length})
            </button>
          </div>
        </div>

        <p style={{ fontSize: 14, color: tokens.inkSoft, marginBottom: 20 }}>
          Other people's evolving thoughts, out in the open.
        </p>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
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

        {/* Real-time WebSocket New Updates Banner */}
        {newUpdatesCount > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <button
              onClick={() => {
                setNewUpdatesCount(0)
                setLastCursor(null)
                fetchDiscoverFeed(null, true)
              }}
              className="tl-focus btn-premium flex items-center justify-center gap-1 animate-fade-in"
              style={{
                margin: "0 auto",
                padding: "8px 18px",
                borderRadius: 999,
                border: `1px solid ${tokens.pine}`,
                background: tokens.pineSoft,
                color: tokens.pine,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(47,74,61,0.15)"
              }}
            >
              🌿 {newUpdatesCount} new public throughline{newUpdatesCount > 1 ? 's' : ''} published — Click to refresh feed ↵
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: tokens.inkSoft }} className="tl-mono">
            Loading public minds...
          </div>
        ) : sortedFeed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: tokens.inkSoft, background: tokens.card, borderRadius: 10, border: `1px dashed ${tokens.line}` }}>
            <p className="tl-display" style={{ fontSize: 16, marginBottom: 4 }}>
              {feedTab === "bookmarked" ? "No bookmarked throughlines yet" : "No throughlines found"}
            </p>
            <p style={{ fontSize: 13, color: tokens.inkFaint }}>
              {feedTab === "bookmarked" ? "Click the bookmark icon on any public throughline to save it here." : "Try adjusting your search terms or check back later."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {sortedFeed.map((topic) => {
              const isBookmarked = bookmarks.includes(topic.id)
              const firstConf = topic.firstConfidence ?? topic.latestConfidence ?? 50
              const latestConf = topic.latestConfidence ?? 50
              const diff = topic.diff !== undefined ? topic.diff : (latestConf - firstConf)
              const deltaAbs = Math.abs(diff)
              const isDrop = diff < 0
              const isRise = diff > 0
              
              // Sparkline & badge colors:
              // Drop: warm terracotta/ember (#B8532F), bg (#F8EBE5)
              // Rise: forest pine (#2F4A3D), bg (#EAF3ED)
              // Flat: calm sage (#56826E), bg (#EEF2EF)
              const accentColor = isDrop ? "#B8532F" : isRise ? tokens.pine : "#56826E"
              const badgeBg = isDrop ? "#F8EBE5" : isRise ? tokens.pineSoft : "#EEF2EF"
              
              const category = getTopicCategory(topic)
              const avatarStyle = getAvatarStyle(topic.profiles?.username, topic.profiles?.display_name)
              const authorInitial = (topic.profiles?.display_name || topic.profiles?.username || 'T').charAt(0).toUpperCase()

              return (
                <div 
                  key={topic.id} 
                  className="tl-entry tl-card-interactive"
                  onMouseEnter={preloadConfidenceChart}
                  style={{ 
                    padding: "24px",
                    borderRadius: 18,
                    position: "relative"
                  }}
                >
                  {/* Top Header Row */}
                  <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/${topic.profiles?.username}`)}
                        className="tl-focus"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        title={`View ${topic.profiles?.display_name || topic.profiles?.username}'s profile`}
                      >
                        <div 
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: avatarStyle.bg,
                            color: avatarStyle.text,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-serif)",
                            fontSize: 16,
                            fontWeight: 700,
                            flexShrink: 0,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
                          }}
                        >
                          {authorInitial}
                        </div>
                      </button>

                      <div className="flex flex-col" style={{ lineHeight: 1.25 }}>
                        <button 
                          onClick={() => navigate(`/${topic.profiles?.username}`)}
                          className="tl-focus"
                          style={{ 
                            fontSize: 14.5, 
                            color: tokens.ink, 
                            background: "none", 
                            border: "none", 
                            cursor: "pointer", 
                            fontWeight: 600, 
                            textAlign: "left",
                            padding: 0 
                          }}
                        >
                          {topic.profiles?.display_name || topic.profiles?.username}
                        </button>
                        <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>
                          @{topic.profiles?.username || 'anonymous'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkSoft }}>
                        {topic.span}
                      </span>
                      
                      <button
                        onClick={() => toggleBookmark(topic.id)}
                        className="tl-focus btn-premium flex items-center justify-center"
                        title={isBookmarked ? "Remove bookmark" : "Save bookmark"}
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: isBookmarked ? tokens.pine : tokens.inkSoft, padding: 3 }}
                      >
                        <Bookmark size={16} fill={isBookmarked ? tokens.pine : "none"} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>

                  {/* Category Pill Tag */}
                  <div style={{ marginBottom: 12 }}>
                    <span 
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: category.theme === 'sand' ? "#F3ECE2" : category.theme === 'lavender' ? "#EBE8F4" : tokens.pineSoft,
                        color: category.theme === 'sand' ? "#745437" : category.theme === 'lavender' ? "#4A3F68" : tokens.pine,
                      }}
                    >
                      {category.name}
                    </span>
                  </div>
                  
                  {/* Topic Title (Headline) */}
                  <h3 
                    className="tl-display" 
                    style={{ 
                      fontSize: 21, 
                      fontWeight: 700, 
                      margin: "0 0 12px", 
                      cursor: "pointer", 
                      color: tokens.ink,
                      lineHeight: 1.3
                    }}
                    onClick={() => handleOpenTopic(topic)}
                  >
                    {topic.title}
                  </h3>
                  
                  {/* Content Excerpt */}
                  <p style={{ fontSize: 14.5, lineHeight: 1.6, color: tokens.inkSoft, margin: "0 0 18px" }}>
                    {topic.latestPost?.content}
                  </p>
                  
                  {/* Divider Line */}
                  <div style={{ height: 1, background: tokens.line, marginBottom: 16 }} />

                  {/* Footer Row: Metrics & Actions */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      {/* Big Conviction Stat */}
                      <div className="flex flex-col" style={{ lineHeight: 1 }}>
                        <span 
                          style={{ 
                            fontSize: 32, 
                            fontWeight: 700, 
                            fontFamily: "var(--font-serif)",
                            color: tokens.ink, 
                            letterSpacing: "-0.02em" 
                          }}
                        >
                          {latestConf}%
                        </span>
                        <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint, marginTop: 4 }}>
                          conviction
                        </span>
                      </div>

                      {/* Delta Badge */}
                      {deltaAbs > 0 && (
                        <span 
                          className="tl-mono flex items-center gap-1"
                          style={{ 
                            fontSize: 12, 
                            fontWeight: 600, 
                            background: badgeBg, 
                            color: accentColor, 
                            padding: "3px 8px", 
                            borderRadius: 999 
                          }}
                        >
                          {isDrop ? "↓" : "↑"} {deltaAbs}%
                        </span>
                      )}

                      {/* Sparkline Curve */}
                      <div style={{ marginLeft: 4 }}>
                        <MiniSparkline 
                          data={topic.public_posts} 
                          width={130} 
                          height={30} 
                          color={accentColor}
                          strokeWidth={2.2}
                          nodeRadius={3.5}
                          showFill={false}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleShare(topic)}
                        className="tl-focus btn-premium"
                        style={{ 
                          border: "none", 
                          background: "none", 
                          cursor: "pointer", 
                          color: tokens.inkSoft, 
                          fontSize: 13, 
                          fontWeight: 500, 
                          padding: "6px 8px" 
                        }}
                      >
                        Share
                      </button>

                      <button 
                        onClick={() => handleOpenTopic(topic)} 
                        className="tl-focus btn-premium" 
                        style={{ 
                          border: "none", 
                          background: tokens.pineSoft, 
                          color: tokens.pine,
                          borderRadius: 8,
                          padding: "8px 16px",
                          cursor: "pointer", 
                          fontSize: 13, 
                          fontWeight: 600, 
                        }}
                      >
                        Read throughline
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Feed Pagination Load More */}
        {hasMoreFeed && topics.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <button 
              onClick={loadMoreFeed}
              disabled={loadingMoreFeed}
              className="tl-focus btn-premium"
              style={{ 
                padding: "10px 24px", 
                borderRadius: 8, 
                border: `1px solid ${tokens.line}`, 
                background: tokens.card, 
                color: tokens.ink, 
                fontSize: 13, 
                fontWeight: 500, 
                cursor: loadingMoreFeed ? "not-allowed" : "pointer" 
              }}
            >
              {loadingMoreFeed ? "Loading more throughlines..." : "Load more public throughlines"}
            </button>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: tokens.ink, color: tokens.paper, padding: "10px 18px", borderRadius: 999, fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 50 }}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}

