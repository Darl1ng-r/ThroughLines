-- ThroughLines Enterprise Database Enhancements:
-- 1. Immutable Entry Revision History (Audit Trail)
-- 2. Structured Epistemic Shift Attribution (Reason for Shift)
-- 3. Transactional Outbox Pattern for Asynchronous Workers
-- 4. High-Performance Discover Feed Covering Index
-- IDEMPOTENT: Safe to run on existing databases.

-- 1. Add shift_reason column to private_entries and public_posts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'private_entries' AND column_name = 'shift_reason'
    ) THEN
        ALTER TABLE public.private_entries 
            ADD COLUMN shift_reason TEXT DEFAULT NULL 
            CHECK (shift_reason IS NULL OR shift_reason IN (
                'empirical_evidence',
                'empirical_data', 
                'counter_argument', 
                'real_world_event', 
                'value_shift', 
                'introspective_review',
                'introspection', 
                'other'
            ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'public_posts' AND column_name = 'shift_reason'
    ) THEN
        ALTER TABLE public.public_posts 
            ADD COLUMN shift_reason TEXT DEFAULT NULL 
            CHECK (shift_reason IS NULL OR shift_reason IN (
                'empirical_evidence',
                'empirical_data', 
                'counter_argument', 
                'real_world_event', 
                'value_shift', 
                'introspective_review',
                'introspection', 
                'other'
            ));
    END IF;
END $$;

-- 2. Immutable Entry Revision History Table
CREATE TABLE IF NOT EXISTS public.entry_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID NOT NULL REFERENCES public.private_entries(id) ON DELETE CASCADE,
    prior_content TEXT NOT NULL,
    prior_confidence INT NOT NULL,
    prior_shift_reason TEXT DEFAULT NULL,
    revised_at TIMESTAMPTZ DEFAULT NOW(),
    revised_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entry_revisions_entry_id ON public.entry_revisions (entry_id, revised_at DESC);

-- Enable RLS on entry_revisions
ALTER TABLE public.entry_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own entry revisions" ON public.entry_revisions;
CREATE POLICY "Users can view own entry revisions" ON public.entry_revisions
    FOR SELECT USING (
        revised_by = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.private_entries
            WHERE private_entries.id = entry_revisions.entry_id AND private_entries.user_id = (select auth.uid())
        )
    );

-- Trigger to record revision whenever private_entries is edited
CREATE OR REPLACE FUNCTION public.log_entry_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.content IS DISTINCT FROM NEW.content OR OLD.confidence_rating IS DISTINCT FROM NEW.confidence_rating THEN
        INSERT INTO public.entry_revisions (entry_id, prior_content, prior_confidence, prior_shift_reason, revised_at, revised_by)
        VALUES (OLD.id, OLD.content, OLD.confidence_rating, OLD.shift_reason, NOW(), OLD.user_id);
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_entry_revision() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_log_entry_revision ON public.private_entries;
CREATE TRIGGER trigger_log_entry_revision
    BEFORE UPDATE ON public.private_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.log_entry_revision();

-- 3. Transactional Outbox Table for Reliable Background Worker Processing
CREATE TABLE IF NOT EXISTS public.outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_status ON public.outbox_events (status, created_at)
    WHERE status = 'pending';

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

-- 4. High-Performance Covering Index on Public Posts
CREATE INDEX IF NOT EXISTS idx_public_posts_covering 
ON public.public_posts (moderation_status, entry_date DESC) 
INCLUDE (topic_id, user_id, confidence_rating, id);

-- 5. Upgraded Atomic Multi-Operation Entry Transaction Function
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

REVOKE EXECUTE ON FUNCTION public.create_entry_transaction(UUID, TEXT, INT, BOOLEAN, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_entry_transaction(UUID, TEXT, INT, BOOLEAN, TIMESTAMPTZ, TEXT) TO authenticated;
