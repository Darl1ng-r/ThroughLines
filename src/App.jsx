import React, { useState, useEffect, lazy, Suspense, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Compass, LogOut, Settings as SettingsIcon, ChevronDown, User as UserIcon, Moon, Sun, Search } from 'lucide-react'

import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'

// Route-level Code Splitting for performance and small initial bundle size
const Landing = lazy(() => import('./pages/Landing'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Discover = lazy(() => import('./pages/Discover'))
const Profile = lazy(() => import('./pages/Profile'))
const TopicDetail = lazy(() => import('./pages/TopicDetail'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))

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
  line: "var(--color-line)",
  danger: "var(--color-danger)",
}

// Map route pathnames to document titles
function getPageTitle(pathname) {
  if (pathname === '/') return 'Throughline — Track How Your Beliefs Evolve'
  if (pathname === '/dashboard') return 'Dashboard — Throughline'
  if (pathname === '/discover') return 'Discover — Throughline'
  if (pathname === '/settings') return 'Settings — Throughline'
  // Username profile pages
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 1) return `@${parts[0]} — Throughline`
  if (parts.length === 2) return `${parts[1]} by @${parts[0]} — Throughline`
  return 'Throughline'
}

// Subcomponent: Navigation Bar
function NavBar({ onOpenCommandPalette, theme, toggleTheme }) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const menuButtonRef = useRef(null)

  // Close dropdown on Escape key or outside click
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  // Move focus into the menu when it opens
  useEffect(() => {
    if (menuOpen) {
      const firstItem = menuRef.current?.querySelector('[role="menuitem"]')
      firstItem?.focus()
    }
  }, [menuOpen])

  // Don't show navigation on the Landing/Auth page
  if (location.pathname === '/') return null

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : user?.email ? user.email.slice(0, 2).toUpperCase() : "?"

  return (
    <header className="tl-topbar flex items-center justify-between" role="banner">
      <div className="flex items-center gap-6">
        <Link
          to={user ? "/dashboard" : "/"}
          style={{ textDecoration: 'none', color: '#F1EEE4' }}
          aria-label="Throughline home"
        >
          <div className="flex items-center gap-2">
            <div
              className="tl-display"
              style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(255, 255, 255, 0.14)", border: "1px solid rgba(255, 255, 255, 0.22)", color: "#F1EEE4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}
              aria-hidden="true"
            >
              🌿
            </div>
            <span className="tl-display" style={{ fontSize: 17, fontWeight: 600, color: "#F1EEE4" }}>Throughline</span>
          </div>
        </Link>

        {user && (
          <nav aria-label="Main navigation">
            <div className="flex items-center gap-1">
              <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                <button
                  className="tl-focus btn-premium"
                  aria-label="Go to Dashboard"
                  aria-current={location.pathname.startsWith('/dashboard') ? 'page' : undefined}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: location.pathname.startsWith('/dashboard') ? "1px solid rgba(255, 255, 255, 0.20)" : "1px solid transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    background: location.pathname.startsWith('/dashboard') ? "rgba(255, 255, 255, 0.18)" : "transparent",
                    color: location.pathname.startsWith('/dashboard') ? "#FFFFFF" : "rgba(241, 238, 228, 0.80)"
                  }}
                >
                  Dashboard
                </button>
              </Link>
              <Link to="/discover" style={{ textDecoration: 'none' }}>
                <button
                  className="tl-focus flex items-center gap-1 btn-premium"
                  aria-label="Go to Discover feed"
                  aria-current={location.pathname === '/discover' ? 'page' : undefined}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: location.pathname === '/discover' ? "1px solid rgba(255, 255, 255, 0.20)" : "1px solid transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    background: location.pathname === '/discover' ? "rgba(255, 255, 255, 0.18)" : "transparent",
                    color: location.pathname === '/discover' ? "#FFFFFF" : "rgba(241, 238, 228, 0.80)"
                  }}
                >
                  <Compass size={13} aria-hidden="true" /> Discover
                </button>
              </Link>
            </div>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenCommandPalette}
          className="tl-focus btn-premium flex items-center gap-1.5"
          aria-label="Open Command Hub"
          title="Command Hub (⌘K / Ctrl+K)"
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255, 255, 255, 0.18)",
            background: "rgba(255, 255, 255, 0.10)",
            color: "#F1EEE4",
            fontSize: 12,
            cursor: "pointer"
          }}
        >
          <Search size={12} aria-hidden="true" />
          <span className="hidden sm:inline" style={{ opacity: 0.9 }}>Search</span>
          <kbd style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "rgba(255, 255, 255, 0.18)", marginLeft: 2, fontFamily: "var(--font-mono)" }}>⌘K</kbd>
        </button>

        <button
          onClick={toggleTheme}
          className="tl-focus btn-premium flex items-center justify-center"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            background: "rgba(255, 255, 255, 0.12)",
            color: "#F1EEE4",
            cursor: "pointer"
          }}
        >
          {theme === 'dark' ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
        </button>

        {user ? (
          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              ref={menuButtonRef}
              onClick={() => setMenuOpen(s => !s)}
              className="tl-focus flex items-center gap-2"
              aria-label="Open user menu"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, borderRadius: 999 }}
            >
              <div
                className="tl-mono"
                aria-hidden="true"
                style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255, 255, 255, 0.18)", border: "1px solid rgba(255, 255, 255, 0.25)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}
              >
                {initials}
              </div>
              <ChevronDown size={14} color="rgba(241, 238, 228, 0.75)" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="User account menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: 38,
                  width: 200,
                  background: tokens.card,
                  border: `1px solid ${tokens.line}`,
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(33,31,27,0.18)",
                  overflow: "hidden",
                  color: tokens.ink
                }}
              >
                <div
                  style={{ padding: "10px 14px", borderBottom: `1px solid ${tokens.line}` }}
                  role="presentation"
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: tokens.ink }}>{profile?.display_name || user.email}</div>
                  <div className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>@{profile?.username || "loading"}</div>
                </div>

                <button
                  role="menuitem"
                  onClick={() => { navigate(`/${profile?.username}`); setMenuOpen(false); }}
                  className="tl-focus flex items-center gap-2"
                  style={{ width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, textAlign: "left", color: tokens.ink }}
                >
                  <UserIcon size={14} aria-hidden="true" /> View profile
                </button>

                <button
                  role="menuitem"
                  onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                  className="tl-focus flex items-center gap-2"
                  style={{ width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, textAlign: "left", color: tokens.ink }}
                >
                  <SettingsIcon size={14} aria-hidden="true" /> Settings
                </button>

                <button
                  role="menuitem"
                  onClick={() => { signOut(); setMenuOpen(false); navigate('/'); }}
                  className="tl-focus flex items-center gap-2"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    textAlign: "left",
                    color: tokens.danger,
                    borderTop: `1px solid ${tokens.line}`
                  }}
                >
                  <LogOut size={14} aria-hidden="true" /> Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <button
                className="tl-focus btn-premium"
                style={{
                  background: "#F1EEE4",
                  color: "#2F4A3D",
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Sign in
              </button>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

// Skip-to-main-content link for keyboard/screen reader users
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 9999,
        padding: '8px 16px',
        background: 'var(--color-pine)',
        color: '#fff',
        fontSize: 14,
        borderRadius: '0 0 6px 0',
        // Becomes visible on focus
        transform: 'translateY(-100%)',
        transition: 'transform 0.2s',
      }}
      onFocus={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
      onBlur={(e) => { e.currentTarget.style.transform = 'translateY(-100%)' }}
    >
      Skip to main content
    </a>
  )
}

function MainLayout() {
  const { loading } = useAuth()
  const location = useLocation()
  const mainRef = useRef(null)

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Update document title and move focus to main content on route change
  useEffect(() => {
    document.title = getPageTitle(location.pathname)
    // Small delay to allow the page to render before focusing
    const timer = setTimeout(() => {
      mainRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [location.pathname])

  if (loading) {
    return (
      <div
        className="tl-mono"
        role="status"
        aria-live="polite"
        aria-label="Loading application"
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: tokens.paper,
          color: tokens.inkSoft
        }}
      >
        Connecting to Throughline server...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: tokens.paper, color: tokens.ink }}>
      <SkipLink />
      <NavBar 
        onOpenCommandPalette={() => setCommandPaletteOpen(true)} 
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        style={{ flex: 1, outline: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        aria-label="Main content"
      >
        <Suspense fallback={
          <div
            className="tl-mono"
            role="status"
            aria-live="polite"
            style={{ padding: 40, textAlign: "center", color: tokens.inkSoft }}
          >
            Loading view...
          </div>
        }>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/discover" element={<Discover />} />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/:username" element={<Profile />} />
            <Route path="/:username/:topicSlug" element={<TopicDetail />} />
            {/* Catch-all 404 route — must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <MainLayout />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}
