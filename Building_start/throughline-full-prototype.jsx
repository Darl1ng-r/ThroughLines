import React, { useState } from "react";
import {
  Lock,
  Globe,
  Plus,
  PenLine,
  Compass,
  X,
  ArrowUpRight,
  ArrowLeft,
  LogOut,
  Settings as SettingsIcon,
  ChevronDown,
  Send,
  User as UserIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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
};

const fontStyle = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
.tl-root, .tl-root * { box-sizing: border-box; }
.tl-root { font-family: 'Public Sans', sans-serif; }
.tl-display { font-family: 'Fraunces', serif; }
.tl-mono { font-family: 'IBM Plex Mono', monospace; }
.tl-focus:focus-visible { outline: 2px solid ${tokens.pine}; outline-offset: 2px; }
.tl-entry { animation: tl-fade-in 0.35s ease both; }
@keyframes tl-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tl-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
.tl-pulse-dot { animation: tl-pulse 1.4s ease-in-out infinite; }
.tl-scroll::-webkit-scrollbar { width: 8px; }
.tl-scroll::-webkit-scrollbar-thumb { background: ${tokens.line}; border-radius: 4px; }
.tl-range { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; background: ${tokens.line}; outline: none; }
.tl-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: ${tokens.pine}; border: 2px solid ${tokens.card}; box-shadow: 0 0 0 1px ${tokens.pine}; cursor: pointer; }
.tl-range::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: ${tokens.pine}; border: 2px solid ${tokens.card}; box-shadow: 0 0 0 1px ${tokens.pine}; cursor: pointer; }
.tl-input:focus { border-color: ${tokens.pine} !important; }
@media (prefers-reduced-motion: reduce) {
  .tl-entry { animation: none; }
  .tl-pulse-dot { animation: none; }
}
`;

function makeEntry(id, date, visibility, confidence, text, moderationStatus) {
  return { id, date, visibility, confidence, text, moderationStatus: moderationStatus || null };
}

const seedTopics = [
  {
    id: "ubi",
    title: "Universal basic income",
    entries: [
      makeEntry("ubi-1", "Jan 2025", "public", 78, "It feels obviously right to me. Automation is coming for a lot of jobs, faster than most people want to admit, and we need a floor under people so losing a job doesn't mean losing everything.", "approved"),
      makeEntry("ubi-2", "Jun 2025", "private", 45, "Read a stack of opposing arguments this month. Not as sure anymore — worried about inflation eating the benefit, and about what it does to the incentive to work at all."),
      makeEntry("ubi-3", "Mar 2026", "public", 66, "Landed somewhere in the middle. Not universal — targeted at people whose jobs are actually displaced by automation, time-limited, paired with retraining. Less clean than the original idea, but I trust it more.", "approved"),
    ],
  },
  {
    id: "bilingual",
    title: "Raising bilingual kids",
    entries: [
      makeEntry("bi-1", "Aug 2024", "public", 90, "We decided: Arabic and English both, from day one, no matter how much slower it makes things early on. I don't want her to have to relearn a language to talk to her grandparents.", "approved"),
      makeEntry("bi-2", "Feb 2025", "private", 40, "It IS slower. She mixes words constantly and some days I worry I'm confusing her more than helping. Nobody warns you how much you second-guess this in the middle of it."),
      makeEntry("bi-3", "May 2026", "public", 95, "She switched between languages with her grandmother yesterday without me prompting her once, mid-sentence, totally unbothered. Worth every confusing month.", "approved"),
    ],
  },
];

const discoverFeed = [
  {
    id: "d-amina",
    ownerHandle: "amina_writes",
    ownerName: "Amina K.",
    title: "On leaving a stable job to freelance",
    entries: [
      makeEntry("d-a-1", "May 2025", "public", 30, "Handed in my notice today. My hands were shaking signing the letter. Everyone keeps asking if I'm sure. I'm not.", "approved"),
      makeEntry("d-a-2", "Oct 2025", "public", 55, "Four months in. The fear hasn't gone away, it's just gotten quieter. I think that might be the whole deal.", "approved"),
      makeEntry("d-a-3", "Jun 2026", "public", 74, "First month I made more than my old salary. Doesn't erase the hard months, but it's proof the bet wasn't crazy.", "approved"),
    ],
  },
  {
    id: "d-river",
    ownerHandle: "quietriver",
    ownerName: "S. Novak",
    title: "Whether I still believe in free will",
    entries: [
      makeEntry("d-r-1", "Jan 2026", "public", 60, "Reading more neuroscience than philosophy lately, and it's making the question feel less abstract and more personal.", "approved"),
      makeEntry("d-r-2", "May 2026", "public", 38, "Starting to think the question itself is the wrong shape. Maybe it's not yes or no, it's a matter of degree.", "approved"),
    ],
  },
  {
    id: "d-tarabishi",
    ownerHandle: "j.tarabishi",
    ownerName: "J. Tarabishi",
    title: "Equal pay, now that I'm the one managing",
    entries: [
      makeEntry("d-t-1", "Jul 2024", "public", 85, "It's a different fight from the inside. I used to think the fix was simple. It is simple. It's just not easy.", "approved"),
      makeEntry("d-t-2", "Mar 2025", "public", 70, "Pushed the first adjustment through this quarter. Smaller than I wanted, but it's not nothing.", "approved"),
      makeEntry("d-t-3", "Feb 2026", "public", 88, "Full pay audit approved for next year. Took eighteen months of asking the same question in every budget meeting.", "approved"),
    ],
  },
];

function Meter({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div style={{ width: 46, height: 4, borderRadius: 2, background: tokens.line, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: tokens.pine }} />
      </div>
      <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>{value}% sure</span>
    </div>
  );
}

function VisibilityTag({ visibility, moderationStatus }) {
  if (visibility === "private") {
    return (
      <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.plum, textTransform: "uppercase" }}>
        <Lock size={11} /> Private
      </span>
    );
  }
  if (moderationStatus === "pending") {
    return (
      <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.ember, textTransform: "uppercase" }}>
        <span className="tl-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: tokens.ember, display: "inline-block" }} />
        Reviewing
      </span>
    );
  }
  return (
    <span className="tl-mono flex items-center gap-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: tokens.pine, textTransform: "uppercase" }}>
      <Globe size={11} /> Public
    </span>
  );
}

function EntryDot({ visibility }) {
  const isPublic = visibility === "public";
  return (
    <div style={{ width: 12, height: 12, borderRadius: "50%", background: isPublic ? tokens.pine : tokens.card, border: `2px solid ${isPublic ? tokens.pine : tokens.plum}`, flexShrink: 0, marginTop: 6 }} />
  );
}

function ChartDot(props) {
  const { cx, cy, payload } = props;
  const isPublic = payload.visibility === "public";
  return <circle cx={cx} cy={cy} r={4} fill={isPublic ? tokens.pine : tokens.card} stroke={isPublic ? tokens.pine : tokens.plum} strokeWidth={2} />;
}

function ConfidenceChart({ entries }) {
  if (entries.length < 2) return null;
  const data = entries.map((e) => ({ date: e.date, confidence: e.confidence, visibility: e.visibility }));
  return (
    <div style={{ background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: "14px 16px 6px", marginBottom: 24 }}>
      <div className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        How sure you've felt, over time
      </div>
      <div style={{ height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={tokens.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: tokens.inkFaint, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: tokens.line }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: tokens.inkFaint, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={34} />
            <Tooltip
              contentStyle={{ background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 8, fontSize: 12, fontFamily: "Public Sans" }}
              formatter={(v) => [`${v}% sure`, ""]}
              labelStyle={{ color: tokens.ink, fontWeight: 600 }}
            />
            <Line type="monotone" dataKey="confidence" stroke={tokens.pine} strokeWidth={2} dot={<ChartDot />} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PillButton({ active, activeBg, activeColor, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className="tl-focus flex items-center gap-1"
      style={{
        padding: "5px 10px",
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        background: active ? activeBg : "transparent",
        color: active ? activeColor : tokens.inkFaint,
      }}
    >
      {icon} {children}
    </button>
  );
}

function TextField({ label, type = "text", value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-1" style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 12 }}>
      {label}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="tl-focus tl-input"
        style={{
          padding: "9px 11px",
          borderRadius: 8,
          border: `1px solid ${tokens.line}`,
          background: tokens.card,
          color: tokens.ink,
          fontSize: 14,
          fontFamily: "'Public Sans', sans-serif",
        }}
      />
    </label>
  );
}

// ---------- AUTH SCREEN ----------
function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit =
    mode === "login" ? email.trim() && password.trim() : displayName.trim() && username.trim() && email.trim() && password.trim();

  function submit() {
    if (!canSubmit) return;
    onAuthed({
      username: mode === "login" ? email.split("@")[0].toLowerCase() : username,
      displayName: mode === "login" ? "Welcome back" : displayName,
      bio: "Figuring things out, mostly out loud.",
    });
  }

  return (
    <div className="tl-root flex" style={{ minHeight: "100vh", background: tokens.paper, color: tokens.ink }}>
      <style>{fontStyle}</style>
      <div
        className="flex-col justify-between hidden md:flex"
        style={{ width: "42%", background: tokens.pine, color: tokens.paper, padding: 48 }}
      >
        <div className="flex items-center gap-2">
          <div className="tl-display" style={{ width: 28, height: 28, borderRadius: 6, background: tokens.paper, color: tokens.pine, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>T</div>
          <span className="tl-display" style={{ fontSize: 20, fontWeight: 600 }}>Throughline</span>
        </div>
        <div>
          <p className="tl-display" style={{ fontSize: 32, lineHeight: 1.35, fontWeight: 500, marginBottom: 16 }}>
            Say what you think.
            <br />
            Say it again when you don't anymore.
          </p>
          <p style={{ fontSize: 14, opacity: 0.8, maxWidth: 360 }}>
            Write about the same thing as many times as you need to. Keep it to yourself, or put it out into the open — one entry at a time.
          </p>
        </div>
        <p className="tl-mono" style={{ fontSize: 11, opacity: 0.6 }}>Private by default. Public when you say so.</p>
      </div>

      <div className="flex flex-1 items-center justify-center" style={{ padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <div className="flex items-center gap-1" style={{ background: tokens.paperDeep, borderRadius: 999, padding: 4, marginBottom: 28 }}>
            <button onClick={() => setMode("login")} className="tl-focus" style={{ flex: 1, padding: "8px 0", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: mode === "login" ? tokens.card : "transparent", color: mode === "login" ? tokens.ink : tokens.inkSoft }}>
              Log in
            </button>
            <button onClick={() => setMode("signup")} className="tl-focus" style={{ flex: 1, padding: "8px 0", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: mode === "signup" ? tokens.card : "transparent", color: mode === "signup" ? tokens.ink : tokens.inkSoft }}>
              Sign up
            </button>
          </div>

          <h1 className="tl-display" style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
            {mode === "login" ? "Welcome back" : "Start your throughline"}
          </h1>
          <p style={{ fontSize: 13, color: tokens.inkSoft, marginBottom: 22 }}>
            {mode === "login" ? "Pick up where you left off." : "Takes about a minute. No credit card, no essay."}
          </p>

          {mode === "signup" && (
            <>
              <TextField label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Sarah Novak" />
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="quietriver"
              />
            </>
          )}
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="tl-focus"
            style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed", background: tokens.pine, color: tokens.paper, opacity: canSubmit ? 1 : 0.45, marginTop: 4 }}
          >
            {mode === "login" ? "Log in" : "Create account"}
          </button>

          <div className="flex items-center gap-3" style={{ margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: tokens.line }} />
            <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>or</span>
            <div style={{ flex: 1, height: 1, background: tokens.line }} />
          </div>

          <button
            onClick={submit}
            className="tl-focus flex items-center justify-center gap-2"
            style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            <span className="tl-display" style={{ fontWeight: 700 }}>G</span> Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- NAV BAR ----------
function NavBar({ screen, setScreen, currentUser, onLogout, setToast }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = currentUser.displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center justify-between" style={{ padding: "14px 24px", borderBottom: `1px solid ${tokens.line}`, background: tokens.paper, position: "relative", zIndex: 20 }}>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="tl-display" style={{ width: 26, height: 26, borderRadius: 6, background: tokens.pine, color: tokens.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>T</div>
          <span className="tl-display" style={{ fontSize: 17, fontWeight: 600 }}>Throughline</span>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          <button onClick={() => setScreen("dashboard")} className="tl-focus" style={{ padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: screen === "dashboard" ? tokens.paperDeep : "transparent", color: tokens.ink }}>
            Dashboard
          </button>
          <button onClick={() => setScreen("discover")} className="tl-focus flex items-center gap-1" style={{ padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: screen === "discover" ? tokens.paperDeep : "transparent", color: tokens.ink }}>
            <Compass size={13} /> Discover
          </button>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen((s) => !s)}
          className="tl-focus flex items-center gap-2"
          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, borderRadius: 999 }}
        >
          <div className="tl-mono" style={{ width: 28, height: 28, borderRadius: "50%", background: tokens.plumSoft, color: tokens.plum, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>
            {initials}
          </div>
          <ChevronDown size={14} color={tokens.inkFaint} />
        </button>

        {menuOpen && (
          <div style={{ position: "absolute", right: 0, top: 38, width: 200, background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(33,31,27,0.08)", overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${tokens.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.displayName}</div>
              <div className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>@{currentUser.username}</div>
            </div>
            <button
              onClick={() => { setScreen("profile"); setMenuOpen(false); }}
              className="tl-focus flex items-center gap-2"
              style={{ width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, textAlign: "left" }}
            >
              <UserIcon size={14} /> View public profile
            </button>
            <button
              onClick={() => { setToast("Settings aren't part of this prototype yet."); setMenuOpen(false); }}
              className="tl-focus flex items-center gap-2"
              style={{ width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, textAlign: "left" }}
            >
              <SettingsIcon size={14} /> Settings
            </button>
            <button
              onClick={() => { onLogout(); setMenuOpen(false); }}
              className="tl-focus flex items-center gap-2"
              style={{ width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, textAlign: "left", color: tokens.danger, borderTop: `1px solid ${tokens.line}` }}
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- DASHBOARD ----------
function Dashboard({ topics, setTopics, selectedId, setSelectedId, setToast }) {
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [composeText, setComposeText] = useState("");
  const [composeVisibility, setComposeVisibility] = useState("private");
  const [composeConfidence, setComposeConfidence] = useState(50);

  const selectedTopic = topics.find((t) => t.id === selectedId) || null;

  function addTopic() {
    const title = newTopicTitle.trim();
    if (!title) return;
    const id = `t-${Date.now()}`;
    setTopics((prev) => [{ id, title, entries: [] }, ...prev]);
    setSelectedId(id);
    setNewTopicTitle("");
    setShowNewTopic(false);
  }

  function addEntry() {
    const text = composeText.trim();
    if (!text || !selectedTopic) return;
    const date = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });
    const entry = makeEntry(`e-${Date.now()}`, date, composeVisibility, composeConfidence, text, composeVisibility === "public" ? "pending" : null);
    setTopics((prev) => prev.map((t) => (t.id === selectedTopic.id ? { ...t, entries: [...t.entries, entry] } : t)));
    setComposeText("");
    if (composeVisibility === "public") scheduleModeration(selectedTopic.id, entry.id);
  }

  function scheduleModeration(topicId, entryId) {
    setTimeout(() => {
      setTopics((prev) =>
        prev.map((t) =>
          t.id !== topicId ? t : { ...t, entries: t.entries.map((e) => (e.id === entryId ? { ...e, moderationStatus: "approved" } : e)) }
        )
      );
    }, 1400);
  }

  function publishEntry(topicId, entryId) {
    setTopics((prev) =>
      prev.map((t) =>
        t.id !== topicId ? t : { ...t, entries: t.entries.map((e) => (e.id === entryId ? { ...e, visibility: "public", moderationStatus: "pending" } : e)) }
      )
    );
    scheduleModeration(topicId, entryId);
    setToast("Sent for a quick review before it goes public.");
  }

  function unpublishEntry(topicId, entryId) {
    setTopics((prev) =>
      prev.map((t) =>
        t.id !== topicId ? t : { ...t, entries: t.entries.map((e) => (e.id === entryId ? { ...e, visibility: "private", moderationStatus: null } : e)) }
      )
    );
    setToast("Made private again.");
  }

  return (
    <div className="flex flex-col md:flex-row flex-1" style={{ minHeight: 0 }}>
      <div className="tl-scroll" style={{ width: "100%", maxWidth: 280, flexShrink: 0, borderRight: `1px solid ${tokens.line}`, padding: 20, overflowY: "auto", maxHeight: "calc(100vh - 58px)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <span className="tl-mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: tokens.inkFaint, textTransform: "uppercase" }}>Your topics</span>
          <button onClick={() => setShowNewTopic((s) => !s)} className="tl-focus flex items-center justify-center" aria-label="Start a new throughline" style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${tokens.line}`, background: tokens.card, cursor: "pointer", color: tokens.ink }}>
            {showNewTopic ? <X size={13} /> : <Plus size={13} />}
          </button>
        </div>

        {showNewTopic && (
          <div style={{ marginBottom: 16 }}>
            <textarea
              autoFocus
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder="What's on your mind? e.g. Equal pay, free will, raising kids bilingual"
              rows={2}
              className="tl-focus"
              style={{ width: "100%", resize: "none", padding: 10, fontSize: 13, fontFamily: "'Public Sans', sans-serif", border: `1px solid ${tokens.line}`, borderRadius: 8, background: tokens.card, color: tokens.ink }}
            />
            <button onClick={addTopic} disabled={!newTopicTitle.trim()} className="tl-focus" style={{ marginTop: 8, width: "100%", padding: "8px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 500, cursor: newTopicTitle.trim() ? "pointer" : "not-allowed", background: tokens.pine, color: tokens.paper, opacity: newTopicTitle.trim() ? 1 : 0.5 }}>
              Start a throughline
            </button>
          </div>
        )}

        <div className="flex flex-row md:flex-col gap-2 md:gap-1" style={{ overflowX: "auto" }}>
          {topics.map((t) => {
            const isSelected = t.id === selectedId;
            const publicCount = t.entries.filter((e) => e.visibility === "public").length;
            const privateCount = t.entries.length - publicCount;
            return (
              <button key={t.id} onClick={() => setSelectedId(t.id)} className="tl-focus" style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: isSelected ? tokens.pineSoft : "transparent", borderLeft: `3px solid ${isSelected ? tokens.pine : "transparent"}`, minWidth: 200, flexShrink: 0 }}>
                <div className="tl-display" style={{ fontSize: 14, fontWeight: 500, color: tokens.ink, marginBottom: 3 }}>{t.title}</div>
                <div className="flex items-center gap-2 tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>
                  <span>{t.entries.length} {t.entries.length === 1 ? "entry" : "entries"}</span>
                  {publicCount > 0 && <span className="flex items-center gap-1" style={{ color: tokens.pine }}><Globe size={10} /> {publicCount}</span>}
                  {privateCount > 0 && <span className="flex items-center gap-1" style={{ color: tokens.plum }}><Lock size={10} /> {privateCount}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="tl-scroll" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 58px)" }}>
        {!selectedTopic ? (
          <div className="flex flex-col items-center justify-center" style={{ height: "100%", padding: 40, textAlign: "center" }}>
            <p className="tl-display" style={{ fontSize: 20, color: tokens.inkSoft }}>Pick a throughline, or start one.</p>
          </div>
        ) : (
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 24px 80px" }}>
            <h1 className="tl-display" style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>{selectedTopic.title}</h1>
            <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, marginBottom: 24 }}>
              {selectedTopic.entries.length === 0 ? "No entries yet" : `${selectedTopic.entries.length} ${selectedTopic.entries.length === 1 ? "entry" : "entries"} · ${selectedTopic.entries[0].date} – ${selectedTopic.entries[selectedTopic.entries.length - 1].date}`}
            </p>

            <ConfidenceChart entries={selectedTopic.entries} />

            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: `repeating-linear-gradient(to bottom, ${tokens.line} 0, ${tokens.line} 4px, transparent 4px, transparent 8px)` }} />
              <div className="flex flex-col gap-6">
                {selectedTopic.entries.map((entry) => (
                  <div key={entry.id} className="tl-entry flex gap-4" style={{ position: "relative" }}>
                    <EntryDot visibility={entry.visibility} />
                    <div style={{ flex: 1, background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: "14px 16px" }}>
                      <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 8 }}>
                        <div className="flex items-center gap-3">
                          <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>{entry.date}</span>
                          <Meter value={entry.confidence} />
                        </div>
                        <VisibilityTag visibility={entry.visibility} moderationStatus={entry.moderationStatus} />
                      </div>
                      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: tokens.ink, margin: "0 0 10px" }}>{entry.text}</p>
                      {entry.visibility === "private" ? (
                        <button onClick={() => publishEntry(selectedTopic.id, entry.id)} className="tl-focus flex items-center gap-1" style={{ border: "none", background: "none", cursor: "pointer", color: tokens.pine, fontSize: 12, fontWeight: 500, padding: 0 }}>
                          <Globe size={12} /> Publish this entry
                        </button>
                      ) : (
                        <button onClick={() => unpublishEntry(selectedTopic.id, entry.id)} className="tl-focus flex items-center gap-1" style={{ border: "none", background: "none", cursor: "pointer", color: tokens.inkFaint, fontSize: 12, fontWeight: 500, padding: 0 }}>
                          <Lock size={12} /> Make private
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex gap-4" style={{ position: "relative" }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px dashed ${tokens.ember}`, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: "14px 16px" }}>
                    <div className="flex items-center gap-1" style={{ marginBottom: 8, color: tokens.inkFaint }}>
                      <PenLine size={13} />
                      <span className="tl-mono" style={{ fontSize: 12 }}>{selectedTopic.entries.length === 0 ? "First entry" : "Add another entry"}</span>
                    </div>
                    <textarea
                      value={composeText}
                      onChange={(e) => setComposeText(e.target.value)}
                      placeholder="Why do you believe that — today?"
                      rows={3}
                      className="tl-focus"
                      style={{ width: "100%", resize: "none", border: "none", outline: "none", fontSize: 14.5, lineHeight: 1.6, fontFamily: "'Public Sans', sans-serif", background: "transparent", color: tokens.ink, marginBottom: 6 }}
                    />
                    <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                      <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint, whiteSpace: "nowrap" }}>How sure?</span>
                      <input type="range" min="0" max="100" value={composeConfidence} onChange={(e) => setComposeConfidence(Number(e.target.value))} className="tl-range tl-focus" />
                      <span className="tl-mono" style={{ fontSize: 12, color: tokens.ink, width: 34, textAlign: "right" }}>{composeConfidence}%</span>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1" style={{ background: tokens.paperDeep, borderRadius: 999, padding: 3 }}>
                        <PillButton active={composeVisibility === "private"} activeBg={tokens.plumSoft} activeColor={tokens.plum} onClick={() => setComposeVisibility("private")} icon={<Lock size={11} />}>Private</PillButton>
                        <PillButton active={composeVisibility === "public"} activeBg={tokens.pineSoft} activeColor={tokens.pine} onClick={() => setComposeVisibility("public")} icon={<Globe size={11} />}>Public</PillButton>
                      </div>
                      <button onClick={addEntry} disabled={!composeText.trim()} className="tl-focus" style={{ padding: "7px 14px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 500, cursor: composeText.trim() ? "pointer" : "not-allowed", background: tokens.pine, color: tokens.paper, opacity: composeText.trim() ? 1 : 0.4 }}>
                        Add to the throughline
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
  );
}

// ---------- PUBLIC TOPIC (read-only) ----------
function PublicTopicScreen({ source, onBack, setToast }) {
  const isSelf = source.type === "self";
  const publicEntries = source.topic.entries.filter((e) => e.visibility === "public" && e.moderationStatus === "approved");

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 24px 80px" }}>
      <button onClick={onBack} className="tl-focus flex items-center gap-1" style={{ border: "none", background: "none", cursor: "pointer", color: tokens.inkSoft, fontSize: 13, marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={14} /> {isSelf ? "Back to profile" : "Back to Discover"}
      </button>

      {isSelf && (
        <div style={{ background: tokens.emberSoft, border: `1px solid ${tokens.ember}33`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: tokens.ember, marginBottom: 20 }}>
          Previewing how this throughline looks to visitors — only approved public entries are shown.
        </div>
      )}

      <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, marginBottom: 4 }}>@{source.topic.ownerHandle || source.ownerHandle}</p>
      <h1 className="tl-display" style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>{source.topic.title}</h1>
      <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, marginBottom: 24 }}>
        {publicEntries.length} public {publicEntries.length === 1 ? "entry" : "entries"}
      </p>

      <ConfidenceChart entries={publicEntries} />

      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: `repeating-linear-gradient(to bottom, ${tokens.line} 0, ${tokens.line} 4px, transparent 4px, transparent 8px)` }} />
        <div className="flex flex-col gap-6">
          {publicEntries.map((entry) => (
            <div key={entry.id} className="tl-entry flex gap-4" style={{ position: "relative" }}>
              <EntryDot visibility="public" />
              <div style={{ flex: 1, background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: "14px 16px" }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <div className="flex items-center gap-3">
                    <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>{entry.date}</span>
                    <Meter value={entry.confidence} />
                  </div>
                  <VisibilityTag visibility="public" moderationStatus="approved" />
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: tokens.ink, margin: 0 }}>{entry.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isSelf && (
        <button
          onClick={() => setToast(`Nudge sent to @${source.ownerHandle} for an update.`)}
          className="tl-focus flex items-center gap-2"
          style={{ marginTop: 28, padding: "9px 16px", borderRadius: 8, border: `1px solid ${tokens.line}`, background: tokens.card, color: tokens.ink, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          <Send size={13} /> Nudge @{source.ownerHandle} for an update
        </button>
      )}
    </div>
  );
}

// ---------- PROFILE ----------
function ProfileScreen({ currentUser, topics, onOpenTopic }) {
  const publicTopics = topics
    .map((t) => ({ ...t, publicEntries: t.entries.filter((e) => e.visibility === "public" && e.moderationStatus === "approved") }))
    .filter((t) => t.publicEntries.length > 0);
  const totalPublicEntries = publicTopics.reduce((sum, t) => sum + t.publicEntries.length, 0);
  const initials = currentUser.displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 24px 80px" }}>
      <div style={{ background: tokens.emberSoft, border: `1px solid ${tokens.ember}33`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: tokens.ember, marginBottom: 24 }}>
        This is how your profile looks to anyone who isn't you.
      </div>

      <div className="flex items-center gap-4" style={{ marginBottom: 8 }}>
        <div className="tl-display" style={{ width: 56, height: 56, borderRadius: "50%", background: tokens.plumSoft, color: tokens.plum, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600 }}>{initials}</div>
        <div>
          <h1 className="tl-display" style={{ fontSize: 22, fontWeight: 600 }}>{currentUser.displayName}</h1>
          <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>@{currentUser.username}</p>
        </div>
      </div>
      <p style={{ fontSize: 14, color: tokens.inkSoft, margin: "12px 0 6px" }}>{currentUser.bio}</p>
      <p className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint, marginBottom: 28 }}>
        {publicTopics.length} public {publicTopics.length === 1 ? "throughline" : "throughlines"} · {totalPublicEntries} public {totalPublicEntries === 1 ? "entry" : "entries"}
      </p>

      {publicTopics.length === 0 ? (
        <p style={{ fontSize: 14, color: tokens.inkFaint }}>Nothing public yet. Publish an entry from your dashboard to see it here.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {publicTopics.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpenTopic(t)}
              className="tl-focus"
              style={{ textAlign: "left", background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="tl-display" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{t.title}</h3>
                <ArrowUpRight size={14} color={tokens.inkFaint} />
              </div>
              <p className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint, margin: "4px 0 0" }}>
                {t.publicEntries.length} public {t.publicEntries.length === 1 ? "entry" : "entries"}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- DISCOVER ----------
function DiscoverScreen({ onOpenTopic }) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 24px 80px" }}>
      <h1 className="tl-display" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Public throughlines</h1>
      <p style={{ fontSize: 14, color: tokens.inkSoft, marginBottom: 28 }}>Other people's evolving thoughts, out in the open.</p>
      <div className="flex flex-col gap-3">
        {discoverFeed.map((topic) => {
          const last = topic.entries[topic.entries.length - 1];
          return (
            <div key={topic.id} style={{ background: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: "16px 18px" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span className="tl-mono" style={{ fontSize: 12, color: tokens.inkFaint }}>@{topic.ownerHandle}</span>
                <span className="tl-mono" style={{ fontSize: 11, color: tokens.inkFaint }}>{topic.entries.length} entries</span>
              </div>
              <h3 className="tl-display" style={{ fontSize: 17, fontWeight: 600, margin: "0 0 6px" }}>{topic.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: tokens.ink, margin: "0 0 10px" }}>{last.text}</p>
              <button onClick={() => onOpenTopic(topic)} className="tl-focus flex items-center gap-1" style={{ border: "none", background: "none", cursor: "pointer", color: tokens.pine, fontSize: 13, fontWeight: 500, padding: 0 }}>
                Read the throughline <ArrowUpRight size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: tokens.ink, color: tokens.paper, padding: "10px 18px", borderRadius: 999, fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 50 }}>
      {message}
    </div>
  );
}

// ---------- APP ----------
export default function ThroughlineApp() {
  const [screen, setScreen] = useState("auth");
  const [currentUser, setCurrentUser] = useState(null);
  const [topics, setTopics] = useState(seedTopics);
  const [selectedId, setSelectedId] = useState(seedTopics[0].id);
  const [publicSource, setPublicSource] = useState(null);
  const [toast, setToastRaw] = useState(null);

  function setToast(msg) {
    setToastRaw(msg);
    setTimeout(() => setToastRaw(null), 2600);
  }

  function handleAuthed(user) {
    setCurrentUser(user);
    setScreen("dashboard");
  }

  function handleLogout() {
    setCurrentUser(null);
    setScreen("auth");
  }

  if (screen === "auth" || !currentUser) {
    return <AuthScreen onAuthed={handleAuthed} />;
  }

  return (
    <div className="tl-root" style={{ background: tokens.paper, color: tokens.ink, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{fontStyle}</style>
      <NavBar screen={screen} setScreen={setScreen} currentUser={currentUser} onLogout={handleLogout} setToast={setToast} />

      {screen === "dashboard" && (
        <Dashboard topics={topics} setTopics={setTopics} selectedId={selectedId} setSelectedId={setSelectedId} setToast={setToast} />
      )}

      {screen === "discover" && (
        <div className="tl-scroll" style={{ flex: 1, overflowY: "auto" }}>
          <DiscoverScreen onOpenTopic={(topic) => { setPublicSource({ type: "other", topic, ownerHandle: topic.ownerHandle }); setScreen("publicTopic"); }} />
        </div>
      )}

      {screen === "profile" && (
        <div className="tl-scroll" style={{ flex: 1, overflowY: "auto" }}>
          <ProfileScreen
            currentUser={currentUser}
            topics={topics}
            onOpenTopic={(topic) => { setPublicSource({ type: "self", topic, ownerHandle: currentUser.username }); setScreen("publicTopic"); }}
          />
        </div>
      )}

      {screen === "publicTopic" && publicSource && (
        <div className="tl-scroll" style={{ flex: 1, overflowY: "auto" }}>
          <PublicTopicScreen
            source={publicSource}
            setToast={setToast}
            onBack={() => setScreen(publicSource.type === "self" ? "profile" : "discover")}
          />
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
