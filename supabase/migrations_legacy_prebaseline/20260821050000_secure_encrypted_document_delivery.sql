-- Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02B

-- 1. Add revoked columns to public.encrypted_documents if they do not exist
ALTER TABLE public.encrypted_documents ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.encrypted_documents ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ NULL;

-- 2. Force storage bucket to private
UPDATE storage.buckets SET public = false WHERE id = 'encrypted-documents';

-- 3. Hardening: Revoke public direct insert/read policies
DROP POLICY IF EXISTS "Anyone can insert access logs" ON public.document_access_logs;
DROP POLICY IF EXISTS "Anyone can read metadata of public short URL" ON public.encrypted_documents;

-- 4. Public metadata RPC: Safe for anon/authenticated, returns no secrets (no password_hash, no user_id, no encrypted_file_path)
CREATE OR REPLACE FUNCTION public.get_encrypted_document_metadata(p_short_url text)
RETURNS TABLE (
  id UUID,
  name TEXT,
  original_filename TEXT,
  file_type TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  encryption_level TEXT,
  password_required BOOLEAN,
  expire_at TIMESTAMPTZ,
  max_downloads INTEGER,
  current_downloads INTEGER,
  one_time_download BOOLEAN,
  revoked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id, d.name, d.original_filename, d.file_type, d.file_size_bytes, 
    d.mime_type, d.encryption_level, d.password_required, d.expire_at, 
    d.max_downloads, d.current_downloads, d.one_time_download, d.revoked
  FROM public.encrypted_documents d
  WHERE d.short_url = p_short_url;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_encrypted_document_metadata(text) TO anon, authenticated;

-- 5. Internal RPC: Retrieve delivery secret (restricted to service_role)
CREATE OR REPLACE FUNCTION public.get_encrypted_document_delivery_secret(p_short_url text)
RETURNS TABLE (
  id UUID,
  encrypted_file_path TEXT,
  iv TEXT,
  salt TEXT,
  password_hash TEXT,
  original_filename TEXT,
  mime_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.encrypted_file_path, d.iv, d.salt, d.password_hash, d.original_filename, d.mime_type
  FROM public.encrypted_documents d
  WHERE d.short_url = p_short_url;
END;
$$;

-- 6. Internal RPC: Atomically check restrictions and claim download (restricted to service_role)
CREATE OR REPLACE FUNCTION public.claim_encrypted_document_download(p_short_url text)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
BEGIN
  -- Select and lock the row to prevent concurrent download races
  SELECT id, revoked, expire_at, max_downloads, current_downloads, one_time_download INTO v_doc
  FROM public.encrypted_documents
  WHERE short_url = p_short_url
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'DOCUMENT_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  IF v_doc.revoked = TRUE THEN
    RETURN QUERY SELECT FALSE, 'DOCUMENT_REVOKED'::TEXT;
    RETURN;
  END IF;
  
  IF v_doc.expire_at IS NOT NULL AND v_doc.expire_at < NOW() THEN
    RETURN QUERY SELECT FALSE, 'DOCUMENT_EXPIRED'::TEXT;
    RETURN;
  END IF;
  
  IF v_doc.one_time_download = TRUE AND v_doc.current_downloads >= 1 THEN
    RETURN QUERY SELECT FALSE, 'DOWNLOAD_LIMIT_REACHED'::TEXT;
    RETURN;
  END IF;
  
  IF v_doc.max_downloads IS NOT NULL AND v_doc.current_downloads >= v_doc.max_downloads THEN
    RETURN QUERY SELECT FALSE, 'DOWNLOAD_LIMIT_REACHED'::TEXT;
    RETURN;
  END IF;
  
  -- Increment downloads count atomically
  UPDATE public.encrypted_documents
  SET current_downloads = current_downloads + 1,
      last_accessed_at = NOW()
  WHERE public.encrypted_documents.id = v_doc.id;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- 7. Internal RPC: Compensation decrement (restricted to service_role)
CREATE OR REPLACE FUNCTION public.decrement_document_downloads(p_document_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.encrypted_documents
  SET current_downloads = GREATEST(0, current_downloads - 1)
  WHERE id = p_document_id;
END;
$$;

-- 8. Internal RPC: Access log recording (restricted to service_role)
CREATE OR REPLACE FUNCTION public.log_document_access(p_document_id UUID, p_success BOOLEAN, p_user_agent TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.encrypted_documents WHERE id = p_document_id) THEN
    INSERT INTO public.document_access_logs (document_id, success, user_agent)
    VALUES (p_document_id, p_success, p_user_agent);
  END IF;
END;
$$;

-- 9. Hardening: Revoke execute from public/anon/authenticated on internal server functions
REVOKE EXECUTE ON FUNCTION public.get_encrypted_document_delivery_secret(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_encrypted_document_download(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_document_downloads(UUID) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_document_access(UUID, BOOLEAN, TEXT) FROM public, anon, authenticated;

-- 10. Hardening: Grant execute ONLY to service_role
GRANT EXECUTE ON FUNCTION public.get_encrypted_document_delivery_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_encrypted_document_download(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_document_downloads(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_document_access(UUID, BOOLEAN, TEXT) TO service_role;

-- 11. Hardening Storage policies (Strict RLS by owner folder, no public select/insert/delete)
DROP POLICY IF EXISTS "Allow public select of encrypted documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload encrypted documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete their encrypted documents" ON storage.objects;

DROP POLICY IF EXISTS "Allow owners to select their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete their own files" ON storage.objects;

CREATE POLICY "Allow owners to select their own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'encrypted-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow owners to upload their own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'encrypted-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow owners to delete their own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'encrypted-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
