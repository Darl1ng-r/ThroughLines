import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'
import ConfidenceChart from '../components/ConfidenceChart'
import MarkdownText from '../components/MarkdownText'
import { generatePerspectiveSynthesis } from '../services/aiSynthesisService'
import { 
  Lock, 
  Globe, 
  Plus, 
  PenLine, 
  X, 
  Send, 
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Download,
  Printer,
  Share2,
  Sparkles
} from 'lucide-react'

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

function VisibilityStatus({ visibility, status }) {
  if (visibility === 'private') {
    return (
      <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.plum, textTransform: "uppercase" }}>
        <Lock size={11} /> Private
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.ember, textTransform: "uppercase" }}>
        <span className="tl-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: tokens.ember, display: "inline-block" }} />
        Reviewing
      </span>
    )
  }
  if (status === 'flagged') {
    return (
      <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.danger, textTransform: "uppercase" }}>
        <AlertCircle size={11} /> Flagged
      </span>
    )
  }
  return (
    <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.pine, textTransform: "uppercase" }}>
      <Globe size={11} /> Public
    </span>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  
  const [topics, setTopics] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [entries, setEntries] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [nudges, setNudges] = useState([])
  
  // Compose states
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [newTopicTitle, setNewTopicTitle] = useState("")
  const [composeText, setComposeText] = useState("")
  const [composeVisibility, setComposeVisibility] = useState("private")
  const [composeConfidence, setComposeConfidence] = useState(50)
  
  const [toastMsg, setToastMsg] = useState("")

  // Filtering & Search & Synthesis
  const [entrySearch, setEntrySearch] = useState("")
  const [filterVisibility, setFilterVisibility] = useState("ALL")
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState(null)
  const [showSynthesis, setShowSynthesis] = useState(false)
  const [synthesis, setSynthesis] = useState(null)

  function handleSelectEntry(id) {
    setSelectedEntryId(id)
    const el = document.getElementById(`entry-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const selectedTopic = topics.find(t => t.id === selectedId) || null
  const selectedTopicNudges = nudges.filter(n => n.topic_id === selectedId)

  // Filtered entries
  const filteredEntries = entries.filter(e => {
    const isPublic = e.public_posts && e.public_posts.length > 0
    if (filterVisibility === 'PUBLIC' && !isPublic) return false
    if (filterVisibility === 'PRIVATE' && isPublic) return false
    if (entrySearch.trim()) {
      const q = entrySearch.toLowerCase()
      return (e.content || "").toLowerCase().includes(q)
    }
    return true
  })

  function exportMarkdown() {
    if (!selectedTopic || entries.length === 0) return
    let md = `# ${selectedTopic.title}\n`
    md += `*Throughline Journal — Exported on ${new Date().toLocaleDateString()}*\n\n`
    entries.forEach((e, i) => {
      const isPublic = e.public_posts && e.public_posts.length > 0
      md += `### Entry ${i + 1} — ${e.entry_date}\n`
      md += `- **Confidence:** ${e.confidence_rating}%\n`
      md += `- **Visibility:** ${isPublic ? 'Public' : 'Private'}\n\n`
      md += `${e.content}\n\n---\n\n`
    })

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${selectedTopic.slug || 'throughline'}-journal.md`
    link.click()
    URL.revokeObjectURL(url)
    triggerToast("Exported timeline as Markdown (.md)")
  }

  useEffect(() => {
    if (user) {
      fetchTopics()
    }
  }, [user])

  useEffect(() => {
    if (selectedId) {
      fetchEntries(selectedId)
      // Load cached draft for this topic
      const cached = localStorage.getItem(`draft_${selectedId}`)
      setComposeText(cached || "")
    } else {
      setEntries([])
    }
  }, [selectedId])

  // Save draft cache
  const handleComposeChange = (text) => {
    setComposeText(text)
    if (selectedId) {
      if (text.trim() === "") {
        localStorage.removeItem(`draft_${selectedId}`)
      } else {
        localStorage.setItem(`draft_${selectedId}`, text)
      }
    }
  }

  function triggerToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(""), 3000)
  }

  async function fetchTopics() {
    try {
      setLoadingTopics(true)
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const { data: nudgesData, error: nudgesErr } = await supabase
        .from('nudges')
        .select('id, topic_id')

      if (!nudgesErr) {
        setNudges(nudgesData || [])
      }

      setTopics(data || [])
      if (data && data.length > 0 && !selectedId) {
        setSelectedId(data[0].id)
      }
    } catch (err) {
      console.error('Error fetching topics:', err)
    } finally {
      setLoadingTopics(false)
    }
  }

  async function clearNudges(topicId) {
    try {
      const { error } = await supabase
        .from('nudges')
        .delete()
        .eq('topic_id', topicId)
      if (error) throw error
      setNudges(prev => prev.filter(n => n.topic_id !== topicId))
      triggerToast("Nudges cleared.")
    } catch (err) {
      console.error('Error clearing nudges:', err)
      triggerToast("Failed to clear nudges.")
    }
  }

  async function fetchEntries(topicId) {
    try {
      setLoadingEntries(true)
      const { data, error } = await supabase
        .from('private_entries')
        .select(`
          *,
          public_posts (
            id,
            moderation_status
          )
        `)
        .eq('topic_id', topicId)
        .order('entry_date', { ascending: true })

      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      console.error('Error fetching entries:', err)
    } finally {
      setLoadingEntries(false)
    }
  }

  async function createTopic() {
    const title = newTopicTitle.trim()
    if (!title) return

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    try {
      const { data, error } = await supabase
        .from('topics')
        .insert({ user_id: user.id, title, slug })
        .select()

      if (error) throw error
      
      const newTopic = data[0]
      setTopics(prev => [newTopic, ...prev])
      setSelectedId(newTopic.id)
      setNewTopicTitle("")
      setShowNewTopic(false)
      triggerToast("Started a new throughline.")
    } catch (err) {
      console.error('Error creating topic:', err)
      triggerToast("Error creating topic. Slug might already exist.")
    }
  }

  async function addEntry() {
    const text = composeText.trim()
    if (!text || !selectedTopic) return

    try {
      const entryDate = new Date().toISOString()
      
      // 1. Add private entry
      const { data: newEntryData, error: entryErr } = await supabase
        .from('private_entries')
        .insert({
          topic_id: selectedTopic.id,
          user_id: user.id,
          content: text,
          confidence_rating: Number(composeConfidence),
          entry_date: entryDate
        })
        .select()

      if (entryErr) throw entryErr
      
      const entry = newEntryData[0]

      // 2. Add public post if selected public
      let publicPostObj = null
      if (composeVisibility === 'public') {
        const { data: pubData, error: pubErr } = await supabase
          .from('public_posts')
          .insert({
            private_entry_id: entry.id,
            topic_id: selectedTopic.id,
            user_id: user.id,
            content: text,
            confidence_rating: Number(composeConfidence),
            entry_date: entryDate
          })
          .select()

        if (pubErr) throw pubErr
        publicPostObj = pubData[0]
      }

      // Add to state
      const mappedEntry = {
        ...entry,
        public_posts: publicPostObj ? [publicPostObj] : []
      }
      setEntries(prev => [...prev, mappedEntry])
      
      // Clear nudges for this topic since creator responded
      await supabase
        .from('nudges')
        .delete()
        .eq('topic_id', selectedTopic.id)
      
      setNudges(prev => prev.filter(n => n.topic_id !== selectedTopic.id))

      // Clear composer and draft cache
      setComposeText("")
      setComposeConfidence(50)
      localStorage.removeItem(`draft_${selectedTopic.id}`)
      
      triggerToast(composeVisibility === 'public' ? "Entry added and published!" : "Entry logged privately.")
    } catch (err) {
      console.error('Error adding entry:', err)
      triggerToast("Error saving entry.")
    }
  }

  async function publishEntry(entry) {
    try {
      const { data, error } = await supabase
        .from('public_posts')
        .insert({
          private_entry_id: entry.id,
          topic_id: selectedTopic.id,
          user_id: user.id,
          content: entry.content,
          confidence_rating: entry.confidence_rating,
          entry_date: entry.entry_date
        })
        .select()

      if (error) throw error

      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { ...e, public_posts: [data[0]] } : e
      ))
      triggerToast("Entry published.")
    } catch (err) {
      console.error('Error publishing entry:', err)
      triggerToast("Failed to publish entry.")
    }
  }

  async function unpublishEntry(entry) {
    try {
      const { error } = await supabase
        .from('public_posts')
        .delete()
        .eq('private_entry_id', entry.id)

      if (error) throw error

      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { ...e, public_posts: [] } : e
      ))
      triggerToast("Entry made private again.")
    } catch (err) {
      console.error('Error unpublishing entry:', err)
      triggerToast("Failed to make private.")
    }
  }

  return (
    <div className="flex flex-col md:flex-row flex-1" style={{ minHeight: 0 }}>
      {/* Sidebar - Topics List */}
      <div 
        className="tl-scroll" 
        style={{ 
          width: "100%", 
          maxWidth: 280, 
          flexShrink: 0, 
          borderRight: `1px solid ${tokens.line}`, 
          padding: 20, 
          overflowY: "auto", 
          maxHeight: "calc(100vh - 58px)",
          background: tokens.paper
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <span className="tl-mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: tokens.inkSoft, textTransform: "uppercase" }}>
            Your topics
          </span>
          <button 
            onClick={() => setShowNewTopic(s => !s)} 
            className="tl-focus flex items-center justify-center" 
            aria-label="Start a new throughline" 
            style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${tokens.line}`, background: tokens.card, cursor: "pointer", color: tokens.ink }}
          >
            {showNewTopic ? <X size={13} /> : <Plus size={13} />}
          </button>
        </div>

        {showNewTopic && (
          <div style={{ marginBottom: 16 }}>
            <textarea
              autoFocus
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder="What's on your mind? e.g. Equal pay, free will, bilingual kid"
              rows={2}
              className="tl-focus"
              style={{ 
                width: "100%", 
                resize: "none", 
                padding: 10, 
                fontSize: 13, 
                fontFamily: "inherit", 
                border: `1px solid ${tokens.line}`, 
                borderRadius: 8, 
                background: tokens.card, 
                color: tokens.ink 
              }}
            />
            <button 
              onClick={createTopic} 
              disabled={!newTopicTitle.trim()} 
              className="tl-focus" 
              style={{ 
                marginTop: 8, 
                width: "100%", 
                padding: "8px 0", 
                borderRadius: 8, 
                border: "none", 
                fontSize: 13, 
                fontWeight: 500, 
                cursor: newTopicTitle.trim() ? "pointer" : "not-allowed", 
                background: tokens.pine, 
                color: tokens.paper, 
                opacity: newTopicTitle.trim() ? 1 : 0.5 
              }}
            >
              Start throughline
            </button>
          </div>
        )}

        {loadingTopics ? (
          <div style={{ fontSize: 12, color: tokens.inkSoft }} className="tl-mono">Loading...</div>
        ) : topics.length === 0 ? (
          <div style={{ fontSize: 12, color: tokens.inkFaint }} className="tl-mono">No topics yet. Start one!</div>
        ) : (
          <div className="flex flex-row md:flex-col gap-2 md:gap-1" style={{ overflowX: "auto" }}>
            {topics.map((t) => {
              const isSelected = t.id === selectedId
              const topicNudges = nudges.filter(n => n.topic_id === t.id)
              const nudgeCount = topicNudges.length
              return (
                <button 
                  key={t.id} 
                  onClick={() => setSelectedId(t.id)} 
                  className="tl-focus btn-premium" 
                  style={{ 
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    textAlign: "left", 
                    padding: "10px 12px", 
                    borderRadius: 8, 
                    border: "none", 
                    cursor: "pointer", 
                    background: isSelected ? tokens.pineSoft : "transparent", 
                    borderLeft: `3px solid ${isSelected ? tokens.pine : "transparent"}`, 
                    minWidth: 200, 
                    flexShrink: 0 
                  }}
                >
                  <span className="tl-display" style={{ fontSize: 14, fontWeight: 500, color: tokens.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.title}
                  </span>
                  {nudgeCount > 0 && (
                    <span 
                      className="tl-mono" 
                      style={{ 
                        fontSize: 10, 
                        background: tokens.ember, 
                        color: tokens.paper, 
                        padding: "2px 6px", 
                        borderRadius: 999, 
                        fontWeight: 600,
                        marginLeft: 8,
                        flexShrink: 0
                      }}
                      title={`${nudgeCount} nudge${nudgeCount > 1 ? 's' : ''} received`}
                    >
                      {nudgeCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Main Workspace - Entries and Line Graph */}
      <div className="tl-scroll" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 58px)" }}>
        {!selectedTopic ? (
          <div className="flex flex-col items-center justify-center" style={{ height: "100%", padding: 40, textAlign: "center" }}>
            <p className="tl-display" style={{ fontSize: 20, color: tokens.inkSoft }}>🌿 Pick a throughline, or start a new theme.</p>
          </div>
        ) : (
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 24px 80px" }}>
            <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 20 }}>
              <div>
                <h1 className="tl-display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 4px" }}>
                  {selectedTopic.title}
                </h1>
                <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, margin: 0 }}>
                  {entries.length === 0 
                    ? "No entries logged yet" 
                    : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap no-print">
                {entries.length > 0 && (
                  <button 
                    onClick={() => {
                      if (!synthesis) {
                        const synth = generatePerspectiveSynthesis(selectedTopic.title, entries)
                        setSynthesis(synth)
                      }
                      setShowSynthesis(prev => !prev)
                    }} 
                    className="tl-focus btn-premium flex items-center gap-1"
                    title="Synthesize belief evolution with AI"
                    style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${tokens.plum}`, background: tokens.plumSoft, color: tokens.plum, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    <Sparkles size={13} /> {showSynthesis ? "Hide Synthesis" : "AI Evolution Synthesis"}
                  </button>
                )}

                <button 
                  onClick={exportMarkdown} 
                  className="tl-focus btn-premium flex items-center gap-1"
                  title="Export timeline as Markdown"
                  style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                >
                  <Download size={13} /> Export .md
                </button>

                <button 
                  onClick={() => window.print()} 
                  className="tl-focus btn-premium flex items-center gap-1"
                  title="Print or export as PDF"
                  style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                >
                  <Printer size={13} /> Print
                </button>

                <button 
                  onClick={() => setShowShareModal(true)} 
                  className="tl-focus btn-premium flex items-center gap-1"
                  title="Generate Share Card"
                  style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.pineSoft, color: tokens.pine, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  <Share2 size={13} /> Share Card
                </button>
              </div>
            </div>

            {/* AI Evolution Synthesis Card */}
            {showSynthesis && synthesis && (
              <div 
                className="animate-fade-in"
                style={{ 
                  background: tokens.card, 
                  border: `1.5px solid ${tokens.plum}`, 
                  borderRadius: 12, 
                  padding: "16px 20px", 
                  marginBottom: 20, 
                  boxShadow: "0 6px 20px rgba(75,59,92,0.08)" 
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <div className="flex items-center gap-2" style={{ color: tokens.plum, fontWeight: 600, fontSize: 14 }}>
                    <Sparkles size={16} />
                    <span>AI Perspective Evolution Synthesis</span>
                  </div>
                  <span className="tl-mono" style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: tokens.plumSoft, color: tokens.plum, fontWeight: 600 }}>
                    Stability: {synthesis.stabilityScore}%
                  </span>
                </div>

                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: tokens.ink, margin: "0 0 12px" }}>
                  {synthesis.summary}
                </p>

                {synthesis.themes.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 12 }}>
                    <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>Key Themes:</span>
                    {synthesis.themes.map((t, idx) => (
                      <span key={idx} className="tl-mono" style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: tokens.paperDeep, color: tokens.inkSoft }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {synthesis.reflectionPrompt && (
                  <div style={{ background: tokens.paper, borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${tokens.plum}`, fontSize: 12.5, fontStyle: 'italic', color: tokens.inkSoft }}>
                    <strong>Reflection Prompt:</strong> "{synthesis.reflectionPrompt}"
                  </div>
                )}
              </div>
            )}

            {/* Filter & Search Bar */}
            {entries.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap no-print" style={{ marginBottom: 20, background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 8, padding: "8px 12px" }}>
                <div className="flex items-center gap-2 flex-1" style={{ minWidth: 180 }}>
                  <Search size={14} color={tokens.inkFaint} />
                  <input
                    type="text"
                    value={entrySearch}
                    onChange={(e) => setEntrySearch(e.target.value)}
                    placeholder="Search entries..."
                    className="tl-focus"
                    style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 13, color: tokens.ink }}
                  />
                </div>
                
                <div className="flex items-center gap-1" style={{ borderLeft: `1px solid ${tokens.line}`, paddingLeft: 12 }}>
                  <Filter size={13} color={tokens.inkFaint} />
                  <select
                    value={filterVisibility}
                    onChange={(e) => setFilterVisibility(e.target.value)}
                    className="tl-focus tl-mono"
                    style={{ border: "none", background: "transparent", fontSize: 11, color: tokens.inkSoft, cursor: "pointer", outline: "none" }}
                  >
                    <option value="ALL">All Entries</option>
                    <option value="PUBLIC">Public Only</option>
                    <option value="PRIVATE">Private Only</option>
                  </select>
                </div>
              </div>
            )}

            {/* Nudge Banner */}
            {selectedTopicNudges.length > 0 && (
              <div 
                className="flex items-center justify-between animate-fade-in" 
                style={{ 
                  background: tokens.emberSoft, 
                  border: `1px solid ${tokens.ember}33`, 
                  borderRadius: 10, 
                  padding: "12px 16px", 
                  marginBottom: 24, 
                  fontSize: 13.5, 
                  color: tokens.ember 
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 16 }}>🔔</span>
                  <span>
                    <strong>{selectedTopicNudges.length} {selectedTopicNudges.length === 1 ? 'person wants' : 'people want'}</strong> an update on this topic!
                  </span>
                </div>
                <button 
                  onClick={() => clearNudges(selectedTopic.id)}
                  className="tl-focus btn-premium" 
                  style={{ 
                    background: "transparent", 
                    border: "none", 
                    color: tokens.ember, 
                    textDecoration: "underline", 
                    cursor: "pointer", 
                    fontSize: 12.5, 
                    fontWeight: 500,
                    padding: 0
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Recharts Chart */}
            <ConfidenceChart entries={entries} onSelectEntry={handleSelectEntry} selectedEntryId={selectedEntryId} />

            {/* Timeline Spine */}
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
                {loadingEntries ? (
                  <div className="tl-mono" style={{ fontSize: 12, color: tokens.inkSoft, paddingLeft: 24 }}>Loading timeline...</div>
                ) : filteredEntries.length === 0 ? (
                  <div className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, paddingLeft: 24, fontStyle: 'italic' }}>
                    {entries.length === 0 ? "No entries logged yet." : "No entries match your search/filter."}
                  </div>
                ) : (
                  filteredEntries.map((entry) => {
                    const isPublic = entry.public_posts && entry.public_posts.length > 0
                    const status = isPublic ? entry.public_posts[0].moderation_status : null
                    const isSelected = selectedEntryId === entry.id
                    
                    // Format entry date
                    let formattedDate = entry.entry_date
                    try {
                      const d = new Date(entry.entry_date)
                      if (!isNaN(d.getTime())) {
                        formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      }
                    } catch (_) {}

                    return (
                      <div id={`entry-${entry.id}`} key={entry.id} className="tl-entry flex gap-4" style={{ position: "relative" }}>
                        {/* Dot Indicator */}
                        <div style={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: "50%", 
                          background: isSelected ? tokens.ember : (isPublic ? tokens.pine : tokens.card), 
                          border: `2px solid ${isSelected ? tokens.ember : (isPublic ? tokens.pine : tokens.plum)}`, 
                          flexShrink: 0, 
                          marginTop: 6 
                        }} />
                        
                        {/* Card */}
                        <div 
                          style={{ 
                            flex: 1, 
                            background: tokens.card, 
                            border: isSelected ? `2px solid ${tokens.ember}` : `1px solid ${tokens.line}`, 
                            borderRadius: 10, 
                            padding: "14px 16px",
                            transition: "all 0.2s ease" 
                          }}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 8 }}>
                            <div className="flex items-center gap-3">
                              <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>
                                {formattedDate}
                              </span>
                              <Meter value={entry.confidence_rating} />
                            </div>
                            <VisibilityStatus visibility={isPublic ? 'public' : 'private'} status={status} />
                          </div>
                          
                          <div style={{ fontSize: 14.5, color: tokens.ink, marginBottom: 10 }}>
                            <MarkdownText content={entry.content} />
                          </div>
                          
                          {/* Publish/Unpublish Action */}
                          {!isPublic ? (
                            <button 
                              onClick={() => publishEntry(entry)} 
                              className="tl-focus flex items-center gap-1 btn-premium" 
                              style={{ border: "none", background: "none", cursor: "pointer", color: tokens.pine, fontSize: 12, fontWeight: 500, padding: 0 }}
                            >
                              <Globe size={12} /> Publish this entry
                            </button>
                          ) : (
                            <button 
                              onClick={() => unpublishEntry(entry)} 
                              className="tl-focus flex items-center gap-1 btn-premium" 
                              style={{ border: "none", background: "none", cursor: "pointer", color: tokens.inkSoft, fontSize: 12, fontWeight: 500, padding: 0 }}
                            >
                              <Lock size={12} /> Make private
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Composition Input Node */}
                <div className="flex gap-4" style={{ position: "relative" }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px dashed ${tokens.ember}`, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: "16px 18px" }}>
                    <div className="flex items-center gap-1" style={{ marginBottom: 8, color: tokens.inkSoft }}>
                      <PenLine size={13} />
                      <span className="tl-mono" style={{ fontSize: 12 }}>
                        {entries.length === 0 ? "First entry" : "Add another log"}
                      </span>
                    </div>
                    
                    <textarea
                      value={composeText}
                      onChange={(e) => handleComposeChange(e.target.value)}
                      placeholder="Why do you believe that — today? Your drafts are saved automatically."
                      rows={3}
                      className="tl-focus"
                      style={{ 
                        width: "100%", 
                        resize: "none", 
                        border: "none", 
                        outline: "none", 
                        fontSize: 14.5, 
                        lineHeight: 1.6, 
                        fontFamily: "inherit", 
                        background: "transparent", 
                        color: tokens.ink, 
                        marginBottom: 6 
                      }}
                    />
                    
                    {/* Confidence Slider */}
                    <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                      <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft, whiteSpace: "nowrap" }}>How sure?</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={composeConfidence} 
                        onChange={(e) => setComposeConfidence(Number(e.target.value))} 
                        className="tl-range tl-focus" 
                      />
                      <span className="tl-mono" style={{ fontSize: 12, color: tokens.ink, width: 34, textAlign: "right" }}>
                        {composeConfidence}%
                      </span>
                    </div>

                    {/* Visibility and Save Buttons */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1" style={{ background: tokens.paperDeep, borderRadius: 999, padding: 3 }}>
                        <button 
                          onClick={() => setComposeVisibility("private")} 
                          className="tl-focus"
                          style={{
                            padding: "5px 10px",
                            borderRadius: 999,
                            border: "none",
                            cursor: "pointer",
                            fontSize: 12,
                            background: composeVisibility === "private" ? tokens.plumSoft : "transparent",
                            color: composeVisibility === "private" ? tokens.plum : tokens.inkSoft,
                          }}
                        >
                          <Lock size={11} style={{ marginRight: 2 }} /> Private
                        </button>
                        <button 
                          onClick={() => setComposeVisibility("public")} 
                          className="tl-focus"
                          style={{
                            padding: "5px 10px",
                            borderRadius: 999,
                            border: "none",
                            cursor: "pointer",
                            fontSize: 12,
                            background: composeVisibility === "public" ? tokens.pineSoft : "transparent",
                            color: composeVisibility === "public" ? tokens.pine : tokens.inkSoft,
                          }}
                        >
                          <Globe size={11} style={{ marginRight: 2 }} /> Public
                        </button>
                      </div>
                      
                      <button 
                        onClick={addEntry} 
                        disabled={!composeText.trim()} 
                        className="tl-focus btn-premium" 
                        style={{ 
                          padding: "7px 14px", 
                          borderRadius: 8, 
                          border: "none", 
                          fontSize: 13, 
                          fontWeight: 500, 
                          cursor: composeText.trim() ? "pointer" : "not-allowed", 
                          background: tokens.pine, 
                          color: tokens.paper, 
                          opacity: composeText.trim() ? 1 : 0.4 
                        }}
                      >
                        Add to throughline
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>

      {/* Share Card Modal */}
      {showShareModal && selectedTopic && (
        <div className="tl-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              background: tokens.card, 
              border: `1px solid ${tokens.line}`, 
              borderRadius: 12, 
              padding: 24, 
              maxWidth: 480, 
              width: "100%", 
              boxShadow: "0 12px 32px rgba(0,0,0,0.18)" 
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <span className="tl-mono" style={{ fontSize: 11, color: tokens.pine, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                🌿 Shareable Throughline Card
              </span>
              <button 
                onClick={() => setShowShareModal(false)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: tokens.inkFaint }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Render Card Preview */}
            <div style={{ background: tokens.paper, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <span className="tl-mono" style={{ fontSize: 11, color: tokens.pine }}>Throughline</span>
                <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>{entries.length} entries</span>
              </div>
              <h2 className="tl-display" style={{ fontSize: 20, fontWeight: 600, margin: "0 0 10px", color: tokens.ink }}>
                {selectedTopic.title}
              </h2>
              {entries.length > 0 && (
                <p style={{ fontSize: 13.5, lineHeight: 1.5, color: tokens.inkSoft, margin: "0 0 14px", fontStyle: "italic" }}>
                  "{entries[entries.length - 1].content}"
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>
                  Latest confidence: <strong style={{ color: tokens.pine }}>{entries.length > 0 ? entries[entries.length - 1].confidence_rating : 50}%</strong>
                </span>
                <span className="tl-display" style={{ fontSize: 13, fontWeight: 600, color: tokens.ink }}>
                  Throughlines.app
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button 
                onClick={() => setShowShareModal(false)} 
                className="tl-focus btn-premium"
                style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: "transparent", color: tokens.ink, fontSize: 13, cursor: "pointer" }}
              >
                Close
              </button>
              <button 
                onClick={() => {
                  const shareText = `Check out my throughline on "${selectedTopic.title}": ${window.location.origin}/dashboard`
                  navigator.clipboard.writeText(shareText)
                  triggerToast("Summary & Link copied to clipboard!")
                  setShowShareModal(false)
                }} 
                className="tl-focus btn-premium"
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: tokens.pine, color: tokens.paper, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                Copy Link & Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: tokens.ink, color: tokens.paper, padding: "10px 18px", borderRadius: 999, fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 50 }}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}
