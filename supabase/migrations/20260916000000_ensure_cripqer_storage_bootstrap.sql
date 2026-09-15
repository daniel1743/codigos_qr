-- =============================================================================
-- CRIPQER STORAGE BOOTSTRAP
-- -----------------------------------------------------------------------------
-- Ensures the three Cripqer-owned storage buckets and their final RLS policy
-- contract on a fresh Supabase project, while remaining safe (idempotent and
-- non-destructive) against current production where these objects already exist.
--
-- Authoritative bucket contract (captured from the live storage API):
--   avatars             public=true    file_size_limit=NULL  allowed_mime_types=NULL
--   banners             public=true    file_size_limit=NULL  allowed_mime_types=NULL
--   encrypted-documents public=false   file_size_limit=52428800 (50 MiB)
--                                      allowed_mime_types = 10 whitelisted document types
--
-- Final policy contract (11 policies on storage.objects):
--   avatars              : public select + owner insert/update/delete (folder-scoped)
--   banners              : public select + owner insert/update/delete (folder-scoped)
--   encrypted-documents  : owner select/upload/delete (folder-scoped), private bucket
--
-- Safety rules honored:
--   * Do NOT reactivate legacy migrations.
--   * Do NOT delete buckets or objects.
--   * Do NOT silently overwrite security-relevant drift -> RAISE EXCEPTION.
--   * Do NOT blind DROP POLICY; create only when absent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. BUCKETS
-- ---------------------------------------------------------------------------

-- avatars (public, unrestricted)
DO $$
DECLARE
  v_public boolean;
BEGIN
  SELECT public INTO v_public FROM storage.buckets WHERE id = 'avatars';
  IF NOT FOUND THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('avatars', 'avatars', true, NULL, NULL);
  ELSIF v_public IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'storage bootstrap: bucket "avatars" exists with public=% (expected true)', v_public;
  END IF;
END $$;

-- banners (public, unrestricted)
DO $$
DECLARE
  v_public boolean;
BEGIN
  SELECT public INTO v_public FROM storage.buckets WHERE id = 'banners';
  IF NOT FOUND THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('banners', 'banners', true, NULL, NULL);
  ELSIF v_public IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'storage bootstrap: bucket "banners" exists with public=% (expected true)', v_public;
  END IF;
END $$;

-- encrypted-documents (private, size-capped, mime-whitelisted)
DO $$
DECLARE
  v_public boolean;
BEGIN
  SELECT public INTO v_public FROM storage.buckets WHERE id = 'encrypted-documents';
  IF NOT FOUND THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'encrypted-documents',
      'encrypted-documents',
      false,
      52428800,
      ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
        'application/zip',
        'image/jpeg',
        'image/png'
      ]
    );
  ELSIF v_public IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'storage bootstrap: bucket "encrypted-documents" exists with public=% (expected false)', v_public;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. POLICIES — avatars (public read, owner-scoped writes)
-- ---------------------------------------------------------------------------

DO $policy$
DECLARE
  v_cmd   text;
  v_check text;
BEGIN
  SELECT cmd, with_check INTO v_cmd, v_check
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'owner_insert_avatar';

  IF v_cmd IS NULL THEN
    EXECUTE $create$
      CREATE POLICY "owner_insert_avatar" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
    $create$;
  ELSIF v_cmd <> 'INSERT'
     OR v_check IS NULL
     OR v_check NOT LIKE '%auth.uid()%'
     OR v_check NOT LIKE '%avatars%' THEN
    RAISE EXCEPTION 'storage bootstrap: policy owner_insert_avatar exists with unexpected semantics';
  END IF;
END $policy$;

DO $policy$
DECLARE
  v_cmd  text;
  v_qual text;
BEGIN
  SELECT cmd, qual INTO v_cmd, v_qual
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'public_select_avatar';

  IF v_cmd IS NULL THEN
    EXECUTE $create$
      CREATE POLICY "public_select_avatar" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'avatars')
    $create$;
  ELSIF v_cmd <> 'SELECT' OR v_qual IS NULL OR v_qual NOT LIKE '%avatars%' THEN
    RAISE EXCEPTION 'storage bootstrap: policy public_select_avatar exists with unexpected semantics';
  END IF;
END $policy$;

DO $policy$
DECLARE
  v_cmd   text;
  v_qual  text;
  v_check text;
BEGIN
  SELECT cmd, qual, with_check INTO v_cmd, v_qual, v_check
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'owner_update_avatar';

  IF v_cmd IS NULL THEN
    EXECUTE $create$
      CREATE POLICY "owner_update_avatar" ON storage.objects
        FOR UPDATE TO authenticated
        USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
        WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
    $create$;
  ELSIF v_cmd <> 'UPDATE'
     OR v_qual IS NULL OR v_qual NOT LIKE '%auth.uid()%'
     OR v_check IS NULL OR v_check NOT LIKE '%auth.uid()%' THEN
    RAISE EXCEPTION 'storage bootstrap: policy owner_update_avatar exists with unexpected semantics';
  END IF;
END $policy$;

DO $policy$
DECLARE
  v_cmd  text;
  v_qual text;
BEGIN
  SELECT cmd, qual INTO v_cmd, v_qual
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'owner_delete_avatar';

  IF v_cmd IS NULL THEN
    EXECUTE $create$
      CREATE POLICY "owner_delete_avatar" ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
    $create$;
  ELSIF v_cmd <> 'DELETE' OR v_qual IS NULL OR v_qual NOT LIKE '%auth.uid()%' THEN
    RAISE EXCEPTION 'storage bootstrap: policy owner_delete_avatar exists with unexpected semantics';
  END IF;
END $policy$;

-- ---------------------------------------------------------------------------
-- 3. POLICIES — banners (public read, owner-scoped writes)
-- ---------------------------------------------------------------------------

DO $policy$
DECLARE
  v_cmd   text;
  v_check text;
BEGIN
  SELECT cmd, with_check INTO v_cmd, v_check
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'owner_insert_banner';

  IF v_cmd IS NULL THEN
    EXECUTE $create$
      CREATE POLICY "owner_insert_banner" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'banners' AND (storage.foldername(name))[1] = auth.uid()::text)
    $create$;
  ELSIF v_cmd <> 'INSERT'
     OR v_check IS NULL
     OR v_check NOT LIKE '%auth.uid()%'
     OR v_check NOT LIKE '%banners%' THEN
    RAISE EXCEPTION 'storage bootstrap: policy owner_insert_banner exists with unexpected semantics';
  END IF;
END $policy$;

DO $policy$
DECLARE
  v_cmd  text;
  v_qual text;
BEGIN
  SELECT cmd, qual INTO v_cmd, v_qual
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'public_select_banner';

  IF v_cmd IS NULL THEN
    EXECUTE $create$
      CREATE POLICY "public_select_banner" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'banners')
    $create$;
  ELSIF v_cmd <> 'SELECT' OR v_qual IS NULL OR v_qual NOT LIKE '%banners%' THEN
    RAISE EXCEPTION 'storage bootstrap: policy public_select_banner exists with unexpected semantics';
  END IF;
END $policy$;

DO $policy$
DECLARE
  v_cmd   text;
  v_qual  text;
  v_check text;
BEGIN
  SELECT cmd, qual, with_check INTO v_cmd, v_qual, v_check
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'owner_update_banner';

  IF v_cmd IS NULL THEN
    EXECUTE $create$
      CREATE POLICY "owner_update_banner" ON storage.objects
        FOR UPDATE TO authenticated
        USING (bucket_id = 'banners' AND (storage.foldername(name))[1] = auth.uid()::text)
    $create$;
  ELSIF v_cmd <> 'UPDATE'
     OR v_qual IS NULL OR v_qual NOT LIKE '%auth.uid()%'
     OR v_qual NOT LIKE '%banners%' THEN
    RAISE EXCEPTION 'storage bootstrap: policy owner_update_banner exists with unexpected semantics';
  END IF;
END $policy$;

DO $policy$
DECLARE
  v_cmd  text;
  v_qual text;
BEGIN
  SELECT cmd, qual INTO v_cmd, v_qual
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'owner_delete_banner';

  IF v_cmd IS NULL THEN
    EXECUTE $create$
      CREATE POLICY "owner_delete_banner" ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = 'banners' AND (storage.foldername(name))[1] = auth.uid()::text)
    $create$;
  ELSIF v_cmd <> 'DELETE' OR v_qual IS NULL OR v_qual NOT LIKE '%auth.uid()%' THEN
    RAISE EXCEPTION 'storage bootstrap: policy owner_delete_banner exists with unexpected semantics';
  END IF;
END $policy$;

-- ---------------------------------------------------------------------------
-- 4. POLICIES — encrypted-documents (private, owner-scoped only)
-- ---------------------------------------------------------------------------

DO $policy$
DECLARE
  v_cmd  text;
  v_qual text;
BEGIN
  SELECT cmd, qual INTO v_cmd, v_qual
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow owners to select their own files';

  IF v_cmd IS NULL THEN
    EXECUTE $create$
      CREATE POLICY "Allow owners to select their own files" ON storage.objects
        FOR SELECT TO authenticated
        USING (bucket_id = 'encrypted-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
    $create$;
  ELSIF v_cmd <> 'SELECT'
     OR v_qual IS NULL
     OR v_qual NOT LIKE '%auth.uid()%'
     OR v_qual NOT LIKE '%encrypted-documents%' THEN
    RAISE EXCEPTION 'storage bootstrap: policy "Allow owners to select their own files" exists with unexpected semantics';
  END IF;
END $policy$;

DO $policy$
DECLARE
  v_cmd   text;
  v_check text;
BEGIN
  SELECT cmd, with_check INTO v_cmd, v_check
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow owners to upload their own files';

  IF v_cmd IS NULL THEN
    EXECUTE $create$
      CREATE POLICY "Allow owners to upload their own files" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'encrypted-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
    $create$;
  ELSIF v_cmd <> 'INSERT'
     OR v_check IS NULL
     OR v_check NOT LIKE '%auth.uid()%'
     OR v_check NOT LIKE '%encrypted-documents%' THEN
    RAISE EXCEPTION 'storage bootstrap: policy "Allow owners to upload their own files" exists with unexpected semantics';
  END IF;
END $policy$;

DO $policy$
DECLARE
  v_cmd  text;
  v_qual text;
BEGIN
  SELECT cmd, qual INTO v_cmd, v_qual
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow owners to delete their own files';

  IF v_cmd IS NULL THEN
    EXECUTE $create$
      CREATE POLICY "Allow owners to delete their own files" ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = 'encrypted-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
    $create$;
  ELSIF v_cmd <> 'DELETE'
     OR v_qual IS NULL
     OR v_qual NOT LIKE '%auth.uid()%'
     OR v_qual NOT LIKE '%encrypted-documents%' THEN
    RAISE EXCEPTION 'storage bootstrap: policy "Allow owners to delete their own files" exists with unexpected semantics';
  END IF;
END $policy$;

-- ---------------------------------------------------------------------------
-- 5. POST-BOOTSTRAP SECURITY INVARIANT VERIFICATION
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_count integer;
BEGIN
  -- encrypted-documents must remain private
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'encrypted-documents' AND public) THEN
    RAISE EXCEPTION 'storage bootstrap: encrypted-documents bucket must remain private';
  END IF;

  -- avatars / banners must remain public
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars' AND public) THEN
    RAISE EXCEPTION 'storage bootstrap: avatars bucket must remain public';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'banners' AND public) THEN
    RAISE EXCEPTION 'storage bootstrap: banners bucket must remain public';
  END IF;

  -- all three buckets must exist
  SELECT count(*) INTO v_count FROM storage.buckets WHERE id IN ('avatars', 'banners', 'encrypted-documents');
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'storage bootstrap: expected 3 Cripqer buckets, found %', v_count;
  END IF;
END $$;
