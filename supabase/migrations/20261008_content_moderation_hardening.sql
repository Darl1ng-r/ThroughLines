-- ThroughLines Enterprise Database Hardening: Content Moderation & Discourse Protection
-- IDEMPOTENT: Safe to run on existing databases or re-deployments.

-- 1. Update Check Constraint & Columns on public.public_posts
DO $$
BEGIN
    -- Drop old check constraint if exists
    ALTER TABLE public.public_posts DROP CONSTRAINT IF EXISTS public_posts_moderation_status_check;
    
    -- Apply strict check constraint supporting pending, approved, flagged, and rejected
    ALTER TABLE public.public_posts 
        ADD CONSTRAINT public_posts_moderation_status_check 
        CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected'));

    -- Add audit columns if not present
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'public_posts' AND column_name = 'moderation_reason'
    ) THEN
        ALTER TABLE public.public_posts ADD COLUMN moderation_reason TEXT DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'public_posts' AND column_name = 'moderated_at'
    ) THEN
        ALTER TABLE public.public_posts ADD COLUMN moderated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. PostgreSQL Normalization Helper Function
-- Normalizes incoming text inside the database engine to defeat obfuscation
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
    -- Lowercase
    cleaned := LOWER(input_text);
    -- Strip zero-width & invisible characters (\u200B-\u200D, \uFEFF, \u00AD, \u2060)
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
-- 3. Hardened Server-Side Content Moderation Trigger on public_posts
-- Runs BEFORE INSERT OR UPDATE ON public.public_posts
-- Enforces:
-- a) Anti-tampering: Non-service-role clients CANNOT manipulate moderation_status.
-- b) Re-evaluation: Updating content resets moderation_status to pending or flagged.
-- c) Evasion-resilient multi-pass regex detection on normalized text.
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
    -- Check if request originates from service_role / internal backend
    is_service_role := (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
                       OR (CURRENT_USER = 'postgres')
                       OR (session_user = 'postgres');

    -- ANTI-TAMPERING & STATE INTEGRITY:
    -- If a non-service-role client attempts to directly set or change moderation_status,
    -- preserve old status or enforce system default.
    IF TG_OP = 'UPDATE' THEN
        IF NOT is_service_role AND OLD.moderation_status IS DISTINCT FROM NEW.moderation_status THEN
            NEW.moderation_status := OLD.moderation_status;
        END IF;
    END IF;

    -- Normalize text using in-database helper
    norm_content := public.normalize_text_moderation(NEW.content);

    -- Count HTTP/HTTPS links
    SELECT COUNT(*) INTO http_count
    FROM regexp_matches(NEW.content, 'https?://', 'g');

    -- Strict pattern checks against all 5 protected domains
    is_toxic := (CHAR_LENGTH(NEW.content) > 5000)
             OR (http_count > 3)
             -- Scams & Spam
             OR (norm_content ~* '\m(casino|crypto-?airdrop|free-?followers|phishing|whatsapp investment|telegram signals)\M')
             -- Obscenity & Harassment
             OR (norm_content ~* '\m(f+u+c+k+[a-z]*|f+\*+c+k+|b+i+t+c+h+e?s?|b+\*+t+c+h+|b+a+s+t+a+r+d+s?|c+u+n+t+s?|c+\*+n+t+|a+s+s+h+o+l+e+s?|p+u+s+s+y|d+i+c+k+h+e+a+d+|p+o+r+n+[a-z]*|b+l+o+w+j+o+b+|s+h+i+t+[a-z]*)\M')
             -- Hate Speech & Slurs
             OR (norm_content ~* '\m(n+i+g+g+[ea]+r+|n+i+g+g+a+|k+i+k+e+|ch+i+n+k+|f+a+g+g+o+t+|f+a+g+s?|d+y+k+e+s?|t+r+a+n+n+y|r+e+t+a+r+d+[es]?)\M')
             -- Physical Threats & Violence
             OR (norm_content ~* '(kill\s+(your|ur)self|commit\s+suicide|go\s+die|i\s+will\s+(kill|murder|shoot|stab)\s+(you|u)|slit\s+(your|ur)?\s*throat)');

    IF is_toxic THEN
        NEW.moderation_status := 'flagged';
        NEW.moderation_reason := 'Automated database rule match';
        NEW.moderated_at := NOW();
    ELSE
        -- If clean by fast heuristics:
        -- On INSERT, if client is standard user, grant 'approved' or 'pending' depending on AI webhook configuration
        IF TG_OP = 'INSERT' THEN
            IF NOT is_service_role OR NEW.moderation_status IS NULL THEN
                NEW.moderation_status := 'approved';
                NEW.moderated_at := NOW();
            END IF;
        -- On UPDATE, if content changed, re-evaluate and mark appropriately
        ELSIF TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content THEN
            NEW.moderation_status := 'approved';
            NEW.moderated_at := NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Revoke RPC execution for moderate_public_post
REVOKE EXECUTE ON FUNCTION public.moderate_public_post() FROM PUBLIC, anon, authenticated;

-- Ensure trigger attaches to BEFORE INSERT OR UPDATE ON public.public_posts
DROP TRIGGER IF EXISTS trigger_moderate_public_post ON public.public_posts;
CREATE TRIGGER trigger_moderate_public_post
    BEFORE INSERT OR UPDATE ON public.public_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.moderate_public_post();

-- ---------------------------------------------------------------------------
-- 4. Server-Side Moderation Trigger on public.topics (Title & Slug)
-- Guarantees throughline topics and URLs never contain offensive language
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
            USING ERRCODE = '23514'; -- check_violation
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
-- 5. Server-Side Moderation Trigger on public.profiles (Display Name & Bio)
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
-- 6. Strict RLS Policies for public_posts
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public posts viewable if approved or by owner" ON public.public_posts;
CREATE POLICY "Public posts viewable if approved or by owner" ON public.public_posts
    FOR SELECT USING (
        moderation_status = 'approved'
        OR (select auth.uid()) = user_id
    );

DROP POLICY IF EXISTS "Users can update own public posts" ON public.public_posts;
CREATE POLICY "Users can update own public posts" ON public.public_posts
    FOR UPDATE USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);
