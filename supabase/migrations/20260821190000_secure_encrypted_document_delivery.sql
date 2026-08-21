-- Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
-- Secure, private delivery for encrypted documents.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.encrypted_documents
  ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_verifier TEXT;

UPDATE storage.buckets
SET public = false
WHERE id = 'encrypted-documents';

DROP POLICY IF EXISTS "Allow public select of encrypted documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload encrypted documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete their encrypted documents" ON storage.objects;
DROP POLICY IF EXISTS "Encrypted document owners can select" ON storage.objects;
DROP POLICY IF EXISTS "Encrypted document owners can insert" ON storage.objects;
DROP POLICY IF EXISTS "Encrypted document owners can delete" ON storage.objects;

CREATE POLICY "Encrypted document owners can select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'encrypted-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Encrypted document owners can insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'encrypted-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Encrypted document owners can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'encrypted-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

REVOKE ALL ON FUNCTION public.get_encrypted_document_metadata(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_document_access(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_document_downloads(UUID) FROM PUBLIC, anon, authenticated;

-- Public metadata contains no password verifier, owner id, IV, salt, or storage path.
CREATE OR REPLACE FUNCTION public.get_encrypted_document_public_metadata(p_short_url text)
RETURNS TABLE (
  status TEXT,
  name TEXT,
  original_filename TEXT,
  file_type TEXT,
  file_size_bytes BIGINT,
  password_required BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_document public.encrypted_documents%ROWTYPE;
BEGIN
  IF p_short_url IS NULL OR length(p_short_url) < 16 OR length(p_short_url) > 64 THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BIGINT, NULL::BOOLEAN;
    RETURN;
  END IF;

  SELECT d.* INTO v_document
  FROM public.encrypted_documents AS d
  WHERE d.short_url = p_short_url;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BIGINT, NULL::BOOLEAN;
  ELSIF v_document.revoked THEN
    RETURN QUERY SELECT 'revoked'::TEXT, v_document.name, v_document.original_filename, v_document.file_type, v_document.file_size_bytes, v_document.password_required;
  ELSIF v_document.expire_at IS NOT NULL AND v_document.expire_at <= now() THEN
    RETURN QUERY SELECT 'expired'::TEXT, v_document.name, v_document.original_filename, v_document.file_type, v_document.file_size_bytes, v_document.password_required;
  ELSIF v_document.one_time_download AND COALESCE(v_document.current_downloads, 0) >= 1 THEN
    RETURN QUERY SELECT 'limit_reached'::TEXT, v_document.name, v_document.original_filename, v_document.file_type, v_document.file_size_bytes, v_document.password_required;
  ELSIF v_document.max_downloads IS NOT NULL AND COALESCE(v_document.current_downloads, 0) >= v_document.max_downloads THEN
    RETURN QUERY SELECT 'limit_reached'::TEXT, v_document.name, v_document.original_filename, v_document.file_type, v_document.file_size_bytes, v_document.password_required;
  ELSE
    RETURN QUERY SELECT 'available'::TEXT, v_document.name, v_document.original_filename, v_document.file_type, v_document.file_size_bytes, v_document.password_required;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_encrypted_document_public_metadata(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_encrypted_document_public_metadata(text) TO anon, authenticated;

-- Authenticated creation hashes the access password server-side with bcrypt.
CREATE OR REPLACE FUNCTION public.create_encrypted_document(
  p_name TEXT,
  p_description TEXT,
  p_original_filename TEXT,
  p_file_type TEXT,
  p_file_size_bytes BIGINT,
  p_mime_type TEXT,
  p_encrypted_file_path TEXT,
  p_iv TEXT,
  p_salt TEXT,
  p_password TEXT,
  p_expire_at TIMESTAMPTZ,
  p_max_downloads INTEGER,
  p_one_time_download BOOLEAN,
  p_short_url TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  short_url TEXT,
  password_required BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_document public.encrypted_documents;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;
  IF p_encrypted_file_path IS NULL
     OR (storage.foldername(p_encrypted_file_path))[1] IS DISTINCT FROM v_user_id::TEXT THEN
    RAISE EXCEPTION 'invalid_storage_path';
  END IF;
  IF p_short_url IS NULL OR length(p_short_url) < 16 OR length(p_short_url) > 64 THEN
    RAISE EXCEPTION 'invalid_short_url';
  END IF;
  IF p_file_size_bytes <= 0 OR p_file_size_bytes > 52428800 THEN
    RAISE EXCEPTION 'invalid_file_size';
  END IF;
  IF p_max_downloads IS NOT NULL AND p_max_downloads < 1 THEN
    RAISE EXCEPTION 'invalid_download_limit';
  END IF;

  INSERT INTO public.encrypted_documents (
    user_id, name, description, original_filename, file_type, file_size_bytes,
    mime_type, encrypted_file_path, iv, salt, encryption_level,
    password_required, password_hash, password_verifier, two_factor_enabled,
    expire_at, max_downloads, one_time_download, short_url
  ) VALUES (
    v_user_id, p_name, p_description, p_original_filename, p_file_type, p_file_size_bytes,
    p_mime_type, p_encrypted_file_path, p_iv, p_salt, 'standard',
    NULLIF(p_password, '') IS NOT NULL, NULL,
    CASE WHEN NULLIF(p_password, '') IS NOT NULL
      THEN extensions.crypt(p_password, extensions.gen_salt('bf', 12))
      ELSE NULL
    END,
    false, p_expire_at, p_max_downloads, COALESCE(p_one_time_download, false), p_short_url
  )
  RETURNING * INTO v_document;

  RETURN QUERY SELECT
    v_document.id,
    v_document.name,
    v_document.short_url,
    v_document.password_required;
END;
$;

REVOKE ALL ON FUNCTION public.create_encrypted_document(TEXT,TEXT,TEXT,TEXT,BIGINT,TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,INTEGER,BOOLEAN,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_encrypted_document(TEXT,TEXT,TEXT,TEXT,BIGINT,TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,INTEGER,BOOLEAN,TEXT) TO authenticated;

-- Called only by the server with service_role. Row lock makes limit consumption atomic.
CREATE OR REPLACE FUNCTION public.authorize_encrypted_document_download(
  p_short_url TEXT,
  p_password TEXT,
  p_user_agent TEXT
)
RETURNS TABLE (
  status TEXT,
  document_id UUID,
  original_filename TEXT,
  mime_type TEXT,
  encrypted_file_path TEXT,
  iv TEXT,
  salt TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_document public.encrypted_documents%ROWTYPE;
  v_password_valid BOOLEAN;
BEGIN
  IF p_short_url IS NULL OR length(p_short_url) < 16 OR length(p_short_url) > 64 THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT d.* INTO v_document
  FROM public.encrypted_documents AS d
  WHERE d.short_url = p_short_url
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_document.revoked THEN
    RETURN QUERY SELECT 'revoked'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  IF v_document.expire_at IS NOT NULL AND v_document.expire_at <= now() THEN
    RETURN QUERY SELECT 'expired'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  IF (v_document.one_time_download AND v_document.current_downloads >= 1)
     OR (v_document.max_downloads IS NOT NULL AND v_document.current_downloads >= v_document.max_downloads) THEN
    RETURN QUERY SELECT 'limit_reached'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_document.password_required THEN
    v_password_valid :=
      p_password IS NOT NULL
      AND (
        (v_document.password_verifier IS NOT NULL
          AND extensions.crypt(p_password, v_document.password_verifier) = v_document.password_verifier)
        OR
        (v_document.password_verifier IS NULL
          AND v_document.password_hash IS NOT NULL
          AND encode(extensions.digest(p_password, 'sha256'), 'base64') = v_document.password_hash)
      );

    IF NOT v_password_valid THEN
      INSERT INTO public.document_access_logs (document_id, success, user_agent)
      VALUES (v_document.id, false, left(p_user_agent, 512));
      RETURN QUERY SELECT 'invalid_password'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
      RETURN;
    END IF;
  END IF;

  UPDATE public.encrypted_documents
  SET current_downloads = COALESCE(current_downloads, 0) + 1,
      last_accessed_at = now()
  WHERE id = v_document.id;

  INSERT INTO public.document_access_logs (document_id, success, user_agent)
  VALUES (v_document.id, true, left(p_user_agent, 512));

  RETURN QUERY SELECT
    'authorized'::TEXT, v_document.id, v_document.original_filename,
    v_document.mime_type, v_document.encrypted_file_path, v_document.iv, v_document.salt;
END;
$$;

REVOKE ALL ON FUNCTION public.authorize_encrypted_document_download(TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_encrypted_document_download(TEXT,TEXT,TEXT) TO service_role;

-- Compensation if Storage cannot issue the signed URL after reservation.
CREATE OR REPLACE FUNCTION public.release_encrypted_document_download(p_document_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.encrypted_documents
  SET current_downloads = GREATEST(COALESCE(current_downloads, 0) - 1, 0)
  WHERE id = p_document_id;
END;
$$;

REVOKE ALL ON FUNCTION public.release_encrypted_document_download(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_encrypted_document_download(UUID) TO service_role;
