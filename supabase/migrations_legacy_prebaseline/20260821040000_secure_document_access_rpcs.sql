-- 1. Create table for encrypted documents (if not exists)
CREATE TABLE IF NOT EXISTS public.encrypted_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- File info
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Storage and Encryption
  encrypted_file_path TEXT NOT NULL,
  iv TEXT NOT NULL,
  salt TEXT,
  
  -- Security config
  encryption_level TEXT NOT NULL CHECK (encryption_level IN ('standard', 'high', 'maximum')),
  password_required BOOLEAN DEFAULT false,
  password_hash TEXT,
  two_factor_enabled BOOLEAN DEFAULT false,
  
  -- Access Control
  expire_at TIMESTAMPTZ,
  max_downloads INTEGER,
  current_downloads INTEGER DEFAULT 0,
  one_time_download BOOLEAN DEFAULT false,
  short_url TEXT NOT NULL UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

-- 2. Create table for access logs (if not exists)
CREATE TABLE IF NOT EXISTS public.document_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.encrypted_documents(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.encrypted_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

-- 4. Clean up previous policies to prevent duplicates
DROP POLICY IF EXISTS "Users can manage their own encrypted documents" ON public.encrypted_documents;
DROP POLICY IF EXISTS "Anyone can read metadata of public short URL" ON public.encrypted_documents;
DROP POLICY IF EXISTS "Users can view logs of their own documents" ON public.document_access_logs;
DROP POLICY IF EXISTS "Anyone can insert access logs" ON public.document_access_logs;

-- 5. Owner policies (for authenticated users)
CREATE POLICY "Users can manage their own encrypted documents"
  ON public.encrypted_documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view logs of their own documents"
  ON public.document_access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.encrypted_documents
      WHERE encrypted_documents.id = document_access_logs.document_id
      AND encrypted_documents.user_id = auth.uid()
    )
  );

-- 6. SECURITY DEFINER Functions (RPCs) to allow secure public access without open RLS policies

-- Function A: Get public document metadata securely by short URL key
CREATE OR REPLACE FUNCTION public.get_encrypted_document_metadata(p_short_url text)
RETURNS TABLE (
  id UUID,
  name TEXT,
  original_filename TEXT,
  file_type TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  encrypted_file_path TEXT,
  iv TEXT,
  salt TEXT,
  encryption_level TEXT,
  password_required BOOLEAN,
  password_hash TEXT,
  expire_at TIMESTAMPTZ,
  max_downloads INTEGER,
  current_downloads INTEGER,
  one_time_download BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id, d.name, d.original_filename, d.file_type, d.file_size_bytes, 
    d.mime_type, d.encrypted_file_path, d.iv, d.salt, d.encryption_level, 
    d.password_required, d.password_hash, d.expire_at, d.max_downloads, d.current_downloads,
    d.one_time_download
  FROM public.encrypted_documents d
  WHERE d.short_url = p_short_url;
END;
$$;

-- Function B: Log document access securely
CREATE OR REPLACE FUNCTION public.log_document_access(p_document_id UUID, p_success BOOLEAN, p_user_agent TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.document_access_logs (document_id, success, user_agent)
  VALUES (p_document_id, p_success, p_user_agent);
END;
$$;

-- Function C: Increment document download count securely
CREATE OR REPLACE FUNCTION public.increment_document_downloads(p_document_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.encrypted_documents
  SET current_downloads = current_downloads + 1,
      last_accessed_at = NOW()
  WHERE id = p_document_id;
END;
$$;

-- 7. Grant execute permissions on RPC functions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_encrypted_document_metadata(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_document_access(UUID, BOOLEAN, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_document_downloads(UUID) TO anon, authenticated;
