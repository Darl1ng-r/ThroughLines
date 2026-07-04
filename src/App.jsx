import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Discover from './pages/Discover'
import Profile from './pages/Profile'
import TopicDetail from './pages/TopicDetail'
import Settings from './pages/Settings'
import { Compass, LogOut, Settings as SettingsIcon, ChevronDown, User as UserIcon } from 'lucide-react'

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
  line: "#D9D2C0",
  danger: "#8C4A3A",
}

// Subcomponent: Navigation Bar
function NavBar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Don't show navigation on the Landing/Auth page
  if (location.pathname === '/') return null

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : user?.email ? user.email.slice(0, 2).toUpperCase() : "?"

  return (
    <div 
      className="flex items-center justify-between" 
      style={{ 
        padding: "14px 24px", 
        borderBottom: `1px solid ${tokens.line}`, 
        background: tokens.paper, 
        position: "relative", 
        zIndex: 20 
      }}
    >
      <div className="flex items-center gap-6">
        <Link to={user ? "/dashboard" : "/"} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="flex items-center gap-2">
            <div className="tl-display" style={{ width: 26, height: 26, borderRadius: 6, background: tokens.pine, color: tokens.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
              🌿
            </div>
            <span className="tl-display" style={{ fontSize: 17, fontWeight: 600 }}>Throughline</span>
          </div>
        </Link>

        {user && (
          <div className="flex items-center gap-1">
            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
              <button 
                className="tl-focus btn-premium" 
                style={{ 
                  padding: "6px 12px", 
                  borderRadius: 999, 
                  border: "none", 
                  cursor: "pointer", 
                  fontSize: 13, 
                  fontWeight: 500, 
                  background: location.pathname.startsWith('/dashboard') ? tokens.paperDeep : "transparent", 
                  color: tokens.ink 
                }}
              >
                Dashboard
              </button>
            </Link>
            <Link to="/discover" style={{ textDecoration: 'none' }}>
              <button 
                className="tl-focus flex items-center gap-1 btn-premium" 
                style={{ 
                  padding: "6px 12px", 
                  borderRadius: 999, 
                  border: "none", 
                  cursor: "pointer", 
                  fontSize: 13, 
                  fontWeight: 500, 
                  background: location.pathname === '/discover' ? tokens.paperDeep : "transparent", 
                  color: tokens.ink 
                }}
              >
                <Compass size={13} /> Discover
              </button>
            </Link>
          </div>
        )}
      </div>

      {user ? (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(s => !s)}
            className="tl-focus flex items-center gap-2"
            style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, borderRadius: 999 }}
          >
            <div className="tl-mono" style={{ width: 28, height: 28, borderRadius: "50%", background: tokens.plumSoft, color: tokens.plum, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>
              {initials}
            </div>
            <ChevronDown size={14} color={tokens.inkFaint} />
          </button>

          {menuOpen && (
            <div 
              style={{ 
                position: "absolute", 
                right: 0, 
                top: 38, 
                width: 200, 
                background: tokens.card, 
                border: `1px solid ${tokens.line}`, 
                borderRadius: 10, 
                boxShadow: "0 8px 24px rgba(33,31,27,0.08)", 
                overflow: "hidden" 
              }}
            >
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${tokens.line}` }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.display_name || user.email}</div>
                <div className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>@{profile?.username || "loading"}</div>
              </div>
              
              <button
                onClick={() => { navigate(`/${profile?.username}`); setMenuOpen(false); }}
                className="tl-focus flex items-center gap-2"
                style={{ width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, textAlign: "left" }}
              >
                <UserIcon size={14} /> View profile
              </button>
              
              <button
                onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                className="tl-focus flex items-center gap-2"
                style={{ width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, textAlign: "left" }}
              >
                <SettingsIcon size={14} /> Settings
              </button>
              
              <button
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
                <LogOut size={14} /> Log out
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
                background: tokens.pine, 
                color: tokens.paper, 
                border: 'none', 
                borderRadius: 8, 
                padding: '6px 14px', 
                fontSize: 13, 
                fontWeight: 500, 
                cursor: 'pointer' 
              }}
            >
              Sign in
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}

function MainLayout() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div 
        className="tl-mono"
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
      <NavBar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/:username" element={<Profile />} />
        <Route path="/:username/:topicSlug" element={<TopicDetail />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout />
      </Router>
    </AuthProvider>
  )
}
