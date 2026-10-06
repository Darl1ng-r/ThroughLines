import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { ArrowUpRight, Compass, Search, Bookmark, Share2 } from 'lucide-react'
import { getCache, setCache, invalidateCache, getSyncCache } from '../services/redisCacheService'
import { searchFeed } from '../services/semanticSearchService'

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
            bio
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
    <div className="tl-scroll" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 58px)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 24px 80px" }}>
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
          <div className="flex flex-col gap-4">
            {sortedFeed.map((topic) => {
              const isBookmarked = bookmarks.includes(topic.id)
              return (
                <div 
                  key={topic.id} 
                  className="tl-entry"
                  onMouseEnter={preloadConfidenceChart}
                  style={{ 
                    background: tokens.card, 
                    border: `1px solid ${tokens.line}`, 
                    borderRadius: 10, 
                    padding: "16px 18px", 
                    boxShadow: "0 2px 8px rgba(33, 31, 27, 0.02)"
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <div className="flex items-center gap-2">
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
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>
                        {topic.span}
                      </span>
                      
                      <button
                        onClick={() => toggleBookmark(topic.id)}
                        className="tl-focus btn-premium flex items-center justify-center"
                        title={isBookmarked ? "Remove bookmark" : "Save bookmark"}
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: isBookmarked ? tokens.pine : tokens.inkFaint, padding: 2 }}
                      >
                        <Bookmark size={15} fill={isBookmarked ? tokens.pine : "none"} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 
                    className="tl-display" 
                    style={{ 
                      fontSize: 18, 
                      fontWeight: 600, 
                      margin: "0 0 8px", 
                      cursor: "pointer", 
                      color: tokens.ink 
                    }}
                    onClick={() => handleOpenTopic(topic)}
                  >
                    {topic.title}
                  </h3>
                  
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: tokens.ink, margin: "0 0 12px" }}>
                    {topic.latestPost?.content}
                  </p>
                  
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>
                        Latest confidence: <strong style={{ color: tokens.pine }}>{topic.latestConfidence}%</strong>
                      </span>
                      {topic.delta > 0 && (
                        <span className="tl-mono" style={{ fontSize: 11, color: tokens.plum }}>
                          ({topic.delta}% overall shift)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleShare(topic)}
                        className="tl-focus btn-premium flex items-center gap-1"
                        style={{ border: "none", background: "none", cursor: "pointer", color: tokens.inkSoft, fontSize: 12, fontWeight: 500, padding: 0 }}
                      >
                        <Share2 size={13} /> Share
                      </button>

                      <button 
                        onClick={() => handleOpenTopic(topic)} 
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

