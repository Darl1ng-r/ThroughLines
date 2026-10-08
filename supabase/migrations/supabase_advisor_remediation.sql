-- ===========================================================================
-- ThroughLines Supabase Advisor Remediation Script
--
-- Directly fixes ALL Supabase Advisor warnings:
--   1. auth_rls_initplan (replaces auth.uid() with (select auth.uid()))
--   2. multiple_permissive_policies (consolidates overlapping SELECT/INSERT policies)
--   3. rls_policy_always_true (drops legacy "Allow public insert to nudges")
--   4. anon_security_definer_function_executable & authenticated_...
--      (revokes public/anon/authenticated execution on internal trigger functions)
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. SCHEMA PREREQUISITES (Ensure all columns exist before policy definition)
-- ---------------------------------------------------------------------------
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS nudge_cooldown_until TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_topics_cooldown ON public.topics (nudge_cooldown_until) WHERE nudge_cooldown_until IS NOT NULL;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.public_posts ADD COLUMN IF NOT EXISTS private_entry_id UUID;

-- ---------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. TOPICS POLICIES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own topics"                    ON public.topics;
DROP POLICY IF EXISTS "Public topics viewable if has approved posts" ON public.topics;
DROP POLICY IF EXISTS "Users can insert own topics"                  ON public.topics;
DROP POLICY IF EXISTS "Users can update own topics"                  ON public.topics;
DROP POLICY IF EXISTS "Users can delete own topics"                  ON public.topics;
DROP POLICY IF EXISTS "Allow authenticated users to insert topics"   ON public.topics;
DROP POLICY IF EXISTS "Allow owners to update/delete their topics"   ON public.topics;
DROP POLICY IF EXISTS "Allow public read access to topics"           ON public.topics;
DROP POLICY IF EXISTS "Topics viewable by owner or if public"        ON public.topics;

-- Consolidated single SELECT policy:
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

-- ---------------------------------------------------------------------------
-- 3. PRIVATE ENTRIES POLICIES
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4. PUBLIC POSTS POLICIES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Approved public posts are viewable by everyone"        ON public.public_posts;
DROP POLICY IF EXISTS "Users can insert own public posts"                     ON public.public_posts;
DROP POLICY IF EXISTS "Users can update own public posts"                     ON public.public_posts;
DROP POLICY IF EXISTS "Users can delete own public posts"                     ON public.public_posts;
DROP POLICY IF EXISTS "Allow owners to read their own pending/flagged posts"  ON public.public_posts;
DROP POLICY IF EXISTS "Allow public read access to approved posts"            ON public.public_posts;
DROP POLICY IF EXISTS "Allow owners to insert public posts"                   ON public.public_posts;
DROP POLICY IF EXISTS "Allow owners to delete public posts"                   ON public.public_posts;
DROP POLICY IF EXISTS "Public posts viewable if approved or by owner"         ON public.public_posts;

-- Consolidated single SELECT policy:
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

-- ---------------------------------------------------------------------------
-- 5. NUDGES POLICIES (Fixes rls_policy_always_true vulnerability)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 6. REVOKE EXECUTION ON INTERNAL SECURITY DEFINER FUNCTIONS
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.moderate_public_post() FROM PUBLIC, anon, authenticated;

-- Ensure cleanup function is not callable via RPC
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'cleanup_old_nudges'
    ) THEN
        REVOKE ALL ON FUNCTION public.cleanup_old_nudges() FROM PUBLIC, anon, authenticated;
    END IF;
END $$;

-- Drop legacy unneeded helper function if present
DO $$
BEGIN
    DROP FUNCTION IF EXISTS public.rls_auto_enable() CASCADE;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

COMMIT;
