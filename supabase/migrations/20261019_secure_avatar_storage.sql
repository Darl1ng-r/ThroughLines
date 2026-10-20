-- Supabase Storage Hardening & Avatar Protection Migration
-- 1. Restricts avatar storage bucket file size to 2MB
-- 2. Strictly restricts MIME types to image/jpeg, image/png, image/webp (blocks executable SVG XSS)
-- 3. Implements tenant-scoped Row Level Security on storage.objects

DO $$
BEGIN
    -- Ensure avatars bucket exists with strict MIME and size controls
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'avatars',
        'avatars',
        true,
        2097152, -- 2MB maximum
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
        file_size_limit = 2097152,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

    -- Storage RLS: Public read access for profile avatars
    DROP POLICY IF EXISTS "Public avatars are viewable by everyone" ON storage.objects;
    CREATE POLICY "Public avatars are viewable by everyone" ON storage.objects
        FOR SELECT
        USING (bucket_id = 'avatars');

    -- Storage RLS: Authenticated users can only upload to their own user-scoped directory
    DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
    CREATE POLICY "Users can upload their own avatar" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
            bucket_id = 'avatars'
            AND (storage.foldername(name))[1] = (select auth.uid())::text
        );

    -- Storage RLS: Users can only update or delete their own avatar
    DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
    CREATE POLICY "Users can update their own avatar" ON storage.objects
        FOR UPDATE TO authenticated
        USING (
            bucket_id = 'avatars'
            AND (storage.foldername(name))[1] = (select auth.uid())::text
        )
        WITH CHECK (
            bucket_id = 'avatars'
            AND (storage.foldername(name))[1] = (select auth.uid())::text
        );

    DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
    CREATE POLICY "Users can delete their own avatar" ON storage.objects
        FOR DELETE TO authenticated
        USING (
            bucket_id = 'avatars'
            AND (storage.foldername(name))[1] = (select auth.uid())::text
        );

EXCEPTION
    WHEN undefined_table THEN
        -- Storage schema is not deployed in local mock / unit testing environments
        NULL;
END $$;
