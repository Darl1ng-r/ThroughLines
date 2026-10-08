-- ThroughLines Production Database Performance & Foreign Key Indexing
-- IDEMPOTENT: Safe to run on existing databases or re-deployments.
-- Resolves unindexed foreign keys that cause table lock escalations on cascade deletes.

-- 1. Index on public.public_posts (private_entry_id)
-- Prevents sequential scans during cascade deletion of private journal entries.
CREATE INDEX IF NOT EXISTS idx_public_posts_private_entry_id 
    ON public.public_posts (private_entry_id);

-- 2. Index on public.public_posts (user_id)
-- Accelerates user profile lookups and account deletion integrity checks.
CREATE INDEX IF NOT EXISTS idx_public_posts_user_id 
    ON public.public_posts (user_id);

-- 3. Index on public.private_entries (user_id)
-- Accelerates user GDPR archive export, account deletion, and user data queries.
CREATE INDEX IF NOT EXISTS idx_private_entries_user_id 
    ON public.private_entries (user_id, created_at DESC);

-- 4. Indexes on public.entry_revisions (entry_id, revised_by)
-- Accelerates revision audit trail loading in UI and prevents locks on entry deletion.
CREATE INDEX IF NOT EXISTS idx_entry_revisions_entry_id 
    ON public.entry_revisions (entry_id, revised_at DESC);

CREATE INDEX IF NOT EXISTS idx_entry_revisions_revised_by 
    ON public.entry_revisions (revised_by);

-- 5. Partial Index on public.outbox_events (pending status)
-- Optimizes background worker polling queue.
CREATE INDEX IF NOT EXISTS idx_outbox_events_status 
    ON public.outbox_events (status, created_at) 
    WHERE status = 'pending';
