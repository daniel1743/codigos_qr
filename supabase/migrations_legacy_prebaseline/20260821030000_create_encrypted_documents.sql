-- Create table for encrypted documents
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

-- Create table for access logs
CREATE TABLE IF NOT EXISTS public.document_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.encrypted_documents(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.encrypted_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

-- Policies for encrypted_documents
CREATE POLICY "Users can manage their own encrypted documents"
  ON public.encrypted_documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read metadata of public short URL"
  ON public.encrypted_documents
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policies for document_access_logs
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

CREATE POLICY "Anyone can insert access logs"
  ON public.document_access_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Storage bucket setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('encrypted-documents', 'encrypted-documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY "Allow public select of encrypted documents"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'encrypted-documents');

CREATE POLICY "Allow authenticated users to upload encrypted documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'encrypted-documents');

CREATE POLICY "Allow owners to delete their encrypted documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'encrypted-documents');
