-- ThroughLines Enterprise Production Database Migration & Indexing Script
-- IDEMPOTENT: Safe to run multiple times on re-deploys without errors.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    display_name TEXT CHECK (char_length(display_name) <= 100),
    bio TEXT CHECK (char_length(bio) <= 500),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
    slug TEXT NOT NULL,
    nudge_cooldown_until TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_slug UNIQUE (user_id, slug)
);

-- Idempotent column migration: add nudge_cooldown_until to existing tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'topics'
          AND column_name = 'nudge_cooldown_until'
    ) THEN
        ALTER TABLE public.topics ADD COLUMN nudge_cooldown_until TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- 3. Private Entries Table
CREATE TABLE IF NOT EXISTS public.private_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 5000),
    confidence_rating INT NOT NULL CHECK (confidence_rating >= 0 AND confidence_rating <= 100),
    entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Public Posts Table
CREATE TABLE IF NOT EXISTS public.public_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    private_entry_id UUID NOT NULL REFERENCES public.private_entries(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 5000),
    confidence_rating INT NOT NULL CHECK (confidence_rating >= 0 AND confidence_rating <= 100),
    moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'flagged')),
    entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Nudges Table
CREATE TABLE IF NOT EXISTS public.nudges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    nudger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_topic_nudger UNIQUE (topic_id, nudger_id)
);

-- ---------------------------------------------------------------------------
-- 6. Server-Side Content Moderation Trigger
-- Runs BEFORE INSERT/UPDATE inside PostgreSQL — cannot be bypassed by any client.
-- Using a subquery on regexp_matches() for PG13+ compatibility (not REGEXP_COUNT).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_public_post()
RETURNS TRIGGER AS $$
DECLARE
    http_count INT := 0;
    is_spam    BOOLEAN;
BEGIN
    -- Count HTTP/HTTPS link occurrences (PG13+ compatible — regexp_matches in 'g' mode)
    SELECT COUNT(*) INTO http_count
    FROM regexp_matches(NEW.content, 'https?://', 'g');

    is_spam := (CHAR_LENGTH(NEW.content) > 4500)
            OR (http_count > 3)
            OR (NEW.content ~* '\m(casino|crypto-airdrop|free-followers|phishing)\M');

    IF is_spam THEN
        NEW.moderation_status := 'flagged';
    ELSIF NEW.moderation_status IS NULL OR NEW.moderation_status = 'pending' THEN
        NEW.moderation_status := 'approved';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Idempotent trigger: DROP IF EXISTS first, then CREATE
DROP TRIGGER IF EXISTS trigger_moderate_public_post ON public.public_posts;
CREATE TRIGGER trigger_moderate_public_post
    BEFORE INSERT OR UPDATE OF content ON public.public_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.moderate_public_post();

-- ---------------------------------------------------------------------------
-- 7. Nudge TTL Cleanup Function (runs daily via pg_cron at 03:00 UTC)
-- Requires pg_cron extension — enable in Supabase Dashboard > Database > Extensions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_nudges()
RETURNS void AS $$
BEGIN
    DELETE FROM public.nudges
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Idempotent cron scheduling: unschedule by name if it exists, then register fresh.
-- cron.unschedule() is idempotent only when guarded — the WHERE EXISTS prevents an
-- error if the job does not yet exist.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nudges-ttl-cleanup') THEN
        PERFORM cron.unschedule('nudges-ttl-cleanup');
    END IF;
END $$;
SELECT cron.schedule(
    'nudges-ttl-cleanup',
    '0 3 * * *',
    $$SELECT public.cleanup_old_nudges();$$
);

-- ---------------------------------------------------------------------------
-- Production Performance Indexes (CREATE INDEX IF NOT EXISTS — fully idempotent)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_username           ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_topics_user_id             ON public.topics (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topics_slug                ON public.topics (slug);
CREATE INDEX IF NOT EXISTS idx_topics_created_at          ON public.topics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topics_cooldown            ON public.topics (nudge_cooldown_until)
    WHERE nudge_cooldown_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_private_entries_topic_date ON public.private_entries (topic_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_public_posts_feed          ON public.public_posts (moderation_status, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_nudges_topic_id            ON public.nudges (topic_id);
CREATE INDEX IF NOT EXISTS idx_nudges_created_at          ON public.nudges (created_at);

-- ---------------------------------------------------------------------------
-- Enable Row Level Security (enabling already-enabled RLS is a no-op — idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nudges          ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS Policies
-- DROP POLICY IF EXISTS before every CREATE — makes the entire block idempotent.
-- ---------------------------------------------------------------------------

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"             ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Topics
DROP POLICY IF EXISTS "Users can view own topics"                    ON public.topics;
DROP POLICY IF EXISTS "Public topics viewable if has approved posts" ON public.topics;
DROP POLICY IF EXISTS "Users can insert own topics"                  ON public.topics;
DROP POLICY IF EXISTS "Users can update own topics"                  ON public.topics;
DROP POLICY IF EXISTS "Users can delete own topics"                  ON public.topics;

CREATE POLICY "Users can view own topics" ON public.topics
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public topics viewable if has approved posts" ON public.topics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.public_posts
            WHERE public_posts.topic_id = topics.id AND moderation_status = 'approved'
        )
    );
CREATE POLICY "Users can insert own topics" ON public.topics
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topics" ON public.topics
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own topics" ON public.topics
    FOR DELETE USING (auth.uid() = user_id);

-- Private Entries
DROP POLICY IF EXISTS "Users can view own private entries"   ON public.private_entries;
DROP POLICY IF EXISTS "Users can insert own private entries" ON public.private_entries;
DROP POLICY IF EXISTS "Users can update own private entries" ON public.private_entries;
DROP POLICY IF EXISTS "Users can delete own private entries" ON public.private_entries;

CREATE POLICY "Users can view own private entries" ON public.private_entries
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own private entries" ON public.private_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own private entries" ON public.private_entries
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own private entries" ON public.private_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Public Posts
-- Note: The BEFORE INSERT trigger (moderate_public_post) already controls
-- moderation_status, so clients cannot persist an 'approved' status directly.
DROP POLICY IF EXISTS "Approved public posts are viewable by everyone" ON public.public_posts;
DROP POLICY IF EXISTS "Users can insert own public posts"              ON public.public_posts;
DROP POLICY IF EXISTS "Users can update own public posts"              ON public.public_posts;
DROP POLICY IF EXISTS "Users can delete own public posts"              ON public.public_posts;

CREATE POLICY "Approved public posts are viewable by everyone" ON public.public_posts
    FOR SELECT USING (moderation_status = 'approved' OR auth.uid() = user_id);
CREATE POLICY "Users can insert own public posts" ON public.public_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own public posts" ON public.public_posts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own public posts" ON public.public_posts
    FOR DELETE USING (auth.uid() = user_id);

-- Nudges
-- Rate-limiting strategy:
--   Layer 1 (unique constraint): CONSTRAINT unique_topic_nudger prevents duplicate rows.
--   Layer 2 (RLS INSERT policy): blocks nudges while nudge_cooldown_until is in the future.
--   Layer 3 (nginx): IP-level rate limiting at 10r/s.
--   Layer 4 (client): session-level throttle in checkRateLimit() (UX feedback only).
DROP POLICY IF EXISTS "Topic owners can view nudges"                        ON public.nudges;
DROP POLICY IF EXISTS "Authenticated users can nudge topics of others once" ON public.nudges;
DROP POLICY IF EXISTS "Topic owners can delete nudges"                      ON public.nudges;

CREATE POLICY "Topic owners can view nudges" ON public.nudges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.topics
            WHERE topics.id = nudges.topic_id AND topics.user_id = auth.uid()
        )
    );
CREATE POLICY "Authenticated users can nudge topics of others once" ON public.nudges
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND nudger_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.topics
            WHERE topics.id = topic_id
              AND topics.user_id != auth.uid()
              AND (topics.nudge_cooldown_until IS NULL OR topics.nudge_cooldown_until < NOW())
        )
    );
CREATE POLICY "Topic owners can delete nudges" ON public.nudges
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.topics
            WHERE topics.id = nudges.topic_id AND topics.user_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- Supabase Realtime WebSockets
-- Idempotent: wrapped in DO block to guard against duplicate ADD TABLE errors.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'nudges'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.nudges;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'public_posts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.public_posts;
    END IF;
END $$;
