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
    shift_reason TEXT DEFAULT NULL CHECK (shift_reason IS NULL OR shift_reason IN ('empirical_evidence', 'empirical_data', 'counter_argument', 'real_world_event', 'value_shift', 'introspective_review', 'introspection', 'other')),
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
    shift_reason TEXT DEFAULT NULL CHECK (shift_reason IS NULL OR shift_reason IN ('empirical_evidence', 'empirical_data', 'counter_argument', 'real_world_event', 'value_shift', 'introspective_review', 'introspection', 'other')),
    moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected')),
    moderation_reason TEXT DEFAULT NULL,
    moderated_at TIMESTAMPTZ DEFAULT NOW(),
    entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4b. Immutable Entry Revisions Table (Audit Trail)
CREATE TABLE IF NOT EXISTS public.entry_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID NOT NULL REFERENCES public.private_entries(id) ON DELETE CASCADE,
    prior_content TEXT NOT NULL,
    prior_confidence INT NOT NULL,
    prior_shift_reason TEXT DEFAULT NULL,
    revised_at TIMESTAMPTZ DEFAULT NOW(),
    revised_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 4c. Transactional Outbox Events Table
CREATE TABLE IF NOT EXISTS public.outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ DEFAULT NULL
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
-- 6. In-Database Text Normalization Engine
-- Strips invisible characters, accents, homoglyphs, and leetspeak in PostgreSQL
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_text_moderation(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    cleaned TEXT;
BEGIN
    IF input_text IS NULL THEN
        RETURN '';
    END IF;
    cleaned := LOWER(input_text);
    -- Strip zero-width & invisible characters
    cleaned := REGEXP_REPLACE(cleaned, '[\x{200B}\x{200C}\x{200D}\x{FEFF}\x{00AD}\x{2060}]', '', 'g');
    -- Transliterate Cyrillic visual lookalikes to Latin equivalents
    cleaned := TRANSLATE(cleaned, 'асеорхуіѕпв', 'aceorxyisnb');
    -- Transliterate common accented vowels
    cleaned := TRANSLATE(cleaned, 'áàâäãéèêëíìîïóòôöõúùûüýÿ', 'aaaaaeeeeiiiiooooouuuuyy');
    -- Transliterate common leetspeak symbols to letters
    cleaned := TRANSLATE(cleaned, '@$01357+', 'asoieftt');
    RETURN cleaned;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Server-Side Content Moderation Trigger on public_posts
-- Runs BEFORE INSERT OR UPDATE ON public.public_posts
-- Defends against direct manipulation of moderation_status and post-edit tampering
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_public_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    http_count INT := 0;
    norm_content TEXT;
    is_toxic BOOLEAN;
    is_service_role BOOLEAN;
BEGIN
    is_service_role := (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
                       OR (CURRENT_USER = 'postgres')
                       OR (session_user = 'postgres');

    -- ANTI-TAMPERING: Block non-service-role clients from setting or tampering with moderation_status
    IF TG_OP = 'UPDATE' THEN
        IF NOT is_service_role AND OLD.moderation_status IS DISTINCT FROM NEW.moderation_status THEN
            NEW.moderation_status := OLD.moderation_status;
        END IF;
    END IF;

    norm_content := public.normalize_text_moderation(NEW.content);

    SELECT COUNT(*) INTO http_count
    FROM regexp_matches(NEW.content, 'https?://', 'g');

    is_toxic := (CHAR_LENGTH(NEW.content) > 5000)
             OR (http_count > 3)
             OR (norm_content ~* '\m(casino|crypto-?airdrop|free-?followers|phishing|whatsapp investment|telegram signals)\M')
             OR (norm_content ~* '\m(f+u+c+k+[a-z]*|f+\*+c+k+|b+i+t+c+h+e?s?|b+\*+t+c+h+|b+a+s+t+a+r+d+s?|c+u+n+t+s?|c+\*+n+t+|a+s+s+h+o+l+e+s?|p+u+s+s+y|d+i+c+k+h+e+a+d+|p+o+r+n+[a-z]*|b+l+o+w+j+o+b+|s+h+i+t+[a-z]*)\M')
             OR (norm_content ~* '\m(n+i+g+g+[ea]+r+|n+i+g+g+a+|k+i+k+e+|ch+i+n+k+|f+a+g+g+o+t+|f+a+g+s?|d+y+k+e+s?|t+r+a+n+n+y|r+e+t+a+r+d+[es]?)\M')
             OR (norm_content ~* '(kill\s+(your|ur)self|commit\s+suicide|go\s+die|i\s+will\s+(kill|murder|shoot|stab)\s+(you|u)|slit\s+(your|ur)?\s*throat)');

    IF is_toxic THEN
        NEW.moderation_status := 'flagged';
        NEW.moderation_reason := 'Automated database rule match';
        NEW.moderated_at := NOW();
    ELSE
        IF TG_OP = 'INSERT' THEN
            IF NOT is_service_role OR NEW.moderation_status IS NULL THEN
                NEW.moderation_status := 'approved';
                NEW.moderated_at := NOW();
            END IF;
        ELSIF TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content THEN
            NEW.moderation_status := 'approved';
            NEW.moderated_at := NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.moderate_public_post() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_moderate_public_post ON public.public_posts;
CREATE TRIGGER trigger_moderate_public_post
    BEFORE INSERT OR UPDATE ON public.public_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.moderate_public_post();

-- ---------------------------------------------------------------------------
-- 8. Server-Side Moderation Trigger on public.topics (Title & Slug)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_topic_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    norm_title TEXT;
    norm_slug  TEXT;
    is_toxic   BOOLEAN;
BEGIN
    norm_title := public.normalize_text_moderation(NEW.title);
    norm_slug  := public.normalize_text_moderation(NEW.slug);

    is_toxic := (norm_title ~* '\m(casino|crypto-?airdrop|free-?followers|phishing)\M')
             OR (norm_title ~* '\m(f+u+c+k+[a-z]*|b+i+t+c+h+e?s?|c+u+n+t+s?|a+s+s+h+o+l+e+s?|p+u+s+s+y|d+i+c+k+h+e+a+d+|p+o+r+n+[a-z]*)\M')
             OR (norm_title ~* '\m(n+i+g+g+[ea]+r+|n+i+g+g+a+|k+i+k+e+|ch+i+n+k+|f+a+g+g+o+t+|f+a+g+s?|d+y+k+e+s?|t+r+a+n+n+y|r+e+t+a+r+d+[es]?)\M')
             OR (norm_title ~* '(kill\s+(your|ur)self|commit\s+suicide|i\s+will\s+(kill|murder)\s+(you|u))')
             OR (norm_slug  ~* '(fuck|bitch|cunt|nigger|faggot|retard|kill-yourself)');

    IF is_toxic THEN
        RAISE EXCEPTION 'Topic title or slug violates community discourse guidelines.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.moderate_topic_metadata() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_moderate_topics ON public.topics;
CREATE TRIGGER trigger_moderate_topics
    BEFORE INSERT OR UPDATE OF title, slug ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION public.moderate_topic_metadata();

-- ---------------------------------------------------------------------------
-- 9. Server-Side Moderation Trigger on public.profiles (Display Name & Bio)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_profile_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    norm_bio  TEXT;
    norm_name TEXT;
    is_toxic  BOOLEAN;
BEGIN
    norm_bio  := public.normalize_text_moderation(COALESCE(NEW.bio, ''));
    norm_name := public.normalize_text_moderation(COALESCE(NEW.display_name, ''));

    is_toxic := (norm_bio ~* '\m(casino|crypto-?airdrop|free-?followers|phishing)\M')
             OR (norm_bio ~* '\m(f+u+c+k+[a-z]*|b+i+t+c+h+e?s?|c+u+n+t+s?|a+s+s+h+o+l+e+s?|p+o+r+n+[a-z]*)\M')
             OR (norm_bio ~* '\m(n+i+g+g+[ea]+r+|n+i+g+g+a+|k+i+k+e+|ch+i+n+k+|f+a+g+g+o+t+|f+a+g+s?|d+y+k+e+s?|t+r+a+n+n+y|r+e+t+a+r+d+[es]?)\M')
             OR (norm_name ~* '\m(n+i+g+g+[ea]+r+|n+i+g+g+a+|k+i+k+e+|ch+i+n+k+|f+a+g+g+o+t+|f+a+g+s?|c+u+n+t+s?)\M');

    IF is_toxic THEN
        RAISE EXCEPTION 'Profile display name or bio violates community discourse guidelines.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.moderate_profile_metadata() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_moderate_profiles ON public.profiles;
CREATE TRIGGER trigger_moderate_profiles
    BEFORE INSERT OR UPDATE OF display_name, bio ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.moderate_profile_metadata();

-- ---------------------------------------------------------------------------
-- 7. Nudge TTL Cleanup Function (runs daily via pg_cron at 03:00 UTC)
-- Requires pg_cron extension — enable in Supabase Dashboard > Database > Extensions.
-- Hardened with explicit search_path and restricted EXECUTE permissions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_nudges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    DELETE FROM public.nudges
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Internal maintenance functions must NOT be callable via PostgREST RPC
REVOKE EXECUTE ON FUNCTION public.cleanup_old_nudges() FROM PUBLIC, anon, authenticated;

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
-- Production Performance & Full-Text Search Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_username           ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_topics_user_id             ON public.topics (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topics_slug                ON public.topics (slug);
CREATE INDEX IF NOT EXISTS idx_topics_created_at          ON public.topics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topics_cooldown            ON public.topics (nudge_cooldown_until)
    WHERE nudge_cooldown_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_private_entries_topic_date ON public.private_entries (topic_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_public_posts_feed          ON public.public_posts (moderation_status, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_public_posts_topic_mod      ON public.public_posts (topic_id, moderation_status);
CREATE INDEX IF NOT EXISTS idx_nudges_topic_id            ON public.nudges (topic_id);
CREATE INDEX IF NOT EXISTS idx_nudges_created_at          ON public.nudges (created_at);
CREATE INDEX IF NOT EXISTS idx_public_posts_private_entry_id ON public.public_posts (private_entry_id);
CREATE INDEX IF NOT EXISTS idx_public_posts_user_id        ON public.public_posts (user_id);
CREATE INDEX IF NOT EXISTS idx_private_entries_user_id    ON public.private_entries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entry_revisions_entry_id   ON public.entry_revisions (entry_id, revised_at DESC);
CREATE INDEX IF NOT EXISTS idx_entry_revisions_revised_by  ON public.entry_revisions (revised_by);
CREATE INDEX IF NOT EXISTS idx_outbox_events_status        ON public.outbox_events (status, created_at) WHERE status = 'pending';

-- Full-Text Search Generated Columns & GIN Indexes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'topics' AND column_name = 'fts'
    ) THEN
        ALTER TABLE public.topics ADD COLUMN fts tsvector
            GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, ''))) STORED;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'public_posts' AND column_name = 'fts'
    ) THEN
        ALTER TABLE public.public_posts ADD COLUMN fts tsvector
            GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_topics_fts       ON public.topics USING gin(fts);
CREATE INDEX IF NOT EXISTS idx_public_posts_fts ON public.public_posts USING gin(fts);

-- ---------------------------------------------------------------------------
-- Enable Row Level Security (enabling already-enabled RLS is a no-op — idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nudges          ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS Policies (Hardened against Supabase Advisor & Performance Linters)
-- Uses (select auth.uid()) instead of auth.uid() to eliminate auth_rls_initplan warnings.
-- Consolidates multiple permissive policies to eliminate multiple_permissive_policies warnings.
-- Drops all insecure legacy policies like "Allow public insert to nudges".
-- ---------------------------------------------------------------------------

-- 1. Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"             ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access to profiles"     ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

-- 2. Topics
DROP POLICY IF EXISTS "Users can view own topics"                    ON public.topics;
DROP POLICY IF EXISTS "Public topics viewable if has approved posts" ON public.topics;
DROP POLICY IF EXISTS "Users can insert own topics"                  ON public.topics;
DROP POLICY IF EXISTS "Users can update own topics"                  ON public.topics;
DROP POLICY IF EXISTS "Users can delete own topics"                  ON public.topics;
DROP POLICY IF EXISTS "Allow authenticated users to insert topics"   ON public.topics;
DROP POLICY IF EXISTS "Allow owners to update/delete their topics"   ON public.topics;
DROP POLICY IF EXISTS "Allow public read access to topics"           ON public.topics;
DROP POLICY IF EXISTS "Topics viewable by owner or if public"        ON public.topics;

-- Consolidated single SELECT policy (avoids multiple permissive policies warning)
CREATE POLICY "Topics viewable by owner or if public" ON public.topics
    FOR SELECT USING (
        (select auth.uid()) = user_id
        OR EXISTS (
            SELECT 1 FROM public.public_posts
            WHERE public_posts.topic_id = topics.id AND moderation_status = 'approved'
        )
    );

CREATE POLICY "Users can insert own topics" ON public.topics
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own topics" ON public.topics
    FOR UPDATE USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own topics" ON public.topics
    FOR DELETE USING ((select auth.uid()) = user_id);

-- 3. Private Entries
DROP POLICY IF EXISTS "Users can view own private entries"     ON public.private_entries;
DROP POLICY IF EXISTS "Users can insert own private entries"   ON public.private_entries;
DROP POLICY IF EXISTS "Users can update own private entries"   ON public.private_entries;
DROP POLICY IF EXISTS "Users can delete own private entries"   ON public.private_entries;
DROP POLICY IF EXISTS "Restrict private entries to owner only" ON public.private_entries;

CREATE POLICY "Users can view own private entries" ON public.private_entries
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own private entries" ON public.private_entries
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own private entries" ON public.private_entries
    FOR UPDATE USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own private entries" ON public.private_entries
    FOR DELETE USING ((select auth.uid()) = user_id);

-- 4. Public Posts
DROP POLICY IF EXISTS "Approved public posts are viewable by everyone"        ON public.public_posts;
DROP POLICY IF EXISTS "Users can insert own public posts"                     ON public.public_posts;
DROP POLICY IF EXISTS "Users can update own public posts"                     ON public.public_posts;
DROP POLICY IF EXISTS "Users can delete own public posts"                     ON public.public_posts;
DROP POLICY IF EXISTS "Allow owners to read their own pending/flagged posts"  ON public.public_posts;
DROP POLICY IF EXISTS "Allow public read access to approved posts"            ON public.public_posts;
DROP POLICY IF EXISTS "Allow owners to insert public posts"                   ON public.public_posts;
DROP POLICY IF EXISTS "Allow owners to delete public posts"                   ON public.public_posts;
DROP POLICY IF EXISTS "Public posts viewable if approved or by owner"         ON public.public_posts;

-- Consolidated single SELECT policy (avoids multiple permissive policies warning)
CREATE POLICY "Public posts viewable if approved or by owner" ON public.public_posts
    FOR SELECT USING (
        moderation_status = 'approved'
        OR (select auth.uid()) = user_id
    );

CREATE POLICY "Users can insert own public posts" ON public.public_posts
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own public posts" ON public.public_posts
    FOR UPDATE USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own public posts" ON public.public_posts
    FOR DELETE USING ((select auth.uid()) = user_id);

-- 5. Nudges (Multi-tenant secured and visible to both topic owners and nudgers)
DROP POLICY IF EXISTS "Allow public insert to nudges"                       ON public.nudges;
DROP POLICY IF EXISTS "Allow authenticated insert to nudges"                ON public.nudges;
DROP POLICY IF EXISTS "Topic owners can view nudges"                        ON public.nudges;
DROP POLICY IF EXISTS "Allow topic owners to view nudges"                   ON public.nudges;
DROP POLICY IF EXISTS "Topic owners can delete nudges"                      ON public.nudges;
DROP POLICY IF EXISTS "Allow topic owners to delete nudges"                 ON public.nudges;
DROP POLICY IF EXISTS "Users can view relevant nudges"                      ON public.nudges;
DROP POLICY IF EXISTS "Authenticated users can nudge topics of others once" ON public.nudges;

CREATE POLICY "Users can view relevant nudges" ON public.nudges
    FOR SELECT USING (
        nudger_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.topics
            WHERE topics.id = nudges.topic_id AND topics.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Authenticated users can nudge topics of others once" ON public.nudges
    FOR INSERT WITH CHECK (
        (select auth.uid()) IS NOT NULL
        AND nudger_id = (select auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.topics
            WHERE topics.id = topic_id
              AND topics.user_id != (select auth.uid())
              AND (topics.nudge_cooldown_until IS NULL OR topics.nudge_cooldown_until < NOW())
        )
    );

CREATE POLICY "Topic owners can delete nudges" ON public.nudges
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.topics
            WHERE topics.id = nudges.topic_id AND topics.user_id = (select auth.uid())
        )
    );

-- 6. Entry Revisions
ALTER TABLE public.entry_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own entry revisions" ON public.entry_revisions;
CREATE POLICY "Users can view own entry revisions" ON public.entry_revisions
    FOR SELECT TO authenticated
    USING (
        revised_by = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.private_entries
            WHERE private_entries.id = entry_revisions.entry_id AND private_entries.user_id = (select auth.uid())
        )
    );

-- 7. Transactional Outbox Events
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.outbox_events FROM PUBLIC, anon;
GRANT ALL ON TABLE public.outbox_events TO service_role;
GRANT SELECT ON TABLE public.outbox_events TO authenticated;

DROP POLICY IF EXISTS "Users can only view own outbox events" ON public.outbox_events;
CREATE POLICY "Users can only view own outbox events" ON public.outbox_events
    FOR SELECT TO authenticated
    USING (
        (payload->>'userId')::UUID = (select auth.uid())
    );

-- ---------------------------------------------------------------------------
-- 8. Atomic Multi-Operation Entry Transaction Function (PL/pgSQL RPC)
-- Hardened with explicit search_path and restricted to authenticated role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_entry_transaction(
    p_topic_id UUID,
    p_content TEXT,
    p_confidence INT,
    p_is_public BOOLEAN DEFAULT FALSE,
    p_entry_date TIMESTAMPTZ DEFAULT NOW(),
    p_shift_reason TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_entry_id UUID;
    v_public_id UUID := NULL;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User not authenticated';
    END IF;

    -- Verify topic ownership
    IF NOT EXISTS (SELECT 1 FROM public.topics WHERE id = p_topic_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Topic does not belong to active user';
    END IF;

    -- 1. Insert private journal entry
    INSERT INTO public.private_entries (topic_id, user_id, content, confidence_rating, entry_date, shift_reason)
    VALUES (p_topic_id, v_user_id, p_content, p_confidence, p_entry_date, p_shift_reason)
    RETURNING id INTO v_entry_id;

    -- 2. Conditionally insert public post snapshot
    IF p_is_public THEN
        INSERT INTO public.public_posts (private_entry_id, topic_id, user_id, content, confidence_rating, entry_date, shift_reason)
        VALUES (v_entry_id, p_topic_id, v_user_id, p_content, p_confidence, p_entry_date, p_shift_reason)
        RETURNING id INTO v_public_id;
    END IF;

    -- 3. Clear nudges for this topic atomically
    DELETE FROM public.nudges WHERE topic_id = p_topic_id;

    -- 4. Atomically enqueue Transactional Outbox Event
    INSERT INTO public.outbox_events (event_type, payload)
    VALUES (
        'ENTRY_CREATED',
        jsonb_build_object(
            'entryId', v_entry_id,
            'topicId', p_topic_id,
            'userId', v_user_id,
            'isPublic', p_is_public,
            'publicPostId', v_public_id,
            'shiftReason', p_shift_reason,
            'confidenceRating', p_confidence
        )
    );

    SELECT jsonb_build_object(
        'entryId', v_entry_id,
        'publicPostId', v_public_id,
        'moderationStatus', COALESCE((SELECT moderation_status FROM public.public_posts WHERE id = v_public_id), 'approved'),
        'topicId', p_topic_id,
        'isPublic', p_is_public,
        'entryDate', p_entry_date,
        'shiftReason', p_shift_reason
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant RPC execution only to authenticated users (block anon / public)
REVOKE EXECUTE ON FUNCTION public.create_entry_transaction(UUID, TEXT, INT, BOOLEAN, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_entry_transaction(UUID, TEXT, INT, BOOLEAN, TIMESTAMPTZ, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. Handle New User Trigger Function (Auth Helper)
-- Creates profile record upon user signup. Hardened against search_path injection
-- and RPC execution exposure.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            LOWER(REGEXP_REPLACE(SPLIT_PART(COALESCE(NEW.email, 'user'), '@', 1), '[^a-zA-Z0-9_]', '', 'g')) || FLOOR(RANDOM() * 1000)::TEXT
        ),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Thinker'),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Revoke RPC execution for trigger function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Safely attach trigger to auth.users if not already attached
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
            CREATE TRIGGER on_auth_user_created
                AFTER INSERT ON auth.users
                FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        END IF;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 10. Security Hardening for System/Legacy Helper Functions
-- Revoke RPC access on internal trigger functions and remove rls_auto_enable
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.moderate_public_post() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_nudges() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
    DROP FUNCTION IF EXISTS public.rls_auto_enable() CASCADE;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname IN ('rls_auto_enable')
    LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', func_record.proname, func_record.args);
        EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated;', func_record.proname, func_record.args);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Supabase Realtime WebSockets
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
