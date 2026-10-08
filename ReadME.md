# 🌿 Throughline

**Track how your beliefs, convictions, and perspectives evolve over time.**

Write about the same topic as many times as you need to. Plot your certainty. Keep it private, or put it out into the open — one entry at a time.

> *"Say what you think. Say it again when you don't anymore."*

[![Vitest Tests](https://img.shields.io/badge/tests-95%20passed%20(22%20suites)-2F4A3D?style=flat-square)](file:///home/darling/Downloads/Project-Related/Thoughlines/ThroughLines/src/components/__tests__)
[![React 18](https://img.shields.io/badge/frontend-React%2018%20%7C%20Vite%206-2F4A3D?style=flat-square)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/backend-Supabase%20%7C%20PostgreSQL-3ECF8E?style=flat-square)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-AD6330?style=flat-square)](LICENSE)

---

## What Is Throughline?

Traditional microblogging platforms reward reactionary hot-takes and lock users into performative consistency. **Throughline** functions as an **epistemic reasoning laboratory** designed to capture cognitive trajectories.

Instead of isolated daily posts, Throughline organizes thoughts into continuous **throughlines**:
1. **Create an Intellectual Track:** Define a topic (e.g., *"Is Artificial General Intelligence near?"*, *"Universal Basic Income feasibility"*).
2. **Log Subjective Conviction:** Record journal entries with a quantitative certainty slider (0–100%) and structured epistemic shift attribution (counter-arguments, empirical data, value shifts).
3. **Inspect Belief Evolution:** Visualize your certainty curve over weeks, months, or years with interactive curvature graphs and inflection pivots.
4. **Curated Public Sharing:** Keep entries private by default, or publish individual milestones to the community **Discover** feed.
5. **Realtime Epistemic Nudges:** Allow readers to nudge you for an update when your position on a topic has been dormant.

---

## 🏗️ Architecture & Technology Stack

```
                          ┌───────────────────────────────┐
                          │   Client Browser (SPA)        │
                          │   React 18 + Vite 6           │
                          │   Tactile Custom Design System│
                          └──────┬──────────────┬─────────┘
                                 │              │
                   HTTPS / WSS   │              │ Edge Proxy
                                 ▼              ▼
           ┌────────────────────────┐    ┌────────────────────────┐
           │   Supabase Cloud       │    │  Supabase Edge Workers │
           │  • PostgreSQL + RLS    │    │  • Redis Cache Proxy   │
           │  • Supabase Auth (JWT) │    │  • AI Content Moderator│
           │  • Realtime WebSockets │    └──────────┬─────────────┘
           │  • Outbox Event Queue  │               │
           └────────────────────────┘               ▼
                                         ┌────────────────────────┐
                                         │  Upstash Redis Cache   │
                                         └────────────────────────┘
```

| Layer | Technologies & Implementations |
|:---|:---|
| **Frontend Core** | React 18, React Router v6, Recharts (spline conviction graphs), Lucide Icons |
| **Styling & Design System** | Vanilla CSS custom properties with tactile paper textures, fluid typography, Archival Paper (Light) and Archival Noir (Dark) modes |
| **Local-First State** | IndexedDB offline draft caching (`draftStorage.js`), local state recovery |
| **Command Hub** | Keyboard-first palette (`⌘K` / `Ctrl+K`) with zero-shift fixed overlay |
| **Backend & DB** | Supabase (PostgreSQL 15), Row Level Security (RLS), atomic RPC stored procedures |
| **Event Architecture** | Transactional Outbox Pattern (`outbox_events`), decoupled in-browser Event Bus |
| **Content Moderation** | Two-tier defense: in-engine Unicode/homoglyph normalizer trigger + OpenAI Moderation Edge Function |
| **Caching & Proxy** | Multi-tier L1 in-memory LRU + L2 Upstash Redis via authenticated Edge Function |
| **Security & Privacy** | NIST SP 800-63B password breach checks (HIBP k-anonymity), strict CSP, PII scrubbing |
| **Hosting & Deploy** | Netlify CDN (`netlify.toml`), Vercel (`vercel.json`), or non-root Docker (`nginx.conf`) |
| **CI/CD & Testing** | GitHub Actions (`ci.yml`), Gitleaks secret detection, Vitest (95 tests across 22 suites) |

---

## 🚀 Key Features

* **Belief Evolution Timeline:** Visual spline graph plotting conviction shifts over time with automatic pivot detection (inflections $\ge 15\%$).
* **Epistemic Shift Attribution:** Explicitly log why your conviction moved: *Counter-argument*, *Empirical data*, *Real-world event*, *Value shift*, or *Introspective review*.
* **Immutable Revision History:** Audit trail tracking prior content, previous conviction, and timestamps upon entry edits.
* **Command Hub (`⌘K` / `Ctrl+K`):** Fast keyboard modal for topic jumping, theme switching, data exports, and shortcuts.
* **Dual Privacy Model:** Private journal entries are strictly separated from public post snapshots. Private entries are guarded by PostgreSQL RLS kernel policies and never queryable by third parties.
* **Realtime Discourse Nudges:** WebSocket subscription alert when readers request an update on dormant throughlines, with built-in cooldowns and rate limits.
* **Zero-Loss Drafts:** Background auto-saving to IndexedDB ensures draft entries survive network interruptions, tab crashes, or accidental reloads.
* **Data Portability & GDPR Export:** One-click instant export of your entire intellectual history as structured Obsidian Markdown files and JSON digests.

---

## 💻 Local Development

### Prerequisites
- Node.js 20+ (LTS recommended)
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/yourusername/throughlines.git
cd throughlines
npm ci
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Populate the required keys in `.env`:
```ini
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# App URL (http://localhost:3000 for local development)
VITE_APP_URL=http://localhost:3000

# Google OAuth Client ID (optional for local email login)
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

# Sentry DSN (leave empty to disable during local dev)
VITE_SENTRY_DSN=
```

### 3. Database Setup (Migrations)
Execute the migrations in sequence in your **Supabase Dashboard → SQL Editor**:

1. [`production_schema_and_indexes.sql`](file:///home/darling/Downloads/Project-Related/Thoughlines/ThroughLines/supabase/migrations/production_schema_and_indexes.sql) — Core tables, constraints, triggers, and baseline indexes.
2. [`20261008_content_moderation_hardening.sql`](file:///home/darling/Downloads/Project-Related/Thoughlines/ThroughLines/supabase/migrations/20261008_content_moderation_hardening.sql) — Text normalization triggers and moderation state machine.
3. [`20261008_epistemic_system_enhancements.sql`](file:///home/darling/Downloads/Project-Related/Thoughlines/ThroughLines/supabase/migrations/20261008_epistemic_system_enhancements.sql) — Revision history table, shift attribution, and transactional outbox.
4. [`20261008_production_foreign_key_indexes.sql`](file:///home/darling/Downloads/Project-Related/Thoughlines/ThroughLines/supabase/migrations/20261008_production_foreign_key_indexes.sql) — Foreign key cascade delete indexes and performance optimization.

*Note: All migrations are fully idempotent (`IF NOT EXISTS`, guarded DO blocks) and safe to run multiple times.*

### 4. Run Development Server
```bash
npm run dev
```
The application will be accessible at **http://localhost:3000**.

### 5. Run Test Suite
```bash
npm test
```
Executes all 22 Vitest test suites (95 tests) verifying components, services, and security boundaries.

---

## 🚢 Production Deployment

### Option A: Netlify (Recommended)
This repository includes a pre-configured [netlify.toml](file:///home/darling/Downloads/Project-Related/Thoughlines/ThroughLines/netlify.toml), [public/_headers](file:///home/darling/Downloads/Project-Related/Thoughlines/ThroughLines/public/_headers), and [public/_redirects](file:///home/darling/Downloads/Project-Related/Thoughlines/ThroughLines/public/_redirects).

1. Push your code to GitHub / GitLab.
2. Connect your repository in Netlify Dashboard.
3. Set build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Set environment variables in Netlify Dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_URL` (e.g. `https://throughline.app`)
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_SENTRY_DSN`
5. Deploy site.

### Option B: Docker / VPS Self-Hosted
A multi-stage production [Dockerfile](file:///home/darling/Downloads/Project-Related/Thoughlines/ThroughLines/Dockerfile) and [docker-compose.yml](file:///home/darling/Downloads/Project-Related/Thoughlines/ThroughLines/docker-compose.yml) are provided:

```bash
docker compose up -d --build
```
- Multi-stage build compiles the static bundle and serves it via an unprivileged non-root Nginx container (`USER nginx`) on port 8080.
- Automatic container healthchecks running at `/healthz`.

### Option C: Vercel
Configuration is pre-set in [vercel.json](file:///home/darling/Downloads/Project-Related/Thoughlines/ThroughLines/vercel.json) with strict CSP, HSTS, and SPA routing rewrites.

---

## ⚡ Supabase Edge Functions Deployment

ThroughLines uses two serverless Edge Functions located in `supabase/functions/`:

### 1. Redis Cache Proxy (`redis-proxy`)
Provides an authenticated, rate-limited bridge to Upstash Redis without exposing tokens to the browser.
```bash
supabase functions deploy redis-proxy
```
Configure secrets in **Supabase Dashboard → Edge Functions → Secrets**:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `APP_ORIGIN` (e.g. `https://throughline.app`)

### 2. Automated Content Moderation (`moderate-post`)
Evaluates public submissions against Unicode obfuscation and the OpenAI Moderation API.
```bash
supabase functions deploy moderate-post
```
Configure secrets:
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 🛡️ Security & Privacy Engineering

- **Zero-Trust Row Level Security:** Every table enforces strict RLS policies utilizing `(select auth.uid())` to prevent session initialization bypasses.
- **Anti-Tampering Database Triggers:** Triggers run `SECURITY DEFINER` with fixed `search_path = public, pg_temp` to prevent SQL injection and schema hijacking. Users cannot directly manipulate `moderation_status`.
- **NIST SP 800-63B Password Validation:** Client password validation queries HaveIBeenPwned via k-anonymity (SHA-1 prefixing), blocking compromised passwords without sending the plaintext password over the network.
- **Resilient Cold-Start Handling:** Auth session checks feature an active 3.5s timeout race condition to prevent permanent loading screens if external networks experience latency.
- **Strict Content Security Policy (CSP):** Allowlist-only script and connect sources, disabling `unsafe-eval` and clickjacking via `frame-ancestors 'none'`.
- **PII Scrubbing:** Sentry and local telemetry automatically strip authentication headers, cookies, passwords, and user emails before logging.

---

## 📜 Available NPM Scripts

| Command | Action |
|:---|:---|
| `npm run dev` | Starts Vite development server at `http://localhost:3000` |
| `npm run build` | Builds optimized production bundle to `/dist` with `esbuild` console stripping |
| `npm run preview` | Runs local HTTP preview of the compiled `/dist` bundle on port 4173 |
| `npm test` | Runs the full Vitest suite (95 tests) |
| `npm run lint` | Runs code quality and linting checks |

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
