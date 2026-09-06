# 🌿 Throughline

**Track how your beliefs evolve over time.**

Write about the same topic as many times as you need to. Plot your certainty. Keep it private, or put it out into the open — one entry at a time.

> *"Say what you think. Say it again when you don't anymore."*

---

## What Is This?

Throughline is a personal thought journal that tracks **belief evolution**. Unlike a regular diary that captures moments, Throughline lets you write about the *same topic repeatedly* — and shows you how your conviction has changed over time through a confidence graph.

**Core loop:**
1. Create a **Topic** (e.g., "Is remote work better?", "My view on AI")
2. Add **Entries** over days, weeks, or years — each with a confidence rating (0–100%)
3. Watch your **Throughline** — the trajectory of your certainty — plotted over time
4. Optionally **publish** individual entries to the public Discover feed
5. Let other users **nudge** you when they want a new entry on a topic you've been quiet on

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Frontend** | React 18, Vite 5, React Router 6 |
| **Styling** | Vanilla CSS with CSS Variables (light + dark mode) |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| **Caching** | Upstash Redis (via authenticated Edge Function proxy) |
| **Container** | Docker + Nginx (non-root, port 8080) |
| **CI/CD** | GitHub Actions (secret scanning + test + build) |
| **PWA** | Service Worker, Web Push, installable |

---

## Local Development

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone & install

```bash
git clone https://github.com/yourusername/throughlines.git
cd throughlines
npm ci
```

### 2. Configure environment

Copy the example and fill in your values:

```bash
cp .env .env.local
```

| Variable | Where to find it |
|:---|:---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `VITE_APP_URL` | `http://localhost:3000` for local dev |
| `VITE_GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com) → Credentials |
| `VITE_SENTRY_DSN` | [Sentry.io](https://sentry.io) → Project Settings → SDK Setup (free tier) |

### 3. Set up the database

Run the migration in **Supabase Dashboard → SQL Editor**:

```
supabase/migrations/production_schema_and_indexes.sql
```

This script is fully idempotent — safe to run multiple times.

### 4. Start the dev server

```bash
npm run dev
# Opens at http://localhost:3000
```

### 5. Run tests

```bash
npm test
# 15 test suites, 42 tests
```

---

## Deployment

### Option A: Docker (Recommended for VPS)

```bash
docker compose up -d --build
```

Required build args:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_APP_URL=https://yourdomain.com
VITE_GOOGLE_CLIENT_ID=...
```

The container runs as a **non-root user** on port 8080, mapped to 80 via docker-compose.

### Option B: Netlify / Vercel (Static)

```bash
npm run build
# Deploy the /dist directory
```

Set all `VITE_*` env vars in the platform dashboard.

---

## 🚀 Cloudflare CDN Setup (Free — Do This Before Launch)

This is the single highest-leverage free upgrade. Takes 10 minutes and cuts server load by ~70%.

1. Create a free account at [cloudflare.com](https://cloudflare.com)
2. **Add a site** → enter your domain → **Free plan**
3. Cloudflare scans your DNS — verify records are correct
4. Update your registrar's nameservers to Cloudflare's values
5. Once active → **Speed → Optimization**:
   - ✅ Auto Minify (JS, CSS, HTML)
   - ✅ Brotli compression
6. **Caching → Configuration**:
   - Browser Cache TTL: **1 year**
   - Page Rule: `yourdomain.com/assets/*` → Cache Level: **Cache Everything**
7. **SSL/TLS** → **Full (strict)** mode
8. **Speed → Network** → Enable **HTTP/3 (QUIC)**
9. **Analytics** tab → Enable **Web Analytics** (free, no cookie banner needed)

---

## 🔭 Sentry Error Tracking (Free — 5,000 errors/month)

1. Create a free account at [sentry.io](https://sentry.io)
2. New project → Platform: **React**
3. Copy your **DSN** from Project Settings → SDK Setup
4. Add to `.env`: `VITE_SENTRY_DSN=https://xxxx@oXXX.ingest.sentry.io/XXXX`
5. Add to GitHub Secrets for CI builds

Sentry activates automatically when DSN is present. Session replays only fire on errors (privacy-preserving).

---

## Supabase Edge Function: Redis Proxy

Set these in **Supabase Dashboard → Edge Functions → Secrets**:

| Secret | Value |
|:---|:---|
| `UPSTASH_REDIS_REST_URL` | From Upstash console |
| `UPSTASH_REDIS_REST_TOKEN` | From Upstash console |
| `APP_ORIGIN` | `https://yourdomain.com` |

```bash
supabase functions deploy redis-proxy
```

---

## Architecture

```
Browser
  ├── Static Assets → Cloudflare CDN → Nginx → /dist
  ├── Auth & Database → Supabase (PostgreSQL + RLS)
  ├── Realtime (nudges) → Supabase Realtime WebSockets
  └── Redis Cache → Edge Function (JWT-gated) → Upstash
```

**Security highlights:**
- Row Level Security on all tables
- SECURITY DEFINER functions hardened with `SET search_path`
- Server-side content moderation trigger (bypass-proof)
- Non-root Docker container
- Client-side HIBP breach detection (NIST SP 800-63B)
- Auth lockout after 5 failures (30s cooldown)
- Gitleaks secret scanning in CI

---

## Environment Variables

| Variable | Required | Description |
|:---|:---:|:---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `VITE_APP_URL` | ✅ | Production URL (used in OG meta tags) |
| `VITE_GOOGLE_CLIENT_ID` | ✅ | Google OAuth Client ID |
| `VITE_REDIS_PROXY_URL` | ⚠️ | Supabase Edge Function URL for Redis |
| `VITE_SENTRY_DSN` | ⚠️ | Sentry DSN (leave blank to disable) |

---

## Scripts

| Command | Description |
|:---|:---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production bundle to `/dist` |
| `npm test` | Vitest suite (42 tests) |
| `npm run preview` | Preview production build |

---

## License

MIT
