import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  Compass, 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  PlusCircle, 
  Moon, 
  Sun, 
  Download, 
  ArrowRight,
  Hash,
  X
} from 'lucide-react'

const tokens = {
  paper: "var(--color-paper)",
  paperDeep: "var(--color-paper-deep)",
  card: "var(--color-card)",
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  inkFaint: "var(--color-ink-faint)",
  pine: "var(--color-pine)",
  pineSoft: "var(--color-pine-soft)",
  ember: "var(--color-ember)",
  emberSoft: "var(--color-ember-soft)",
  line: "var(--color-line)",
}

export default function CommandPalette({
  isOpen,
  onClose,
  topics = [],
  onSelectTopic,
  onCreateNewTopic,
  onExportArchive,
  theme,
  onToggleTheme
}) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50)
    }
  }, [isOpen])

  // Build command items list based on query
  const trimmed = query.trim().toLowerCase()

  // 1. Navigation Commands
  const navigationItems = [
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Go to Dashboard',
      subtitle: 'Personal workspace & throughlines',
      icon: <LayoutDashboard size={15} />,
      action: () => { navigate('/dashboard'); onClose(); }
    },
    {
      id: 'nav-discover',
      category: 'Navigation',
      title: 'Explore Discover Feed',
      subtitle: 'Public epistemic thought feed',
      icon: <Compass size={15} />,
      action: () => { navigate('/discover'); onClose(); }
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      title: 'Open Settings',
      subtitle: 'Account, bio & security options',
      icon: <SettingsIcon size={15} />,
      action: () => { navigate('/settings'); onClose(); }
    }
  ]

  // 2. Action Commands
  const actionItems = [
    {
      id: 'act-new-throughline',
      category: 'Actions',
      title: 'Start New Throughline',
      subtitle: 'Create a new intellectual track',
      icon: <PlusCircle size={15} />,
      action: () => {
        if (onCreateNewTopic) onCreateNewTopic()
        else navigate('/dashboard')
        onClose()
      }
    },
    {
      id: 'act-toggle-theme',
      category: 'Actions',
      title: theme === 'dark' ? 'Switch to Warm Paper (Light)' : 'Switch to Archival Noir (Dark)',
      subtitle: 'Toggle interface lighting aesthetic',
      icon: theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />,
      action: () => {
        if (onToggleTheme) onToggleTheme()
        onClose()
      }
    },
    {
      id: 'act-export',
      category: 'Actions',
      title: 'Export Epistemic Archive',
      subtitle: 'Download Obsidian markdown & JSON digest',
      icon: <Download size={15} />,
      action: () => {
        if (onExportArchive) onExportArchive()
        else navigate('/settings')
        onClose()
      }
    }
  ]

  // 3. Topic Jump Items
  const topicItems = topics.map(t => ({
    id: `topic-${t.id}`,
    category: 'Throughlines',
    title: t.title,
    subtitle: `jump to /${t.slug}`,
    icon: <Hash size={14} />,
    action: () => {
      if (onSelectTopic) onSelectTopic(t.id)
      navigate('/dashboard')
      onClose()
    }
  }))

  const allItems = [...topicItems, ...navigationItems, ...actionItems]

  const filteredItems = trimmed
    ? allItems.filter(item => 
        item.title.toLowerCase().includes(trimmed) || 
        (item.subtitle && item.subtitle.toLowerCase().includes(trimmed))
      )
    : allItems

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredItems, selectedIndex, onClose])

  if (!isOpen) return null

  return (
    <div 
      className="tl-modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 10000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        paddingLeft: "16px",
        paddingRight: "16px",
        background: "rgba(10, 15, 12, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        overflowY: "auto"
      }}
      onClick={onClose}
    >
      <div 
        className="tl-card animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        style={{
          width: "100%",
          maxWidth: 580,
          background: tokens.card,
          border: `1px solid ${tokens.line}`,
          borderRadius: 14,
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.28), 0 4px 16px rgba(0, 0, 0, 0.12)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div 
          className="flex items-center gap-3"
          style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${tokens.line}`,
            background: tokens.paper
          }}
        >
          <Search size={18} color={tokens.pine} />
          <input 
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command or search throughlines..."
            className="tl-focus"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 15,
              color: tokens.ink,
              fontFamily: "inherit"
            }}
          />
          <button 
            onClick={onClose}
            aria-label="Close command palette"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: tokens.inkSoft,
              padding: 4
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          style={{
            maxHeight: 340,
            overflowY: "auto",
            padding: "8px"
          }}
        >
          {filteredItems.length === 0 ? (
            <div 
              className="tl-mono text-center"
              style={{ padding: "32px 16px", color: tokens.inkSoft, fontSize: 13 }}
            >
              No commands or throughlines matching "{query}"
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div 
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className="flex items-center justify-between"
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: isSelected ? tokens.pineSoft : "transparent",
                    color: isSelected ? tokens.pine : tokens.ink,
                    transition: "all 0.12s ease"
                  }}
                >
                  <div className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
                    <div 
                      style={{ 
                        color: isSelected ? tokens.pine : tokens.inkSoft,
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      {item.icon}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div 
                        style={{ 
                          fontSize: 13.5, 
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div 
                          className="tl-mono"
                          style={{ 
                            fontSize: 11, 
                            color: tokens.inkFaint,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1" style={{ color: tokens.pine, fontSize: 12 }}>
                      <ArrowRight size={13} />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div 
          className="flex items-center justify-between tl-mono"
          style={{
            padding: "8px 16px",
            borderTop: `1px solid ${tokens.line}`,
            background: tokens.paperDeep,
            fontSize: 11,
            color: tokens.inkSoft
          }}
        >
          <div className="flex items-center gap-3">
            <span><kbd style={{ background: tokens.paper, padding: "2px 5px", borderRadius: 4, border: `1px solid ${tokens.line}` }}>↑↓</kbd> Navigate</span>
            <span><kbd style={{ background: tokens.paper, padding: "2px 5px", borderRadius: 4, border: `1px solid ${tokens.line}` }}>↵</kbd> Select</span>
            <span><kbd style={{ background: tokens.paper, padding: "2px 5px", borderRadius: 4, border: `1px solid ${tokens.line}` }}>ESC</kbd> Close</span>
          </div>
          <div>
            <span>ThroughLines Command Hub</span>
          </div>
        </div>
      </div>
    </div>
  )
}
