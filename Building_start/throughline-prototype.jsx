import React, { useState, useMemo } from "react";
import { 
  Lock, 
  Globe, 
  Plus, 
  PenLine, 
  Compass, 
  X, 
  ArrowUpRight, 
  LogIn, 
  UserPlus, 
  LogOut, 
  ArrowLeft, 
  TrendingUp, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

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
  emberSoft: "#F6EDE6",
  line: "#D9D2C0",
};

const fontStyle = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
.tl-root, .tl-root * { box-sizing: border-box; }
.tl-root { font-family: 'Public Sans', sans-serif; }
.tl-display { font-family: 'Fraunces', serif; }
.tl-mono { font-family: 'IBM Plex Mono', monospace; }
.tl-focus:focus-visible {
  outline: 2px solid ${tokens.pine};
  outline-offset: 2px;
}
.tl-entry {
  animation: tl-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes tl-fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.tl-scroll::-webkit-scrollbar { width: 8px; }
.tl-scroll::-webkit-scrollbar-thumb { background: ${tokens.line}; border-radius: 4px; }
.tl-glass-btn {
  transition: all 0.2s ease;
}
.tl-glass-btn:hover {
  background: ${tokens.paperDeep};
  transform: translateY(-1px);
}
.tl-glass-btn:active {
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .tl-entry { animation: none; }
}
`;

// Seed data with confidence ratings for evolution graphing
const seedTopics = [
  {
    id: "ubi",
    title: "Universal basic income",
    entries: [
      {
        id: "ubi-1",
        date: "Jan 2025",
        visibility: "public",
        confidence: 90,
        text: "It feels obviously right to me. Automation is coming for a lot of jobs, faster than most people want to admit, and we need a floor under people so losing a job doesn't mean losing everything.",
      },
      {
        id: "ubi-2",
        date: "Jun 2025",
        visibility: "private",
        confidence: 45,
        text: "Read a stack of opposing arguments this month. Not as sure anymore — worried about inflation eating the benefit, and about what it does to the incentive to work at all.",
      },
      {
        id: "ubi-3",
        date: "Mar 2026",
        visibility: "public",
        confidence: 70,
        text: "Landed somewhere in the middle. Not universal — targeted at people whose jobs are actually displaced by automation, time-limited, paired with retraining. Less clean than the original idea, but I trust it more.",
      },
    ],
  },
  {
    id: "bilingual",
    title: "Raising bilingual kids",
    entries: [
      {
        id: "bi-1",
        date: "Aug 2024",
        visibility: "public",
        confidence: 95,
        text: "We decided: Arabic and English both, from day one, no matter how much slower it makes things early on. I don't want her to have to relearn a language to talk to her grandparents.",
      },
      {
        id: "bi-2",
        date: "Feb 2025",
        visibility: "private",
        confidence: 60,
        text: "It IS slower. She mixes words constantly and some days I worry I'm confusing her more than helping. Nobody warns you how much you second-guess this in the middle of it.",
      },
      {
        id: "bi-3",
        date: "May 2026",
        visibility: "public",
        confidence: 100,
        text: "She switched between languages with her grandmother yesterday without me prompting her once, mid-sentence, totally unbothered. Worth every confusing month.",
      },
    ],
  },
];

const discoverFeed = [
  {
    handle: "amina_writes",
    name: "Amina Tarabishi",
    bio: "Essayist, designer, and student of slow social networks.",
    title: "On leaving a stable job to freelance",
    span: "5 entries · 14 months",
    snippet: "Six months in, the fear hasn't gone away, it's just gotten quieter. I think that might be the whole deal.",
    entries: [
      { id: "am-1", date: "Jan 2025", visibility: "public", confidence: 95, text: "I'm resigning on Monday. Stable income, great team, but zero creative autonomy. It feels like golden handcuffs. Surely I'll figure it out." },
      { id: "am-2", date: "Mar 2025", visibility: "public", confidence: 75, text: "First month freelancing. The freedom is intoxicating, but the admin work is a nightmare. I spent three days setting up tax invoices instead of creating." },
      { id: "am-3", date: "Jun 2025", visibility: "public", confidence: 30, text: "A major client just backed out last-minute. Savings are draining faster than expected. The panic is very real. Wondering if I made a massive mistake." },
      { id: "am-4", date: "Oct 2025", visibility: "public", confidence: 65, text: "Finally landed two recurring retainers. The baseline panic is gone, replaced by a routine. I'm working more hours than my corporate job, but it feels like my own hours." },
      { id: "am-5", date: "Mar 2026", visibility: "public", confidence: 85, text: "Fourteen months in. The fear hasn't gone away, it's just gotten quieter and predictable. I value my Tuesday afternoon walks more than any salary slip." }
    ]
  },
  {
    handle: "quietriver",
    name: "Elena Rostova",
    bio: "Cognitive scientist writing about mind, biology, and belief systems.",
    title: "Whether I still believe in free will",
    span: "3 entries · 6 months",
    snippet: "Reading more neuroscience than philosophy lately, and it's making the question feel less abstract and more personal.",
    entries: [
      { id: "qr-1", date: "Nov 2025", visibility: "public", confidence: 80, text: "Always took free will for granted. Of course I choose what to write. Rationality requires intent." },
      { id: "qr-2", date: "Jan 2026", visibility: "public", confidence: 40, text: "Studying pre-conscious brain signals. It's unsettling how much of our decision-making is mapped before we 'feel' like we choose. The conscious mind might just be a press secretary." },
      { id: "qr-3", date: "May 2026", visibility: "public", confidence: 50, text: "Settling into a soft compatibilism. Maybe absolute free will is an illusion, but acting as if we have it is a necessary, beautiful evolutionary code." }
    ]
  },
  {
    handle: "j.tarabishi",
    name: "Jamil Tarabishi",
    bio: "Product manager. Exploring decentralized coordination and pay equality.",
    title: "Equal pay, now that I'm the one managing",
    span: "3 entries · 1 year",
    snippet: "It's a different fight from the inside. I used to think the fix was simple. It is simple. It's just not easy.",
    entries: [
      { id: "jt-1", date: "Jun 2025", visibility: "public", confidence: 90, text: "Just promoted to team lead. I'm auditing our department payroll first thing. Transparency is the antidote to wage disparities." },
      { id: "jt-2", date: "Dec 2025", visibility: "public", confidence: 55, text: "HR constraints are intense. Standardized bands mean I can't pay exceptional people more without triggering systemic reviews. Equity is simple in theory, but incredibly hard to execute against corporate legal frameworks." },
      { id: "jt-3", date: "Jun 2026", visibility: "public", confidence: 75, text: "Managed to push through a department-wide wage transparency audit. Took six months of fighting. It's simple—you just have to be willing to spend your personal management capital on it." }
    ]
  },
];

function EntryDot({ visibility }) {
  const isPublic = visibility === "public";
  return (
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: isPublic ? tokens.pine : tokens.card,
        border: `2px solid ${isPublic ? tokens.pine : tokens.plum}`,
        flexShrink: 0,
        marginTop: 6,
      }}
    />
  );
}

function VisibilityTag({ visibility }) {
  const isPublic = visibility === "public";
  return (
    <span
      className="tl-mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        letterSpacing: "0.04em",
        color: isPublic ? tokens.pine : tokens.plum,
        textTransform: "uppercase",
      }}
    >
      {isPublic ? <Globe size={11} /> : <Lock size={11} />}
      {isPublic ? "Public" : "Private"}
    </span>
  );
}

// ----------------------------------------------------
// EVOLUTION GRAPH COMPONENT (SVG-Based Line Chart)
// ----------------------------------------------------
function EvolutionGraph({ entries }) {
  if (!entries || entries.length < 2) {
    return (
      <div 
        className="flex items-center gap-2"
        style={{ 
          background: tokens.paperDeep, 
          padding: "10px 14px", 
          borderRadius: 8, 
          fontSize: 13, 
          color: tokens.inkSoft,
          marginBottom: 24,
        }}
      >
        <TrendingUp size={16} />
        <span>Add at least two entries with confidence values to view your opinion's evolution graph.</span>
      </div>
    );
  }

  const width = 500;
  const height = 100;
  const padding = 20;

  const points = entries.map((entry, index) => {
    const x = padding + (index / (entries.length - 1)) * (width - 2 * padding);
    // Invert Y axis so 100% is at the top
    const y = height - padding - (entry.confidence / 100) * (height - 2 * padding);
    return { x, y, ...entry };
  });

  const pathD = points.reduce((acc, point, index) => {
    return index === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, "");

  return (
    <div style={{ marginBottom: 32 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Evolution of Belief (Confidence %)
        </span>
        <span className="tl-mono" style={{ fontSize: 11, color: tokens.pine }}>
          {points[0].date} → {points[points.length - 1].date}
        </span>
      </div>
      <div style={{ background: tokens.card, borderRadius: 10, border: `1px solid ${tokens.line}`, padding: "16px 12px" }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: "visible" }}>
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke={tokens.line} strokeDasharray="3,3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke={tokens.line} strokeDasharray="3,3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={tokens.line} />
          
          {/* Path line */}
          <path d={pathD} fill="none" stroke={tokens.pine} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Dots */}
          {points.map((pt, i) => (
            <g key={pt.id}>
              <circle cx={pt.x} cy={pt.y} r="5" fill={tokens.paper} stroke={tokens.pine} strokeWidth="2.5" />
              <text 
                x={pt.x} 
                y={pt.y - 10} 
                textAnchor="middle" 
                className="tl-mono" 
                style={{ fontSize: 9, fontWeight: 600, fill: tokens.ink }}
              >
                {pt.confidence}%
              </text>
              <text 
                x={pt.x} 
                y={height - 4} 
                textAnchor="middle" 
                className="tl-mono" 
                style={{ fontSize: 8, fill: tokens.inkFaint }}
              >
                {pt.date}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function ThroughlineApp() {
  const [view, setView] = useState("auth"); // "auth", "mine", "discover", "profile"
  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
  const [user, setUser] = useState(null); // Authenticated user state
  const [topics, setTopics] = useState(seedTopics);
  const [selectedId, setSelectedId] = useState(seedTopics[0].id);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [composeText, setComposeText] = useState("");
  const [composeVisibility, setComposeVisibility] = useState("private");
  const [composeConfidence, setComposeConfidence] = useState(80);

  // Profile view states
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileTopicIndex, setProfileTopicIndex] = useState(0);

  // Authentication states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [authError, setAuthError] = useState("");

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedId) || null,
    [topics, selectedId]
  );

  function handleAuthSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Please fill in all credentials.");
      return;
    }
    if (authMode === "signup" && !username) {
      setAuthError("Please choose a username.");
      return;
    }
    
    // Simulate login success
    const mockUser = {
      email,
      username: username || email.split("@")[0],
      displayName: username ? `@${username}` : "Explorer"
    };
    setUser(mockUser);
    setView("mine");
    setAuthError("");
  }

  function handleGuestAccess() {
    setUser({
      email: "guest@throughline.com",
      username: "guest_explorer",
      displayName: "Guest Explorer"
    });
    setView("mine");
  }

  function handleLogout() {
    setUser(null);
    setEmail("");
    setPassword("");
    setUsername("");
    setView("auth");
  }

  function addTopic() {
    const title = newTopicTitle.trim();
    if (!title) return;
    const id = `t-${Date.now()}`;
    const next = { id, title, entries: [] };
    setTopics((prev) => [next, ...prev]);
    setSelectedId(id);
    setNewTopicTitle("");
    setShowNewTopic(false);
  }

  function addEntry() {
    const text = composeText.trim();
    if (!text || !selectedTopic) return;
    const date = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });
    const entry = { 
      id: `e-${Date.now()}`, 
      date, 
      visibility: composeVisibility, 
      confidence: Number(composeConfidence),
      text 
    };
    setTopics((prev) =>
      prev.map((t) =>
        t.id === selectedTopic.id ? { ...t, entries: [...t.entries, entry] } : t
      )
    );
    setComposeText("");
    setComposeConfidence(80);
  }

  return (
    <div
      className="tl-root"
      style={{
        background: tokens.paper,
        color: tokens.ink,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{fontStyle}</style>

      {/* ----------------------------------------------------
          1. AUTHENTICATION SCREEN (LOGIN / SIGN UP)
          ---------------------------------------------------- */}
      {view === "auth" && (
        <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: 24 }}>
          {/* Logo Heading */}
          <div className="flex flex-col items-center gap-2" style={{ marginBottom: 32, textAlign: "center" }}>
            <div
              className="tl-display"
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: tokens.pine,
                color: tokens.paper,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(47, 74, 61, 0.15)"
              }}
            >
              T
            </div>
            <h1 className="tl-display" style={{ fontSize: 32, fontWeight: 700, margin: "12px 0 4px", letterSpacing: "-0.02em" }}>
              Throughline
            </h1>
            <p style={{ fontSize: 14, color: tokens.inkSoft, maxWidth: 320 }}>
              A sanctuary for evolving thoughts, private journals, and public beliefs.
            </p>
          </div>

          {/* Form Card */}
          <div
            style={{
              background: tokens.card,
              border: `1px solid ${tokens.line}`,
              borderRadius: 16,
              boxShadow: "0 8px 30px rgba(33, 31, 27, 0.04)",
              width: "100%",
              maxWidth: 400,
              padding: 32,
            }}
          >
            {/* Tabs */}
            <div className="flex" style={{ borderBottom: `1px solid ${tokens.line}`, marginBottom: 24 }}>
              <button
                onClick={() => { setAuthMode("login"); setAuthError(""); }}
                style={{
                  flex: 1,
                  paddingBottom: 12,
                  border: "none",
                  background: "transparent",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: authMode === "login" ? tokens.pine : tokens.inkFaint,
                  borderBottom: `2px solid ${authMode === "login" ? tokens.pine : "transparent"}`
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode("signup"); setAuthError(""); }}
                style={{
                  flex: 1,
                  paddingBottom: 12,
                  border: "none",
                  background: "transparent",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: authMode === "signup" ? tokens.pine : tokens.inkFaint,
                  borderBottom: `2px solid ${authMode === "signup" ? tokens.pine : "transparent"}`
                }}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              {authMode === "signup" && (
                <div>
                  <label className="tl-mono" style={{ display: "block", fontSize: 11, color: tokens.inkSoft, textTransform: "uppercase", marginBottom: 6 }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. yourname"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${tokens.line}`,
                      background: tokens.paper,
                      color: tokens.ink,
                      fontSize: 14,
                    }}
                  />
                </div>
              )}

              <div>
                <label className="tl-mono" style={{ display: "block", fontSize: 11, color: tokens.inkSoft, textTransform: "uppercase", marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${tokens.line}`,
                    background: tokens.paper,
                    color: tokens.ink,
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label className="tl-mono" style={{ display: "block", fontSize: 11, color: tokens.inkSoft, textTransform: "uppercase", marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${tokens.line}`,
                    background: tokens.paper,
                    color: tokens.ink,
                    fontSize: 14,
                  }}
                />
              </div>

              {authError && (
                <div style={{ color: tokens.ember, fontSize: 13, marginTop: 4 }}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="tl-glass-btn"
                style={{
                  background: tokens.pine,
                  color: tokens.paper,
                  border: "none",
                  borderRadius: 8,
                  padding: "12px",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 12
                }}
              >
                {authMode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
                <span>{authMode === "login" ? "Access my space" : "Begin writing"}</span>
              </button>
            </form>

            <div style={{ margin: "20px 0 16px", textAlign: "center" }}>
              <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>OR</span>
            </div>

            <button
              onClick={handleGuestAccess}
              style={{
                width: "100%",
                background: "transparent",
                border: `1px dashed ${tokens.pine}`,
                color: tokens.pine,
                borderRadius: 8,
                padding: "10px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <Sparkles size={14} />
              <span>Explore Prototype as Guest</span>
            </button>

            {/* Privacy Shield Info */}
            <div className="flex items-start gap-2" style={{ marginTop: 24, padding: "10px 12px", background: tokens.pineSoft, borderRadius: 8 }}>
              <ShieldCheck size={16} style={{ color: tokens.pine, flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: tokens.pine, margin: 0, lineHeight: 1.4 }}>
                Private entries are encrypted end-to-end and are never accessible on the discover feed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          HEADER BAR (Only shown when authenticated)
          ---------------------------------------------------- */}
      {view !== "auth" && (
        <div
          className="flex items-center justify-between"
          style={{
            padding: "16px 24px",
            borderBottom: `1px solid ${tokens.line}`,
            background: tokens.paper,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="tl-display"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: tokens.pine,
                color: tokens.paper,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              T
            </div>
            <span className="tl-display" style={{ fontSize: 20, fontWeight: 600 }}>
              Throughline
            </span>
          </div>

          <div className="flex items-center gap-1" style={{ background: tokens.paperDeep, borderRadius: 999, padding: 4 }}>
            <button
              onClick={() => setView("mine")}
              className="tl-focus"
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                background: view === "mine" ? tokens.card : "transparent",
                color: view === "mine" ? tokens.ink : tokens.inkSoft,
              }}
            >
              My Throughlines
            </button>
            <button
              onClick={() => setView("discover")}
              className="tl-focus flex items-center gap-1"
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                background: view === "discover" ? tokens.card : "transparent",
                color: view === "discover" ? tokens.ink : tokens.inkSoft,
              }}
            >
              <Compass size={13} /> Discover
            </button>
          </div>

          {/* User metadata & Logout */}
          <div className="flex items-center gap-3">
            <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkSoft }}>
              {user ? `@${user.username}` : ""}
            </span>
            <button
              onClick={handleLogout}
              className="tl-focus flex items-center justify-center"
              title="Logout"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: tokens.inkSoft,
                padding: 6
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          2. DASHBOARD VIEW (PERSONAL PRIVATE/PUBLIC JOURNALING)
          ---------------------------------------------------- */}
      {view === "mine" && (
        <div className="flex flex-1" style={{ minHeight: 0 }}>
          {/* Sidebar */}
          <div
            className="tl-scroll"
            style={{
              width: 280,
              flexShrink: 0,
              borderRight: `1px solid ${tokens.line}`,
              padding: 20,
              overflowY: "auto",
              maxHeight: "calc(100vh - 65px)",
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <span
                className="tl-mono"
                style={{ fontSize: 11, letterSpacing: "0.06em", color: tokens.inkFaint, textTransform: "uppercase" }}
              >
                Your topics
              </span>
              <button
                onClick={() => setShowNewTopic((s) => !s)}
                className="tl-focus flex items-center justify-center"
                aria-label="Start a new throughline"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border: `1px solid ${tokens.line}`,
                  background: tokens.card,
                  cursor: "pointer",
                  color: tokens.ink,
                }}
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
                  placeholder="What's on your mind? e.g. Equal pay, free will, raising kids"
                  rows={2}
                  className="tl-focus"
                  style={{
                    width: "100%",
                    resize: "none",
                    padding: 10,
                    fontSize: 13,
                    fontFamily: "'Public Sans', sans-serif",
                    border: `1px solid ${tokens.line}`,
                    borderRadius: 8,
                    background: tokens.card,
                    color: tokens.ink,
                  }}
                />
                <button
                  onClick={addTopic}
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
                    opacity: newTopicTitle.trim() ? 1 : 0.5,
                  }}
                >
                  Start a throughline
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1">
              {topics.map((t) => {
                const isSelected = t.id === selectedId;
                const publicCount = t.entries.filter((e) => e.visibility === "public").length;
                const privateCount = t.entries.length - publicCount;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className="tl-focus"
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      background: isSelected ? tokens.pineSoft : "transparent",
                      borderLeft: `3px solid ${isSelected ? tokens.pine : "transparent"}`,
                    }}
                  >
                    <div
                      className="tl-display"
                      style={{ fontSize: 14, fontWeight: 500, color: tokens.ink, marginBottom: 3 }}
                    >
                      {t.title}
                    </div>
                    <div className="flex items-center gap-2 tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>
                      <span>{t.entries.length} {t.entries.length === 1 ? "entry" : "entries"}</span>
                      {publicCount > 0 && (
                        <span className="flex items-center gap-1" style={{ color: tokens.pine }}>
                          <Globe size={10} /> {publicCount}
                        </span>
                      )}
                      {privateCount > 0 && (
                        <span className="flex items-center gap-1" style={{ color: tokens.plum }}>
                          <Lock size={10} /> {privateCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Workspace content */}
          <div className="tl-scroll" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 65px)" }}>
            {!selectedTopic ? (
              <div
                className="flex flex-col items-center justify-center"
                style={{ height: "100%", padding: 40, textAlign: "center" }}
              >
                <p className="tl-display" style={{ fontSize: 20, color: tokens.inkSoft }}>
                  Pick a throughline, or start one.
                </p>
              </div>
            ) : (
              <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 32px 80px" }}>
                <h1 className="tl-display" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>
                  {selectedTopic.title}
                </h1>
                <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, marginBottom: 24 }}>
                  {selectedTopic.entries.length === 0
                    ? "No entries yet"
                    : `${selectedTopic.entries.length} ${selectedTopic.entries.length === 1 ? "entry" : "entries"} · ${selectedTopic.entries[0].date} – ${selectedTopic.entries[selectedTopic.entries.length - 1].date}`}
                </p>

                {/* Draw Evolution line graph if we have entries */}
                <EvolutionGraph entries={selectedTopic.entries} />

                <div style={{ position: "relative" }}>
                  {/* spine */}
                  <div
                    style={{
                      position: "absolute",
                      left: 5,
                      top: 6,
                      bottom: 6,
                      width: 2,
                      background: `repeating-linear-gradient(to bottom, ${tokens.line} 0, ${tokens.line} 4px, transparent 4px, transparent 8px)`,
                    }}
                  />

                  <div className="flex flex-col gap-6">
                    {selectedTopic.entries.map((entry) => (
                      <div key={entry.id} className="tl-entry flex gap-4" style={{ position: "relative" }}>
                        <EntryDot visibility={entry.visibility} />
                        <div
                          style={{
                            flex: 1,
                            background: tokens.card,
                            border: `1px solid ${tokens.line}`,
                            borderRadius: 10,
                            padding: "14px 16px",
                          }}
                        >
                          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                            <div className="flex items-center gap-3">
                              <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>
                                {entry.date}
                              </span>
                              <span className="tl-mono" style={{ fontSize: 11, color: tokens.pine, background: tokens.pineSoft, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                                {entry.confidence}% Confidence
                              </span>
                            </div>
                            <VisibilityTag visibility={entry.visibility} />
                          </div>
                          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: tokens.ink, margin: 0 }}>
                            {entry.text}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Compose input node */}
                    <div className="flex gap-4" style={{ position: "relative" }}>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          border: `2px dashed ${tokens.ember}`,
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          flex: 1,
                          background: tokens.card,
                          border: `1px solid ${tokens.line}`,
                          borderRadius: 10,
                          padding: "16px 18px",
                          boxShadow: "0 4px 16px rgba(33,31,27,0.02)"
                        }}
                      >
                        <div className="flex items-center gap-1" style={{ marginBottom: 12, color: tokens.inkFaint }}>
                          <PenLine size={13} />
                          <span className="tl-mono" style={{ fontSize: 12 }}>
                            {selectedTopic.entries.length === 0 ? "First entry" : "Add another entry"}
                          </span>
                        </div>
                        <textarea
                          value={composeText}
                          onChange={(e) => setComposeText(e.target.value)}
                          placeholder="Why do you believe that — today?"
                          rows={3}
                          className="tl-focus"
                          style={{
                            width: "100%",
                            resize: "none",
                            border: "none",
                            outline: "none",
                            fontSize: 14.5,
                            lineHeight: 1.6,
                            fontFamily: "'Public Sans', sans-serif",
                            background: "transparent",
                            color: tokens.ink,
                            marginBottom: 14,
                          }}
                        />

                        {/* Confidence Slider */}
                        <div style={{ marginBottom: 20, padding: "10px 12px", background: tokens.paperDeep, borderRadius: 8 }}>
                          <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                            <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkSoft, textTransform: "uppercase" }}>
                              Belief Confidence Level
                            </span>
                            <span className="tl-mono" style={{ fontSize: 12, fontWeight: 600, color: tokens.pine }}>
                              {composeConfidence}% Confidence
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={composeConfidence}
                            onChange={(e) => setComposeConfidence(e.target.value)}
                            style={{
                              width: "100%",
                              accentColor: tokens.pine,
                              cursor: "pointer",
                              height: 4,
                              background: tokens.line
                            }}
                          />
                          <div className="flex justify-between tl-mono text-gray-500" style={{ fontSize: 9, marginTop: 4 }}>
                            <span>0% (Completely Doubtful)</span>
                            <span>100% (Certain)</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1" style={{ background: tokens.paperDeep, borderRadius: 999, padding: 3 }}>
                            <button
                              onClick={() => setComposeVisibility("private")}
                              className="tl-focus flex items-center gap-1"
                              style={{
                                padding: "5px 10px",
                                borderRadius: 999,
                                border: "none",
                                cursor: "pointer",
                                fontSize: 12,
                                background: composeVisibility === "private" ? tokens.plumSoft : "transparent",
                                color: composeVisibility === "private" ? tokens.plum : tokens.inkFaint,
                              }}
                            >
                              <Lock size={11} /> Private
                            </button>
                            <button
                              onClick={() => setComposeVisibility("public")}
                              className="tl-focus flex items-center gap-1"
                              style={{
                                padding: "5px 10px",
                                borderRadius: 999,
                                border: "none",
                                cursor: "pointer",
                                fontSize: 12,
                                background: composeVisibility === "public" ? tokens.pineSoft : "transparent",
                                color: composeVisibility === "public" ? tokens.pine : tokens.inkFaint,
                              }}
                            >
                              <Globe size={11} /> Public
                            </button>
                          </div>
                          
                          <button
                            onClick={addEntry}
                            disabled={!composeText.trim()}
                            className="tl-focus"
                            style={{
                              padding: "7px 14px",
                              borderRadius: 8,
                              border: "none",
                              fontSize: 13,
                              fontWeight: 500,
                              cursor: composeText.trim() ? "pointer" : "not-allowed",
                              background: tokens.pine,
                              color: tokens.paper,
                              opacity: composeText.trim() ? 1 : 0.4,
                            }}
                          >
                            Add to Throughline
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          3. DISCOVER FEED (PUBLIC GLOBAL OPINIONS)
          ---------------------------------------------------- */}
      {view === "discover" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 32px 80px" }}>
            <h1 className="tl-display" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
              Public throughlines
            </h1>
            <p style={{ fontSize: 14, color: tokens.inkSoft, marginBottom: 28 }}>
              Other people's evolving thoughts, out in the open.
            </p>

            <div className="flex flex-col gap-3">
              {discoverFeed.map((d) => (
                <div
                  key={d.handle}
                  style={{
                    background: tokens.card,
                    border: `1px solid ${tokens.line}`,
                    borderRadius: 10,
                    padding: "16px 18px",
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <button 
                      onClick={() => {
                        setSelectedProfile(d);
                        setProfileTopicIndex(0);
                        setView("profile");
                      }}
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
                      @{d.handle}
                    </button>
                    <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>
                      {d.span}
                    </span>
                  </div>
                  <h3 className="tl-display" style={{ fontSize: 17, fontWeight: 600, margin: "0 0 6px" }}>
                    {d.title}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: tokens.ink, margin: "0 0 10px" }}>
                    {d.snippet}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedProfile(d);
                      setProfileTopicIndex(0);
                      setView("profile");
                    }}
                    className="tl-focus flex items-center gap-1"
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: tokens.pine,
                      fontSize: 13,
                      fontWeight: 500,
                      padding: 0,
                    }}
                  >
                    Read full throughline <ArrowUpRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          4. PUBLIC PROFILE & DEDICATED THROUGHLINE READ VIEW
          ---------------------------------------------------- */}
      {view === "profile" && selectedProfile && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 32px 80px" }}>
            
            {/* Back to discover */}
            <button
              onClick={() => setView("discover")}
              className="tl-focus flex items-center gap-1"
              style={{
                background: "transparent",
                border: "none",
                color: tokens.inkSoft,
                cursor: "pointer",
                fontSize: 13,
                marginBottom: 28,
                padding: 0
              }}
            >
              <ArrowLeft size={16} /> Back to Discover
            </button>

            {/* Author info card */}
            <div 
              style={{ 
                background: tokens.card, 
                border: `1px solid ${tokens.line}`, 
                borderRadius: 12, 
                padding: 24, 
                marginBottom: 32 
              }}
            >
              <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>CREATOR PROFILE</span>
              <h2 className="tl-display" style={{ fontSize: 24, fontWeight: 600, margin: "4px 0 2px" }}>
                {selectedProfile.name}
              </h2>
              <p className="tl-mono" style={{ fontSize: 13, color: tokens.pine, margin: "0 0 12px" }}>
                @{selectedProfile.handle}
              </p>
              <p style={{ fontSize: 14, color: tokens.inkSoft, lineHeight: 1.5, margin: 0 }}>
                {selectedProfile.bio}
              </p>
            </div>

            {/* Active Published Topic */}
            <div>
              <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
                <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Selected public throughline
                </span>
              </div>
              
              <h1 className="tl-display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
                {selectedProfile.title}
              </h1>
              <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, marginBottom: 24 }}>
                {selectedProfile.entries.length} entries · {selectedProfile.span}
              </p>

              {/* Render Public Opinion Evolution Chart */}
              <EvolutionGraph entries={selectedProfile.entries} />

              <div style={{ position: "relative" }}>
                {/* spine */}
                <div
                  style={{
                    position: "absolute",
                    left: 5,
                    top: 6,
                    bottom: 6,
                    width: 2,
                    background: `repeating-linear-gradient(to bottom, ${tokens.line} 0, ${tokens.line} 4px, transparent 4px, transparent 8px)`,
                  }}
                />

                <div className="flex flex-col gap-6">
                  {selectedProfile.entries.map((entry) => (
                    <div key={entry.id} className="tl-entry flex gap-4" style={{ position: "relative" }}>
                      <EntryDot visibility={entry.visibility} />
                      <div
                        style={{
                          flex: 1,
                          background: tokens.card,
                          border: `1px solid ${tokens.line}`,
                          borderRadius: 10,
                          padding: "14px 16px",
                        }}
                      >
                        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                          <div className="flex items-center gap-3">
                            <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>
                              {entry.date}
                            </span>
                            <span className="tl-mono" style={{ fontSize: 11, color: tokens.pine, background: tokens.pineSoft, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                              {entry.confidence}% Confidence
                            </span>
                          </div>
                          <VisibilityTag visibility={entry.visibility} />
                        </div>
                        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: tokens.ink, margin: 0 }}>
                          {entry.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
